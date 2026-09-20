import { guardar, lista } from '../store.js';
import { EQUIPO_CREATIVO, PLANTILLA_SERVICIO, TIPOS, tipoDe } from '../model.js';
import { citados, evento, eventosOrdenados, listaTomada, nombreDe, personas, pideLista, resumenAsistencia, tareas } from '../datos.js';
import { fechaLarga, fechaRelativa, html, hoy, icono, nuevoId, raw, sumarDias, rangoHora, plural, poner } from '../util.js';
import { abrirHoja, actualizarHoja, avatar, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast } from '../ui.js';

// ---------- detalle ----------
export function verEvento(id) {
  const e = evento(id);
  if (!e) return;
  const t = tipoDe(e.tipo);
  const cit = citados(e);
  const res = resumenAsistencia(e);
  const tareasLigadas = tareas().filter((x) => x.eventoId === e.id);
  const programa = e.programa || [];

  const bloqueAsistencia = pideLista(e) ? html`
    <section class="section" style="margin:0">
      <div class="section__head"><h3 class="section__title">Asistencia</h3></div>
      <div class="panel">
        <button class="row" type="button" data-action="asistencia-abrir" data-id="${e.id}">
          <span class="row__main">
            <span class="row__title">${listaTomada(e) ? `${res.p} presentes de ${res.citados}` : 'Lista sin tomar'}</span>
            <span class="row__sub">${listaTomada(e) ? `${res.a} ausentes · ${res.j} justificados${res.marcados < res.citados ? ` · ${res.citados - res.marcados} sin marcar` : ''}` : `${plural(res.citados, 'persona citada', 'personas citadas')}`}</span>
          </span>
          <span class="row__end"><span class="btn btn--soft btn--sm">${listaTomada(e) ? 'Ver lista' : 'Tomar asistencia'}</span></span>
        </button>
      </div>
    </section>` : '';

  const bloquePrograma = t.programa ? html`
    <section class="section" style="margin:0">
      <div class="section__head"><h3 class="section__title">${e.tipo === 'servicio' ? 'Programa del servicio' : 'Agenda'}</h3>
        <button class="section__link" type="button" data-action="programa-editar" data-id="${e.id}">${icono('edit', 'i--sm')} ${programa.length ? 'Editar' : 'Armar'}</button></div>
      ${programa.length ? html`<div class="panel"><ol class="list">${programa.map((f) => html`
        <li class="row">
          <span class="num muted" style="min-width:44px">${f.hora || '·'}</span>
          <span class="row__main"><span class="row__title">${f.titulo}</span>${f.responsableId ? html`<span class="row__sub">${nombreDe(f.responsableId)}</span>` : ''}</span>
        </li>`)}</ol></div>`
        : html`<p class="muted" style="font-size:var(--t-sm)">Aún no hay bloques. Arma el orden con horas y responsables${e.tipo === 'servicio' ? ', o copia el del domingo anterior' : ''}.</p>`}
    </section>` : '';

  const bloqueTareas = html`
    <section class="section" style="margin:0">
      <div class="section__head"><h3 class="section__title">Tareas de este evento</h3>
        <button class="section__link" type="button" data-action="tarea-nueva" data-evento="${e.id}" data-fecha="${e.fecha}">${icono('plus', 'i--sm')} Agregar</button></div>
      ${tareasLigadas.length ? html`<div class="panel"><div class="list">${tareasLigadas.map((x) => html`
        <button class="row ${x.estado === 'hecha' ? 'row--done' : ''}" type="button" data-action="tarea-editar" data-id="${x.id}">
          <span class="row__main"><span class="row__title">${x.titulo}</span><span class="row__sub">${(x.asignados || []).map(nombreDe).join(', ') || 'Sin asignar'}</span></span>
          <span class="row__end">${icono(x.estado === 'hecha' ? 'circle-check' : 'circle')}</span>
        </button>`)}</div></div>` : html`<p class="muted" style="font-size:var(--t-sm)">Sin tareas ligadas.</p>`}
    </section>`;

  abrirHoja({
    titulo: e.titulo,
    ancha: true,
    cuerpo: html`
      <div style="display:flex;flex-direction:column;gap:var(--sp-2)">
        <div class="row__sub" style="font-size:var(--t-md);color:var(--tx)">
          <span>${icono('calendar')} ${fechaLarga(e.fecha)}${e.fecha === hoy() ? ' · hoy' : ''}</span>
          <span>${icono('clock')} <span class="num">${rangoHora(e.horaInicio, e.horaFin)}</span></span>
          ${e.lugar ? html`<span>${icono('pin')} ${e.lugar}</span>` : ''}
        </div>
        <div class="chips"><span class="tag tag--c" style="--c:${t.color}">${t.label}</span>${e.serieId ? html`<span class="tag">${icono('refresh', 'i--sm')} Se repite</span>` : ''}</div>
      </div>
      ${e.notas ? html`<p class="muted" style="white-space:pre-wrap">${e.notas}</p>` : ''}
      ${bloqueAsistencia}
      ${bloquePrograma}
      ${bloqueTareas}
      <section class="section" style="margin:0">
        <div class="section__head"><h3 class="section__title">Quiénes</h3></div>
        ${cit.length ? html`<div class="chips">${cit.map((p) => html`<span class="chip">${avatar(p.nombre, 'sm')}${p.nombre}</span>`)}</div>` : html`<p class="muted" style="font-size:var(--t-sm)">Sin personas en el equipo todavía.</p>`}
        <p class="hint" style="margin-top:var(--sp-2)">${e.participantes?.length ? 'Personas elegidas para este evento.' : 'Todo el equipo activo a esa fecha.'}</p>
      </section>`,
    pie: html`
      <button class="icon-btn icon-btn--danger" type="button" data-action="evento-eliminar" data-id="${e.id}" aria-label="Eliminar evento">${icono('trash')}</button>
      <button class="icon-btn" type="button" data-action="evento-duplicar" data-id="${e.id}" aria-label="Duplicar evento">${icono('copy')}</button>
      <span class="spacer"></span>
      <button class="btn btn--primary" type="button" data-action="evento-editar" data-id="${e.id}" style="flex:0 0 auto">${icono('edit', 'i--sm')} Editar</button>`,
  });
}

