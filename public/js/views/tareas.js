import { agruparTareas, nombreDe, personas, tareas } from '../datos.js';
import { fechaRelativa, hoy, html, icono, nuevoId } from '../util.js';
import { acciones, avatar, registrarAcciones, toast, vacio } from '../ui.js';
import { refrescar, ir } from '../router.js';
import { guardar, yo } from '../store.js';
import { EQUIPO_CREATIVO } from '../model.js';

const filtro = { persona: '', estado: 'abiertas' };

function fila(t) {
  const vencida = t.estado !== 'hecha' && t.vence && t.vence < hoy();
  return html`
    <div class="row ${t.estado === 'hecha' ? 'row--done' : ''}">
      <button class="icon-btn" type="button" data-action="tarea-toggle" data-id="${t.id}" aria-label="${t.estado === 'hecha' ? 'Reabrir' : 'Marcar como hecha'}: ${t.titulo}" style="margin-left:-8px;${t.estado === 'hecha' ? 'color:var(--ok)' : ''}">${icono(t.estado === 'hecha' ? 'circle-check' : 'circle', 'i--lg')}</button>
      <button class="row__main" type="button" data-action="tarea-editar" data-id="${t.id}" style="text-align:left">
        <span class="row__title">${t.prioridad === 'alta' && t.estado !== 'hecha' ? html`<span class="tag tag--bad" style="margin-right:6px">Alta</span>` : ''}${t.titulo}</span>
        <span class="row__sub">
          ${t.vence ? html`<span style="${vencida ? 'color:var(--bad)' : ''}">${icono('calendar')} ${fechaRelativa(t.vence)}</span>` : ''}
          ${t.estado === 'en_curso' ? html`<span class="tag tag--info">En curso</span>` : ''}
        </span>
      </button>
      <span class="avatars" title="${(t.asignados || []).map(nombreDe).join(', ')}">${(t.asignados || []).slice(0, 3).map((id) => avatar(nombreDe(id), 'sm'))}</span>
    </div>`;
}

export const vistaTareas = {
  titulo: 'Tareas',
  render() {
    const todas = tareas();
    const yoId = yo().personaId;
    let arr = todas;
    if (filtro.persona === '_yo') arr = arr.filter((t) => (t.asignados || []).includes(yoId));
    else if (filtro.persona === '_nadie') arr = arr.filter((t) => !(t.asignados || []).length);
    else if (filtro.persona) arr = arr.filter((t) => (t.asignados || []).includes(filtro.persona));
    if (filtro.estado === 'abiertas') arr = arr.filter((t) => t.estado !== 'hecha');
    const grupos = agruparTareas(arr);
    const quienes = personas();

    return html`
      <div class="tareas">
        <form class="rapida solo-lider" data-form="tarea-rapida">
          <input class="input" name="titulo" placeholder="Agregar una tarea…" aria-label="Nueva tarea" autocomplete="off" enterkeyhint="done">
          <button class="btn btn--primary" type="submit">${icono('plus', 'i--sm')} Agregar</button>
        </form>

        <div class="chips chips--scroll" role="group" aria-label="Filtrar por persona" style="margin-top:var(--sp-4)">
          <button class="chip" type="button" data-action="tareas-filtro" data-p="" aria-pressed="${!filtro.persona}">Todas</button>
          <button class="chip" type="button" data-action="tareas-filtro" data-p="_yo" aria-pressed="${filtro.persona === '_yo'}">Mías</button>
          <button class="chip" type="button" data-action="tareas-filtro" data-p="_nadie" aria-pressed="${filtro.persona === '_nadie'}">Sin asignar</button>
          ${quienes.filter((p) => p.id !== yoId).map((p) => html`<button class="chip" type="button" data-action="tareas-filtro" data-p="${p.id}" aria-pressed="${filtro.persona === p.id}">${p.nombre}</button>`)}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:var(--sp-2)">
          <button class="btn btn--ghost btn--sm" type="button" data-action="tareas-hechas">${filtro.estado === 'abiertas' ? 'Mostrar hechas' : 'Ocultar hechas'}</button>
        </div>

        ${grupos.length ? grupos.map((g) => html`
          <section class="section" style="margin-top:var(--sp-5)">
            <div class="section__head"><h3 class="section__title" style="${g.tono === 'bad' ? 'color:var(--bad)' : ''}">${g.titulo} <span class="faint num" style="font-weight:500">${g.items.length}</span></h3></div>
            <div class="panel"><div class="list">${g.items.map(fila)}</div></div>
          </section>`)
          : html`<div class="panel" style="margin-top:var(--sp-5)">${todas.length ? vacio({ icon: 'circle-check', titulo: 'Todo al día', texto: 'No hay tareas con este filtro.' }) : vacio({ icon: 'tasks', titulo: 'Aún no hay tareas', texto: 'Asigna a cada voluntario lo que le toca, con fecha y ligado a un evento si quieres.', boton: { accion: 'tarea-nueva', texto: 'Crear la primera tarea' } })}</div>`}
      </div>`;
  },
  montar(raiz) {
    const f = raiz.querySelector('[data-form=tarea-rapida]');
    if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const titulo = f.titulo.value.trim();
      if (!titulo) { f.titulo.focus(); return; }
      const id = nuevoId('ta');
      guardar([{ c: 'tareas', id, data: { equipoId: EQUIPO_CREATIVO, titulo, detalle: '', asignados: [], vence: '', prioridad: 'normal', estado: 'pendiente', eventoId: '', creada: hoy(), hechaEn: '' } }]);
      f.titulo.value = '';
      toast('Tarea creada', { accion: { texto: 'Asignar', fn: () => acciones['tarea-editar']({ dataset: { id } }) } });
    });
  },
};

registrarAcciones({
  'tareas-filtro': (el) => { filtro.persona = el.dataset.p; refrescar(); },
  'tareas-hechas': () => { filtro.estado = filtro.estado === 'abiertas' ? 'todas' : 'abiertas'; refrescar(); },
  'ir-tareas': () => ir('tareas'),
});
