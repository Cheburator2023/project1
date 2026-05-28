# Текущая структура и поток сохранения значений usage

## 1. Назначение документа

Документ фиксирует текущее устройство сохранения значений блока использования моделей (`usage`) в модуле `src/modules/usage`.

Цель документа:
- описать фактический путь данных от входящего API-запроса до записи в БД;
- зафиксировать текущие контракты и внутренние точки маршрутизации;
- описать, какие сервисы, таблицы и SQL-запросы участвуют в сохранении;
- выделить особенности текущей реализации, которые необходимо учитывать при доработке массового сохранения.

Документ описывает текущее состояние системы и не задает целевую архитектуру изменений.

## 2. Область анализа

В анализ включены следующие уровни:
- входной API-контроллер обновления моделей;
- DTO и базовая валидация входящих данных;
- маршрутизация внутри `ModelsService`;
- преобразование usage-артефактов в внутренний формат;
- выбор реализации по источнику модели (`sum` / `sum-rm`);
- логика сохранения в БД;
- таблицы истории;
- чтение usage-данных обратно в карточку модели.

Основные файлы:
- [src/api/controllers/models.controller.ts](mrms-backend/src/api/controllers/models.controller.ts:248)
- [src/api/dto/index.dto.ts](mrms-backend/src/api/dto/index.dto.ts:166)
- [src/modules/models/models.service.ts](mrms-backend/src/modules/models/models.service.ts:486)
- [src/modules/usage/usage.service.ts](mrms-backend/src/modules/usage/usage.service.ts:17)
- [src/modules/usage/services/mrm-usage.service.ts](mrms-backend/src/modules/usage/services/mrm-usage.service.ts:44)
- [src/modules/usage/services/sum-usage.service.ts](mrms-backend/src/modules/usage/services/sum-usage.service.ts:49)
- [src/modules/models/sql/sum-rm/getModels.ts](mrms-backend/src/modules/models/sql/sum-rm/getModels.ts:26)
- [src/modules/models/sql/sum/getModels.ts](mrms-backend/src/modules/models/sql/sum/getModels.ts:75)

## 3. Общая схема потока

Текущий поток сохранения usage-значений выглядит так:

1. Клиент вызывает `PUT /update`.
2. Контроллер принимает массив моделей в формате `ModelsUpdateDto[]`.
3. `ModelsService.modelsUpdate(...)` разбирает `artefacts[]` каждой модели по типам.
4. Usage-артефакты выделяются в отдельный массив `modelsUsageForUpdate`.
5. `UsageService.updateUsage(...)` преобразует usage-артефакты в внутренние записи `UpdateUsageDto`.
6. По `model_source` выбирается конкретная реализация:
   - `MrmUsageService` для `sum-rm`
   - `SumUsageService` для `sum`
7. Нижний сервис выполняет:
   - проверку существования модели;
   - поиск существующей usage-записи;
   - `insert` или `update`;
   - запись в history.
8. После завершения `modelsUpdate(...)` повторно получает карточки моделей через `getModels(...)`.
9. Usage-значения в ответе читаются уже не из артефактов, а из usage-таблиц через агрегирующие SQL-запросы.

## 4. Точка входа API

### 4.1 Endpoint

Входная точка обновления моделей расположена в контроллере:
- [src/api/controllers/models.controller.ts](mrms-backend/src/api/controllers/models.controller.ts:248)

Метод:
- `PUT /update`
- `updateModels(...)`

Метод:
- принимает массив моделей;
- запускает `modelsService.modelsUpdate(modelsArtefacts, user)`;
- оборачивает выполнение в `Promise.race(...)` с timeout;
- при успехе возвращает обновленные карточки моделей.

### 4.2 Особенность точки входа

Endpoint изначально является общим для обновления модели целиком. Он не специализируется на usage и не принимает отдельный usage payload.

Usage сохраняется как часть общего обновления модели.

## 5. Входной контракт

### 5.1 DTO модели

Входной DTO описан в:
- [src/api/dto/index.dto.ts](mrms-backend/src/api/dto/index.dto.ts:166)

Основной контракт:

```ts
export class ModelsUpdateDto {
  model_id: string
  model_source: string
  artefacts: ArtefactDto[]
}
```

### 5.2 DTO артефакта

Каждый элемент `artefacts[]` содержит:

```ts
class ArtefactDto {
  artefact_tech_label: string
  artefact_value_id: number | null
  artefact_string_value: string
}
```

### 5.3 Характер контракта

Контракт унифицирован для всех типов обновлений:
- имя модели;
- артефакты;
- allocation;
- usage;
- прочие поля карточки.

Usage не имеет собственного DTO и собственного API-контракта.

