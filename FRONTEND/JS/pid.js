const PID_STORAGE_KEY = "sims_pid_data";
const PID_MAX_RENDER_DIMENSION = 2200;

// Mirrors the Item Name / Line Number logic on JOB-FORM.HTML (job-form.js) so tagging a highlight
// here behaves the same way as filling out the Job Form: Category 1 items require a Line Number,
// and picking a Line Number auto-fills its known Line Information.
const PID_DIALOG_CATEGORY_1_ITEMS = [
  "Temporary Strainer",
  "Process Hose",
  "Steam Trap",
  "Static Mixer",
  "Injection Quill",
  "Spray Nozzle",
  "Process Trap",
  "Permanent Strainer",
];
const PID_DIALOG_CATEGORY_2_ITEMS = ["Utility Hose", "CSTA"];
// Static fallback used only when a document has no Job Number/Unit Number (e.g. a locally
// uploaded P&ID with no ePULSE link). Once a job/unit is known this is replaced with real line
// numbers from ePULSE's line list — see loadPidLineNumberOptionsForDocument().
let PID_DIALOG_LINE_INFO_LOOKUP = {
  "P-101-12345": { lineSize: "6\"", pipingSpec: "A1A", lineTemp: "150 °C", rating: "150#" },
  "P-111-54321": { lineSize: "4\"", pipingSpec: "B2C", lineTemp: "90 °C", rating: "300#" },
  "P-102-98765": { lineSize: "8\"", pipingSpec: "C3D", lineTemp: "200 °C", rating: "600#" },
  "P-128-11223": { lineSize: "2\"", pipingSpec: "D4E", lineTemp: "40 °C", rating: "150#" },
};

const pidPdfSupportAvailable = typeof pdfjsLib !== "undefined";

if (pidPdfSupportAvailable) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const pidUploadInput = document.getElementById("pid-upload");
const pidSaveButton = document.getElementById("pid-save-pid-button");
const pidSaveStatus = document.getElementById("pid-save-status");
let pidSaveStatusTimer = null;
const pidCloudStatusEl = document.getElementById("pid-cloud-status");
let pidCloudStatusTimer = null;
let pidOriginalFile = null;
let pidBackendSyncTimer = null;
let pidBackendSyncRunning = false;
let pidBackendSyncQueued = false;
const pidZoomViewport = document.getElementById("pid-zoom-viewport");
const pidCanvasWrapper = document.getElementById("pid-canvas-wrapper");
const pidImage = document.getElementById("pid-image");
const pidOverlay = document.getElementById("pid-overlay");
const pidTextLayer = document.getElementById("pid-text-layer");
const pidPageGroup = document.getElementById("pid-page-group");
const pidPageNumberInput = document.getElementById("pid-page-number");
const pidPageCount = document.getElementById("pid-page-count");
const pidPageUpButton = document.getElementById("pid-page-up");
const pidPageDownButton = document.getElementById("pid-page-down");
const pidLoadingHint = document.getElementById("pid-loading-hint");
const pidZoomOutButton = document.getElementById("pid-zoom-out");
const pidZoomInButton = document.getElementById("pid-zoom-in");
const pidZoomResetButton = document.getElementById("pid-zoom-reset");
const pidZoomLevelDisplay = document.getElementById("pid-zoom-level");
const pidToolbar = document.getElementById("pid-toolbar");
const pidHighlightToolButton = document.getElementById("pid-tool-highlight");
const pidNoteToolButton = document.getElementById("pid-tool-note");
const pidFindSymbolToolButton = document.getElementById("pid-tool-findsymbol");
const pidSelectDropdown = document.getElementById("pid-select-dropdown");
const pidSelectSubmenuToggle = document.getElementById("pid-select-submenu-toggle");
const pidSelectFlyout = document.getElementById("pid-select-flyout");
const pidSelectFlyoutItems = pidSelectFlyout.querySelectorAll(".pid-tool-dropdown-item[data-tool]");
const pidShapeDropdown = document.getElementById("pid-shape-dropdown");
const pidShapeSubmenuToggle = document.getElementById("pid-shape-submenu-toggle");
const pidShapeFlyout = document.getElementById("pid-shape-flyout");
const pidShapeFlyoutItems = pidShapeFlyout.querySelectorAll(".pid-tool-dropdown-item[data-tool]");
const pidColorCodeDropdown = document.getElementById("pid-colorcode-dropdown");
const pidColorCodeToggle = document.getElementById("pid-colorcode-toggle");
const pidColorCodeFlyout = document.getElementById("pid-colorcode-flyout");
const pidStampsToggle = document.getElementById("pid-stamps-toggle");
const pidStampPanel = document.getElementById("pid-stamp-panel");
const pidStampPresetButtons = pidStampPanel.querySelectorAll(".pid-stamp-preset");
const pidColorRow = document.getElementById("pid-color-row");
const pidColorSwatches = pidColorRow.querySelectorAll(".pid-color-swatch[data-color]");
const pidCustomColorSwatch = document.querySelector(".pid-color-custom");
const pidCustomColorInput = document.getElementById("pid-color-custom-input");
const pidTextStyleRow = document.getElementById("pid-text-style-row");
const pidFontFamilySelect = document.getElementById("pid-font-family");
const pidFontSizeSelect = document.getElementById("pid-font-size");
const pidStyleToggleButtons = pidTextStyleRow.querySelectorAll(".pid-style-toggle");
const pidSearchInput = document.getElementById("pid-search-input");
const pidSearchPrevButton = document.getElementById("pid-search-prev");
const pidSearchNextButton = document.getElementById("pid-search-next");
const pidSearchCount = document.getElementById("pid-search-count");
const pidSearchClearButton = document.getElementById("pid-search-clear");
const pidOcrIndexAllButton = document.getElementById("pid-ocr-index-all-button");
const pidOcrStatusEl = document.getElementById("pid-ocr-status");
const pidItemsSection = document.getElementById("pid-items-section");
const pidItemsEmptyHint = document.getElementById("pid-items-empty-hint");
const pidItemsTableEl = document.getElementById("pid-items-table");
const pidItemsTableBody = document.getElementById("pid-items-table-body");
const pidItemsPageHeader = document.getElementById("pid-items-page-header");
const pidLineNumbersSection = document.getElementById("pid-linenumbers-section");
const pidLineNumbersEmptyHint = document.getElementById("pid-linenumbers-empty-hint");
const pidLineNumbersTableEl = document.getElementById("pid-linenumbers-table");
const pidLineNumbersTableBody = document.getElementById("pid-linenumbers-table-body");
const pidLineNumbersPageHeader = document.getElementById("pid-linenumbers-page-header");
const pidSymbolsSection = document.getElementById("pid-symbols-section");
const pidSymbolsEmptyHint = document.getElementById("pid-symbols-empty-hint");
const pidSymbolsTableEl = document.getElementById("pid-symbols-table");
const pidSymbolsTableBody = document.getElementById("pid-symbols-table-body");
const pidSymbolsPageHeader = document.getElementById("pid-symbols-page-header");
const pidSymbolSearchAllButton = document.getElementById("pid-symbol-search-all-button");
const pidSymbolStatusEl = document.getElementById("pid-symbol-status");
const pidSymbolDialog = document.getElementById("pid-symbol-dialog");
const pidSymbolDialogForm = document.getElementById("pid-symbol-dialog-form");
const pidSymbolNameInput = document.getElementById("pid-symbol-name-input");
const pidSymbolCancelButton = document.getElementById("pid-symbol-cancel-button");

const PID_ZOOM_MIN = 25;
const PID_ZOOM_MAX = 400;
const PID_ZOOM_STEP = 25;
let pidZoomPct = 100;

function applyPidZoom() {
  pidCanvasWrapper.style.transform = `scale(${pidZoomPct / 100})`;
  pidZoomLevelDisplay.textContent = `${pidZoomPct}%`;
  pidZoomOutButton.disabled = pidZoomPct <= PID_ZOOM_MIN;
  pidZoomInButton.disabled = pidZoomPct >= PID_ZOOM_MAX;
}

pidZoomInButton.addEventListener("click", () => {
  pidZoomPct = Math.min(PID_ZOOM_MAX, pidZoomPct + PID_ZOOM_STEP);
  applyPidZoom();
});

pidZoomOutButton.addEventListener("click", () => {
  pidZoomPct = Math.max(PID_ZOOM_MIN, pidZoomPct - PID_ZOOM_STEP);
  applyPidZoom();
});

pidZoomResetButton.addEventListener("click", () => {
  pidZoomPct = 100;
  applyPidZoom();
});

applyPidZoom();

let currentPdfDoc = null;
let currentPdfDataUrl = null;
let pidCurrentPdfPageNumber = 1;
const pidPageTextCache = new Map();
let pidSearchMatches = [];
let pidSearchIndex = -1;
let pidSearchQuery = "";
let pidSearchDebounceTimer = null;

const pidOcrAvailable = typeof Tesseract !== "undefined";
const PID_OCR_IMAGE_KEY = "image";
let pidOcrWorkerPromise = null;
const pidPageOcrCache = new Map();
const pidOcrInFlight = new Map();
let pidOcrIndexAllRunning = false;
let pidOcrIndexAllCancel = false;
let pidOcrStatusTimer = null;

let pidActiveTool = "select";
let pidActiveColor = pidColorSwatches[0].dataset.color;
let pidActiveFontFamily = pidFontFamilySelect.value;
let pidActiveFontSize = pidFontSizeSelect.value;
let pidActiveStrokeWidth = "3";
let pidActiveStampPreset = { label: "APPROVED", color: "#16a34a" };
let pidActiveBold = false;
let pidActiveItalic = false;
let pidActiveUnderline = false;
let pidFocusedTextAnnotation = null;
let pidFocusedTextEl = null;

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const PID_SHAPE_FAMILY_TOOLS = [
  "draw",
  "line",
  "arrow",
  "shape",
  "ellipse",
  "text",
  "polygon",
  "cloud",
  "polyline",
  "stamp",
];

const PID_SELECT_FAMILY_TOOLS = ["select", "pan"];

function setPidTool(tool) {
  pidActiveTool = tool;
  pidSelectSubmenuToggle.classList.toggle("active", PID_SELECT_FAMILY_TOOLS.includes(tool));
  pidSelectFlyoutItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.tool === tool);
  });
  pidHighlightToolButton.classList.toggle("active", tool === "highlight");
  pidNoteToolButton.classList.toggle("active", tool === "note");
  pidFindSymbolToolButton.classList.toggle("active", tool === "findsymbol");
  pidShapeSubmenuToggle.classList.toggle("active", PID_SHAPE_FAMILY_TOOLS.includes(tool));
  pidShapeFlyoutItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.tool === tool);
  });
  pidOverlay.classList.toggle("tool-select", tool === "select");
  pidOverlay.classList.toggle("tool-pan", tool === "pan");
  pidTextLayer.classList.toggle("active", tool === "select");
  pidOverlay.classList.toggle("tool-highlight", tool === "highlight");
  pidOverlay.classList.toggle("tool-text", tool === "text");
  pidOverlay.classList.toggle("tool-draw", tool === "draw");
  pidOverlay.classList.toggle("tool-shape", ["shape", "ellipse", "cloud"].includes(tool));
  pidOverlay.classList.toggle("tool-note", tool === "note");
  pidOverlay.classList.toggle("tool-findsymbol", tool === "findsymbol");
  pidColorRow.hidden = tool === "select" || tool === "pan" || tool === "stamp" || tool === "findsymbol";
  pidTextStyleRow.hidden = tool !== "text";
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyTextStyleToFocused() {
  if (!pidFocusedTextAnnotation || !pidFocusedTextEl) return;
  pidFocusedTextAnnotation.fontFamily = pidActiveFontFamily;
  pidFocusedTextAnnotation.fontSize = pidActiveFontSize;
  pidFocusedTextAnnotation.bold = pidActiveBold;
  pidFocusedTextAnnotation.italic = pidActiveItalic;
  pidFocusedTextAnnotation.underline = pidActiveUnderline;
  applyTextStyleToEl(pidFocusedTextEl, pidFocusedTextAnnotation);
  savePidData();
}

function applyTextStyleToEl(el, annotation) {
  el.style.fontFamily = annotation.fontFamily || pidFontFamilySelect.value;
  el.style.fontSize = `${annotation.fontSize || pidFontSizeSelect.value}px`;
  el.style.fontWeight = annotation.bold ? "700" : "400";
  el.style.fontStyle = annotation.italic ? "italic" : "normal";
  el.style.textDecoration = annotation.underline ? "underline" : "none";
}

function syncTextStyleControls(annotation) {
  pidFontFamilySelect.value = annotation.fontFamily || pidActiveFontFamily;
  pidFontSizeSelect.value = annotation.fontSize || pidActiveFontSize;
  pidActiveFontFamily = pidFontFamilySelect.value;
  pidActiveFontSize = pidFontSizeSelect.value;
  pidActiveBold = !!annotation.bold;
  pidActiveItalic = !!annotation.italic;
  pidActiveUnderline = !!annotation.underline;
  pidStyleToggleButtons.forEach((button) => {
    button.classList.toggle("active", isPidStyleActive(button.dataset.style));
  });
}

function isPidStyleActive(styleName) {
  if (styleName === "bold") return pidActiveBold;
  if (styleName === "italic") return pidActiveItalic;
  if (styleName === "underline") return pidActiveUnderline;
  return false;
}

pidFontFamilySelect.addEventListener("change", () => {
  pidActiveFontFamily = pidFontFamilySelect.value;
  applyTextStyleToFocused();
});

pidFontSizeSelect.addEventListener("change", () => {
  pidActiveFontSize = pidFontSizeSelect.value;
  applyTextStyleToFocused();
});

pidStyleToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const style = button.dataset.style;
    if (style === "bold") pidActiveBold = !pidActiveBold;
    if (style === "italic") pidActiveItalic = !pidActiveItalic;
    if (style === "underline") pidActiveUnderline = !pidActiveUnderline;
    button.classList.toggle("active", isPidStyleActive(style));
    applyTextStyleToFocused();
  });
});

function closeToolDropdown() {
  pidShapeFlyout.hidden = true;
  pidStampPanel.hidden = true;
  pidSelectFlyout.hidden = true;
  pidColorCodeFlyout.hidden = true;
}

pidSelectSubmenuToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  if (pidSelectFlyout.hidden) {
    pidSelectFlyout.hidden = false;
  } else {
    closeToolDropdown();
  }
});

pidSelectFlyoutItems.forEach((item) => {
  item.addEventListener("click", () => {
    closeToolDropdown();
    setPidTool(item.dataset.tool);
  });
});

pidHighlightToolButton.addEventListener("click", () => {
  closeToolDropdown();
  setPidTool("highlight");
});

pidNoteToolButton.addEventListener("click", () => {
  closeToolDropdown();
  setPidTool("note");
});

pidFindSymbolToolButton.addEventListener("click", () => {
  closeToolDropdown();
  setPidTool("findsymbol");
});

pidShapeSubmenuToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  if (pidShapeFlyout.hidden) {
    pidShapeFlyout.hidden = false;
  } else {
    closeToolDropdown();
  }
});

pidStampsToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  pidStampPanel.hidden = !pidStampPanel.hidden;
});

pidStampPresetButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    pidActiveStampPreset = {
      label: button.dataset.stampLabel,
      color: button.dataset.stampColor,
    };
    closeToolDropdown();
    setPidTool("stamp");
  });
});

pidShapeFlyoutItems.forEach((item) => {
  item.addEventListener("click", () => {
    closeToolDropdown();
    setPidTool(item.dataset.tool);
  });
});

pidColorCodeToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  if (pidColorCodeFlyout.hidden) {
    pidColorCodeFlyout.hidden = false;
  } else {
    closeToolDropdown();
  }
});

document.addEventListener("click", (event) => {
  if (
    !pidShapeDropdown.contains(event.target) &&
    !pidSelectDropdown.contains(event.target) &&
    !pidColorCodeDropdown.contains(event.target)
  ) {
    closeToolDropdown();
  }
});

pidColorSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    pidActiveColor = swatch.dataset.color;
    pidColorSwatches.forEach((el) => el.classList.toggle("active", el === swatch));
    pidCustomColorSwatch.classList.remove("active");
  });
});

pidCustomColorInput.addEventListener("input", () => {
  pidActiveColor = pidCustomColorInput.value;
  pidColorSwatches.forEach((el) => el.classList.remove("active"));
  pidCustomColorSwatch.classList.add("active");
});

const pidDialog = document.getElementById("pid-dialog");
const pidDialogForm = document.getElementById("pid-dialog-form");
const pidDialogTitle = document.getElementById("pid-dialog-title");
const pidNoteTitleInput = document.getElementById("pid-note-title");
const pidDetailPidNameInput = document.getElementById("pid-detail-pid-name");
const pidTagFontFamilySelect = document.getElementById("pid-tag-font-family");
const pidTagFontSizeSelect = document.getElementById("pid-tag-font-size");
const pidTagStyleRow = document.getElementById("pid-tag-style-row");
const pidTagStyleButtons = pidTagStyleRow.querySelectorAll(".pid-style-toggle");
const pidDetailInputs = {
  size: document.getElementById("pid-detail-size"),
  rating: document.getElementById("pid-detail-rating"),
  description: document.getElementById("pid-detail-description"),
  quantity: document.getElementById("pid-detail-quantity"),
  lineNumber: document.getElementById("pid-detail-line-number"),
  specialNote: document.getElementById("pid-detail-special-note"),
  licensorNote: document.getElementById("pid-detail-licensor-note"),
  pipingSpec: document.getElementById("pid-detail-piping-spec"),
};
const pidDetailInputList = Object.values(pidDetailInputs);
const pidDeleteButton = document.getElementById("pid-delete-button");
const pidCancelButton = document.getElementById("pid-cancel-button");

const pidLineNumberRequiredMarker = document.getElementById("pid-line-number-required-marker");

function getPidDialogItemCategory(itemName) {
  if (PID_DIALOG_CATEGORY_1_ITEMS.includes(itemName)) return "1";
  if (PID_DIALOG_CATEGORY_2_ITEMS.includes(itemName)) return "2";
  return "";
}

function updatePidDialogForItem() {
  const isCategory1 = getPidDialogItemCategory(pidDetailInputs.description.value) === "1";
  pidDetailInputs.lineNumber.required = isCategory1;
  pidLineNumberRequiredMarker.hidden = !isCategory1;
}

pidDetailInputs.description.addEventListener("change", updatePidDialogForItem);

function updatePidDialogLineInformation() {
  const info = PID_DIALOG_LINE_INFO_LOOKUP[pidDetailInputs.lineNumber.value];
  pidDetailInputs.size.value = (info && info.lineSize) || "";
  pidDetailInputs.pipingSpec.value = (info && info.pipingSpec) || "";
  pidDetailInputs.rating.value = (info && info.rating) || "";
}

pidDetailInputs.lineNumber.addEventListener("change", updatePidDialogLineInformation);

