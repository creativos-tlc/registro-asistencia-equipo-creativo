/* Avisos personales (la campanita): "Daniel te asignó una tarea", "Te sumaron al proyecto…".
   Cada aviso es un registro para una persona; se crea en el mismo guardado que la asignación, así nunca queda uno sin el otro. */
import { guardar, lista, obtener, yo } from '../store.js';
import { nombreDe, personas } from '../datos.js';
import { html, icono, nuevoId, plural } from '../util.js';
import { abrirHoja, acciones, cerrarHoja, registrarAcciones, vacio } from '../ui.js';
import { ir } from '../router.js';

const ICONOS = { tarea: 'tasks', proyecto: 'clipboard', publicacion: 'image', turno: 'clipboard', info: 'message', aviso: 'bell' };

/** Registros de aviso para las personas indicadas (sin avisarse a uno mismo ni repetir). Se suman al mismo `guardar([...])`. */
export function opsAviso(paraIds, { tipo = 'aviso', texto, ref = null }) {
  const yoId = yo()?.personaId;
  return [...new Set((paraIds || []).filter(Boolean))].filter((id) => id !== yoId).map((para) => ({
    c: 'avisos', id: nuevoId('av'), data: { equipoId: 'creativo', para, tipo, texto, ref, de: yoId, creado: Date.now(), leido: false },
  }));
}
/** Avisa a los líderes (menos a quien lo hace). */
export const opsAvisoLideres = (datos) => opsAviso(personas().filter((p) => p.rol === 'lider').map((p) => p.id), datos);
/** Quiénes se sumaron respecto de una lista anterior. */
export const nuevosEn = (antes, ahora) => (ahora || []).filter((id) => !(antes || []).includes(id));
export const quien = () => yo()?.nombre || 'Alguien';

export const misAvisos = () => {
  const id = yo()?.personaId;
  return lista('avisos').filter((a) => a.para === id).sort((a, b) => (b.creado || 0) - (a.creado || 0));
};
export const sinLeer = () => misAvisos().filter((a) => !a.leido).length;

function haceCuanto(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'ahora';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${plural(d, 'día', 'días')}`;
}

function filaAviso(a) {
  return html`<button class="row aviso ${a.leido ? '' : 'aviso--nuevo'}" type="button" data-action="aviso-abrir" data-id="${a.id}">
    <span class="typebadge" style="--c:${a.tipo === 'info' ? 'var(--orange)' : 'var(--info)'}">${icono(ICONOS[a.tipo] || 'bell')}</span>
    <span class="row__main"><span class="row__title">${a.texto}</span><span class="row__sub"><span>${haceCuanto(a.creado || 0)}</span></span></span>
    ${a.leido ? '' : html`<span class="aviso__punto" aria-label="Sin leer"></span>`}
  </button>`;
}

export function abrirAvisos() {
  const lista = misAvisos().slice(0, 50);
  const nuevos = lista.filter((a) => !a.leido).length;
  abrirHoja({
    titulo: 'Avisos',
    cuerpo: lista.length
      ? html`<div class="panel"><div class="list">${lista.map(filaAviso)}</div></div>`
      : html`<div class="panel">${vacio({ icon: 'bell', titulo: 'Sin avisos', texto: 'Aquí aparece cuando alguien te asigna algo o te necesita.' })}</div>`,
    pie: nuevos ? html`<span class="spacer"></span><button class="btn btn--soft" type="button" data-action="avisos-leer-todo">Marcar todo como leído</button>` : '',
  });
}

const marcar = (ids) => {
  const ops = ids.map((id) => obtener('avisos', id)).filter((a) => a && !a.leido).map(({ id, ...resto }) => ({ c: 'avisos', id, data: { ...resto, leido: true } }));
  if (ops.length) guardar(ops);
};

/** Pinta el número rojo de la campanita. */
export function pintarCampana() {
  const b = document.getElementById('campanaBtn');
  if (!b) return;
  const n = sinLeer();
  b.setAttribute('aria-label', n ? `Avisos: ${plural(n, 'sin leer', 'sin leer')}` : 'Avisos');
  b.innerHTML = `<svg class="i"><use href="#i-bell"/></svg>${n ? `<span class="campana__n num">${n > 9 ? '9+' : n}</span>` : ''}`;
}

registrarAcciones({
  'avisos-abrir': () => abrirAvisos(),
  'avisos-leer-todo': () => { marcar(misAvisos().map((a) => a.id)); cerrarHoja(); },
  'aviso-abrir': (el) => {
    const a = obtener('avisos', el.dataset.id);
    if (!a) return;
    marcar([a.id]);
    cerrarHoja();
    const r = a.ref || {};
    if (r.c === 'tareas' && obtener('tareas', r.id)) acciones['tarea-editar']({ dataset: { id: r.id } });
    else if (r.c === 'publicaciones' && obtener('publicaciones', r.id)) acciones['publicacion-asignada']({ dataset: { id: r.id } });
    else if (r.c === 'proyectos' && obtener('proyectos', r.id)) acciones['proyecto-abrir']({ dataset: { id: r.id } });
    else if (r.c === 'turnos') ir('turnos');
  },
});
