const els = {
  version: document.getElementById("version"),
  loadBundled: document.getElementById("load-bundled"),
  downloadCurrent: document.getElementById("download-current"),
  file: document.getElementById("template-file"),
  status: document.getElementById("status"),
  countryCount: document.getElementById("country-count"),
  travelCount: document.getElementById("travel-count"),
  sourceLabel: document.getElementById("source-label"),
  countryTable: document.getElementById("country-table"),
  travelTable: document.getElementById("travel-table"),
  emptyRow: document.getElementById("empty-row"),
};

let currentTemplate = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadVersion();
  bindEvents();
  renderTemplate(null);
});

function bindEvents() {
  els.loadBundled.addEventListener("click", loadBundledTemplate);
  els.downloadCurrent.addEventListener("click", exportCurrentTemplate);
  els.file.addEventListener("change", importTemplateFile);
}

async function loadVersion() {
  try {
    const response = await fetch("version.json", { cache: "no-store" });
    const manifest = await response.json();
    els.version.textContent = manifest.version || "1.0.0";
  } catch {
    els.version.textContent = "1.0.0";
  }
}

async function loadBundledTemplate() {
  const filename = "latest-grant-template.json";
  try {
    const response = await fetch(filename, { cache: "no-store" });
    if (!response.ok) throw new Error("Keine Vorlage gefunden");
    const payload = await response.json();
    setTemplate(payload, filename);
  } catch {
    setStatus("Keine erzeugte Vorlage im Modulordner gefunden. Erst `node fetch_grant_templates.js` ausführen.", true);
  }
}

async function importTemplateFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    setTemplate(payload, file.name);
  } catch {
    setStatus("Die Datei konnte nicht als JSON gelesen werden.", true);
  }
}

function setTemplate(payload, sourceName) {
  const normalized = normalizeTemplate(payload);
  if (!normalized.countryGrantRates.length || !normalized.travelGrantBands.length) {
    setStatus("Die Vorlage enthält keine gültigen Länder- oder Reisewerte.", true);
    return;
  }
  currentTemplate = {
    schema: "erasmus-plus-grant-template",
    schemaVersion: 1,
    exportedAt: payload.exportedAt || new Date().toISOString(),
    source: payload.source || sourceName,
    note: payload.note || "Exportiert aus Erasmus+ Satzimport Export.",
    countryGrantRates: normalized.countryGrantRates,
    travelGrantBands: normalized.travelGrantBands,
  };
  renderTemplate(currentTemplate);
  setStatus(`Vorlage geladen: ${sourceName}`);
}

function normalizeTemplate(payload = {}) {
  return {
    countryGrantRates: normalizeCountryRates(payload.countryGrantRates),
    travelGrantBands: normalizeTravelBands(payload.travelGrantBands),
  };
}

function normalizeCountryRates(items = []) {
  return items
    .map((item) => ({
      country: String(item.country || "").trim(),
      group: Number(item.group || 0),
      dailyMin: Number(item.dailyMin || item.dailyRate || 0),
      dailyMax: Number(item.dailyMax || item.dailyRate || 0),
      dailyRate: Number(item.dailyRate || item.dailyMax || 0),
    }))
    .filter((item) => item.country && item.group && item.dailyRate > 0)
    .sort((a, b) => a.country.localeCompare(b.country, "de"));
}

function normalizeTravelBands(items = []) {
  return items
    .map((item) => ({
      id: String(item.id || "").trim(),
      label: String(item.label || item.id || "").trim(),
      standard: Number(item.standard || 0),
      green: Number(item.green || 0),
    }))
    .filter((item) => item.id && item.label && item.standard > 0 && item.green > 0);
}

function renderTemplate(template) {
  els.countryCount.textContent = template?.countryGrantRates.length || 0;
  els.travelCount.textContent = template?.travelGrantBands.length || 0;
  els.sourceLabel.textContent = template?.source ? shortSource(template.source) : "-";

  renderTable(els.countryTable, ["Land", "Gruppe", "Min.", "Max.", "Tageswert"], (template?.countryGrantRates || []).map((rate) => [
    escapeHTML(rate.country),
    `Gruppe ${rate.group}`,
    money(rate.dailyMin),
    money(rate.dailyMax),
    money(rate.dailyRate),
  ]));

  renderTable(els.travelTable, ["Distanz", "Standard", "Green Travel"], (template?.travelGrantBands || []).map((band) => [
    escapeHTML(band.label),
    money(band.standard),
    money(band.green),
  ]));
}

function renderTable(table, headers, rows) {
  if (!rows.length) {
    table.innerHTML = els.emptyRow.innerHTML;
    return;
  }
  table.innerHTML = `
    <thead><tr>${headers.map((header) => `<th>${escapeHTML(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
  `;
}

function exportCurrentTemplate() {
  if (!currentTemplate) {
    setStatus("Bitte erst eine Vorlage laden.", true);
    return;
  }
  const payload = { ...currentTemplate, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `erasmus-plus-foerderpauschalen-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Vorlage exportiert.");
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("is-error", isError);
}

function shortSource(source) {
  return source.length > 64 ? `${source.slice(0, 61)}...` : source;
}

function money(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}
