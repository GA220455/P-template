# FinanceTrack

Aplicación de finanzas personales: cuentas multidivisa, categorías, transacciones,
panel con gráficos y conversión de divisas en tiempo real.

- **Backend:** FastAPI + SQLAlchemy 2.0 + Alembic sobre PostgreSQL.
- **Frontend:** React 19 + Vite + TypeScript (strict).
- **Autenticación:** JWT (OAuth2 password flow) con hashes bcrypt.
- **API externa:** [Frankfurter](https://www.frankfurter.dev) (tipos de cambio del
  Banco Central Europeo), con caché de tasas en la tabla `fx_rates`.

## Requisitos previos

Python 3.12, Node LTS y PostgreSQL 17 (en esta máquina se instalaron con `winget`).

## 1. Base de datos

Crea el rol y la base de datos (una sola vez). Con `psql` como superusuario:

```sql
CREATE ROLE financetrack LOGIN PASSWORD 'financetrack_dev';
CREATE DATABASE financetrack OWNER financetrack;
```

Desde Git Bash, usando el `psql` de PostgreSQL 17:

```bash
PSQL="/c/Program Files/PostgreSQL/17/bin/psql.exe"
"$PSQL" -U postgres -c "CREATE ROLE financetrack LOGIN PASSWORD 'financetrack_dev';"
"$PSQL" -U postgres -c "CREATE DATABASE financetrack OWNER financetrack;"
```

## 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate        # Git Bash (en cmd: .venv\Scripts\activate)
pip install -r requirements.txt
alembic upgrade head                 # crea el esquema
uvicorn app.main:app --reload        # http://127.0.0.1:8000
```

La configuración se lee de `backend/.env`:

| Variable | Valor por defecto |
| --- | --- |
| `DATABASE_URL` | `postgresql+psycopg://financetrack:financetrack_dev@localhost:5432/financetrack` |
| `JWT_SECRET` | `dev-secret-change-me` (cámbialo en producción) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` |
| `FRANKFURTER_BASE_URL` | `https://api.frankfurter.dev/v1` |
| `CORS_ORIGINS` | `["http://localhost:5173","http://127.0.0.1:5173"]` |

## 3. Frontend

```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

Vite proxyea `/api` hacia `http://127.0.0.1:8000`, así que el frontend y el
backend deben estar levantados a la vez.

## URLs útiles

- Aplicación: <http://localhost:5173>
- Documentación de la API (Swagger): <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/health>

## Usuarios de prueba

| Email | Contraseña | Divisa base |
| --- | --- | --- |
| `demo@financetrack.app` | `demo12345` | MXN |
| `erika@example.com` | `secreto123` | EUR |

También puedes registrarte desde la propia aplicación; al crear la cuenta se
siembran automáticamente las categorías por defecto.

## Build de producción (frontend)

```bash
cd frontend
npm run build      # tsc -b && vite build -> dist/
npm run preview    # sirve el build localmente
```
