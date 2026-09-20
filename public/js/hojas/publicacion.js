import { guardar } from '../store.js';
import { CANALES, EQUIPO_CREATIVO, ESTADOS_CONTENIDO } from '../model.js';
import { personas, publicacion } from '../datos.js';
import { html, hoy, icono, nuevoId, poner, raw, sumarDias } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast } from '../ui.js';

const opcionesFormato = (canal, actual) => Object.entries(CANALES[canal].formatos).map(([k, v]) => html`<option value="${k}" ${raw(k === actual ? 'selected' : '')}>${v}</option>`);

export function formPublicacion({ base = null, fecha = hoy(), hora = '', canal = 'instagram' } = {}) {
  const b = base || {};
  const esNueva = !b.id;
  const c = b.canal || canal;
  abrirHoja({
    titulo: esNueva ? 'Nueva publicación' : 'Editar publicación',
    ancha: true,
    cuerpo: html`
      <form id="fPub" class="form-grid" novalidate data-id="${b.id || ''}">
        <div class="field"><span class="label">Canal</span>
          <div class="chips">${Object.entries(CANALES).map(([k, v]) => html`<label class="chip chip--radio" style="--c:${v.color}"><input class="sr-only" type="radio" name="canal" value="${k}" ${raw(k === c ? 'checked' : '')}>${icono(v.icono, 'i--sm')}${v.label}</label>`)}</div></div>
        <div class="field"><label for="pu-titulo">Título</label><input class="input" id="pu-titulo" name="titulo" value="${b.titulo || ''}" placeholder="Ej: Reflexión del domingo" autocomplete="off" autofocus></div>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="pu-fecha">Fecha</label><input class="input" id="pu-fecha" name="fecha" type="date" value="${b.fecha || fecha}"></div>
          <div class="field"><label for="pu-hora">Hora <span class="opt">(opcional)</span></label><input class="input" id="pu-hora" name="hora" type="time" value="${b.hora ?? hora}"></div>
        </div>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="pu-formato">Formato</label><select class="select" id="pu-formato" name="formato">${opcionesFormato(c, b.formato)}</select></div>
          <div class="field"><label for="pu-estado">Estado</label><select class="select" id="pu-estado" name="estado">${Object.entries(ESTADOS_CONTENIDO).map(([k, v]) => html`<option value="${k}" ${raw((b.estado || 'idea') === k ? 'selected' : '')}>${v.label}</option>`)}</select></div>
        </div>
        <div class="field"><label for="pu-resp">Responsable <span class="opt">(opcional)</span></label>
          <select class="select" id="pu-resp" name="responsableId"><option value="">Sin asignar</option>${personas().map((p) => html`<option value="${p.id}" ${raw(b.responsableId === p.id ? 'selected' : '')}>${p.nombre}</option>`)}</select></div>
        <div class="field"><label for="pu-det">Texto o idea <span class="opt">(opcional)</span></label><textarea class="textarea" id="pu-det" name="detalle" placeholder="Copy, referencias, qué material se necesita…">${b.detalle || ''}</textarea></div>
      </form>`,
    pie: html`
      ${esNueva ? '' : html`
        <button class="icon-btn icon-btn--danger" type="button" data-action="publicacion-eliminar" data-id="${b.id}" aria-label="Eliminar publicación">${icono('trash')}</button>
        <button class="icon-btn" type="button" data-action="publicacion-duplicar" data-id="${b.id}" aria-label="Duplicar publicación">${icono('copy')}</button>`}
      <span class="spacer"></span>
      <button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button>
      <button class="btn btn--primary" type="button" data-action="publicacion-guardar" style="flex:0 0 auto">${esNueva ? 'Crear' : 'Guardar'}</button>`,
  });
  const form = document.getElementById('fPub');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'canal') poner(form.formato, opcionesFormato(e.target.value));
  });
}

function guardarPublicacion() {
  const form = document.getElementById('fPub');
  const d = leerForm(form);
  if (!d.titulo) { marcarError(form.titulo, 'Escribe un título'); return; }
  if (!d.fecha) { marcarError(form.fecha, 'Elige una fecha'); return; }
  const id = form.dataset.id || nuevoId('pu');
  guardar([{ c: 'publicaciones', id, data: { equipoId: EQUIPO_CREATIVO, canal: d.canal, formato: d.formato, titulo: d.titulo, fecha: d.fecha, hora: d.hora || '', estado: d.estado, responsableId: d.responsableId || '', detalle: d.detalle || '' } }]);
  cerrarHoja();
  toast(form.dataset.id ? 'Publicación guardada' : 'Publicación creada');
}

registrarAcciones({
  'publicacion-nueva': (el) => formPublicacion({ fecha: el?.dataset.fecha || hoy(), hora: el?.dataset.hora || '', canal: el?.dataset.canal || 'instagram' }),
  'publicacion-editar': (el) => formPublicacion({ base: publicacion(el.dataset.id) }),
  'publicacion-guardar': guardarPublicacion,
  'publicacion-duplicar': (el) => {
    const p = publicacion(el.dataset.id);
    formPublicacion({ base: { ...p, id: '', fecha: sumarDias(p.fecha, 1), estado: 'idea' } });
  },
  'publicacion-eliminar': async (el) => {
    const p = publicacion(el.dataset.id);
    if (!(await confirmar({ titulo: `Eliminar "${p.titulo}"`, mensaje: 'Podrás deshacerlo unos segundos.' }))) return;
    const undo = guardar([{ c: 'publicaciones', id: p.id, data: null }]);
    cerrarHoja();
    toast('Publicación eliminada', { accion: { texto: 'Deshacer', fn: undo } });
  },
});
