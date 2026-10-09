import { estadisticas, eventosOrdenados, listaTomada, pideLista, personas } from '../datos.js';
import { edadDe, html, icono, norm, plural, poner, hoy } from '../util.js';
import { avatar, registrarAcciones, vacio, toast } from '../ui.js';
import { refrescar } from '../router.js';
import { lista } from '../store.js';
import { descargar } from './ajustes.js';
import { evento } from '../datos.js';

const est = { modo: 'personas', filtro: 'activos', q: '' };

const nombreCompleto = (p) => [p.nombre, p.apellidos].filter(Boolean).join(' ');

function filtradas() {
  let arr = personas({ inactivas: true });
  if (est.filtro === 'activos') arr = arr.filter((p) => p.activo !== false);
  else if (est.filtro === 'lideres') arr = arr.filter((p) => p.activo !== false && p.rol === 'lider');
  else if (est.filtro === 'voluntarios') arr = arr.filter((p) => p.activo !== false && p.rol !== 'lider');
  else if (est.filtro === 'archivados') arr = arr.filter((p) => p.activo === false);
  if (est.q) { const q = norm(est.q); arr = arr.filter((p) => norm(`${p.nombre} ${p.apellidos || ''} ${(p.areas || []).join(' ')}`).includes(q)); }
  return arr;
}

function listaPersonas() {
  const arr = filtradas();
  if (!arr.length) {
    return html`<div class="panel">${est.q || est.filtro !== 'activos'
      ? vacio({ icon: 'search', titulo: 'Sin resultados', texto: 'Prueba con otro nombre o cambia el filtro.' })
      : vacio({ icon: 'users', titulo: 'Aún no hay voluntarios', texto: 'Suma a las personas del equipo con su contacto y las áreas donde ayudan.', boton: { accion: 'persona-nueva', texto: 'Agregar voluntario' } })}</div>`;
  }
  return html`<div class="pers">${arr.map((p) => {
    const s = estadisticas(p.id);
    const edad = edadDe(p.anioNac);
    const areas = p.areas || [];
    const meta = [areas.length ? areas.slice(0, 2).join(' · ') + (areas.length > 2 ? ` +${areas.length - 2}` : '') : 'Sin áreas', edad ? `${edad} años` : ''].filter(Boolean).join('  ·  ');
    const etiquetas = [
      p.rol === 'lider' ? html`<span class="tag tag--accent">Líder</span>` : '',
      p.tieneAcceso ? html`<span class="tag tag--info" title="Puede entrar a la app">${icono('lock', 'i--sm')} Acceso</span>` : '',
      p.activo === false ? html`<span class="tag tag--bad">Archivado</span>` : '',
      s.racha >= 2 ? html`<span class="tag tag--accent" title="Asistencias seguidas">${icono('flame', 'i--sm')} ${s.racha} seguidas</span>` : '',
    ].filter(Boolean);
    return html`<button class="pcard" type="button" data-action="persona-ver" data-id="${p.id}">
      ${avatar(p.nombre, 'md')}
      <span class="pcard__main">
        <span class="pcard__nombre trunc">${nombreCompleto(p)}</span>
        <span class="pcard__meta">${meta}</span>
        ${etiquetas.length ? html`<span class="pcard__tags">${etiquetas}</span>` : ''}
      </span>
      <span class="pcard__fin">
        ${s.porcentaje !== null ? html`<span class="tag ${s.porcentaje >= 80 ? 'tag--ok' : s.porcentaje >= 50 ? 'tag--accent' : 'tag--bad'} num pcard__pct">${s.porcentaje}%</span>` : ''}
        ${icono('chev-r', 'row__chev')}
      </span>
    </button>`;
  })}</div>`;
}

