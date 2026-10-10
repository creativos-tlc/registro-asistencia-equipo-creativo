/* Turnos del domingo: quién cubre qué rol en cada reunión, y quiénes no estarán.
   Se arma por domingo (cómodo en el celular) y se ve por mes como la planilla; ambos se pueden compartir como imagen. */
import { guardar, obtener, tienePermiso } from '../store.js';
import { EQUIPO_CREATIVO, GRUPOS_TURNO, REUNIONES } from '../model.js';
import { ausenciasDe, idTurno, persona, personas, personasDeTurno, rolesParaFechas, sirvenPorGrupo, todosLosRoles } from '../datos.js';
import { domingoDe, domingosDelMes, fechaDiaMes, fechaLarga, hoy, html, icono, inicioMes, nombreMes, nuevoId, raw, sumarDias, sumarMeses } from '../util.js';
import { abrirHoja, avatar, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast, vacio } from '../ui.js';
import { refrescar } from '../router.js';
import { compartirTurnos } from '../exportar.js';

const CLAVE = 'tlc.turnos.vista';
const est = { vista: 'domingo', domingo: domingoDe(hoy()), mes: hoy().slice(0, 7) };
try { est.vista = localStorage.getItem(CLAVE) === 'mes' ? 'mes' : 'domingo'; } catch { /* sin almacenamiento */ }

