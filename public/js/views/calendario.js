/* Calendario unificado. `fabricarCalendario` sirve tanto al Calendario general como a Contenido. */
import { esLider, guardar } from '../store.js';
import { CANALES, FORMATOS } from '../model.js';
import { exportarMes } from '../exportar.js';
import { distribuirSolapes, equipoActual, evento, itemsCalendario, publicacion, tarea } from '../datos.js';
import { aISO, aMin, deMin, fechaLarga, hoy, html, icono, inicioMes, inicioSemana, leerISO, nombreDiaCorto, nombreMes, nuevoId, raw, sumarDias, sumarMeses, fechaDiaMes, plural, dif, diaSemana, clamp } from '../util.js';
import { abrirHoja, acciones, registrarAcciones, toast, vacio } from '../ui.js';
import { refrescar } from '../router.js';

const HH = 56; // alto de una hora en la cuadrícula (px)
const CLAVE_PREFS = 'tlc.cal';
const CAPAS = { eventos: { label: 'Eventos', color: 'var(--info)' }, tareas: { label: 'Tareas', color: 'var(--tx-2)' }, contenido: { label: 'Contenido', color: 'var(--pink)' } };
let instancia = null; // calendario dibujado en este momento

function leerPrefs() { try { return JSON.parse(localStorage.getItem(CLAVE_PREFS) || '{}'); } catch { return {}; } }
function guardarPrefs(p) { try { localStorage.setItem(CLAVE_PREFS, JSON.stringify({ ...leerPrefs(), ...p })); } catch { /* sin almacenamiento */ } }
const esAncho = () => matchMedia('(min-width: 720px)').matches;

