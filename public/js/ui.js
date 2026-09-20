/* Piezas de interfaz compartidas: hojas, avisos, confirmación, avatar, formularios. */
import { html, icono, iniciales, poner, tonoDe, raw } from './util.js';

// ---------- acciones (delegación de clics por data-action) ----------
export const acciones = {};
export const registrarAcciones = (mapa) => Object.assign(acciones, mapa);
export function iniciarAcciones() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = acciones[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
}

// ---------- avisos ----------
export function toast(mensaje, { tipo = 'ok', accion = null, ms = 3200 } = {}) {
  const cont = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast${tipo === 'error' ? ' toast--error' : ''}`;
  poner(el, html`${icono(tipo === 'error' ? 'alert' : 'check')}<span class="toast__txt">${mensaje}</span>${accion ? html`<button class="toast__btn" type="button">${accion.texto}</button>` : ''}`);
  const quitar = () => el.remove();
  if (accion) el.querySelector('.toast__btn').addEventListener('click', () => { accion.fn(); quitar(); });
  cont.appendChild(el);
  setTimeout(quitar, accion ? Math.max(ms, 7000) : ms);
}

// ---------- hoja modal ----------
const dlg = () => document.getElementById('dlg');
let alCerrarActual = null;

export function abrirHoja({ titulo, cuerpo, pie = '', ancha = false, alCerrar = null }) {
  const d = dlg();
  if (d.open) d.close();
  alCerrarActual = alCerrar;
  d.className = `sheet${ancha ? ' sheet--wide' : ''}`;
  d.setAttribute('aria-labelledby', 'dlgTitulo');
  poner(d, html`
    <div class="sheet__head">
      <h2 class="sheet__title" id="dlgTitulo">${titulo}</h2>
      <button class="icon-btn" type="button" data-action="cerrar-hoja" aria-label="Cerrar">${icono('x')}</button>
    </div>
    <div class="sheet__body">${cuerpo}</div>
    ${pie ? html`<div class="sheet__foot">${pie}</div>` : ''}`);
  d.showModal();
  d.querySelector('.sheet__body').scrollTop = 0;
  return d;
}
export function actualizarHoja({ titulo, cuerpo, pie }) {
  const d = dlg();
  if (!d.open) return;
  if (titulo !== undefined) d.querySelector('.sheet__title').textContent = titulo;
  if (cuerpo !== undefined) poner(d.querySelector('.sheet__body'), cuerpo);
  if (pie !== undefined) {
    let f = d.querySelector('.sheet__foot');
    if (!f) { f = document.createElement('div'); f.className = 'sheet__foot'; d.appendChild(f); }
    poner(f, pie);
  }
}
export const cerrarHoja = () => { const d = dlg(); if (d.open) d.close(); };
export const hojaAbierta = () => dlg().open;

export function iniciarHoja() {
  const d = dlg();
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => { const f = alCerrarActual; alCerrarActual = null; if (f) f(); });
  registrarAcciones({ 'cerrar-hoja': () => cerrarHoja() });
}

// ---------- confirmación ----------
export function confirmar({ titulo, mensaje = '', boton = 'Eliminar', peligro = true, opciones = null }) {
  return new Promise((resolver) => {
    const d = document.createElement('dialog');
    d.className = 'sheet';
    poner(d, html`
      <div class="sheet__head"><h2 class="sheet__title">${titulo}</h2></div>
      <div class="sheet__body">${mensaje ? html`<p class="muted">${mensaje}</p>` : ''}</div>
      <div class="sheet__foot">
        <button class="btn btn--soft" type="button" data-r="">Cancelar</button>
        ${opciones ? opciones.map((o) => html`<button class="btn ${o.peligro ? 'btn--danger' : 'btn--soft'}" type="button" data-r="${o.valor}">${o.texto}</button>`) : ''}
        ${opciones ? '' : html`<button class="btn ${peligro ? 'btn--danger' : 'btn--primary'}" type="button" data-r="ok">${boton}</button>`}
      </div>`);
    document.body.appendChild(d);
    let valor = null;
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) { valor = b.dataset.r || null; d.close(); } else if (e.target === d) d.close();
    });
    d.addEventListener('close', () => { d.remove(); resolver(valor); });
    d.showModal();
    d.querySelector('[data-r=""]').focus();
  });
}

// ---------- formularios ----------
export function leerForm(raiz) {
  const datos = {};
  raiz.querySelectorAll('[name]').forEach((el) => {
    if (el.type === 'checkbox') datos[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) datos[el.name] = el.value; }
    else datos[el.name] = el.value.trim();
  });
  return datos;
}
export function marcarError(campo, mensaje) {
  if (!campo) return;
  campo.setAttribute('aria-invalid', 'true');
  campo.focus();
  const previo = campo.parentElement.querySelector('.error-msg');
  if (previo) previo.remove();
  const m = document.createElement('div');
  m.className = 'error-msg';
  poner(m, html`${icono('alert', 'i--sm')}<span>${mensaje}</span>`);
  campo.parentElement.appendChild(m);
  campo.addEventListener('input', () => { campo.removeAttribute('aria-invalid'); m.remove(); }, { once: true });
}

export function ocupado(boton, fn) {
  boton.classList.add('btn--busy');
  return Promise.resolve(fn()).finally(() => boton.classList.remove('btn--busy'));
}

// ---------- fragmentos ----------
export const avatar = (nombre, tam = '') =>
  html`<span class="avatar ${tam ? `avatar--${tam}` : ''}" style="--h:hsl(${tonoDe(nombre)} 65% 62%)" aria-hidden="true">${iniciales(nombre)}</span>`;

export const vacio = ({ icon = 'calendar', titulo, texto = '', boton = null }) => html`
  <div class="empty">
    ${icono(icon)}
    <p class="empty__title">${titulo}</p>
    ${texto ? html`<p class="empty__text">${texto}</p>` : ''}
    ${boton ? html`<button class="btn btn--soft" type="button" data-action="${boton.accion}" ${raw(boton.attrs || '')}>${boton.texto}</button>` : ''}
  </div>`;

export const campoOpcional = raw('<span class="opt">(opcional)</span>');
