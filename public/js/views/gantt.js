/* Carta Gantt: proyectos largos con inicio, entrega y responsables. Vive dentro del Calendario (vista "Gantt").
   En el celular cada proyecto es una fila con su título arriba y una pista debajo, así no hace falta columna fija ni arrastrar de lado. */
import { esLider, guardar } from '../store.js';
import { EQUIPO_CREATIVO, NOTA_COLORES } from '../model.js';
import { nombreDe, personas, proyecto, proyectos, tareas, tareasDeProyecto } from '../datos.js';
import { clamp, dif, fechaCorta, fechaDiaMes, hoy, html, icono, inicioSemana, nuevoId, nombreMes, plural, raw, sumarDias } from '../util.js';
import { abrirHoja, avatar, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast, vacio } from '../ui.js';
import { refrescar } from '../router.js';

const esAncho = () => matchMedia('(min-width: 720px)').matches;
const semanas = () => (esAncho() ? 12 : 8);
const COLORES = Object.entries(NOTA_COLORES).filter(([k]) => k !== 'gris');
const CLAVE_TAREAS = 'tlc.gantt.tareas2';
const verTareas = () => { try { return localStorage.getItem(CLAVE_TAREAS) !== '0'; } catch { return true; } };

function estadoTarea(t) {
  const h = hoy();
  if (t.estado === 'hecha') return { txt: 'Hecha', tono: 'ok' };
  if (!t.vence) return { txt: 'Sin fecha', tono: 'mudo' };
  if (t.vence < h) return { txt: `Atrasada ${plural(dif(h, t.vence), 'día', 'días')}`, tono: 'bad' };
  const q = dif(t.vence, h);
  if (q === 0) return { txt: 'Vence hoy', tono: 'warn' };
  return { txt: `Vence en ${plural(q, 'día', 'días')}`, tono: q <= 3 ? 'warn' : '' };
}

/** Ventana visible: arranca una semana antes de la fecha de referencia para ver algo de lo reciente. */
export function ventana(fecha) {
  const n = semanas();
  const desde = sumarDias(inicioSemana(fecha), -7);
  return { n, desde, hasta: sumarDias(desde, n * 7 - 1), dias: n * 7 };
}
export const pasoGantt = (fecha, dir) => sumarDias(fecha, dir * Math.round(semanas() / 2) * 7);
export function tituloGantt(fecha) {
  const v = ventana(fecha);
  return `${fechaDiaMes(v.desde)} – ${fechaDiaMes(v.hasta)}`;
}

const avance = (id) => { const t = tareasDeProyecto(id); const h = t.filter((x) => x.estado === 'hecha').length; return { n: t.length, h, pct: t.length ? h / t.length : 0 }; };
const dur = (p) => dif(p.fin, p.inicio) + 1;
const nombresDe = (p) => (p.responsables || []).map(nombreDe);

function estadoDe(p) {
  const h = hoy();
  if (p.hecho) return { txt: 'Terminado', tono: 'ok' };
  if (p.fin < h) return { txt: `Atrasado ${plural(dif(h, p.fin), 'día', 'días')}`, tono: 'bad' };
  if (p.inicio > h) return { txt: `Empieza en ${plural(dif(p.inicio, h), 'día', 'días')}`, tono: '' };
  const q = dif(p.fin, h);
  return { txt: q === 0 ? 'Se entrega hoy' : `Quedan ${plural(q, 'día', 'días')}`, tono: q <= 3 ? 'warn' : '' };
}

function quien(p) {
  const n = p.responsables || [];
  if (!n.length) return html`<span class="gp__sin">Sin responsable</span>`;
  const ver = n.slice(0, 3);
  return html`<span class="gp__quien" aria-label="${nombresDe(p).join(', ')}">${ver.map((id) => avatar(nombreDe(id), 'sm'))}${n.length > 3 ? html`<span class="gp__mas num">+${n.length - 3}</span>` : ''}</span>`;
}

export const estadoDeTarea = estadoTarea;

