const { queryEpulse } = require("../config/externalDb");

// Static reference data mirroring the dropdown options hard-coded in the
// frontend (JOB-FORM.HTML / job-form.js). Centralized here so the frontend
// can eventually fetch them instead of duplicating the lists.

const CATEGORY_1_ITEMS = [
  "Temporary Strainer",
  "Process Hose",
  "Steam Trap",
  "Static Mixer",
  "Injection Quill",
  "Spray Nozzle",
  "Process Trap",
  "Permanent Strainer",
];
const CATEGORY_2_ITEMS = ["Utility Hose", "CSTA"];
const ITEM_NAMES = [...CATEGORY_1_ITEMS, ...CATEGORY_2_ITEMS];

const LINE_INFO_LOOKUP = {
  "P-101-12345": { lineSize: "6\"", pipingSpec: "A1A", lineTemp: "150 °C", rating: "150#" },
  "P-111-54321": { lineSize: "4\"", pipingSpec: "B2C", lineTemp: "90 °C", rating: "300#" },
  "P-102-98765": { lineSize: "8\"", pipingSpec: "C3D", lineTemp: "200 °C", rating: "600#" },
  "P-128-11223": { lineSize: "2\"", pipingSpec: "D4E", lineTemp: "40 °C", rating: "150#" },
};

function getCategoryForItem(itemName) {
  if (CATEGORY_1_ITEMS.includes(itemName)) return "1";
  if (CATEGORY_2_ITEMS.includes(itemName)) return "2";
  return "";
}

function getAll() {
  return {
    itemNames: ITEM_NAMES,
    category1Items: CATEGORY_1_ITEMS,
    category2Items: CATEGORY_2_ITEMS,
    lineNumbers: Object.keys(LINE_INFO_LOOKUP),
    lineInfo: LINE_INFO_LOOKUP,
  };
}

// Job Number / Unit Number options for the logged-in user — the jobs + units where they are
// on the IPMCS team (GL / SGL from PC-2, ML / JE from IPMCS), read live: see access.service.js.
// Same shape as before: [{ projectId, projectName, units: [unitNo] }]
function groupAccess(accessRows) {
  const byJob = new Map();
  accessRows.forEach((a) => {
    if (!byJob.has(a.jobNo)) byJob.set(a.jobNo, { projectId: a.jobNo, projectName: a.jobName || "", units: [] });
    byJob.get(a.jobNo).units.push(a.unitNo);
  });
  return [...byJob.values()].map((j) => ({ ...j, units: j.units.sort() }));
}

// Every active P&ID of the job + unit from ePULSE's P&ID module (index + current revision),
// shown on the Job Form; "Open for Highlighting" copies the current revision into SIMS.
async function getPidMasterIndex(jobNo, unitNo) {
  if (!jobNo || !unitNo) return [];
  const { rows } = await queryEpulse(
    `SELECT mi.id, mi.pid_name, mi.zone, mi.status, mi.created_by, mi.created_at,
            mi.retired_by, mi.retired_at, mi.retire_reason,
            d.id AS document_id, d.rev_label
     FROM pid_master_index mi
     LEFT JOIN pid_documents d ON d.master_index_id = mi.id AND d.status = 'current'
     WHERE mi.job_no = $1 AND mi.unit_no = $2 AND mi.status = 'active'
     ORDER BY mi.pid_name`,
    [jobNo, unitNo]
  );
  return rows.map((row) => ({
    id: row.id,
    pidName: row.pid_name,
    zone: row.zone,
    status: row.status,
    revLabel: row.rev_label,
    hasPdf: !!row.document_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    retiredBy: row.retired_by,
    retiredAt: row.retired_at,
    retireReason: row.retire_reason,
  }));
}

// Line numbers for the P&ID dialog's Line Number dropdown, from ePULSE's line list (line_list),
// composed as service-unitNo-lineNo (e.g. "AI-101-04109"). The line list's unit_no reads e.g.
// "101 (PDH Unit)", so match on parent_unit or the leading unit number.
async function getLineNumbers(jobNo, unitNo) {
  if (!jobNo || !unitNo) return [];
  const { rows: lines } = await queryEpulse(
    `SELECT service, line_no, line_size, line_class, pid_no FROM line_list
     WHERE project_id = $1 AND (parent_unit = $2 OR split_part(unit_no, ' ', 1) = $2)
       AND coalesce(line_no, '') <> ''
     ORDER BY line_no, service`,
    [jobNo, unitNo]
  );

  const byLineNo = new Map();
  lines.forEach((line) => {
    const composedLineNo = [line.service, unitNo, line.line_no].filter(Boolean).join("-");
    if (byLineNo.has(composedLineNo)) return;
    byLineNo.set(composedLineNo, {
      lineNo: composedLineNo,
      lineSize: line.line_size || "",
      lineClass: line.line_class || "",
      service: line.service || "",
      pidNo: line.pid_no || "",
    });
  });

  return Array.from(byLineNo.values());
}

module.exports = {
  getAll,
  getCategoryForItem,
  groupAccess,
  getPidMasterIndex,
  getLineNumbers,
  LINE_INFO_LOOKUP,
};