export function fabricarCalendario({ id, titulo, capasFijas = null, conCanal = false, sinFab = false }) {
  const prefs = leerPrefs();
  const est = {
    id,
    vista: (prefs[id] && prefs[id].vista) || 'mes',
    fecha: hoy(),
    sel: hoy(),
    capas: new Set(capasFijas || (prefs[id] && prefs[id].capas) || ['eventos', 'tareas', 'contenido']),
    formato: null,
    capasFijas,
    conCanal,
    scrollTg: null,
  };

  function rango() {
    if (est.vista === 'mes') { const d = inicioSemana(inicioMes(est.fecha)); return [d, sumarDias(d, 41)]; }
    if (est.vista === 'semana') { const d = inicioSemana(est.fecha); return [d, sumarDias(d, 6)]; }
    if (est.vista === 'dia') return [est.fecha, est.fecha];
    return [est.fecha, sumarDias(est.fecha, 29)];
  }
  const items = () => { const [d, h] = rango(); return itemsCalendario({ desde: d, hasta: h, capas: [...est.capas].filter((c) => esLider() || c !== 'contenido'), formato: est.formato }); };
  const porFecha = (arr) => { const m = new Map(); arr.forEach((i) => { if (!m.has(i.fecha)) m.set(i.fecha, []); m.get(i.fecha).push(i); }); return m; };

  function tituloPeriodo() {
    if (est.vista === 'mes') return nombreMes(est.fecha);
    if (est.vista === 'semana') { const a = inicioSemana(est.fecha); return `${fechaDiaMes(a)} – ${fechaDiaMes(sumarDias(a, 6))}`; }
    if (est.vista === 'dia') return fechaLarga(est.fecha);
    return `Desde el ${fechaDiaMes(est.fecha)}`;
  }

  // ---------- piezas ----------
  const attrsItem = (i) => raw(`data-action="cal-abrir" data-clase="${i.clase}" data-id="${i.id}"`);
  const attrsDrag = (i) => raw(`draggable="true" data-drag="${i.clase}:${i.id}"`);

  const insignia = (i, mini = false) => html`<span class="fmt${mini ? ' fmt--mini' : ''}" style="--c:${i.color}" aria-hidden="true">${i.letra}</span>`;

  function chipMes(i) {
    return html`<button class="mchip ${i.hecha ? 'mchip--hecha' : ''}" type="button" style="--c:${i.color}" ${attrsItem(i)} ${attrsDrag(i)} title="${i.titulo}">${i.letra ? insignia(i) : i.ini ? html`<span class="mchip__h num">${i.ini}</span>` : icono(i.icono, 'i--sm')}<span class="trunc">${i.titulo}</span></button>`;
  }

  function vistaMes(arr) {
    const por = porFecha(arr);
    const inicio = inicioSemana(inicioMes(est.fecha));
    const mes = est.fecha.slice(0, 7);
    const semanas = [];
    for (let s = 0; s < 6; s++) {
      const dias = Array.from({ length: 7 }, (_, k) => sumarDias(inicio, s * 7 + k));
      if (s >= 4 && dias[0].slice(0, 7) > mes) break;
      semanas.push(dias);
    }
    return html`
      <div class="mes" role="grid" aria-label="${nombreMes(est.fecha)}">
        <div class="mes__cab" role="row">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => html`<span role="columnheader">${d}</span>`)}</div>
        ${semanas.map((dias) => html`<div class="mes__sem" role="row">${dias.map((f) => {
          const its = por.get(f) || [];
          const fuera = f.slice(0, 7) !== mes;
          return html`
          <div class="mc ${fuera ? 'mc--fuera' : ''} ${f === hoy() ? 'mc--hoy' : ''} ${f === est.sel ? 'mc--sel' : ''} ${diaSemana(f) === 6 ? 'mc--dom' : ''}" role="gridcell" data-fecha="${f}">
            <button class="mc__num" type="button" data-action="cal-dia" data-fecha="${f}" aria-label="${fechaLarga(f)}${its.length ? `, ${plural(its.length, 'elemento', 'elementos')}` : ''}">${Number(f.slice(8))}</button>
            <div class="mc__chips">${its.slice(0, 3).map(chipMes)}${its.length > 3 ? html`<button class="mchip mchip--mas" type="button" data-action="cal-ver-dia" data-fecha="${f}">+${its.length - 3} más</button>` : ''}</div>
            <div class="mc__dots" aria-hidden="true">${its.slice(0, 6).map((i) => (i.letra ? insignia(i, true) : html`<span class="dot" style="--c:${i.color}"></span>`))}${its.length > 6 ? html`<span class="mc__mas">+</span>` : ''}</div>
          </div>`;
        })}</div>`)}
      </div>
      <div class="daypanel">${panelDia(por.get(est.sel) || [])}</div>`;
  }

  function panelDia(its) {
    return html`
      <div class="section__head"><h3 class="section__title">${fechaLarga(est.sel)}</h3>
        <button class="btn btn--soft btn--sm" type="button" data-action="cal-nuevo-en" data-fecha="${est.sel}">${icono('plus', 'i--sm')} Agregar</button></div>
      ${its.length ? html`<div class="panel"><div class="list">${its.map(filaItem)}</div></div>` : html`<p class="muted" style="font-size:var(--t-sm)">Nada agendado este día.</p>`}`;
  }

  function filaItem(i) {
    return html`<button class="row ${i.hecha ? 'row--done' : ''}" type="button" ${attrsItem(i)}>
      ${i.letra ? html`<span class="typebadge typebadge--letra" style="--c:${i.color}" aria-hidden="true">${i.letra}</span>` : html`<span class="typebadge" style="--c:${i.color}">${icono(i.icono)}</span>`}
      <span class="row__main"><span class="row__title">${i.titulo}</span><span class="row__sub"><span class="num">${i.ini ? (i.fin ? `${i.ini} – ${i.fin}` : i.ini) : 'Todo el día'}</span><span>${i.sub}</span></span></span>
      ${icono('chev-r', 'row__chev')}</button>`;
  }

  function cuadricula(dias, arr) {
    const por = porFecha(arr);
    let desde = 6; let hasta = 23;
    arr.forEach((i) => { if (i.ini) { desde = Math.min(desde, Math.floor(aMin(i.ini) / 60)); hasta = Math.max(hasta, Math.min(24, Math.ceil((aMin(i.fin) > aMin(i.ini) ? aMin(i.fin) : aMin(i.ini) + 60) / 60))); } });
    const horas = Array.from({ length: hasta - desde }, (_, k) => desde + k);
    const cols = dias.length;
    const sinHora = dias.map((f) => (por.get(f) || []).filter((i) => !i.ini));
    const hayTodoDia = sinHora.some((x) => x.length);
    est._desde = desde;
    const primera = arr.filter((i) => i.ini).map((i) => Math.floor(aMin(i.ini) / 60));
    est._scrollInicial = Math.max(0, (Math.max(desde, (primera.length ? Math.min(...primera) : 8) - 1) - desde) * HH);
    const ahora = new Date(); const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    return html`
      <div class="tg" style="--cols:${cols};--hh:${HH}px" data-cols="${cols}">
        <div class="tg__inner">
          <div class="tg__head">
            <span class="tg__corner"></span>
            ${dias.map((f) => html`<button class="tg__dia ${f === hoy() ? 'tg__dia--hoy' : ''}" type="button" data-action="cal-ver-dia" data-fecha="${f}" ${raw(cols === 1 ? 'tabindex="-1"' : '')}><span>${nombreDiaCorto(f)}</span><strong class="num">${Number(f.slice(8))}</strong></button>`)}
          </div>
          ${hayTodoDia ? html`<div class="tg__all"><span class="tg__corner tg__lbl">Todo el día</span>${sinHora.map((its, k) => html`<div class="tg__allcol" data-fecha="${dias[k]}">${its.map(chipMes)}</div>`)}</div>` : ''}
          <div class="tg__body" style="height:${horas.length * HH}px">
            <div class="tg__gut">${horas.map((h) => html`<span class="tg__h num" style="top:${(h - desde) * HH}px">${h === desde ? '' : `${String(h).padStart(2, '0')}:00`}</span>`)}</div>
            ${dias.map((f) => {
              const blocks = distribuirSolapes(por.get(f) || []);
              const ahoraAqui = f === hoy() && minAhora >= desde * 60 && minAhora <= hasta * 60;
              return html`<div class="tg__col ${f === hoy() ? 'tg__col--hoy' : ''}" data-fecha="${f}" data-desde="${desde}">
                ${blocks.map((b) => html`<button class="ev ${b.hecha ? 'ev--hecha' : ''}" type="button" style="--c:${b.color};top:${((b._ini - desde * 60) / 60) * HH}px;height:${Math.max(30, ((b._fin - b._ini) / 60) * HH - 3)}px;left:calc(${(b._col / b._cols) * 100}% + 2px);width:calc(${100 / b._cols}% - 4px)" ${attrsItem(b)} ${attrsDrag(b)} title="${b.titulo}"><span class="ev__t trunc">${b.letra ? html`${insignia(b, true)} ` : ''}${b.titulo}</span><span class="ev__h num">${b.ini}${b.fin ? ` – ${b.fin}` : ''}</span></button>`)}
                ${ahoraAqui ? html`<span class="tg__now" style="top:${((minAhora - desde * 60) / 60) * HH}px"></span>` : ''}
              </div>`;
            })}
          </div>
        </div>
      </div>`;
  }

  function vistaAgenda(arr) {
    if (!arr.length) return vacio({ icon: 'calendar', titulo: 'Nada agendado en los próximos 30 días', texto: 'Crea un evento, una tarea con fecha o una publicación.', boton: { accion: 'cal-nuevo-en', texto: 'Agregar algo', attrs: `data-fecha="${est.fecha}"` } });
    const por = porFecha(arr);
    return html`${[...por.keys()].sort().map((f) => html`
      <section class="section" style="margin-top:var(--sp-6)">
        <div class="section__head"><h3 class="section__title">${dif(f, hoy()) === 0 ? `Hoy · ${fechaLarga(f)}` : fechaLarga(f)}</h3></div>
        <div class="panel"><div class="list">${por.get(f).map(filaItem)}</div></div>
      </section>`)}`;
  }

  // Cuántos hay de cada formato en el período que se está viendo (el mes completo en la vista Mes).
  function resumenFormatos() {
    let desde; let hasta;
    if (est.vista === 'mes') { desde = `${est.fecha.slice(0, 7)}-01`; hasta = `${est.fecha.slice(0, 7)}-31`; } else [desde, hasta] = rango();
    const todos = itemsCalendario({ desde, hasta, capas: ['contenido'] });
    const n = (k) => todos.filter((i) => i.formato === k).length;
    return html`<div class="cal__formatos">
      <div class="chips" role="group" aria-label="Filtrar por formato">
        <button class="chip fchip" type="button" data-action="cal-formato" data-f="" aria-pressed="${!est.formato}">Todos <span class="num">${todos.length}</span></button>
        ${Object.entries(FORMATOS).map(([k, f]) => html`<button class="chip fchip" type="button" style="--c:${f.color}" data-action="cal-formato" data-f="${k}" aria-pressed="${est.formato === k}"><span class="fmt fmt--mini" style="--c:${f.color}" aria-hidden="true">${f.letra}</span>${f.plural} <span class="num">${n(k)}</span></button>`)}
      </div>
      <button class="btn btn--soft btn--sm" type="button" data-action="cal-exportar">${icono('download', 'i--sm')} Descargar imagen</button>
    </div>`;
  }

  // ---------- render ----------
  function render() {
    instancia = est;
    const arr = items();
    const dias = est.vista === 'semana' ? Array.from({ length: 7 }, (_, k) => sumarDias(inicioSemana(est.fecha), k)) : [est.fecha];
    let cuerpo;
    if (est.vista === 'mes') cuerpo = vistaMes(arr);
    else if (est.vista === 'agenda') cuerpo = vistaAgenda(arr);
    else cuerpo = cuadricula(dias, arr);

    const equipo = equipoActual();
    const tieneContenido = esLider() && (equipo.modulos || []).includes('contenido');
    return html`
      <div class="cal" data-cal="${id}">
        <div class="cal__tools">
          <div class="seg" role="tablist" aria-label="Vista del calendario">
            ${[['mes', 'Mes'], ['semana', 'Semana'], ['dia', 'Día'], ['agenda', 'Agenda']].map(([k, l]) => html`<button class="seg__btn" type="button" role="tab" data-action="cal-vista" data-v="${k}" aria-selected="${est.vista === k}">${l}</button>`)}
          </div>
          <div class="cal__nav">
            <button class="icon-btn" type="button" data-action="cal-prev" aria-label="Anterior">${icono('chev-l')}</button>
            <strong class="cal__titulo">${tituloPeriodo()}</strong>
            <button class="icon-btn" type="button" data-action="cal-next" aria-label="Siguiente">${icono('chev-r')}</button>
            <button class="btn btn--soft btn--sm" type="button" data-action="cal-hoy">Hoy</button>
          </div>
        </div>
        ${capasFijas ? '' : html`<div class="chips chips--scroll" role="group" aria-label="Qué mostrar">${Object.entries(CAPAS).filter(([k]) => k !== 'contenido' || tieneContenido).map(([k, v]) => html`<button class="chip chip--dot" type="button" style="--c:${v.color}" data-action="cal-capa" data-capa="${k}" aria-pressed="${est.capas.has(k)}">${v.label}</button>`)}</div>`}
        ${conCanal ? resumenFormatos() : ''}
        <div class="cal__body" id="calBody">${cuerpo}</div>
      </div>`;
  }

  function montar(raizVista) {
    const tg = raizVista.querySelector('.tg');
    if (tg) {
      const objetivo = est.scrollTg ?? est._scrollInicial;
      requestAnimationFrame(() => { tg.scrollTop = objetivo; });
      tg.addEventListener('scroll', () => { est.scrollTg = tg.scrollTop; }, { passive: true });
    }
  }

  return {
    titulo,
    sinFab,
    render,
    montar,
    estado: est,
    ir(f) { est.fecha = f; est.sel = f; },
    cambiar(fn) { fn(est); guardarPrefs({ [id]: { vista: est.vista, capas: capasFijas ? undefined : [...est.capas] } }); refrescar(); },
  };
}

