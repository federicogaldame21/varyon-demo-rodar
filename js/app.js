/* RODAR — demo navegable de un marketplace de autos usados.
   Sin backend: catálogo, favoritos, reservas y cotizaciones viven en localStorage. */

const CASO_URL = "https://varyon.com.ar/";   // cambiar por la URL del caso de estudio
const KEY = "rodar-demo-v1";
const KEY_VISTA = "rodar-demo-vista";
const ANIO_ACTUAL = new Date().getFullYear();

/* ---------------- Estado ---------------- */
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.version === 2) return s; } catch (e) {}
  return crearDatosIniciales();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function loadVista() { try { return localStorage.getItem(KEY_VISTA) || "escritorio"; } catch (e) { return "escritorio"; } }

let S = load();
const filtrosVacios = () => ({ q: "", marcas: [], carrocerias: [], precioMax: "", anioMin: "", kmMax: "", trans: "", orden: "relevancia" });
const ventaVacia = () => ({ paso: 1, marca: "", modelo: "", anio: "", km: "", estado: "bueno", elegido: "inmediata", sede: SEDES[0], fecha: "", franja: "Mañana", nombre: "", tel: "", err: null });
const UI = {
  vista: loadVista(),
  ruta: "comprar",
  autoId: null,
  f: filtrosVacios(),
  filtrosAbiertos: false,
  fin: { anticipo: 40, plazo: 48 },
  venta: ventaVacia(),
  tabCuenta: "reservas",
  modal: null,
  m: {},
};

