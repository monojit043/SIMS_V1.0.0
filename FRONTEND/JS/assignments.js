let pidAssignmentsPromise = null;

// Job Number / Unit Number options for the logged-in user, sourced from PIMS_SQL via
// /api/lookups/my-assignments (replaces the old hard-coded dropdown lists).
function fetchMyAssignments() {
  if (!pidAssignmentsPromise) {
    const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
    pidAssignmentsPromise = token
      ? fetch("/api/lookups/my-assignments", { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => {
            // A stale/expired token fails silently otherwise — the Job/Unit dropdowns just look
            // empty with no indication why. Force a fresh login instead of leaving that mystery.
            if (res.status === 401) {
              if (typeof simsClearAuth === "function") simsClearAuth();
              alert("Your session has expired. Please log in again.");
              window.location.href = "INDEX.HTML";
              return { success: false, data: [] };
            }
            return res.json();
          })
          .then((payload) => (payload && payload.success ? payload.data : []))
          .catch(() => [])
      : Promise.resolve([]);
  }
  return pidAssignmentsPromise;
}

function buildFirstOption(label, selectable) {
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = label;
  opt.selected = true;
  if (!selectable) opt.disabled = true;
  return opt;
}

// Populates jobSelect with each project the user is assigned to, and wires unitSelect to
// cascade to that project's units (or the union of all units when no project is selected,
// for filter-style dropdowns where the first option is itself selectable).
function populateJobUnitSelects(jobSelect, unitSelect, assignments, options) {
  const opts = options || {};
  const previousJob = jobSelect.value;
  const previousUnit = unitSelect.value;

  jobSelect.innerHTML = "";
  jobSelect.appendChild(buildFirstOption(opts.jobFirstLabel || "Select job number", !!opts.jobFirstSelectable));
  assignments.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a.projectId;
    opt.textContent = a.projectName ? `${a.projectId} — ${a.projectName}` : a.projectId;
    jobSelect.appendChild(opt);
  });

  function refreshUnits() {
    const keepUnit = unitSelect.value;
    unitSelect.innerHTML = "";
    unitSelect.appendChild(buildFirstOption(opts.unitFirstLabel || "Select unit number", !!opts.unitFirstSelectable));

    const selected = assignments.find((a) => a.projectId === jobSelect.value);
    const units = selected
      ? selected.units
      : opts.unitFirstSelectable
      ? Array.from(new Set(assignments.flatMap((a) => a.units))).sort()
      : [];

    units.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      unitSelect.appendChild(opt);
    });

    if (units.includes(keepUnit)) unitSelect.value = keepUnit;
  }

  jobSelect.addEventListener("change", refreshUnits);
  refreshUnits();

  if (previousJob && assignments.some((a) => a.projectId === previousJob)) {
    jobSelect.value = previousJob;
    refreshUnits();
    if (previousUnit) unitSelect.value = previousUnit;
  }
}

async function loadJobUnitAssignments(jobSelect, unitSelect, options) {
  const assignments = await fetchMyAssignments();
  populateJobUnitSelects(jobSelect, unitSelect, assignments, options);
  return assignments;
}
