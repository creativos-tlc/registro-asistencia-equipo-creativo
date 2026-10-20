import { guardar, tienePermiso } from '../store.js';
import { CANALES, EQUIPO_CREATIVO, ESTADOS_CONTENIDO } from '../model.js';
import { personas, publicacion } from '../datos.js';
import { extraerEnlaces, fechaLarga, html, hoy, icono, nuevoId, poner, raw, sumarDias } from '../util.js';
import { nuevosEn, opsAviso, opsAvisoLideres, quien } from './avisos.js';
import { abrirHoja, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast } from '../ui.js';

const opcionesFormato = (canal, actual) => Object.entries(CANALES[canal].formatos).map(([k, v]) => html`<option value="${k}" ${raw(k === actual ? 'selected' : '')}>${v}</option>`);

/** Para quien tiene a cargo una publicación sin ser de Contenido: ve lo esencial y solo cambia en qué va y su texto. */
function formPublicacionAsignada(id) {
  const p = publicacion(id);
  if (!p) return;
  const c = CANALES[p.canal] || CANALES.instagram;
  abrirHoja({
    titulo: p.titulo,
    ancha: true,
    cuerpo: html`
      <form id="fPubAsignada" class="form-grid" novalidate data-id="${id}">
        <div class="row__sub" style="font-size:var(--t-md);color:var(--tx)">
          <span>${icono(c.icono)} ${c.label} · ${c.formatos[p.formato] || ''}</span>
          ${p.entrega ? html`<span>${icono('clock')} Entrega: ${fechaLarga(p.entrega)}</span>` : ''}
          <span>${icono('calendar')} Se publica: ${fechaLarga(p.fecha)}${p.hora ? ` · ${p.hora}` : ''}</span>
        </div>
        <div class="field"><span class="label">¿En qué va?</span>
          <div class="chips" role="radiogroup" aria-label="Estado de la publicación">${Object.entries(ESTADOS_CONTENIDO).map(([k, v]) => html`<label class="chip chip--radio chip--dot" style="--c:${v.color}"><input class="sr-only" type="radio" name="estado" value="${k}" ${raw((p.estado || 'idea') === k ? 'checked' : '')}>${v.label}</label>`)}</div>
          <p class="hint" id="pa-ayuda">${ESTADOS_CONTENIDO[p.estado || 'idea']?.ayuda || ''}</p></div>
        <div class="field"><label for="pa-det">Texto, material o lo que falta</label><textarea class="textarea" id="pa-det" name="detalle" placeholder="Copy, referencias, qué necesitas para terminarla…">${p.detalle || ''}</textarea>${chipsEnlaces(p.detalle)}</div>
      </form>`,
    pie: html`<button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button><button class="btn btn--primary" type="button" data-action="publicacion-asignada-guardar">Guardar</button>`,
  });
  document.getElementById('fPubAsignada').addEventListener('change', (e) => {
    if (e.target.name === 'estado') document.getElementById('pa-ayuda').textContent = ESTADOS_CONTENIDO[e.target.value]?.ayuda || '';
  });
}

export function formPublicacion({ base = null, fecha = hoy(), hora = '', canal = 'instagram', formato = '' } = {}) {
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
        <div class="field"><label for="pu-entrega">Entrega del material <span class="opt">(opcional)</span></label><input class="input" id="pu-entrega" name="entrega" type="date" value="${b.entrega || ''}"><p class="hint">Cuándo debe estar lista para publicarse. Si hay responsable, a él o ella le aparece como su fecha de entrega.</p></div>
        <div class="field"><label for="pu-formato">Formato</label><select class="select" id="pu-formato" name="formato">${opcionesFormato(c, b.formato || formato)}</select></div>
        <div class="field"><span class="label">¿En qué va?</span>
          <div class="chips" role="radiogroup" aria-label="Estado de la publicación">${Object.entries(ESTADOS_CONTENIDO).map(([k, v]) => html`<label class="chip chip--radio chip--dot" style="--c:${v.color}"><input class="sr-only" type="radio" name="estado" value="${k}" ${raw((b.estado || 'idea') === k ? 'checked' : '')}>${v.label}</label>`)}</div>
          <p class="hint" id="pu-estado-ayuda">${ESTADOS_CONTENIDO[b.estado || 'idea']?.ayuda || ''}</p></div>
        <div class="field"><label for="pu-resp">Responsable <span class="opt">(opcional)</span></label>
          <select class="select" id="pu-resp" name="responsableId"><option value="">Sin asignar</option>${personas().map((p) => html`<option value="${p.id}" ${raw(b.responsableId === p.id ? 'selected' : '')}>${p.nombre}</option>`)}</select></div>
        <div class="field"><label for="pu-det">Texto o idea <span class="opt">(opcional)</span></label><textarea class="textarea" id="pu-det" name="detalle" placeholder="Copy, referencias, qué material se necesita…">${b.detalle || ''}</textarea>${chipsEnlaces(b.detalle)}</div>
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
    if (e.target.name === 'estado') document.getElementById('pu-estado-ayuda').textContent = ESTADOS_CONTENIDO[e.target.value]?.ayuda || '';
  });
}

