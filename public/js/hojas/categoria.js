/* Categorías de evento: crear las propias y ajustar las de fábrica (nombre, color, ícono, qué se espera de ellas). */
import { guardar, lista } from '../store.js';
import { EQUIPO_CREATIVO, ICONOS_CATEGORIA, NOTA_COLORES, categoriaRegistro, esDeFabrica, tipoDe } from '../model.js';
import { eventos } from '../datos.js';
import { html, icono, nuevoId, raw } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast } from '../ui.js';
import { refrescar } from '../router.js';

const usos = (id) => eventos().filter((e) => e.tipo === id).length;

export function formCategoria(id = '') {
  const t = id ? tipoDe(id) : { label: '', color: 'var(--info)', icono: 'calendar', asistencia: false, programa: false, hora: ['', ''] };
  const reg = id ? categoriaRegistro(id) : null;
  const claveColor = (reg && reg.color) || Object.entries(NOTA_COLORES).find(([, v]) => v.color === t.color)?.[0] || 'azul';
  const n = id ? usos(id) : 0;
  abrirHoja({
    titulo: id ? 'Editar categoría' : 'Nueva categoría',
    ancha: true,
    cuerpo: html`
      <form id="fCategoria" class="form-grid" novalidate data-id="${id}">
        <div class="field"><label for="ca-nombre">Nombre</label><input class="input" id="ca-nombre" name="nombre" value="${t.label}" placeholder="Ej: Sesión ADN, Junta creativa, Fonda…" autocomplete="off" autofocus></div>
        <div class="field"><span class="label">Color</span>
          <div class="chips">${Object.entries(NOTA_COLORES).map(([k, v]) => html`<label class="chip chip--radio chip--dot" style="--c:${v.color}"><input class="sr-only" type="radio" name="color" value="${k}" ${raw(k === claveColor ? 'checked' : '')}>${v.label}</label>`)}</div></div>
        <div class="field"><span class="label">Ícono</span>
          <div class="chips">${ICONOS_CATEGORIA.map((k) => html`<label class="chip chip--radio" aria-label="${k}"><input class="sr-only" type="radio" name="icono" value="${k}" ${raw(k === t.icono ? 'checked' : '')}>${icono(k, 'i--sm')}</label>`)}</div></div>
        <label class="check"><input type="checkbox" name="asistencia" ${raw(t.asistencia ? 'checked' : '')}> Normalmente se toma asistencia</label>
        <label class="check"><input type="checkbox" name="programa" ${raw(t.programa ? 'checked' : '')}> Tiene programa o agenda (orden con horas y responsables)</label>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="ca-ini">Hora habitual <span class="opt">(opcional)</span></label><input class="input" id="ca-ini" name="horaIni" type="time" value="${t.hora[0] || ''}"></div>
          <div class="field"><label for="ca-fin">Termina <span class="opt">(opcional)</span></label><input class="input" id="ca-fin" name="horaFin" type="time" value="${t.hora[1] || ''}"></div>
        </div>
        ${id ? html`<label class="check"><input type="checkbox" name="oculta" ${raw(reg?.oculta ? 'checked' : '')}> Ocultar de la lista al crear eventos <span class="muted">(los ${n} ya creados se mantienen)</span></label>` : ''}
        <p class="hint">Una categoría dice qué tipo de evento es y qué se espera de él. El nombre del evento concreto (por ejemplo "Sesión ADN · octubre") va aparte, en su título.</p>
      </form>`,
    pie: html`
      ${id && !esDeFabrica(id) ? html`<button class="icon-btn icon-btn--danger" type="button" data-action="categoria-eliminar" data-id="${id}" aria-label="Eliminar categoría">${icono('trash')}</button>` : ''}
      <span class="spacer"></span>
      <button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button>
      <button class="btn btn--primary" type="button" data-action="categoria-guardar" style="flex:0 0 auto">${id ? 'Guardar' : 'Crear categoría'}</button>`,
  });
}

function guardarCategoria() {
  const form = document.getElementById('fCategoria');
  const d = leerForm(form);
  if (!d.nombre) { marcarError(form.nombre, 'Ponle un nombre a la categoría'); return; }
  const id = form.dataset.id;
  const otras = lista('categorias').filter((c) => c.id !== id).map((c) => c.nombre.toLowerCase());
  if (otras.includes(d.nombre.toLowerCase())) { marcarError(form.nombre, 'Ya hay una categoría con ese nombre'); return; }
  guardar([{ c: 'categorias', id: id || nuevoId('cat'), data: { equipoId: EQUIPO_CREATIVO, nombre: d.nombre, color: d.color || 'azul', icono: d.icono || 'calendar', asistencia: !!d.asistencia, programa: !!d.programa, horaIni: d.horaIni || '', horaFin: d.horaFin || '', oculta: !!d.oculta } }]);
  cerrarHoja();
  toast(id ? 'Categoría guardada' : 'Categoría creada');
  refrescar();
}

registrarAcciones({
  'categoria-nueva': () => formCategoria(''),
  'categoria-editar': (el) => formCategoria(el.dataset.id),
  'categoria-guardar': guardarCategoria,
  'categoria-eliminar': async (el) => {
    const id = el.dataset.id;
    const n = usos(id);
    if (n) { toast(`${n} eventos usan esta categoría. Ocúltala en vez de borrarla.`, { tipo: 'error' }); return; }
    if (!(await confirmar({ titulo: `Eliminar "${tipoDe(id).label}"`, mensaje: 'Ningún evento la usa. Podrás deshacerlo unos segundos.' }))) return;
    const undo = guardar([{ c: 'categorias', id, data: null }]);
    cerrarHoja();
    toast('Categoría eliminada', { accion: { texto: 'Deshacer', fn: undo } });
    refrescar();
  },
});
