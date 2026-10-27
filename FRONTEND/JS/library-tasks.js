const statusFilter = document.getElementById("status-filter");
const tasksEmptyState = document.getElementById("tasks-empty-state");
const tasksError = document.getElementById("tasks-error");
const tasksTable = document.getElementById("tasks-table");
const tasksTableBody = document.getElementById("tasks-table-body");
const backfillButton = document.getElementById("backfill-button");

const adminsSection = document.getElementById("admins-section");
const adminError = document.getElementById("admin-error");
const newAdminIdInput = document.getElementById("new-admin-id");
const addAdminButton = document.getElementById("add-admin-button");
const adminsTableBody = document.getElementById("admins-table-body");

const currentUser = typeof simsGetAuthUser === "function" ? simsGetAuthUser() : null;
const isCurrentUserAdmin = !!(currentUser && currentUser.isAdmin);

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
}

async function apiFetch(path, options) {
  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) throw new Error("Please log in.");

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options && options.body ? { "Content-Type": "application/json" } : {}),
      ...(options && options.headers),
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || !payload.success) {
    throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
  }
  return payload.data;
}

async function refreshTasks() {
  tasksEmptyState.textContent = "Loading…";
  tasksEmptyState.hidden = false;
  tasksTable.hidden = true;
  tasksError.hidden = true;

  try {
    const status = statusFilter.value;
    const rows = await apiFetch(`/api/library-tasks${status ? `?status=${encodeURIComponent(status)}` : ""}`);

    tasksTableBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      [row.tagNumber, row.itemName, row.jobNumber, row.unitNumber, row.status, row.assignedTo, formatDateTime(row.createdAt), row.completedBy].forEach(
        (value) => {
          const td = document.createElement("td");
          td.textContent = value || "";
          tr.appendChild(td);
        }
      );

      const actionTd = document.createElement("td");
      if (row.status === "Pending") {
        const canComplete = isCurrentUserAdmin || (currentUser && row.assignedTo === currentUser.id);
        if (canComplete) {
          const doneButton = document.createElement("button");
          doneButton.type = "button";
          doneButton.className = "secondary-button";
          doneButton.textContent = "Mark Done";
          doneButton.style.marginRight = "0.4rem";
          doneButton.addEventListener("click", () => markTaskDone(row.id, doneButton));
          actionTd.appendChild(doneButton);
        }
        if (isCurrentUserAdmin) {
          const delegateInput = document.createElement("input");
          delegateInput.type = "text";
          delegateInput.placeholder = "Employee ID";
          delegateInput.style.width = "90px";
          delegateInput.style.marginRight = "0.3rem";

          const delegateButton = document.createElement("button");
          delegateButton.type = "button";
          delegateButton.className = "secondary-button";
          delegateButton.textContent = row.assignedTo ? "Re-delegate" : "Delegate";
          delegateButton.addEventListener("click", () => delegateTask(row.id, delegateInput.value.trim(), delegateButton));

          actionTd.appendChild(delegateInput);
          actionTd.appendChild(delegateButton);
        }
      }
      tr.appendChild(actionTd);

      tasksTableBody.appendChild(tr);
    });

    tasksEmptyState.hidden = rows.length > 0;
    tasksEmptyState.textContent = "No tasks found for this filter.";
    tasksTable.hidden = rows.length === 0;
  } catch (error) {
    tasksTableBody.innerHTML = "";
    tasksTable.hidden = true;
    tasksEmptyState.textContent = "Could not load tasks: " + error.message;
    tasksEmptyState.hidden = false;
  }
}

async function markTaskDone(id, buttonEl) {
  buttonEl.disabled = true;
  buttonEl.textContent = "Saving…";
  try {
    await apiFetch(`/api/library-tasks/${id}/complete`, { method: "POST" });
    refreshTasks();
  } catch (error) {
    alert("Could not mark this task done: " + error.message);
    buttonEl.disabled = false;
    buttonEl.textContent = "Mark Done";
  }
}

async function delegateTask(id, employeeId, buttonEl) {
  if (!employeeId) {
    alert("Enter an employee ID to delegate to.");
    return;
  }
  buttonEl.disabled = true;
  buttonEl.textContent = "Saving…";
  try {
    await apiFetch(`/api/library-tasks/${id}/delegate`, {
      method: "POST",
      body: JSON.stringify({ assignedTo: employeeId }),
    });
    refreshTasks();
  } catch (error) {
    alert("Could not delegate this task: " + error.message);
    buttonEl.disabled = false;
    buttonEl.textContent = "Delegate";
  }
}

async function runBackfill() {
  backfillButton.disabled = true;
  backfillButton.textContent = "Running…";
  try {
    const result = await apiFetch("/api/library-tasks/backfill", { method: "POST" });
    tasksError.hidden = false;
    tasksError.className = "success-message";
    tasksError.textContent = `Created ${result.createdCount} task(s) for previously untracked items.`;
    refreshTasks();
  } catch (error) {
    tasksError.hidden = false;
    tasksError.className = "error-message";
    tasksError.textContent = "Backfill failed: " + error.message;
  } finally {
    backfillButton.disabled = false;
    backfillButton.textContent = "Backfill Missing Tasks";
  }
}

async function refreshAdmins() {
  try {
    const rows = await apiFetch("/api/admins");
    adminsTableBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      [row.employeeId, row.addedBy, formatDateTime(row.createdAt)].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value || "";
        tr.appendChild(td);
      });

      const actionTd = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "secondary-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removeAdmin(row.employeeId));
      actionTd.appendChild(removeButton);
      tr.appendChild(actionTd);

      adminsTableBody.appendChild(tr);
    });
  } catch (error) {
    adminError.textContent = "Could not load admins: " + error.message;
    adminError.hidden = false;
  }
}

async function removeAdmin(employeeId) {
  if (!confirm(`Remove admin access for "${employeeId}"?`)) return;
  try {
    await apiFetch(`/api/admins/${encodeURIComponent(employeeId)}`, { method: "DELETE" });
    refreshAdmins();
  } catch (error) {
    alert("Could not remove this admin: " + error.message);
  }
}

if (isCurrentUserAdmin) {
  adminsSection.hidden = false;
  backfillButton.hidden = false;
  backfillButton.addEventListener("click", runBackfill);

  addAdminButton.addEventListener("click", async () => {
    const employeeId = newAdminIdInput.value.trim();
    adminError.hidden = true;
    if (!employeeId) {
      adminError.textContent = "Employee ID is required.";
      adminError.hidden = false;
      return;
    }
    try {
      await apiFetch("/api/admins", { method: "POST", body: JSON.stringify({ employeeId }) });
      newAdminIdInput.value = "";
      refreshAdmins();
    } catch (error) {
      adminError.textContent = "Could not add this admin: " + error.message;
      adminError.hidden = false;
    }
  });

  refreshAdmins();
}

statusFilter.addEventListener("change", refreshTasks);
refreshTasks();