/* ---------------- Utilidades ---------------- */
const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const $$ = (n) => "$ " + nf.format(Math.round(n || 0));
const kmf = (n) => nf.format(n) + " km";
const num = (v) => { const n = Number(String(v ?? "").replace(/[^\d.]/g, "")); return isFinite(n) ? n : 0; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const AUTO = (id) => S.autos.find((a) => a.id === id);
const nombreAuto = (a) => `${a.marca} ${a.modelo}`;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const pad = (n) => String(n).padStart(2, "0");
const fdia = (ts) => { const d = new Date(ts); return `${DIAS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
function proximosDias(n) {
  const out = [];
  const d = new Date(); d.setHours(10, 0, 0, 0);
  while (out.length < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) out.push(d.getTime()); }
  return out;
}
function opt(v, l, sel) { return `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(l)}</option>`; }

/* ---------------- Reglas ---------------- */
function cuota(monto, meses) {
  const i = CONFIG.tna / 12;
  return monto * i / (1 - Math.pow(1 + i, -meses));
}
const precioFinal = (a) => a.precio;
const cuotaDesde = (a) => cuota(precioFinal(a) * 0.6, 48);

function valorMercado(v) {
  const m = MODELOS[v.marca]?.[v.modelo];
  if (!m) return 0;
  const edad = Math.max(0, ANIO_ACTUAL - num(v.anio));
  const esperado = edad * 15000;
  const kmFactor = Math.min(1.06, Math.max(0.82, 1 - (num(v.km) - esperado) * 0.0000015));
  const cond = { excelente: 1, bueno: 0.95, detalles: 0.86 }[v.estado] || 0.95;
  return Math.round((m.base * Math.pow(0.91, edad) * kmFactor * cond) / 10000) * 10000;
}

function autosFiltrados() {
  const f = UI.f;
  const q = f.q.trim().toLowerCase();
  let l = S.autos.filter((a) => {
    if (q && !`${a.marca} ${a.modelo} ${a.version}`.toLowerCase().includes(q)) return false;
    if (f.marcas.length && !f.marcas.includes(a.marca)) return false;
    if (f.carrocerias.length && !f.carrocerias.includes(a.carroceria)) return false;
    if (f.precioMax && precioFinal(a) > num(f.precioMax)) return false;
    if (f.anioMin && a.anio < num(f.anioMin)) return false;
    if (f.kmMax && a.km > num(f.kmMax)) return false;
    if (f.trans && a.transmision !== f.trans) return false;
    return true;
  });
  const ord = {
    relevancia: (a, b) => (a.estado === "reservado") - (b.estado === "reservado") || (b.rebaja > 0) - (a.rebaja > 0) || b.anio - a.anio,
    menor: (a, b) => precioFinal(a) - precioFinal(b),
    mayor: (a, b) => precioFinal(b) - precioFinal(a),
    km: (a, b) => a.km - b.km,
    nuevo: (a, b) => b.anio - a.anio,
  }[f.orden];
  return l.sort(ord);
}
function filtrosActivos() {
  const f = UI.f;
  return f.marcas.length + f.carrocerias.length + (f.precioMax ? 1 : 0) + (f.anioMin ? 1 : 0) + (f.kmMax ? 1 : 0) + (f.trans ? 1 : 0);
}

/* ---------------- Ilustración del auto (genérica, sin marca) ---------------- */
const FORMAS = {
  hatch: { body: "M20 100 L20 82 Q22 71 40 69 L96 63 L130 39 Q138 33 150 33 L214 33 Q227 33 235 41 L262 66 L289 71 Q302 74 302 88 L302 100 Z", win: "M104 62 L134 41 Q140 37 149 37 L211 37 Q221 37 228 44 L251 63 Z", ruedas: [82, 244], puerta: 182 },
  sedan: { body: "M16 100 L16 84 Q18 73 36 71 L100 64 L134 39 Q142 33 154 33 L206 33 Q218 33 226 41 L250 64 L292 70 Q305 73 305 87 L305 100 Z", win: "M108 63 L138 41 Q144 37 153 37 L203 37 Q213 37 220 44 L239 63 Z", ruedas: [80, 252], puerta: 180 },
  suv: { body: "M18 100 L18 76 Q20 63 38 61 L88 57 L112 30 Q118 24 128 24 L230 24 Q243 24 251 32 L276 59 L293 63 Q304 66 304 80 L304 100 Z", win: "M98 56 L117 33 Q122 28 130 28 L227 28 Q237 28 243 35 L265 57 Z", ruedas: [80, 250], puerta: 178 },
  pickup: { body: "M14 100 L14 72 Q16 62 32 60 L80 56 L104 30 Q110 24 120 24 L172 24 Q182 24 186 32 L192 57 L300 57 Q307 57 307 65 L307 100 Z", win: "M108 55 L124 32 Q128 28 135 28 L170 28 Q177 28 180 34 L186 55 Z", ruedas: [74, 256], puerta: 146 },
};
function autoSVG(a, cls = "") {
  if (a.foto) return `<img class="foto ${cls}" src="${a.foto}" alt="${esc(nombreAuto(a))} ${COLORES[a.color].nombre.toLowerCase()}" loading="lazy" style="object-position:${a.fotoPos}">`;
  return autoIlus(a, cls);
}
function autoIlus(a, cls = "") {
  const f = FORMAS[a.carroceria];
  const c = COLORES[a.color].hex;
  const rueda = (x) => `<g><circle cx="${x}" cy="102" r="21" fill="#1d2027"/><circle cx="${x}" cy="102" r="11" fill="#d7d9e0"/><circle cx="${x}" cy="102" r="4" fill="#9a9fab"/></g>`;
  return `<svg class="${cls}" viewBox="0 0 320 136" role="img" aria-label="Ilustración de ${esc(nombreAuto(a))}">
    <ellipse cx="162" cy="124" rx="140" ry="8" fill="#000" opacity=".08"/>
    <path d="${f.body}" fill="${c}" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/>
    <path d="${f.win}" fill="#2b3245" opacity=".88"/>
    <line x1="${f.puerta}" y1="${a.carroceria === "pickup" ? 30 : 38}" x2="${f.puerta}" y2="98" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/>
    <rect x="${a.carroceria === "pickup" ? 296 : 291}" y="76" width="10" height="6" rx="2" fill="#ffd970"/>
    <rect x="${a.carroceria === "pickup" ? 15 : 19}" y="78" width="6" height="8" rx="2" fill="#d8453b"/>
    ${rueda(f.ruedas[0])}${rueda(f.ruedas[1])}
  </svg>`;
}
const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#5b3df5"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" stroke-width="3.2"/><circle cx="16" cy="16" r="2.6" fill="#c6f432"/></svg>`;
const HEART = (on) => `<svg viewBox="0 0 24 24" fill="${on ? "#5b3df5" : "none"}" stroke="${on ? "#5b3df5" : "#11131a"}" stroke-width="2"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.3 5 6.7 5c2 0 3.5 1.1 5.3 3 1.8-1.9 3.3-3 5.3-3 3.4 0 5.7 3.3 4.2 6.8C19.5 16.4 12 21 12 21z"/></svg>`;
const ICON = {
  comprar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  vender: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 3 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3"/></svg>`,
  cuenta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>`,
};

/* ---------------- Encabezado ---------------- */
function vTop() {
  const r = UI.ruta === "auto" ? "comprar" : UI.ruta;
  const nb = (id, l) => `<button data-act="ir" data-v="${id}" aria-current="${r === id}">${l}</button>`;
  const res = S.reservas.filter((x) => x.estado === "activa").length;
  return `<header class="topbar">
    <button class="logo" data-act="ir" data-v="comprar" aria-label="RODAR, inicio">${LOGO}<span>rodar</span></button>
    <nav class="nav">${nb("comprar", "Comprar")}${nb("vender", "Vender mi auto")}${nb("cuenta", "Mi cuenta")}</nav>
    <div class="right">
      <button class="btn sm ghost hide-narrow" data-act="cuentaTab" data-v="favoritos">${HEART(S.favoritos.length > 0)} Favoritos<span class="fav-count">${S.favoritos.length}</span></button>
      ${res ? `<span class="badge b-res hide-narrow">${res} reserva${res > 1 ? "s" : ""}</span>` : ""}
    </div>
  </header>`;
}
function vTabbar() {
  const r = UI.ruta === "auto" ? "comprar" : UI.ruta;
  const t = (id, l) => `<button data-act="ir" data-v="${id}" aria-current="${r === id}">${ICON[id]}<span>${l}</span></button>`;
  return `<nav class="tabbar">${t("comprar", "Comprar")}${t("vender", "Vender")}${t("cuenta", "Mi cuenta")}</nav>`;
}

/* ---------------- Comprar ---------------- */
function vComprar() {
  const f = UI.f;
  const lista = autosFiltrados();
  const marcas = [...new Set(S.autos.map((a) => a.marca))].sort();
  const chip = (grupo, v, l) => `<button class="chip" data-act="toggleF" data-g="${grupo}" data-v="${esc(v)}" aria-pressed="${f[grupo].includes(v)}">${esc(l)}</button>`;
  const n = filtrosActivos();
  return `
  <section class="hero">
    <div>
      <h1>Usados revisados, con precio claro y <em>sin vueltas</em>.</h1>
      <p>Cada auto pasa por una inspección de 150 puntos, tiene el informe de dominio al día y te lo entregamos transferido.</p>
      <form class="search" data-act-submit="buscar"><input type="search" placeholder="Buscá marca o modelo: Cronos, Hilux, 208…" data-bind="f.q" value="${esc(f.q)}" aria-label="Buscar"><button class="btn primary" type="submit">Buscar</button></form>
    </div>
    <div class="props">
      <div class="prop"><b>150 puntos</b><span>de inspección mecánica y estética</span></div>
      <div class="prop"><b>7 días</b><span>para devolverlo si no te convence</span></div>
      <div class="prop"><b>Transferencia incluida</b><span>nos ocupamos de los trámites</span></div>
      <div class="prop"><b>Cuotas fijas</b><span>simulás la financiación en la ficha</span></div>
    </div>
  </section>
  <div class="catalog">
    <aside class="filters ${UI.filtrosAbiertos ? "open" : ""}">
      <h4>Marca</h4><div class="chips">${marcas.map((m) => chip("marcas", m, m)).join("")}</div>
      <h4>Carrocería</h4><div class="chips">${Object.entries(CARROCERIAS).map(([k, l]) => chip("carrocerias", k, l)).join("")}</div>
      <h4>Precio máximo</h4>
      <div class="field"><select data-bind="f.precioMax" data-rr>${opt("", "Sin límite", f.precioMax)}${[15e6, 20e6, 25e6, 30e6, 40e6].map((v) => opt(v, "Hasta " + $$(v), f.precioMax)).join("")}</select></div>
      <div class="row2">
        <div class="field"><label>Año desde</label><select data-bind="f.anioMin" data-rr>${opt("", "Todos", f.anioMin)}${[2018, 2019, 2020, 2021, 2022].map((v) => opt(v, v, f.anioMin)).join("")}</select></div>
        <div class="field"><label>Km hasta</label><select data-bind="f.kmMax" data-rr>${opt("", "Todos", f.kmMax)}${[30000, 50000, 70000, 100000].map((v) => opt(v, nf.format(v), f.kmMax)).join("")}</select></div>
      </div>
      <h4>Transmisión</h4>
      <div class="chips"><button class="chip" data-act="setF" data-k="trans" data-v="" aria-pressed="${!f.trans}">Todas</button><button class="chip" data-act="setF" data-k="trans" data-v="manual" aria-pressed="${f.trans === "manual"}">Manual</button><button class="chip" data-act="setF" data-k="trans" data-v="automatica" aria-pressed="${f.trans === "automatica"}">Automática</button></div>
      ${n ? `<button class="btn sm block" style="margin-top:16px" data-act="limpiarF">Limpiar filtros (${n})</button>` : ""}
    </aside>
    <section>
      <div class="results-head">
        <div><b>${lista.length} ${lista.length === 1 ? "auto" : "autos"}</b> <span class="hint">disponibles para ver y probar</span></div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn sm filters-toggle" data-act="toggleFiltros">${UI.filtrosAbiertos ? "Ocultar filtros" : "Filtros"}${n ? ` (${n})` : ""}</button>
          <select data-bind="f.orden" data-rr aria-label="Ordenar">${[["relevancia", "Más relevantes"], ["menor", "Menor precio"], ["mayor", "Mayor precio"], ["km", "Menos kilómetros"], ["nuevo", "Más nuevos"]].map(([v, l]) => opt(v, l, f.orden)).join("")}</select>
        </div>
      </div>
      ${lista.length ? `<div class="grid">${lista.map(cardAuto).join("")}</div>` : `<div class="empty">No hay autos con esos filtros. <button class="btn sm" data-act="limpiarF">Limpiar filtros</button></div>`}
    </section>
  </div>`;
}

function cardAuto(a) {
  const fav = S.favoritos.includes(a.id);
  const res = a.estado === "reservado";
  return `<article class="car ${res ? "reservado" : ""}" data-act="verAuto" data-id="${a.id}" tabindex="0" aria-label="${esc(nombreAuto(a))} ${a.anio}">
    <div class="pic">${autoSVG(a)}
      <div class="badges">${res ? '<span class="badge b-res">Reservado</span>' : '<span class="badge b-check">✓ Inspeccionado</span>'}${a.rebaja && !res ? '<span class="badge b-deal">Bajó de precio</span>' : ""}</div>
      <button class="fav" data-act="fav" data-id="${a.id}" aria-label="${fav ? "Quitar de" : "Agregar a"} favoritos">${HEART(fav)}</button>
    </div>
    <div class="body">
      <div class="t">${esc(nombreAuto(a))}</div>
      <div class="v">${esc(a.version)}</div>
      <div class="meta"><span>${a.anio}</span><span>${kmf(a.km)}</span><span>${a.transmision === "automatica" ? "Automática" : "Manual"}</span><span>${esc(a.sede)}</span></div>
      ${a.rebaja ? `<div class="old money">${$$(a.precio + a.rebaja)}</div>` : ""}
      <div class="price money">${$$(precioFinal(a))}</div>
      <div class="cuota">o 48 cuotas desde ${$$(cuotaDesde(a))}</div>
    </div>
  </article>`;
}

/* ---------------- Ficha ---------------- */
function vAuto() {
  const a = AUTO(UI.autoId);
  if (!a) return `<div class="empty">Ese auto ya no está publicado. <button class="btn sm" data-act="ir" data-v="comprar">Ver catálogo</button></div>`;
  const fav = S.favoritos.includes(a.id);
  const res = a.estado === "reservado";
  const miReserva = S.reservas.find((r) => r.autoId === a.id && r.estado === "activa");
  const anticipo = Math.round(precioFinal(a) * UI.fin.anticipo / 100);
  const financiado = precioFinal(a) - anticipo;
  const c = cuota(financiado, UI.fin.plazo);
  const insp = [["Motor y transmisión", 34], ["Frenos y suspensión", 22], ["Electricidad y electrónica", 24], ["Carrocería y pintura", 30], ["Interior y confort", 22], ["Prueba de manejo", 18]];
  return `
  <div class="crumbs"><button data-act="ir" data-v="comprar">← Volver al catálogo</button> · ${esc(a.marca)} · ${esc(a.modelo)}</div>
  <div class="detail">
    <div class="col-main">
      <div class="gal-wrap"><div class="gallery">${autoSVG(a)}<div class="badges">${res ? '<span class="badge b-res">Reservado</span>' : '<span class="badge b-check">✓ Inspeccionado 150 puntos</span>'}</div></div>
      <p class="hint" style="margin-top:8px">Color ${COLORES[a.color].nombre.toLowerCase()} · ubicado en ${esc(a.sede)}</p></div>
      <div class="card" style="margin-top:14px">
        <h3>Datos principales</h3>
        <div class="specs">
          <div class="spec"><span>Año</span><b>${a.anio}</b></div>
          <div class="spec"><span>Kilómetros</span><b>${kmf(a.km)}</b></div>
          <div class="spec"><span>Transmisión</span><b>${a.transmision === "automatica" ? "Automática" : "Manual"}</b></div>
          <div class="spec"><span>Combustible</span><b>${a.combustible === "diesel" ? "Diésel" : "Nafta"}</b></div>
          <div class="spec"><span>Carrocería</span><b>${CARROCERIAS[a.carroceria]}</b></div>
          <div class="spec"><span>Dueños</span><b>${a.duenios}</b></div>
          <div class="spec"><span>Service</span><b>${a.serviceOficial ? "Oficial" : "Particular"}</b></div>
          <div class="spec"><span>Dominio</span><b>Sin deudas</b></div>
        </div>
      </div>
      <div class="card">
        <h3>Inspección de 150 puntos</h3>
        <div class="insp">${insp.map(([n, p]) => `<div class="it"><span>${n}</span><b>${p}/${p} ✓</b></div>`).join("")}</div>
        <p class="hint" style="margin-top:12px">Reparado antes de publicar: ${a.observaciones.map(esc).join(" · ")}.</p>
      </div>
      <div class="card">
        <h3>Qué incluye</h3>
        <div class="trust">
          <div><i>3</i>Garantía mecánica de 3 meses</div>
          <div><i>7</i>Siete días para devolverlo si no te convence</div>
          <div><i>✓</i>Informe de dominio y multas verificados</div>
          <div><i>→</i>Te lo entregamos transferido a tu nombre</div>
        </div>
      </div>
    </div>
    <aside class="buybox">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div><h2 style="font-size:22px">${esc(nombreAuto(a))}</h2><div class="hint">${esc(a.version)} · ${a.anio} · ${kmf(a.km)}</div></div>
          <button class="btn sm ghost" data-act="fav" data-id="${a.id}" aria-label="Favorito">${HEART(fav)}</button>
        </div>
        ${a.rebaja ? `<div class="hint money" style="margin-top:12px;text-decoration:line-through">${$$(a.precio + a.rebaja)}</div>` : '<div style="height:12px"></div>'}
        <div class="price money">${$$(precioFinal(a))}</div>
        ${a.rebaja ? `<span class="badge b-deal" style="margin-top:6px">Bajó ${$$(a.rebaja)}</span>` : ""}
        <h3 style="margin:18px 0 8px">Simulá tu financiación</h3>
        <div class="field"><label>Anticipo: ${UI.fin.anticipo} % · <span class="money">${$$(anticipo)}</span></label>
          <input class="slider" type="range" min="${CONFIG.anticipoMin * 100}" max="90" step="5" value="${UI.fin.anticipo}" data-bind="fin.anticipo" data-live aria-label="Anticipo"></div>
        <div class="plazos" role="group" aria-label="Plazo">${CONFIG.plazos.map((p) => `<button data-act="plazo" data-v="${p}" aria-pressed="${UI.fin.plazo === p}">${p}</button>`).join("")}</div>
        <div class="cuota-big"><div class="hint">${UI.fin.plazo} cuotas fijas de</div><b class="money">${$$(c)}</b><div class="hint">Financiás ${$$(financiado)} · TNA de referencia ${Math.round(CONFIG.tna * 100)} % · sujeto a aprobación</div></div>
        <div style="display:grid;gap:8px;margin-top:14px">
          ${miReserva ? `<div class="alert ok">Lo reservaste. Visita: ${fdia(miReserva.fecha)} en ${esc(miReserva.sede)} · código ${miReserva.id}</div>` : ""}
          <button class="btn primary block" data-act="modal" data-type="reservar" data-id="${a.id}" ${res ? "disabled" : ""}>${res ? "Reservado" : `Reservar con ${$$(CONFIG.sena)}`}</button>
          <button class="btn block" data-act="modal" data-type="visita" data-id="${a.id}" ${res && !miReserva ? "disabled" : ""}>Agendar prueba de manejo</button>
        </div>
        <p class="hint" style="margin-top:10px">La seña es reembolsable y aparta el auto por ${CONFIG.horasReserva} h.</p>
      </div>
    </aside>
  </div>`;
}

/* ---------------- Vender ---------------- */
function vVender() {
  const v = UI.venta;
  const marcas = Object.keys(MODELOS).sort();
  const modelos = v.marca ? Object.keys(MODELOS[v.marca]) : [];
  const steps = `<div class="steps">${[1, 2, 3].map((n) => `<span class="${v.paso >= n ? "on" : ""}"></span>`).join("")}</div>`;
  let izq = "";
  if (v.paso === 1) {
    izq = `${steps}<h2 style="font-size:24px;margin-bottom:6px">Cotizá tu auto en un minuto</h2><p class="hint" style="margin-bottom:16px">Te mostramos dos ofertas: te lo compramos ya o lo publicamos por vos.</p>
    <div class="row2">
      <div class="field"><label>Marca</label><select data-bind="venta.marca" data-rr data-reset="venta.modelo">${opt("", "Elegí…", v.marca)}${marcas.map((m) => opt(m, m, v.marca)).join("")}</select></div>
      <div class="field"><label>Modelo</label><select data-bind="venta.modelo" ${v.marca ? "" : "disabled"}>${opt("", v.marca ? "Elegí…" : "Primero la marca", v.modelo)}${modelos.map((m) => opt(m, m, v.modelo)).join("")}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label>Año</label><select data-bind="venta.anio">${opt("", "Elegí…", v.anio)}${Array.from({ length: 14 }, (_, i) => ANIO_ACTUAL - 1 - i).map((y) => opt(y, y, v.anio)).join("")}</select></div>
      <div class="field"><label>Kilómetros</label><input type="number" min="0" step="1000" data-bind="venta.km" value="${esc(v.km)}" placeholder="Ej.: 65000"></div>
    </div>
    <div class="field"><label>Estado general</label>
      <div class="chips">${[["excelente", "Excelente"], ["bueno", "Bueno"], ["detalles", "Con detalles"]].map(([k, l]) => `<button class="chip" data-act="ventaEstado" data-v="${k}" aria-pressed="${v.estado === k}">${l}</button>`).join("")}</div></div>
    ${v.err ? `<div class="alert danger">${esc(v.err)}</div>` : ""}
    <button class="btn primary block" data-act="cotizar">Ver mis ofertas</button>`;
  }
  if (v.paso === 2) {
    const mkt = valorMercado(v);
    const inm = Math.round(mkt * CONFIG.pctInmediata / 10000) * 10000;
    const cons = Math.round(mkt * (1 - CONFIG.comisionConsignacion) / 10000) * 10000;
    izq = `${steps}<h2 style="font-size:24px;margin-bottom:4px">${esc(v.marca)} ${esc(v.modelo)} ${esc(v.anio)}</h2><p class="hint" style="margin-bottom:16px">${kmf(num(v.km))} · estado ${({ excelente: "excelente", bueno: "bueno", detalles: "con detalles" })[v.estado]} · valor de mercado estimado ${$$(mkt)}</p>
    <button class="offer" data-act="elegirOferta" data-v="inmediata" aria-pressed="${v.elegido === "inmediata"}">
      <span class="badge b-deal">Más rápido</span><div style="margin-top:8px;font-weight:700">Venta inmediata</div>
      <div class="amt money">${$$(inm)}</div><div class="hint">Te lo compramos y te pagamos dentro de las 24 h posteriores a la inspección.</div></button>
    <button class="offer" data-act="elegirOferta" data-v="consignacion" aria-pressed="${v.elegido === "consignacion"}">
      <span class="badge b-brand">Más dinero</span><div style="margin-top:8px;font-weight:700">Publicación con RODAR</div>
      <div class="amt money">${$$(cons)}</div><div class="hint">Lo publicamos a ${$$(mkt)} y cobrás al venderse, menos ${Math.round(CONFIG.comisionConsignacion * 100)} % de comisión.</div></button>
    <div style="display:flex;gap:8px;margin-top:14px"><button class="btn" data-act="ventaPaso" data-v="1">Cambiar datos</button><button class="btn primary" style="flex:1" data-act="ventaPaso" data-v="3">Agendar inspección</button></div>
    <p class="hint" style="margin-top:10px">La oferta final se confirma en la inspección. Simulación de ejemplo.</p>`;
  }
  if (v.paso === 3) {
    const dias = proximosDias(6);
    if (!v.fecha) v.fecha = String(dias[0]);
    izq = `${steps}<h2 style="font-size:24px;margin-bottom:6px">Agendá la inspección</h2><p class="hint" style="margin-bottom:16px">Dura unos 40 minutos. Traé la cédula y el título.</p>
    <div class="row2">
      <div class="field"><label>Sede</label><select data-bind="venta.sede">${SEDES.map((s) => opt(s, s, v.sede)).join("")}</select></div>
      <div class="field"><label>Franja</label><select data-bind="venta.franja">${["Mañana", "Tarde"].map((s) => opt(s, s, v.franja)).join("")}</select></div>
    </div>
    <div class="field"><label>Día</label><div class="chips">${dias.map((d) => `<button class="chip" data-act="ventaFecha" data-v="${d}" aria-pressed="${String(d) === String(v.fecha)}">${fdia(d)}</button>`).join("")}</div></div>
    <div class="row2">
      <div class="field"><label>Nombre</label><input data-bind="venta.nombre" value="${esc(v.nombre)}" autocomplete="off"></div>
      <div class="field"><label>Teléfono</label><input data-bind="venta.tel" value="${esc(v.tel)}" inputmode="tel" autocomplete="off"></div>
    </div>
    ${v.err ? `<div class="alert danger">${esc(v.err)}</div>` : ""}
    <div style="display:flex;gap:8px"><button class="btn" data-act="ventaPaso" data-v="2">Volver</button><button class="btn primary" style="flex:1" data-act="confirmarVenta">Confirmar turno</button></div>`;
  }
  if (v.paso === 4) {
    const ult = S.ventas[S.ventas.length - 1];
    izq = `<div class="alert ok">Listo, ${esc(ult.nombre.split(" ")[0])}. Tu inspección quedó agendada.</div>
    <div class="card"><h3>${esc(ult.marca)} ${esc(ult.modelo)} ${ult.anio}</h3>
      <div class="kv"><span>Turno</span><b>${fdia(ult.fecha)} · ${esc(ult.franja.toLowerCase())}</b></div>
      <div class="kv"><span>Sede</span><b>${esc(ult.sede)}</b></div>
      <div class="kv"><span>Opción elegida</span><b>${ult.tipo === "inmediata" ? "Venta inmediata" : "Publicación con RODAR"}</b></div>
      <div class="kv total"><span>Oferta</span><span class="money">${$$(ult.oferta)}</span></div>
      <p class="hint">Código ${ult.id}. Lo encontrás en Mi cuenta.</p></div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" data-act="cuentaTab" data-v="ventas">Ver en Mi cuenta</button><button class="btn primary" data-act="nuevaCotizacion">Cotizar otro auto</button></div>`;
  }
  return `<div class="sell"><div class="card">${izq}</div>
    <div class="card"><h3>Cómo funciona</h3><div class="how">
      <div class="s"><span class="n">1</span><div><b>Cotizás online</b><p class="hint">Con marca, modelo, año y kilómetros te mostramos dos ofertas al instante.</p></div></div>
      <div class="s"><span class="n">2</span><div><b>Inspeccionamos tu auto</b><p class="hint">En una sede, en unos 40 minutos. Ahí se confirma la oferta.</p></div></div>
      <div class="s"><span class="n">3</span><div><b>Cobrás</b><p class="hint">En 24 h si elegís venta inmediata, o cuando se vende si lo publicamos por vos.</p></div></div>
      <div class="s"><span class="n">4</span><div><b>Nos ocupamos de la transferencia</b><p class="hint">Turnos, formularios y el informe de dominio corren por nuestra cuenta.</p></div></div>
    </div></div></div>`;
}