// Replaces the Line Number dropdown's options with real lines from ePULSE's line list for
// the current document's Job Number/Unit Number (set on pidData when loaded via loadPidFromBackend
// — see there). Falls back to leaving the static PID_DIALOG_LINE_INFO_LOOKUP options in place when
// the document has no job/unit context (e.g. a locally uploaded P&ID with no ePULSE link).
let pidLineNumberOptionsToken = 0;
async function loadPidLineNumberOptionsForDocument() {
  const jobNumber = pidData.jobNumber;
  const unitNumber = pidData.unitNumber;
  if (!jobNumber || !unitNumber) return;

  const token = ++pidLineNumberOptionsToken;
  const authToken = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!authToken) return;

  try {
    const response = await fetch(
      `/api/lookups/line-numbers?jobNo=${encodeURIComponent(jobNumber)}&unitNo=${encodeURIComponent(unitNumber)}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) return;
    if (token !== pidLineNumberOptionsToken) return; // a newer document load superseded this fetch

    const rows = payload.data || [];
    if (!rows.length) return;

    // pid-detail-line-number is a free-typing <input list="pid-line-number-options"> — only the
    // sibling <datalist> needs repopulating; the input's own current value is left untouched.
    PID_DIALOG_LINE_INFO_LOOKUP = {};
    const datalist = document.getElementById("pid-line-number-options");
    datalist.innerHTML = "";
    rows.forEach((row) => {
      PID_DIALOG_LINE_INFO_LOOKUP[row.lineNo] = { lineSize: row.lineSize, pipingSpec: row.lineClass };
      const option = document.createElement("option");
      option.value = row.lineNo;
      datalist.appendChild(option);
    });
  } catch (error) {
    // Keep the static fallback list on failure — non-fatal, just less precise.
  }
}

let pidData = { imageDataUrl: "", highlights: [] };
let editingHighlightId = null;
let pendingRect = null;
let pendingType = null;
let dragBoxEl = null;
let dragStart = null;
let drawPoints = null;
let drawPreviewSvg = null;
let lineStart = null;
let linePreviewSvg = null;
let pendingPolyPoints = null;
let pendingPolyType = null;
let polyPreviewSvg = null;
// Captured once when a draw/drag interaction starts and reused for its whole duration, instead
// of re-measuring on every mouse event — otherwise a layout shift mid-drag (e.g. the toolbar
// growing/shrinking as OCR status text appears) makes the start and end points inconsistent,
// so the finished shape lands somewhere other than where you actually dragged.
let pidInteractionRect = null;

function getPidInteractionRect() {
  if (!pidInteractionRect) pidInteractionRect = pidOverlay.getBoundingClientRect();
  return pidInteractionRect;
}
let pidTagBold = false;
let pidTagItalic = false;
let pidTagUnderline = false;

function applyDetailsInputStyle() {
  pidDetailInputList.forEach((input) => {
    input.style.fontFamily = pidTagFontFamilySelect.value;
    input.style.fontSize = `${pidTagFontSizeSelect.value}px`;
    input.style.fontWeight = pidTagBold ? "700" : "400";
    input.style.fontStyle = pidTagItalic ? "italic" : "normal";
    input.style.textDecoration = pidTagUnderline ? "underline" : "none";
  });
}

function setTagStyleState(bold, italic, underline) {
  pidTagBold = bold;
  pidTagItalic = italic;
  pidTagUnderline = underline;
  pidTagStyleButtons.forEach((button) => {
    const style = button.dataset.style;
    const active = style === "bold" ? bold : style === "italic" ? italic : underline;
    button.classList.toggle("active", active);
  });
  applyDetailsInputStyle();
}

pidTagStyleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const style = button.dataset.style;
    if (style === "bold") pidTagBold = !pidTagBold;
    if (style === "italic") pidTagItalic = !pidTagItalic;
    if (style === "underline") pidTagUnderline = !pidTagUnderline;
    const active = style === "bold" ? pidTagBold : style === "italic" ? pidTagItalic : pidTagUnderline;
    button.classList.toggle("active", active);
    applyDetailsInputStyle();
  });
});

pidTagFontFamilySelect.addEventListener("change", applyDetailsInputStyle);
pidTagFontSizeSelect.addEventListener("change", applyDetailsInputStyle);

const PID_DB_NAME = "sims_pid_db";
const PID_DB_STORE = "pid_data";
const PID_DB_KEY = "current";
let pidDbPromise = null;

function openPidDb() {
  if (pidDbPromise) return pidDbPromise;
  pidDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(PID_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PID_DB_STORE)) {
        request.result.createObjectStore(PID_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return pidDbPromise;
}

function pidDbGet(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PID_DB_STORE, "readonly");
    const req = tx.objectStore(PID_DB_STORE).get(PID_DB_KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function pidDbPut(db, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PID_DB_STORE, "readwrite");
    tx.objectStore(PID_DB_STORE).put(data, PID_DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function readLegacyLocalStorageData() {
  try {
    const raw = localStorage.getItem(PID_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(PID_STORAGE_KEY);
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

async function loadPidData() {
  try {
    const db = await openPidDb();
    let data = await pidDbGet(db);
    if (!data) {
      const legacy = readLegacyLocalStorageData();
      if (legacy) {
        await pidDbPut(db, legacy);
        data = legacy;
      }
    }
    return data || { imageDataUrl: "", highlights: [] };
  } catch (error) {
    return { imageDataUrl: "", highlights: [] };
  }
}

async function savePidData() {
  try {
    if (currentPdfDoc && pidCurrentPdfPageNumber != null) {
      pidData.pagesHighlights = pidData.pagesHighlights || {};
      pidData.pagesHighlights[pidCurrentPdfPageNumber] = pidData.highlights;
    }
    const db = await openPidDb();
    await pidDbPut(db, pidData);
    scheduleBackendSync();
    return true;
  } catch (error) {
    alert("Could not save P&ID data (it may be too large for browser storage).");
    return false;
  }
}

function renderHighlights() {
  pidOverlay
    .querySelectorAll(
      ".pid-highlight, .pid-textbox-wrap, .pid-callout-wrap, .pid-leader-svg, .pid-shape-wrap, .pid-draw-wrap, .pid-note-icon, .pid-stamp-wrap"
    )
    .forEach((el) => el.remove());

  const overlayRect = pidOverlay.getBoundingClientRect();

  pidData.highlights.forEach((highlight) => {
    if (highlight.type === "text") {
      renderTextBox(highlight);
      return;
    }

    if (highlight.type === "shape") {
      renderShape(highlight);
      return;
    }

    if (highlight.type === "draw") {
      renderDrawStroke(highlight, overlayRect);
      return;
    }

    if (highlight.type === "note") {
      renderNoteIcon(highlight);
      return;
    }

    if (highlight.type === "ellipse") {
      renderEllipse(highlight);
      return;
    }

    if (highlight.type === "cloud") {
      renderCloud(highlight, overlayRect);
      return;
    }

    if (highlight.type === "line" || highlight.type === "arrow") {
      renderLineOrArrow(highlight, overlayRect);
      return;
    }

    if (highlight.type === "polygon" || highlight.type === "polyline") {
      renderPolyShape(highlight, overlayRect);
      return;
    }

    if (highlight.type === "stamp") {
      renderStamp(highlight);
      return;
    }

    renderHighlightBox(highlight, overlayRect);
    renderCallout(highlight, overlayRect, highlight.color || "#f59e0b");
  });

  renderItemsTable();
  renderLineNumberList();
  renderSymbolMatchesList();
}

const PID_RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const PID_HANDLE_MIN_SIZE = 12;

function renderHighlightBox(highlight, overlayRect) {
  const color = highlight.color || "#f59e0b";

  const box = document.createElement("div");
  box.className = "pid-highlight";
  box.dataset.highlightId = highlight.id;
  box.style.left = `${highlight.xPct}%`;
  box.style.top = `${highlight.yPct}%`;
  box.style.width = `${highlight.wPct}%`;
  box.style.height = `${highlight.hPct}%`;
  box.style.borderColor = color;
  box.style.background = hexToRgba(color, 0.25);

  PID_RESIZE_HANDLES.forEach((handle) => {
    const handleEl = document.createElement("div");
    handleEl.className = "pid-resize-handle";
    handleEl.dataset.handle = handle;
    handleEl.style.borderColor = color;
    handleEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      startHighlightResize(event, highlight, box, handle);
    });
    box.appendChild(handleEl);
  });

  box.addEventListener("mousedown", (event) => {
    event.stopPropagation();
    startHighlightMove(event, highlight, box);
  });

  box.addEventListener("click", (event) => {
    event.stopPropagation();
    if (box._pidJustDragged) {
      box._pidJustDragged = false;
      return;
    }
    openDialogForEdit(highlight.id, event.clientX, event.clientY);
  });

  pidOverlay.appendChild(box);
}

function startHighlightMove(event, highlight, box) {
  const overlayRect = pidOverlay.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const initialXPct = highlight.xPct;
  const initialYPct = highlight.yPct;
  let moved = false;

  function onMouseMove(moveEvent) {
    const dxPct = ((moveEvent.clientX - startX) / overlayRect.width) * 100;
    const dyPct = ((moveEvent.clientY - startY) / overlayRect.height) * 100;
    if (!moved && (Math.abs(dxPct) > 0.3 || Math.abs(dyPct) > 0.3)) moved = true;
    if (!moved) return;

    highlight.xPct = initialXPct + dxPct;
    highlight.yPct = initialYPct + dyPct;
    box.style.left = `${highlight.xPct}%`;
    box.style.top = `${highlight.yPct}%`;
    repositionCalloutForHighlight(highlight, overlayRect);
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (moved) {
      savePidData();
      box._pidJustDragged = true;
    }
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function startHighlightResize(event, highlight, box, handle) {
  const overlayRect = pidOverlay.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const initial = {
    xPct: highlight.xPct,
    yPct: highlight.yPct,
    wPct: highlight.wPct,
    hPct: highlight.hPct,
  };
  const minWPct = (PID_HANDLE_MIN_SIZE / overlayRect.width) * 100;
  const minHPct = (PID_HANDLE_MIN_SIZE / overlayRect.height) * 100;

  function onMouseMove(moveEvent) {
    const dxPct = ((moveEvent.clientX - startX) / overlayRect.width) * 100;
    const dyPct = ((moveEvent.clientY - startY) / overlayRect.height) * 100;

    let { xPct, yPct, wPct, hPct } = initial;

    if (handle.includes("n")) {
      let newY = initial.yPct + dyPct;
      let newH = initial.hPct - dyPct;
      if (newH < minHPct) {
        newH = minHPct;
        newY = initial.yPct + initial.hPct - minHPct;
      }
      yPct = newY;
      hPct = newH;
    }
    if (handle.includes("s")) {
      hPct = Math.max(initial.hPct + dyPct, minHPct);
    }
    if (handle.includes("w")) {
      let newX = initial.xPct + dxPct;
      let newW = initial.wPct - dxPct;
      if (newW < minWPct) {
        newW = minWPct;
        newX = initial.xPct + initial.wPct - minWPct;
      }
      xPct = newX;
      wPct = newW;
    }
    if (handle.includes("e")) {
      wPct = Math.max(initial.wPct + dxPct, minWPct);
    }

    highlight.xPct = xPct;
    highlight.yPct = yPct;
    highlight.wPct = wPct;
    highlight.hPct = hPct;

    box.style.left = `${xPct}%`;
    box.style.top = `${yPct}%`;
    box.style.width = `${wPct}%`;
    box.style.height = `${hPct}%`;
    repositionCalloutForHighlight(highlight, overlayRect);
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    savePidData();
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function attachResizeHandles(container, positionEl, sizeEl, color, onResize, onResizeEnd) {
  PID_RESIZE_HANDLES.forEach((handle) => {
    const handleEl = document.createElement("div");
    handleEl.className = "pid-resize-handle";
    handleEl.dataset.handle = handle;
    handleEl.style.borderColor = color;
    handleEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      startElementResize(event, positionEl, sizeEl, handle, onResize, onResizeEnd);
    });
    container.appendChild(handleEl);
  });
}

function startElementResize(event, positionEl, sizeEl, handle, onResize, onResizeEnd) {
  const startX = event.clientX;
  const startY = event.clientY;
  const initial = {
    left: positionEl.offsetLeft,
    top: positionEl.offsetTop,
    width: sizeEl.offsetWidth,
    height: sizeEl.offsetHeight,
  };
  const MIN = 16;

  function onMouseMove(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    let { left, top, width, height } = initial;

    if (handle.includes("n")) {
      let newTop = initial.top + dy;
      let newHeight = initial.height - dy;
      if (newHeight < MIN) {
        newHeight = MIN;
        newTop = initial.top + initial.height - MIN;
      }
      top = newTop;
      height = newHeight;
    }
    if (handle.includes("s")) {
      height = Math.max(initial.height + dy, MIN);
    }
    if (handle.includes("w")) {
      let newLeft = initial.left + dx;
      let newWidth = initial.width - dx;
      if (newWidth < MIN) {
        newWidth = MIN;
        newLeft = initial.left + initial.width - MIN;
      }
      left = newLeft;
      width = newWidth;
    }
    if (handle.includes("e")) {
      width = Math.max(initial.width + dx, MIN);
    }

    positionEl.style.left = `${left}px`;
    positionEl.style.top = `${top}px`;
    sizeEl.style.width = `${width}px`;
    sizeEl.style.height = `${height}px`;
    sizeEl.style.maxWidth = "none";
    if (onResize) onResize({ left, top, width, height });
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (onResizeEnd) onResizeEnd();
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function computeCalloutAnchor(highlight, overlayRect) {
  const boxLeftPx = (highlight.xPct / 100) * overlayRect.width;
  const boxTopPx = (highlight.yPct / 100) * overlayRect.height;
  const boxWidthPx = (highlight.wPct / 100) * overlayRect.width;
  return { anchorX: boxLeftPx + boxWidthPx, anchorY: boxTopPx };
}

function computeCalloutOffset(highlight) {
  const CALLOUT_OFFSET_X = 36;
  const CALLOUT_OFFSET_Y = 38;
  const hasCustomOffset = highlight.calloutOffsetX !== undefined && highlight.calloutOffsetY !== undefined;
  return {
    offsetX: hasCustomOffset ? highlight.calloutOffsetX : CALLOUT_OFFSET_X,
    offsetY: hasCustomOffset ? highlight.calloutOffsetY : -CALLOUT_OFFSET_Y,
    hasCustomOffset,
  };
}

function repositionCalloutForHighlight(highlight, overlayRect) {
  const wrap = pidOverlay.querySelector(`.pid-callout-wrap[data-highlight-id="${highlight.id}"]`);
  if (!wrap) return;

  const { anchorX, anchorY } = computeCalloutAnchor(highlight, overlayRect);
  const { offsetX, offsetY } = computeCalloutOffset(highlight);

  wrap.style.left = `${anchorX + offsetX}px`;
  wrap.style.top = `${Math.max(anchorY + offsetY, 4)}px`;

  redrawLeaderLine(highlight, wrap, anchorX, anchorY);
}

function renderCallout(highlight, overlayRect, color) {
  if (!overlayRect.width || !overlayRect.height) return;

  const { anchorX, anchorY } = computeCalloutAnchor(highlight, overlayRect);
  const { offsetX, offsetY, hasCustomOffset } = computeCalloutOffset(highlight);

  let labelLeft = anchorX + offsetX;
  let labelTop = Math.max(anchorY + offsetY, 4);
  if (!hasCustomOffset) {
    labelLeft = Math.min(labelLeft, Math.max(overlayRect.width - 230, 4));
  }

  const wrap = document.createElement("div");
  wrap.className = "pid-callout-wrap";
  wrap.dataset.highlightId = highlight.id;
  wrap.style.left = `${labelLeft}px`;
  wrap.style.top = `${labelTop}px`;

  const label = document.createElement("div");
  label.className = "pid-callout-label";
  label.dataset.highlightId = highlight.id;
  label.textContent = highlight.title || "Untitled";
  label.title = "Click to edit • drag to move • drag a handle to resize";
  label.style.borderColor = color;
  applyTextStyleToEl(label, highlight);
  if (highlight.calloutWidth) {
    label.style.width = `${highlight.calloutWidth}px`;
    label.style.maxWidth = "none";
  }
  if (highlight.calloutHeight) label.style.height = `${highlight.calloutHeight}px`;

  label.addEventListener("mousedown", (event) => {
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialLeft = wrap.offsetLeft;
    const initialTop = wrap.offsetTop;
    let moved = false;

    function onMouseMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) moved = true;
      if (!moved) return;

      wrap.style.left = `${initialLeft + dx}px`;
      wrap.style.top = `${initialTop + dy}px`;
      redrawLeaderLine(highlight, wrap, anchorX, anchorY);
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (moved) {
        highlight.calloutOffsetX = wrap.offsetLeft - anchorX;
        highlight.calloutOffsetY = wrap.offsetTop - anchorY;
        savePidData();
        label._pidJustDragged = true;
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  label.addEventListener("click", (event) => {
    event.stopPropagation();
    if (label._pidJustDragged) {
      label._pidJustDragged = false;
      return;
    }
    openDialogForEdit(highlight.id, event.clientX, event.clientY);
  });

  wrap.appendChild(label);
  pidOverlay.appendChild(wrap);

  const leaderSvg = buildLeaderLine(
    labelLeft,
    labelTop + wrap.offsetHeight / 2,
    anchorX,
    anchorY,
    color
  );
  leaderSvg.dataset.highlightId = highlight.id;
  pidOverlay.appendChild(leaderSvg);

  attachResizeHandles(
    wrap,
    wrap,
    label,
    color,
    (rect) => {
      highlight.calloutOffsetX = rect.left - anchorX;
      highlight.calloutOffsetY = rect.top - anchorY;
      highlight.calloutWidth = rect.width;
      highlight.calloutHeight = rect.height;
      redrawLeaderLine(highlight, wrap, anchorX, anchorY);
    },
    () => savePidData()
  );
}

function redrawLeaderLine(highlight, label, anchorX, anchorY) {
  const oldSvg = pidOverlay.querySelector(`.pid-leader-svg[data-highlight-id="${highlight.id}"]`);
  if (oldSvg) oldSvg.remove();

  const color = highlight.color || "#f59e0b";
  const newSvg = buildLeaderLine(
    label.offsetLeft,
    label.offsetTop + label.offsetHeight / 2,
    anchorX,
    anchorY,
    color
  );
  newSvg.dataset.highlightId = highlight.id;
  pidOverlay.appendChild(newSvg);
}

function buildLeaderLine(x1, y1, x2, y2, color) {
  const svgNS = "http://www.w3.org/2000/svg";
  const pad = 12;
  const minX = Math.min(x1, x2) - pad;
  const minY = Math.min(y1, y2) - pad;
  const width = Math.abs(x2 - x1) + pad * 2;
  const height = Math.abs(y2 - y1) + pad * 2;

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "pid-leader-svg");
  svg.style.left = `${minX}px`;
  svg.style.top = `${minY}px`;
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const lx1 = x1 - minX;
  const ly1 = y1 - minY;
  const lx2 = x2 - minX;
  const ly2 = y2 - minY;

  const dx = lx2 - lx1;
  const dy = ly2 - ly1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const arrowLen = 9;
  const shortX = lx2 - ux * arrowLen;
  const shortY = ly2 - uy * arrowLen;

  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", lx1);
  line.setAttribute("y1", ly1);
  line.setAttribute("x2", shortX);
  line.setAttribute("y2", shortY);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "2");
  svg.appendChild(line);

  const perpX = -uy;
  const perpY = ux;
  const baseHalf = 4.5;
  const points = [
    `${lx2},${ly2}`,
    `${shortX + perpX * baseHalf},${shortY + perpY * baseHalf}`,
    `${shortX - perpX * baseHalf},${shortY - perpY * baseHalf}`,
  ].join(" ");

  const arrowhead = document.createElementNS(svgNS, "polygon");
  arrowhead.setAttribute("points", points);
  arrowhead.setAttribute("fill", color);
  svg.appendChild(arrowhead);

  return svg;
}

function renderShape(item) {
  const color = item.color || "#f59e0b";

  const wrap = document.createElement("div");
  wrap.className = "pid-shape-wrap";
  wrap.style.left = `${item.xPct}%`;
  wrap.style.top = `${item.yPct}%`;
  wrap.style.width = `${item.wPct}%`;
  wrap.style.height = `${item.hPct}%`;

  const box = document.createElement("div");
  box.className = "pid-shape";
  box.style.borderColor = color;
  box.style.borderWidth = `${item.strokeWidth || 3}px`;
  box.addEventListener("mousedown", (event) => event.stopPropagation());

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "pid-shape-delete";
  deleteButton.textContent = "×";
  deleteButton.title = "Delete shape";
  deleteButton.addEventListener("mousedown", (event) => event.stopPropagation());
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    pidData.highlights = pidData.highlights.filter((x) => x.id !== item.id);
    savePidData();
    renderHighlights();
  });

  wrap.appendChild(box);
  wrap.appendChild(deleteButton);
  pidOverlay.appendChild(wrap);
}

function renderDrawStroke(item, overlayRect) {
  if (!overlayRect.width || !overlayRect.height || !item.points || item.points.length < 2) return;

  const pxPoints = item.points.map((p) => ({
    x: (p.xPct / 100) * overlayRect.width,
    y: (p.yPct / 100) * overlayRect.height,
  }));

  const xs = pxPoints.map((p) => p.x);
  const ys = pxPoints.map((p) => p.y);
  const pad = Math.max(item.strokeWidth || 3, 8);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const width = maxX - minX;
  const height = maxY - minY;

  const wrap = document.createElement("div");
  wrap.className = "pid-draw-wrap";
  wrap.style.left = `${minX}px`;
  wrap.style.top = `${minY}px`;
  wrap.style.width = `${width}px`;
  wrap.style.height = `${height}px`;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "pid-draw-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const polyline = document.createElementNS(svgNS, "polyline");
  polyline.setAttribute("points", pxPoints.map((p) => `${p.x - minX},${p.y - minY}`).join(" "));
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", item.color || "#f59e0b");
  polyline.setAttribute("stroke-width", item.strokeWidth || 3);
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  svg.appendChild(polyline);
  wrap.appendChild(svg);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "pid-draw-delete";
  deleteButton.textContent = "×";
  deleteButton.title = "Delete drawing";
  deleteButton.addEventListener("mousedown", (event) => event.stopPropagation());
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    pidData.highlights = pidData.highlights.filter((x) => x.id !== item.id);
    savePidData();
    renderHighlights();
  });
  wrap.appendChild(deleteButton);

  pidOverlay.appendChild(wrap);
}

function buildDetailsPreview(details) {
  if (!details) return "";
  return [details.size, details.rating, details.description, details.lineNumber, details.specialNote, details.pipingSpec]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 80);
}

function renderNoteIcon(item) {
  const color = item.color || "#f59e0b";

  const icon = document.createElement("div");
  icon.className = "pid-note-icon";
  icon.dataset.highlightId = item.id;
  icon.style.left = `${item.xPct}%`;
  icon.style.top = `${item.yPct}%`;
  icon.style.background = color;
  icon.textContent = "\u{1F4AC}";

  const preview = buildDetailsPreview(item.details) || item.notes || "";
  icon.title = item.title ? `${item.title}${preview ? " — " + preview : ""}` : preview || "Comment";

  icon.addEventListener("mousedown", (event) => event.stopPropagation());
  icon.addEventListener("click", (event) => {
    event.stopPropagation();
    openDialogForEdit(item.id, event.clientX, event.clientY);
  });

  pidOverlay.appendChild(icon);
}

function buildDeleteButton(id, className, title) {
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = className;
  deleteButton.textContent = "×";
  deleteButton.title = title;
  deleteButton.addEventListener("mousedown", (event) => event.stopPropagation());
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    pidData.highlights = pidData.highlights.filter((x) => x.id !== id);
    savePidData();
    renderHighlights();
  });
  return deleteButton;
}

function renderEllipse(item) {
  const color = item.color || "#f59e0b";

  const wrap = document.createElement("div");
  wrap.className = "pid-shape-wrap";
  wrap.style.left = `${item.xPct}%`;
  wrap.style.top = `${item.yPct}%`;
  wrap.style.width = `${item.wPct}%`;
  wrap.style.height = `${item.hPct}%`;

  const box = document.createElement("div");
  box.className = "pid-shape pid-ellipse";
  box.style.borderColor = color;
  box.style.borderWidth = `${item.strokeWidth || 3}px`;
  box.addEventListener("mousedown", (event) => event.stopPropagation());

  wrap.appendChild(box);
  wrap.appendChild(buildDeleteButton(item.id, "pid-shape-delete", "Delete circle"));
  pidOverlay.appendChild(wrap);
}

function buildCloudPath(width, height) {
  const bumpSize = Math.max(6, Math.min(width, height) / 8);
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  let d = "";
  for (let side = 0; side < 4; side++) {
    const start = corners[side];
    const end = corners[(side + 1) % 4];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const sideLen = Math.hypot(dx, dy);
    const bumpCount = Math.max(2, Math.round(sideLen / (bumpSize * 2)));
    const stepX = dx / bumpCount;
    const stepY = dy / bumpCount;

    if (side === 0) d += `M ${start.x} ${start.y} `;

    for (let i = 0; i < bumpCount; i++) {
      const nx = start.x + stepX * (i + 1);
      const ny = start.y + stepY * (i + 1);
      const r = Math.hypot(stepX, stepY) / 1.6;
      d += `A ${r} ${r} 0 0 1 ${nx} ${ny} `;
    }
  }
  d += "Z";
  return d;
}

function renderCloud(item, overlayRect) {
  if (!overlayRect.width || !overlayRect.height) return;
  const color = item.color || "#f59e0b";

  const left = (item.xPct / 100) * overlayRect.width;
  const top = (item.yPct / 100) * overlayRect.height;
  const width = (item.wPct / 100) * overlayRect.width;
  const height = (item.hPct / 100) * overlayRect.height;
  if (width <= 0 || height <= 0) return;

  const wrap = document.createElement("div");
  wrap.className = "pid-shape-wrap";
  wrap.style.left = `${left}px`;
  wrap.style.top = `${top}px`;
  wrap.style.width = `${width}px`;
  wrap.style.height = `${height}px`;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "pid-cloud-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.addEventListener("mousedown", (event) => event.stopPropagation());

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", buildCloudPath(width, height));
  path.setAttribute("fill", hexToRgba(color, 0.12));
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", item.strokeWidth || 3);
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  wrap.appendChild(svg);

  wrap.appendChild(buildDeleteButton(item.id, "pid-shape-delete", "Delete cloud"));
  pidOverlay.appendChild(wrap);
}

function buildArrowheadPolygon(x1, y1, x2, y2, color) {
  const svgNS = "http://www.w3.org/2000/svg";
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const arrowLen = 12;
  const shortX = x2 - ux * arrowLen;
  const shortY = y2 - uy * arrowLen;
  const perpX = -uy;
  const perpY = ux;
  const baseHalf = 5.5;
  const points = [
    `${x2},${y2}`,
    `${shortX + perpX * baseHalf},${shortY + perpY * baseHalf}`,
    `${shortX - perpX * baseHalf},${shortY - perpY * baseHalf}`,
  ].join(" ");

  const polygon = document.createElementNS(svgNS, "polygon");
  polygon.setAttribute("points", points);
  polygon.setAttribute("fill", color);
  return polygon;
}

function renderLineOrArrow(item, overlayRect) {
  if (!overlayRect.width || !overlayRect.height) return;
  const color = item.color || "#f59e0b";

  const x1 = (item.x1Pct / 100) * overlayRect.width;
  const y1 = (item.y1Pct / 100) * overlayRect.height;
  const x2 = (item.x2Pct / 100) * overlayRect.width;
  const y2 = (item.y2Pct / 100) * overlayRect.height;

  const pad = 16;
  const minX = Math.min(x1, x2) - pad;
  const minY = Math.min(y1, y2) - pad;
  const width = Math.abs(x2 - x1) + pad * 2;
  const height = Math.abs(y2 - y1) + pad * 2;

  const wrap = document.createElement("div");
  wrap.className = "pid-draw-wrap";
  wrap.style.left = `${minX}px`;
  wrap.style.top = `${minY}px`;
  wrap.style.width = `${width}px`;
  wrap.style.height = `${height}px`;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "pid-draw-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", x1 - minX);
  line.setAttribute("y1", y1 - minY);
  line.setAttribute("x2", x2 - minX);
  line.setAttribute("y2", y2 - minY);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", item.strokeWidth || 3);
  line.setAttribute("stroke-linecap", "round");
  svg.appendChild(line);

  if (item.type === "arrow") {
    svg.appendChild(buildArrowheadPolygon(x1 - minX, y1 - minY, x2 - minX, y2 - minY, color));
  }

  wrap.appendChild(svg);
  wrap.appendChild(
    buildDeleteButton(item.id, "pid-draw-delete", item.type === "arrow" ? "Delete arrow" : "Delete line")
  );
  pidOverlay.appendChild(wrap);
}

function renderPolyShape(item, overlayRect) {
  if (!overlayRect.width || !overlayRect.height || !item.points || item.points.length < 2) return;

  const pxPoints = item.points.map((p) => ({
    x: (p.xPct / 100) * overlayRect.width,
    y: (p.yPct / 100) * overlayRect.height,
  }));

  const xs = pxPoints.map((p) => p.x);
  const ys = pxPoints.map((p) => p.y);
  const pad = Math.max(item.strokeWidth || 3, 8);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const width = maxX - minX;
  const height = maxY - minY;

  const wrap = document.createElement("div");
  wrap.className = "pid-draw-wrap";
  wrap.style.left = `${minX}px`;
  wrap.style.top = `${minY}px`;
  wrap.style.width = `${width}px`;
  wrap.style.height = `${height}px`;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "pid-draw-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const shapeEl = document.createElementNS(svgNS, item.type === "polygon" ? "polygon" : "polyline");
  shapeEl.setAttribute("points", pxPoints.map((p) => `${p.x - minX},${p.y - minY}`).join(" "));
  shapeEl.setAttribute("fill", item.type === "polygon" ? hexToRgba(item.color || "#f59e0b", 0.2) : "none");
  shapeEl.setAttribute("stroke", item.color || "#f59e0b");
  shapeEl.setAttribute("stroke-width", item.strokeWidth || 3);
  shapeEl.setAttribute("stroke-linecap", "round");
  shapeEl.setAttribute("stroke-linejoin", "round");
  svg.appendChild(shapeEl);
  wrap.appendChild(svg);

  wrap.appendChild(
    buildDeleteButton(
      item.id,
      "pid-draw-delete",
      item.type === "polygon" ? "Delete polygon" : "Delete connected lines"
    )
  );
  pidOverlay.appendChild(wrap);
}

function renderStamp(item) {
  const wrap = document.createElement("div");
  wrap.className = "pid-stamp-wrap";
  wrap.style.left = `${item.xPct}%`;
  wrap.style.top = `${item.yPct}%`;

  const badge = document.createElement("div");
  badge.className = "pid-stamp-badge";
  badge.style.borderColor = item.color || "#16a34a";
  badge.style.color = item.color || "#16a34a";
  badge.textContent = item.label || "STAMP";
  badge.addEventListener("mousedown", (event) => event.stopPropagation());

  wrap.appendChild(badge);
  wrap.appendChild(buildDeleteButton(item.id, "pid-stamp-delete", "Delete stamp"));
  pidOverlay.appendChild(wrap);
}

function updateDrawPreview() {
  if (!drawPreviewSvg || !drawPoints || drawPoints.length < 2) return;

  let polyline = drawPreviewSvg.querySelector("polyline");
  if (!polyline) {
    polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke-linecap", "round");
    polyline.setAttribute("stroke-linejoin", "round");
    drawPreviewSvg.appendChild(polyline);
  }
  polyline.setAttribute("stroke", pidActiveColor);
  polyline.setAttribute("stroke-width", pidActiveStrokeWidth);
  polyline.setAttribute("points", drawPoints.map((p) => `${p.x},${p.y}`).join(" "));
}

function renderTextBox(annotation, autoFocus) {
  const wrap = document.createElement("div");
  wrap.className = "pid-textbox-wrap";
  wrap.style.left = `${annotation.xPct}%`;
  wrap.style.top = `${annotation.yPct}%`;

  const color = annotation.color || "#f59e0b";

  const box = document.createElement("div");
  box.className = "pid-textbox";
  box.contentEditable = "true";
  box.textContent = annotation.notes || "";
  box.style.borderColor = color;
  box.style.background = hexToRgba(color, 0.2);
  applyTextStyleToEl(box, annotation);
  if (annotation.boxWidth) box.style.width = `${annotation.boxWidth}px`;
  if (annotation.boxHeight) box.style.height = `${annotation.boxHeight}px`;

  box.addEventListener("mousedown", (event) => event.stopPropagation());
  box.addEventListener("click", (event) => event.stopPropagation());

  box.addEventListener("focus", () => {
    pidFocusedTextAnnotation = annotation;
    pidFocusedTextEl = box;
    syncTextStyleControls(annotation);
  });

  box.addEventListener("blur", () => {
    if (pidFocusedTextEl === box) {
      pidFocusedTextAnnotation = null;
      pidFocusedTextEl = null;
    }

    const text = box.textContent.trim();
    if (!text) {
      pidData.highlights = pidData.highlights.filter((item) => item.id !== annotation.id);
      savePidData();
      renderHighlights();
      return;
    }
    annotation.notes = text;
    savePidData();
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "pid-textbox-delete";
  deleteButton.textContent = "×";
  deleteButton.title = "Delete text box";
  deleteButton.addEventListener("mousedown", (event) => event.stopPropagation());
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    pidData.highlights = pidData.highlights.filter((item) => item.id !== annotation.id);
    savePidData();
    renderHighlights();
  });

  wrap.appendChild(box);
  wrap.appendChild(deleteButton);
  pidOverlay.appendChild(wrap);

  attachResizeHandles(
    wrap,
    wrap,
    box,
    color,
    ({ left, top, width, height }) => {
      const overlayRect = pidOverlay.getBoundingClientRect();
      if (overlayRect.width && overlayRect.height) {
        annotation.xPct = (left / overlayRect.width) * 100;
        annotation.yPct = (top / overlayRect.height) * 100;
      }
      annotation.boxWidth = width;
      annotation.boxHeight = height;
    },
    () => savePidData()
  );

  if (autoFocus) {
    box.focus();
  }
}

function addTextBoxAt(xPct, yPct) {
  const annotation = {
    id: newId(),
    type: "text",
    xPct,
    yPct,
    notes: "",
    color: pidActiveColor,
    fontFamily: pidActiveFontFamily,
    fontSize: pidActiveFontSize,
    bold: pidActiveBold,
    italic: pidActiveItalic,
    underline: pidActiveUnderline,
  };
  pidData.highlights.push(annotation);
  savePidData();
  renderTextBox(annotation, true);
}

let pidTextLayerNaturalSize = null;

function syncTextLayerScale() {
  if (!pidTextLayerNaturalSize || !pidImage.clientWidth) return;
  const displayScale = pidImage.clientWidth / pidTextLayerNaturalSize.width;
  pidTextLayer.style.width = `${pidTextLayerNaturalSize.width}px`;
  pidTextLayer.style.height = `${pidTextLayerNaturalSize.height}px`;
  pidTextLayer.style.transform = `scale(${displayScale})`;
}

pidImage.addEventListener("load", syncTextLayerScale);
window.addEventListener("resize", syncTextLayerScale);

function clearPdfTextLayer() {
  pidTextLayerNaturalSize = null;
  pidTextLayer.innerHTML = "";
  pidTextLayer.style.width = "";
  pidTextLayer.style.height = "";
  pidTextLayer.style.transform = "";
}

async function buildPdfTextLayer(page, viewport) {
  pidTextLayer.innerHTML = "";
  pidTextLayer.style.setProperty("--scale-factor", viewport.scale);
  pidTextLayerNaturalSize = { width: viewport.width, height: viewport.height };
  try {
    const textContent = await page.getTextContent();
    await pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: pidTextLayer,
      viewport,
    }).promise;
  } catch (error) {
    // No selectable text available for this page (e.g. a scanned image PDF).
  }
  syncTextLayerScale();
}

function showPidImage(dataUrl) {
  clearPdfTextLayer();
  pidImage.src = dataUrl;
  pidCanvasWrapper.hidden = false;
  pidSaveButton.hidden = false;
  pidToolbar.hidden = false;
  pidZoomPct = 100;
  applyPidZoom();
}

function isPdfFile(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function arrayBufferToDataUrl(buffer, mimeType) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function dataUrlToUint8Array(dataUrl) {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function renderPdfPage(pageNumber) {
  if (!currentPdfDoc) return;

  const clampedPage = Math.min(Math.max(1, pageNumber), currentPdfDoc.numPages);
  const pagesHighlights = pidData.pagesHighlights || {};
  const highlightsForThisPage = pagesHighlights[clampedPage] || [];

  pidCurrentPdfPageNumber = clampedPage;
  pidPageNumberInput.value = clampedPage;
  pidPageUpButton.disabled = clampedPage <= 1;
  pidPageDownButton.disabled = clampedPage >= currentPdfDoc.numPages;

  pidLoadingHint.hidden = false;
  pidCanvasWrapper.hidden = true;

  try {
    const page = await currentPdfDoc.getPage(clampedPage);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = PID_MAX_RENDER_DIMENSION / Math.max(baseViewport.width, baseViewport.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    pidData = {
      imageDataUrl: canvas.toDataURL("image/png"),
      highlights: highlightsForThisPage,
      pdfDataUrl: currentPdfDataUrl,
      pdfPageNumber: clampedPage,
      pagesHighlights,
      backendId: pidData.backendId,
      backendName: pidData.backendName,
      backendFileUploaded: pidData.backendFileUploaded,
      jobNumber: pidData.jobNumber,
      unitNumber: pidData.unitNumber,
    };
    savePidData();
    showPidImage(pidData.imageDataUrl);
    await buildPdfTextLayer(page, viewport);
  } catch (error) {
    alert("Could not render that PDF page.");
  } finally {
    pidLoadingHint.hidden = true;
  }
}

async function restoreSavedPdf() {
  pidLoadingHint.hidden = false;
  try {
    currentPdfDoc = await pdfjsLib.getDocument({ data: dataUrlToUint8Array(pidData.pdfDataUrl) }).promise;
    currentPdfDataUrl = pidData.pdfDataUrl;
    pidPageCount.textContent = `of ${currentPdfDoc.numPages}`;
    pidPageNumberInput.max = currentPdfDoc.numPages;
    pidPageGroup.hidden = false;
    updateOcrIndexAllVisibility();

    const restorePage = pidData.pdfPageNumber || 1;
    pidData.pagesHighlights = pidData.pagesHighlights || {};
    if (!pidData.pagesHighlights[restorePage] && pidData.highlights && pidData.highlights.length) {
      // Data saved before per-page storage existed only ever kept one page's highlights.
      pidData.pagesHighlights[restorePage] = pidData.highlights;
    }

    await renderPdfPage(restorePage);
  } catch (error) {
    pidLoadingHint.hidden = true;
    if (pidData.imageDataUrl) showPidImage(pidData.imageDataUrl);
  }
}

pidUploadInput.addEventListener("change", async () => {
  const file = pidUploadInput.files[0];
  if (!file) return;

  pidOriginalFile = file;

  if (isPdfFile(file)) {
    if (!pidPdfSupportAvailable) {
      alert(
        "PDF support failed to load (likely blocked by your network's firewall/proxy). " +
          "Please convert the page to an image (PNG/JPG) and upload that instead."
      );
      pidUploadInput.value = "";
      return;
    }

    pidLoadingHint.hidden = false;
    const arrayBuffer = await file.arrayBuffer();
    currentPdfDataUrl = arrayBufferToDataUrl(arrayBuffer, "application/pdf");
    try {
      currentPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pidData = { imageDataUrl: "", highlights: [], pagesHighlights: {} };
      pidPageTextCache.clear();
      pidLocalSnapshotCache.clear();
      resetOcrState();
      resetSymbolSearchState();
      pidPageCount.textContent = `of ${currentPdfDoc.numPages}`;
      pidPageNumberInput.max = currentPdfDoc.numPages;
      pidPageGroup.hidden = false;
      updateOcrIndexAllVisibility();
      await renderPdfPage(1);
    } catch (error) {
      pidLoadingHint.hidden = true;
      currentPdfDataUrl = null;
      alert("Could not read that PDF file.");
    }
    return;
  }

  currentPdfDoc = null;
  currentPdfDataUrl = null;
  pidPageGroup.hidden = true;
  pidLocalSnapshotCache.clear();
  resetOcrState();
  resetSymbolSearchState();
  updateOcrIndexAllVisibility();
  clearPidSearch();

  const reader = new FileReader();
  reader.onload = () => {
    pidData = { imageDataUrl: reader.result, highlights: [] };
    savePidData();
    showPidImage(pidData.imageDataUrl);
  };
  reader.readAsDataURL(file);
});

pidPageNumberInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !currentPdfDoc) return;

  const parsed = parseInt(pidPageNumberInput.value, 10);
  if (!parsed || parsed < 1) return;

  event.preventDefault();
  renderPdfPage(parsed);
});

pidPageUpButton.addEventListener("click", () => {
  if (!currentPdfDoc) return;
  const current = parseInt(pidPageNumberInput.value, 10) || 1;
  renderPdfPage(current - 1);
});

pidPageDownButton.addEventListener("click", () => {
  if (!currentPdfDoc) return;
  const current = parseInt(pidPageNumberInput.value, 10) || 1;
  renderPdfPage(current + 1);
});

let pidWheelPageCooldown = false;

pidZoomViewport.addEventListener(
  "wheel",
  (event) => {
    if (!currentPdfDoc || pidWheelPageCooldown) return;

    const atBottom =
      pidZoomViewport.scrollTop + pidZoomViewport.clientHeight >= pidZoomViewport.scrollHeight - 2;
    const atTop = pidZoomViewport.scrollTop <= 2;
    const current = parseInt(pidPageNumberInput.value, 10) || 1;

    if (event.deltaY > 0 && atBottom && current < currentPdfDoc.numPages) {
      event.preventDefault();
      pidWheelPageCooldown = true;
      renderPdfPage(current + 1).then(() => {
        pidZoomViewport.scrollTop = 0;
        setTimeout(() => {
          pidWheelPageCooldown = false;
        }, 400);
      });
    } else if (event.deltaY < 0 && atTop && current > 1) {
      event.preventDefault();
      pidWheelPageCooldown = true;
      renderPdfPage(current - 1).then(() => {
        requestAnimationFrame(() => {
          pidZoomViewport.scrollTop = pidZoomViewport.scrollHeight;
        });
        setTimeout(() => {
          pidWheelPageCooldown = false;
        }, 400);
      });
    }
  },
  { passive: false }
);

pidSaveButton.addEventListener("click", async () => {
  const success = await savePidData();
  showPidSaveStatus(success ? "P&ID saved." : "Save failed — browser storage is full.", !success);
  if (success) {
    clearTimeout(pidBackendSyncTimer);
    runBackendSync();
  }
});

function showPidSaveStatus(message, isError) {
  pidSaveStatus.textContent = message;
  pidSaveStatus.classList.toggle("pid-save-status-error", !!isError);
  pidSaveStatus.hidden = false;
  clearTimeout(pidSaveStatusTimer);
  pidSaveStatusTimer = setTimeout(() => {
    pidSaveStatus.hidden = true;
  }, 4000);
}

pidImage.addEventListener("load", renderHighlights);
pidImage.addEventListener("load", ocrCurrentView);

window.addEventListener("resize", () => {
  if (!pidCanvasWrapper.hidden) renderHighlights();
});

setPidTool("select");

function waitForImageLoad(imgEl) {
  if (imgEl.complete && imgEl.naturalWidth) return Promise.resolve();
  return new Promise((resolve) => {
    imgEl.addEventListener("load", () => resolve(), { once: true });
  });
}

function regroupFlatHighlightsByPage(flatHighlights) {
  const pagesHighlights = {};
  (flatHighlights || []).forEach((highlight) => {
    const page = highlight.page || 1;
    const { page: _page, ...rest } = highlight;
    pagesHighlights[page] = pagesHighlights[page] || [];
    pagesHighlights[page].push(rest);
  });
  return pagesHighlights;
}

// A tagged highlight's position/style + tag details now live entirely in a special_item_tags row
// (see importFromPims/getById on the backend) rather than in pid_documents.highlights. Rebuilds
// the same highlight-shaped object the rest of pid.js already knows how to render/edit, so a
// special_item_tags row and a plain pid_documents.highlights entry are interchangeable at runtime.
function convertSpecialItemTagToHighlight(tag) {
  return {
    id: tag.highlightId,
    type: tag.type || "highlight",
    page: tag.page || 1,
    xPct: tag.xPct,
    yPct: tag.yPct,
    wPct: tag.wPct,
    hPct: tag.hPct,
    color: tag.color || "",
    title: tag.tagNumber || "",
    jobNumber: tag.jobNumber || "",
    unitNumber: tag.unitNumber || "",
    fontFamily: tag.fontFamily || "",
    fontSize: tag.fontSize || "",
    bold: !!tag.bold,
    italic: !!tag.italic,
    underline: !!tag.underline,
    details: {
      size: tag.size || "",
      rating: tag.rating || "",
      description: tag.itemName || "",
      quantity: tag.quantity || "",
      lineNumber: tag.lineNumber || "",
      specialNote: tag.specialNote || "",
      licensorNote: tag.licensorRequirement || "",
      pipingSpec: tag.pipingSpec || "",
    },
  };
}

function mergePagesHighlights(...pagesHighlightsList) {
  const merged = {};
  pagesHighlightsList.forEach((pagesHighlights) => {
    Object.keys(pagesHighlights || {}).forEach((page) => {
      merged[page] = (merged[page] || []).concat(pagesHighlights[page]);
    });
  });
  return merged;
}

async function loadPidFromBackend(docId, targetPage, targetTag) {
  const token = typeof simsGetAuthToken === "function" ? simsGetAuthToken() : null;
  if (!token) {
    alert("Please log in to open this item from the P&ID.");
    return false;
  }

  try {
    const response = await fetch(`/api/pid/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
    }

    const doc = payload.data;
    const fileUrl = doc.storedFileName ? `/uploads/pid/${doc.storedFileName}` : null;
    if (!fileUrl) throw new Error("This P&ID has no stored file to display.");

    // pid_documents.highlights holds shapes/notes/stamps/etc (untagged annotations); tagged
    // highlights live entirely in special_item_tags (doc.specialItemTags) and are rebuilt here.
    const taggedPagesHighlights = regroupFlatHighlightsByPage(
      (doc.specialItemTags || []).map(convertSpecialItemTagToHighlight)
    );
    const untaggedPagesHighlights = regroupFlatHighlightsByPage(
      (doc.highlights || []).filter((highlight) => !(highlight.title || "").trim())
    );

    pidData = {
      imageDataUrl: "",
      highlights: [],
      pagesHighlights: mergePagesHighlights(untaggedPagesHighlights, taggedPagesHighlights),
      backendId: doc.id,
      backendName: doc.name,
      backendFileUploaded: true,
      jobNumber: doc.jobNumber || "",
      unitNumber: doc.unitNumber || "",
    };
    loadPidLineNumberOptionsForDocument();
    pidOriginalFile = null;
    pidPageTextCache.clear();
    resetOcrState();

    const fileResponse = await fetch(fileUrl);
    const arrayBuffer = await fileResponse.arrayBuffer();

    if (doc.sourceType === "pdf" && pidPdfSupportAvailable) {
      pidData.pdfDataUrl = arrayBufferToDataUrl(arrayBuffer, "application/pdf");
      currentPdfDataUrl = pidData.pdfDataUrl;
      currentPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pidPageCount.textContent = `of ${currentPdfDoc.numPages}`;
      pidPageNumberInput.max = currentPdfDoc.numPages;
      pidPageGroup.hidden = false;
      updateOcrIndexAllVisibility();
      await renderPdfPage(targetPage || 1);
    } else {
      currentPdfDoc = null;
      currentPdfDataUrl = null;
      pidPageGroup.hidden = true;
      const mimeType = doc.sourceType === "pdf" ? "application/pdf" : "image/png";
      pidData.imageDataUrl = arrayBufferToDataUrl(arrayBuffer, mimeType);
      pidData.highlights = pidData.pagesHighlights[1] || [];
      showPidImage(pidData.imageDataUrl);
    }

    await waitForImageLoad(pidImage);
    renderHighlights();
    await savePidData();

    if (targetTag) {
      const match = pidData.highlights.find(
        (highlight) => (highlight.title || "").trim().toLowerCase() === targetTag.trim().toLowerCase()
      );
      if (match) flashAnnotationMatch(match.id);
    }

    return true;
  } catch (error) {
    alert(`Could not open that item on the P&ID: ${error.message}`);
    return false;
  }
}

