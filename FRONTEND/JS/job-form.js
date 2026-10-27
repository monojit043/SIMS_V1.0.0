const jobNumberSelect = document.getElementById("job-number");
const unitNumberSelect = document.getElementById("unit-number");
loadJobUnitAssignments(jobNumberSelect, unitNumberSelect);

const pidMasterIndexEmptyState = document.getElementById("pid-master-index-empty-state");
const pidMasterIndexTable = document.getElementById("pid-master-index-table");
const pidMasterIndexTableBody = document.getElementById("pid-master-index-table-body");
const pidShowNoPdf = document.getElementById("pid-show-no-pdf");
const pidNoPdfCount = document.getElementById("pid-no-pdf-count");
const pidNoPdfToggleWrap = document.getElementById("pid-no-pdf-toggle");

// Rows without a PDF stay in the table (greyed out) but are only shown when ticked
function applyPidNoPdfFilter() {
  pidMasterIndexTableBody.classList.toggle("hide-no-pdf", !pidShowNoPdf.checked);
}
pidShowNoPdf.addEventListener("change", () => {
  applyPidNoPdfFilter();
  const any = pidMasterIndexTableBody.querySelector(pidShowNoPdf.checked ? "tr" : "tr:not(.pid-no-pdf)");
  pidMasterIndexTable.hidden = !any;
  pidMasterIndexEmptyState.hidden = !!any;
});

function formatPidMasterIndexDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString();
}

