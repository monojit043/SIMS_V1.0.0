const { Sequelize } = require("sequelize");

// Two read-only external databases — normally on the same Postgres server as the main SIMS DB
// (falls back to the PG* vars below), but EXTERNAL_PG* lets them point at a different server
// (e.g. the real office PIMS/Employee DB host) while SIMS' own DB connection stays untouched.
//  - MASTER_EMPLOYEE_DB: employee_details is now the single source of truth for login.
//  - PIMS_SQL: user_role_assignments drives each user's Job Number / Unit Number options.
// We never sync() against these — we don't own their schema, only read from it.

const EXTERNAL_PGHOST = process.env.EXTERNAL_PGHOST || process.env.PGHOST || "127.0.0.1";
const EXTERNAL_PGPORT = process.env.EXTERNAL_PGPORT || process.env.PGPORT || 5432;
const EXTERNAL_PGUSER = process.env.EXTERNAL_PGUSER || process.env.PGUSER || "postgres";
const EXTERNAL_PGPASSWORD = process.env.EXTERNAL_PGPASSWORD || process.env.PGPASSWORD || "postgres";

const employeeSequelize = new Sequelize(
  process.env.MASTER_EMPLOYEE_DB_NAME || "MASTER_EMPLOYEE_DB",
  EXTERNAL_PGUSER,
  EXTERNAL_PGPASSWORD,
  {
    host: EXTERNAL_PGHOST,
    port: EXTERNAL_PGPORT,
    dialect: "postgres",
    logging: false,
  }
);

const pimsSequelize = new Sequelize(
  process.env.PIMS_DB_NAME || "PIMS_SQL",
  EXTERNAL_PGUSER,
  EXTERNAL_PGPASSWORD,
  {
    host: EXTERNAL_PGHOST,
    port: EXTERNAL_PGPORT,
    dialect: "postgres",
    logging: false,
  }
);

async function connectExternalDbs() {
  await employeeSequelize.authenticate();
  console.log(`MASTER_EMPLOYEE_DB connected: ${employeeSequelize.config.database}`);

  await pimsSequelize.authenticate();
  console.log(`PIMS DB connected: ${pimsSequelize.config.database}`);
}

module.exports = { employeeSequelize, pimsSequelize, connectExternalDbs };
