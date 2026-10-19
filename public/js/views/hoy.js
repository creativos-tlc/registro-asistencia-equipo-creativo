import { esLider, yo } from '../store.js';
import { DIAS_SIN_RESPALDO_AVISO, tipoDe } from '../model.js';
import { equipoActual, estadisticas, eventosOrdenados, listaTomada, nombreDe, pendientesDeLista, personas, proximoServicio, publicaciones, resumenAsistencia, tareasAbiertas, tareasVencidas } from '../datos.js';
import { dif, fechaLarga, fechaRelativa, hoy, html, icono, plural, rangoHora, raw, nombreDiaLargo, saludo, sumarDias } from '../util.js';
import { vacio } from '../ui.js';
import { leerUltimoRespaldo } from './ajustes.js';
import { kpi } from './inicio.js';
import { bloqueCumples } from './cumples.js';

function filaEvento(e) {
  const t = tipoDe(e.tipo);
  return html`<button class="row" type="button" data-action="evento-ver" data-id="${e.id}">
    <span class="typebadge" style="--c:${t.color}">${icono(t.icono)}</span>
    <span class="row__main"><span class="row__title">${e.titulo}</span><span class="row__sub"><span>${fechaRelativa(e.fecha)}</span><span class="num">${rangoHora(e.horaInicio, e.horaFin)}</span>${e.lugar ? html`<span>${e.lugar}</span>` : ''}</span></span>
    ${icono('chev-r', 'row__chev')}</button>`;
}

function bloqueServicio() {
  const s = proximoServicio();
  if (!s) {
    return html`<div class="panel panel--pad" style="display:flex;flex-direction:column;gap:var(--sp-3);align-items:flex-start">
      <p class="muted">No hay ningún servicio agendado. Agéndalo para armar el programa y tomar asistencia.</p>
      <button class="btn btn--primary" type="button" data-action="evento-nuevo" data-tipo="servicio" data-fecha="${hoy()}">${icono('plus', 'i--sm')} Agendar servicio</button></div>`;
  }
  const prog = s.programa || [];
  const sinResp = prog.filter((f) => !f.responsableId).length;
  const cuando = dif(s.fecha, hoy()) === 0 ? 'Hoy' : nombreDiaLargo(s.fecha);
  return html`
    <div class="panel panel--pad hero hero--color">
      <div style="display:flex;justify-content:space-between;gap:var(--sp-3);align-items:flex-start">
        <div style="min-width:0">
          <h2 class="hero__t">${cuando}${dif(s.fecha, hoy()) > 1 ? html` <span class="muted">· ${fechaLarga(s.fecha).split(' ').slice(1).join(' ')}</span>` : ''}</h2>
          <p class="muted" style="margin-top:4px"><span class="num">${rangoHora(s.horaInicio, s.horaFin)}</span>${s.lugar ? ` · ${s.lugar}` : ''} · ${s.titulo}</p>
        </div>
        <button class="btn btn--soft btn--sm" type="button" data-action="evento-ver" data-id="${s.id}">Abrir</button>
      </div>
      ${prog.length ? html`
        <ol class="mini">${prog.slice(0, 6).map((f) => html`<li><span class="num muted">${f.hora || '·'}</span><span class="trunc">${f.titulo}</span><span class="muted trunc">${f.responsableId ? nombreDe(f.responsableId) : ''}</span></li>`)}${prog.length > 6 ? html`<li class="muted">y ${prog.length - 6} bloques más</li>` : ''}</ol>
        ${sinResp ? html`<p class="notice notice--warn" style="margin-top:var(--sp-3)">${icono('alert')}<span class="notice__body">${plural(sinResp, 'bloque sin responsable', 'bloques sin responsable')}.</span></p>` : ''}`
        : html`<div class="notice notice--warn" style="margin-top:var(--sp-4)">${icono('file')}<div class="notice__body"><span>El programa de este servicio está vacío.</span><div><button class="btn btn--soft btn--sm" type="button" data-action="programa-editar" data-id="${s.id}">Armar programa</button></div></div></div>`}
    </div>`;
}