// ---------- formulario ----------
function chipsPersonas(seleccion) {
  const sel = new Set(seleccion || []);
  return personas().map((p) => html`<label class="chip chip--check"><input class="sr-only" type="checkbox" name="part" value="${p.id}" ${raw(sel.has(p.id) ? 'checked' : '')}>${avatar(p.nombre, 'sm')}${p.nombre}</label>`);
}

export function formEvento({ base = null, fecha = hoy(), tipo = 'reunion', hora = '', esNuevo = true } = {}) {
  const b = base || {};
  const tipoIni = b.tipo || tipo;
  const t = tipoDe(tipoIni);
  const horaIni = b.horaInicio ?? (hora || t.hora[0]);
  const horaFin = b.horaFin ?? (hora ? '' : t.hora[1]);
  abrirHoja({
    titulo: esNuevo ? 'Nuevo evento' : 'Editar evento',
    ancha: true,
    cuerpo: html`
      <form id="fEvento" class="form-grid" novalidate data-id="${esNuevo ? '' : b.id}">
        <div class="field">
          <span class="label">Tipo</span>
          <div class="chips">${Object.entries(TIPOS).map(([k, v]) => html`
            <label class="chip chip--radio" style="--c:${v.color}"><input class="sr-only" type="radio" name="tipo" value="${k}" ${raw(k === tipoIni ? 'checked' : '')} data-h1="${v.hora[0]}" data-h2="${v.hora[1]}" data-lista="${v.asistencia ? 1 : 0}">${icono(v.icono, 'i--sm')}${v.label}</label>`)}</div>
        </div>
        <div class="field"><label for="ev-titulo">Título</label><input class="input" id="ev-titulo" name="titulo" value="${b.titulo || ''}" placeholder="Ej: Reunión de lunes" autocomplete="off"></div>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="ev-fecha">Fecha</label><input class="input" id="ev-fecha" name="fecha" type="date" value="${b.fecha || fecha}"></div>
          <div class="field"><label for="ev-lugar">Lugar <span class="opt">(opcional)</span></label><input class="input" id="ev-lugar" name="lugar" value="${b.lugar || ''}" placeholder="Ej: Sala creativa"></div>
        </div>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="ev-ini">Empieza</label><input class="input" id="ev-ini" name="horaInicio" type="time" value="${horaIni || ''}"></div>
          <div class="field"><label for="ev-fin">Termina <span class="opt">(opcional)</span></label><input class="input" id="ev-fin" name="horaFin" type="time" value="${horaFin || ''}"></div>
        </div>
        <div class="field">
          <span class="label">Quiénes participan</span>
          <div class="chips">${chipsPersonas(b.participantes)}</div>
          <p class="hint">Si no eliges a nadie, cuenta todo el equipo.</p>
        </div>
        <label class="check"><input type="checkbox" name="tomaLista" ${raw((b.tomaLista ?? t.asistencia) ? 'checked' : '')}> Tomar asistencia en este evento</label>
        <div class="field"><label for="ev-notas">Notas <span class="opt">(opcional)</span></label><textarea class="textarea" id="ev-notas" name="notas" placeholder="Qué hay que llevar, objetivos, links…">${b.notas || ''}</textarea></div>
        ${esNuevo ? html`
          <div class="form-grid form-grid--2 keep">
            <div class="field"><label for="ev-rep">Repetir</label>
              <select class="select" id="ev-rep" name="repetir"><option value="0">No repetir</option><option value="7">Cada semana</option><option value="14">Cada 2 semanas</option></select></div>
            <div class="field"><label for="ev-hasta">Hasta</label><input class="input" id="ev-hasta" name="hasta" type="date" value="${sumarDias(b.fecha || fecha, 7 * 8)}"></div>
          </div>` : ''}
      </form>`,
    pie: html`<button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button><button class="btn btn--primary" type="button" data-action="evento-guardar">${esNuevo ? 'Crear evento' : 'Guardar cambios'}</button>`,
  });
  const form = document.getElementById('fEvento');
  form.addEventListener('change', (ev) => {
    if (ev.target.name !== 'tipo') return;
    const r = ev.target;
    if (esNuevo) {
      if (!form.horaInicio.dataset.tocado) { form.horaInicio.value = r.dataset.h1; form.horaFin.value = r.dataset.h2; }
      form.tomaLista.checked = r.dataset.lista === '1';
    }
  });
  form.horaInicio.addEventListener('input', () => { form.horaInicio.dataset.tocado = '1'; });
}

