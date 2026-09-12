const { writeFileSync } = require("fs");
const { join } = require("path");

const SOURCE_URL = "https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-1/mobility-school";
const PAD_URL = "https://erasmusplus.schule/service-und-unterstuetzung/unterstuetzung-im-programm/dokumentencenter";

const COUNTRY_GROUPS = [
  {
    group: 1,
    dailyMin: 48,
    dailyMax: 85,
    countries: ["Österreich", "Belgien", "Dänemark", "Finnland", "Frankreich", "Deutschland", "Island", "Italien", "Liechtenstein", "Luxemburg", "Niederlande", "Norwegen", "Schweden"],
  },
  {
    group: 2,
    dailyMin: 41,
    dailyMax: 74,
    countries: ["Zypern", "Tschechien", "Estland", "Griechenland", "Lettland", "Malta", "Portugal", "Slowakei", "Slowenien", "Spanien"],
  },
  {
    group: 3,
    dailyMin: 36,
    dailyMax: 64,
    countries: ["Bulgarien", "Kroatien", "Ungarn", "Polen", "Rumänien", "Serbien", "Nordmazedonien", "Türkei"],
  },
];

const FALLBACK_TRAVEL_BANDS = [
  { id: "10-99", label: "10-99 km", green: 56, standard: 28 },
  { id: "100-499", label: "100-499 km", green: 285, standard: 211 },
  { id: "500-1999", label: "500-1999 km", green: 417, standard: 309 },
  { id: "2000-2999", label: "2000-2999 km", green: 535, standard: 395 },
  { id: "3000-3999", label: "3000-3999 km", green: 785, standard: 580 },
  { id: "4000-7999", label: "4000-7999 km", green: 1180, standard: 1180 },
  { id: "8000+", label: "8000 km oder mehr", green: 1735, standard: 1735 },
];

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEuroNumber(value) {
  const match = String(value).replace(/\./g, "").match(/\d+(?:,\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : 0;
}

function extractTravelBands(html) {
  const text = stripTags(html);
  const rows = [
    ["10-99", "10 - 99 km"],
    ["100-499", "100 - 499 km"],
    ["500-1999", "500 - 1999 km"],
    ["2000-2999", "2000 - 2999 km"],
    ["3000-3999", "3000 - 3999 km"],
    ["4000-7999", "4000 - 7999 km"],
    ["8000+", "8000 km or more"],
  ];

  return rows.map(([id, label]) => {
    const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${safeLabel}\\s+([0-9.,]+)\\s+EUR\\s+([0-9.,]+)\\s+EUR`, "i"));
    if (!match) return FALLBACK_TRAVEL_BANDS.find((band) => band.id === id);
    return {
      id,
      label: id === "8000+" ? "8000 km oder mehr" : label.replaceAll(" - ", "-"),
      green: parseEuroNumber(match[1]),
      standard: parseEuroNumber(match[2]),
    };
  }).filter(Boolean);
}

function buildCountryGrantRates() {
  return COUNTRY_GROUPS.flatMap((group) => group.countries.map((country) => ({
    country,
    group: group.group,
    dailyMin: group.dailyMin,
    dailyMax: group.dailyMax,
    dailyRate: group.dailyMax,
  }))).sort((a, b) => a.country.localeCompare(b.country, "de"));
}

async function main() {
  const response = await fetch(SOURCE_URL, { headers: { "user-agent": "erasmus-plus-management-template-tool/1.0" } });
  if (!response.ok) throw new Error(`Quelle konnte nicht geladen werden: ${response.status} ${response.statusText}`);
  const html = await response.text();
  const travelGrantBands = extractTravelBands(html);
  const payload = {
    schema: "erasmus-plus-grant-template",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: `Erasmus+ Programme Guide: ${SOURCE_URL}; PAD Dokumentencenter: ${PAD_URL}`,
    note: "Importdatei fuer den Admin-Bereich der lokalen Erasmus+ Management-App. Tageswerte nutzen den oberen Wert der offiziellen Spannbreiten und bleiben in der App bearbeitbar.",
    countryGrantRates: buildCountryGrantRates(),
    travelGrantBands,
  };
  const filename = `erasmus-plus-foerderpauschalen-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(payload, null, 2);
  writeFileSync(join(__dirname, filename), json, "utf8");
  writeFileSync(join(__dirname, "latest-grant-template.json"), json, "utf8");
  console.log(`Vorlage geschrieben: ${filename}`);
  console.log("Aktuelle Vorlage geschrieben: latest-grant-template.json");
  console.log(`Laender: ${payload.countryGrantRates.length}, Reise-Distanzbaender: ${payload.travelGrantBands.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
