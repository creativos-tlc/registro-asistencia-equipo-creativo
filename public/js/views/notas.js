/* Hoja de notas del equipo: una sola hoja larga hecha de líneas (bloques).
   Cada línea se guarda por separado, así dos personas escribiendo a la vez no se pisan entre sí. */
import { esLider, guardar, obtener } from '../store.js';
import { EQUIPO_CREATIVO, HOJA_NOTAS, NOTA_COLORES, NOTA_TIPOS } from '../model.js';
import { bloquesNotas } from '../datos.js';
import { html, icono, nuevoId, raw } from '../util.js';
import { abrirHoja, cerrarHoja, registrarAcciones, toast } from '../ui.js';
import { refrescar } from '../router.js';
import { formTarea } from '../hojas/tarea.js';

const est = { foco: null, enfocar: null, seleccion: false, sel: new Set() };
const pendientes = new Map(); // id -> texto aún sin guardar
let temporizador = null;

// ---------- orden de las líneas ----------
const ordenEntre = (a, b) => (a == null && b == null ? 1024 : a == null ? b - 1024 : b == null ? a + 1024 : (a + b) / 2);

function vaciarPendientes() {
  clearTimeout(temporizador);
  const ops = [];
  pendientes.forEach((texto, id) => {
    const d = obtener('notas', id);
    if (d && d.texto !== texto) ops.push({ c: 'notas', id, data: { ...d, texto } });
  });
  pendientes.clear();
  if (ops.length) guardar(ops);
}

const objetivos = () => (est.seleccion ? [...est.sel] : est.foco ? [est.foco] : []).filter((id) => obtener('notas', id));

function actualizar(ids, cambio) {
  vaciarPendientes();
  const ops = ids.map((id) => { const d = obtener('notas', id); const { id: _omitido, ...resto } = d; return { c: 'notas', id, data: { ...resto, ...cambio(d) } }; });
  if (ops.length) guardar(ops);
  refrescar();
}

function crearDespues(idRef, { tipo = 'p', texto = '' } = {}) {
  vaciarPendientes();
  const todos = bloquesNotas();
  const i = idRef ? todos.findIndex((b) => b.id === idRef) : todos.length - 1;
  const orden = ordenEntre(todos[i]?.orden ?? null, todos[i + 1]?.orden ?? null);
  const ref = todos[i];
  const id = nuevoId('nb');
  guardar([{ c: 'notas', id, data: { equipoId: EQUIPO_CREATIVO, hoja: HOJA_NOTAS, orden, tipo, texto, hecho: false, b: false, color: ref && ref.color && tipo !== 'h1' ? ref.color : '' } }]);
  est.enfocar = id;
  est.foco = id;
  refrescar();
}

// ---------- dibujo ----------
function lineaHTML(b, edita) {
  const t = b.tipo || 'p';
  const marcaSel = est.seleccion ? html`<span class="nb__sel" aria-hidden="true">${icono(est.sel.has(b.id) ? 'circle-check' : 'circle')}</span>` : '';
  const guia = t === 'check'
    ? html`<button class="nb__lead" type="button" ${raw(edita ? `data-action="nota-check" data-id="${b.id}"` : 'disabled')} aria-pressed="${!!b.hecho}" aria-label="${b.hecho ? 'Hecha' : 'Pendiente'}: marcar">${icono(b.hecho ? 'circle-check' : 'circle', 'i--lg')}</button>`
    : t === 'bullet' ? html`<span class="nb__punto" aria-hidden="true">•</span>` : '';
  const placeholder = t === 'h1' ? 'Título' : t === 'h2' ? 'Subtítulo' : 'Escribe aquí…';
  const cuerpo = edita
    ? html`<textarea class="nb__txt" id="nb-${b.id}" rows="1" data-id="${b.id}" placeholder="${placeholder}" aria-label="Línea de la hoja de notas" enterkeyhint="enter">${b.texto || ''}</textarea>`
    : html`<div class="nb__txt nb__txt--ro">${b.texto || ''}</div>`;
  return html`<div class="nb nb--${t}${b.b ? ' nb--b' : ''}${b.hecho && t === 'check' ? ' nb--hecho' : ''}${est.sel.has(b.id) ? ' nb--elegida' : ''}" data-nb="${b.id}">${marcaSel}${guia}${cuerpo}</div>`;
}

