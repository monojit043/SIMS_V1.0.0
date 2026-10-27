const jobNumberSelect = document.getElementById("job-number");
const unitNumberSelect = document.getElementById("unit-number");
loadJobUnitAssignments(jobNumberSelect, unitNumberSelect);

const form = document.getElementById("upload-form");
const fileInput = document.getElementById("report-file");
const dropzone = document.getElementById("upload-dropzone");
const filenameDisplay = document.getElementById("upload-filename");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

const st6ReportsEmptyState = document.getElementById("st6-reports-empty-state");
const st6ReportsTable = document.getElementById("st6-reports-table");
const st6ReportsTableBody = document.getElementById("st6-reports-table-body");

function showSelectedFile(file) {
  if (!file) {
    filenameDisplay.hidden = true;
    return;
  }
  filenameDisplay.textContent = `Selected: ${file.name}`;
  filenameDisplay.hidden = false;
}

fileInput.addEventListener("change", () => {
  showSelectedFile(fileInput.files[0]);
});

["dragover", "dragenter"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });
});

["dragleave", "dragend", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
  });
});

dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) {
    fileInput.files = event.dataTransfer.files;
    showSelectedFile(file);
  }
});

function formatUploadedAt(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
}

async function refreshSt6Reports() {
  const jobNumber = jobNumberSelect.value;
  const unitNumber = unitNumberSelect.value;

  if (!jobNumber || !unitNumber) {
    st6ReportsEmptyState.textContent = "Select a Job Number and Unit Number above to see uploaded reports.";
    st6ReportsEmptyState.hidden = false;
    st6ReportsTable.hidden = true;
    st6ReportsTableBody.innerHTML = "";
    return;
  }

  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) return;

  st6ReportsEmptyState.textContent = "Loading…";
  st6ReportsEmptyState.hidden = false;
  st6ReportsTable.hidden = true;

  try {
    const response = await fetch(
      `/api/st6-reports?jobNumber=${encodeURIComponent(jobNumber)}&unitNumber=${encodeURIComponent(unitNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
    }
    const rows = payload.data || [];

    st6ReportsTableBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      const link = document.createElement("a");
      link.href = `/uploads/reports/${row.storedFileName}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = row.originalName;
      nameTd.appendChild(link);
      tr.appendChild(nameTd);

      [row.uploadedBy, formatUploadedAt(row.createdAt)].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value || "";
        tr.appendChild(td);
      });

      const actionTd = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "secondary-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteSt6Report(row.id));
      actionTd.appendChild(deleteButton);
      tr.appendChild(actionTd);

      st6ReportsTableBody.appendChild(tr);
    });

    st6ReportsEmptyState.hidden = rows.length > 0;
    st6ReportsEmptyState.textContent = `No ST6 reports uploaded yet for ${jobNumber} / ${unitNumber}.`;
    st6ReportsTable.hidden = rows.length === 0;
  } catch (error) {
    st6ReportsTableBody.innerHTML = "";
    st6ReportsTable.hidden = true;
    st6ReportsEmptyState.textContent = "Could not load ST6 reports for this Job/Unit.";
    st6ReportsEmptyState.hidden = false;
  }
}

async function deleteSt6Report(id) {
  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) return;
  if (!confirm("Delete this ST6 report?")) return;

  try {
    const response = await fetch(`/api/st6-reports/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Server responded with ${response.status}`);
    }
    refreshSt6Reports();
  } catch (error) {
    alert("Could not delete this report: " + error.message);
  }
}

jobNumberSelect.addEventListener("change", refreshSt6Reports);
unitNumberSelect.addEventListener("change", refreshSt6Reports);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  formSuccess.hidden = true;

  const jobNumber = jobNumberSelect.value.trim();
  const unitNumber = unitNumberSelect.value.trim();
  const file = fileInput.files[0];

  if (!jobNumber || !unitNumber || !file) {
    formError.textContent = "Job Number, Unit Number, and a report file are required.";
    formError.hidden = false;
    return;
  }

  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) {
    formError.textContent = "Please log in to upload a report.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;

  const formData = new FormData();
  formData.append("jobNumber", jobNumber);
  formData.append("unitNumber", unitNumber);
  formData.append("file", file);

  try {
    const response = await fetch("/api/st6-reports", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
    }

    formSuccess.textContent = `"${file.name}" uploaded successfully.`;
    formSuccess.hidden = false;

    fileInput.value = "";
    showSelectedFile(null);
    refreshSt6Reports();
  } catch (error) {
    formError.textContent = "Could not upload this report: " + error.message;
    formError.hidden = false;
  }
});
