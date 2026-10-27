const SIMS_STORAGE_KEY = "sims_records";

function simsGetRecords() {
  try {
    const raw = localStorage.getItem(SIMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function simsSaveRecord(record) {
  const records = simsGetRecords();
  records.push(record);
  localStorage.setItem(SIMS_STORAGE_KEY, JSON.stringify(records));
}

function simsUpsertRecord(record) {
  const records = simsGetRecords();
  const index = records.findIndex((existing) => existing.id === record.id);
  if (index === -1) {
    records.push(record);
  } else {
    records[index] = { ...records[index], ...record };
  }
  localStorage.setItem(SIMS_STORAGE_KEY, JSON.stringify(records));
}
