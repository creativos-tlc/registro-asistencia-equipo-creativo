/* Cumpleaños próximos del equipo (se comparte día y mes; el año solo lo ven los líderes). */
import { cumpleaneros } from '../datos.js';
import { avatar } from '../ui.js';
import { fechaDiaMes, hoy, html, icono, plural, sumarDias } from '../util.js';

export function bloqueCumples({ dias = 30, max = 4 } = {}) {
  const lista = cumpleaneros(dias).slice(0, max);
  if (!lista.length) return '';
  return html`<section class="section" style="margin:0">
    <div class="section__head"><h3 class="section__title">Cumpleaños</h3></div>
    <div class="panel panel--cumple"><div class="list">${lista.map(({ persona: p, mmdd, dias: d }) => html`
      <div class="row" style="min-height:56px">
        <span class="typebadge" style="--c:var(--pink)">${icono('cake')}</span>
        <span class="row__main"><span class="row__title">${p.nombre}${d === 0 ? ' · ¡hoy!' : ''}</span><span class="row__sub">${d === 0 ? 'Cumple años hoy' : d === 1 ? 'Mañana' : `En ${plural(d, 'día', 'días')}`} · ${fechaDiaMes(`2000-${mmdd}`)}</span></span>
        ${avatar(p.nombre, 'sm')}
      </div>`)}</div></div>
  </section>`;
}