function atencion() {
  const avisos = [];
  const vencidas = tareasVencidas();
  if (vencidas.length) avisos.push(html`<button class="row" type="button" data-action="ir-tareas">${icono('alert', 'i--lg')}<span class="row__main"><span class="row__title">${plural(vencidas.length, 'tarea vencida', 'tareas vencidas')}</span><span class="row__sub">${vencidas.slice(0, 2).map((t) => t.titulo).join(' · ')}</span></span>${icono('chev-r', 'row__chev')}</button>`);
  tareasAbiertas().filter((t) => t.estado === 'falta_info').slice(0, 3).forEach((t) => avisos.push(html`<button class="row" type="button" data-action="tarea-editar" data-id="${t.id}">${icono('message', 'i--lg')}<span class="row__main"><span class="row__title">Una tarea necesita información</span><span class="row__sub">${t.titulo}${(t.asignados || []).length ? ` · ${(t.asignados || []).map(nombreDe).join(', ')}` : ''}</span></span>${icono('chev-r', 'row__chev')}</button>`));
  publicaciones().filter((p) => p.estado === 'falta_info').slice(0, 3).forEach((p) => avisos.push(html`<button class="row" type="button" data-action="publicacion-editar" data-id="${p.id}">${icono('message', 'i--lg')}<span class="row__main"><span class="row__title">Falta información para publicar</span><span class="row__sub">${p.titulo} · ${fechaRelativa(p.fecha)}</span></span>${icono('chev-r', 'row__chev')}</button>`));
  pendientesDeLista().slice(0, 3).forEach((e) => avisos.push(html`<button class="row" type="button" data-action="asistencia-abrir" data-id="${e.id}">${icono('tasks', 'i--lg')}<span class="row__main"><span class="row__title">Falta tomar asistencia</span><span class="row__sub">${e.titulo} · ${fechaRelativa(e.fecha)}</span></span>${icono('chev-r', 'row__chev')}</button>`));
  const dias = leerUltimoRespaldo();
  if (esLider() && (dias === null || dias >= DIAS_SIN_RESPALDO_AVISO)) {
    avisos.push(html`<button class="row" type="button" data-action="ir-ajustes">${icono('download', 'i--lg')}<span class="row__main"><span class="row__title">Descarga un respaldo</span><span class="row__sub">${dias === null ? 'Aún no has hecho ninguno desde este dispositivo.' : `El último fue hace ${dias} días.`}</span></span>${icono('chev-r', 'row__chev')}</button>`);
  }
  return avisos;
}

// Números del equipo, de un vistazo y cada uno de su color.
function kpisLider() {
  const abiertas = tareasAbiertas();
  const vencidas = tareasVencidas();
  const h = hoy();
  const semana = sumarDias(h, 6);
  const listas = eventosOrdenados().filter((e) => e.fecha <= h && listaTomada(e)).reverse().slice(0, 4);
  let p = 0; let c = 0;
  listas.forEach((e) => { const r = resumenAsistencia(e); p += r.p; c += r.citados; });
  const asis = c ? Math.round((p / c) * 100) : null;
  const activos = personas();
  const enPrueba = activos.filter((x) => x.enPrueba).length;
  const conContenido = (equipoActual().modulos || []).includes('contenido');
  const pubs = publicaciones().filter((x) => x.fecha >= h && x.fecha <= semana && x.estado !== 'publicado').length;
  const evs = eventosOrdenados().filter((e) => e.fecha >= h && e.fecha <= semana).length;
  return html`
    ${kpi('var(--info)', 'tasks', 'Tareas por hacer', abiertas.length, vencidas.length ? `${vencidas.length} atrasadas` : 'Todo al día', '#/tareas')}
    ${kpi('var(--orange)', 'flame', 'Asistencia', asis === null ? '—' : `${asis}%`, listas.length ? `Últimas ${plural(listas.length, 'reunión', 'reuniones')}` : 'Sin listas aún', '#/equipo')}
    ${kpi('var(--violet)', 'users', 'Equipo', activos.length, enPrueba ? `${enPrueba} en prueba` : 'voluntarios activos', '#/equipo')}
    ${conContenido ? kpi('var(--pink)', 'image', 'Publicaciones', pubs, 'por publicar esta semana', '#/contenido') : kpi('var(--ok)', 'calendar', 'Esta semana', evs, evs === 1 ? 'evento agendado' : 'eventos agendados', '#/calendario')}`;
}

