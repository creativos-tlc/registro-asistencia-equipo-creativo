/* Trae a la base compartida los datos que la versión anterior guardó en este teléfono (localStorage). */
import { guardar, lista } from './store.js';
import { EQUIPO_CREATIVO, tipoDe } from './model.js';
import { html, hoy, norm, nuevoId, plural } from './util.js';
import { abrirHoja, cerrarHoja, registrarAcciones, toast } from './ui.js';
import { personas } from './datos.js';

const CLAVE_V1 = 'registroAsistencia';
const CLAVE_HECHO = 'tlc.legacy.hecho';

function leerV1() {
  try {
    const v1 = JSON.parse(localStorage.getItem(CLAVE_V1) || 'null');
    if (!v1 || typeof v1 !== 'object') return null;
    const vols = (v1.voluntarios || []).map((v) => (typeof v === 'string' ? { nombre: v, fechaUnion: hoy() } : v)).filter((v) => v && v.nombre);
    const evs = (v1.eventos || []).filter((e) => e && e.fecha && e.nombre);
    const pubs = (v1.publicaciones || []).filter((p) => p && p.fecha && p.titulo);
    const marcas = Object.values(v1.asistencias || {}).reduce((n, r) => n + Object.keys(r || {}).length, 0);
    if (!vols.length && !evs.length && !pubs.length) return null;
    return { vols, evs, pubs, asistencias: v1.asistencias || {}, marcas };
  } catch { return null; }
}

export const hayDatosAntiguos = () => !!leerV1();

function tipoDesde(nombre, tipo) {
  const t = norm(`${nombre} ${tipo}`);
  if (/servicio|domingo/.test(t)) return 'servicio';
  if (/reunion|junta/.test(t)) return 'reunion';
  if (/grab/.test(t)) return 'grabacion';
  if (/ensayo/.test(t)) return 'ensayo';
  return 'otro';
}

function planificar(v1) {
  const ops = [];
  const cuenta = { personas: 0, eventos: 0, asistencias: 0, publicaciones: 0, yaEstaban: 0 };

  // personas: se reconocen por nombre o alias (p. ej. "Danny" = Daniel) para no duplicar a nadie
  const idPorNombre = new Map(personas({ inactivas: true }).flatMap((p) => [p.nombre, ...(p.alias || [])].map((n) => [norm(n), p.id])));
  v1.vols.forEach((v) => {
    const k = norm(v.nombre);
    if (idPorNombre.has(k)) { cuenta.yaEstaban++; return; }
    const id = nuevoId('per');
    idPorNombre.set(k, id);
    ops.push({ c: 'personas', id, data: { equipoId: EQUIPO_CREATIVO, equipos: [EQUIPO_CREATIVO], activo: true, nombre: v.nombre.trim(), apellidos: '', rol: 'voluntario', desde: v.fechaUnion || hoy(), areas: [] } });
    cuenta.personas++;
  });

  // eventos: se reconocen por fecha + título
  const evExistentes = new Map(lista('eventos').map((e) => [`${e.fecha}|${norm(e.titulo)}`, e.id]));
  const idEvento = new Map();
  v1.evs.forEach((e) => {
    const k = `${e.fecha}|${norm(e.nombre)}`;
    if (evExistentes.has(k)) { idEvento.set(e.id, evExistentes.get(k)); return; }
    const id = nuevoId('ev');
    idEvento.set(e.id, id);
    evExistentes.set(k, id);
    const tipo = tipoDesde(e.nombre, e.tipo);
    const part = (e.asignados || []).map((n) => idPorNombre.get(norm(n))).filter(Boolean);
    ops.push({ c: 'eventos', id, data: { equipoId: EQUIPO_CREATIVO, tipo, titulo: e.nombre, fecha: e.fecha, horaInicio: '', horaFin: '', lugar: '', notas: '', participantes: part, tomaLista: tipoDe(tipo).asistencia, programa: [], serieId: null } });
    cuenta.eventos++;
  });

  // asistencia: solo se agregan marcas que no existan (no se pisa lo del otro teléfono)
  const marcasExistentes = new Set(lista('asistencia').map((a) => a.id));
  Object.entries(v1.asistencias).forEach(([eventoV1, registro]) => {
    const eventoId = idEvento.get(eventoV1);
    if (!eventoId) return;
    Object.entries(registro || {}).forEach(([nombre, presente]) => {
      const personaId = idPorNombre.get(norm(nombre));
      if (!personaId) return;
      const id = `${eventoId}~${personaId}`;
      if (marcasExistentes.has(id)) return;
      marcasExistentes.add(id);
      ops.push({ c: 'asistencia', id, data: { eventoId, personaId, estado: presente ? 'p' : 'a' } });
      cuenta.asistencias++;
    });
  });

  // publicaciones: fecha + título + canal
  const pubsExistentes = new Set(lista('publicaciones').map((p) => `${p.fecha}|${norm(p.titulo)}|${p.canal}`));
  v1.pubs.forEach((p) => {
    const canal = p.plataforma === 'whatsapp' ? 'whatsapp' : 'instagram';
    const k = `${p.fecha}|${norm(p.titulo)}|${canal}`;
    if (pubsExistentes.has(k)) return;
    pubsExistentes.add(k);
    const formato = canal === 'instagram' ? (['post', 'historia', 'reel'].includes(p.tipo) ? p.tipo : 'post') : 'mensaje';
    ops.push({ c: 'publicaciones', id: nuevoId('pu'), data: { equipoId: EQUIPO_CREATIVO, canal, formato, titulo: p.titulo, fecha: p.fecha, hora: p.hora || '', estado: 'idea', responsableId: '', detalle: canal === 'whatsapp' ? p.descripcion || '' : '' } });
    cuenta.publicaciones++;
  });
  return { ops, cuenta };
}