(async function initPidData() {
  const params = new URLSearchParams(window.location.search);
  const docIdParam = params.get("docId");

  if (docIdParam) {
    const loaded = await loadPidFromBackend(
      docIdParam,
      parseInt(params.get("page"), 10) || 1,
      params.get("tag")
    );
    if (loaded) return;
  }

  pidData = await loadPidData();
  if (pidData.pdfDataUrl && pidPdfSupportAvailable) {
    await restoreSavedPdf();
  } else if (pidData.imageDataUrl) {
    showPidImage(pidData.imageDataUrl);
  }
})();

function showFloatingDialog(x, y) {
  pidDialog.show();

  const rect = pidDialog.getBoundingClientRect();
  const width = rect.width || 380;
  const height = rect.height || 400;

  let left = x != null ? x + 16 : (window.innerWidth - width) / 2;
  let top = y != null ? y - height / 4 : (window.innerHeight - height) / 2;

  left = Math.min(Math.max(left, 12), Math.max(window.innerWidth - width - 12, 12));
  top = Math.min(Math.max(top, 12), Math.max(window.innerHeight - height - 12, 12));

  pidDialog.style.left = `${left}px`;
  pidDialog.style.top = `${top}px`;
}

pidDialogTitle.addEventListener("mousedown", (event) => {
  event.preventDefault();

  const startX = event.clientX;
  const startY = event.clientY;
  const initialLeft = pidDialog.offsetLeft;
  const initialTop = pidDialog.offsetTop;

  function onMouseMove(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    const rect = pidDialog.getBoundingClientRect();
    let left = initialLeft + dx;
    let top = initialTop + dy;
    left = Math.min(Math.max(left, 4), Math.max(window.innerWidth - rect.width - 4, 4));
    top = Math.min(Math.max(top, 4), Math.max(window.innerHeight - rect.height - 4, 4));
    pidDialog.style.left = `${left}px`;
    pidDialog.style.top = `${top}px`;
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
});

function readDetailInputs() {
  return {
    size: pidDetailInputs.size.value.trim(),
    rating: pidDetailInputs.rating.value.trim(),
    description: pidDetailInputs.description.value.trim(),
    quantity: pidDetailInputs.quantity.value.trim(),
    lineNumber: pidDetailInputs.lineNumber.value.trim(),
    specialNote: pidDetailInputs.specialNote.value.trim(),
    licensorNote: pidDetailInputs.licensorNote.value.trim(),
    pipingSpec: pidDetailInputs.pipingSpec.value.trim(),
  };
}

function writeDetailInputs(highlight) {
  const details = highlight.details || {};
  pidDetailInputs.size.value = details.size || "";
  pidDetailInputs.rating.value = details.rating || "";
  pidDetailInputs.description.value = details.description || highlight.notes || "";
  pidDetailInputs.quantity.value = details.quantity || "";
  pidDetailInputs.lineNumber.value = details.lineNumber || "";
  pidDetailInputs.specialNote.value = details.specialNote || "";
  pidDetailInputs.licensorNote.value = details.licensorNote || "";
  pidDetailInputs.pipingSpec.value = details.pipingSpec || "";
}

function openDialogForCreate(data, type, x, y) {
  editingHighlightId = null;
  pendingRect = data;
  pendingType = type;
  pidDialogTitle.textContent = type === "note" ? "New Comment" : "New Special Item Details";
  pidNoteTitleInput.value = "";
  pidDetailPidNameInput.value = pidData.backendName || "(not saved to server yet)";
  applyDetailsInputStyle();
  pidDetailInputList.forEach((input) => (input.value = ""));
  updatePidDialogForItem();
  pidDeleteButton.hidden = true;
  showFloatingDialog(x, y);
  pidNoteTitleInput.focus();
}

function openDialogForEdit(highlightId, x, y) {
  const highlight = pidData.highlights.find((item) => item.id === highlightId);
  if (!highlight) return;

  editingHighlightId = highlightId;
  pendingRect = null;
  pendingType = null;
  pidDialogTitle.textContent = highlight.type === "note" ? "Comment" : "Special Item Details";
  pidNoteTitleInput.value = highlight.title || "";
  pidDetailPidNameInput.value = pidData.backendName || "(not saved to server yet)";
  pidTagFontFamilySelect.value = highlight.fontFamily || pidFontFamilySelect.value;
  pidTagFontSizeSelect.value = highlight.fontSize || "10";
  setTagStyleState(!!highlight.bold, !!highlight.italic, !!highlight.underline);
  writeDetailInputs(highlight);
  updatePidDialogForItem();
  pidDeleteButton.hidden = false;
  showFloatingDialog(x, y);
  pidNoteTitleInput.focus();
}

function closeDialogAndCleanup() {
  pidDialog.close();
  if (dragBoxEl) {
    dragBoxEl.remove();
    dragBoxEl = null;
  }
  pendingRect = null;
  pendingType = null;
  editingHighlightId = null;
}

pidCancelButton.addEventListener("click", closeDialogAndCleanup);

function syncHighlightToJobRecord(highlightId) {
  if (typeof simsUpsertRecord !== "function") return;

  const highlight = pidData.highlights.find((item) => item.id === highlightId);
  if (!highlight) return;

  const tagNumber = (highlight.title || "").trim();
  if (!tagNumber) return; // nothing meaningful to file into Job Form/Item Details without a tag number

  const details = highlight.details || {};

  simsUpsertRecord({
    id: `pid-${highlight.id}`,
    status: "Draft",
    createdAt: new Date().toISOString(),
    jobNumber: highlight.jobNumber || "",
    unitNumber: highlight.unitNumber || "",
    tagNumber,
    itemName: details.description || "",
    category: "",
    lineNumber: details.lineNumber || "",
    lineSize: details.size || "",
    pipingSpec: details.pipingSpec || "",
    lineTemp: "",
    rating: details.rating || "",
    items: [
      {
        itemDescription: "",
        quantity: details.quantity || "",
        specialtyNote: details.specialNote || "",
        licensorRequirement: details.licensorNote || "",
        pidNo: details.pidNumber || "",
        itemCode: "",
        mrNumber: "",
        datasheet: "",
        vendorDrawing: "",
        modelStatus: "",
      },
    ],
    sourcePidHighlightId: highlight.id,
  });
}

pidDialogForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = pidNoteTitleInput.value.trim();
  const jobNumber = pidData.jobNumber || "";
  const unitNumber = pidData.unitNumber || "";
  const fontFamily = pidTagFontFamilySelect.value;
  const fontSize = pidTagFontSizeSelect.value;
  const details = readDetailInputs();
  let savedHighlightId = null;

  if (editingHighlightId) {
    const highlight = pidData.highlights.find((item) => item.id === editingHighlightId);
    if (highlight) {
      highlight.title = title;
      highlight.jobNumber = jobNumber;
      highlight.unitNumber = unitNumber;
      highlight.fontFamily = fontFamily;
      highlight.fontSize = fontSize;
      highlight.bold = pidTagBold;
      highlight.italic = pidTagItalic;
      highlight.underline = pidTagUnderline;
      highlight.details = details;
      delete highlight.notes;
      savedHighlightId = highlight.id;
    }
  } else if (pendingRect && pendingType === "note") {
    const highlight = {
      id: newId(),
      type: "note",
      xPct: pendingRect.xPct,
      yPct: pendingRect.yPct,
      color: pidActiveColor,
      title,
      jobNumber,
      unitNumber,
      fontFamily,
      fontSize,
      bold: pidTagBold,
      italic: pidTagItalic,
      underline: pidTagUnderline,
      details,
    };
    pidData.highlights.push(highlight);
    savedHighlightId = highlight.id;
  } else if (pendingRect) {
    const highlight = {
      id: newId(),
      type: "highlight",
      ...pendingRect,
      title,
      jobNumber,
      unitNumber,
      fontFamily,
      fontSize,
      bold: pidTagBold,
      italic: pidTagItalic,
      underline: pidTagUnderline,
      details,
    };
    pidData.highlights.push(highlight);
    savedHighlightId = highlight.id;
  }

  savePidData();
  if (savedHighlightId) syncHighlightToJobRecord(savedHighlightId);

  if (dragBoxEl) {
    dragBoxEl.remove();
    dragBoxEl = null;
  }
  pendingRect = null;
  pendingType = null;
  editingHighlightId = null;
  pidDialog.close();
  renderHighlights();
});