export const vistaHoy = {
  titulo: 'Hoy',
  render() {
    const persona = yo();
    const proximos = eventosOrdenados().filter((e) => e.fecha >= hoy()).slice(0, 6);
    const misTareas = tareasAbiertas().filter((t) => (t.asignados || []).includes(persona.personaId)).sort((a, b) => (a.vence || '9').localeCompare(b.vence || '9')).slice(0, 5);
    const avisos = atencion();
    const hoyPubs = publicaciones().filter((p) => p.fecha === hoy() && p.estado !== 'publicado');
    const sinDatos = personas().length === 0 && eventosOrdenados().length === 0;

    return html`
      <div class="hoy">
        <div class="hoy__main">
          <div>
            <p class="muted" style="font-size:var(--t-sm)">${fechaLarga(hoy())}</p>
            <h2 style="font-size:var(--t-2xl);font-weight:800;margin-top:2px">${saludo()}, ${persona.nombre}</h2>
          </div>

          ${sinDatos ? '' : html`<div class="kpis kpis--4">${kpisLider()}</div>`}

          ${sinDatos ? html`
            <div class="panel">${vacio({ icon: 'users', titulo: 'Empecemos por el equipo', texto: 'Suma a tus voluntarios y agenda el primer servicio. Si ya tenías datos en este teléfono, la app te ofrecerá traerlos.', boton: { accion: 'persona-nueva', texto: 'Agregar voluntario' } })}</div>` : html`
          <section class="section" style="margin:0"><div class="section__head"><h3 class="section__title">Próximo servicio</h3></div>${bloqueServicio()}</section>

          ${avisos.length ? html`<section class="section" style="margin:0"><div class="section__head"><h3 class="section__title">Necesita tu atención</h3></div><div class="panel panel--atencion"><div class="list">${avisos}</div></div></section>` : ''}

          <section class="section" style="margin:0">
            <div class="section__head"><h3 class="section__title">Lo que viene</h3><a class="section__link" href="#/calendario">Ver calendario ${icono('chev-r', 'i--sm')}</a></div>
            ${proximos.length ? html`<div class="panel panel--proximo"><div class="list">${proximos.map(filaEvento)}</div></div>` : html`<div class="panel">${vacio({ icon: 'calendar', titulo: 'Sin eventos próximos', texto: 'Agenda reuniones, servicios o grabaciones.', boton: { accion: 'evento-nuevo', texto: 'Crear evento' } })}</div>`}
          </section>`}
        </div>

        <aside class="hoy__side">
          <section class="section" style="margin:0">
            <div class="section__head"><h3 class="section__title">Mis tareas</h3><a class="section__link" href="#/tareas">Todas ${icono('chev-r', 'i--sm')}</a></div>
            ${misTareas.length ? html`<div class="panel panel--tareas"><div class="list">${misTareas.map((t) => html`
              <div class="row"><button class="icon-btn" type="button" data-action="tarea-toggle" data-id="${t.id}" aria-label="Marcar como hecha: ${t.titulo}" style="margin-left:-8px">${icono('circle')}</button>
              <button class="row__main" type="button" data-action="tarea-editar" data-id="${t.id}" style="text-align:left"><span class="row__title">${t.titulo}</span><span class="row__sub">${t.vence ? (t.vence < hoy() ? html`<span style="color:var(--bad)">Venció ${fechaRelativa(t.vence).toLowerCase()}</span>` : `Vence ${fechaRelativa(t.vence).toLowerCase()}`) : 'Sin fecha'}</span></button></div>`)}</div></div>`
              : html`<div class="panel"><p class="muted" style="padding:var(--sp-5);font-size:var(--t-sm)">No tienes tareas asignadas. ¡Buen momento para adelantar algo!</p></div>`}
          </section>
          ${bloqueCumples()}
          ${hoyPubs.length ? html`<section class="section" style="margin:0"><div class="section__head"><h3 class="section__title">Publicar hoy</h3></div><div class="panel"><div class="list">${hoyPubs.map((p) => html`<button class="row" type="button" data-action="publicacion-editar" data-id="${p.id}"><span class="row__main"><span class="row__title">${p.titulo}</span><span class="row__sub">${p.hora || 'Sin hora'} · ${p.canal === 'whatsapp' ? 'WhatsApp' : 'Instagram'}</span></span>${icono('chev-r', 'row__chev')}</button>`)}</div></div></section>` : ''}
        </aside>
      </div>`;
  },
};
