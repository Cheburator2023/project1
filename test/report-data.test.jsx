import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import Header from './Header';
import { useGlobalStore } from '../shared/stores/globalStore';
import { useExploitationModeStore } from '@src/shared/stores';

// Мокаем хуки
jest.mock('../shared/stores/globalStore', () => ({
  useGlobalStore: jest.fn(),
}));

jest.mock('@src/shared/stores', () => ({
  useExploitationModeStore: jest.fn(),
}));

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
    useExploitationModeStore.mockReturnValue(['mode1']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('рендерит логотип и заголовок', () => {
    render(
      <Router history={history}>
        <Header user={{ family_name: 'Иванов', given_name: 'Иван' }} onLogout={jest.fn()} />
      </Router>,
    );

    expect(screen.getByText('Реестр моделей')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /logo/i })).toBeInTheDocument();
  });

  test('отображает имя пользователя, если оно доступно', () => {
    const mockUser = {
      family_name: 'Иванов',
      given_name: 'Иван',
      realm_access: { roles: [] },
      roles: [],
    };

    render(
      <Router history={history}>
        <Header user={mockUser} onLogout={jest.fn()} />
      </Router>,
    );

    expect(screen.getByText('Иванов Иван')).toBeInTheDocument();
  });

  test('отображает "Анонимный пользователь", если нет данных о пользователе', () => {
    render(
      <Router history={history}>
        <Header user={null} onLogout={jest.fn()} />
      </Router>,
    );

    expect(screen.getByText('Анонимный пользователь')).toBeInTheDocument();
  });

  test('кнопка "Выгрузить отчет" вызывает аудит и экспорт', async () => {
    const mockFilterModel = { status: { type: 'equals', filter: 'active' } };
    mockAgGridApi.getFilterModel.mockReturnValue(mockFilterModel);
    mockAgGridApi.getDisplayedRowCount.mockReturnValue(15);
    mockAgGridApi.getAllDisplayedColumns.mockReturnValue([
      { getColId: () => 'col1' },
      { getColId: () => 'col2' },
      { getColId: () => 'ag-Grid-ControlsColumn' },
    ]);

    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    render(
      <Router history={history}>
        <Header user={{ family_name: 'Иванов', given_name: 'Иван' }} onLogout={jest.fn()} />
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
          recordsCount: 15,
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

  test('ошибка при отправке аудита не мешает экспорту', async () => {
    mockAgGridApi.getFilterModel.mockReturnValue({});
    mockAgGridApi.getDisplayedRowCount.mockReturnValue(5);
    mockAgGridApi.getAllDisplayedColumns.mockReturnValue([{ getColId: () => 'col1' }]);

    global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

    render(
      <Router history={history}>
        <Header user={{ family_name: 'Иванов', given_name: 'Иван' }} onLogout={jest.fn()} />
      </Router>,
    );

    const exportButton = screen.getByText('Выгрузить отчет');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockAgGridApi.exportDataAsExcel).toHaveBeenCalled();
    });
  });

  test('кнопка "СУМ" открывает новую страницу', () => {
    const mockLocationAssign = jest.spyOn(window.location, 'assign').mockImplementation();

    render(
      <Router history={history}>
        <Header user={{ family_name: 'Иванов', given_name: 'Иван' }} onLogout={jest.fn()} />
      </Router>,
    );

    const sumButton = screen.getByText('СУМ');
    fireEvent.click(sumButton);

    expect(mockLocationAssign).toHaveBeenCalledWith('/sum');
    mockLocationAssign.mockRestore();
  });

  test('кнопка выхода вызывает onLogout', () => {
    const mockOnLogout = jest.fn();

    render(
      <Router history={history}>
        <Header user={{ family_name: 'Иванов', given_name: 'Иван' }} onLogout={mockOnLogout} />
      </Router>,
    );

    const logoutButton = screen.getByLabelText('Выйти из учетной записи');
    fireEvent.click(logoutButton);

    expect(mockOnLogout).toHaveBeenCalled();
  });

  test('кнопка экспорта отключена, если agGridApi отсутствует', () => {
    useGlobalStore.mockReturnValue({ agGridApi: null });

    render(
      <Router history={history}>
        <Header user={{ family_name: 'Иванов', given_name: 'Иван' }} onLogout={jest.fn()} />
      </Router>,
    );

    const exportButton = screen.getByText('Выгрузить отчет');
    expect(exportButton).toBeDisabled();
  });
});