pidDeleteButton.addEventListener("click", () => {
  if (editingHighlightId) {
    pidData.highlights = pidData.highlights.filter((item) => item.id !== editingHighlightId);
    savePidData();
    renderHighlights();
  }
  closeDialogAndCleanup();
});

function startPidPan(event) {
  const startX = event.clientX;
  const startY = event.clientY;
  const startScrollLeft = pidZoomViewport.scrollLeft;
  const startScrollTop = pidZoomViewport.scrollTop;
  pidOverlay.classList.add("panning");

  function onMouseMove(moveEvent) {
    pidZoomViewport.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
    pidZoomViewport.scrollTop = startScrollTop - (moveEvent.clientY - startY);
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    pidOverlay.classList.remove("panning");
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

pidZoomViewport.addEventListener(
  "mousedown",
  (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    startPidPan(event);
  },
  true
);

pidZoomViewport.addEventListener("auxclick", (event) => {
  if (event.button === 1) event.preventDefault();
});

pidOverlay.addEventListener("mousedown", (event) => {
  event.preventDefault();
  // Preserve the rect captured at a polygon/polyline's first click for the rest of that shape,
  // instead of re-measuring on every subsequent click (same reasoning as the drag-box fix below).
  const continuingPoly = pendingPolyPoints && (pidActiveTool === "polygon" || pidActiveTool === "polyline");
  if (!continuingPoly) pidInteractionRect = pidOverlay.getBoundingClientRect();
  const rect = getPidInteractionRect();

  if (pidActiveTool === "pan") {
    startPidPan(event);
    return;
  }

  if (pidActiveTool === "text") {
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    addTextBoxAt(xPct, yPct);
    return;
  }

  if (pidActiveTool === "note") {
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    openDialogForCreate({ xPct, yPct }, "note", event.clientX, event.clientY);
    return;
  }

  if (pidActiveTool === "stamp") {
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    pidData.highlights.push({
      id: newId(),
      type: "stamp",
      xPct,
      yPct,
      label: pidActiveStampPreset.label,
      color: pidActiveStampPreset.color,
    });
    savePidData();
    renderHighlights();
    return;
  }

  if (pidActiveTool === "polygon" || pidActiveTool === "polyline") return;

  if (pidActiveTool === "draw") {
    drawPoints = [{ x: event.clientX - rect.left, y: event.clientY - rect.top }];
    drawPreviewSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawPreviewSvg.setAttribute("class", "pid-draw-preview-svg");
    pidOverlay.appendChild(drawPreviewSvg);
    return;
  }

  if (pidActiveTool === "line" || pidActiveTool === "arrow") {
    lineStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    linePreviewSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    linePreviewSvg.setAttribute("class", "pid-draw-preview-svg");
    pidOverlay.appendChild(linePreviewSvg);
    return;
  }

  if (!["highlight", "shape", "ellipse", "cloud", "findsymbol"].includes(pidActiveTool)) return;

  dragStart = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  dragBoxEl = document.createElement("div");
  dragBoxEl.className = "pid-drag-box";
  dragBoxEl.style.borderColor = pidActiveColor;
  dragBoxEl.style.background = hexToRgba(pidActiveColor, 0.15);
  dragBoxEl.style.left = `${dragStart.x}px`;
  dragBoxEl.style.top = `${dragStart.y}px`;
  dragBoxEl.style.width = "0px";
  dragBoxEl.style.height = "0px";
  pidOverlay.appendChild(dragBoxEl);
});

pidOverlay.addEventListener("mousemove", (event) => {
  const rect = getPidInteractionRect();

  if (drawPoints) {
    drawPoints.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    updateDrawPreview();
    return;
  }

  if (lineStart && linePreviewSvg) {
    updateLinePreview(rect, event);
    return;
  }

  if (pendingPolyPoints && pendingPolyPoints.length) {
    updatePolyPreview(rect, event);
    return;
  }

  if (!dragStart || !dragBoxEl) return;

  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  const left = Math.min(dragStart.x, currentX);
  const top = Math.min(dragStart.y, currentY);
  const width = Math.abs(currentX - dragStart.x);
  const height = Math.abs(currentY - dragStart.y);

  dragBoxEl.style.left = `${left}px`;
  dragBoxEl.style.top = `${top}px`;
  dragBoxEl.style.width = `${width}px`;
  dragBoxEl.style.height = `${height}px`;
});

pidOverlay.addEventListener("mouseup", (event) => {
  const rect = getPidInteractionRect();

  if (drawPoints) {
    pidInteractionRect = null;
    if (drawPreviewSvg) {
      drawPreviewSvg.remove();
      drawPreviewSvg = null;
    }
    const points = drawPoints;
    drawPoints = null;

    if (points.length > 1) {
      pidData.highlights.push({
        id: newId(),
        type: "draw",
        color: pidActiveColor,
        strokeWidth: pidActiveStrokeWidth,
        points: points.map((p) => ({
          xPct: (p.x / rect.width) * 100,
          yPct: (p.y / rect.height) * 100,
        })),
      });
      savePidData();
      renderHighlights();
    }
    return;
  }

  if (lineStart && linePreviewSvg) {
    pidInteractionRect = null;
    finalizeLineOrArrow(rect, event);
    return;
  }

  if (!dragStart || !dragBoxEl) return;

  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  const left = Math.min(dragStart.x, currentX);
  const top = Math.min(dragStart.y, currentY);
  const width = Math.abs(currentX - dragStart.x);
  const height = Math.abs(currentY - dragStart.y);

  const finishedTool = pidActiveTool;
  dragStart = null;
  pidInteractionRect = null;

  // Symbols on a real P&ID can be small on screen, so give that tool a lower minimum — and
  // always say something instead of the box just silently vanishing.
  const minDragSize = finishedTool === "findsymbol" ? 5 : 12;
  if (width < minDragSize || height < minDragSize) {
    dragBoxEl.remove();
    dragBoxEl = null;
    if (finishedTool === "findsymbol") {
      setPidSymbolStatus("That box was too small — zoom in and try drawing a slightly larger box around the symbol.");
    }
    return;
  }

  const rectPct = {
    xPct: (left / rect.width) * 100,
    yPct: (top / rect.height) * 100,
    wPct: (width / rect.width) * 100,
    hPct: (height / rect.height) * 100,
    color: pidActiveColor,
  };

  if (finishedTool === "findsymbol") {
    dragBoxEl.remove();
    dragBoxEl = null;
    openSymbolDialog(rectPct);
    return;
  }

  if (finishedTool === "shape" || finishedTool === "ellipse" || finishedTool === "cloud") {
    dragBoxEl.remove();
    dragBoxEl = null;
    pidData.highlights.push({
      id: newId(),
      type: finishedTool,
      ...rectPct,
      strokeWidth: pidActiveStrokeWidth,
    });
    savePidData();
    renderHighlights();
    return;
  }

  openDialogForCreate(rectPct, "highlight", event.clientX, event.clientY);
});

function updateLinePreview(rect, event) {
  const current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  linePreviewSvg.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", lineStart.x);
  line.setAttribute("y1", lineStart.y);
  line.setAttribute("x2", current.x);
  line.setAttribute("y2", current.y);
  line.setAttribute("stroke", pidActiveColor);
  line.setAttribute("stroke-width", pidActiveStrokeWidth);
  line.setAttribute("stroke-linecap", "round");
  linePreviewSvg.appendChild(line);

  if (pidActiveTool === "arrow") {
    linePreviewSvg.appendChild(
      buildArrowheadPolygon(lineStart.x, lineStart.y, current.x, current.y, pidActiveColor)
    );
  }
}

function finalizeLineOrArrow(rect, event) {
  const current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const finishedTool = pidActiveTool;
  linePreviewSvg.remove();
  linePreviewSvg = null;
  const start = lineStart;
  lineStart = null;

  const dist = Math.hypot(current.x - start.x, current.y - start.y);
  if (dist < 12) return;

  pidData.highlights.push({
    id: newId(),
    type: finishedTool,
    color: pidActiveColor,
    strokeWidth: pidActiveStrokeWidth,
    x1Pct: (start.x / rect.width) * 100,
    y1Pct: (start.y / rect.height) * 100,
    x2Pct: (current.x / rect.width) * 100,
    y2Pct: (current.y / rect.height) * 100,
  });
  savePidData();
  renderHighlights();
}

function updatePolyPreview(rect, event) {
  if (!polyPreviewSvg || !pendingPolyPoints) return;

  const current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const allPoints = [...pendingPolyPoints, current];
  polyPreviewSvg.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const shapeEl = document.createElementNS(svgNS, pendingPolyType === "polygon" ? "polygon" : "polyline");
  shapeEl.setAttribute("points", allPoints.map((p) => `${p.x},${p.y}`).join(" "));
  shapeEl.setAttribute("fill", pendingPolyType === "polygon" ? hexToRgba(pidActiveColor, 0.15) : "none");
  shapeEl.setAttribute("stroke", pidActiveColor);
  shapeEl.setAttribute("stroke-width", pidActiveStrokeWidth);
  shapeEl.setAttribute("stroke-linecap", "round");
  shapeEl.setAttribute("stroke-linejoin", "round");
  polyPreviewSvg.appendChild(shapeEl);

  pendingPolyPoints.forEach((p) => {
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", p.x);
    dot.setAttribute("cy", p.y);
    dot.setAttribute("r", 3);
    dot.setAttribute("fill", pidActiveColor);
    polyPreviewSvg.appendChild(dot);
  });
}

pidOverlay.addEventListener("click", (event) => {
  if (pidActiveTool !== "polygon" && pidActiveTool !== "polyline") return;

  const rect = getPidInteractionRect();
  const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };

  if (!pendingPolyPoints) {
    pendingPolyPoints = [];
    pendingPolyType = pidActiveTool;
    polyPreviewSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    polyPreviewSvg.setAttribute("class", "pid-draw-preview-svg");
    pidOverlay.appendChild(polyPreviewSvg);
  }

  pendingPolyPoints.push(point);
  updatePolyPreview(rect, event);
});

pidOverlay.addEventListener("dblclick", (event) => {
  if (!pendingPolyPoints) return;
  event.preventDefault();

  if (pendingPolyPoints.length > 1) pendingPolyPoints.pop();

  const rect = getPidInteractionRect();
  pidInteractionRect = null;
  if (pendingPolyPoints.length >= 2) {
    pidData.highlights.push({
      id: newId(),
      type: pendingPolyType,
      color: pidActiveColor,
      strokeWidth: pidActiveStrokeWidth,
      points: pendingPolyPoints.map((p) => ({
        xPct: (p.x / rect.width) * 100,
        yPct: (p.y / rect.height) * 100,
      })),
    });
    savePidData();
    renderHighlights();
  }

  if (polyPreviewSvg) {
    polyPreviewSvg.remove();
    polyPreviewSvg = null;
  }
  pendingPolyPoints = null;
  pendingPolyType = null;
});

// ---- OCR (drawing-text indexing) ----

function setPidOcrStatus(text, autoHide) {
  pidOcrStatusEl.textContent = text;
  pidOcrStatusEl.hidden = !text;
  clearTimeout(pidOcrStatusTimer);
  if (autoHide) {
    pidOcrStatusTimer = setTimeout(() => {
      pidOcrStatusEl.hidden = true;
    }, 4000);
  }
}

function resetOcrState() {
  pidPageOcrCache.clear();
  pidOcrInFlight.clear();
  pidOcrIndexAllCancel = true;
  pidOcrIndexAllRunning = false;
  pidOcrIndexAllButton.textContent = "Index all pages";
  setPidOcrStatus(pidOcrAvailable ? "" : "Drawing-text search unavailable (OCR engine failed to load).");
}

function updateOcrIndexAllVisibility() {
  pidOcrIndexAllButton.hidden = !(pidOcrAvailable && currentPdfDoc && currentPdfDoc.numPages > 1);
}

function withPidTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function getPidOcrWorker() {
  if (!pidOcrWorkerPromise) {
    pidOcrWorkerPromise = Tesseract.createWorker("eng").catch((error) => {
      pidOcrWorkerPromise = null; // let the next attempt retry instead of reusing a dead promise forever
      throw error;
    });
  }
  return pidOcrWorkerPromise;
}

async function ocrImageSource(dataUrl) {
  const worker = await withPidTimeout(
    getPidOcrWorker(),
    60000,
    "Timed out loading the OCR engine (likely blocked by a firewall/proxy)."
  );
  const { data } = await withPidTimeout(worker.recognize(dataUrl), 60000, "Timed out reading this page's text.");
  return (data.words || []).map((word) => ({
    text: word.text,
    x0: word.bbox.x0,
    y0: word.bbox.y0,
    x1: word.bbox.x1,
    y1: word.bbox.y1,
  }));
}

function pidOcrKeyForCurrentView() {
  return currentPdfDoc ? pidCurrentPdfPageNumber : PID_OCR_IMAGE_KEY;
}

function ocrCurrentView() {
  if (!pidOcrAvailable || !pidImage.src || !pidImage.naturalWidth) return Promise.resolve();

  const key = pidOcrKeyForCurrentView();
  if (pidPageOcrCache.has(key)) return Promise.resolve();
  if (pidOcrInFlight.has(key)) return pidOcrInFlight.get(key);

  const width = pidImage.naturalWidth;
  const height = pidImage.naturalHeight;

  const task = (async () => {
    setPidOcrStatus("Indexing this page for drawing-text search…");
    try {
      const words = await ocrImageSource(pidImage.src);
      pidPageOcrCache.set(key, { words, width, height });
      setPidOcrStatus(`Page indexed (${words.length} words found).`, true);
      if (pidSearchQuery) runPidSearch();
      renderLineNumberList();
    } catch (error) {
      setPidOcrStatus(`Could not index this page for drawing-text search: ${error.message || error}`);
    } finally {
      pidOcrInFlight.delete(key);
    }
  })();

  pidOcrInFlight.set(key, task);
  return task;
}

async function renderPdfPageToOffscreenCanvas(pageNumber) {
  const page = await currentPdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = PID_MAX_RENDER_DIMENSION / Math.max(baseViewport.width, baseViewport.height);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;

  return { canvas, width: viewport.width, height: viewport.height };
}

async function ocrPdfPageOffscreen(pageNumber) {
  const { canvas, width, height } = await renderPdfPageToOffscreenCanvas(pageNumber);
  const words = await ocrImageSource(canvas.toDataURL("image/png"));
  return { words, width, height };
}

pidOcrIndexAllButton.addEventListener("click", async () => {
  if (pidOcrIndexAllRunning) {
    pidOcrIndexAllCancel = true;
    return;
  }
  if (!currentPdfDoc) return;

  pidOcrIndexAllRunning = true;
  pidOcrIndexAllCancel = false;
  pidOcrIndexAllButton.textContent = "Cancel indexing";

  const numPages = currentPdfDoc.numPages;
  let indexedThisRun = 0;
  let failedThisRun = 0;

  for (let p = 1; p <= numPages; p++) {
    if (pidOcrIndexAllCancel) break;
    if (pidPageOcrCache.has(p)) continue;

    setPidOcrStatus(`Indexing page ${p} of ${numPages} for drawing-text search…`);
    try {
      if (p === pidCurrentPdfPageNumber) {
        await ocrCurrentView();
        if (!pidPageOcrCache.has(p)) throw new Error("page indexing did not complete");
      } else {
        const result = await ocrPdfPageOffscreen(p);
        pidPageOcrCache.set(p, result);
      }
      indexedThisRun++;
    } catch (error) {
      failedThisRun++;
      if (failedThisRun >= 3 && indexedThisRun === 0) {
        // Consistent failures from the very start usually mean the OCR engine itself is unreachable —
        // stop instead of burning through every remaining page one by one.
        break;
      }
    }
  }

  pidOcrIndexAllRunning = false;
  pidOcrIndexAllButton.textContent = "Index all pages";

  if (pidOcrIndexAllCancel) {
    setPidOcrStatus(`Indexing stopped (${pidPageOcrCache.size} of ${numPages} pages indexed).`);
  } else if (failedThisRun > 0 && indexedThisRun === 0) {
    setPidOcrStatus("Could not index any pages — the OCR engine may be blocked on this network.");
  } else if (failedThisRun > 0) {
    setPidOcrStatus(`Indexed ${pidPageOcrCache.size} of ${numPages} pages (${failedThisRun} failed).`);
  } else {
    setPidOcrStatus(`All ${numPages} pages indexed for drawing-text search.`, true);
  }

  if (pidSearchQuery) runPidSearch();
  renderLineNumberList();
});

if (!pidOcrAvailable) {
  setPidOcrStatus("Drawing-text search unavailable (OCR engine failed to load).");
}

// ---- Search ----

function pidAnnotationSearchText(highlight) {
  const details = highlight.details || {};
  return [
    highlight.title,
    highlight.notes,
    highlight.label,
    details.size,
    details.rating,
    details.description,
    details.lineNumber,
    details.specialNote,
    details.pipingSpec,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function collectAnnotationMatches(query) {
  return pidData.highlights
    .filter((highlight) => pidAnnotationSearchText(highlight).includes(query))
    .map((highlight) => ({ type: "annotation", highlightId: highlight.id, page: pidCurrentPdfPageNumber }));
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

function getCurrentPageTextSpans() {
  return Array.from(pidTextLayer.querySelectorAll("span"));
}

function collectCurrentPageTextMatches(query) {
  const matches = [];
  let occurrence = 0;
  getCurrentPageTextSpans().forEach((span) => {
    if (span.textContent.toLowerCase().includes(query)) {
      matches.push({ type: "text", page: pidCurrentPdfPageNumber, occurrence });
      occurrence++;
    }
  });
  return matches;
}

async function getCachedPageText(pageNumber) {
  if (pidPageTextCache.has(pageNumber)) return pidPageTextCache.get(pageNumber);
  const page = await currentPdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const text = textContent.items
    .map((item) => item.str)
    .join(" ")
    .toLowerCase();
  pidPageTextCache.set(pageNumber, text);
  return text;
}

async function collectPdfTextMatches(query) {
  if (!currentPdfDoc) return [];

  const matches = collectCurrentPageTextMatches(query);

  const otherPages = [];
  for (let p = 1; p <= currentPdfDoc.numPages; p++) {
    if (p !== pidCurrentPdfPageNumber) otherPages.push(p);
  }

  const texts = await Promise.all(otherPages.map((p) => getCachedPageText(p)));
  otherPages.forEach((p, i) => {
    const count = countOccurrences(texts[i], query);
    for (let occurrence = 0; occurrence < count; occurrence++) {
      matches.push({ type: "text", page: p, occurrence });
    }
  });

  return matches;
}

function collectOcrMatches(query) {
  const matches = [];
  pidPageOcrCache.forEach((entry, key) => {
    let occurrence = 0;
    entry.words.forEach((word) => {
      if (word.text && word.text.toLowerCase().includes(query)) {
        matches.push({
          type: "ocr",
          page: currentPdfDoc ? key : null,
          occurrence,
        });
        occurrence++;
      }
    });
  });
  return matches;
}

function clearSearchHighlights() {
  pidTextLayer.querySelectorAll(".pid-search-hit, .pid-search-hit-active").forEach((el) => {
    el.classList.remove("pid-search-hit", "pid-search-hit-active");
  });
  pidOverlay.querySelectorAll(".pid-search-marker").forEach((el) => el.remove());
  pidOverlay.querySelectorAll(".pid-search-flash").forEach((el) => el.classList.remove("pid-search-flash"));
}

function markCurrentPageTextHits(query) {
  getCurrentPageTextSpans().forEach((span) => {
    if (query && span.textContent.toLowerCase().includes(query)) {
      span.classList.add("pid-search-hit");
    }
  });
}

function updateSearchCount() {
  if (!pidSearchQuery) {
    pidSearchCount.textContent = "";
    pidSearchPrevButton.disabled = true;
    pidSearchNextButton.disabled = true;
    pidSearchClearButton.hidden = true;
    return;
  }
  pidSearchClearButton.hidden = false;
  if (!pidSearchMatches.length) {
    pidSearchCount.textContent = "No results";
    pidSearchPrevButton.disabled = true;
    pidSearchNextButton.disabled = true;
    return;
  }
  pidSearchCount.textContent = `${pidSearchIndex + 1} of ${pidSearchMatches.length}`;
  pidSearchPrevButton.disabled = false;
  pidSearchNextButton.disabled = false;
}

async function runPidSearch() {
  const query = pidSearchInput.value.trim().toLowerCase();
  pidSearchQuery = query;
  clearSearchHighlights();

  if (!query) {
    pidSearchMatches = [];
    pidSearchIndex = -1;
    updateSearchCount();
    return;
  }

  const annotationMatches = collectAnnotationMatches(query);
  const textMatches = await collectPdfTextMatches(query);
  const ocrMatches = collectOcrMatches(query);

  if (pidSearchInput.value.trim().toLowerCase() !== query) return;

  markCurrentPageTextHits(query);

  const PID_MATCH_TYPE_ORDER = { annotation: 0, text: 1, ocr: 2 };

  const combined = [...annotationMatches, ...textMatches, ...ocrMatches].sort((a, b) => {
    const pa = a.page == null ? -1 : a.page;
    const pb = b.page == null ? -1 : b.page;
    if (pa !== pb) return pa - pb;
    if (a.type !== b.type) return PID_MATCH_TYPE_ORDER[a.type] - PID_MATCH_TYPE_ORDER[b.type];
    return (a.occurrence || 0) - (b.occurrence || 0);
  });

  pidSearchMatches = combined;
  pidSearchIndex = combined.length ? 0 : -1;
  updateSearchCount();
  if (combined.length) goToPidMatch(0);
}

function flashMarkerAt(xPct, yPct) {
  const marker = document.createElement("div");
  marker.className = "pid-search-marker";
  marker.style.left = `${xPct}%`;
  marker.style.top = `${yPct}%`;
  pidOverlay.appendChild(marker);
  marker.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  setTimeout(() => marker.remove(), 2200);
}

function flashAnnotationMatch(highlightId) {
  const highlight = pidData.highlights.find((item) => item.id === highlightId);
  if (!highlight) return;

  const el =
    pidOverlay.querySelector(`.pid-highlight[data-highlight-id="${highlightId}"]`) ||
    pidOverlay.querySelector(`.pid-callout-wrap[data-highlight-id="${highlightId}"] .pid-callout-label`) ||
    pidOverlay.querySelector(`.pid-note-icon[data-highlight-id="${highlightId}"]`);

  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    el.classList.add("pid-search-flash");
    setTimeout(() => el.classList.remove("pid-search-flash"), 1300);
  } else if (highlight.xPct !== undefined) {
    flashMarkerAt(highlight.xPct, highlight.yPct);
  }
}

function flashTextSpanMatch(query, occurrence) {
  const spans = getCurrentPageTextSpans().filter((span) => span.textContent.toLowerCase().includes(query));
  const span = spans[occurrence] || spans[0];
  markCurrentPageTextHits(query);
  if (!span) return;
  span.classList.add("pid-search-hit-active");
  span.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
}

async function goToPidMatch(index) {
  if (!pidSearchMatches.length) return;
  const wrapped = ((index % pidSearchMatches.length) + pidSearchMatches.length) % pidSearchMatches.length;
  pidSearchIndex = wrapped;
  const match = pidSearchMatches[wrapped];
  updateSearchCount();

  clearSearchHighlights();

  if (match.type === "annotation") {
    flashAnnotationMatch(match.highlightId);
    return;
  }

  if (match.type === "text") {
    if (match.page !== pidCurrentPdfPageNumber) {
      await renderPdfPage(match.page);
    }
    flashTextSpanMatch(pidSearchQuery, match.occurrence);
    return;
  }

  if (match.type === "ocr") {
    if (match.page != null && match.page !== pidCurrentPdfPageNumber) {
      await renderPdfPage(match.page);
    }
    const key = currentPdfDoc ? pidCurrentPdfPageNumber : PID_OCR_IMAGE_KEY;
    const entry = pidPageOcrCache.get(key);
    if (!entry) return;
    const matchingWords = entry.words.filter(
      (word) => word.text && word.text.toLowerCase().includes(pidSearchQuery)
    );
    const word = matchingWords[match.occurrence] || matchingWords[0];
    if (!word) return;
    const xPct = ((word.x0 + word.x1) / 2 / entry.width) * 100;
    const yPct = ((word.y0 + word.y1) / 2 / entry.height) * 100;
    flashMarkerAt(xPct, yPct);
  }
}

function clearPidSearch() {
  pidSearchInput.value = "";
  pidSearchQuery = "";
  pidSearchMatches = [];
  pidSearchIndex = -1;
  clearSearchHighlights();
  updateSearchCount();
}

pidSearchInput.addEventListener("input", () => {
  clearTimeout(pidSearchDebounceTimer);
  pidSearchDebounceTimer = setTimeout(runPidSearch, 350);
});

pidSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    clearTimeout(pidSearchDebounceTimer);
    if (event.shiftKey && pidSearchMatches.length) {
      goToPidMatch(pidSearchIndex - 1);
    } else if (pidSearchQuery === pidSearchInput.value.trim().toLowerCase() && pidSearchMatches.length) {
      goToPidMatch(pidSearchIndex + 1);
    } else {
      runPidSearch();
    }
  } else if (event.key === "Escape") {
    clearPidSearch();
  }
});