function barra() {
  const bt = (accion, texto, ic, attrs = '') => html`<button class="chip" type="button" data-action="${accion}" ${raw(attrs)}>${ic ? icono(ic, 'i--sm') : ''}${texto}</button>`;
  if (est.seleccion) {
    return html`<span class="notas__cuenta num">${est.sel.size} ${est.sel.size === 1 ? 'línea' : 'líneas'}</span>
      ${bt('nota-color', 'Color', 'sliders')}${bt('nota-eliminar', 'Eliminar', 'trash')}${bt('nota-seleccionar', 'Listo', 'check')}`;
  }
  return html`
    ${Object.entries(NOTA_TIPOS).map(([k, v]) => html`<button class="chip" type="button" data-action="nota-tipo" data-t="${k}" aria-pressed="false">${v.label}</button>`)}
    <button class="chip" type="button" data-action="nota-negrita" aria-pressed="false"><strong>N</strong> Negrita</button>
    ${bt('nota-color', 'Color', 'sliders')}
    ${bt('nota-subir', '', 'arrow-up', 'aria-label="Subir línea"')}${bt('nota-bajar', '', 'arrow-down', 'aria-label="Bajar línea"')}
    ${bt('nota-tarea', 'A tarea', 'tasks')}
    ${bt('nota-seleccionar', 'Seleccionar', 'list')}
    ${bt('nota-eliminar', '', 'trash', 'aria-label="Eliminar línea"')}`;
}

export function renderNotas() {
  vaciarPendientes();
  const edita = esLider();
  const lineas = bloquesNotas();
  const grupos = [];
  lineas.forEach((b) => {
    const color = b.color || '';
    const ult = grupos[grupos.length - 1];
    if (ult && ult.color === color) ult.items.push(b); else grupos.push({ color, items: [b] });
  });
  return html`
    <div class="notas${est.seleccion ? ' notas--sel' : ''}">
      ${edita ? html`<div class="notas__barra chips chips--scroll" role="toolbar" aria-label="Formato de la línea">${barra()}</div>` : html`<p class="hint">Solo los líderes escriben aquí. Tú puedes leerla.</p>`}
      <div class="notas__hoja panel">
        ${lineas.length
          ? grupos.map((g) => (g.color && NOTA_COLORES[g.color]
              ? html`<div class="banda" style="--c:${NOTA_COLORES[g.color].color}">${g.items.map((b) => lineaHTML(b, edita))}</div>`
              : html`<div class="grupo">${g.items.map((b) => lineaHTML(b, edita))}</div>`))
          : html`<div class="empty">${icono('file')}<p class="empty__title">La hoja está vacía</p><p class="empty__text">${edita ? 'Escribe ideas, tareas que vienen y pendientes. Después las puedes repartir por fecha y persona.' : 'Todavía no hay notas.'}</p>${edita ? html`<button class="btn btn--primary" type="button" data-action="nota-agregar">Empezar a escribir</button>` : ''}</div>`}
      </div>
      ${edita && lineas.length ? html`<button class="btn btn--soft notas__mas" type="button" data-action="nota-agregar">${icono('plus', 'i--sm')} Agregar línea</button>` : ''}
    </div>`;
}

function autoAjustar(ta) { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; }

function marcarBarra(raiz) {
  const d = est.foco ? obtener('notas', est.foco) : null;
  raiz.querySelectorAll('[data-action=nota-tipo]').forEach((b) => b.setAttribute('aria-pressed', String(!!d && (d.tipo || 'p') === b.dataset.t)));
  raiz.querySelector('[data-action=nota-negrita]')?.setAttribute('aria-pressed', String(!!d?.b));
}

export function montarNotas(raiz) {
  const cont = raiz.querySelector('.notas');
  if (!cont) return;
  cont.querySelectorAll('textarea.nb__txt').forEach(autoAjustar);
  marcarBarra(cont);

  if (est.enfocar) {
    const ta = cont.querySelector(`#nb-${est.enfocar}`);
    if (ta) { ta.focus(); const n = ta.value.length; ta.setSelectionRange(n, n); }
    est.enfocar = null;
  }

  cont.addEventListener('pointerdown', (e) => { if (e.target.closest('.notas__barra button')) e.preventDefault(); });
  cont.addEventListener('focusin', (e) => {
    const ta = e.target.closest('textarea.nb__txt');
    if (ta) { est.foco = ta.dataset.id; marcarBarra(cont); }
  });
  cont.addEventListener('focusout', (e) => {
    if (e.target.matches?.('textarea.nb__txt')) vaciarPendientes();
  });
  cont.addEventListener('input', (e) => {
    const ta = e.target.closest('textarea.nb__txt');
    if (!ta) return;
    autoAjustar(ta);
    pendientes.set(ta.dataset.id, ta.value);
    clearTimeout(temporizador);
    temporizador = setTimeout(vaciarPendientes, 500);
  });
  cont.addEventListener('keydown', (e) => {
    const ta = e.target.closest('textarea.nb__txt');
    if (!ta || e.isComposing) return;
    const id = ta.dataset.id;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      pendientes.set(id, ta.value);
      vaciarPendientes();
      const d = obtener('notas', id);
      const tipo = d.tipo || 'p';
      if ((tipo === 'check' || tipo === 'bullet') && !ta.value.trim()) { est.enfocar = id; actualizar([id], () => ({ tipo: 'p' })); return; }
      crearDespues(id, { tipo: tipo === 'check' || tipo === 'bullet' ? tipo : 'p' });
    } else if (e.key === 'Backspace' && ta.value === '') {
      const todos = bloquesNotas();
      if (todos.length > 1) {
        e.preventDefault();
        const i = todos.findIndex((b) => b.id === id);
        est.enfocar = (todos[i - 1] || todos[i + 1]).id;
        pendientes.delete(id);
        guardar([{ c: 'notas', id, data: null }]);
        refrescar();
      }
    }
  });
  cont.addEventListener('click', (e) => {
    if (!est.seleccion) return;
    const linea = e.target.closest('.nb');
    if (!linea) return;
    const id = linea.dataset.nb;
    if (est.sel.has(id)) est.sel.delete(id); else est.sel.add(id);
    refrescar();
  });
}