## 6. Базовая валидация

На входе выполняется общая DTO-валидация:
- `model_id` должен быть UUID;
- `model_source` должен соответствовать enum;
- `artefacts` должен быть массивом;
- `artefacts` не должен быть пустым.

Используемые точки:
- [src/api/controllers/models.controller.ts](mrms-backend/src/api/controllers/models.controller.ts:250)
- [src/main.ts](mrms-backend/src/main.ts:35)

### 6.1 Ограничение текущей валидации

Предметной usage-валидации на уровне входного DTO нет:
- отдельно не валидируется формат даты;
- отдельно не валидируются допустимые значения usage-флага;
- отдельно не проверяется конфликт нескольких usage-полей для одного квартала;
- `confirmation_year` не приходит во внешнем контракте и не валидируется.

## 7. Идентификация usage-полей

Usage-артефакты определяются внутри `ModelsService` методом:
- [src/modules/models/models.service.ts](mrms-backend/src/modules/models/models.service.ts:471)

К usage относятся:
- `usage_confirm_date_q1`
- `usage_confirm_date_q2`
- `usage_confirm_date_q3`
- `usage_confirm_date_q4`
- `usage_confirm_flag_q1`
- `usage_confirm_flag_q2`
- `usage_confirm_flag_q3`
- `usage_confirm_flag_q4`

Эти поля также описаны как псевдоартефакты в:
- [src/modules/artefacts/constants/pseudo-artefacts.constants.ts](mrms-backend/src/modules/artefacts/constants/pseudo-artefacts.constants.ts:137)

## 8. Маршрутизация внутри ModelsService

### 8.1 Оркестрация обновления

Центральная точка обработки:
- [src/modules/models/models.service.ts](mrms-backend/src/modules/models/models.service.ts:486)

Метод:
- `modelsUpdate(modelsArtefacts, user)`

### 8.2 Логика разбора

Внутри `modelsUpdate(...)`:

1. Входные данные сначала проходят через `mergeArtefacts(...)`.
2. Далее по каждой модели выполняется разбор `artefacts[]`.
3. Артефакты раскладываются по категориям:
   - `namesForUpdate`
   - `artefactsForUpdate`
   - `modelsAllocationForUpdate`
   - `modelsUsageForUpdate`
4. Разбиение выполняется отдельно по `model_source`.

### 8.3 Передача usage дальше

Если артефакт распознан как usage, он складывается в `updates.modelsUsageForUpdate`.

Затем внутри `executeDatabaseUpdates(...)` usage передается в:
- `this.usageService.updateUsage(modelsUsageForUpdate, source)`

Точка вызова:
- [src/modules/models/models.service.ts](mrms-backend/src/modules/models/models.service.ts:797)

### 8.4 Роль ModelsService

`ModelsService` не сохраняет usage напрямую.

Его роль:
- принять общий batch обновления моделей;
- выделить usage-артефакты из общего набора;
- передать usage-данные в модуль `usage`;
- после завершения получить обновленные карточки моделей.

## 9. Слой UsageService

Внешний фасад usage расположен в:
- [src/modules/usage/usage.service.ts](mrms-backend/src/modules/usage/usage.service.ts:9)

Основной метод:
- `updateUsage(data, source)`

### 9.1 Обязанности UsageService

`UsageService` выполняет:
- преобразование набора usage-артефактов в внутренний формат;
- выбор нижнего usage-сервиса по `source`;
- последовательный вызов логики сохранения для каждой подготовленной usage-записи;
- обновление `update_date` после успешного изменения.

### 9.2 Выбор реализации

Выбор реализации делается через:
- [src/modules/usage/factories/usage-service.factory.ts](mrms-backend/src/modules/usage/factories/usage-service.factory.ts:10)

Используются две реализации:
- `MrmUsageService`
- `SumUsageService`

## 10. Преобразование usage-артефактов

Преобразование выполняется в методе:
- [src/modules/usage/usage.service.ts](mrms-backend/src/modules/usage/usage.service.ts:62)

### 10.1 Что делает transformArtefacts(...)

Метод:
- берёт исходный список usage-артефактов;
- извлекает из `artefact_tech_label` тип поля и квартал;
- определяет `confirmation_year`;
- собирает внутреннюю структуру `UpdateUsageDto`.

Внутренний формат:

```ts
type UpdateUsageDto = {
  model_id: string
  confirmation_year: number
  confirmation_quarter: number
  confirmation_date: string | null
  is_used: boolean | null
  creator: string
}
```

Источник типа:
- [src/modules/usage/dto/update-usage.dto.ts](mrms-backend/src/modules/usage/dto/update-usage.dto.ts:1)

