import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dataDirectory = join(root, "data");
const apiKey = process.env.JOOBLE_API_KEY;
const keywords = process.env.JOB_KEYWORDS || "motorista cajero ventas auxiliar remoto";

const countries = [
  ["sv", "El Salvador"], ["gt", "Guatemala"], ["hn", "Honduras"], ["mx", "México"],
  ["bz", "Belice"], ["cr", "Costa Rica"], ["pa", "Panamá"], ["co", "Colombia"],
  ["ve", "Venezuela"], ["ec", "Ecuador"], ["pe", "Perú"], ["bo", "Bolivia"],
  ["py", "Paraguay"], ["uy", "Uruguay"], ["ar", "Argentina"], ["cl", "Chile"],
  ["br", "Brasil"], ["do", "República Dominicana"], ["cu", "Cuba"]
];

if (!apiKey) {
  console.error("Falta JOOBLE_API_KEY; no se actualizarán los archivos existentes.");
  process.exit(1);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeType(job) {
  const value = `${text(job.type)} ${text(job.title)} ${text(job.snippet)}`.toLowerCase();
  if (value.includes("remot") || value.includes("home office") || value.includes("teletrabajo")) return "remoto";
  if (value.includes("híbr") || value.includes("hibrid")) return "hibrido";
  return value.includes("presencial") ? "presencial" : "";
}

function normalizeJob(job) {
  const source = text(job.link || job.url);
  const title = text(job.title);
  const company = text(job.company);
  const city = text(job.location || job.city);
  if (!title || !company || !source || !city) return null;
  return {
    title,
    company,
    city,
    type: normalizeType(job),
    whatsapp_link: "",
    source
  };
}

function deduplicate(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = [job.source, job.company, job.title, job.city].map((part) => part.toLowerCase()).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchCountry(code, country) {
  const response = await fetch(`https://jooble.org/api/${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, location: country, page: 1 })
  });
  if (!response.ok) throw new Error(`Jooble respondió HTTP ${response.status}`);
  const payload = await response.json();
  const jobs = Array.isArray(payload.jobs) ? deduplicate(payload.jobs.map(normalizeJob).filter(Boolean)) : [];
  if (!jobs.length) throw new Error("Jooble no devolvió empleos válidos");
  const temporaryPath = join(dataDirectory, `.${code}.json.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
  await rename(temporaryPath, join(dataDirectory, `${code}.json`));
  console.log(`${code}: ${jobs.length} empleos actualizados`);
}

await mkdir(dataDirectory, { recursive: true });
let failures = 0;
for (const [code, country] of countries) {
  try {
    await fetchCountry(code, country);
  } catch (error) {
    failures += 1;
    console.error(`${code}: ${error.message}; se conserva el archivo existente.`);
  }
}

if (failures === countries.length) {
  console.error("No se pudo actualizar ningún país; los datos existentes se conservaron.");
  process.exit(1);
}

try {
  await readFile(join(dataDirectory, "sv.json"), "utf8");
} catch {
  console.error("Falta data/sv.json después de la actualización.");
  process.exit(1);
}