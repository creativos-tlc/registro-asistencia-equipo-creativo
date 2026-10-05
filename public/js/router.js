/* Router por hash: #/hoy, #/calendario, #/equipo/per_x ... Permite volver atrás con el botón del celular. */
import { poner } from './util.js';

const vistas = {};
let actual = { nombre: null, param: null };
let listo = false;
let pendiente = 0;

export const registrar = (nombre, vista) => { vistas[nombre] = vista; };

let permitidas = null; // null = todas
let inicio = 'hoy';
export function limitarRutas(lista, rutaInicial) { permitidas = lista ? new Set([...lista, 'ajustes']) : null; inicio = rutaInicial || 'hoy'; }

export function rutaActual() {
  const [camino, consulta = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [nombre = '', param = ''] = camino.split('/');
  const ok = vistas[nombre] && (!permitidas || permitidas.has(nombre));
  return { nombre: ok ? nombre : inicio, param: ok ? decodeURIComponent(param) : '', consulta: new URLSearchParams(consulta) };
}

export function ir(destino, { reemplazar = false } = {}) {
  const hash = `#/${destino}`;
  if (reemplazar) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (reemplazar) refrescar({ cambioDeRuta: true });
}

function restaurarFoco(idPrevio, seleccion) {
  if (!idPrevio) return;
  const el = document.getElementById(idPrevio);
  if (!el) return;
  el.focus({ preventScroll: true });
  if (seleccion && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(seleccion[0], seleccion[1]); } catch { /* tipos sin selección */ } }
}

export function refrescar({ cambioDeRuta = false } = {}) {
  if (!listo) return;
  const { nombre, param, consulta } = rutaActual();
  const vista = vistas[nombre];
  const raiz = document.getElementById('view');
  const mismaRuta = nombre === actual.nombre && !cambioDeRuta;
  const enfocado = document.activeElement && raiz.contains(document.activeElement) ? document.activeElement : null;
  const idFoco = enfocado?.id || null;
  const sel = enfocado && 'selectionStart' in enfocado ? [enfocado.selectionStart, enfocado.selectionEnd] : null;
  const scroll = window.scrollY;

  actual = { nombre, param };
  document.getElementById('barTitle').textContent = vista.titulo;
  document.title = `${vista.titulo} · Coordinación Equipo Creativo`;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === nombre || (nombre === 'ajustes' && false)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.querySelector('.fab')?.classList.toggle('fab--hidden', !!vista.sinFab);

  poner(raiz, vista.render({ param, consulta }));
  vista.montar?.(raiz, { param, consulta, mismaRuta });

  if (mismaRuta) { window.scrollTo(0, scroll); restaurarFoco(idFoco, sel); }
  else { window.scrollTo(0, 0); raiz.focus({ preventScroll: true }); }
}

/** Pide un redibujado agrupado (varios cambios seguidos = un solo dibujo). */
export function solicitarRefresco() {
  if (pendiente) return;
  pendiente = requestAnimationFrame(() => { pendiente = 0; refrescar(); });
}

export function iniciarRouter() {
  listo = true;
  addEventListener('hashchange', () => refrescar({ cambioDeRuta: true }));
  refrescar({ cambioDeRuta: true });
}