export function renderGantt({ fecha }) {
  const v = ventana(fecha);
  const todos = proyectos().filter((p) => p.inicio && p.fin);
  const visibles = todos.filter((p) => p.fin >= v.desde && p.inicio <= v.hasta)
    .sort((a, b) => (a.hecho ? 1 : 0) - (b.hecho ? 1 : 0) || a.inicio.localeCompare(b.inicio) || a.fin.localeCompare(b.fin) || a.titulo.localeCompare(b.titulo, 'es'));
  const fuera = todos.length - visibles.length;

  if (!todos.length) {
    return vacio({
      icon: 'calendar', titulo: 'Aún no hay proyectos',
      texto: 'Crea uno con su inicio, su entrega y quién lo lleva: se ve aquí como una línea de tiempo.',
      boton: esLider() ? { accion: 'proyecto-nuevo', texto: 'Nuevo proyecto' } : null,
    });
  }

  const semanasEje = Array.from({ length: v.n }, (_, k) => sumarDias(v.desde, k * 7));
  const eje = semanasEje.map((f, k) => {
    const mes = f.slice(0, 7);
    const nuevo = k === 0 || mes !== semanasEje[k - 1].slice(0, 7);
    return html`<span class="gx ${nuevo ? 'gx--mes' : ''}"><em>${nuevo ? nombreMes(f).split(' ')[0].slice(0, 3).toLowerCase() : ''}</em><b class="num">${Number(f.slice(8))}</b></span>`;
  });

  const hoyPos = hoy() >= v.desde && hoy() <= v.hasta ? ((dif(hoy(), v.desde) + 0.5) / v.dias) * 100 : null;

  const hoyPosT = hoyPos;
  const filaTarea = (t, vv, color) => {
    const et = estadoTarea(t);
    const fin = t.vence ? dif(t.vence, vv.desde) : null;
    const ini = t.inicio ? dif(t.inicio, vv.desde) : fin;
    const dentro = t.vence && (t.inicio || t.vence) <= vv.hasta && t.vence >= vv.desde;
    let marca = '';
    if (dentro) {
      if (t.inicio && t.inicio < t.vence) {
        const a = clamp(ini, 0, vv.dias); const b = clamp(fin + 1, 0, vv.dias);
        marca = html`<span class="gt__barra" style="left:${(a / vv.dias) * 100}%;width:max(6px, ${((b - a) / vv.dias) * 100}%)"></span>`;
      } else {
        marca = html`<span class="gt__hito" style="left:${((clamp(fin, 0, vv.dias - 1) + 0.5) / vv.dias) * 100}%"></span>`;
      }
    }
    return html`<button class="gt ${t.estado === 'hecha' ? 'gt--hecha' : ''}" type="button" data-action="tarea-editar" data-id="${t.id}">
      <span class="gt__cab">${icono(t.estado === 'hecha' ? 'circle-check' : 'circle', 'i--sm')}<span class="gt__tit trunc">${t.titulo}</span><span class="gt__est gp__est--${et.tono || 'normal'}">${et.txt}</span></span>
      <span class="gt__pista" aria-hidden="true">${hoyPosT !== null ? html`<span class="gp__hoy" style="left:${hoyPosT}%"></span>` : ''}${marca}</span>
    </button>`;
  };

  // Tareas con fecha que no pertenecen a ningún proyecto: se ven igual, en su propio grupo.
  const sueltas = !verTareas() ? [] : tareas()
    .filter((t) => !t.proyectoId && t.estado !== 'hecha' && (t.vence || t.inicio) && (t.vence || t.inicio) >= v.desde && (t.inicio || t.vence) <= v.hasta)
    .sort((a, b) => (a.vence || a.inicio).localeCompare(b.vence || b.inicio) || a.titulo.localeCompare(b.titulo, 'es'));

  const fila = (p) => {
    const ini = clamp(dif(p.inicio, v.desde), 0, v.dias);
    const fin = clamp(dif(p.fin, v.desde) + 1, 0, v.dias);
    const izq = p.inicio < v.desde; const der = p.fin > v.hasta;
    const e = estadoDe(p);
    const av = avance(p.id);
    const color = NOTA_COLORES[p.color]?.color || 'var(--accent)';
    const subfilas = verTareas() ? tareasDeProyecto(p.id).map((t) => filaTarea(t, v, color)) : [];
    return html`<div class="gpw" style="--c:${color}">
      <button class="gp ${p.hecho ? 'gp--hecho' : ''}" type="button" data-action="proyecto-abrir" data-id="${p.id}">
        <span class="gp__cab"><span class="gp__tit trunc">${p.hecho ? icono('circle-check', 'i--sm') : ''}${p.titulo}</span>${quien(p)}</span>
        <span class="gp__pista" aria-hidden="true">${hoyPos !== null ? html`<span class="gp__hoy" style="left:${hoyPos}%"></span>` : ''}<span class="gp__barra ${izq ? 'gp__barra--izq' : ''} ${der ? 'gp__barra--der' : ''}" style="left:${(ini / v.dias) * 100}%;width:max(8px, ${((fin - ini) / v.dias) * 100}%)">${av.n ? html`<span class="gp__prog" style="width:${Math.round(av.pct * 100)}%"></span>` : ''}</span></span>
        <span class="gp__meta"><span class="num">${fechaDiaMes(p.inicio)} → ${fechaDiaMes(p.fin)}</span><span>${plural(Math.max(1, Math.round(dur(p) / 7)), 'semana', 'semanas')}</span>${av.n ? html`<span class="num">${av.h}/${av.n} tareas</span>` : ''}<span class="gp__est ${e.tono ? `gp__est--${e.tono}` : ''}">${e.txt}</span></span>
      </button>
      ${subfilas}
    </div>`;
  };

  return html`
    <div class="gantt" style="--n:${v.n}">
      <div class="chips"><button class="chip" type="button" data-action="gantt-tareas">${icono(verTareas() ? 'x' : 'list', 'i--sm')} ${verTareas() ? 'Ocultar tareas' : 'Mostrar tareas'}</button></div>
      <div class="gantt__eje" aria-hidden="true">${eje}</div>
      <div class="gantt__cuerpo">
        ${visibles.length ? visibles.map(fila) : html`<p class="muted gantt__nada">Ningún proyecto cae en estas semanas.</p>`}
        ${sueltas.length ? html`<div class="gpw gpw--sueltas" style="--c:var(--tx-2)">
          <div class="gp__cab gp__cab--grupo"><span class="gp__tit">Tareas sin proyecto</span><span class="gp__sin">${plural(sueltas.length, 'tarea', 'tareas')}</span></div>
          ${sueltas.map((t) => filaTarea(t, v, 'var(--tx-2)'))}
          <p class="hint" style="padding-left:var(--sp-4)">Toca una tarea y elige su proyecto para ordenarla.</p>
        </div>` : ''}
      </div>
      ${fuera && visibles.length ? html`<p class="hint gantt__fuera">${plural(fuera, 'proyecto más fuera', 'proyectos más fuera')} de este período. Usa las flechas para verlos.</p>` : ''}
      ${esLider() ? html`<div class="gantt__pie"><button class="btn btn--soft btn--sm" type="button" data-action="proyecto-nuevo">${icono('plus', 'i--sm')} Nuevo proyecto</button></div>` : ''}
    </div>`;
}

