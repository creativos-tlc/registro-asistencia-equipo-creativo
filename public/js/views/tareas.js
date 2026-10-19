import { TAREA_A_PUB, agruparTareas, nombreDe, personas, proyecto, proyectos, publicacion, publicacionesComoTareas, tareas } from '../datos.js';
import { fechaDiaMes, fechaRelativa, hoy, html, icono, nuevoId, sumarDias } from '../util.js';
import { acciones, avatar, registrarAcciones, toast, vacio } from '../ui.js';
import { refrescar, ir } from '../router.js';
import { guardar, yo } from '../store.js';
import { CANALES, ESTADOS_TAREA, EQUIPO_CREATIVO, NOTA_COLORES } from '../model.js';
import { vistaCalendario } from './calendario.js';

const CLAVE_VISTA = 'tlc.tareas.vista';
const leerVista = () => { try { return localStorage.getItem(CLAVE_VISTA) === 'tablero' ? 'tablero' : 'lista'; } catch { return 'lista'; } };
const filtro = { persona: '', estado: 'abiertas', proyecto: '', vista: leerVista(), col: 'pendiente' };
const COLUMNAS = [
  { k: 'pendiente', label: 'Por hacer', color: 'var(--tx-3)' },
  { k: 'en_curso', label: 'En curso', color: 'var(--info)' },
  { k: 'falta_info', label: 'Falta información', tab: 'Falta info', color: 'var(--orange)' },
  { k: 'hecha', label: 'Hechas', color: 'var(--ok)' },
];
const textoBusqueda = (t) => `${t.titulo} ${t.detalle || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Tarjeta del tablero: etiqueta de proyecto, título, detalle, fecha y responsables. */
function tarjeta(t) {
  const vencida = t.estado !== 'hecha' && t.vence && t.vence < hoy();
  const proy = t.proyectoId ? proyecto(t.proyectoId) : null;
  const canal = t.esPublicacion ? (CANALES[t.canal] || CANALES.instagram) : null;
  const color = t.esPublicacion ? 'var(--pink)' : proy ? (NOTA_COLORES[proy.color]?.color || 'var(--accent)') : 'var(--tx-3)';
  const accionAbrir = t.esPublicacion ? 'publicacion-asignada' : 'tarea-editar';
  // Las flechas siguen el camino normal (por hacer → en curso → hecha); "Falta información" es una pausa a la que se llega desde el formulario o arrastrando.
  const sig = t.estado === 'pendiente' ? 'en_curso' : t.estado === 'en_curso' || t.estado === 'falta_info' ? 'hecha' : null;
  const ant = t.estado === 'hecha' || t.estado === 'falta_info' ? 'en_curso' : t.estado === 'en_curso' ? 'pendiente' : null;
  return html`
    <article class="kc ${t.estado === 'hecha' ? 'kc--hecha' : ''}" draggable="true" data-tdrag="${t.id}" data-q="${textoBusqueda(t)}" style="--c:${color}">
      <button class="kc__cuerpo" type="button" data-action="${accionAbrir}" data-id="${t.id}">
        <span class="kc__tags">
          ${canal ? html`<span class="kc__tag" style="--c:var(--pink)">${icono('image', 'i--sm')} Publicación · ${canal.label}</span>` : ''}
          ${proy ? html`<span class="kc__tag" style="--c:${color}">${proy.titulo}</span>` : ''}
          ${t.prioridad === 'alta' && t.estado !== 'hecha' ? html`<span class="kc__tag kc__tag--alta">Alta</span>` : ''}
        </span>
        <strong class="kc__tit">${t.titulo}</strong>
        ${t.detalle ? html`<span class="kc__det">${t.detalle}</span>` : ''}
      </button>
      <div class="kc__pie">
        ${t.vence ? html`<span class="kc__fecha ${vencida ? 'kc__fecha--bad' : ''}">${icono('calendar', 'i--sm')} ${fechaDiaMes(t.vence)}</span>` : html`<span class="kc__fecha kc__fecha--vacia">Sin fecha</span>`}
        <span class="avatars">${(t.asignados || []).slice(0, 3).map((id) => avatar(nombreDe(id), 'sm'))}</span>
        <span class="kc__mover">
          ${ant ? html`<button class="icon-btn" type="button" data-action="tarea-mover" data-id="${t.id}" data-a="${ant}" aria-label="Pasar a ${ESTADOS_TAREA[ant].label}">${icono('chev-l', 'i--sm')}</button>` : ''}
          ${sig ? html`<button class="icon-btn" type="button" data-action="tarea-mover" data-id="${t.id}" data-a="${sig}" aria-label="Pasar a ${ESTADOS_TAREA[sig].label}">${icono('chev-r', 'i--sm')}</button>` : ''}
        </span>
      </div>
    </article>`;
}

function tablero(arr) {
  const corte = sumarDias(hoy(), -30);
  const por = (k) => arr.filter((t) => (t.estado || 'pendiente') === k && (k !== 'hecha' || filtro.estado === 'todas' || (t.hechaEn || '9') >= corte))
    .sort((a, b) => (a.vence || '9').localeCompare(b.vence || '9') || (b.prioridad === 'alta') - (a.prioridad === 'alta'));
  const cols = COLUMNAS.map((c) => ({ ...c, items: por(c.k) }));
  return html`
    <div class="kb__tabs seg seg--block" role="tablist" aria-label="Columna">
      ${cols.map((c) => html`<button class="seg__btn" type="button" role="tab" data-action="tareas-col" data-k="${c.k}" aria-selected="${filtro.col === c.k}">${c.tab || c.label} <span class="num seg__n">${c.items.length}</span></button>`)}
    </div>
    <div class="kb">
      ${cols.map((c) => html`
        <section class="kb__col ${filtro.col === c.k ? 'kb__col--activa' : ''}" data-estado="${c.k}" style="--c:${c.color}">
          <header class="kb__cab"><span class="kb__punto"></span><h3>${c.label}</h3><span class="num kb__n">${c.items.length}</span></header>
          <div class="kb__lista">${c.items.length ? c.items.map(tarjeta) : html`<p class="kb__vacio">${c.k === 'hecha' ? 'Aquí aparecen las que se terminan.' : 'Nada por aquí.'}</p>`}</div>
        </section>`)}
    </div>`;
}

function fila(t) {
  const vencida = t.estado !== 'hecha' && t.vence && t.vence < hoy();
  const canal = t.esPublicacion ? (CANALES[t.canal] || CANALES.instagram) : null;
  return html`
    <div class="row ${t.estado === 'hecha' ? 'row--done' : ''}" data-q="${textoBusqueda(t)}">
      <button class="icon-btn" type="button" data-action="${t.esPublicacion ? 'publicacion-toggle' : 'tarea-toggle'}" data-id="${t.id}" aria-label="${t.estado === 'hecha' ? 'Reabrir' : 'Marcar como hecha'}: ${t.titulo}" style="margin-left:-8px;${t.estado === 'hecha' ? 'color:var(--ok)' : ''}">${icono(t.estado === 'hecha' ? 'circle-check' : 'circle', 'i--lg')}</button>
      <button class="row__main" type="button" data-action="${t.esPublicacion ? 'publicacion-asignada' : 'tarea-editar'}" data-id="${t.id}" style="text-align:left">
        <span class="row__title">${canal ? html`<span class="tag tag--pub" style="margin-right:6px">${canal.label}</span>` : ''}${t.prioridad === 'alta' && t.estado !== 'hecha' ? html`<span class="tag tag--bad" style="margin-right:6px">Alta</span>` : ''}${t.titulo}</span>
        <span class="row__sub">
          ${t.vence ? html`<span style="${vencida ? 'color:var(--bad)' : ''}">${icono('calendar')} ${fechaRelativa(t.vence)}</span>` : ''}
          ${t.esPublicacion && t.estadoPub === 'listo' ? html`<span class="tag tag--ok">Lista para publicar</span>` : t.estado === 'en_curso' || t.estado === 'falta_info' ? html`<span class="tag ${ESTADOS_TAREA[t.estado].tag}">${ESTADOS_TAREA[t.estado].label}</span>` : ''}
        </span>
      </button>
      <span class="avatars" title="${(t.asignados || []).map(nombreDe).join(', ')}">${(t.asignados || []).slice(0, 3).map((id) => avatar(nombreDe(id), 'sm'))}</span>
    </div>`;
}

export const vistaTareas = {
  titulo: 'Tareas',
  render() {
    const todas = [...tareas(), ...publicacionesComoTareas()];
    const yoId = yo().personaId;
    let arr = todas;
    if (filtro.persona === '_yo') arr = arr.filter((t) => (t.asignados || []).includes(yoId));
    else if (filtro.persona === '_nadie') arr = arr.filter((t) => !(t.asignados || []).length);
    else if (filtro.persona) arr = arr.filter((t) => (t.asignados || []).includes(filtro.persona));
    if (filtro.proyecto === '_ninguno') arr = arr.filter((t) => !t.proyectoId);
    else if (filtro.proyecto) arr = arr.filter((t) => t.proyectoId === filtro.proyecto);
    const lista = filtro.vista !== 'tablero';
    const proys = proyectos();
    const grupos = agruparTareas(filtro.estado === 'abiertas' ? arr.filter((t) => t.estado !== 'hecha') : arr);
    const quienes = personas();

    return html`
      <div class="tareas">
        <div class="seg seg--block tareas__vistas" role="tablist" aria-label="Cómo ver las tareas">
          <button class="seg__btn" type="button" role="tab" data-action="tareas-vista" data-v="lista" aria-selected="${lista}">${icono('list', 'i--sm')} Lista</button>
          <button class="seg__btn" type="button" role="tab" data-action="tareas-vista" data-v="tablero" aria-selected="${!lista}">${icono('tasks', 'i--sm')} Tablero</button>
          <button class="seg__btn" type="button" role="tab" data-action="tareas-cronograma" aria-selected="false">${icono('calendar', 'i--sm')} Cronograma</button>
        </div>

        <form class="rapida" data-form="tarea-rapida" style="margin-top:var(--sp-4)">
          <input class="input" name="titulo" placeholder="Agregar una tarea…" aria-label="Nueva tarea" autocomplete="off" enterkeyhint="done">
          <button class="btn btn--primary" type="submit">${icono('plus', 'i--sm')} Agregar</button>
        </form>

        <div class="tareas__buscar">
          <label class="buscador">${icono('search', 'i--sm')}<input class="buscador__in" type="search" name="q" placeholder="Buscar tareas…" aria-label="Buscar tareas" autocomplete="off"></label>
          ${proys.length ? html`<select class="select select--sm" name="proyecto" aria-label="Filtrar por proyecto"><option value="">Todos los proyectos</option>${proys.map((p) => html`<option value="${p.id}" ${filtro.proyecto === p.id ? 'selected' : ''}>${p.titulo}</option>`)}<option value="_ninguno" ${filtro.proyecto === '_ninguno' ? 'selected' : ''}>Sin proyecto</option></select>` : ''}
        </div>

        <div class="chips chips--scroll" role="group" aria-label="Filtrar por persona" style="margin-top:var(--sp-3)">
          <button class="chip" type="button" data-action="tareas-filtro" data-p="" aria-pressed="${!filtro.persona}">Todas</button>
          <button class="chip" type="button" data-action="tareas-filtro" data-p="_yo" aria-pressed="${filtro.persona === '_yo'}">Mías</button>
          <button class="chip" type="button" data-action="tareas-filtro" data-p="_nadie" aria-pressed="${filtro.persona === '_nadie'}">Sin asignar</button>
          ${quienes.filter((p) => p.id !== yoId).map((p) => html`<button class="chip" type="button" data-action="tareas-filtro" data-p="${p.id}" aria-pressed="${filtro.persona === p.id}">${p.nombre}</button>`)}
        </div>
        ${lista ? html`<div style="display:flex;justify-content:flex-end;margin-top:var(--sp-2)">
          <button class="btn btn--ghost btn--sm" type="button" data-action="tareas-hechas">${filtro.estado === 'abiertas' ? 'Mostrar hechas' : 'Ocultar hechas'}</button>
        </div>` : ''}

        ${!lista ? html`<div style="margin-top:var(--sp-4)">${tablero(arr)}</div>` : grupos.length ? grupos.map((g) => html`
          <section class="section" style="margin-top:var(--sp-5)">
            <div class="section__head"><h3 class="section__title" style="${g.tono === 'bad' ? 'color:var(--bad)' : ''}">${g.titulo} <span class="faint num" style="font-weight:500">${g.items.length}</span></h3></div>
            <div class="panel"><div class="list">${g.items.map(fila)}</div></div>
          </section>`)
          : html`<div class="panel" style="margin-top:var(--sp-5)">${todas.length ? vacio({ icon: 'circle-check', titulo: 'Todo al día', texto: 'No hay tareas con este filtro.' }) : vacio({ icon: 'tasks', titulo: 'Aún no hay tareas', texto: 'Asigna a cada voluntario lo que le toca, con fecha y ligado a un evento si quieres.', boton: { accion: 'tarea-nueva', texto: 'Crear la primera tarea' } })}</div>`}
      </div>`;
  },
  montar(raiz) {
    // Buscar: filtra en pantalla sin volver a dibujar (así no se pierde el cursor).
    const q = raiz.querySelector('input[name=q]');
    q?.addEventListener('input', () => {
      const t = q.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      raiz.querySelectorAll('[data-q]').forEach((el) => { el.hidden = !!t && !el.dataset.q.includes(t); });
      raiz.querySelectorAll('.tareas .section').forEach((sec) => { sec.hidden = !!t && ![...sec.querySelectorAll('[data-q]')].some((el) => !el.hidden); });
    });
    raiz.querySelector('select[name=proyecto]')?.addEventListener('change', (e) => { filtro.proyecto = e.target.value; refrescar(); });
    const f = raiz.querySelector('[data-form=tarea-rapida]');
    if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const titulo = f.titulo.value.trim();
      if (!titulo) { f.titulo.focus(); return; }
      const id = nuevoId('ta');
      guardar([{ c: 'tareas', id, data: { equipoId: EQUIPO_CREATIVO, titulo, detalle: '', asignados: [], inicio: '', vence: '', prioridad: 'normal', estado: 'pendiente', eventoId: '', creada: hoy(), hechaEn: '' } }]);
      f.titulo.value = '';
      toast('Tarea creada', { accion: { texto: 'Asignar', fn: () => acciones['tarea-editar']({ dataset: { id } }) } });
    });
  },
};

function moverTarea(id, estado) {
  const pub = publicacion(id);
  if (pub) {
    const nuevo = TAREA_A_PUB[estado];
    if (!nuevo || pub.estado === nuevo) return;
    const { id: _omitido, ...resto } = pub;
    const undoPub = guardar([{ c: 'publicaciones', id, data: { ...resto, estado: nuevo } }]);
    toast(`Publicación: ${ESTADOS_TAREA[estado].label.toLowerCase()}`, { accion: { texto: 'Deshacer', fn: undoPub }, ms: 2500 });
    return;
  }
  const t = tareas().find((x) => x.id === id);
  if (!t || t.estado === estado || !ESTADOS_TAREA[estado]) return;
  const hecha = estado === 'hecha';
  const undo = guardar([{ c: 'tareas', id, data: { ...t, estado, hechaEn: hecha ? hoy() : '' } }]);
  toast(`Pasó a ${ESTADOS_TAREA[estado].label.toLowerCase()}`, { accion: { texto: 'Deshacer', fn: undo }, ms: 2500 });
}

// Arrastrar tarjetas entre columnas (escritorio)
document.addEventListener('dragstart', (e) => { const el = e.target.closest?.('[data-tdrag]'); if (!el) return; e.dataTransfer.setData('text/tarea', el.dataset.tdrag); e.dataTransfer.effectAllowed = 'move'; el.classList.add('kc--arrastrando'); });
document.addEventListener('dragend', (e) => e.target.closest?.('[data-tdrag]')?.classList.remove('kc--arrastrando'));
document.addEventListener('dragover', (e) => { if (e.target.closest?.('.kb__col') && e.dataTransfer?.types?.includes('text/tarea')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
document.addEventListener('drop', (e) => {
  const col = e.target.closest?.('.kb__col');
  const id = e.dataTransfer?.getData('text/tarea');
  if (!col || !id) return;
  e.preventDefault();
  try { moverTarea(id, col.dataset.estado); } catch (err) { toast(err.message || 'No se pudo mover', { tipo: 'error' }); }
});

registrarAcciones({
  'tareas-vista': (el) => { filtro.vista = el.dataset.v; try { localStorage.setItem(CLAVE_VISTA, filtro.vista); } catch { /* sin almacenamiento */ } refrescar(); },
  'tareas-col': (el) => { filtro.col = el.dataset.k; refrescar(); },
  'tareas-cronograma': () => { vistaCalendario.cambiar((e) => { e.vista = 'gantt'; }); ir('calendario'); },
  'tarea-mover': (el) => moverTarea(el.dataset.id, el.dataset.a),
  'tareas-filtro': (el) => { filtro.persona = el.dataset.p; refrescar(); },
  'tareas-hechas': () => { filtro.estado = filtro.estado === 'abiertas' ? 'todas' : 'abiertas'; refrescar(); },
  'ir-tareas': () => ir('tareas'),
});
