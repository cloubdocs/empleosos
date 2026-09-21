const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDirectory = path.join(root, "data");
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
  console.error("Falta JOOBLE_API_KEY; se conservan los datos existentes.");
  process.exit(1);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeType(job) {
  const searchable = `${text(job.type)} ${text(job.title)} ${text(job.snippet)}`.toLowerCase();
  if (/remot|home office|teletrabajo/.test(searchable)) return "remoto";
  if (/híbr|hibrid/.test(searchable)) return "hibrido";
  if (searchable.includes("presencial")) return "presencial";
  return "";
}

function normalizeJob(job) {
  const source = text(job.link || job.url);
  const title = text(job.title);
  const company = text(job.company);
  const city = text(job.location || job.city);
  if (!title || !company || !city || !source) return null;
  return { title, company, city, type: normalizeType(job), whatsapp_link: "", source };
}

function deduplicate(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = [job.source, job.company, job.title, job.city]
      .map((part) => part.toLowerCase().replace(/\s+/g, " ").trim())
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function updateCountry(code, country) {
  const response = await fetch(`https://jooble.org/api/${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, location: country, page: 1 })
  });
  if (!response.ok) throw new Error(`Jooble respondió HTTP ${response.status}`);

  const payload = await response.json();
  const jobs = Array.isArray(payload.jobs)
    ? deduplicate(payload.jobs.map(normalizeJob).filter(Boolean))
    : [];
  if (jobs.length === 0) throw new Error("no devolvió empleos válidos");

  const temporaryFile = path.join(dataDirectory, `.${code}.json.tmp`);
  const targetFile = path.join(dataDirectory, `${code}.json`);
  await fs.writeFile(temporaryFile, `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, targetFile);
  console.log(`${code}: ${jobs.length} empleos actualizados`);
}

async function main() {
  await fs.mkdir(dataDirectory, { recursive: true });
  let failures = 0;

  for (const [code, country] of countries) {
    try {
      await updateCountry(code, country);
    } catch (error) {
      failures += 1;
      console.error(`${code}: ${error.message}; se conserva el archivo existente.`);
    }
  }

  if (failures === countries.length) {
    throw new Error("No se pudo actualizar ningún país; los datos existentes se conservaron.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});