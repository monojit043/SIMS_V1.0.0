# SIMS Backend

Express + PostgreSQL REST API for the Special Items Management System, covering the four
frontend modules: Job Entry, ST6 Report Upload, Special Item Details, and P&ID Highlighting.

## Folder structure

- `server.js` — app entry point (loads env, connects to PostgreSQL, starts the HTTP server)
- `config/` — Sequelize connection setup
- `models/` — Sequelize models (`User`, `JobRecord`, `Upload`, `PidDocument`)
- `routes/` — Express routers, one per resource, aggregated in `routes/index.js`
- `controllers/` — HTTP layer: parses `req`, calls a service, shapes the response
- `services/` — business logic and DB access, independent of Express
- `middleware/` — JWT auth guard, multer upload configs, centralized error handler
- `utils/` — `ApiError`, `asyncHandler`, and a `seed.js` script for a first admin user
- `uploads/` — on-disk storage for uploaded ST6 reports and P&ID source files (served at `/uploads/...`)

## Setup

Install [PostgreSQL](https://www.postgresql.org/download/windows/) and create a database (e.g. `sims`)
before starting the server — the app connects to it but doesn't create the database itself.

```bash
cd BACKEND
npm install
copy .env.example .env   # then edit PGDATABASE/PGUSER/PGPASSWORD (or DATABASE_URL), JWT_SECRET, CORS_ORIGIN
```

Tables are created/updated automatically on startup via `sequelize.sync({ alter: true })` — no
manual migration step is needed for this project's size. For a production deployment, swap this
for proper `sequelize-cli` migrations.

Create a first login user:

```bash
npm run seed
# creates username "admin" / password "admin123" unless SEED_USERNAME/SEED_PASSWORD are set
```

Run the server:

```bash
npm run dev     # nodemon, auto-restarts on change
npm start        # plain node
```

The API listens on `http://localhost:5000/api` by default (`PORT` in `.env`).

## API overview

All endpoints except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

### Auth
- `POST /api/auth/register` `{ username, password, name?, role? }`
- `POST /api/auth/login` `{ username, password }` → `{ user, token }`
- `GET /api/auth/me`

### Job records (Special Items Collection / Special Item Details)
- `POST /api/records` — create a Draft or Submitted entry (`{ status: "Draft"|"Submitted", jobNumber, unitNumber, itemName, lineNumber, items: [...], ... }`)
- `GET /api/records?jobNumber=&unitNumber=&lineNumber=&itemName=&status=` — list/filter
- `GET /api/records/:id`
- `PUT /api/records/:id`
- `DELETE /api/records/:id`

### ST6 report uploads
- `POST /api/uploads` — multipart form: `jobNumber`, `unitNumber`, `reportFile` (.xlsx/.xls/.csv/.pdf)
- `GET /api/uploads?jobNumber=&unitNumber=`
- `GET /api/uploads/:id`
- `GET /api/uploads/:id/download`
- `DELETE /api/uploads/:id`

### P&ID markup documents
- `POST /api/pid` — multipart form: `name`, `jobNumber?`, `unitNumber?`, `highlights?` (JSON string array), `file?` (image or PDF)
- `GET /api/pid?jobNumber=&unitNumber=` — list (metadata only)
- `GET /api/pid/:id` — full document including `highlights`
- `PUT /api/pid/:id` — same fields as create, all optional; replaces the file if a new one is sent
- `DELETE /api/pid/:id`

### Lookups
- `GET /api/lookups` — static dropdown data (job numbers, unit numbers, item names by category, line info) mirrored from the frontend's hard-coded lists

## Notes

- Uploaded files are stored under `uploads/reports/` and `uploads/pid/` and served statically at
  `/uploads/reports/<file>` and `/uploads/pid/<file>`.
- `JobRecord.items[]` and `PidDocument.highlights[]` are intentionally schema-flexible to match the
  varying shapes used by the Job Entry table rows and the P&ID annotation editor.