// ---------- hojas ----------
const listaTareas = (id, editable) => {
  const ts = tareasDeProyecto(id);
  return html`<div class="field"><span class="label">Tareas del proyecto${ts.length ? ` · ${ts.filter((t) => t.estado === 'hecha').length}/${ts.length}` : ''}</span>
    ${ts.length ? html`<div class="pt">${ts.map((t) => html`
      <button class="pt__fila ${t.estado === 'hecha' ? 'pt__fila--hecha' : ''}" type="button" data-action="tarea-editar" data-id="${t.id}">
        ${icono(t.estado === 'hecha' ? 'circle-check' : 'circle')}
        <span class="trunc">${t.titulo}</span>
        <span class="pt__quien">${(t.asignados || []).map(nombreDe).join(', ')}<span class="gp__est gp__est--${estadoTarea(t).tono || 'normal'}">${(t.asignados || []).length ? ' · ' : ''}${estadoTarea(t).txt}</span></span>
      </button>`)}</div>` : html`<p class="hint">Aún no hay tareas en este proyecto.</p>`}
    ${editable ? html`<button class="btn btn--soft btn--sm" type="button" data-action="tarea-nueva" data-proyecto="${id}" data-fecha="" style="align-self:flex-start">${icono('plus', 'i--sm')} Agregar tarea</button>` : ''}
  </div>`;
};