// ---------- acciones globales (operan sobre la instancia dibujada) ----------
function paso(dir) {
  const e = instancia;
  if (e.vista === 'mes') { e.fecha = sumarMeses(e.fecha, dir); e.sel = e.fecha.slice(0, 7) === hoy().slice(0, 7) ? hoy() : inicioMes(e.fecha); }
  else if (e.vista === 'semana') { e.fecha = sumarDias(e.fecha, 7 * dir); e.sel = e.fecha; }
  else if (e.vista === 'dia') { e.fecha = sumarDias(e.fecha, dir); e.sel = e.fecha; }
  else { e.fecha = sumarDias(e.fecha, 14 * dir); e.sel = e.fecha; }
}

function menuNuevoEn(fecha, hora = '') {
  if (!esLider()) { acciones['tarea-nueva']({ dataset: { fecha } }); return; }
  const modulos = equipoActual().modulos || [];
  const atr = raw(`data-fecha="${fecha}" data-hora="${hora}"`);
  const it = (accion, ic, t, c) => html`<button class="menu__item" type="button" data-action="${accion}" ${atr}><span class="typebadge" style="--c:${c}">${icono(ic)}</span><span><strong>${t}</strong></span></button>`;
  if (instancia && instancia.capasFijas && instancia.capasFijas.length === 1 && instancia.capasFijas[0] === 'contenido') { const f = instancia.formato; acciones['publicacion-nueva']({ dataset: { fecha, hora, canal: f === 'whatsapp' ? 'whatsapp' : 'instagram', formato: f && f !== 'whatsapp' ? f : '' } }); return; }
  abrirHoja({ titulo: `${fechaLarga(fecha)}${hora ? ` · ${hora}` : ''}`, cuerpo: html`<div class="menu">${it('evento-nuevo', 'calendar', 'Evento', 'var(--info)')}${it('tarea-nueva', 'tasks', 'Tarea con fecha', 'var(--tx-2)')}${modulos.includes('contenido') ? it('publicacion-nueva', 'image', 'Publicación', 'var(--pink)') : ''}</div>` });
}