function leerEvento(form) {
  const d = leerForm(form);
  const cuerpo = form.closest('.sheet__body');
  const part = [...cuerpo.querySelectorAll('input[name=part]:checked')].map((i) => i.value);
  return { ...d, participantes: part };
}

function guardarEvento() {
  const form = document.getElementById('fEvento');
  const d = leerEvento(form);
  if (!d.fecha) { marcarError(form.fecha, 'Elige una fecha'); return; }
  if (d.horaInicio && d.horaFin && d.horaFin <= d.horaInicio) { marcarError(form.horaFin, 'Debe terminar después de empezar'); return; }
  const previo = form.dataset.id ? evento(form.dataset.id) : null;
  const titulo = d.titulo || tipoDe(d.tipo).label;
  const base = {
    equipoId: EQUIPO_CREATIVO, tipo: d.tipo, titulo, fecha: d.fecha, horaInicio: d.horaInicio || '', horaFin: d.horaFin || '',
    lugar: d.lugar || '', notas: d.notas || '', participantes: d.participantes, tomaLista: !!d.tomaLista,
    programa: previo?.programa || [], serieId: previo?.serieId || null,
  };
  if (previo) {
    guardar([{ c: 'eventos', id: previo.id, data: base }]);
    cerrarHoja();
    toast('Cambios guardados');
    return;
  }
  const paso = Number(d.repetir || 0);
  const ops = [];
  if (paso && d.hasta && d.hasta >= d.fecha) {
    const serieId = nuevoId('ser');
    let f = d.fecha; let n = 0;
    while (f <= d.hasta && n < 60) { ops.push({ c: 'eventos', id: nuevoId('ev'), data: { ...base, fecha: f, serieId } }); f = sumarDias(f, paso); n++; }
  } else {
    ops.push({ c: 'eventos', id: nuevoId('ev'), data: base });
  }
  const undo = guardar(ops);
  cerrarHoja();
  toast(ops.length > 1 ? `${ops.length} eventos creados` : 'Evento creado', { accion: { texto: 'Deshacer', fn: undo } });
}

