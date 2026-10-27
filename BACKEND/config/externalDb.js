const { Pool } = require("pg");

// SIMS reads two other databases LIVE and READ-ONLY — nothing is copied or synced:
//  - ePULSE (PC-1): logins (pc2_emp.users — ePULSE's live link to PC-2's eil_employees),
//    jobs / units / GL / SGL (ePULSE's live PC-2 views: projects, project_units,
//    user_role_assignments, project_sgls), the line list (line_list) and the P&ID
//    module (pid_master_index, pid_documents).
//  - IPMCS (PC-1): the IPMCS team of each job + unit (ipmcs_user_assignments: ML / JE).
//    Whoever is on the IPMCS team of a job + unit can use SIMS there — SIMS keeps no
//    user list of its own.
// SIMS' own data (P&ID copies + highlights, special item tags, reports, library tasks)
// stays in its own database (config/db.js).

function readOnlyPool(prefix, defaults) {
  return new Pool({
    host: process.env[`${prefix}_HOST`] || "localhost",
    port: Number(process.env[`${prefix}_PORT`]) || 5432,
    database: process.env[`${prefix}_NAME`] || defaults.database,
    user: process.env[`${prefix}_USER`] || "postgres",
    password: process.env[`${prefix}_PASSWORD`],
    options: "-c default_transaction_read_only=on",
    max: 5,
  });
}

const epulsePool = readOnlyPool("EPULSE_DB", { database: "ePULSE_DEV_v1.0.0" });
const ipmcsPool = readOnlyPool("IPMCS_DB", { database: "IPMCS_UTILITY_1.0" });

for (const p of [epulsePool, ipmcsPool]) {
  p.on("error", (err) => console.error("Unexpected error on an idle external DB client:", err.message));
}

const queryEpulse = (text, params) => epulsePool.query(text, params);
const queryIpmcs = (text, params) => ipmcsPool.query(text, params);

async function connectExternalDbs() {
  const { rows: [e] } = await queryEpulse("SELECT current_database() AS db, (SELECT count(*) FROM line_list)::int AS lines");
  console.log(`ePULSE connected: ${e.db} (line list: ${e.lines} lines)`);
  const { rows: [i] } = await queryIpmcs("SELECT current_database() AS db, (SELECT count(*) FROM ipmcs_user_assignments)::int AS team");
  console.log(`IPMCS connected: ${i.db} (team assignments: ${i.team})`);
  // Logins and GL / SGL go through ePULSE's live link to PC-2 — reported separately
  try {
    const { rows: [u] } = await queryEpulse("SELECT count(*)::int AS n FROM pc2_emp.users");
    console.log(`PC-2 (via ePULSE) reachable: ${u.n} employees`);
  } catch (error) {
    console.error(`PC-2 not reachable through ePULSE (${error.message}) — nobody can log in until PC-2 is back.`);
  }
}

module.exports = { epulsePool, ipmcsPool, queryEpulse, queryIpmcs, connectExternalDbs };
