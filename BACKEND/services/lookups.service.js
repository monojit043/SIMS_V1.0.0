const { Op } = require("sequelize");
const UserRoleAssignment = require("../models/UserRoleAssignment");
const Project = require("../models/Project");
const PidMasterIndex = require("../models/PidMasterIndex");
const LinelistUpload = require("../models/LinelistUpload");
const LinelistLine = require("../models/LinelistLine");

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

// Job Number / Unit Number options for the logged-in user only, sourced from
// PIMS_SQL.user_role_assignments — replaces the old hard-coded dropdown lists.
async function getMyAssignments(employeeId) {
  const rows = await UserRoleAssignment.findAll({
    where: { user_id: employeeId },
    attributes: ["project_id", "unit_no"],
  });

  const byProject = new Map();
  rows.forEach((row) => {
    if (!row.project_id || !row.unit_no) return;
    if (!byProject.has(row.project_id)) byProject.set(row.project_id, new Set());
    byProject.get(row.project_id).add(row.unit_no);
  });

  const projectIds = Array.from(byProject.keys());
  const projects = projectIds.length ? await Project.findAll({ where: { id: projectIds } }) : [];
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  return Array.from(byProject.entries())
    .map(([projectId, units]) => ({
      projectId,
      projectName: nameById.get(projectId) || "",
      units: Array.from(units).sort(),
    }))
    .sort((a, b) => a.projectId.localeCompare(b.projectId));
}

// Every P&ID registered for a given Job Number + Unit Number, sourced from
// PIMS_SQL.pid_master_index — shown on the Job Form once both are selected.
async function getPidMasterIndex(jobNo, unitNo) {
  if (!jobNo || !unitNo) return [];

  const rows = await PidMasterIndex.findAll({
    where: { job_no: jobNo, unit_no: unitNo },
    order: [["pid_name", "ASC"]],
  });

  return rows.map((row) => ({
    id: row.id,
    pidName: row.pid_name,
    zone: row.zone,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    retiredBy: row.retired_by,
    retiredAt: row.retired_at,
    retireReason: row.retire_reason,
  }));
}

// Line numbers for the P&ID dialog's Line Number dropdown, sourced from PIMS_SQL.linelist_lines
// — filtered by Job Number (job_no only lives on linelist_uploads, joined via upload_id) and
// Unit Number (matched with a prefix search since unit_no is stored inconsistently, e.g. "111"
// vs "111 (PDH Unit)").
async function getLineNumbers(jobNo, unitNo) {
  if (!jobNo || !unitNo) return [];

  const uploads = await LinelistUpload.findAll({
    where: { job_no: jobNo, is_latest: true },
    attributes: ["id"],
  });
  const uploadIds = uploads.map((upload) => upload.id);
  if (!uploadIds.length) return [];

  const lines = await LinelistLine.findAll({
    where: {
      upload_id: uploadIds,
      unit_no: { [Op.iLike]: `${unitNo}%` },
    },
    order: [["line_no", "ASC"]],
  });

  const byLineNo = new Map();
  lines.forEach((line) => {
    if (!line.line_no) return;
    // Composed as service-unitNo-lineNo (e.g. "AI-111-92215") using the clean requested unitNo
    // rather than the raw unit_no column, which is stored inconsistently (e.g. "111 (PDH Unit)").
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
  getMyAssignments,
  getPidMasterIndex,
  getLineNumbers,
  LINE_INFO_LOOKUP,
};