/* ---------------- Mi cuenta ---------------- */
function vCuenta() {
  const t = UI.tabCuenta;
  const tab = (id, l, n) => `<button class="chip" data-act="cuentaTab" data-v="${id}" aria-pressed="${t === id}">${l}${n ? ` · ${n}` : ""}</button>`;
  let body = "";
  if (t === "favoritos") {
    const l = S.favoritos.map(AUTO).filter(Boolean);
    body = l.length ? `<div class="grid">${l.map(cardAuto).join("")}</div>` : `<div class="empty">Todavía no guardaste autos. Tocá el corazón en el catálogo.</div>`;
  }
  if (t === "reservas") {
    const l = [...S.reservas].reverse();
    body = l.length ? `<div class="card">${l.map((r) => {
      const a = AUTO(r.autoId);
      const badge = { activa: '<span class="badge b-res">Reservado</span>', cancelada: '<span class="badge b-mute">Cancelada · seña devuelta</span>' }[r.estado];
      return `<div class="list-item"><div class="mini">${autoSVG(a)}</div><div class="grow"><div class="t">${esc(nombreAuto(a))} ${a.anio}</div>
        <div class="hint">${r.id} · visita ${fdia(r.fecha)} en ${esc(r.sede)} · seña ${$$(r.sena)}</div><div style="margin-top:6px">${badge}</div></div>
        ${r.estado === "activa" ? `<button class="btn sm" data-act="cancelarReserva" data-id="${r.id}">Cancelar</button>` : ""}</div>`;
    }).join("")}</div>` : `<div class="empty">No tenés reservas. Cuando reserves un auto, lo vas a ver acá.</div>`;
  }
  if (t === "ventas") {
    const l = [...S.ventas].reverse();
    body = l.length ? `<div class="card">${l.map((v) => `<div class="list-item"><div class="grow"><div class="t">${esc(v.marca)} ${esc(v.modelo)} ${v.anio}</div>
      <div class="hint">${v.id} · inspección ${fdia(v.fecha)} (${esc(v.franja.toLowerCase())}) en ${esc(v.sede)}</div>
      <div style="margin-top:6px"><span class="badge b-brand">${v.tipo === "inmediata" ? "Venta inmediata" : "Publicación con RODAR"}</span></div></div>
      <div class="money" style="font-weight:800">${$$(v.oferta)}</div></div>`).join("")}</div>` : `<div class="empty">Todavía no cotizaste tu auto. <button class="btn sm" data-act="ir" data-v="vender">Cotizar ahora</button></div>`;
  }
  return `<h1 style="font-size:26px;margin-bottom:14px">Mi cuenta</h1>
  <div class="chips" style="margin-bottom:16px">${tab("reservas", "Reservas", S.reservas.filter((r) => r.estado === "activa").length)}${tab("favoritos", "Favoritos", S.favoritos.length)}${tab("ventas", "Mis ventas", S.ventas.length)}</div>
  ${body}`;
}