function moverItem(clase, id, nuevaFecha, duplicar) {
  if (clase === 'evento') {
    const e = evento(id); if (!e || e.fecha === nuevaFecha) return;
    if (duplicar) { const undo = guardar([{ c: 'eventos', id: nuevoId('ev'), data: { ...e, fecha: nuevaFecha, serieId: null } }]); toast('Evento duplicado', { accion: { texto: 'Deshacer', fn: undo } }); }
    else { const undo = guardar([{ c: 'eventos', id, data: { ...e, fecha: nuevaFecha } }]); toast(`Movido al ${fechaLarga(nuevaFecha)}`, { accion: { texto: 'Deshacer', fn: undo } }); }
  } else if (clase === 'contenido') {
    const p = publicacion(id); if (!p || p.fecha === nuevaFecha) return;
    if (duplicar) { const undo = guardar([{ c: 'publicaciones', id: nuevoId('pu'), data: { ...p, fecha: nuevaFecha, estado: 'idea' } }]); toast('Publicación duplicada', { accion: { texto: 'Deshacer', fn: undo } }); }
    else { const undo = guardar([{ c: 'publicaciones', id, data: { ...p, fecha: nuevaFecha } }]); toast(`Movida al ${fechaLarga(nuevaFecha)}`, { accion: { texto: 'Deshacer', fn: undo } }); }
  } else if (clase === 'tarea') {
    const t = tarea(id); if (!t || t.vence === nuevaFecha) return;
    const undo = guardar([{ c: 'tareas', id, data: { ...t, vence: nuevaFecha } }]); toast('Fecha límite cambiada', { accion: { texto: 'Deshacer', fn: undo } });
  }
}