pidSearchNextButton.addEventListener("click", () => {
  if (pidSearchMatches.length) goToPidMatch(pidSearchIndex + 1);
});

pidSearchPrevButton.addEventListener("click", () => {
  if (pidSearchMatches.length) goToPidMatch(pidSearchIndex - 1);
});

pidSearchClearButton.addEventListener("click", clearPidSearch);

// ---- Line number extraction (parsed out of OCR'd drawing text) ----

// Matches piping line numbers like 12"-P-101-34678-A1A-NI: size["]-service-unit-sequence, plus
// zero or more trailing spec/insulation segments (A1A, NI, ...).
const PID_LINE_NUMBER_REGEX = /^\d{1,3}"?-[A-Za-z]{1,3}-\d{2,5}-\d{3,6}(?:-[A-Za-z0-9]{2,8}){0,3}$/;

function collectLineNumbersFromOcr() {
  const seen = new Map(); // `${page}:${lineNumber}` -> { lineNumber, page, word }
  pidPageOcrCache.forEach((entry, key) => {
    const page = currentPdfDoc ? key : null;
    (entry.words || []).forEach((word) => {
      const text = (word.text || "").trim();
      if (!PID_LINE_NUMBER_REGEX.test(text)) return;
      const dedupeKey = `${page}:${text.toLowerCase()}`;
      if (!seen.has(dedupeKey)) seen.set(dedupeKey, { lineNumber: text, page, word, entryWidth: entry.width, entryHeight: entry.height });
    });
  });

  return Array.from(seen.values()).sort((a, b) => {
    const pa = a.page == null ? -1 : a.page;
    const pb = b.page == null ? -1 : b.page;
    if (pa !== pb) return pa - pb;
    return a.lineNumber.localeCompare(b.lineNumber);
  });
}

