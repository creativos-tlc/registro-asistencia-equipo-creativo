import { arrancar, comenzar, alExpirarSesion, suscribir, estadoSync, sincronizarAhora, yo, obtener, poner as guardarDoc } from './store.js';
import { EQUIPO_CREATIVO, EQUIPO_INICIAL, MODULOS } from './model.js';
import { equipoActual } from './datos.js';
import { html, icono, poner } from './util.js';
import { avatar, iniciarAcciones, iniciarHoja, registrarAcciones, abrirHoja, cerrarHoja, toast } from './ui.js';
import { mostrarAcceso } from './gate.js';
import { iniciarRouter, registrar, solicitarRefresco, ir } from './router.js';
import { ofrecerImportacion } from './legacy.js';

import { vistaHoy } from './views/hoy.js';
import { vistaCalendario } from './views/calendario.js';
import { vistaTareas } from './views/tareas.js';
import { vistaEquipo } from './views/equipo.js';
import { vistaContenido } from './views/contenido.js';
import { vistaAjustes } from './views/ajustes.js';
import './hojas/evento.js';
import './hojas/tarea.js';
import './hojas/publicacion.js';
import './hojas/persona.js';
import './hojas/asistencia.js';

registrar('hoy', vistaHoy);
registrar('calendario', vistaCalendario);
registrar('tareas', vistaTareas);
registrar('equipo', vistaEquipo);
registrar('contenido', vistaContenido);
registrar('ajustes', vistaAjustes);

// ---------- navegación ----------
function construirNav() {
  const equipo = equipoActual();
  const modulos = (equipo.modulos || EQUIPO_INICIAL.modulos).filter((m) => MODULOS[m]);
  const enlace = (m, clase) => html`<a class="${clase}" href="#/${MODULOS[m].ruta}" data-nav="${m}">${icono(MODULOS[m].icono)}<span>${MODULOS[m].label}</span></a>`;
  const tabbar = document.getElementById('tabbar');
  tabbar.style.setProperty('--tabs', modulos.length);
  poner(tabbar, modulos.map((m) => enlace(m, 'tab')));
  poner(document.getElementById('sideNav'), modulos.map((m) => enlace(m, 'side__link')));
  document.getElementById('brandTeam').textContent = `${equipo.nombre} · TLC`;
  const persona = yo();
  poner(document.getElementById('sideUser'), html`
    ${avatar(persona.nombre, 'sm')}
    <div class="who__txt"><strong>${persona.nombre}</strong><span>${persona.rol === 'lider' ? 'Líder' : 'Voluntario'}</span></div>`);
}

// ---------- estado de sincronización ----------
function pintarSync() {
  const s = estadoSync();
  const b = document.getElementById('syncBtn');
  let clase = 'sync'; let txt = 'Guardado'; let titulo = 'Todo está guardado y compartido.';
  if (s.estado === 'busy') { clase += ' sync--busy'; txt = 'Guardando…'; titulo = 'Enviando cambios…'; }
  else if (s.estado === 'off') { clase += ' sync--off'; txt = s.pendientes ? `Sin conexión · ${s.pendientes}` : 'Sin conexión'; titulo = 'Sin conexión: los cambios se guardan en este teléfono y se envían al volver.'; }
  else if (s.pendientes) { clase += ' sync--pend'; txt = `${s.pendientes} por enviar`; titulo = 'Cambios esperando ser enviados.'; }
  b.className = clase;
  b.title = titulo;
  b.setAttribute('aria-label', `${txt}. Toca para sincronizar ahora.`);
  poner(b, html`<span class="sync__dot"></span><span class="sync__txt">${txt}</span>`);
}

// ---------- menú de creación rápida ----------
function menuCrear() {
  const modulos = equipoActual().modulos || [];
  const item = (accion, ic, titulo, sub, color) => html`
    <button class="menu__item" type="button" data-action="${accion}">
      <span class="typebadge" style="--c:${color}">${icono(ic)}</span>
      <span><strong>${titulo}</strong><span>${sub}</span></span>
    </button>`;
  abrirHoja({
    titulo: 'Crear',
    cuerpo: html`<div class="menu">
      ${item('evento-nuevo', 'calendar', 'Evento', 'Reunión, servicio, ensayo o grabación', 'var(--info)')}
      ${item('tarea-nueva', 'tasks', 'Tarea', 'Asignar algo a alguien del equipo', 'var(--tx-2)')}
      ${modulos.includes('contenido') ? item('publicacion-nueva', 'image', 'Publicación', 'Instagram o WhatsApp', 'var(--pink)') : ''}
      ${item('persona-nueva', 'user-plus', 'Voluntario', 'Sumar a alguien al equipo', 'var(--accent)')}
    </div>`,
  });
}

registrarAcciones({
  'crear-menu': () => menuCrear(),
  'ir-ajustes': () => ir('ajustes'),
  'recargar': () => location.reload(),
  'sync-ahora': async () => { await sincronizarAhora(); const s = estadoSync(); toast(s.estado === 'off' ? 'Sin conexión. Se enviará al reconectar.' : 'Todo sincronizado', { tipo: s.estado === 'off' ? 'error' : 'ok' }); },
});

// ---------- arranque ----------
async function entrar() {
  const resultado = await arrancar();
  if (resultado === 'login') {
    await mostrarAcceso();
  }
  document.getElementById('gate').hidden = true;
  document.getElementById('shell').hidden = false;
  await comenzar();
  if (!obtener('equipos', EQUIPO_CREATIVO)) guardarDoc('equipos', EQUIPO_CREATIVO, EQUIPO_INICIAL);
  construirNav();
  pintarSync();
  iniciarRouter();
  ofrecerImportacion();
}

iniciarAcciones();
iniciarHoja();

suscribir((colecciones) => {
  if (colecciones.has('_sync')) pintarSync();
  if ([...colecciones].some((c) => c !== '_sync')) {
    if (colecciones.has('equipos')) construirNav();
    solicitarRefresco();
  }
});

alExpirarSesion(async () => {
  cerrarHoja();
  await mostrarAcceso();
  document.getElementById('shell').hidden = false;
  construirNav();
  await sincronizarAhora();
  toast('Sesión iniciada de nuevo');
});

entrar().catch((e) => {
  console.error(e);
  poner(document.getElementById('gate'), html`<div class="gate"><div class="gate__card"><h2>No se pudo abrir la app</h2><p>${e.message || 'Error desconocido'}. Revisa tu conexión y recarga la página.</p><button class="btn btn--primary" type="button" data-action="recargar">Recargar</button></div></div>`);
  document.getElementById('gate').hidden = false;
});