registrarAcciones({
  'cal-vista': (el) => instancia && (instancia.vista = el.dataset.v, guardarPrefs({ [instancia.id]: { vista: instancia.vista, capas: instancia.capasFijas ? undefined : [...instancia.capas] } }), instancia.scrollTg = null, refrescar()),
  'cal-prev': () => { paso(-1); refrescar(); },
  'cal-next': () => { paso(1); refrescar(); },
  'cal-hoy': () => { instancia.fecha = hoy(); instancia.sel = hoy(); refrescar(); },
  'cal-capa': (el) => {
    const k = el.dataset.capa;
    if (instancia.capas.has(k)) { if (instancia.capas.size > 1) instancia.capas.delete(k); } else instancia.capas.add(k);
    guardarPrefs({ [instancia.id]: { vista: instancia.vista, capas: [...instancia.capas] } });
    refrescar();
  },
  'cal-formato': (el) => { instancia.formato = el.dataset.f || null; refrescar(); },
  'cal-dia': (el) => {
    const f = el.dataset.fecha;
    if (esAncho()) { menuNuevoEn(f); return; }
    instancia.sel = f;
    refrescar();
  },
  'cal-ver-dia': (el) => { instancia.fecha = el.dataset.fecha; instancia.sel = el.dataset.fecha; instancia.vista = 'dia'; instancia.scrollTg = null; refrescar(); },
  'cal-nuevo-en': (el) => menuNuevoEn(el.dataset.fecha, el.dataset.hora || ''),
  'cal-abrir': (el) => {
    const { clase, id } = el.dataset;
    if (clase === 'evento') acciones['evento-ver']({ dataset: { id } });
    else if (clase === 'tarea') acciones['tarea-editar']({ dataset: { id } });
    else acciones['publicacion-editar']({ dataset: { id } });
  },
  'cal-exportar': async () => {
    const mes = instancia.fecha.slice(0, 7);
    toast('Preparando la imagen…');
    try {
      const todos = itemsCalendario({ desde: `${mes}-01`, hasta: `${mes}-31`, capas: ['contenido'] });
      const resultado = await exportarMes({ mes, todos, formato: instancia.formato });
      if (resultado === 'descargada') toast('Imagen descargada');
    } catch (err) {
      console.error(err);
      toast('No se pudo crear la imagen. Intenta de nuevo.', { tipo: 'error' });
    }
  },
});