const edita = () => tienePermiso('turnos');
const corto = (id) => persona(id)?.nombre || 'Alguien';
const unir = (nombres) => (nombres.length <= 1 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`);
const ORDEN_GRUPOS = ['dia', 'r1', 'r2', 'prueba'];

/** ¿Esa ausencia afecta a este grupo? "Antes de la reunión" cuenta con la 1ra; "En prueba" con cualquiera. */
function afecta(aus, grupo) {
  const r = aus.reuniones || ['r1', 'r2'];
  if (grupo === 'r2') return r.includes('r2');
  if (grupo === 'r1' || grupo === 'dia') return r.includes('r1');
  return true;
}

const etiquetaAusente = (a) => `${corto(a.personaId)}${(a.reuniones || []).length === 1 ? ` (${REUNIONES[a.reuniones[0]]})` : ''}`;

function filasParaFechas(fechas) {
  const rs = rolesParaFechas(fechas);
  const filas = [];
  let g = null;
  rs.forEach((r) => {
    if (r.grupo !== g) { g = r.grupo; filas.push({ grupo: GRUPOS_TURNO[g] || { label: g, color: 'var(--tx-3)' }, g }); }
    const color = (GRUPOS_TURNO[r.grupo] || {}).color || 'var(--tx-3)';
    filas.push({ rol: r.nombre, rolId: r.id, color, baja: r.activo === false, ids: fechas.map((f) => personasDeTurno(f, r.id)), textos: fechas.map((f) => unir(personasDeTurno(f, r.id).map(corto))) });
  });
  return filas;
}

// ---------- dibujo ----------
function encabezado() {
  const titulo = est.vista === 'mes' ? nombreMes(`${est.mes}-01`) : fechaLarga(est.domingo);
  return html`
    <div class="cal__tools">
      <div class="seg" role="tablist" aria-label="Vista de turnos">
        <button class="seg__btn" type="button" role="tab" data-action="turnos-vista" data-v="domingo" aria-selected="${est.vista === 'domingo'}">Domingo</button>
        <button class="seg__btn" type="button" role="tab" data-action="turnos-vista" data-v="mes" aria-selected="${est.vista === 'mes'}">Mes</button>
      </div>
      <div class="cal__nav">
        <button class="icon-btn" type="button" data-action="turnos-prev" aria-label="Anterior">${icono('chev-l')}</button>
        <strong class="cal__titulo">${titulo}</strong>
        <button class="icon-btn" type="button" data-action="turnos-next" aria-label="Siguiente">${icono('chev-r')}</button>
        <button class="btn btn--soft btn--sm" type="button" data-action="turnos-hoy">Hoy</button>
      </div>
    </div>
    <div class="turnos__acciones">
      <button class="btn btn--soft btn--sm" type="button" data-action="turnos-compartir">${icono('download', 'i--sm')} Compartir imagen</button>
      ${edita() ? html`
        ${est.vista === 'domingo' ? html`<button class="btn btn--soft btn--sm" type="button" data-action="turnos-copiar">${icono('copy', 'i--sm')} Copiar domingo anterior</button>` : ''}
        <button class="btn btn--ghost btn--sm" type="button" data-action="turnos-roles">${icono('sliders', 'i--sm')} Roles</button>` : ''}
    </div>`;
}

function filaRol(f, fecha) {
  const contenido = f.ids[0].length
    ? html`<span class="trol__p">${f.ids[0].map((id) => html`<span class="pchip">${avatar(corto(id), 'sm')}${corto(id)}</span>`)}</span>`
    : html`<span class="trol__vacio">Sin asignar</span>`;
  return edita()
    ? html`<button class="trol" type="button" data-action="turno-elegir" data-fecha="${fecha}" data-rol="${f.rolId}"><span class="trol__n">${f.rol}</span>${contenido}${icono('chev-r', 'row__chev')}</button>`
    : html`<div class="trol"><span class="trol__n">${f.rol}</span>${contenido}</div>`;
}

function vistaDomingo() {
  const fecha = est.domingo;
  const filas = filasParaFechas([fecha]);
  const aus = ausenciasDe(fecha);
  if (!filas.length) {
    return vacio({ icon: 'clipboard', titulo: 'Aún no hay roles', texto: edita() ? 'Crea los roles del equipo (Fotografía, Stories, Ingesta…) y después asigna a cada persona.' : 'Todavía no se arman los turnos.', boton: edita() ? { accion: 'turnos-roles', texto: 'Crear roles' } : null });
  }
  const bandas = [];
  filas.forEach((f) => {
    if (f.grupo) bandas.push({ grupo: f.grupo, filas: [] });
    else bandas[bandas.length - 1].filas.push(f);
  });
  return html`
    ${bandas.map((b) => html`
      <section class="tband" style="--c:${b.grupo.color}">
        <h3 class="tband__t">${b.grupo.label}</h3>
        <div class="tband__filas">${b.filas.map((f) => filaRol(f, fecha))}</div>
      </section>`)}
    <section class="tband" style="--c:var(--tx-3)">
      <h3 class="tband__t">No estarán</h3>
      <div class="tband__filas">
        ${aus.length ? aus.map((a) => html`
          <div class="trol trol--aus"><span class="trol__n">${corto(a.personaId)}</span>
            <span class="trol__p"><span class="tag">${(a.reuniones || []).length === 1 ? `Solo ${REUNIONES[a.reuniones[0]]} reunión` : 'Ambas reuniones'}</span>${a.nota ? html`<span class="trol__nota">${a.nota}</span>` : ''}</span>
            ${edita() ? html`<button class="icon-btn" type="button" data-action="turno-aus-quitar" data-id="${a.id}" aria-label="Quitar a ${corto(a.personaId)} de los que no estarán">${icono('x')}</button>` : ''}
          </div>`) : html`<p class="trol trol--vacio">Todos disponibles por ahora.</p>`}
        ${edita() ? html`<button class="btn btn--soft btn--sm tband__agregar" type="button" data-action="turno-aus-nueva" data-fecha="${fecha}">${icono('plus', 'i--sm')} Agregar a alguien que no estará</button>` : ''}
      </div>
    </section>`;
}

function vistaMes() {
  const fechas = domingosDelMes(est.mes);
  const filas = filasParaFechas(fechas);
  if (!filas.length) return vacio({ icon: 'clipboard', titulo: 'Aún no hay roles', texto: edita() ? 'Crea los roles del equipo y después asigna a cada persona.' : 'Todavía no se arman los turnos.', boton: edita() ? { accion: 'turnos-roles', texto: 'Crear roles' } : null });
  const ausPor = fechas.map((f) => ausenciasDe(f).map(etiquetaAusente));
  return html`
    <div class="matriz-wrap">
      <div class="matriz" style="--n:${fechas.length}">
        <div class="mx mx--cab mx--rol">Rol</div>
        ${fechas.map((f) => html`<div class="mx mx--cab"><button type="button" class="mx__fecha" data-action="turnos-ir-domingo" data-fecha="${f}">Dom ${Number(f.slice(8))}</button></div>`)}
        ${filas.map((f) => (f.grupo
          ? html`<div class="mx mx--grupo" style="--c:${f.grupo.color}">${f.grupo.label}</div>`
          : html`<div class="mx mx--rol" style="--c:${f.color}">${f.rol}</div>${fechas.map((fecha, i) => {
            const cuerpo = f.ids[i].length ? f.ids[i].map((id) => html`<span>${corto(id)}</span>`) : html`<span class="mx__vacio">—</span>`;
            return edita()
              ? html`<button class="mx mx--celda" type="button" style="--c:${f.color}" data-action="turno-elegir" data-fecha="${fecha}" data-rol="${f.rolId}">${cuerpo}</button>`
              : html`<div class="mx mx--celda" style="--c:${f.color}">${cuerpo}</div>`;
          })}`))}
        <div class="mx mx--grupo" style="--c:var(--tx-3)">No estarán</div>
        <div class="mx mx--rol" style="--c:var(--tx-3)">Ausentes</div>
        ${ausPor.map((lista) => html`<div class="mx mx--celda" style="--c:var(--tx-3)">${lista.length ? lista.map((n) => html`<span>${n}</span>`) : html`<span class="mx__vacio">—</span>`}</div>`)}
      </div>
    </div>
    <p class="hint" style="margin-top:var(--sp-3)">${edita() ? 'Toca una celda para elegir personas, o un domingo para verlo completo.' : 'Toca un domingo para verlo completo.'}</p>`;
}

export const vistaTurnos = {
  titulo: 'Turnos',
  render() {
    return html`<div class="turnos">${encabezado()}${est.vista === 'mes' ? vistaMes() : vistaDomingo()}</div>`;
  },
};

// ---------- elegir personas para un rol ----------
function abrirElegir(fecha, rolId) {
  const rol = obtener('roles', rolId);
  if (!rol) return;
  const actuales = new Set(personasDeTurno(fecha, rolId));
  const aus = new Map(ausenciasDe(fecha).map((a) => [a.personaId, a]));
  const sirven = sirvenPorGrupo(fecha);
  const otro = rol.grupo === 'r1' ? 'r2' : rol.grupo === 'r2' ? 'r1' : null;
  const base = personas().filter((p) => p.activo !== false);
  [...actuales].forEach((id) => { if (!base.some((p) => p.id === id) && persona(id)) base.push(persona(id)); });
  const info = (p) => ({ ausente: aus.has(p.id) && afecta(aus.get(p.id), rol.grupo), otra: !!otro && sirven[otro].has(p.id) });
  const lista = base.map((p) => ({ p, ...info(p) })).sort((a, b) => (a.ausente - b.ausente) || (a.otra - b.otra) || a.p.nombre.localeCompare(b.p.nombre, 'es'));
  abrirHoja({
    titulo: `${rol.nombre}`,
    ancha: true,
    cuerpo: html`
      <p class="muted" style="font-size:var(--t-sm)">${(GRUPOS_TURNO[rol.grupo] || {}).label} · ${fechaLarga(fecha)}. Puedes elegir a más de una persona.</p>
      <form id="fElegir" class="picks" data-fecha="${fecha}" data-rol="${rolId}">
        ${lista.map(({ p, ausente, otra }) => html`
          <label class="pick${ausente ? ' pick--aus' : ''}">
            <input class="sr-only" type="checkbox" name="p" value="${p.id}" ${raw(actuales.has(p.id) ? 'checked' : '')}>
            ${avatar(p.nombre)}
            <span class="pick__n"><strong>${p.nombre}</strong>${p.apellidos ? html` <span class="faint">${p.apellidos}</span>` : ''}
              <span class="pick__tags">${ausente ? html`<span class="tag tag--bad">No estará</span>` : ''}${otra ? html`<span class="tag tag--accent">Ya sirve en la ${REUNIONES[otro]}</span>` : ''}${p.enPrueba ? html`<span class="tag tag--info">En prueba</span>` : ''}</span></span>
            <span class="pick__ok">${icono('check')}</span>
          </label>`)}
      </form>`,
    pie: html`<button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button><button class="btn btn--primary" type="button" data-action="turno-guardar">Guardar</button>`,
  });
}

function guardarElegidos() {
  const f = document.getElementById('fElegir');
  const { fecha, rol } = f.dataset;
  const ids = [...f.querySelectorAll('input[name=p]:checked')].map((i) => i.value);
  const id = idTurno(fecha, rol);
  const undo = guardar([{ c: 'turnos', id, data: ids.length ? { equipoId: EQUIPO_CREATIVO, fecha, rolId: rol, personas: ids } : null }]);
  cerrarHoja();
  toast(ids.length ? `Turno guardado: ${unir(ids.map(corto))}` : 'Turno vaciado', { accion: { texto: 'Deshacer', fn: undo } });
}

// ---------- no estarán ----------
function abrirAusencia(fecha) {
  abrirHoja({
    titulo: 'Quién no estará',
    cuerpo: html`
      <p class="muted" style="font-size:var(--t-sm)">${fechaLarga(fecha)}</p>
      <form id="fAus" class="form-grid" novalidate data-fecha="${fecha}">
        <div class="field"><label for="au-p">Persona</label>
          <select class="select" id="au-p" name="personaId"><option value="">Elegir…</option>${personas().filter((p) => p.activo !== false).map((p) => html`<option value="${p.id}">${p.nombre}${p.apellidos ? ` ${p.apellidos}` : ''}</option>`)}</select></div>
        <div class="field"><span class="label">¿En qué reunión?</span>
          <div class="chips">
            <label class="chip chip--radio"><input class="sr-only" type="radio" name="cuales" value="ambas" checked>Ambas</label>
            <label class="chip chip--radio"><input class="sr-only" type="radio" name="cuales" value="r1">Solo la 1ra</label>
            <label class="chip chip--radio"><input class="sr-only" type="radio" name="cuales" value="r2">Solo la 2da</label>
          </div></div>
        <div class="field"><label for="au-n">Nota <span class="opt">(opcional)</span></label><input class="input" id="au-n" name="nota" placeholder="Ej: viaja, enfermo…" autocomplete="off"></div>
      </form>`,
    pie: html`<button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button><button class="btn btn--primary" type="button" data-action="turno-aus-guardar">Guardar</button>`,
  });
}

function guardarAusencia() {
  const f = document.getElementById('fAus');
  const d = leerForm(f);
  if (!d.personaId) { marcarError(f.personaId, 'Elige a la persona'); return; }
  const { fecha } = f.dataset;
  const reuniones = d.cuales === 'r1' ? ['r1'] : d.cuales === 'r2' ? ['r2'] : ['r1', 'r2'];
  const undo = guardar([{ c: 'ausencias', id: `${fecha}~${d.personaId}`, data: { equipoId: EQUIPO_CREATIVO, fecha, personaId: d.personaId, reuniones, nota: d.nota || '' } }]);
  cerrarHoja();
  const asignada = [...new Set(todosLosRoles().filter((r) => personasDeTurno(fecha, r.id).includes(d.personaId)).map((r) => r.nombre))];
  toast(asignada.length ? `${corto(d.personaId)} no estará, pero tiene turno en: ${asignada.join(', ')}` : `${corto(d.personaId)} no estará`, { accion: { texto: 'Deshacer', fn: undo } });
}

// ---------- copiar el domingo anterior ----------
function copiarAnterior() {
  const prev = sumarDias(est.domingo, -7);
  const aus = new Map(ausenciasDe(est.domingo).map((a) => [a.personaId, a]));
  const ops = [];
  let quitados = 0;
  todosLosRoles().filter((r) => r.activo !== false).forEach((r) => {
    if (personasDeTurno(est.domingo, r.id).length) return;
    const ids = personasDeTurno(prev, r.id).filter((id) => { const a = aus.get(id); const fuera = a && afecta(a, r.grupo); if (fuera) quitados++; return !fuera; });
    if (ids.length) ops.push({ c: 'turnos', id: idTurno(est.domingo, r.id), data: { equipoId: EQUIPO_CREATIVO, fecha: est.domingo, rolId: r.id, personas: ids } });
  });
  if (!ops.length) { toast('No hay nada nuevo que copiar del domingo anterior', { tipo: 'error' }); return; }
  const undo = guardar(ops);
  toast(`${ops.length} roles copiados${quitados ? ` (sin ${quitados} que no estarán)` : ''}`, { accion: { texto: 'Deshacer', fn: undo } });
}

// ---------- roles ----------
function abrirRoles() {
  const activos = todosLosRoles().filter((r) => r.activo !== false);
  const porGrupo = ORDEN_GRUPOS.map((g) => ({ g, roles: activos.filter((r) => r.grupo === g).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)) }));
  abrirHoja({
    titulo: 'Roles del equipo',
    ancha: true,
    cuerpo: html`
      <p class="muted" style="font-size:var(--t-sm)">Cada fila es un rol que se asigna cada domingo. Si un rol necesita dos personas, se puede elegir a las dos; si necesita dos filas, créalo dos veces.</p>
      ${porGrupo.map(({ g, roles }) => html`
        <section class="tband" style="--c:${GRUPOS_TURNO[g].color}">
          <h3 class="tband__t">${GRUPOS_TURNO[g].label}</h3>
          <div class="tband__filas">
            ${roles.length ? roles.map((r, i) => html`
              <div class="trol trol--edit"><span class="trol__n">${r.nombre}</span>
                <span class="trol__acc">
                  <button class="icon-btn" type="button" data-action="rol-subir" data-id="${r.id}" aria-label="Subir ${r.nombre}" ${raw(i === 0 ? 'disabled' : '')}>${icono('arrow-up')}</button>
                  <button class="icon-btn" type="button" data-action="rol-bajar" data-id="${r.id}" aria-label="Bajar ${r.nombre}" ${raw(i === roles.length - 1 ? 'disabled' : '')}>${icono('arrow-down')}</button>
                  <button class="icon-btn" type="button" data-action="rol-editar" data-id="${r.id}" aria-label="Editar ${r.nombre}">${icono('edit')}</button>
                </span></div>`) : html`<p class="trol trol--vacio">Sin roles</p>`}
          </div>
        </section>`)}`,
    pie: html`<button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cerrar</button><button class="btn btn--primary" type="button" data-action="rol-nuevo">${icono('plus', 'i--sm')} Nuevo rol</button>`,
  });
}

function formRol(id) {
  const r = id ? obtener('roles', id) : null;
  abrirHoja({
    titulo: r ? 'Editar rol' : 'Nuevo rol',
    cuerpo: html`
      <form id="fRol" class="form-grid" novalidate data-id="${r?.id || ''}">
        <div class="field"><label for="ro-n">Nombre</label><input class="input" id="ro-n" name="nombre" value="${r?.nombre || ''}" placeholder="Ej: Fotografía, Stories…" autocomplete="off" autofocus></div>
        <div class="field"><label for="ro-g">¿Dónde va?</label>
          <select class="select" id="ro-g" name="grupo">${ORDEN_GRUPOS.map((g) => html`<option value="${g}" ${raw((r?.grupo || 'r1') === g ? 'selected' : '')}>${GRUPOS_TURNO[g].label}</option>`)}</select></div>
      </form>`,
    pie: html`${r ? html`<button class="btn btn--danger" type="button" data-action="rol-baja" data-id="${r.id}" style="flex:0 0 auto">Quitar</button>` : ''}<span class="spacer"></span><button class="btn btn--soft" type="button" data-action="rol-lista">Cancelar</button><button class="btn btn--primary" type="button" data-action="rol-guardar" style="flex:0 0 auto">Guardar</button>`,
  });
}

function guardarRol() {
  const f = document.getElementById('fRol');
  const d = leerForm(f);
  if (!d.nombre) { marcarError(f.nombre, 'Escribe el nombre del rol'); return; }
  const previo = f.dataset.id ? obtener('roles', f.dataset.id) : null;
  const mismoGrupo = todosLosRoles().filter((r) => r.grupo === d.grupo && r.id !== previo?.id);
  const orden = previo && previo.grupo === d.grupo ? previo.orden : Math.max(0, ...mismoGrupo.map((r) => r.orden ?? 0)) + 10;
  guardar([{ c: 'roles', id: previo?.id || nuevoId('rol'), data: { equipoId: EQUIPO_CREATIVO, nombre: d.nombre, grupo: d.grupo, orden, activo: true } }]);
  abrirRoles();
}

function moverRol(id, dir) {
  const r = obtener('roles', id);
  const del = todosLosRoles().filter((x) => x.grupo === r.grupo && x.activo !== false).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const i = del.findIndex((x) => x.id === id);
  const j = i + dir;
  if (j < 0 || j >= del.length) return;
  const a = del[i]; const b = del[j];
  const { id: _a, ...da } = a; const { id: _b, ...db } = b;
  guardar([{ c: 'roles', id: a.id, data: { ...da, orden: b.orden } }, { c: 'roles', id: b.id, data: { ...db, orden: a.orden } }]);
  abrirRoles();
}

// ---------- compartir ----------
async function compartir() {
  const fechas = est.vista === 'mes' ? domingosDelMes(est.mes) : [est.domingo];
  const filas = filasParaFechas(fechas);
  if (!filas.length) { toast('No hay turnos para compartir todavía', { tipo: 'error' }); return; }
  toast('Preparando la imagen…');
  try {
    const resultado = await compartirTurnos({
      titulo: est.vista === 'mes' ? `Turnos · ${nombreMes(`${est.mes}-01`)}` : `Turnos · ${fechaLarga(est.domingo)}`,
      subtitulo: 'Equipo Creativo TLC · 1ra y 2da reunión',
      fechas,
      filas,
      ausentes: fechas.map((f) => ausenciasDe(f).map(etiquetaAusente)),
    }, est.vista === 'mes' ? `turnos-${est.mes}.png` : `turnos-${est.domingo}.png`);
    if (resultado === 'descargada') toast('Imagen descargada');
  } catch (e) {
    console.error(e);
    toast('No se pudo crear la imagen. Intenta de nuevo.', { tipo: 'error' });
  }
}

registrarAcciones({
  'turnos-vista': (el) => { est.vista = el.dataset.v; try { localStorage.setItem(CLAVE, est.vista); } catch { /* */ } refrescar(); },
  'turnos-prev': () => { if (est.vista === 'mes') est.mes = sumarMeses(`${est.mes}-01`, -1).slice(0, 7); else est.domingo = sumarDias(est.domingo, -7); refrescar(); },
  'turnos-next': () => { if (est.vista === 'mes') est.mes = sumarMeses(`${est.mes}-01`, 1).slice(0, 7); else est.domingo = sumarDias(est.domingo, 7); refrescar(); },
  'turnos-hoy': () => { est.domingo = domingoDe(hoy()); est.mes = hoy().slice(0, 7); refrescar(); },
  'turnos-ir-domingo': (el) => { est.domingo = el.dataset.fecha; est.vista = 'domingo'; refrescar(); },
  'turnos-compartir': compartir,
  'turnos-copiar': copiarAnterior,
  'turnos-roles': abrirRoles,
  'turno-elegir': (el) => abrirElegir(el.dataset.fecha, el.dataset.rol),
  'turno-guardar': guardarElegidos,
  'turno-aus-nueva': (el) => abrirAusencia(el.dataset.fecha),
  'turno-aus-guardar': guardarAusencia,
  'turno-aus-quitar': (el) => { const undo = guardar([{ c: 'ausencias', id: el.dataset.id, data: null }]); toast('Quitado de "No estarán"', { accion: { texto: 'Deshacer', fn: undo } }); },
  'rol-lista': abrirRoles,
  'rol-nuevo': () => formRol(null),
  'rol-editar': (el) => formRol(el.dataset.id),
  'rol-guardar': guardarRol,
  'rol-subir': (el) => moverRol(el.dataset.id, -1),
  'rol-bajar': (el) => moverRol(el.dataset.id, 1),
  'rol-baja': async (el) => {
    const r = obtener('roles', el.dataset.id);
    if (!(await confirmar({ titulo: `Quitar "${r.nombre}"`, mensaje: 'Deja de aparecer en los turnos nuevos. Lo que ya se asignó se conserva en el historial.', boton: 'Quitar' }))) return;
    const { id: _i, ...resto } = r;
    guardar([{ c: 'roles', id: r.id, data: { ...resto, activo: false } }]);
    abrirRoles();
  },
});