function guardarPublicacion() {
  const form = document.getElementById('fPub');
  const d = leerForm(form);
  if (!d.titulo) { marcarError(form.titulo, 'Escribe un título'); return; }
  if (!d.fecha) { marcarError(form.fecha, 'Elige una fecha'); return; }
  if (d.entrega && d.entrega > d.fecha) { marcarError(form.entrega, 'La entrega debe ser antes de publicar (o el mismo día)'); return; }
  const id = form.dataset.id || nuevoId('pu');
  const previa = form.dataset.id ? publicacion(form.dataset.id) : null;
  const avisos = [
    ...opsAviso(nuevosEn(previa?.responsableId ? [previa.responsableId] : [], d.responsableId ? [d.responsableId] : []), { tipo: 'publicacion', texto: `${quien()} te asignó la publicación: ${d.titulo}${d.entrega ? ` (entrega ${fechaLarga(d.entrega).toLowerCase()})` : ''}`, ref: { c: 'publicaciones', id } }),
    ...(d.estado === 'falta_info' && previa?.estado !== 'falta_info' ? opsAvisoLideres({ tipo: 'info', texto: `${quien()} marcó "Falta información" en la publicación: ${d.titulo}`, ref: { c: 'publicaciones', id } }) : []),
  ];
  guardar([{ c: 'publicaciones', id, data: { equipoId: EQUIPO_CREATIVO, canal: d.canal, formato: d.formato, titulo: d.titulo, fecha: d.fecha, hora: d.hora || '', entrega: d.entrega || '', estado: d.estado, responsableId: d.responsableId || '', detalle: d.detalle || '' } }, ...avisos]);
  cerrarHoja();
  toast(form.dataset.id ? 'Publicación guardada' : 'Publicación creada');
}

const chipsEnlaces = (texto) => { const e = extraerEnlaces(texto); return e.length ? html`<div class="chips" style="margin-top:var(--sp-2)">${e.map((u) => html`<a class="chip" href="${u}" target="_blank" rel="noopener noreferrer">${icono('link', 'i--sm')}<span class="trunc" style="max-width:220px">${u.replace(/^https?:\/\/(www\.)?/, '')}</span></a>`)}</div>` : ''; };

registrarAcciones({
  'publicacion-toggle': (el) => {
    const p = publicacion(el.dataset.id);
    if (!p) return;
    const nuevo = p.estado === 'listo' || p.estado === 'publicado' ? 'en_curso' : 'listo';
    const { id: _omitido, ...resto } = p;
    const undo = guardar([{ c: 'publicaciones', id: p.id, data: { ...resto, estado: nuevo } }]);
    toast(nuevo === 'listo' ? 'Lista para publicar' : 'Vuelve a estar en curso', { accion: { texto: 'Deshacer', fn: undo }, ms: 2500 });
  },
  'publicacion-asignada': (el) => (tienePermiso('contenido') ? formPublicacion({ base: publicacion(el.dataset.id) }) : formPublicacionAsignada(el.dataset.id)),
  'publicacion-asignada-guardar': () => {
    const form = document.getElementById('fPubAsignada');
    const d = leerForm(form);
    const p = publicacion(form.dataset.id);
    if (!p) return;
    const { id: _omitido, ...resto } = p;
    const avisoInfo = d.estado === 'falta_info' && p.estado !== 'falta_info' ? opsAvisoLideres({ tipo: 'info', texto: `${quien()} marcó "Falta información" en la publicación: ${p.titulo}`, ref: { c: 'publicaciones', id: p.id } }) : [];
    guardar([{ c: 'publicaciones', id: p.id, data: { ...resto, estado: d.estado || p.estado, detalle: d.detalle || '' } }, ...avisoInfo]);
    cerrarHoja();
    toast(d.estado === 'falta_info' ? 'Avisado: falta información' : 'Publicación guardada');
  },
  'publicacion-nueva': (el) => formPublicacion({ fecha: el?.dataset.fecha || hoy(), hora: el?.dataset.hora || '', canal: el?.dataset.canal || 'instagram', formato: el?.dataset.formato || '' }),
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