// clics en huecos de la cuadrícula y arrastrar/soltar (escritorio)
document.addEventListener('click', (e) => {
  const celda = e.target.closest?.('.mc');
  if (celda && instancia && !e.target.closest('button')) {
    if (esAncho()) menuNuevoEn(celda.dataset.fecha);
    else { instancia.sel = celda.dataset.fecha; refrescar(); }
    return;
  }
  const col = e.target.closest?.('.tg__col');
  if (!col || e.target.closest('.ev') || !instancia) return;
  const desde = Number(col.dataset.desde);
  const hora = clamp(desde + Math.floor((e.clientY - col.getBoundingClientRect().top) / HH), 0, 23);
  menuNuevoEn(col.dataset.fecha, `${String(hora).padStart(2, '0')}:00`);
});
document.addEventListener('dragstart', (e) => { const el = e.target.closest?.('[data-drag]'); if (!el) return; e.dataTransfer.setData('text/plain', el.dataset.drag); e.dataTransfer.effectAllowed = 'copyMove'; });
document.addEventListener('dragover', (e) => { if (e.target.closest?.('.mc, .tg__col, .tg__allcol')) { e.preventDefault(); e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'; } });
document.addEventListener('drop', (e) => {
  const cel = e.target.closest?.('.mc, .tg__col, .tg__allcol');
  const dato = e.dataTransfer?.getData('text/plain');
  if (!cel || !dato || !dato.includes(':')) return;
  e.preventDefault();
  const [clase, id] = dato.split(':');
  try { moverItem(clase, id, cel.dataset.fecha, e.altKey); } catch (err) { toast(err.message || 'No se pudo mover', { tipo: 'error' }); }
});

export const vistaCalendario = fabricarCalendario({ id: 'calendario', titulo: 'Calendario' });
