/* Inicio de cada voluntario: sus números, sus tareas y lo que viene en la semana, para estar al día sin buscar. */
import { api, lista, yo } from '../store.js';
import { GRUPOS_TURNO, tipoDe } from '../model.js';
import { bloqueCumples } from './cumples.js';
import { equipoActual, estadisticas, persona, eventosOrdenados, nombreDe, tareas, todosLosRoles } from '../datos.js';
import { dif, fechaCorta, fechaLarga, hoy, html, icono, nombreDiaLargo, plural, raw, saludo, sumarDias } from '../util.js';
import { vacio } from '../ui.js';
import { solicitarRefresco } from '../router.js';

let fuente = null;     // asistencia propia, traída del servidor
let pidiendo = false;
let pedidoEn = 0;

async function traerAsistencia() {
  if (pidiendo || Date.now() - pedidoEn < 30000) return;
  pidiendo = true;
  try {
    const r = await api('mi-asistencia');
    const listas = new Set(r.listas || []);
    const marcas = r.marcas || {};
    fuente = { tomada: (ev) => listas.has(ev.id), marca: (eventoId) => marcas[eventoId] || null };
    pedidoEn = Date.now();
    solicitarRefresco();
  } catch { /* sin conexión: se muestra sin el dato */ }
  pidiendo = false;
}

export const kpi = (color, icon, titulo, valor, sub, href = '') => html`
  <${raw(href ? 'a' : 'div')} class="kpi" style="--c:${color}" ${href ? html`href="${href}"` : ''}>
    <span class="kpi__ic">${icono(icon, 'i--sm')}</span>
    <span class="kpi__t">${titulo}</span>
    <strong class="kpi__v num">${valor}</strong>
    <span class="kpi__s">${sub}</span>
  </${raw(href ? 'a' : 'div')}>`;

const cuando = (f) => {
  const d = dif(f, hoy());
  return d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `${nombreDiaLargo(f)} ${fechaCorta(f).split(' ').slice(-2).join(' ')}`;
};