export function formProyecto({ base = null, inicio = '', titulo = '', lineas = [] } = {}) {
  const b = base || {};
  const esNuevo = !b.id;
  const desdeNota = esNuevo && lineas.length > 0; // viene de una nota: las fechas las elige la persona, no se proponen
  const ini = b.inicio || inicio || (desdeNota ? '' : hoy());
  const nombreProyecto = b.titulo || titulo || '';
  const fin = b.fin || (ini && !desdeNota ? sumarDias(ini, 14) : '');
  const resp = new Set(b.responsables || []);
  abrirHoja({
    titulo: esNuevo ? 'Nuevo proyecto' : 'Editar proyecto',
    ancha: true,
    cuerpo: html`
      <form id="fProyecto" class="form-grid" novalidate data-id="${b.id || ''}" data-lineas="${encodeURIComponent(JSON.stringify(lineas))}">
        <div class="field"><label for="pr-titulo">Nombre del proyecto</label><input class="input" id="pr-titulo" name="titulo" value="${nombreProyecto}" placeholder="Ej: Video aniversario" autocomplete="off" autofocus></div>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="pr-ini">Comienza</label><input class="input" id="pr-ini" name="inicio" type="date" value="${ini}"></div>
          <div class="field"><label for="pr-fin">Se entrega</label><input class="input" id="pr-fin" name="fin" type="date" value="${fin}"></div>
        </div>
        <div class="field"><span class="label">Responsables <span class="opt">(uno o varios)</span></span>
          <div class="chips">${personas().map((p) => html`<label class="chip chip--check"><input class="sr-only" type="checkbox" name="resp" value="${p.id}" ${raw(resp.has(p.id) ? 'checked' : '')}>${avatar(p.nombre, 'sm')}${p.nombre}</label>`)}</div>
        </div>
        <div class="field"><span class="label">Color en la línea de tiempo</span>
          <div class="chips">${COLORES.map(([k, c]) => html`<label class="chip chip--radio chip--dot" style="--c:${c.color}"><input class="sr-only" type="radio" name="color" value="${k}" ${raw((b.color || 'azul') === k ? 'checked' : '')}>${c.label}</label>`)}</div>
        </div>
 ${esNuevo ? '' : listaTareas(b.id, true)}
        ${esNuevo && lineas.length ? html`<div class="field"><label class="check"><input type="checkbox" name="crearTareas" checked> Crear ${plural(lineas.length, 'tarea', 'tareas')} con las líneas de la nota</label>
          <div class="pt">${lineas.map((l) => html`<div class="pt__fila"><span class="trunc">${l.titulo}</span><span class="pt__quien">${l.asignados.map(nombreDe).join(', ')}</span></div>`)}</div>
          <p class="hint">Quedan ligadas a este proyecto. Después le pones fecha a cada una desde la carta Gantt.</p></div>` : ''}
        <label class="check"><input type="checkbox" name="hecho" ${raw(b.hecho ? 'checked' : '')}> Proyecto terminado</label>
        <div class="field"><label for="pr-det">Detalle <span class="opt">(opcional)</span></label><textarea class="textarea" id="pr-det" name="detalle" placeholder="Qué incluye, links, entregables…">${b.detalle || ''}</textarea></div>
      </form>`,
    pie: html`
      ${esNuevo ? '' : html`<button class="icon-btn icon-btn--danger" type="button" data-action="proyecto-eliminar" data-id="${b.id}" aria-label="Eliminar proyecto">${icono('trash')}</button>`}
      <span class="spacer"></span>
      <button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button>
      <button class="btn btn--primary" type="button" data-action="proyecto-guardar" style="flex:0 0 auto">${esNuevo ? 'Crear proyecto' : 'Guardar'}</button>`,
  });
}

