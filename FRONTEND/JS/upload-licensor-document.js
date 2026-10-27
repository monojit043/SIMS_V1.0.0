const jobNumberSelect = document.getElementById("job-number");
const unitNumberSelect = document.getElementById("unit-number");
loadJobUnitAssignments(jobNumberSelect, unitNumberSelect);

const form = document.getElementById("upload-form");
const fileInput = document.getElementById("licensor-file");
const dropzone = document.getElementById("upload-dropzone");
const filenameDisplay = document.getElementById("upload-filename");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

const licensorDocumentsEmptyState = document.getElementById("licensor-documents-empty-state");
const licensorDocumentsTable = document.getElementById("licensor-documents-table");
const licensorDocumentsTableBody = document.getElementById("licensor-documents-table-body");

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

async function refreshLicensorDocuments() {
  const jobNumber = jobNumberSelect.value;
  const unitNumber = unitNumberSelect.value;

  if (!jobNumber || !unitNumber) {
    licensorDocumentsEmptyState.textContent = "Select a Job Number and Unit Number above to see uploaded documents.";
    licensorDocumentsEmptyState.hidden = false;
    licensorDocumentsTable.hidden = true;
    licensorDocumentsTableBody.innerHTML = "";
    return;
  }

  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) return;

  licensorDocumentsEmptyState.textContent = "Loading…";
  licensorDocumentsEmptyState.hidden = false;
  licensorDocumentsTable.hidden = true;

  try {
    const response = await fetch(
      `/api/licensor-documents?jobNumber=${encodeURIComponent(jobNumber)}&unitNumber=${encodeURIComponent(unitNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
    }
    const rows = payload.data || [];

    licensorDocumentsTableBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      const link = document.createElement("a");
      link.href = `/uploads/licensor/${row.storedFileName}`;
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
      deleteButton.addEventListener("click", () => deleteLicensorDocument(row.id));
      actionTd.appendChild(deleteButton);
      tr.appendChild(actionTd);

      licensorDocumentsTableBody.appendChild(tr);
    });

    licensorDocumentsEmptyState.hidden = rows.length > 0;
    licensorDocumentsEmptyState.textContent = `No licensor documents uploaded yet for ${jobNumber} / ${unitNumber}.`;
    licensorDocumentsTable.hidden = rows.length === 0;
  } catch (error) {
    licensorDocumentsTableBody.innerHTML = "";
    licensorDocumentsTable.hidden = true;
    licensorDocumentsEmptyState.textContent = "Could not load licensor documents for this Job/Unit.";
    licensorDocumentsEmptyState.hidden = false;
  }
}

async function deleteLicensorDocument(id) {
  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) return;
  if (!confirm("Delete this licensor document?")) return;

  try {
    const response = await fetch(`/api/licensor-documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Server responded with ${response.status}`);
    }
    refreshLicensorDocuments();
  } catch (error) {
    alert("Could not delete this document: " + error.message);
  }
}

jobNumberSelect.addEventListener("change", refreshLicensorDocuments);
unitNumberSelect.addEventListener("change", refreshLicensorDocuments);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  formSuccess.hidden = true;

  const jobNumber = jobNumberSelect.value.trim();
  const unitNumber = unitNumberSelect.value.trim();
  const file = fileInput.files[0];

  if (!jobNumber || !unitNumber || !file) {
    formError.textContent = "Job Number, Unit Number, and a document file are required.";
    formError.hidden = false;
    return;
  }

  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) {
    formError.textContent = "Please log in to upload a document.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;

  const formData = new FormData();
  formData.append("jobNumber", jobNumber);
  formData.append("unitNumber", unitNumber);
  formData.append("file", file);

  try {
    const response = await fetch("/api/licensor-documents", {
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
    refreshLicensorDocuments();
  } catch (error) {
    formError.textContent = "Could not upload this document: " + error.message;
    formError.hidden = false;
  }
});