// ---------- acciones ----------
function elegirColor() {
  const ids = objetivos();
  if (!ids.length) { toast('Toca una línea primero', { tipo: 'error' }); return; }
  abrirHoja({
    titulo: ids.length > 1 ? `Color para ${ids.length} líneas` : 'Color de la línea',
    cuerpo: html`<p class="muted" style="font-size:var(--t-sm)">Las líneas seguidas con el mismo color forman un solo bloque.</p>
      <div class="swatches">${Object.entries(NOTA_COLORES).map(([k, v]) => html`<button class="swatch" type="button" style="--c:${v.color}" data-action="nota-color-poner" data-c="${k}"><span class="swatch__punto"></span>${v.label}</button>`)}
      <button class="swatch" type="button" data-action="nota-color-poner" data-c="">Sin color</button></div>`,
  });
}

registrarAcciones({
  'nota-agregar': () => crearDespues(est.foco && obtener('notas', est.foco) ? est.foco : null),
  'nota-check': (el) => { const d = obtener('notas', el.dataset.id); actualizar([el.dataset.id], () => ({ hecho: !d.hecho })); },
  'nota-tipo': (el) => { const ids = objetivos(); if (ids.length) { est.enfocar = est.foco; actualizar(ids, () => ({ tipo: el.dataset.t })); } },
  'nota-negrita': () => { const ids = objetivos(); if (ids.length) { const nuevo = !obtener('notas', ids[0]).b; est.enfocar = est.foco; actualizar(ids, () => ({ b: nuevo })); } },
  'nota-color': elegirColor,
  'nota-color-poner': (el) => { const ids = objetivos(); cerrarHoja(); est.sel.clear(); actualizar(ids, () => ({ color: el.dataset.c })); },
  'nota-subir': () => mover(-1),
  'nota-bajar': () => mover(1),
  'nota-tarea': () => {
    const ids = objetivos();
    const d = ids[0] && obtener('notas', ids[0]);
    if (!d || !d.texto?.trim()) { toast('Escribe algo en la línea para convertirla en tarea', { tipo: 'error' }); return; }
    formTarea({ base: { titulo: d.texto.trim() } });
  },
  'nota-seleccionar': () => { est.seleccion = !est.seleccion; est.sel.clear(); if (est.seleccion && est.foco) est.sel.add(est.foco); refrescar(); },
  'nota-eliminar': () => {
    const ids = objetivos();
    if (!ids.length) { toast('Toca una línea primero', { tipo: 'error' }); return; }
    vaciarPendientes();
    const undo = guardar(ids.map((id) => ({ c: 'notas', id, data: null })));
    est.sel.clear();
    est.foco = null;
    refrescar();
    toast(ids.length > 1 ? `${ids.length} líneas eliminadas` : 'Línea eliminada', { accion: { texto: 'Deshacer', fn: () => { undo(); refrescar(); } } });
  },
});

function mover(dir) {
  if (!est.foco) { toast('Toca una línea primero', { tipo: 'error' }); return; }
  vaciarPendientes();
  const todos = bloquesNotas();
  const i = todos.findIndex((b) => b.id === est.foco);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= todos.length) return;
  const a = todos[i]; const b = todos[j];
  const { id: _a, ...da } = a; const { id: _b, ...db } = b;
  guardar([{ c: 'notas', id: a.id, data: { ...da, orden: b.orden } }, { c: 'notas', id: b.id, data: { ...db, orden: a.orden } }]);
  est.enfocar = a.id;
  refrescar();
}
