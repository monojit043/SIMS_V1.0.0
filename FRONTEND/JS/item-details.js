const tableBody = document.getElementById("details-table-body");
const emptyState = document.getElementById("empty-state");
const filterJobNumber = document.getElementById("filter-job-number");
const filterUnitNumber = document.getElementById("filter-unit-number");
const filterLineNumber = document.getElementById("filter-line-number");
const filterItemName = document.getElementById("filter-item-name");
loadJobUnitAssignments(filterJobNumber, filterUnitNumber, {
  jobFirstLabel: "All job numbers",
  jobFirstSelectable: true,
  unitFirstLabel: "All unit numbers",
  unitFirstSelectable: true,
});
const downloadPdfButton = document.getElementById("download-pdf-button");
const downloadExcelButton = document.getElementById("download-excel-button");

const DETAILS_COLUMNS = [
  { key: "itemName", label: "Item Name" },
  { key: "itemCode", label: "Item Code" },
  { key: "lineSize", label: "Line Size" },
  { key: "pipingSpec", label: "Piping Spec" },
  { key: "itemDescription", label: "Item Description" },
  { key: "quantity", label: "Quantity" },
  { key: "mrNumber", label: "MR No." },
  { key: "datasheet", label: "Datasheet" },
  { key: "vendorDrawing", label: "Vendor Drawing" },
  { key: "modelStatus", label: "Modeling Status" },
];

// Mirrors job-form.js's buildItemDescription — the P&ID sync (pid.js's syncHighlightToJobRecord)
// only ever writes record-level fields, never a per-item itemDescription, so it has to be
// recomputed here the same way rather than read directly off the item.
function buildItemDescription(record) {
  return [record.tagNumber, record.itemName, record.lineSize, record.rating, record.pipingSpec, record.lineNumber]
    .filter(Boolean)
    .join(", ");
}

function flattenRecords(records) {
  const rows = [];

  records
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .forEach((record) => {
      const items = (record.items || []).filter(
        (item) => item.itemDescription || item.quantity || item.itemCode
      );
      const itemRows = items.length ? items : [{}];

      itemRows.forEach((item) => {
        rows.push({
          status: record.status,
          jobNumber: record.jobNumber,
          unitNumber: record.unitNumber,
          itemName: record.itemName,
          lineNumber: record.lineNumber,
          tagNumber: record.tagNumber,
          itemCode: item.itemCode,
          lineSize: record.lineSize,
          pipingSpec: record.pipingSpec,
          lineTemp: record.lineTemp,
          itemDescription: item.itemDescription || buildItemDescription(record),
          quantity: item.quantity,
          mrNumber: item.mrNumber,
          datasheet: item.datasheet,
          vendorDrawing: item.vendorDrawing,
          modelStatus: item.modelStatus,
        });
      });
    });

  return rows;
}

function matchesFilters(row) {
  if (filterJobNumber.value && row.jobNumber !== filterJobNumber.value) return false;
  if (filterUnitNumber.value && row.unitNumber !== filterUnitNumber.value) return false;
  if (filterLineNumber.value && row.lineNumber !== filterLineNumber.value) return false;
  if (
    filterItemName.value &&
    !(row.itemName || "").toLowerCase().includes(filterItemName.value.toLowerCase())
  ) {
    return false;
  }
  return true;
}

function getFilteredRows() {
  return flattenRecords(simsGetRecords()).filter(matchesFilters);
}

async function renderTable() {
  const rows = getFilteredRows();
  const tagIndex = await fetchPidTagIndex();

  tableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    DETAILS_COLUMNS.forEach(({ key }) => {
      const td = document.createElement("td");
      td.textContent = row[key] || "";
      tr.appendChild(td);
    });

    const { cell, location } = buildPidSnapshotCell(row.tagNumber, tagIndex);
    tr.appendChild(cell);
    tr.appendChild(buildPidPageCell(location, row.tagNumber, tagIndex));

    tableBody.appendChild(tr);
  });

  emptyState.hidden = rows.length > 0;
}

[filterJobNumber, filterUnitNumber, filterLineNumber, filterItemName].forEach((input) => {
  input.addEventListener("input", renderTable);
});

renderTable();

downloadPdfButton.addEventListener("click", () => {
  const rows = getFilteredRows();

  if (!rows.length) {
    alert("No records to download.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(14);
  doc.text("SIMS - Special Item Details", 14, 15);

  doc.autoTable({
    startY: 20,
    head: [DETAILS_COLUMNS.map((column) => column.label)],
    body: rows.map((row) => DETAILS_COLUMNS.map(({ key }) => row[key] || "")),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  doc.save("sims-item-details.pdf");
});

downloadExcelButton.addEventListener("click", () => {
  const rows = getFilteredRows();

  if (!rows.length) {
    alert("No records to download.");
    return;
  }

  const data = rows.map((row) => {
    const record = {};
    DETAILS_COLUMNS.forEach(({ key, label }) => {
      record[label] = row[key] || "";
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Item Details");
  XLSX.writeFile(workbook, "sims-item-details.xlsx");
});
