/* Pantalla de acceso: elegir nombre → PIN → (si es temporal) crear PIN propio. */
import { api, ingresar, cambiarPin, ErrorApi } from './store.js';
import { html, icono, poner } from './util.js';
import { avatar, marcarError } from './ui.js';
import { bloqueFrase } from './bienvenida.js';

const marca = html`
  <div class="gate__brand">
    <span class="brand__mark" aria-hidden="true">${icono('check')}</span>
    <span class="brand__txt"><strong>Coordinación</strong><span>Equipo Creativo · TLC</span></span>
  </div>`;

function mensajeDe(e) {
  if (e instanceof ErrorApi && e.status === 429) {
    const min = Math.max(1, Math.ceil((e.datos.reintentarEnSeg || 900) / 60));
    return `Demasiados intentos. Espera ${min} min y vuelve a probar.`;
  }
  if (e instanceof ErrorApi && e.status === 0) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return e.message || 'No se pudo entrar';
}

function enviarConEnter(form) {
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); form.requestSubmit(); } });
}

export function mostrarAcceso() {
  const cont = document.getElementById('gate');
  document.getElementById('shell').hidden = true;
  cont.hidden = false;

  return new Promise((resolver) => {
    const pintar = (contenido) => { poner(cont, html`<div class="gate"><div class="gate__card">${marca}${contenido}</div></div>`); };

    async function pantallaNombres() {
      pintar(html`<p class="muted">Cargando…</p>`);
      let personas;
      try { ({ personas } = await api('acceso')); } catch (e) {
        pintar(html`<div><h2>Sin conexión</h2><p>${mensajeDe(e)}</p></div><button class="btn btn--primary" type="button" id="reintentar">Reintentar</button>`);
        cont.querySelector('#reintentar').addEventListener('click', pantallaNombres);
        return;
      }
      pintar(html`
        ${bloqueFrase()}
        <div><h2>¿Quién eres?</h2><p>Elige tu nombre para entrar.</p></div>
        ${personas.length ? html`<div class="names">${personas.map((p) => html`<button class="names__btn" type="button" data-n="${p.nombre}" data-id="${p.personaId}">${avatar(p.nombre)}<span>${p.nombre}</span></button>`)}</div>`
          : html`<div class="notice">${icono('info')}<div class="notice__body">Todavía no hay accesos creados. Un administrador debe crearlos con <strong>scripts/crear-acceso.mjs</strong>.</div></div>`}
        <p class="hint">¿No apareces? Pídele a un líder que te dé acceso.</p>`);
      cont.querySelectorAll('.names__btn').forEach((b) => b.addEventListener('click', () => pantallaPin(b.dataset.n)));
    }

    function pantallaPin(nombre, aviso = '') {
      pintar(html`
        <button class="btn btn--ghost btn--sm" type="button" id="volver" style="align-self:flex-start;margin-left:-8px">${icono('chev-l', 'i--sm')} Cambiar de persona</button>
        <div style="display:flex;gap:12px;align-items:center">${avatar(nombre, 'lg')}<div><h2>Hola, ${nombre}</h2><p>Ingresa tu PIN.</p></div></div>
        <form id="f" class="form-grid" novalidate>
          <div class="field">
            <label for="pin">PIN</label>
            <input class="input" id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" autofocus>
            ${aviso ? html`<div class="error-msg">${icono('alert', 'i--sm')}<span>${aviso}</span></div>` : ''}
          </div>
          <button class="btn btn--primary btn--block" type="submit">Entrar</button>
        </form>`);
      cont.querySelector('#volver').addEventListener('click', pantallaNombres);
      enviarConEnter(cont.querySelector('#f'));
      cont.querySelector('#f').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const campo = cont.querySelector('#pin');
        const pin = campo.value.trim();
        if (!/^\d{4,8}$/.test(pin)) { marcarError(campo, 'El PIN son entre 4 y 8 números'); return; }
        const boton = cont.querySelector('button[type=submit]');
        boton.classList.add('btn--busy');
        try {
          const persona = await ingresar(nombre, pin);
          if (persona.debeCambiarPin) pantallaNuevoPin(pin); else terminar();
        } catch (e) {
          boton.classList.remove('btn--busy');
          marcarError(campo, mensajeDe(e));
          campo.value = '';
        }
      });
    }

    function pantallaNuevoPin(actual, aviso = '') {
      pintar(html`
        <div><h2>Crea tu PIN</h2><p>El PIN que recibiste es temporal. Elige uno propio de 4 a 8 números que puedas recordar.</p></div>
        <form id="f" class="form-grid" novalidate>
          <div class="field"><label for="n1">PIN nuevo</label><input class="input" id="n1" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" autofocus></div>
          <div class="field"><label for="n2">Repite el PIN</label><input class="input" id="n2" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8">
            ${aviso ? html`<div class="error-msg">${icono('alert', 'i--sm')}<span>${aviso}</span></div>` : ''}</div>
          <button class="btn btn--primary btn--block" type="submit">Guardar y entrar</button>
        </form>`);
      enviarConEnter(cont.querySelector('#f'));
      cont.querySelector('#f').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const a = cont.querySelector('#n1'); const b = cont.querySelector('#n2');
        if (!/^\d{4,8}$/.test(a.value)) { marcarError(a, 'Usa entre 4 y 8 números'); return; }
        if (a.value !== b.value) { marcarError(b, 'Los PIN no coinciden'); return; }
        const boton = cont.querySelector('button[type=submit]');
        boton.classList.add('btn--busy');
        try { await cambiarPin(actual, a.value); terminar(); } catch (e) { boton.classList.remove('btn--busy'); marcarError(a, mensajeDe(e)); }
      });
    }

    function terminar() { cont.hidden = true; poner(cont, ''); resolver(); }
    pantallaNombres();
  });
}