// ---------- eliminar / duplicar ----------
async function eliminarEvento(id) {
  const e = evento(id);
  if (!e) return;
  let alcance = 'este';
  if (e.serieId) {
    const r = await confirmar({ titulo: `Eliminar "${e.titulo}"`, mensaje: 'Este evento se repite cada semana. ¿Qué quieres eliminar?', opciones: [{ valor: 'este', texto: 'Solo este' }, { valor: 'siguientes', texto: 'Este y los siguientes', peligro: true }] });
    if (!r) return;
    alcance = r;
  } else if (!(await confirmar({ titulo: `Eliminar "${e.titulo}"`, mensaje: 'Se borra también su lista de asistencia. Podrás deshacerlo unos segundos.' }))) return;

  const objetivos = alcance === 'siguientes' ? eventosOrdenados().filter((x) => x.serieId === e.serieId && x.fecha >= e.fecha) : [e];
  const ids = new Set(objetivos.map((x) => x.id));
  const ops = objetivos.map((x) => ({ c: 'eventos', id: x.id, data: null }));
  lista('asistencia').filter((a) => ids.has(a.eventoId)).forEach((a) => ops.push({ c: 'asistencia', id: a.id, data: null }));
  tareas().filter((t) => ids.has(t.eventoId)).forEach((t) => ops.push({ c: 'tareas', id: t.id, data: { ...t, eventoId: '' } }));
  const undo = guardar(ops);
  cerrarHoja();
  toast(objetivos.length > 1 ? `${objetivos.length} eventos eliminados` : 'Evento eliminado', { accion: { texto: 'Deshacer', fn: undo } });
}

// ---------- programa del servicio ----------
let filas = [];
let eventoPrograma = null;

function cuerpoPrograma() {
  const opciones = personas().map((p) => html`<option value="${p.id}">${p.nombre}</option>`);
  return html`
    <div id="programa" class="form-grid">
      ${filas.length ? filas.map((f, i) => html`
        <div class="panel panel--pad" style="display:grid;gap:var(--sp-3);padding:var(--sp-4)" data-fila="${i}">
          <div class="form-grid form-grid--2 keep" style="grid-template-columns:110px 1fr">
            <div class="field"><label for="pr-h${i}">Hora</label><input class="input" id="pr-h${i}" name="hora" type="time" value="${f.hora || ''}"></div>
            <div class="field"><label for="pr-t${i}">Bloque</label><input class="input" id="pr-t${i}" name="titulo" value="${f.titulo}" placeholder="Ej: Alabanza" autocomplete="off"></div>
          </div>
          <div style="display:flex;gap:var(--sp-2);align-items:end">
            <div class="field" style="flex:1"><label for="pr-r${i}">Responsable <span class="opt">(opcional)</span></label>
              <select class="select" id="pr-r${i}" name="responsableId"><option value="">Sin asignar</option>${personas().map((p) => html`<option value="${p.id}" ${raw(p.id === f.responsableId ? 'selected' : '')}>${p.nombre}</option>`)}</select></div>
            <button class="icon-btn" type="button" data-action="programa-subir" data-i="${i}" aria-label="Subir bloque" ${raw(i === 0 ? 'disabled' : '')}>${icono('arrow-up')}</button>
            <button class="icon-btn" type="button" data-action="programa-bajar" data-i="${i}" aria-label="Bajar bloque" ${raw(i === filas.length - 1 ? 'disabled' : '')}>${icono('arrow-down')}</button>
            <button class="icon-btn icon-btn--danger" type="button" data-action="programa-quitar" data-i="${i}" aria-label="Quitar bloque">${icono('trash')}</button>
          </div>
        </div>`) : html`<p class="muted">Sin bloques todavía. Agrega el primero o usa una plantilla.</p>`}
      <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
        <button class="btn btn--soft" type="button" data-action="programa-agregar">${icono('plus', 'i--sm')} Agregar bloque</button>
        ${filas.length === 0 ? html`<button class="btn btn--ghost" type="button" data-action="programa-plantilla">Usar plantilla</button>` : ''}
        <button class="btn btn--ghost" type="button" data-action="programa-copiar">${icono('copy', 'i--sm')} Copiar del anterior</button>
      </div>
    </div>`;
}

