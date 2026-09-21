const countryData = [
  { code: "sv", name: "El Salvador", flag: "🇸🇻" }, { code: "gt", name: "Guatemala", flag: "🇬🇹" },
  { code: "hn", name: "Honduras", flag: "🇭🇳" }, { code: "mx", name: "México", flag: "🇲🇽" },
  { code: "bz", name: "Belice", flag: "🇧🇿" }, { code: "cr", name: "Costa Rica", flag: "🇨🇷" },
  { code: "pa", name: "Panamá", flag: "🇵🇦" }, { code: "co", name: "Colombia", flag: "🇨🇴" },
  { code: "ve", name: "Venezuela", flag: "🇻🇪" }, { code: "ec", name: "Ecuador", flag: "🇪🇨" },
  { code: "pe", name: "Perú", flag: "🇵🇪" }, { code: "bo", name: "Bolivia", flag: "🇧🇴" },
  { code: "py", name: "Paraguay", flag: "🇵🇾" }, { code: "uy", name: "Uruguay", flag: "🇺🇾" },
  { code: "ar", name: "Argentina", flag: "🇦🇷" }, { code: "cl", name: "Chile", flag: "🇨🇱" },
  { code: "br", name: "Brasil", flag: "🇧🇷" }, { code: "do", name: "R. Dominicana", flag: "🇩🇴" },
  { code: "cu", name: "Cuba", flag: "🇨🇺" }
];

const state = { jobs: [], country: "sv" };
const elements = {
  form: document.querySelector("#search-form"), country: document.querySelector("#country"),
  city: document.querySelector("#city"), keyword: document.querySelector("#keyword"),
  type: document.querySelector("#type"), list: document.querySelector("#job-list"),
  count: document.querySelector("#result-count"), grid: document.querySelector("#country-grid"),
  clear: document.querySelector("#clear-filters")
};

function renderCountries() {
  elements.grid.innerHTML = countryData.map((country) => `
    <button class="country-card${country.code === state.country ? " active" : ""}" type="button" data-country="${country.code}">
      <span class="country-flag" aria-hidden="true">${country.flag}</span><span class="country-name">${country.name}</span>
    </button>`).join("");
}

function formatDate(date) {
  if (!date) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(new Date(date));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  }[character]));
}

function renderJobs() {
  const city = elements.city.value.trim().toLowerCase();
  const keyword = elements.keyword.value.trim().toLowerCase();
  const type = elements.type.value;
  const jobs = state.jobs.filter((job) => {
    const searchable = `${job.title} ${job.company} ${job.city}`.toLowerCase();
    return (!city || job.city.toLowerCase().includes(city)) && (!keyword || searchable.includes(keyword)) && (!type || job.type === type);
  });
  elements.count.textContent = `${jobs.length} ${jobs.length === 1 ? "empleo encontrado" : "empleos encontrados"}`;
  elements.list.innerHTML = jobs.length ? jobs.map((job) => `
    <article class="job-card">
      <div><div class="job-top"><span class="job-type">${escapeHtml(job.type || "modalidad no indicada")}</span><span class="company">${escapeHtml(job.company)}</span></div>
      <h3>${escapeHtml(job.title)}</h3><p class="company">${escapeHtml(job.description || "Consulta los detalles de la oferta en la fuente original.")}</p>
      <div class="job-meta"><span>${escapeHtml(job.city)}</span><span>${escapeHtml(job.salary || "Salario no indicado")}</span></div></div>
      <div class="job-bottom"><span>Publicado ${formatDate(job.date)}</span><a class="apply-link" href="${escapeHtml(job.source || "#")}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${escapeHtml(job.title)}">Ver oferta &rarr;</a></div>
    </article>`).join("") : `<div class="empty-state">No encontramos empleos con esos filtros. Prueba otra ciudad o palabra clave.</div>`;
}

async function loadJobs(country = "sv") {
  state.country = country;
  renderCountries();
  elements.country.value = country;
  elements.count.textContent = "Cargando empleos...";
  try {
    const response = await fetch(`data/${country}.json`);
    if (!response.ok) throw new Error("Datos no disponibles");
    state.jobs = await response.json();
    renderJobs();
  } catch (error) {
    state.jobs = [];
    elements.count.textContent = "Sin datos todavía";
    elements.list.innerHTML = `<div class="empty-state">Aún no hay empleos publicados para este país. Estamos preparando nuevos datos.</div>`;
  }
}

elements.form.addEventListener("submit", (event) => { event.preventDefault(); renderJobs(); elements.list.scrollIntoView({ behavior: "smooth", block: "start" }); });
elements.country.addEventListener("change", (event) => loadJobs(event.target.value));
elements.grid.addEventListener("click", (event) => { const card = event.target.closest("[data-country]"); if (card) loadJobs(card.dataset.country); });
elements.clear.addEventListener("click", () => { elements.city.value = ""; elements.keyword.value = ""; elements.type.value = ""; renderJobs(); });
[elements.city, elements.keyword, elements.type].forEach((input) => input.addEventListener("input", renderJobs));

loadJobs();