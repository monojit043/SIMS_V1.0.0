const { queryEpulse, queryIpmcs } = require("../config/externalDb");

// Who may use SIMS where — exactly the IPMCS team of each job + unit, read live:
//   LEAD — GL of the job + unit, or SGL of the job (all its units), from PC-2 (via ePULSE)
//   ML   — Material Lead, appointed in IPMCS
//   JE   — Job Engineer, added in IPMCS
// SIMS keeps no user list of its own. A LEAD or ML anywhere is a SIMS admin
// (3D library tasks: delegate / backfill), the same rights ML has in IPMCS.
const ROLE_RANK = { LEAD: 3, ML: 2, JE: 1 };

async function pimsLeads(empId) {
  const { rows } = await queryEpulse(
    `SELECT project_id AS "jobNo", unit_no AS "unitNo" FROM user_role_assignments
     WHERE role = 'GL' AND upper(user_id) = upper($1)
     UNION
     SELECT pu.project_id, pu.unit_no
     FROM (SELECT project_id, user_id FROM user_role_assignments WHERE role = 'SGL'
           UNION SELECT project_id, user_id FROM project_sgls) s
     JOIN project_units pu ON pu.project_id = s.project_id
     WHERE upper(s.user_id) = upper($1)`,
    [empId]
  );
  return rows;
}

// Every job + unit the employee may open in SIMS, with the role there:
// [{ jobNo, unitNo, jobName, role }]
async function getAccess(empId) {
  if (!empId) return [];
  const [leads, { rows: team }, { rows: jobs }] = await Promise.all([
    pimsLeads(empId),
    queryIpmcs(`SELECT job_no AS "jobNo", unit_no AS "unitNo", role FROM ipmcs_user_assignments WHERE upper(emp_id) = upper($1)`, [empId]),
    queryEpulse(`SELECT id, name FROM projects`),
  ]);
  const jobName = new Map(jobs.map((j) => [j.id, j.name]));
  const byKey = new Map();
  const put = (jobNo, unitNo, role) => {
    const k = `${jobNo}|${unitNo}`;
    const cur = byKey.get(k);
    if (!cur || ROLE_RANK[role] > ROLE_RANK[cur.role]) byKey.set(k, { jobNo, unitNo, jobName: jobName.get(jobNo) || "", role });
  };
  leads.forEach((l) => put(l.jobNo, l.unitNo, "LEAD"));
  team.forEach((t) => put(t.jobNo, t.unitNo, t.role));
  return [...byKey.values()].sort((a, b) => a.jobNo.localeCompare(b.jobNo) || a.unitNo.localeCompare(b.unitNo));
}

const canOpen = (access, jobNo, unitNo) => access.some((a) => a.jobNo === jobNo && a.unitNo === unitNo);
const isAdmin = (access) => access.some((a) => a.role === "LEAD" || a.role === "ML");

module.exports = { getAccess, canOpen, isAdmin, ROLE_RANK };
