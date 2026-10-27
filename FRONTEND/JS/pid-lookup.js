if (typeof pdfjsLib !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const PID_TAG_INDEX_CACHE_MS = 60000;
let pidTagIndexPromise = null;
let pidTagIndexBuiltAt = 0;

async function buildPidTagIndex() {
  const index = new Map();
  const token = simsGetAuthToken();
  if (!token) return { index, status: "not-logged-in" };

  try {
    const listResponse = await fetch("/api/pid", { headers: { Authorization: `Bearer ${token}` } });
    const listPayload = await listResponse.json().catch(() => null);
    if (!listResponse.ok || !listPayload || !listPayload.success) {
      return {
        index,
        status: "error",
        message: (listPayload && listPayload.message) || `Server responded with ${listResponse.status}`,
      };
    }

    const docs = listPayload.data || [];

    for (const doc of docs) {
      try {
        const detailResponse = await fetch(`/api/pid/${doc.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const detailPayload = await detailResponse.json().catch(() => null);
        if (!detailResponse.ok || !detailPayload || !detailPayload.success) continue;

        const docData = detailPayload.data;

        // Tagged highlights live in special_item_tags (not doc.highlights) — see pid.js's
        // convertSpecialItemTagToHighlight for the same reconstruction on the P&ID page itself.
        const taggedHighlights = (docData.specialItemTags || []).map((tag) => ({
          type: tag.type || "highlight",
          page: tag.page || 1,
          xPct: tag.xPct,
          yPct: tag.yPct,
          wPct: tag.wPct,
          hPct: tag.hPct,
          title: tag.tagNumber || "",
        }));

        [...(docData.highlights || []), ...taggedHighlights].forEach((highlight) => {
          const tag = (highlight.title || "").trim().toLowerCase();
          if (!tag || index.has(tag)) return; // list() is newest-first, so the first match wins
          index.set(tag, {
            docId: doc.id,
            docName: doc.name,
            page: highlight.page || 1,
            sourceType: docData.sourceType,
            storedFileName: docData.storedFileName,
            highlight,
          });
        });
      } catch (error) {
        // Skip documents we couldn't read; the rest of the index still builds.
      }
    }
  } catch (error) {
    return { index, status: "error", message: "Could not reach the server." };
  }

  return { index, status: "ok" };
}

function fetchPidTagIndex() {
  const now = Date.now();
  if (!pidTagIndexPromise || now - pidTagIndexBuiltAt > PID_TAG_INDEX_CACHE_MS) {
    pidTagIndexBuiltAt = now;
    pidTagIndexPromise = buildPidTagIndex();
  }
  return pidTagIndexPromise;
}

function pidJumpUrl(location, tag) {
  const params = new URLSearchParams();
  if (location.docId != null) params.set("docId", location.docId);
  if (location.page != null) params.set("page", location.page);
  if (tag) params.set("tag", tag);
  return `PID-HIGHLIGHTING.HTML?${params.toString()}`;
}

// ---- Snapshot cropping (shared with the P&ID page's own Special Items panel) ----

const PID_SNAPSHOT_MAX_SIZE = 160;

function getSnapshotCropRectPct(highlight) {
  if (highlight.type === "highlight" && highlight.wPct != null && highlight.hPct != null) {
    const padX = highlight.wPct * 0.18;
    const padY = highlight.hPct * 0.18;
    const xPct = Math.max(0, highlight.xPct - padX);
    const yPct = Math.max(0, highlight.yPct - padY);
    return {
      xPct,
      yPct,
      wPct: Math.min(100 - xPct, highlight.wPct + padX * 2),
      hPct: Math.min(100 - yPct, highlight.hPct + padY * 2),
    };
  }

  // Point-style annotation (e.g. a note icon): fixed-size window centered on the point.
  const half = 9;
  const xPct = Math.max(0, Math.min(100 - half * 2, highlight.xPct - half));
  const yPct = Math.max(0, Math.min(100 - half * 2, highlight.yPct - half));
  return { xPct, yPct, wPct: half * 2, hPct: half * 2 };
}

function cropCanvasToDataUrl(source, srcWidth, srcHeight, rectPct) {
  const sx = (rectPct.xPct / 100) * srcWidth;
  const sy = (rectPct.yPct / 100) * srcHeight;
  const sw = Math.max(1, (rectPct.wPct / 100) * srcWidth);
  const sh = Math.max(1, (rectPct.hPct / 100) * srcHeight);

  const aspect = sw / sh;
  let outW = PID_SNAPSHOT_MAX_SIZE;
  let outH = PID_SNAPSHOT_MAX_SIZE;
  if (aspect >= 1) outH = Math.round(PID_SNAPSHOT_MAX_SIZE / aspect);
  else outW = Math.round(PID_SNAPSHOT_MAX_SIZE * aspect);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, outW);
  canvas.height = Math.max(1, outH);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// ---- Remote page rendering (for Job Form / Item Details, which don't have the P&ID already open) ----

const pidRemotePageRenderCache = new Map(); // `${docId}:${page}` -> Promise<{source,width,height}>
const pidRemoteSnapshotCache = new Map(); // `${docId}:${highlightId}` -> dataURL

async function renderRemotePidPage(docId, page, sourceType, storedFileName) {
  const key = `${docId}:${page}`;
  if (pidRemotePageRenderCache.has(key)) return pidRemotePageRenderCache.get(key);

  const task = (async () => {
    if (!storedFileName) throw new Error("This P&ID has no stored file.");
    const fileUrl = `/uploads/pid/${storedFileName}`;

    if (sourceType === "pdf") {
      if (typeof pdfjsLib === "undefined") throw new Error("PDF renderer not available.");
      const arrayBuffer = await (await fetch(fileUrl)).arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pdfPage = await pdfDoc.getPage(page || 1);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const scale = 900 / Math.max(baseViewport.width, baseViewport.height);
      const viewport = pdfPage.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      return { source: canvas, width: viewport.width, height: viewport.height };
    }

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Could not load the image."));
      img.src = fileUrl;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  })();

  pidRemotePageRenderCache.set(key, task);
  task.catch(() => pidRemotePageRenderCache.delete(key)); // don't cache a broken render forever
  return task;
}

async function getRemoteSnapshotDataUrl(location) {
  if (!location || !location.highlight) return null;

  const cacheKey = `${location.docId}:${location.highlight.id}`;
  if (pidRemoteSnapshotCache.has(cacheKey)) return pidRemoteSnapshotCache.get(cacheKey);

  try {
    const { source, width, height } = await renderRemotePidPage(
      location.docId,
      location.page,
      location.sourceType,
      location.storedFileName
    );
    const dataUrl = cropCanvasToDataUrl(source, width, height, getSnapshotCropRectPct(location.highlight));
    pidRemoteSnapshotCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (error) {
    return null;
  }
}

// ---- Table cells ----

function buildPidSnapshotCell(tagNumber, tagIndexResult) {
  const { index, status, message } = tagIndexResult;

  const td = document.createElement("td");
  td.className = "pid-items-snapshot-cell";

  const box = document.createElement("div");
  box.className = "pid-items-snapshot-box";

  const img = document.createElement("img");
  img.className = "pid-items-snapshot-img";
  img.hidden = true;
  box.appendChild(img);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pid-items-jump-button";
  button.innerHTML = "&#8599;";

  const trimmedTag = (tagNumber || "").trim();
  const location = trimmedTag ? index.get(trimmedTag.toLowerCase()) : null;

  if (location) {
    img.alt = trimmedTag;
    button.title = `Open ${trimmedTag} on the P&ID (page ${location.page})`;
    button.addEventListener("click", () => {
      window.location.href = pidJumpUrl(location, trimmedTag);
    });
    getRemoteSnapshotDataUrl(location).then((dataUrl) => {
      if (!dataUrl) return;
      img.src = dataUrl;
      img.hidden = false;
    });
  } else {
    button.disabled = true;
    if (!trimmedTag) {
      button.title = "No Tag Number on this row";
    } else if (status === "not-logged-in") {
      button.title = "Log in to check for a matching P&ID tag";
    } else if (status === "error") {
      button.title = `Could not check P&ID matches: ${message}`;
    } else {
      button.title = `"${trimmedTag}" was not found tagged on any saved P&ID`;
    }
  }

  box.appendChild(button);
  td.appendChild(box);
  return { cell: td, location };
}

function buildPidPageCell(location, tagNumber, tagIndexResult) {
  const td = document.createElement("td");
  td.className = "pid-items-page-cell";

  const trimmedTag = (tagNumber || "").trim();

  if (location) {
    td.textContent = location.page;
  } else if (!trimmedTag) {
    td.textContent = "—";
  } else if (tagIndexResult.status === "not-logged-in") {
    td.textContent = "Log in";
    td.classList.add("pid-items-page-cell-muted");
  } else if (tagIndexResult.status === "error") {
    td.textContent = "Error";
    td.classList.add("pid-items-page-cell-muted");
  } else {
    td.textContent = "Not found";
    td.classList.add("pid-items-page-cell-muted");
  }

  return td;
}