### 10.2 Извлечение квартала и типа

Используется регулярное выражение:

```ts
/usage_confirm_(date|flag)_q(\d)/
```

Из него определяются:
- `type = date | flag`
- `confirmation_quarter = 1..4`

### 10.3 Преобразование даты

Дата преобразуется методом:
- [src/modules/usage/usage.service.ts](mrms-backend/src/modules/usage/usage.service.ts:57)

Логика:
- вход ожидается в формате `dd.mm.yyyy`;
- далее строка преобразуется в `yyyy-mm-dd`.

### 10.4 Преобразование флага

Флаг usage преобразуется по правилу:
- `Да` -> `true`
- любое иное значение -> `false`

Точка преобразования:
- [src/modules/usage/usage.service.ts](mrms-backend/src/modules/usage/usage.service.ts:102)

## 11. Определение года квартала

Год квартала не приходит из API явно. Он вычисляется на сервере.

Точки:
- [src/modules/usage/usage.service.ts](mrms-backend/src/modules/usage/usage.service.ts:46)
- [src/system/common/utils.ts](mrms-backend/src/system/common/utils.ts:183)

### 11.1 Текущая логика

Для `Q1-Q3` обычно используется текущий год.

Для `Q4` предусмотрена логика переходного периода:
- если предыдущий `Q4` ещё открыт для редактирования по бизнес-правилу `canEditQuarter(...)`,
  используется предыдущий год.

### 11.2 Значение этой логики

Это означает, что итоговая usage-запись формируется не только из входных данных клиента, но и из серверного бизнес-правила по текущей дате.

## 12. Сохранение usage для источника sum-rm

MRM-реализация расположена в:
- [src/modules/usage/services/mrm-usage.service.ts](mrms-backend/src/modules/usage/services/mrm-usage.service.ts:35)

Основной метод:
- `handleUpdateUsage(data: UpdateUsageDto)`

### 12.1 Последовательность действий

Текущий алгоритм:

1. Проверить, существует ли модель.
2. Найти usage-запись по:
   - `model_id`
   - `confirmation_year`
   - `confirmation_quarter`
3. Если записи нет:
   - выполнить `INSERT INTO models_usage`
4. Если запись есть:
   - сравнить текущие и новые значения;
   - если есть изменения, выполнить `UPDATE models_usage`
5. После `insert/update` записать историю:
   - `INSERT INTO models_usage_history`
6. Вернуть результат как `true/false`.

### 12.2 Таблицы

Используются таблицы:
- `models_usage`
- `models_usage_history`

### 12.3 SQL-точки

Чтение существующей записи:
- [src/modules/usage/services/mrm-usage.service.ts](mrms-backend/src/modules/usage/services/mrm-usage.service.ts:238)

Обновление:
- [src/modules/usage/services/mrm-usage.service.ts](mrms-backend/src/modules/usage/services/mrm-usage.service.ts:283)

Вставка:
- [src/modules/usage/services/mrm-usage.service.ts](mrms-backend/src/modules/usage/services/mrm-usage.service.ts:338)

Запись истории:
- [src/modules/usage/services/mrm-usage.service.ts](mrms-backend/src/modules/usage/services/mrm-usage.service.ts:395)

## 13. Сохранение usage для источника sum

SUM-реализация расположена в:
- [src/modules/usage/services/sum-usage.service.ts](mrms-backend/src/modules/usage/services/sum-usage.service.ts:40)

Основной метод:
- `handleUpdateUsage(data: UpdateUsageDto)`

### 13.1 Последовательность действий

Текущий алгоритм аналогичен MRM:

1. Проверить существование модели.
2. Найти usage-запись по:
   - `model_id`
   - `confirmation_year`
   - `quarter`
3. Если записи нет:
   - выполнить `INSERT INTO model_usage_confirm`
4. Если запись есть:
   - сравнить текущие и новые значения;
   - если есть изменения, выполнить `UPDATE model_usage_confirm`
5. После `insert/update` записать историю:
   - `INSERT INTO model_usage_confirm_history`
6. Вернуть результат как `true/false`.

### 13.2 Таблицы

Используются таблицы:
- `model_usage_confirm`
- `model_usage_confirm_history`

### 13.3 SQL-точки

Чтение существующей записи:
- [src/modules/usage/services/sum-usage.service.ts](mrms-backend/src/modules/usage/services/sum-usage.service.ts:239)

Обновление:
- [src/modules/usage/services/sum-usage.service.ts](mrms-backend/src/modules/usage/services/sum-usage.service.ts:284)

Вставка:
- [src/modules/usage/services/sum-usage.service.ts](mrms-backend/src/modules/usage/services/sum-usage.service.ts:339)