function abrir() {
  const v1 = leerV1();
  if (!v1) { toast('No hay datos antiguos en este teléfono'); return; }
  const { ops, cuenta } = planificar(v1);
  abrirHoja({
    titulo: 'Datos de la versión anterior',
    cuerpo: html`
      <p class="muted">Este teléfono tenía guardado lo que registraste antes de la actualización. Puedes sumarlo a los datos compartidos: <strong>no se borra nada</strong> y lo que ya esté subido no se duplica.</p>
      <div class="panel"><div class="list">
        <div class="row"><span class="row__main"><span class="row__title">${plural(v1.vols.length, 'voluntario', 'voluntarios')}</span><span class="row__sub">${plural(cuenta.personas, 'nuevo', 'nuevos')}${cuenta.yaEstaban ? ` · ${cuenta.yaEstaban === 1 ? '1 ya estaba' : `${cuenta.yaEstaban} ya estaban`}` : ''}</span></span></div>
        <div class="row"><span class="row__main"><span class="row__title">${plural(v1.evs.length, 'evento', 'eventos')}</span><span class="row__sub">${plural(cuenta.eventos, 'nuevo', 'nuevos')}</span></span></div>
        <div class="row"><span class="row__main"><span class="row__title">${plural(v1.marcas, 'marca de asistencia', 'marcas de asistencia')}</span><span class="row__sub">${plural(cuenta.asistencias, 'nueva', 'nuevas')}</span></span></div>
        <div class="row"><span class="row__main"><span class="row__title">${plural(v1.pubs.length, 'publicación', 'publicaciones')}</span><span class="row__sub">${plural(cuenta.publicaciones, 'nueva', 'nuevas')}</span></span></div>
      </div></div>
      <p class="hint">Después de subirlo, tus datos antiguos siguen intactos en este teléfono como respaldo.</p>`,
    pie: html`<button class="btn btn--soft" type="button" data-action="legacy-descartar">Ahora no</button><button class="btn btn--primary" type="button" data-action="legacy-subir">${ops.length ? `Subir ${ops.length} registros` : 'Marcar como al día'}</button>`,
  });
}

export function ofrecerImportacion() {
  if (localStorage.getItem(CLAVE_HECHO)) return;
  if (leerV1()) abrir();
}

registrarAcciones({
  'legacy-abrir': abrir,
  'legacy-descartar': () => { cerrarHoja(); },
  'legacy-subir': () => {
    const v1 = leerV1();
    const { ops } = planificar(v1);
    if (ops.length) guardar(ops);
    localStorage.setItem(CLAVE_HECHO, String(Date.now()));
    cerrarHoja();
    toast(ops.length ? `${ops.length} registros subidos a la base compartida` : 'Todo estaba al día');
  },
});
