/* Frase del día: se ve una vez al día por teléfono, al entrar a la app (o en la pantalla de acceso). */
import { fraseDelDia } from './frases.js';
import { hoy, html, icono, poner, saludo } from './util.js';

const CLAVE = 'tlc.frase.dia';

const yaVista = () => { try { return localStorage.getItem(CLAVE) === hoy(); } catch { return false; } };
export const marcarFraseVista = () => { try { localStorage.setItem(CLAVE, hoy()); } catch { /* sin almacenamiento */ } };

/** Bloque de la frase para la pantalla de acceso. Cuenta como "ya vista" por hoy. */
export function bloqueFrase() {
  const f = fraseDelDia(hoy());
  marcarFraseVista();
  return html`<figure class="frase"><blockquote>${f.texto}</blockquote><figcaption>${f.autor}</figcaption></figure>`;
}

/** Pantalla de bienvenida con la frase. Devuelve una promesa que se cumple al cerrarla (o enseguida si ya se vio hoy). */
export function bienvenidaDelDia(nombre) {
  if (yaVista()) return Promise.resolve();
  marcarFraseVista();
  const f = fraseDelDia(hoy());
  const raiz = document.createElement('div');
  raiz.className = 'bienvenida';
  raiz.setAttribute('role', 'dialog');
  raiz.setAttribute('aria-modal', 'true');
  raiz.setAttribute('aria-labelledby', 'bienvenidaTitulo');
  poner(raiz, html`
    <div class="bienvenida__cuerpo">
      <span class="brand__mark" aria-hidden="true">${icono('check')}</span>
      <p class="bienvenida__saludo" id="bienvenidaTitulo">${saludo()}, ${nombre}</p>
      <figure class="frase frase--grande"><blockquote>${f.texto}</blockquote><figcaption>${f.autor}</figcaption></figure>
      <button class="btn btn--primary" type="button">Comenzar</button>
    </div>`);
  document.body.appendChild(raiz);
  const shell = document.getElementById('shell');
  shell?.setAttribute('inert', '');
  const boton = raiz.querySelector('button');
  requestAnimationFrame(() => boton.focus());

  return new Promise((resolver) => {
    const cerrar = () => {
      document.removeEventListener('keydown', alTecla);
      shell?.removeAttribute('inert');
      raiz.classList.add('bienvenida--sale');
      setTimeout(() => raiz.remove(), 220);
      resolver();
    };
    const alTecla = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTecla);
    boton.addEventListener('click', cerrar);
  });
}
