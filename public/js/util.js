/* Utilidades puras: fechas locales, plantillas con escape, ids, texto. */

// ---------- Plantillas HTML con escape automático ----------
class Seguro { constructor(s) { this.s = s; } toString() { return this.s; } }
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pintar = (v) => (v instanceof Seguro ? v.s : Array.isArray(v) ? v.map(pintar).join('') : v == null || v === false ? '' : esc(v));

/** html`<p>${textoDelUsuario}</p>` escapa todo lo interpolado salvo otros html`` o raw(). */
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += pintar(v) + strings[i + 1]; });
  return new Seguro(out);
}
export const raw = (s) => new Seguro(String(s));
export const poner = (el, contenido) => { el.innerHTML = pintar(contenido); return el; };

export const icono = (nombre, clase = '') => raw(`<svg class="i ${clase}" aria-hidden="true"><use href="#i-${nombre}"/></svg>`);

// ---------- Fechas locales (nunca toISOString: desfasa el día en Chile por la tarde) ----------
const pad = (n) => String(n).padStart(2, '0');
export const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoy = () => aISO(new Date());
export const leerISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const sumarDias = (iso, n) => { const d = leerISO(iso); d.setDate(d.getDate() + n); return aISO(d); };
export const dif = (a, b) => Math.round((leerISO(a) - leerISO(b)) / 86400000);
/** Lunes de la semana de `iso` (la semana chilena empieza el lunes y termina en el domingo de servicio). */
export const inicioSemana = (iso) => { const d = leerISO(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return aISO(d); };
export const inicioMes = (iso) => `${iso.slice(0, 7)}-01`;
export const sumarMeses = (iso, n) => { const d = leerISO(inicioMes(iso)); d.setMonth(d.getMonth() + n); return aISO(d); };
export const diaSemana = (iso) => (leerISO(iso).getDay() + 6) % 7; // 0 = lunes
/** El domingo de la semana de `iso` (hoy mismo si es domingo). */
export const domingoDe = (iso) => sumarDias(iso, 6 - diaSemana(iso));
export function domingosDelMes(mes) {
  const lista = [];
  let d = domingoDe(`${mes}-01`);
  while (d.slice(0, 7) === mes) { lista.push(d); d = sumarDias(d, 7); }
  return lista;
}

const fmt = (opts) => new Intl.DateTimeFormat('es-CL', opts);
const F = {
  largo: fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
  corto: fmt({ weekday: 'short', day: 'numeric', month: 'short' }),
  diaMes: fmt({ day: 'numeric', month: 'short' }),
  mes: fmt({ month: 'long', year: 'numeric' }),
  diaSem: fmt({ weekday: 'short' }),
  diaSemLargo: fmt({ weekday: 'long' }),
};
const limpia = (s) => s.replace(/\./g, '');
export const fechaLarga = (iso) => cap(F.largo.format(leerISO(iso)));
export const fechaCorta = (iso) => cap(limpia(F.corto.format(leerISO(iso))));
export const fechaDiaMes = (iso) => limpia(F.diaMes.format(leerISO(iso)));
export const nombreMes = (iso) => cap(F.mes.format(leerISO(iso)));
export const nombreDiaCorto = (iso) => cap(limpia(F.diaSem.format(leerISO(iso))));
export const nombreDiaLargo = (iso) => cap(F.diaSemLargo.format(leerISO(iso)));
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "Hoy", "Mañana", "Ayer", "Vie 26 sep" */
export function fechaRelativa(iso) {
  const d = dif(iso, hoy());
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  if (d > 1 && d < 7) return nombreDiaLargo(iso);
  return fechaCorta(iso);
}

export const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; };

// ---------- Horas ----------
export const aMin = (t) => (t && /^\d{2}:\d{2}$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : null);
export const deMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
export const rangoHora = (ini, fin) => (ini ? (fin ? `${ini} – ${fin}` : ini) : 'Todo el día');

// ---------- Ids, texto, edad ----------
export const nuevoId = (prefijo) => `${prefijo}_${(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2) + Date.now().toString(16)).replace(/-/g, '').slice(0, 12)}`;
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
export const iniciales = (n) => { const p = String(n || '?').trim().split(/\s+/); return ((p[0]?.[0] || '') + (p[1]?.[0] || p[0]?.[1] || '')).toUpperCase(); };
export const porNombre = (a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export function tonoDe(texto) { let h = 0; for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
export const edadDe = (anio) => (anio ? new Date().getFullYear() - Number(anio) : null);
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const telLimpio = (t) => String(t || '').replace(/[^\d+]/g, '');
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
