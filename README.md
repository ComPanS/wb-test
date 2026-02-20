# WB Tariffs Sync

В задаче было указано что приложение должно запускаться одной командой и без манипуляций, так что я допустил .env и credentials в репозиторий. При обычный условиях, такое не пропускается

После запуска проверить https://docs.google.com/spreadsheets/d/1m-laW3TB3372mv6vY3Z4aBHxWx4Qz7ZiawwCX_OpDtY/edit?gid=1257736581#gid=1257736581

Приложение по заданию из `task.md`:
- Раз в час забирает тарифы WB `https://common-api.wildberries.ru/api/v1/tariffs/box?date=YYYY-MM-DD`.
- Хранит срезы по дням в PostgreSQL.
- Отправляет актуальные данные в Google Sheets (лист `stocks_coefs`), сортируя по коэффициенту.

## Быстрый запуск (Docker)
```bash
docker compose up --build
```
Что происходит: поднимается Postgres, накатываются миграции+сид, выполняется первый цикл WB → DB → Sheets, дальше работает по расписанию (`SYNC_INTERVAL_MINUTES`, по умолчанию 60).

> Если порт 5432 занят, смените `POSTGRES_PORT` в `.env`, например на 5433.

## Переменные окружения (главные)
- `WB_API_TOKEN` — действующий токен WB 
- `POSTGRES_HOST/PORT/DB/USER/PASSWORD` — по заданию используются `postgres/postgres/postgres` и порт по умолчанию `5432`.
- `GOOGLE_CREDENTIALS_PATH` — путь к сервис-аккаунту (по умолчанию `/app/credentials.json`).
- `GOOGLE_SPREADSHEET_IDS` — список ID/URL таблиц через запятую; по умолчанию берётся сид `1m-laW3TB3372mv6vY3Z4aBHxWx4Qz7ZiawwCX_OpDtY`.
- `GOOGLE_SHEET_NAME` — имя листа (по умолчанию `stocks_coefs`).

## Подготовка Google (уже сделано)
1) Создайте `credentials.json` по шаблону `credentials.example.json` или используйте выданный файл.  
2) Дайте сервис-аккаунту доступ к таблицам.  
3) Лист `stocks_coefs` создаётся автоматически, если его нет.

## Как здесь используется Knex
- Настройки и пути миграций/сидов в `src/config/knex/knexfile.ts` (берёт параметры из `.env`).
- При старте `src/app.ts` выполняет `migrate.latest()` и `seed.run()` — база готовится автоматом.
- CLI для ручного управления: `npm run knex:dev migrate latest|rollback|up|down|list` и `npm run knex:dev seed run`.
- В коде: `src/services/wb/repository.ts` делает транзакционный upsert дневных тарифов и выборку последнего среза.