async function refreshPidMasterIndex() {
  const jobNo = jobNumberSelect.value;
  const unitNo = unitNumberSelect.value;

  pidNoPdfToggleWrap.hidden = true;
  if (!jobNo || !unitNo) {
    pidMasterIndexEmptyState.textContent = "Select a Job Number and Unit Number above to see registered P&IDs.";
    pidMasterIndexEmptyState.hidden = false;
    pidMasterIndexTable.hidden = true;
    pidMasterIndexTableBody.innerHTML = "";
    return;
  }

  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) return;

  pidMasterIndexEmptyState.textContent = "Loading…";
  pidMasterIndexEmptyState.hidden = false;
  pidMasterIndexTable.hidden = true;

  try {
    const response = await fetch(
      `/api/lookups/pid-master-index?jobNo=${encodeURIComponent(jobNo)}&unitNo=${encodeURIComponent(unitNo)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
    }
    const rows = payload.data || [];
    const withoutPdf = rows.filter((row) => !row.hasPdf).length;
    // P&IDs with no PDF in ePULSE can't be highlighted — hidden unless "Show without PDF" is ticked
    pidNoPdfCount.textContent = withoutPdf;
    pidNoPdfToggleWrap.hidden = withoutPdf === 0;

    pidMasterIndexTableBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      if (!row.hasPdf) tr.className = "pid-no-pdf";
      const status = row.hasPdf ? `${row.status} · Rev ${row.revLabel || "—"}` : `${row.status} · no PDF in ePULSE yet`;
      [row.pidName, row.zone, status, row.createdBy, formatPidMasterIndexDate(row.createdAt)].forEach(
        (value) => {
          const td = document.createElement("td");
          td.textContent = value || "";
          tr.appendChild(td);
        }
      );

      const actionTd = document.createElement("td");
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "secondary-button";
      openButton.textContent = "Open for Highlighting";
      openButton.disabled = !row.hasPdf;
      if (!row.hasPdf) openButton.title = "Upload this P&ID's PDF in ePULSE first";
      openButton.addEventListener("click", () => openPidForHighlighting(row.id, openButton));
      actionTd.appendChild(openButton);
      tr.appendChild(actionTd);

      pidMasterIndexTableBody.appendChild(tr);
    });

    applyPidNoPdfFilter();
    const shown = rows.length - (pidShowNoPdf.checked ? 0 : withoutPdf);
    pidMasterIndexEmptyState.hidden = shown > 0;
    pidMasterIndexEmptyState.textContent = rows.length
      ? `None of the ${rows.length} P&IDs of ${jobNo} / ${unitNo} has a PDF in ePULSE yet — tick "Show without PDF" to list them.`
      : `No P&IDs registered yet for ${jobNo} / ${unitNo}.`;
    pidMasterIndexTable.hidden = shown === 0;
  } catch (error) {
    pidMasterIndexTableBody.innerHTML = "";
    pidMasterIndexTable.hidden = true;
    pidMasterIndexEmptyState.textContent = "Could not load P&IDs for this Job/Unit.";
    pidMasterIndexEmptyState.hidden = false;
  }
}

async function openPidForHighlighting(masterIndexId, buttonEl) {
  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) return;

  const originalText = buttonEl.textContent;
  buttonEl.disabled = true;
  buttonEl.textContent = "Opening…";

  try {
    const response = await fetch("/api/pid/import-from-epulse", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ masterIndexId }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
    }
    window.location.href = `PID-HIGHLIGHTING.HTML?docId=${encodeURIComponent(payload.data.id)}`;
  } catch (error) {
    buttonEl.disabled = false;
    buttonEl.textContent = originalText;
    alert("Could not open this P&ID: " + error.message);
  }
}

jobNumberSelect.addEventListener("change", refreshPidMasterIndex);
unitNumberSelect.addEventListener("change", refreshPidMasterIndex);

const formError = document.getElementById("form-error");
const allItemsTableBody = document.getElementById("all-items-table-body");
const allItemsEmptyState = document.getElementById("all-items-empty-state");
const downloadPdfButton = document.getElementById("download-pdf-button");
const downloadExcelButton = document.getElementById("download-excel-button");

const REPORT_COLUMNS = [
  { key: "jobNumber", label: "Job Number" },
  { key: "unitNumber", label: "Unit Number" },
  { key: "lineNumber", label: "Line Number" },
  { key: "tagNumber", label: "TAG NO." },
  { key: "itemName", label: "Item Name" },
  { key: "itemDescription", label: "Item Description" },
  { key: "quantity", label: "Quantity" },
  { key: "specialtyNote", label: "Specialty Note" },
  { key: "licensorRequirement", label: "Licensor Requirement" },
  { key: "pidNo", label: "P&ID No." },
];

function buildItemDescription(record) {
  return [record.tagNumber, record.itemName, record.lineSize, record.rating, record.pipingSpec, record.lineNumber]
    .filter(Boolean)
    .join(", ");
}

function getAllItemsRows() {
  const rows = [];

  simsGetRecords()
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .forEach((record) => {
      const items = (record.items || []).filter(
        (item) => item.itemDescription || item.quantity || item.specialtyNote || item.licensorRequirement || item.pidNo
      );
      const itemRows = items.length ? items : [{}];

      itemRows.forEach((item) => {
        rows.push({
          status: record.status,
          jobNumber: record.jobNumber,
          unitNumber: record.unitNumber,
          lineNumber: record.lineNumber,
          tagNumber: record.tagNumber,
          itemName: record.itemName,
          itemDescription: buildItemDescription(record),
          quantity: item.quantity,
          specialtyNote: item.specialtyNote,
          licensorRequirement: item.licensorRequirement,
          pidNo: item.pidNo,
        });
      });
    });

  return rows;
}

async function renderAllItemsTable() {
  const rows = getAllItemsRows();
  const tagIndex = await fetchPidTagIndex();

  allItemsTableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    REPORT_COLUMNS.forEach(({ key }) => {
      const td = document.createElement("td");
      td.textContent = row[key] || "";
      tr.appendChild(td);
    });

    const { cell, location } = buildPidSnapshotCell(row.tagNumber, tagIndex);
    tr.appendChild(cell);
    tr.appendChild(buildPidPageCell(location, row.tagNumber, tagIndex));

    allItemsTableBody.appendChild(tr);
  });

  allItemsEmptyState.hidden = rows.length > 0;
}

renderAllItemsTable();

downloadPdfButton.addEventListener("click", () => {
  const rows = getAllItemsRows();

  if (!rows.length) {
    formError.textContent = "No items to download yet.";
    formError.hidden = false;
    return;
  }
  formError.hidden = true;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(14);
  doc.text("SIMS - All Items Added", 14, 15);

  doc.autoTable({
    startY: 20,
    head: [REPORT_COLUMNS.map((column) => column.label)],
    body: rows.map((row) => REPORT_COLUMNS.map(({ key }) => row[key] || "")),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  doc.save("sims-all-items.pdf");
});

downloadExcelButton.addEventListener("click", () => {
  const rows = getAllItemsRows();

  if (!rows.length) {
    formError.textContent = "No items to download yet.";
    formError.hidden = false;
    return;
  }
  formError.hidden = true;

  const data = rows.map((row) => {
    const record = {};
    REPORT_COLUMNS.forEach(({ key, label }) => {
      record[label] = row[key] || "";
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "All Items");
  XLSX.writeFile(workbook, "sims-all-items.xlsx");
});
