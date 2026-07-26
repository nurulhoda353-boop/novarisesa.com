# NOVARISE API

FastAPI and PostgreSQL backend for the NOVARISE public website, CMS, and management dashboard.

## Local development

1. Create a PostgreSQL database named `novarise`.
2. Copy `.env.example` to `.env` and replace all development secrets.
3. Install and run:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\uvicorn.exe app.main:app --reload
```

Health endpoints:

- `GET /api/v1/health` checks the application process.
- `GET /api/v1/ready` verifies the database connection.

## Production

The Docker image runs `alembic upgrade head` before starting Uvicorn. Required environment variables:

- `APP_ENV=production`
- `APP_SECRET_KEY=<32+ random characters>`
- `DATABASE_URL=postgresql+psycopg://...`
- `CORS_ORIGINS=["https://novarisesa.com","https://www.novarisesa.com","https://my.novarisesa.com"]`
- `TRUSTED_HOSTS=["api.novarisesa.com"]`

Keep PostgreSQL private inside the Coolify network. Do not expose port 5432 publicly.

## Schema workflow

The frozen baseline migration is under `alembic/versions`. For later model changes:

```powershell
.\.venv\Scripts\alembic.exe revision --autogenerate -m "describe change"
.\.venv\Scripts\alembic.exe upgrade head
```

Review every generated migration before deployment.