/* ---------------- Modales ---------------- */
function vModal() {
  const md = UI.modal;
  if (!md) return "";
  const a = AUTO(md.id);
  const dias = proximosDias(5);
  if (!UI.m.fecha) UI.m.fecha = String(dias[0]);
  if (!UI.m.sede) UI.m.sede = a.sede;
  const reservar = md.type === "reservar";
  const head = reservar ? `Reservá el ${esc(nombreAuto(a))}` : "Agendá una prueba de manejo";
  const body = `
    <div class="list-item" style="padding-top:0"><div class="mini">${autoSVG(a)}</div><div class="grow"><div class="t">${esc(nombreAuto(a))} ${a.anio}</div><div class="hint">${esc(a.version)} · ${kmf(a.km)}</div><div class="money" style="font-weight:800">${$$(precioFinal(a))}</div></div></div>
    <div class="row2" style="margin-top:12px">
      <div class="field"><label>Nombre y apellido</label><input data-bind="m.nombre" value="${esc(UI.m.nombre || "")}" autocomplete="off"></div>
      <div class="field"><label>Teléfono</label><input data-bind="m.tel" value="${esc(UI.m.tel || "")}" inputmode="tel" autocomplete="off"></div>
    </div>
    <div class="field"><label>Sede</label><select data-bind="m.sede">${SEDES.map((s) => opt(s, s, UI.m.sede)).join("")}</select></div>
    <div class="field"><label>Día de la visita</label><div class="chips">${dias.map((d) => `<button class="chip" data-act="mFecha" data-v="${d}" aria-pressed="${String(d) === String(UI.m.fecha)}">${fdia(d)}</button>`).join("")}</div></div>
    ${reservar ? `<div class="kv total"><span>Seña reembolsable</span><span class="money">${$$(CONFIG.sena)}</span></div><p class="hint">Aparta el auto por ${CONFIG.horasReserva} h y se descuenta del precio. En la demo no se cobra nada.</p>` : `<p class="hint">Te esperamos con el auto listo. La prueba dura unos 20 minutos.</p>`}
    ${UI.m.err ? `<div class="alert danger" style="margin-top:10px">${esc(UI.m.err)}</div>` : ""}`;
  return `<div class="modal-bg" data-act="fondoModal"><div class="modal" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${head}</h3><button class="btn sm ghost" data-act="cerrarModal" aria-label="Cerrar">✕</button></div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot"><button class="btn" data-act="cerrarModal">Cancelar</button><button class="btn primary" data-act="${reservar ? "confirmarReserva" : "confirmarVisita"}" data-id="${a.id}">${reservar ? "Confirmar reserva" : "Agendar"}</button></div>
  </div></div>`;
}

