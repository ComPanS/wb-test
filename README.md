# WB Tariffs Sync

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

## Подготовка Google
1) Создайте `credentials.json` по шаблону `credentials.example.json` или используйте выданный файл.  
2) Дайте сервис-аккаунту доступ к таблицам.  
3) Лист `stocks_coefs` создаётся автоматически, если его нет.


