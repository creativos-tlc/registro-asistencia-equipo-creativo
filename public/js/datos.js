/* Consultas y reglas de negocio sobre los datos. Las vistas nunca calculan por su cuenta. */
import { lista, obtener } from './store.js';
import { tipoDe, EQUIPO_INICIAL, EQUIPO_CREATIVO, DIAS_ASISTENCIA_PENDIENTE, CANALES, FORMATOS, claveFormato } from './model.js';
import { aMin, dif, hoy, porNombre, sumarDias } from './util.js';

// ---------- equipo ----------
export const equipoActual = () => obtener('equipos', EQUIPO_CREATIVO) || { id: EQUIPO_CREATIVO, ...EQUIPO_INICIAL };

// ---------- personas ----------
export const personas = ({ inactivas = false } = {}) =>
  lista('personas').filter((p) => (inactivas ? true : p.activo !== false)).sort(porNombre);
export const persona = (id) => obtener('personas', id);
export const nombreDe = (id) => persona(id)?.nombre || 'Alguien';

// ---------- eventos ----------
export const eventos = () => lista('eventos');
export const evento = (id) => obtener('eventos', id);
const clave = (e) => `${e.fecha} ${e.horaInicio || '00:00'}`;
export const eventosOrdenados = () => [...eventos()].sort((a, b) => clave(a).localeCompare(clave(b)));

export function proximoServicio(desde = hoy()) {
  return eventosOrdenados().find((e) => e.tipo === 'servicio' && e.fecha >= desde) || null;
}
export function proximosEventos(n = 5, desde = hoy()) {
  return eventosOrdenados().filter((e) => e.fecha >= desde).slice(0, n);
}

// ---------- asistencia ----------
const claveAsis = (eventoId, personaId) => `${eventoId}~${personaId}`;
export const marca = (eventoId, personaId) => obtener('asistencia', claveAsis(eventoId, personaId))?.estado || null;
export { claveAsis };

export function citados(ev) {
  if (ev.participantes && ev.participantes.length) return ev.participantes.map(persona).filter(Boolean).sort(porNombre);
  return personas().filter((p) => (!p.desde || p.desde <= ev.fecha) && (!p.equipos || !ev.equipoId || p.equipos.includes(ev.equipoId)));
}
export const pideLista = (ev) => ev.tomaLista !== false && tipoDe(ev.tipo).asistencia;
let _refAsis = null;
let _idxAsis = new Map();
function indiceAsistencia() {
  const l = lista('asistencia');
  if (l !== _refAsis) {
    _refAsis = l;
    _idxAsis = new Map();
    for (const a of l) { if (!_idxAsis.has(a.eventoId)) _idxAsis.set(a.eventoId, []); _idxAsis.get(a.eventoId).push(a); }
  }
  return _idxAsis;
}
export const marcasDe = (ev) => indiceAsistencia().get(ev.id) || [];
export const listaTomada = (ev) => marcasDe(ev).length > 0;

export function resumenAsistencia(ev) {
  const cit = citados(ev);
  const m = marcasDe(ev);
  const c = { p: 0, a: 0, j: 0 };
  m.forEach((x) => { if (c[x.estado] !== undefined && cit.some((p) => p.id === x.personaId)) c[x.estado]++; });
  return { citados: cit.length, marcados: c.p + c.a + c.j, ...c };
}

export function pendientesDeLista(hasta = hoy()) {
  const desde = sumarDias(hasta, -DIAS_ASISTENCIA_PENDIENTE);
  return eventosOrdenados().filter((e) => e.fecha < hasta && e.fecha >= desde && pideLista(e) && !listaTomada(e)).reverse();
}

/** Historial, porcentaje y racha de una persona. Justificar no penaliza ni corta la racha. */
export function estadisticas(personaId, hasta = hoy()) {
  const p = persona(personaId);
  const historial = [];
  if (p) {
    for (const ev of eventosOrdenados()) {
      if (ev.fecha > hasta || !pideLista(ev) || !listaTomada(ev)) continue;
      if (p.desde && ev.fecha < p.desde) continue;
      const cit = ev.participantes?.length ? ev.participantes.includes(personaId) : citados(ev).some((c) => c.id === personaId);
      if (!cit) continue;
      historial.push({ evento: ev, estado: marca(ev.id, personaId) || 'a' });
    }
  }
  const cuenta = { p: 0, a: 0, j: 0 };
  historial.forEach((h) => cuenta[h.estado]++);
  const base = cuenta.p + cuenta.a;
  let racha = 0;
  for (let i = historial.length - 1; i >= 0; i--) {
    const s = historial[i].estado;
    if (s === 'p') racha++; else if (s === 'a') break;
  }
  return { total: historial.length, ...cuenta, porcentaje: base ? Math.round((cuenta.p / base) * 100) : null, racha, historial: historial.reverse() };
}