async function jumpToLineNumberWord(item) {
  if (currentPdfDoc && item.page !== null && item.page !== pidCurrentPdfPageNumber) {
    await renderPdfPage(item.page);
    renderHighlights();
  }
  const xPct = ((item.word.x0 + item.word.x1) / 2 / item.entryWidth) * 100;
  const yPct = ((item.word.y0 + item.word.y1) / 2 / item.entryHeight) * 100;
  flashMarkerAt(xPct, yPct);
}

function renderLineNumberList() {
  pidLineNumbersSection.hidden = pidCanvasWrapper.hidden;
  if (pidCanvasWrapper.hidden) return;

  const items = collectLineNumbersFromOcr();
  const isPdf = !!currentPdfDoc;
  pidLineNumbersPageHeader.hidden = !isPdf;
  pidLineNumbersEmptyHint.hidden = items.length > 0;
  pidLineNumbersTableEl.hidden = items.length === 0;

  pidLineNumbersTableBody.innerHTML = "";

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "pid-items-row";
    tr.tabIndex = 0;
    tr.title = `${item.lineNumber} — click to open on the P&ID`;

    const lineTd = document.createElement("td");
    lineTd.className = "pid-linenumbers-value-cell";
    lineTd.textContent = item.lineNumber;
    tr.appendChild(lineTd);

    if (isPdf) {
      const pageTd = document.createElement("td");
      pageTd.className = "pid-items-page-cell";
      pageTd.textContent = item.page != null ? item.page : "—";
      tr.appendChild(pageTd);
    }

    const openItem = () => jumpToLineNumberWord(item);
    tr.addEventListener("click", openItem);
    tr.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openItem();
      }
    });

    pidLineNumbersTableBody.appendChild(tr);
  });
}

// ---- Symbol search (image template matching via OpenCV.js) ----

const pidCvAvailable = typeof cv !== "undefined";
let pidCvReady = false;
if (pidCvAvailable) {
  cv["onRuntimeInitialized"] = () => {
    pidCvReady = true;
  };
}

const PID_SYMBOL_MATCH_THRESHOLD = 0.62;
const PID_SYMBOL_MAX_MATCHES_PER_PAGE = 30;

let pendingSymbolRectPct = null;
let pidSymbolTemplate = null; // { name, mat (cv.Mat, grayscale), width, height, thumbnailDataUrl }
let pidSymbolMatches = []; // [{ name, page, xPct, yPct, wPct, hPct, score }]
const pidSymbolSearchedPages = new Set();
let pidSymbolSearchAllRunning = false;
let pidSymbolSearchAllCancel = false;
let pidSymbolStatusTimer = null;

function setPidSymbolStatus(text, autoHide) {
  pidSymbolStatusEl.textContent = text;
  pidSymbolStatusEl.hidden = !text;
  clearTimeout(pidSymbolStatusTimer);
  if (autoHide) {
    pidSymbolStatusTimer = setTimeout(() => {
      pidSymbolStatusEl.hidden = true;
    }, 4000);
  }
}

function toGrayMat(canvasOrImg) {
  const mat = cv.imread(canvasOrImg);
  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  mat.delete();
  return gray;
}

function cropRectPctToGrayMat(source, srcWidth, srcHeight, rectPct) {
  const x = Math.round((rectPct.xPct / 100) * srcWidth);
  const y = Math.round((rectPct.yPct / 100) * srcHeight);
  const w = Math.max(1, Math.round((rectPct.wPct / 100) * srcWidth));
  const h = Math.max(1, Math.round((rectPct.hPct / 100) * srcHeight));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(source, x, y, w, h, 0, 0, w, h);

  return { mat: toGrayMat(canvas), w, h };
}

function getCurrentPageGrayMat() {
  if (!pidImage.naturalWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = pidImage.naturalWidth;
  canvas.height = pidImage.naturalHeight;
  canvas.getContext("2d").drawImage(pidImage, 0, 0);
  return toGrayMat(canvas);
}

function findTemplateMatches(pageMat, template, threshold, maxMatches) {
  const result = new cv.Mat();
  cv.matchTemplate(pageMat, template.mat, result, cv.TM_CCOEFF_NORMED);

  const matches = [];
  for (let i = 0; i < maxMatches; i++) {
    const minMax = cv.minMaxLoc(result);
    if (minMax.maxVal < threshold) break;
    matches.push({ x: minMax.maxLoc.x, y: minMax.maxLoc.y, score: minMax.maxVal });

    const x0 = Math.max(0, minMax.maxLoc.x - Math.floor(template.width / 2));
    const y0 = Math.max(0, minMax.maxLoc.y - Math.floor(template.height / 2));
    const w = Math.min(template.width, result.cols - x0);
    const h = Math.min(template.height, result.rows - y0);
    if (w <= 0 || h <= 0) break;
    const roi = result.roi(new cv.Rect(x0, y0, w, h));
    roi.setTo(new cv.Scalar(-1));
    roi.delete();
  }

  result.delete();
  return matches;
}

function matchToPct(match, template, pageWidth, pageHeight) {
  return {
    xPct: (match.x / pageWidth) * 100,
    yPct: (match.y / pageHeight) * 100,
    wPct: (template.width / pageWidth) * 100,
    hPct: (template.height / pageHeight) * 100,
    score: match.score,
  };
}

function openSymbolDialog(rectPct) {
  if (!pidCvAvailable || !pidCvReady) {
    alert(
      pidCvAvailable
        ? "Symbol search engine is still loading — please wait a moment and try again."
        : "Symbol search engine failed to load (likely blocked by your network's firewall/proxy)."
    );
    return;
  }
  pendingSymbolRectPct = rectPct;
  pidSymbolNameInput.value = pidSymbolTemplate ? pidSymbolTemplate.name : "";
  pidSymbolDialog.show();
  pidSymbolNameInput.focus();
  pidSymbolNameInput.select();
}

pidSymbolCancelButton.addEventListener("click", () => {
  pidSymbolDialog.close();
  pendingSymbolRectPct = null;
});

pidSymbolDialogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = pidSymbolNameInput.value.trim();
  const rectPct = pendingSymbolRectPct;
  pendingSymbolRectPct = null;
  pidSymbolDialog.close();
  if (!name || !rectPct) return;

  await defineSymbolTemplate(name, rectPct);
});

async function searchCurrentPageForSymbol() {
  if (!pidSymbolTemplate) return;
  const pageMat = getCurrentPageGrayMat();
  if (!pageMat) return;

  const page = currentPdfDoc ? pidCurrentPdfPageNumber : null;
  const rawMatches = findTemplateMatches(
    pageMat,
    pidSymbolTemplate,
    PID_SYMBOL_MATCH_THRESHOLD,
    PID_SYMBOL_MAX_MATCHES_PER_PAGE
  );
  pageMat.delete();

  pidSymbolMatches = pidSymbolMatches.filter((m) => m.page !== page);
  rawMatches.forEach((match) => {
    pidSymbolMatches.push({
      name: pidSymbolTemplate.name,
      page,
      ...matchToPct(match, pidSymbolTemplate, pidImage.naturalWidth, pidImage.naturalHeight),
    });
  });

  if (page != null) pidSymbolSearchedPages.add(page);
  renderSymbolMatchesList();
}

async function defineSymbolTemplate(name, rectPct) {
  if (!pidImage.naturalWidth) return;

  if (pidSymbolTemplate && pidSymbolTemplate.mat) {
    try {
      pidSymbolTemplate.mat.delete();
    } catch (error) {
      // Already released — nothing to do.
    }
  }

  const { mat, w, h } = cropRectPctToGrayMat(pidImage, pidImage.naturalWidth, pidImage.naturalHeight, rectPct);
  const thumbnailDataUrl = cropCanvasToDataUrl(pidImage, pidImage.naturalWidth, pidImage.naturalHeight, rectPct);

  pidSymbolTemplate = { name, mat, width: w, height: h, thumbnailDataUrl };
  pidSymbolMatches = [];
  pidSymbolSearchedPages.clear();
  pidSymbolSearchAllCancel = true;
  pidSymbolSearchAllRunning = false;
  pidSymbolSearchAllButton.textContent = "Search all pages";
  pidSymbolSearchAllButton.hidden = !(currentPdfDoc && currentPdfDoc.numPages > 1);

  setPidSymbolStatus(`Searching this page for "${name}"…`);
  await searchCurrentPageForSymbol();
  setPidSymbolStatus(
    `Found ${pidSymbolMatches.length} match(es) for "${name}" on this page.` +
      (currentPdfDoc && currentPdfDoc.numPages > 1 ? ' Click "Search all pages" for the rest of the document.' : ""),
    true
  );
}