function verProyecto(p) {
  const e = estadoDe(p);
  abrirHoja({
    titulo: p.titulo,
    cuerpo: html`
      <div class="form-grid">
        <div class="field"><span class="label">Fechas</span><p>${fechaCorta(p.inicio)} → ${fechaCorta(p.fin)} · ${plural(dur(p), 'día', 'días')}</p><p class="gp__est ${e.tono ? `gp__est--${e.tono}` : ''}">${e.txt}</p></div>
        <div class="field"><span class="label">Responsables</span><p>${nombresDe(p).join(', ') || 'Sin responsable'}</p></div>
        ${listaTareas(p.id, false)}
        ${p.detalle ? html`<div class="field"><span class="label">Detalle</span><p style="white-space:pre-wrap">${p.detalle}</p></div>` : ''}
      </div>`,
  });
}

function guardarProyecto() {
  const form = document.getElementById('fProyecto');
  const d = leerForm(form);
  if (!d.titulo) { marcarError(form.titulo, 'Ponle un nombre al proyecto'); return; }
  if (!d.inicio) { marcarError(form.inicio, 'Elige cuándo comienza'); return; }
  if (!d.fin) { marcarError(form.fin, 'Elige cuándo se entrega'); return; }
  if (d.fin < d.inicio) { marcarError(form.fin, 'La entrega no puede ser antes del inicio'); return; }
  const previo = form.dataset.id ? proyecto(form.dataset.id) : null;
  const responsables = [...form.querySelectorAll('input[name=resp]:checked')].map((i) => i.value);
  const data = {
    equipoId: EQUIPO_CREATIVO, titulo: d.titulo, inicio: d.inicio, fin: d.fin, responsables,
    color: d.color || 'azul', hecho: !!form.hecho.checked, detalle: d.detalle || '',
  };
  const idProyecto = previo?.id || nuevoId('pj');
  const ops = [{ c: 'proyectos', id: idProyecto, data }];
  let creadas = 0;
  if (!previo && form.crearTareas?.checked) {
    let lineas = [];
    try { lineas = JSON.parse(decodeURIComponent(form.dataset.lineas || '[]')); } catch { /* sin líneas */ }
    lineas.forEach((l) => {
      ops.push({ c: 'tareas', id: nuevoId('ta'), data: { equipoId: EQUIPO_CREATIVO, titulo: l.titulo, detalle: '', asignados: l.asignados || [], inicio: '', vence: '', prioridad: 'normal', estado: l.hecha ? 'hecha' : 'pendiente', eventoId: '', proyectoId: idProyecto, creada: hoy(), hechaEn: l.hecha ? hoy() : '' } });
      creadas++;
    });
  }
  guardar(ops);
  cerrarHoja();
  toast(previo ? 'Proyecto guardado' : creadas ? `Proyecto creado con ${plural(creadas, 'tarea', 'tareas')}` : 'Proyecto creado');
}

registrarAcciones({
  'proyecto-nuevo': (el) => formProyecto({ inicio: el?.dataset?.fecha || '' }),
  'proyecto-abrir': (el) => {
    const p = proyecto(el.dataset.id);
    if (!p) return;
    if (esLider()) formProyecto({ base: p }); else verProyecto(p);
  },
  'gantt-tareas': () => { try { localStorage.setItem(CLAVE_TAREAS, verTareas() ? '0' : '1'); } catch { /* sin almacenamiento */ } refrescar(); },
  'proyecto-guardar': guardarProyecto,
  'proyecto-eliminar': async (el) => {
    const p = proyecto(el.dataset.id);
    if (!(await confirmar({ titulo: `Eliminar "${p.titulo}"`, mensaje: 'Podrás deshacerlo unos segundos.' }))) return;
    const undo = guardar([{ c: 'proyectos', id: p.id, data: null }]);
    cerrarHoja();
    toast('Proyecto eliminado', { accion: { texto: 'Deshacer', fn: undo } });
  },
});