// ---------- tareas ----------
export const tareas = () => lista('tareas');
export const tarea = (id) => obtener('tareas', id);
export const tareasDe = (personaId) => tareas().filter((t) => (t.asignados || []).includes(personaId));
export const tareasAbiertas = () => tareas().filter((t) => t.estado !== 'hecha');
export const tareasVencidas = (h = hoy()) => tareasAbiertas().filter((t) => t.vence && t.vence < h);

export function agruparTareas(arr, h = hoy()) {
  const grupos = [
    { id: 'vencidas', titulo: 'Vencidas', tono: 'bad', items: [] },
    { id: 'hoy', titulo: 'Hoy', items: [] },
    { id: 'semana', titulo: 'Próximos 7 días', items: [] },
    { id: 'despues', titulo: 'Más adelante', items: [] },
    { id: 'sinfecha', titulo: 'Sin fecha', items: [] },
    { id: 'hechas', titulo: 'Hechas', items: [] },
  ];
  const por = Object.fromEntries(grupos.map((g) => [g.id, g]));
  for (const t of arr) {
    if (t.estado === 'hecha') por.hechas.items.push(t);
    else if (!t.vence) por.sinfecha.items.push(t);
    else if (t.vence < h) por.vencidas.items.push(t);
    else if (t.vence === h) por.hoy.items.push(t);
    else if (dif(t.vence, h) <= 7) por.semana.items.push(t);
    else por.despues.items.push(t);
  }
  const orden = (a, b) => (a.vence || '9').localeCompare(b.vence || '9') || (b.prioridad === 'alta') - (a.prioridad === 'alta');
  grupos.forEach((g) => g.items.sort(orden));
  por.hechas.items.sort((a, b) => (b.hechaEn || '').localeCompare(a.hechaEn || '')).splice(15);
  return grupos.filter((g) => g.items.length);
}

// ---------- notas ----------
export const bloquesNotas = () => [...lista('notas')].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

// ---------- contenido ----------
export const publicaciones = () => lista('publicaciones');
export const publicacion = (id) => obtener('publicaciones', id);

// ---------- calendario unificado ----------
/** Normaliza eventos, tareas con fecha y publicaciones en un solo formato para dibujar. */
export function itemsCalendario({ desde, hasta, capas = ['eventos', 'tareas', 'contenido'], formato = null }) {
  const items = [];
  if (capas.includes('eventos')) {
    for (const e of eventos()) {
      if (e.fecha < desde || e.fecha > hasta) continue;
      const t = tipoDe(e.tipo);
      items.push({ clase: 'evento', id: e.id, fecha: e.fecha, ini: e.horaInicio || '', fin: e.horaFin || '', titulo: e.titulo, color: t.color, icono: t.icono, sub: t.label });
    }
  }
  if (capas.includes('tareas')) {
    for (const t of tareas()) {
      if (!t.vence || t.vence < desde || t.vence > hasta) continue;
      items.push({ clase: 'tarea', id: t.id, fecha: t.vence, ini: '', fin: '', titulo: t.titulo, color: 'var(--tx-2)', icono: t.estado === 'hecha' ? 'circle-check' : 'circle', sub: 'Tarea', hecha: t.estado === 'hecha' });
    }
  }
  if (capas.includes('contenido')) {
    for (const p of publicaciones()) {
      if (p.fecha < desde || p.fecha > hasta) continue;
      const clave = claveFormato(p);
      if (formato && clave !== formato) continue;
      const c = CANALES[p.canal] || CANALES.instagram;
      const f = FORMATOS[clave];
      items.push({ clase: 'contenido', id: p.id, fecha: p.fecha, ini: p.hora || '', fin: '', titulo: p.titulo, color: f.color, letra: f.letra, formato: clave, icono: c.icono, sub: c.formatos[p.formato] || c.label, hecha: p.estado === 'publicado' });
    }
  }
  return items.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.ini || '').localeCompare(b.ini || '') || a.titulo.localeCompare(b.titulo, 'es'));
}

/** Ubica en columnas los bloques que se solapan en el mismo día (vista de horas). */
export function distribuirSolapes(items) {
  const conHora = items.filter((i) => i.ini).map((i) => {
    const ini = aMin(i.ini);
    const fin = aMin(i.fin) > ini ? aMin(i.fin) : ini + 60;
    return { ...i, _ini: ini, _fin: fin };
  }).sort((a, b) => a._ini - b._ini || b._fin - a._fin);
  const grupos = [];
  let actual = null;
  for (const it of conHora) {
    if (!actual || it._ini >= actual.fin) { actual = { fin: it._fin, cols: [], items: [] }; grupos.push(actual); }
    let col = actual.cols.findIndex((f) => f <= it._ini);
    if (col === -1) { col = actual.cols.length; actual.cols.push(0); }
    actual.cols[col] = it._fin;
    it._col = col;
    actual.items.push(it);
    actual.fin = Math.max(actual.fin, it._fin);
  }
  grupos.forEach((g) => g.items.forEach((it) => { it._cols = g.cols.length; }));
  return conHora;
}
