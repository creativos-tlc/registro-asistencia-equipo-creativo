import { guardar } from '../store.js';
import { EQUIPO_CREATIVO, ESTADOS_TAREA, PRIORIDADES } from '../model.js';
import { eventosOrdenados, nombreDe, personas, tarea } from '../datos.js';
import { fechaCorta, html, hoy, icono, nuevoId, raw, sumarDias } from '../util.js';
import { abrirHoja, avatar, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast } from '../ui.js';

export function formTarea({ base = null, fecha = '', eventoId = '', asignado = '' } = {}) {
  const b = base || {};
  const esNueva = !b.id;
  const asignados = new Set(b.asignados || (asignado ? [asignado] : []));
  const proximos = eventosOrdenados().filter((e) => e.fecha >= sumarDias(hoy(), -14));
  abrirHoja({
    titulo: esNueva ? 'Nueva tarea' : 'Editar tarea',
    ancha: true,
    cuerpo: html`
      <form id="fTarea" class="form-grid" novalidate data-id="${b.id || ''}">
        <div class="field"><label for="ta-titulo">¿Qué hay que hacer?</label><input class="input" id="ta-titulo" name="titulo" value="${b.titulo || ''}" placeholder="Ej: Editar el reel del domingo" autocomplete="off" autofocus></div>
        <div class="field">
          <span class="label">Asignada a</span>
          <div class="chips">${personas().map((p) => html`<label class="chip chip--check"><input class="sr-only" type="checkbox" name="asig" value="${p.id}" ${raw(asignados.has(p.id) ? 'checked' : '')}>${avatar(p.nombre, 'sm')}${p.nombre}</label>`)}</div>
          ${personas().length ? '' : html`<p class="hint">Aún no hay voluntarios. Agrégalos en Equipo.</p>`}
        </div>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="ta-vence">Fecha límite <span class="opt">(opcional)</span></label><input class="input" id="ta-vence" name="vence" type="date" value="${b.vence ?? fecha}"></div>
          <div class="field"><label for="ta-prio">Prioridad</label><select class="select" id="ta-prio" name="prioridad">${Object.entries(PRIORIDADES).map(([k, v]) => html`<option value="${k}" ${raw((b.prioridad || 'normal') === k ? 'selected' : '')}>${v}</option>`)}</select></div>
        </div>
        <div class="field"><label for="ta-estado">Estado</label><select class="select" id="ta-estado" name="estado">${Object.entries(ESTADOS_TAREA).map(([k, v]) => html`<option value="${k}" ${raw((b.estado || 'pendiente') === k ? 'selected' : '')}>${v.label}</option>`)}</select></div>
        <div class="field"><label for="ta-evento">Ligada a un evento <span class="opt">(opcional)</span></label>
          <select class="select" id="ta-evento" name="eventoId"><option value="">Ninguno</option>${proximos.map((e) => html`<option value="${e.id}" ${raw((b.eventoId || eventoId) === e.id ? 'selected' : '')}>${fechaCorta(e.fecha)} · ${e.titulo}</option>`)}</select></div>
        <div class="field"><label for="ta-det">Detalle <span class="opt">(opcional)</span></label><textarea class="textarea" id="ta-det" name="detalle" placeholder="Links, medidas, referencias…">${b.detalle || ''}</textarea></div>
      </form>`,
    pie: html`
      ${esNueva ? '' : html`<button class="icon-btn icon-btn--danger" type="button" data-action="tarea-eliminar" data-id="${b.id}" aria-label="Eliminar tarea">${icono('trash')}</button>`}
      <span class="spacer"></span>
      <button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button>
      <button class="btn btn--primary" type="button" data-action="tarea-guardar" style="flex:0 0 auto">${esNueva ? 'Crear tarea' : 'Guardar'}</button>`,
  });
}

function guardarTarea() {
  const form = document.getElementById('fTarea');
  const d = leerForm(form);
  if (!d.titulo) { marcarError(form.titulo, 'Escribe qué hay que hacer'); return; }
  const previa = form.dataset.id ? tarea(form.dataset.id) : null;
  const asignados = [...form.querySelectorAll('input[name=asig]:checked')].map((i) => i.value);
  const data = {
    equipoId: EQUIPO_CREATIVO, titulo: d.titulo, detalle: d.detalle || '', asignados, vence: d.vence || '', prioridad: d.prioridad, estado: d.estado,
    eventoId: d.eventoId || '', creada: previa?.creada || hoy(), hechaEn: d.estado === 'hecha' ? previa?.hechaEn || hoy() : '',
  };
  guardar([{ c: 'tareas', id: previa?.id || nuevoId('ta'), data }]);
  cerrarHoja();
  toast(previa ? 'Tarea guardada' : asignados.length ? `Tarea asignada a ${asignados.map(nombreDe).join(', ')}` : 'Tarea creada');
}

registrarAcciones({
  'tarea-nueva': (el) => formTarea({ fecha: el?.dataset.fecha || '', eventoId: el?.dataset.evento || '', asignado: el?.dataset.persona || '' }),
  'tarea-editar': (el) => formTarea({ base: tarea(el.dataset.id) }),
  'tarea-guardar': guardarTarea,
  'tarea-eliminar': async (el) => {
    const t = tarea(el.dataset.id);
    if (!(await confirmar({ titulo: `Eliminar "${t.titulo}"`, mensaje: 'Podrás deshacerlo unos segundos.' }))) return;
    const undo = guardar([{ c: 'tareas', id: t.id, data: null }]);
    cerrarHoja();
    toast('Tarea eliminada', { accion: { texto: 'Deshacer', fn: undo } });
  },
  'tarea-toggle': (el) => {
    const t = tarea(el.dataset.id);
    if (!t) return;
    const hecha = t.estado !== 'hecha';
    const undo = guardar([{ c: 'tareas', id: t.id, data: { ...t, estado: hecha ? 'hecha' : 'pendiente', hechaEn: hecha ? hoy() : '' } }]);
    if (hecha) toast('Tarea hecha', { accion: { texto: 'Deshacer', fn: undo }, ms: 2500 });
  },
});