/* ---------------- Barra de demo y render ---------------- */
function vBarra() {
  return `<div class="tag"><span class="dot"></span><span>Demo · <b>Varyon</b></span><span class="hide-sm" style="color:#8a8a92;font-weight:500">Marketplace de autos usados</span></div>
  <div class="spacer"></div>
  <div class="seg-dark" role="group" aria-label="Vista"><button data-act="vista" data-v="escritorio" aria-pressed="${UI.vista === "escritorio"}">Escritorio</button><button data-act="vista" data-v="celular" aria-pressed="${UI.vista === "celular"}">Celular</button></div>
  <button class="dbtn" data-act="reiniciar">Reiniciar</button>
  <a class="dbtn hide-sm" href="${CASO_URL}">Ver caso de estudio</a>`;
}

let toastTimer;
function toast(msg, err) {
  const el = document.getElementById("toast");
  el.innerHTML = `<div class="toast ${err ? "err" : ""}">${esc(msg)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.innerHTML = ""), 2600);
}

function render(arriba) {
  save();
  document.getElementById("bar").innerHTML = vBarra();
  const stage = document.getElementById("stage");
  stage.dataset.vista = UI.vista;
  const app = document.getElementById("app");
  const top = app.scrollTop;
  const vistas = { comprar: vComprar, auto: vAuto, vender: vVender, cuenta: vCuenta };
  app.innerHTML = vTop() + `<main class="page">${vistas[UI.ruta]()}</main>` + vTabbar();
  document.getElementById("modal").innerHTML = vModal();
  if (arriba) { app.scrollTop = 0; window.scrollTo(0, 0); } else app.scrollTop = top;
}

/* ---------------- Navegación ---------------- */
function leerHash() {
  let h = "";
  try { h = (location.hash || "").slice(1); } catch (e) {}
  if (h.startsWith("auto-") && AUTO(h.slice(5))) { UI.ruta = "auto"; UI.autoId = h.slice(5); }
  else if (["comprar", "vender", "cuenta"].includes(h)) UI.ruta = h;
  else UI.ruta = "comprar";
}
function irA(ruta, id) {
  UI.ruta = ruta; UI.autoId = id || null;
  try { const h = ruta === "auto" ? "auto-" + id : ruta; if (location.hash.slice(1) !== h) history.replaceState(null, "", "#" + h); } catch (e) {}
  UI.filtrosAbiertos = false;
  render(true);
}

function setPath(path, value) {
  const k = path.split(".");
  let o = UI;
  k.slice(0, -1).forEach((x) => (o = o[x]));
  o[k[k.length - 1]] = value;
}

/* ---------------- Acciones ---------------- */
const A = {
  vista: (d) => { UI.vista = d.v; try { localStorage.setItem(KEY_VISTA, d.v); } catch (e) {} render(true); },
  reiniciar: () => { S = crearDatosIniciales(); UI.f = filtrosVacios(); UI.venta = ventaVacia(); UI.modal = null; toast("Demo reiniciada"); irA("comprar"); },
  ir: (d) => irA(d.v),
  verAuto: (d) => { UI.fin = { anticipo: 40, plazo: 48 }; irA("auto", d.id); },
  fav: (d, el, e) => {
    e.stopPropagation();
    const i = S.favoritos.indexOf(d.id);
    if (i >= 0) { S.favoritos.splice(i, 1); toast("Quitado de favoritos"); } else { S.favoritos.push(d.id); toast("Guardado en favoritos"); }
    render();
  },
  toggleF: (d) => { const l = UI.f[d.g]; const i = l.indexOf(d.v); i >= 0 ? l.splice(i, 1) : l.push(d.v); render(); },
  setF: (d) => { UI.f[d.k] = d.v; render(); },
  limpiarF: () => { const q = UI.f.q; UI.f = filtrosVacios(); UI.f.q = q; render(); },
  toggleFiltros: () => { UI.filtrosAbiertos = !UI.filtrosAbiertos; render(); },
  plazo: (d) => { UI.fin.plazo = Number(d.v); render(); },
  modal: (d) => { UI.modal = { type: d.type, id: d.id }; UI.m = {}; render(); },
  cerrarModal: () => { UI.modal = null; render(); },
  fondoModal: (d, el, e) => { if (e.target === el) { UI.modal = null; render(); } },
  mFecha: (d) => { UI.m.fecha = d.v; render(); },
  confirmarReserva: (d) => {
    const a = AUTO(d.id);
    if (!(UI.m.nombre || "").trim() || !(UI.m.tel || "").trim()) { UI.m.err = "Completá tu nombre y teléfono para reservar."; return render(); }
    if (a.estado === "reservado") { UI.m.err = "Alguien lo reservó recién. Mirá autos parecidos en el catálogo."; return render(); }
    const r = { id: "RS-" + S.seq.reserva++, autoId: a.id, nombre: UI.m.nombre.trim(), tel: UI.m.tel.trim(), sede: UI.m.sede, fecha: Number(UI.m.fecha), sena: CONFIG.sena, creada: Date.now(), estado: "activa" };
    S.reservas.push(r);
    a.estado = "reservado";
    UI.modal = null;
    toast(`Reserva ${r.id} confirmada`);
    render();
  },
  confirmarVisita: () => {
    if (!(UI.m.nombre || "").trim() || !(UI.m.tel || "").trim()) { UI.m.err = "Completá tu nombre y teléfono para agendar."; return render(); }
    UI.modal = null;
    toast(`Prueba agendada para el ${fdia(Number(UI.m.fecha))}`);
    render();
  },
  cancelarReserva: (d) => {
    const r = S.reservas.find((x) => x.id === d.id);
    r.estado = "cancelada";
    const a = AUTO(r.autoId); if (a) a.estado = "disponible";
    toast("Reserva cancelada · la seña se devuelve completa");
    render();
  },
  cuentaTab: (d) => { UI.tabCuenta = d.v; if (UI.ruta !== "cuenta") irA("cuenta"); else render(); },
  ventaEstado: (d) => { UI.venta.estado = d.v; render(); },
  cotizar: () => {
    const v = UI.venta; v.err = null;
    if (!v.marca || !v.modelo || !v.anio) { v.err = "Elegí marca, modelo y año."; return render(); }
    if (v.km === "" || num(v.km) < 0) { v.err = "Ingresá los kilómetros."; return render(); }
    if (num(v.km) > 400000) { v.err = "Revisá los kilómetros: parece un número muy alto."; return render(); }
    v.paso = 2; render(true);
  },
  elegirOferta: (d) => { UI.venta.elegido = d.v; render(); },
  ventaPaso: (d) => { UI.venta.paso = Number(d.v); UI.venta.err = null; render(true); },
  ventaFecha: (d) => { UI.venta.fecha = d.v; render(); },
  confirmarVenta: () => {
    const v = UI.venta; v.err = null;
    if (!v.nombre.trim() || !v.tel.trim()) { v.err = "Completá tu nombre y teléfono."; return render(); }
    const mkt = valorMercado(v);
    const oferta = v.elegido === "inmediata" ? Math.round(mkt * CONFIG.pctInmediata / 10000) * 10000 : Math.round(mkt * (1 - CONFIG.comisionConsignacion) / 10000) * 10000;
    S.ventas.push({ id: "VT-" + S.seq.venta++, marca: v.marca, modelo: v.modelo, anio: Number(v.anio), km: num(v.km), estado: v.estado, tipo: v.elegido, oferta, sede: v.sede, fecha: Number(v.fecha), franja: v.franja, nombre: v.nombre.trim(), tel: v.tel.trim() });
    v.paso = 4;
    toast("Inspección agendada");
    render(true);
  },
  nuevaCotizacion: () => { UI.venta = ventaVacia(); render(true); },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const fn = A[el.dataset.act];
  if (fn) { if (el.tagName === "A") e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && UI.modal) { UI.modal = null; render(); }
  if (e.key === "Enter" && e.target.classList?.contains("car")) A.verAuto(e.target.dataset);
});
document.addEventListener("submit", (e) => { e.preventDefault(); render(); });
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.dataset?.bind) return;
  setPath(el.dataset.bind, el.type === "range" ? Number(el.value) : el.value);
  if (el.dataset.live !== undefined) {
    const sel = `[data-bind="${el.dataset.bind}"]`;
    render();
    const again = document.querySelector(sel);
    if (again) again.focus();
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (!el.dataset?.bind) return;
  setPath(el.dataset.bind, el.value);
  if (el.dataset.reset) setPath(el.dataset.reset, "");
  if (el.dataset.rr !== undefined) render();
});
window.addEventListener("hashchange", () => { leerHash(); render(true); });

leerHash();
render(true);
