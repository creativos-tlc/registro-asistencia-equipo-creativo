import { api, esLider, guardar, yo } from '../store.js';
import { AREAS_SUGERIDAS, EQUIPO_CREATIVO, ASISTENCIA } from '../model.js';
import { eventos, estadisticas, persona, personas, tareasDe } from '../datos.js';
import { edadDe, fechaCorta, fechaRelativa, hoy, html, icono, norm, nuevoId, plural, raw, telLimpio } from '../util.js';
import { abrirHoja, avatar, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast } from '../ui.js';
import { lista } from '../store.js';

const nombreCompleto = (p) => [p.nombre, p.apellidos].filter(Boolean).join(' ');

// ---------- perfil ----------
export function verPersona(id) {
  const p = persona(id);
  if (!p) return;
  const s = estadisticas(id);
  const edad = edadDe(p.anioNac);
  const tareasAbiertas = tareasDe(id).filter((t) => t.estado !== 'hecha');
  const proximos = eventos().filter((e) => e.fecha >= hoy() && (e.participantes || []).includes(id)).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 4);
  const tel = telLimpio(p.telefono);
  const dato = (ic, etiqueta, valor, enlace) => (valor ? html`<div class="row" style="min-height:52px">${icono(ic)}<span class="row__main"><span class="row__sub">${etiqueta}</span>${enlace ? html`<a class="row__title" href="${enlace}" ${raw(enlace.startsWith('http') ? 'target="_blank" rel="noopener"' : '')}>${valor}</a>` : html`<span class="row__title">${valor}</span>`}</span></div>` : '');

  abrirHoja({
    titulo: 'Perfil',
    ancha: true,
    cuerpo: html`
      <div style="display:flex;gap:var(--sp-4);align-items:center">
        ${avatar(p.nombre, 'lg')}
        <div style="min-width:0">
          <h3 style="font-size:var(--t-xl)">${nombreCompleto(p)}</h3>
          <div class="chips" style="margin-top:6px">
            <span class="tag ${p.rol === 'lider' ? 'tag--accent' : ''}">${p.rol === 'lider' ? 'Líder' : 'Voluntario'}</span>
            ${p.activo === false ? html`<span class="tag tag--bad">Archivado</span>` : ''}
            ${p.tieneAcceso ? html`<span class="tag tag--info">${icono('lock', 'i--sm')} Tiene acceso</span>` : ''}
            ${s.racha >= 2 ? html`<span class="tag tag--accent">${icono('flame', 'i--sm')} ${s.racha} seguidas</span>` : ''}
          </div>
        </div>
      </div>

      <div class="panel"><div class="list">
        ${dato('phone', 'Teléfono', p.telefono, tel ? `tel:${tel}` : '')}
        ${tel ? dato('message', 'WhatsApp', 'Escribir por WhatsApp', `https://wa.me/${tel.replace(/^\+/, '')}`) : ''}
        ${dato('mail', 'Correo', p.correo, p.correo ? `mailto:${p.correo}` : '')}
        ${dato('pin', 'Dirección', p.direccion)}
        ${dato('cake', 'Nacimiento', p.anioNac ? `${p.anioNac} · ${plural(edad, 'año', 'años')}` : '')}
        ${dato('calendar', 'En el equipo desde', p.desde ? fechaCorta(p.desde) : '')}
        ${dato('alert', 'Contacto de emergencia', p.emergencia)}
        ${!p.telefono && !p.correo && !p.direccion && !p.anioNac && esLider() ? html`<p class="muted" style="padding:var(--sp-4)">Aún no hay datos de contacto. Toca Editar para completarlos.</p>` : ''}
      </div></div>

      ${(p.areas || []).length ? html`<section class="section" style="margin:0"><div class="section__head"><h3 class="section__title">Áreas</h3></div><div class="chips">${p.areas.map((a) => html`<span class="tag">${a}</span>`)}</div></section>` : ''}
      ${p.notas ? html`<section class="section" style="margin:0"><div class="section__head"><h3 class="section__title">Datos importantes</h3></div><p class="muted" style="white-space:pre-wrap">${p.notas}</p></section>` : ''}

      <section class="section" style="margin:0">
        <div class="section__head"><h3 class="section__title">Asistencia</h3></div>
        ${s.total ? html`
          <p style="font-size:var(--t-lg);font-weight:700" class="num">${s.porcentaje === null ? 'Sin porcentaje aún' : `${s.porcentaje}% de asistencia`}</p>
          <div class="chips" style="margin-top:var(--sp-2)"><span class="tag tag--ok">${s.p} presente</span><span class="tag tag--bad">${s.a} ausente</span><span class="tag tag--info">${s.j} justificó</span></div>
          <div class="panel" style="margin-top:var(--sp-3)"><div class="list">${s.historial.slice(0, 8).map((h) => html`
            <div class="row" style="min-height:48px"><span class="row__main"><span class="row__title">${h.evento.titulo}</span><span class="row__sub">${fechaRelativa(h.evento.fecha)}</span></span><span class="tag ${ASISTENCIA[h.estado].tag}">${ASISTENCIA[h.estado].label}</span></div>`)}</div></div>`
          : html`<p class="muted" style="font-size:var(--t-sm)">Todavía no hay listas tomadas para esta persona.</p>`}
      </section>

      <section class="section" style="margin:0">
        <div class="section__head"><h3 class="section__title">Pendiente</h3><button class="section__link solo-lider" type="button" data-action="tarea-nueva" data-persona="${id}">${icono('plus', 'i--sm')} Asignar tarea</button></div>
        ${tareasAbiertas.length || proximos.length ? html`<div class="panel"><div class="list">
          ${tareasAbiertas.map((t) => html`<button class="row" type="button" data-action="tarea-editar" data-id="${t.id}"><span class="row__main"><span class="row__title">${t.titulo}</span><span class="row__sub">${t.vence ? `Vence ${fechaRelativa(t.vence)}` : 'Sin fecha'}</span></span>${icono('circle')}</button>`)}
          ${proximos.map((e) => html`<button class="row" type="button" data-action="evento-ver" data-id="${e.id}"><span class="row__main"><span class="row__title">${e.titulo}</span><span class="row__sub">${fechaRelativa(e.fecha)}</span></span>${icono('calendar')}</button>`)}
        </div></div>` : html`<p class="muted" style="font-size:var(--t-sm)">Sin tareas ni eventos asignados.</p>`}
      </section>

      ${yo()?.rol === 'lider' && p.id !== yo().personaId ? html`
        <section class="section" style="margin:0"><div class="section__head"><h3 class="section__title">Acceso a la app</h3></div>
          <p class="muted" style="font-size:var(--t-sm);margin-bottom:var(--sp-3)">${p.tieneAcceso ? 'Puede entrar con su nombre y PIN. Si lo olvidó, genera uno temporal nuevo.' : 'Aún no puede entrar. Dale acceso para que vea el calendario y sus tareas.'}</p>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
            <button class="btn btn--soft" type="button" data-action="persona-acceso" data-id="${id}">${icono('lock', 'i--sm')} ${p.tieneAcceso ? 'Restablecer PIN' : 'Dar acceso'}</button>
            ${p.tieneAcceso ? html`<button class="btn btn--ghost" type="button" data-action="persona-quitar-acceso" data-id="${id}">Quitar acceso</button>` : ''}
          </div></section>` : ''}`,
    pie: !esLider() ? '' : html`
      <button class="icon-btn icon-btn--danger" type="button" data-action="persona-eliminar" data-id="${id}" aria-label="Archivar o eliminar">${icono('trash')}</button>
      <span class="spacer"></span>
      <button class="btn btn--primary" type="button" data-action="persona-editar" data-id="${id}" style="flex:0 0 auto">${icono('edit', 'i--sm')} Editar</button>`,
  });
}

// ---------- formulario ----------
export function formPersona({ base = null } = {}) {
  const b = base || {};
  const esNueva = !b.id;
  const areas = new Set(b.areas || []);
  const extras = [...areas].filter((a) => !AREAS_SUGERIDAS.includes(a));
  abrirHoja({
    titulo: esNueva ? 'Nuevo voluntario' : 'Editar perfil',
    ancha: true,
    cuerpo: html`
      <form id="fPersona" class="form-grid" novalidate data-id="${b.id || ''}">
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="pe-nombre">Nombre</label><input class="input" id="pe-nombre" name="nombre" value="${b.nombre || ''}" autocomplete="off" autofocus></div>
          <div class="field"><label for="pe-ap">Apellidos <span class="opt">(opcional)</span></label><input class="input" id="pe-ap" name="apellidos" value="${b.apellidos || ''}" autocomplete="off"></div>
        </div>
        <div class="field"><span class="label">Rol en el equipo</span>
          <div class="chips">
            <label class="chip chip--radio"><input class="sr-only" type="radio" name="rol" value="voluntario" ${raw((b.rol || 'voluntario') === 'voluntario' ? 'checked' : '')}>Voluntario</label>
            <label class="chip chip--radio"><input class="sr-only" type="radio" name="rol" value="lider" ${raw(b.rol === 'lider' ? 'checked' : '')}>Líder</label>
          </div></div>
        <div class="form-grid form-grid--2">
          <div class="field"><label for="pe-tel">Teléfono <span class="opt">(opcional)</span></label><input class="input" id="pe-tel" name="telefono" type="tel" inputmode="tel" value="${b.telefono || ''}" placeholder="+56 9 1234 5678" autocomplete="off"></div>
          <div class="field"><label for="pe-mail">Correo <span class="opt">(opcional)</span></label><input class="input" id="pe-mail" name="correo" type="email" inputmode="email" value="${b.correo || ''}" autocomplete="off"></div>
        </div>
        <div class="form-grid form-grid--2 keep">
          <div class="field"><label for="pe-anio">Año de nacimiento <span class="opt">(opcional)</span></label><input class="input" id="pe-anio" name="anioNac" type="number" inputmode="numeric" min="1930" max="${new Date().getFullYear()}" value="${b.anioNac || ''}" placeholder="1995"></div>
          <div class="field"><label for="pe-desde">Se incorporó</label><input class="input" id="pe-desde" name="desde" type="date" value="${b.desde || hoy()}"></div>
        </div>
        <div class="field"><label for="pe-dir">Dirección <span class="opt">(opcional)</span></label><input class="input" id="pe-dir" name="direccion" value="${b.direccion || ''}" autocomplete="off"></div>
        <div class="field"><span class="label">Áreas donde ayuda</span>
          <div class="chips">${[...AREAS_SUGERIDAS, ...extras].map((a) => html`<label class="chip chip--check"><input class="sr-only" type="checkbox" name="area" value="${a}" ${raw(areas.has(a) ? 'checked' : '')}>${a}</label>`)}</div>
          <input class="input" name="areaExtra" placeholder="Otra área (separa con coma)" style="margin-top:var(--sp-2)" autocomplete="off"></div>
        <div class="field"><label for="pe-emg">Contacto de emergencia <span class="opt">(opcional)</span></label><input class="input" id="pe-emg" name="emergencia" value="${b.emergencia || ''}" placeholder="Nombre y teléfono" autocomplete="off"></div>
        <div class="field"><label for="pe-notas">Datos importantes <span class="opt">(opcional)</span></label><textarea class="textarea" id="pe-notas" name="notas" placeholder="Disponibilidad, alergias, equipo que maneja…">${b.notas || ''}</textarea>
          <p class="hint">Solo lo ven los líderes con acceso a la app.</p></div>
      </form>`,
    pie: html`<button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button><button class="btn btn--primary" type="button" data-action="persona-guardar">${esNueva ? 'Agregar al equipo' : 'Guardar cambios'}</button>`,
  });
}

function guardarPersona() {
  const form = document.getElementById('fPersona');
  const d = leerForm(form);
  if (!d.nombre) { marcarError(form.nombre, 'Escribe un nombre'); return; }
  const id = form.dataset.id;
  const otras = personas({ inactivas: true }).filter((p) => p.id !== id);
  if (otras.some((p) => norm(p.nombre) === norm(d.nombre) && norm(p.apellidos) === norm(d.apellidos))) { marcarError(form.nombre, 'Ya existe alguien con ese nombre. Agrega el apellido para distinguirlos.'); return; }
  const anio = d.anioNac ? Number(d.anioNac) : null;
  if (anio && (anio < 1930 || anio > new Date().getFullYear())) { marcarError(form.anioNac, 'Revisa el año de nacimiento'); return; }
  const marcadas = [...form.closest('.sheet__body').querySelectorAll('input[name=area]:checked')].map((i) => i.value);
  const extras = d.areaExtra ? d.areaExtra.split(',').map((x) => x.trim()).filter(Boolean) : [];
  const previa = id ? persona(id) : null;
  const data = {
    ...(previa || {}),
    equipoId: EQUIPO_CREATIVO, equipos: previa?.equipos || [EQUIPO_CREATIVO], activo: previa ? previa.activo !== false : true,
    nombre: d.nombre, apellidos: d.apellidos || '', rol: d.rol || 'voluntario', telefono: d.telefono || '', correo: d.correo || '',
    anioNac: anio, direccion: d.direccion || '', desde: d.desde || hoy(), emergencia: d.emergencia || '', notas: d.notas || '',
    areas: [...new Set([...marcadas, ...extras])],
  };
  delete data.id;
  const nuevoIdPersona = id || nuevoId('per');
  guardar([{ c: 'personas', id: nuevoIdPersona, data }]);
  toast(id ? 'Perfil guardado' : `${d.nombre} se sumó al equipo`);
  if (id) verPersona(id); else cerrarHoja();
}

// ---------- archivar / eliminar ----------
async function eliminarPersona(id) {
  const p = persona(id);
  const opciones = p.activo === false
    ? [{ valor: 'reactivar', texto: 'Reactivar' }, { valor: 'eliminar', texto: 'Eliminar para siempre', peligro: true }]
    : [{ valor: 'archivar', texto: 'Archivar' }, { valor: 'eliminar', texto: 'Eliminar para siempre', peligro: true }];
  const r = await confirmar({ titulo: nombreCompleto(p), mensaje: p.activo === false ? 'Está archivado: no aparece en listas nuevas, pero conserva su historial.' : 'Archivar lo saca de las listas nuevas y conserva su historial de asistencia. Eliminar borra todo su rastro.', opciones });
  if (!r) return;
  if (r === 'archivar' || r === 'reactivar') {
    guardar([{ c: 'personas', id, data: { ...p, activo: r === 'reactivar' } }]);
    toast(r === 'archivar' ? `${p.nombre} archivado` : `${p.nombre} reactivado`);
    verPersona(id);
    return;
  }
  if (id === yo()?.personaId) { toast('No puedes eliminarte a ti mismo', { tipo: 'error' }); return; }
  const ops = [{ c: 'personas', id, data: null }];
  lista('asistencia').filter((a) => a.personaId === id).forEach((a) => ops.push({ c: 'asistencia', id: a.id, data: null }));
  lista('tareas').filter((t) => (t.asignados || []).includes(id)).forEach((t) => ops.push({ c: 'tareas', id: t.id, data: { ...t, asignados: t.asignados.filter((x) => x !== id) } }));
  lista('eventos').filter((e) => (e.participantes || []).includes(id) || (e.programa || []).some((f) => f.responsableId === id)).forEach((e) => ops.push({ c: 'eventos', id: e.id, data: { ...e, participantes: (e.participantes || []).filter((x) => x !== id), programa: (e.programa || []).map((f) => (f.responsableId === id ? { ...f, responsableId: '' } : f)) } }));
  const undo = guardar(ops);
  if (p.tieneAcceso) api('admin/quitar-acceso', { metodo: 'POST', cuerpo: { personaId: id } }).catch(() => {});
  cerrarHoja();
  toast(`${p.nombre} eliminado`, { accion: { texto: 'Deshacer', fn: undo } });
}

// ---------- acceso a la app ----------
async function darAcceso(id) {
  const p = persona(id);
  if (!(await confirmar({ titulo: p.tieneAcceso ? `Restablecer PIN de ${p.nombre}` : `Dar acceso a ${p.nombre}`, mensaje: 'Se genera un PIN temporal que tendrá que cambiar al entrar por primera vez. Si ya tenía sesiones abiertas, se cierran.', boton: 'Generar PIN', peligro: false }))) return;
  try {
    const { pinTemporal } = await api('admin/credencial', { metodo: 'POST', cuerpo: { personaId: id, nombre: p.nombre, rol: p.rol === 'lider' ? 'lider' : 'voluntario' } });
    guardar([{ c: 'personas', id, data: { ...p, tieneAcceso: true } }]);
    abrirHoja({
      titulo: `PIN temporal de ${p.nombre}`,
      cuerpo: html`
        <div class="panel panel--pad" style="text-align:center"><div class="num" style="font-size:44px;font-weight:800;letter-spacing:0.18em">${pinTemporal}</div><p class="hint">Se muestra una sola vez.</p></div>
        <div class="notice notice--warn">${icono('shield')}<div class="notice__body"><span>Compártelo <strong>en privado</strong>. ${p.nombre} entra a esta misma dirección, elige su nombre, escribe este PIN y crea uno propio.</span></div></div>`,
      pie: html`<button class="btn btn--soft" type="button" data-action="copiar-pin" data-pin="${pinTemporal}">${icono('copy', 'i--sm')} Copiar</button><button class="btn btn--primary" type="button" data-action="persona-ver" data-id="${id}">Listo</button>`,
    });
  } catch (e) {
    toast(e.message || 'No se pudo generar el PIN', { tipo: 'error' });
  }
}

registrarAcciones({
  'persona-nueva': () => formPersona(),
  'persona-ver': (el) => verPersona(el.dataset.id),
  'persona-editar': (el) => formPersona({ base: persona(el.dataset.id) }),
  'persona-guardar': guardarPersona,
  'persona-eliminar': (el) => eliminarPersona(el.dataset.id),
  'persona-acceso': (el) => darAcceso(el.dataset.id),
  'persona-quitar-acceso': async (el) => {
    const p = persona(el.dataset.id);
    if (!(await confirmar({ titulo: `Quitar acceso a ${p.nombre}`, mensaje: 'Ya no podrá entrar a la app. Su perfil y su historial se conservan.', boton: 'Quitar acceso' }))) return;
    try { await api('admin/quitar-acceso', { metodo: 'POST', cuerpo: { personaId: p.id } }); guardar([{ c: 'personas', id: p.id, data: { ...p, tieneAcceso: false } }]); toast('Acceso quitado'); verPersona(p.id); }
    catch (e) { toast(e.message || 'No se pudo quitar el acceso', { tipo: 'error' }); }
  },
  'copiar-pin': async (el) => { try { await navigator.clipboard.writeText(el.dataset.pin); toast('PIN copiado'); } catch { toast('No se pudo copiar. Anótalo a mano.', { tipo: 'error' }); } },
});