function leerFilas() {
  const cont = document.getElementById('programa');
  if (!cont) return;
  filas = [...cont.querySelectorAll('[data-fila]')].map((el) => ({
    id: filas[Number(el.dataset.fila)]?.id || nuevoId('pr'),
    hora: el.querySelector('[name=hora]').value,
    titulo: el.querySelector('[name=titulo]').value.trim(),
    responsableId: el.querySelector('[name=responsableId]').value,
  }));
}
const repintarPrograma = () => actualizarHoja({ cuerpo: cuerpoPrograma() });

function editarPrograma(id) {
  const e = evento(id);
  if (!e) return;
  eventoPrograma = e.id;
  filas = (e.programa || []).map((f) => ({ ...f }));
  abrirHoja({
    titulo: e.tipo === 'servicio' ? `Programa · ${fechaRelativa(e.fecha)}` : `Agenda · ${e.titulo}`,
    ancha: true,
    cuerpo: cuerpoPrograma(),
    pie: html`<button class="btn btn--soft" type="button" data-action="evento-ver" data-id="${e.id}">Volver</button><button class="btn btn--primary" type="button" data-action="programa-guardar">Guardar</button>`,
  });
}

registrarAcciones({
  'evento-nuevo': (el) => formEvento({ fecha: el?.dataset.fecha || hoy(), tipo: el?.dataset.tipo || 'reunion', hora: el?.dataset.hora || '' }),
  'evento-ver': (el) => verEvento(el.dataset.id),
  'evento-editar': (el) => formEvento({ base: evento(el.dataset.id), esNuevo: false }),
  'evento-guardar': guardarEvento,
  'evento-eliminar': (el) => eliminarEvento(el.dataset.id),
  'evento-duplicar': (el) => {
    const e = evento(el.dataset.id);
    formEvento({ base: { ...e, id: '', fecha: sumarDias(e.fecha, 7), serieId: null, titulo: e.titulo }, esNuevo: true });
  },
  'programa-editar': (el) => editarPrograma(el.dataset.id),
  'programa-agregar': () => { leerFilas(); filas.push({ id: nuevoId('pr'), hora: '', titulo: '', responsableId: '' }); repintarPrograma(); },
  'programa-quitar': (el) => { leerFilas(); filas.splice(Number(el.dataset.i), 1); repintarPrograma(); },
  'programa-subir': (el) => { leerFilas(); const i = Number(el.dataset.i); [filas[i - 1], filas[i]] = [filas[i], filas[i - 1]]; repintarPrograma(); },
  'programa-bajar': (el) => { leerFilas(); const i = Number(el.dataset.i); [filas[i + 1], filas[i]] = [filas[i], filas[i + 1]]; repintarPrograma(); },
  'programa-plantilla': () => { filas = PLANTILLA_SERVICIO.map((t) => ({ id: nuevoId('pr'), hora: '', titulo: t, responsableId: '' })); repintarPrograma(); },
  'programa-copiar': () => {
    const actual = evento(eventoPrograma);
    const previo = eventosOrdenados().filter((x) => x.tipo === actual.tipo && x.id !== actual.id && x.fecha < actual.fecha && (x.programa || []).length).pop();
    if (!previo) { toast('No hay un evento anterior con programa para copiar', { tipo: 'error' }); return; }
    filas = previo.programa.map((f) => ({ ...f, id: nuevoId('pr'), responsableId: f.responsableId || '' }));
    repintarPrograma();
    toast(`Copiado del ${fechaRelativa(previo.fecha)}`);
  },
  'programa-guardar': () => {
    leerFilas();
    const limpias = filas.filter((f) => f.titulo);
    const e = evento(eventoPrograma);
    guardar([{ c: 'eventos', id: e.id, data: { ...e, programa: limpias.map(({ id, ...r }) => ({ id, ...r })) } }]);
    toast('Programa guardado');
    verEvento(e.id);
  },
});