function reporte() {
  const filas = personas().map((p) => ({ p, s: estadisticas(p.id) }));
  const conDatos = filas.filter((f) => f.s.total > 0).sort((a, b) => (b.s.porcentaje ?? -1) - (a.s.porcentaje ?? -1) || b.s.p - a.s.p);
  const sinDatos = filas.filter((f) => f.s.total === 0);
  if (!conDatos.length) return html`<div class="panel">${vacio({ icon: 'tasks', titulo: 'Aún no hay asistencia registrada', texto: 'Cuando tomes lista en un evento, aquí verás el porcentaje y la racha de cada persona.' })}</div>`;
  const con = conDatos.filter((f) => f.s.porcentaje !== null);
  const promedio = con.length ? Math.round(con.reduce((n, f) => n + f.s.porcentaje, 0) / con.length) : null;
  const listas = eventosOrdenados().filter((e) => e.fecha <= hoy() && pideLista(e) && listaTomada(e)).length;
  const tono = (pct) => (pct >= 80 ? 'ok' : pct >= 50 ? 'accent' : 'bad');
  return html`
    <div class="asis-resumen">
      <div class="asis-resumen__dato"><strong class="num">${promedio === null ? '—' : `${promedio}%`}</strong><span>asistencia promedio</span></div>
      <div class="asis-resumen__dato"><strong class="num">${listas}</strong><span>${listas === 1 ? 'lista tomada' : 'listas tomadas'}</span></div>
      <button class="btn btn--soft btn--sm asis-resumen__csv" type="button" data-action="equipo-csv">${icono('download', 'i--sm')} Descargar CSV</button>
    </div>
    <div class="pers">${conDatos.map(({ p, s }) => html`
      <button class="pcard pcard--asis" type="button" data-action="persona-ver" data-id="${p.id}">
        ${avatar(p.nombre, 'md')}
        <span class="pcard__main">
          <span class="pcard__nombre trunc">${nombreCompleto(p)}</span>
          <span class="pcard__meta"><span class="cuenta cuenta--ok">${s.p} presente${s.p === 1 ? '' : 's'}</span> · <span class="cuenta cuenta--bad">${s.a} ausente${s.a === 1 ? '' : 's'}</span>${s.j ? html` · <span class="cuenta cuenta--info">${s.j} justificó</span>` : ''}</span>
          <span class="barra" role="img" aria-label="${s.porcentaje ?? 0}% de asistencia"><span class="barra__r barra__r--${tono(s.porcentaje ?? 0)}" style="width:${s.porcentaje ?? 0}%"></span></span>
          ${s.racha >= 2 ? html`<span class="pcard__tags"><span class="tag tag--accent">${icono('flame', 'i--sm')} ${s.racha} seguidas</span></span>` : ''}
        </span>
        <span class="pcard__fin"><span class="tag tag--${tono(s.porcentaje ?? 0)} num pcard__pct">${s.porcentaje === null ? '—' : `${s.porcentaje}%`}</span>${icono('chev-r', 'row__chev')}</span>
      </button>`)}</div>
    ${sinDatos.length ? html`<p class="hint" style="margin-top:var(--sp-4)">Sin listas todavía: ${sinDatos.map((f) => f.p.nombre).join(', ')}.</p>` : ''}
    <p class="hint" style="margin-top:var(--sp-2)">Los ausentes justificados no bajan el porcentaje ni cortan la racha.</p>`;
}

function exportarCSV() {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['Evento', 'Fecha', 'Persona', 'Estado']];
  const nombres = Object.fromEntries(personas({ inactivas: true }).map((p) => [p.id, nombreCompleto(p)]));
  lista('asistencia').forEach((a) => {
    const e = evento(a.eventoId);
    if (e && nombres[a.personaId]) filas.push([e.titulo, e.fecha, nombres[a.personaId], { p: 'Presente', a: 'Ausente', j: 'Justificó' }[a.estado] || a.estado]);
  });
  filas.sort((x, y) => (x[1] || '').localeCompare(y[1] || '') || (x[0] || '').localeCompare(y[0] || ''));
  descargar(`﻿${filas.map((f) => f.map(esc).join(',')).join('\n')}`, `asistencia_${hoy()}.csv`, 'text/csv;charset=utf-8');
  toast('CSV descargado');
}

export const vistaEquipo = {
  titulo: 'Equipo',
  render() {
    const total = personas().length;
    return html`
      <div class="equipo">
        <div class="cal__tools" style="margin-bottom:var(--sp-4)">
          <div class="seg" role="tablist" aria-label="Sección del equipo">
            <button class="seg__btn" type="button" role="tab" data-action="equipo-modo" data-m="personas" aria-selected="${est.modo === 'personas'}">Personas</button>
            <button class="seg__btn" type="button" role="tab" data-action="equipo-modo" data-m="asistencia" aria-selected="${est.modo === 'asistencia'}">Asistencia</button>
          </div>
          ${est.modo === 'personas'
            ? html`<button class="btn btn--primary solo-lider" type="button" data-action="persona-nueva">${icono('user-plus', 'i--sm')} Agregar voluntario</button>`
            : ''}
        </div>
        ${est.modo === 'personas' ? html`
          <div class="buscar">${icono('search')}<input class="input" id="buscarPersona" type="search" placeholder="Buscar por nombre o área" value="${est.q}" aria-label="Buscar en el equipo" autocomplete="off"></div>
          <div class="chips chips--scroll" role="group" aria-label="Filtrar" style="margin:var(--sp-3) 0">
            ${[['activos', `Activos ${total}`], ['lideres', 'Líderes'], ['voluntarios', 'Voluntarios'], ['archivados', 'Archivados']].map(([k, l]) => html`<button class="chip" type="button" data-action="equipo-filtro" data-f="${k}" aria-pressed="${est.filtro === k}">${l}</button>`)}
          </div>
          <div id="listaPersonas">${listaPersonas()}</div>` : reporte()}
      </div>`;
  },
  montar(raiz) {
    const q = raiz.querySelector('#buscarPersona');
    if (q) q.addEventListener('input', () => { est.q = q.value; poner(raiz.querySelector('#listaPersonas'), listaPersonas()); });
  },
};

registrarAcciones({
  'equipo-modo': (el) => { est.modo = el.dataset.m; refrescar(); },
  'equipo-filtro': (el) => { est.filtro = el.dataset.f; refrescar(); },
  'equipo-csv': exportarCSV,
});