export const vistaInicio = {
  titulo: 'Inicio',
  montar() { traerAsistencia(); },
  render() {
    const yoId = yo().personaId;
    const h = hoy();
    const fin = sumarDias(h, 6);
    const mias = tareas().filter((t) => (t.asignados || []).includes(yoId));
    const abiertas = mias.filter((t) => t.estado !== 'hecha');
    const hechas = mias.filter((t) => t.estado === 'hecha');
    const hechasMes = hechas.filter((t) => (t.hechaEn || '') >= sumarDias(h, -30));
    const atrasadas = abiertas.filter((t) => t.vence && t.vence < h);
    const estaSemana = abiertas.filter((t) => t.vence && t.vence >= h && t.vence <= fin);
    const cumple = mias.length ? Math.round((hechas.length / mias.length) * 100) : null;
    const est = fuente ? estadisticas(yoId, h, fuente) : null;
    const mio = persona(yoId) || {};
    const perfilIncompleto = !mio.fechaNac || !mio.emergencia;

    // Turnos propios
    const roles = new Map(todosLosRoles().map((r) => [r.id, r]));
    const turnos = lista('turnos').filter((t) => t.fecha >= h && (t.personas || []).includes(yoId) && roles.has(t.rolId)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const proximoTurno = turnos[0];

    // La semana: eventos de todos + mis turnos + mis tareas con fecha
    const items = [];
    eventosOrdenados().filter((e) => e.fecha >= h && e.fecha <= fin).forEach((e) => {
      const t = tipoDe(e.tipo);
      items.push({ f: e.fecha, ord: e.horaInicio || '00:00', html: html`<button class="row" type="button" data-action="evento-ver" data-id="${e.id}"><span class="typebadge" style="--c:${t.color}">${icono(t.icono)}</span><span class="row__main"><span class="row__title">${e.titulo}</span><span class="row__sub"><span class="num">${e.horaInicio || 'Todo el día'}</span>${e.lugar ? html`<span>${e.lugar}</span>` : ''}</span></span>${icono('chev-r', 'row__chev')}</button>` });
    });
    turnos.filter((t) => t.fecha <= fin).forEach((t) => {
      const r = roles.get(t.rolId); const g = GRUPOS_TURNO[r.grupo] || { label: '', color: 'var(--tx-2)' };
      items.push({ f: t.fecha, ord: '00:00', html: html`<a class="row" href="#/turnos"><span class="typebadge" style="--c:${g.color}">${icono('clipboard')}</span><span class="row__main"><span class="row__title">Tu turno: ${r.nombre}</span><span class="row__sub">${g.label}</span></span>${icono('chev-r', 'row__chev')}</a>` });
    });
    estaSemana.forEach((t) => {
      items.push({ f: t.vence, ord: '99:99', html: html`<div class="row"><button class="icon-btn" type="button" data-action="tarea-toggle" data-id="${t.id}" aria-label="Marcar como hecha: ${t.titulo}" style="margin-left:-8px">${icono('circle')}</button><button class="row__main" type="button" data-action="tarea-editar" data-id="${t.id}" style="text-align:left"><span class="row__title">${t.titulo}</span><span class="row__sub">Entrega de tu tarea</span></button></div>` });
    });
    const dias = [...new Set(items.map((i) => i.f))].sort();

    return html`
      <div class="inicio">
        <div>
          <p class="muted" style="font-size:var(--t-sm)">${fechaLarga(h)}</p>
          <h2 style="font-size:var(--t-2xl);font-weight:800;margin-top:2px">${saludo()}, ${yo().nombre}</h2>
        </div>

        <div class="kpis">
          ${kpi('var(--info)', 'tasks', 'Por hacer', abiertas.length, atrasadas.length ? `${atrasadas.length} atrasadas` : estaSemana.length ? `${estaSemana.length} esta semana` : 'Todo al día')}
          ${kpi('var(--ok)', 'circle-check', 'Cumplidas', hechas.length, cumple === null ? 'Aún sin tareas' : `${cumple}% de las tuyas`)}
          ${kpi('var(--orange)', 'flame', 'Asistencia', est ? (est.porcentaje === null ? '—' : `${est.porcentaje}%`) : '…', est ? (est.racha ? `Racha de ${est.racha}` : est.total ? `${est.total} reuniones` : 'Sin reuniones aún') : 'Cargando')}
        </div>

        ${proximoTurno ? html`<a class="panel panel--pad turno-prox" href="#/turnos" style="--c:${(GRUPOS_TURNO[roles.get(proximoTurno.rolId).grupo] || {}).color || 'var(--accent)'}">
          <span class="typebadge" style="--c:var(--c)">${icono('clipboard')}</span>
          <span class="row__main"><span class="row__title">Tu próximo turno: ${roles.get(proximoTurno.rolId).nombre}</span><span class="row__sub">${cuando(proximoTurno.fecha)} · ${(GRUPOS_TURNO[roles.get(proximoTurno.rolId).grupo] || {}).label || ''}</span></span>${icono('chev-r', 'row__chev')}</a>` : ''}

        ${perfilIncompleto ? html`<button class="notice notice--info notice--btn" type="button" data-action="mi-perfil">${icono('user')}<span class="notice__body"><strong>Completa tus datos</strong><span>Tu cumpleaños, contacto de emergencia y alergias, para cuidarte mejor.</span></span>${icono('chev-r', 'row__chev')}</button>` : ''}

        ${atrasadas.length ? html`<section class="section" style="margin:0"><div class="section__head"><h3 class="section__title" style="color:var(--bad)">Atrasadas</h3></div>
          <div class="panel"><div class="list">${atrasadas.map((t) => html`<div class="row"><button class="icon-btn" type="button" data-action="tarea-toggle" data-id="${t.id}" aria-label="Marcar como hecha: ${t.titulo}" style="margin-left:-8px">${icono('circle')}</button><button class="row__main" type="button" data-action="tarea-editar" data-id="${t.id}" style="text-align:left"><span class="row__title">${t.titulo}</span><span class="row__sub" style="color:var(--bad)">Venció hace ${plural(dif(h, t.vence), 'día', 'días')}</span></button></div>`)}</div></div></section>` : ''}

        <section class="section" style="margin:0">
          <div class="section__head"><h3 class="section__title">Esta semana</h3><a class="section__link" href="#/calendario">Calendario ${icono('chev-r', 'i--sm')}</a></div>
          ${dias.length ? dias.map((f) => html`<p class="inicio__dia">${cuando(f)}</p><div class="panel"><div class="list">${items.filter((i) => i.f === f).sort((a, b) => a.ord.localeCompare(b.ord)).map((i) => i.html)}</div></div>`)
            : html`<div class="panel">${vacio({ icon: 'calendar', titulo: 'Semana tranquila', texto: 'No hay nada agendado para ti en los próximos 7 días.' })}</div>`}
        </section>

        ${bloqueCumples()}

        <section class="section" style="margin:0">
          <div class="section__head"><h3 class="section__title">Mis tareas</h3><a class="section__link" href="#/tareas">Todas ${icono('chev-r', 'i--sm')}</a></div>
          ${abiertas.length ? html`<div class="panel"><div class="list">${[...abiertas].sort((a, b) => (a.vence || '9').localeCompare(b.vence || '9')).slice(0, 8).map((t) => html`<div class="row"><button class="icon-btn" type="button" data-action="tarea-toggle" data-id="${t.id}" aria-label="Marcar como hecha: ${t.titulo}" style="margin-left:-8px">${icono('circle')}</button><button class="row__main" type="button" data-action="tarea-editar" data-id="${t.id}" style="text-align:left"><span class="row__title">${t.titulo}</span><span class="row__sub">${t.vence ? (t.vence < h ? html`<span style="color:var(--bad)">Venció ${cuando(t.vence).toLowerCase()}</span>` : `Entrega: ${cuando(t.vence).toLowerCase()}`) : 'Sin fecha'}</span></button></div>`)}</div></div>`
            : html`<div class="panel"><p class="muted" style="padding:var(--sp-5);font-size:var(--t-sm)">No tienes tareas pendientes. ¡Gracias por tu servicio!</p></div>`}
        </section>
        <button class="row panel" type="button" data-action="mi-perfil" style="margin-top:var(--sp-2)">${icono('user')}<span class="row__main"><span class="row__title">Mis datos</span><span class="row__sub">Cumpleaños, alergias, contacto de emergencia</span></span>${icono('chev-r', 'row__chev')}</button>
      </div>`;
  },
};