Запись истории:
- [src/modules/usage/services/sum-usage.service.ts](mrms-backend/src/modules/usage/services/sum-usage.service.ts:396)

## 14. Используемый слой доступа к БД

Сервисы доступа к БД:
- [src/system/mrm-database/database.service.ts](mrms-backend/src/system/mrm-database/database.service.ts:39)
- [src/system/sum-database/database.service.ts](mrms-backend/src/system/sum-database/database.service.ts:39)

### 14.1 Текущая модель работы

Каждый вызов `query(...)`:
- получает client из пула;
- выполняет один SQL-запрос;
- освобождает client.

### 14.2 Практическое следствие

Текущий поток сохранения usage состоит из набора отдельных SQL-запросов и не описан как единая транзакция на уровне существующего database service.

## 15. Обновление update_date

После вызова `handleUpdateUsage(...)` для всех подготовленных записей `UsageService.updateUsage(...)` проверяет, были ли реальные изменения.

Если изменения были, выполняется обновление `update_date` через:
- [src/modules/usage/usage.service.ts](mrms-backend/src/modules/usage/usage.service.ts:29)

Обновление делается через `ModelServiceFactory`.

## 16. Чтение usage обратно в карточку модели

После завершения `modelsUpdate(...)` карточки моделей перечитываются повторно.

### 16.1 MRM

Для `sum-rm` usage читается из:
- [src/modules/models/sql/sum-rm/getModels.ts](mrms-backend/src/modules/models/sql/sum-rm/getModels.ts:51)

Из таблицы:
- `models_usage`

Формируются поля:
- `usage_confirm_date_q1..q4`
- `usage_confirm_flag_q1..q4`

### 16.2 SUM

Для `sum` usage читается из:
- [src/modules/models/sql/sum/getModels.ts](mrms-backend/src/modules/models/sql/sum/getModels.ts:114)

Из таблицы:
- `model_usage_confirm`

Формируются те же поля:
- `usage_confirm_date_q1..q4`
- `usage_confirm_flag_q1..q4`

### 16.3 Роль read-path

Это подтверждает, что usage-значения живут в отдельных usage-таблицах, а не являются обычными артефактами, сохраняемыми в artefact-таблицы.

## 17. Формальная последовательность вызовов

Ниже приведена упрощенная последовательность текущего вызова.

```text
Client
  -> PUT /models/update
  -> ModelsController.updateModels(...)
  -> ModelsService.modelsUpdate(...)
  -> ModelsService.executeDatabaseUpdates(...)
  -> UsageService.updateUsage(...)
  -> UsageService.transformArtefacts(...)
  -> UsageServiceFactory.getService(source)
  -> MrmUsageService.handleUpdateUsage(...) / SumUsageService.handleUpdateUsage(...)
  -> SELECT existing usage
  -> INSERT or UPDATE usage
  -> INSERT history
  -> ModelsService.getModels(...)
  -> SQL getModels (usage aggregation)
  -> Response
```

## 18. Особенности текущей реализации

Ниже перечислены особенности текущей архитектуры, которые необходимо учитывать при постановке задач на доработку.

### 18.1 Usage сохраняется не отдельным API

Usage не имеет собственного endpoint. Он обновляется только как часть общего `PUT /models/update`.

### 18.2 Usage не сохраняется как обычный артефакт

Несмотря на то, что во входном контракте usage приходит как артефакт, фактическая запись выполняется в отдельные usage-таблицы.

### 18.3 Логика зависит от source

Путь сохранения разветвляется по `model_source`:
- `sum-rm` -> `models_usage`
- `sum` -> `model_usage_confirm`

### 18.4 Год определяется на сервере

`confirmation_year` не приходит явно в API и вычисляется по серверной логике `canEditQuarter(...)`.

### 18.5 Сохранение и чтение используют разные представления данных

На входе usage выглядит как набор артефактов.

На выходе в карточке usage восстанавливается из агрегирующих SQL по usage-таблицам.

## 19. Вывод

Текущий механизм сохранения usage построен как внутренняя специализированная ветка общего обновления модели:
- входные usage-значения приходят как часть `artefacts[]`;
- в `ModelsService` они выделяются в отдельный поток обработки;
- в `UsageService` преобразуются в внутренний DTO;
- далее сохраняются в отдельные таблицы usage и history;
- после сохранения перечитываются в карточку модели через отдельные SQL-агрегаты.

Таким образом, usage уже поддерживает пакетную обработку на уровне входного API `updateModels`, но фактическая логика сохранения реализована как отдельный специализированный контур внутри общего сценария обновления модели.