pidSymbolSearchAllButton.addEventListener("click", async () => {
  if (pidSymbolSearchAllRunning) {
    pidSymbolSearchAllCancel = true;
    return;
  }
  if (!pidSymbolTemplate || !currentPdfDoc) return;

  pidSymbolSearchAllRunning = true;
  pidSymbolSearchAllCancel = false;
  pidSymbolSearchAllButton.textContent = "Cancel search";

  const numPages = currentPdfDoc.numPages;
  let foundCount = pidSymbolMatches.length;

  for (let p = 1; p <= numPages; p++) {
    if (pidSymbolSearchAllCancel) break;
    if (pidSymbolSearchedPages.has(p)) continue;

    setPidSymbolStatus(`Searching page ${p} of ${numPages} for "${pidSymbolTemplate.name}"…`);
    try {
      if (p === pidCurrentPdfPageNumber) {
        await searchCurrentPageForSymbol();
        foundCount = pidSymbolMatches.length;
      } else {
        const { canvas, width, height } = await renderPdfPageToOffscreenCanvas(p);
        const gray = toGrayMat(canvas);
        const rawMatches = findTemplateMatches(
          gray,
          pidSymbolTemplate,
          PID_SYMBOL_MATCH_THRESHOLD,
          PID_SYMBOL_MAX_MATCHES_PER_PAGE
        );
        gray.delete();

        rawMatches.forEach((match) => {
          pidSymbolMatches.push({
            name: pidSymbolTemplate.name,
            page: p,
            ...matchToPct(match, pidSymbolTemplate, width, height),
          });
          foundCount++;
        });
        pidSymbolSearchedPages.add(p);
        renderSymbolMatchesList();
      }
    } catch (error) {
      // Skip pages that fail to render/search; the rest of the sweep still continues.
    }
  }

  pidSymbolSearchAllRunning = false;
  pidSymbolSearchAllButton.textContent = "Search all pages";
  setPidSymbolStatus(
    pidSymbolSearchAllCancel
      ? `Search stopped. Found ${foundCount} match(es) so far.`
      : `Done — found ${foundCount} match(es) for "${pidSymbolTemplate.name}" across ${numPages} pages.`,
    true
  );
});

async function jumpToSymbolMatch(item) {
  if (currentPdfDoc && item.page !== null && item.page !== pidCurrentPdfPageNumber) {
    await renderPdfPage(item.page);
    renderHighlights();
  }
  flashMarkerAt(item.xPct + item.wPct / 2, item.yPct + item.hPct / 2);
}

function renderSymbolMatchesList() {
  pidSymbolsSection.hidden = pidCanvasWrapper.hidden;
  if (pidCanvasWrapper.hidden) return;

  const isPdf = !!currentPdfDoc;
  pidSymbolsPageHeader.hidden = !isPdf;
  pidSymbolSearchAllButton.hidden = !(isPdf && currentPdfDoc.numPages > 1 && pidSymbolTemplate);

  const items = pidSymbolMatches.slice().sort((a, b) => {
    const pa = a.page == null ? -1 : a.page;
    const pb = b.page == null ? -1 : b.page;
    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });

  pidSymbolsEmptyHint.hidden = items.length > 0;
  pidSymbolsTableEl.hidden = items.length === 0;

  pidSymbolsTableBody.innerHTML = "";

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "pid-items-row";
    tr.tabIndex = 0;
    tr.title = `${item.name} (${Math.round(item.score * 100)}% match) — click to open on the P&ID`;

    const snapTd = document.createElement("td");
    snapTd.className = "pid-items-snapshot-cell";
    const snapBox = document.createElement("div");
    snapBox.className = "pid-items-snapshot-box";
    const snapImg = document.createElement("img");
    snapImg.className = "pid-items-snapshot-img";
    snapImg.alt = item.name;
    if (pidSymbolTemplate) snapImg.src = pidSymbolTemplate.thumbnailDataUrl;
    snapBox.appendChild(snapImg);
    snapTd.appendChild(snapBox);
    tr.appendChild(snapTd);

    const nameTd = document.createElement("td");
    nameTd.className = "pid-items-tag-cell";
    nameTd.textContent = item.name;
    tr.appendChild(nameTd);

    if (isPdf) {
      const pageTd = document.createElement("td");
      pageTd.className = "pid-items-page-cell";
      pageTd.textContent = item.page != null ? item.page : "—";
      tr.appendChild(pageTd);
    }

    const openItem = () => jumpToSymbolMatch(item);
    tr.addEventListener("click", openItem);
    tr.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openItem();
      }
    });

    pidSymbolsTableBody.appendChild(tr);
  });
}

function resetSymbolSearchState() {
  if (pidSymbolTemplate && pidSymbolTemplate.mat) {
    try {
      pidSymbolTemplate.mat.delete();
    } catch (error) {
      // Already released — nothing to do.
    }
  }
  pidSymbolTemplate = null;
  pidSymbolMatches = [];
  pidSymbolSearchedPages.clear();
  pidSymbolSearchAllCancel = true;
  pidSymbolSearchAllRunning = false;
  pidSymbolSearchAllButton.textContent = "Search all pages";
  pidSymbolSearchAllButton.hidden = true;
  setPidSymbolStatus("");
  renderSymbolMatchesList();
}

if (!pidCvAvailable) {
  setPidSymbolStatus("Symbol search unavailable (image-matching engine failed to load).");
}

// ---- Special items table (snapshot + jump-to-location) ----

const PID_TAGGED_ITEM_TYPES = ["highlight", "note"];
const pidLocalSnapshotCache = new Map(); // highlight.id -> dataURL

async function getLocalHighlightSnapshot(page, highlight) {
  if (pidLocalSnapshotCache.has(highlight.id)) return pidLocalSnapshotCache.get(highlight.id);

  const rectPct = getSnapshotCropRectPct(highlight);
  let dataUrl = null;

  try {
    if (!currentPdfDoc || page === pidCurrentPdfPageNumber) {
      if (pidImage.naturalWidth) {
        dataUrl = cropCanvasToDataUrl(pidImage, pidImage.naturalWidth, pidImage.naturalHeight, rectPct);
      }
    } else {
      const { canvas, width, height } = await renderPdfPageToOffscreenCanvas(page);
      dataUrl = cropCanvasToDataUrl(canvas, width, height, rectPct);
    }
  } catch (error) {
    dataUrl = null;
  }

  if (dataUrl) pidLocalSnapshotCache.set(highlight.id, dataUrl);
  return dataUrl;
}

function collectAllTaggedItems() {
  const items = [];

  if (currentPdfDoc) {
    const pagesHighlights = pidData.pagesHighlights || {};
    Object.keys(pagesHighlights)
      .map((key) => parseInt(key, 10))
      .sort((a, b) => a - b)
      .forEach((page) => {
        (pagesHighlights[page] || []).forEach((highlight) => {
          if (PID_TAGGED_ITEM_TYPES.includes(highlight.type)) items.push({ page, highlight });
        });
      });
  } else {
    (pidData.highlights || []).forEach((highlight) => {
      if (PID_TAGGED_ITEM_TYPES.includes(highlight.type)) items.push({ page: null, highlight });
    });
  }

  return items;
}

async function jumpToTaggedItem(page, highlight) {
  if (currentPdfDoc && page !== null && page !== pidCurrentPdfPageNumber) {
    await renderPdfPage(page);
    renderHighlights();
  }
  flashAnnotationMatch(highlight.id);
}

function renderItemsTable() {
  pidItemsSection.hidden = pidCanvasWrapper.hidden;
  if (pidCanvasWrapper.hidden) return;

  const items = collectAllTaggedItems();
  pidItemsEmptyHint.hidden = items.length > 0;
  pidItemsTableEl.hidden = items.length === 0;

  pidItemsTableBody.innerHTML = "";

  items.forEach(({ page, highlight }) => {
    const tr = document.createElement("tr");
    tr.className = "pid-items-row";
    tr.tabIndex = 0;
    tr.title = highlight.title ? `${highlight.title} — click to open on the P&ID` : "Click to open on the P&ID";

    const openItem = () => jumpToTaggedItem(page, highlight);

    const snapTd = document.createElement("td");
    snapTd.className = "pid-items-snapshot-cell";

    const snapBox = document.createElement("div");
    snapBox.className = "pid-items-snapshot-box";

    const snapImg = document.createElement("img");
    snapImg.className = "pid-items-snapshot-img";
    snapImg.alt = highlight.title || "Snapshot";
    snapImg.hidden = true;
    snapBox.appendChild(snapImg);

    const jumpButton = document.createElement("button");
    jumpButton.type = "button";
    jumpButton.className = "pid-items-jump-button";
    jumpButton.innerHTML = "&#8599;";
    jumpButton.title = "Open this location on the P&ID";
    jumpButton.setAttribute("aria-label", "Open this location on the P&ID");
    jumpButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openItem();
    });
    snapBox.appendChild(jumpButton);

    snapTd.appendChild(snapBox);
    tr.appendChild(snapTd);

    getLocalHighlightSnapshot(page, highlight).then((dataUrl) => {
      if (!dataUrl) return;
      snapImg.src = dataUrl;
      snapImg.hidden = false;
    });

    const tagTd = document.createElement("td");
    tagTd.className = "pid-items-tag-cell";
    tagTd.textContent = highlight.title || "—";
    tr.appendChild(tagTd);

    const pageTd = document.createElement("td");
    pageTd.className = "pid-items-page-cell";
    pageTd.textContent = page != null ? page : "—";
    tr.appendChild(pageTd);

    tr.addEventListener("click", openItem);
    tr.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openItem();
      }
    });

    pidItemsTableBody.appendChild(tr);
  });
}

// ---- Backend sync (Postgres, via /api/pid) ----

function setPidCloudStatus(text, variant, autoHide) {
  pidCloudStatusEl.textContent = text;
  pidCloudStatusEl.hidden = !text;
  pidCloudStatusEl.classList.toggle("pid-cloud-status-ok", variant === "ok");
  pidCloudStatusEl.classList.toggle("pid-cloud-status-error", variant === "error");
  clearTimeout(pidCloudStatusTimer);
  if (autoHide) {
    pidCloudStatusTimer = setTimeout(() => {
      pidCloudStatusEl.hidden = true;
    }, 4000);
  }
}

function buildBackendHighlightsPayload() {
  if (currentPdfDoc) {
    const pagesHighlights = { ...(pidData.pagesHighlights || {}) };
    pagesHighlights[pidCurrentPdfPageNumber] = pidData.highlights;
    const flat = [];
    Object.keys(pagesHighlights).forEach((pageKey) => {
      (pagesHighlights[pageKey] || []).forEach((highlight) => {
        flat.push({ ...highlight, page: parseInt(pageKey, 10) });
      });
    });
    return flat;
  }
  return (pidData.highlights || []).map((highlight) => ({ ...highlight, page: 1 }));
}

function getBackendDocName() {
  if (pidData.backendName) return pidData.backendName;
  const name = pidOriginalFile ? pidOriginalFile.name : `P&ID ${new Date().toLocaleDateString()}`;
  pidData.backendName = name;
  return name;
}

function scheduleBackendSync() {
  clearTimeout(pidBackendSyncTimer);
  pidBackendSyncTimer = setTimeout(runBackendSync, 1500);
}

function dataUrlToBlob(dataUrl) {
  const mimeMatch = dataUrl.match(/^data:(.*?);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  return new Blob([dataUrlToUint8Array(dataUrl)], { type: mimeType });
}

function getPidUploadFile() {
  if (pidOriginalFile) return pidOriginalFile;

  // pidOriginalFile is a plain in-memory variable and doesn't survive a page reload — rebuild the
  // file to upload from whatever we do have persisted (pdfDataUrl / imageDataUrl) so a document
  // never gets created (or left permanently repaired) on the server without its actual file.
  if (pidData.pdfDataUrl) {
    return new File([dataUrlToBlob(pidData.pdfDataUrl)], `${getBackendDocName()}.pdf`, {
      type: "application/pdf",
    });
  }
  if (pidData.imageDataUrl) {
    const blob = dataUrlToBlob(pidData.imageDataUrl);
    const ext = (blob.type.split("/")[1] || "png").split("+")[0];
    return new File([blob], `${getBackendDocName()}.${ext}`, { type: blob.type || "image/png" });
  }
  return null;
}

// A highlight/note is a "Special Item" tag (mandatory Tag No. on the dialog means this is now
// true for every one created through it) and lives solely in special_item_tags — never in
// pid_documents.highlights. Shapes, freehand draws, text boxes, and stamps are never tagged and
// keep going through the JSONB as before.
function isTaggedHighlight(highlight) {
  return (highlight.type === "highlight" || highlight.type === "note") && !!(highlight.title || "").trim();
}

async function syncSpecialItemTagsToBackend(token) {
  const tags = buildBackendHighlightsPayload()
    .filter(isTaggedHighlight)
    .map((highlight) => {
      const details = highlight.details || {};
      return {
        highlightId: highlight.id,
        page: highlight.page,
        tagNumber: highlight.title,
        jobNumber: highlight.jobNumber || "",
        unitNumber: highlight.unitNumber || "",
        size: details.size || "",
        rating: details.rating || "",
        pipingSpec: details.pipingSpec || "",
        itemName: details.description || "",
        quantity: details.quantity || "",
        lineNumber: details.lineNumber || "",
        specialNote: details.specialNote || "",
        licensorRequirement: details.licensorNote || "",
        type: highlight.type,
        xPct: highlight.xPct,
        yPct: highlight.yPct,
        wPct: highlight.wPct,
        hPct: highlight.hPct,
        color: highlight.color || "",
        fontFamily: highlight.fontFamily || "",
        fontSize: highlight.fontSize || "",
        bold: !!highlight.bold,
        italic: !!highlight.italic,
        underline: !!highlight.underline,
      };
    });

  const response = await fetch("/api/special-item-tags/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pidDocumentId: pidData.backendId, tags }),
  });
  if (!response.ok) throw new Error(`Server responded with ${response.status}`);
}

async function runBackendSync() {
  if (pidBackendSyncRunning) {
    pidBackendSyncQueued = true;
    return;
  }
  if (!pidData.imageDataUrl) return;

  const token = simsGetAuthToken();
  if (!token) {
    setPidCloudStatus("Not logged in — saved locally only.", "error");
    return;
  }

  pidBackendSyncRunning = true;
  setPidCloudStatus("Saving to server…");

  try {
    const formData = new FormData();
    formData.append("name", getBackendDocName());
    // Tagged highlights are excluded here — they're saved exclusively to special_item_tags below,
    // not duplicated into this JSONB column.
    const untaggedHighlights = buildBackendHighlightsPayload().filter((highlight) => !isTaggedHighlight(highlight));
    formData.append("highlights", JSON.stringify(untaggedHighlights));

    const isCreate = !pidData.backendId;
    // Keep attaching the file until we know for sure the server has one — this also self-heals any
    // document that was previously created without a file (e.g. by this same bug before the fix).
    const needsFile = isCreate || !pidData.backendFileUploaded;
    const uploadFile = needsFile ? getPidUploadFile() : null;
    if (uploadFile) formData.append("file", uploadFile);

    const url = isCreate ? "/api/pid" : `/api/pid/${pidData.backendId}`;
    const response = await fetch(url, {
      method: isCreate ? "POST" : "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || `Server responded with ${response.status}`);
    }

    if (isCreate) pidData.backendId = payload.data.id;
    if (uploadFile) pidData.backendFileUploaded = true;

    if (pidData.backendId) {
      try {
        await syncSpecialItemTagsToBackend(token);
      } catch (error) {
        // Non-fatal: the P&ID document itself saved fine; the tag table just retries next sync.
      }
    }

    if (isCreate || uploadFile) {
      try {
        const db = await openPidDb();
        await pidDbPut(db, pidData);
      } catch (error) {
        // Non-fatal: this just gets re-derived/re-attempted on the next successful sync.
      }
    }

    const now = new Date();
    setPidCloudStatus(
      `Saved to server at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      "ok",
      true
    );
  } catch (error) {
    setPidCloudStatus(`Server save failed: ${error.message}`, "error");
  } finally {
    pidBackendSyncRunning = false;
    if (pidBackendSyncQueued) {
      pidBackendSyncQueued = false;
      runBackendSync();
    }
  }
}
