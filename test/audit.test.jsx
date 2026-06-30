import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import Header from './Header';
import { useGlobalStore } from '../shared/stores/globalStore';
import { useExploitationModeStore } from '@src/shared/stores';
import { Keycloak } from '@keycloak/keycloak-js';

// Мокаем глобальные хуки
jest.mock('../shared/stores/globalStore', () => ({
  useGlobalStore: jest.fn(),
}));

jest.mock('@src/shared/stores', () => ({
  useExploitationModeStore: jest.fn(),
}));

// Мокаем Keycloak
const mockUser = {
  family_name: 'Иванов',
  given_name: 'Иван',
  realm_access: { roles: ['admin'] },
  roles: ['admin'],
};

describe('Header', () => {
  let history;
  let mockAgGridApi;

  beforeEach(() => {
    history = createMemoryHistory();
    mockAgGridApi = {
      getFilterModel: jest.fn(),
      getAllDisplayedColumns: jest.fn(),
      getDisplayedRowCount: jest.fn(),
      exportDataAsExcel: jest.fn(),
    };

    useGlobalStore.mockReturnValue({ agGridApi: mockAgGridApi });
    useExploitationModeStore.mockReturnValue(['mode1', 'mode2']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('отображает логотип и заголовок', () => {
    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={jest.fn()} />
      </Router>,
    );

    expect(screen.getByText('Реестр моделей')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /logo/i })).toBeInTheDocument();
  });

  test('отображает имя пользователя и аватар', () => {
    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={jest.fn()} />
      </Router>,
    );

    expect(screen.getByText('Иванов Иван')).toBeInTheDocument();
    expect(screen.getByLabelText('Аватар пользователя')).toBeInTheDocument();
  });

  test('кнопка "Выгрузить отчет" вызывает аудит и экспорт', async () => {
    const mockFilterModel = { col1: { type: 'equals', filter: 'test' } };
    mockAgGridApi.getFilterModel.mockReturnValue(mockFilterModel);
    mockAgGridApi.getDisplayedRowCount.mockReturnValue(42);
    mockAgGridApi.getAllDisplayedColumns.mockReturnValue([
      { getColId: () => 'col1' },
      { getColId: () => 'col2' },
      { getColId: () => 'ag-Grid-ControlsColumn' },
    ]);

    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={jest.fn()} />
      </Router>,
    );

    const exportButton = screen.getByText('Выгрузить отчет');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/audit/report-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: JSON.stringify(mockFilterModel),
          recordsCount: 42,
        }),
      });
    });

    expect(mockAgGridApi.exportDataAsExcel).toHaveBeenCalledWith({
      columnKeys: ['col1', 'col2'],
      fileName: `Отчет ${new Date().toLocaleDateString('ru-RU')}.xlsx`,
      onlySelected: false,
      skipColumnHeaders: false,
      allColumns: false,
    });
  });

  test('кнопка "СУМ" ведет на /sum', () => {
    const windowLocationHrefSpy = jest.spyOn(window.location, 'href', 'set');

    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={jest.fn()} />
      </Router>,
    );

    const sumButton = screen.getByText('СУМ');
    fireEvent.click(sumButton);

    expect(windowLocationHrefSpy).toHaveBeenCalledWith('/sum');
    windowLocationHrefSpy.mockRestore();
  });

  test('кнопка выхода вызывает onLogout', () => {
    const mockOnLogout = jest.fn();

    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={mockOnLogout} />
      </Router>,
    );

    const logoutButton = screen.getByLabelText('Выйти из учетной записи');
    fireEvent.click(logoutButton);

    expect(mockOnLogout).toHaveBeenCalled();
  });

  test('отображает "Анонимный пользователь", если нет данных о пользователе', () => {
    render(
      <Router history={history}>
        <Header user={null} onLogout={jest.fn()} />
      </Router>,
    );

    expect(screen.getByText('Анонимный пользователь')).toBeInTheDocument();
  });

  test('экспорт не выполняется, если agGridApi отсутствует', () => {
    useGlobalStore.mockReturnValue({ agGridApi: null });

    global.fetch = jest.fn();

    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={jest.fn()} />
      </Router>,
    );

    const exportButton = screen.getByText('Выгрузить отчет');
    fireEvent.click(exportButton);

    expect(fetch).not.toHaveBeenCalled();
    expect(mockAgGridApi.exportDataAsExcel).not.toHaveBeenCalled();
  });

  test('ошибка при отправке аудита не ломает экспорт', async () => {
    mockAgGridApi.getFilterModel.mockReturnValue({});
    mockAgGridApi.getDisplayedRowCount.mockReturnValue(10);
    mockAgGridApi.getAllDisplayedColumns.mockReturnValue([{ getColId: () => 'col1' }]);

    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={jest.fn()} />
      </Router>,
    );

    const exportButton = screen.getByText('Выгрузить отчет');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockAgGridApi.exportDataAsExcel).toHaveBeenCalled();
    });
  });
});
