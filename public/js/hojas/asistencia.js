import { guardar } from '../store.js';
import { ASISTENCIA } from '../model.js';
import { citados, claveAsis, evento, marca, resumenAsistencia } from '../datos.js';
import { fechaRelativa, html, icono, raw } from '../util.js';
import { abrirHoja, actualizarHoja, avatar, registrarAcciones } from '../ui.js';
import { verEvento } from './evento.js';

let actualId = null;

function cuerpo(e) {
  const cit = citados(e);
  const r = resumenAsistencia(e);
  if (!cit.length) return html`<p class="muted">Este evento no tiene personas citadas. Agrega voluntarios al equipo o elige participantes al editar el evento.</p>`;
  const sinMarcar = r.citados - r.marcados;
  return html`
    <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);align-items:center">
      <span class="tag tag--ok">${r.p} presentes</span><span class="tag tag--bad">${r.a} ausentes</span><span class="tag tag--info">${r.j} justificaron</span>
      ${sinMarcar ? html`<span class="tag">${sinMarcar} sin marcar</span>` : ''}
      <span style="flex:1"></span>
      <button class="btn btn--soft btn--sm" type="button" data-action="asistencia-todos">${icono('check', 'i--sm')} Todos presentes</button>
    </div>
    <div class="panel"><div class="list">
      ${cit.map((p) => {
        const m = marca(e.id, p.id);
        return html`
        <div class="row">
          ${avatar(p.nombre)}
          <span class="row__main"><span class="row__title">${p.nombre}</span></span>
          <div class="seg" role="group" aria-label="Asistencia de ${p.nombre}">
            ${Object.entries(ASISTENCIA).map(([k, v]) => html`<button class="seg__btn" type="button" data-action="asistencia-marcar" data-p="${p.id}" data-e="${k}" aria-pressed="${m === k}" title="${v.label}"><span aria-hidden="true">${v.corto}</span><span class="sr-only">${v.label}</span></button>`)}
          </div>
        </div>`;
      })}
    </div></div>
    <p class="hint">Toca otra vez la opción marcada para dejarla sin marcar. "Justificó" no baja el porcentaje ni corta la racha.</p>`;
}

function abrir(id) {
  const e = evento(id);
  if (!e) return;
  actualId = id;
  abrirHoja({
    titulo: `Asistencia · ${e.titulo}`,
    ancha: true,
    cuerpo: cuerpo(e),
    pie: html`<span class="muted" style="align-self:center;font-size:var(--t-sm)">${fechaRelativa(e.fecha)} · se guarda al tocar</span><span class="spacer"></span><button class="btn btn--primary" type="button" data-action="evento-ver" data-id="${e.id}" style="flex:0 0 auto">Listo</button>`,
  });
}

function repintar() { actualizarHoja({ cuerpo: cuerpo(evento(actualId)) }); }

registrarAcciones({
  'asistencia-abrir': (el) => abrir(el.dataset.id),
  'asistencia-marcar': (el) => {
    const { p, e: estado } = el.dataset;
    const actual = marca(actualId, p);
    const id = claveAsis(actualId, p);
    guardar([{ c: 'asistencia', id, data: actual === estado ? null : { eventoId: actualId, personaId: p, estado } }]);
    repintar();
  },
  'asistencia-todos': () => {
    const e = evento(actualId);
    guardar(citados(e).filter((p) => !marca(actualId, p.id)).map((p) => ({ c: 'asistencia', id: claveAsis(actualId, p.id), data: { eventoId: actualId, personaId: p.id, estado: 'p' } })));
    repintar();
  },
});

export { abrir as abrirAsistencia, verEvento };
