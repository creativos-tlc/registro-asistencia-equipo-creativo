/* Imagen del contenido del mes, dibujada directamente (no es una captura de pantalla):
   resumen por formato, calendario con insignias de color y letra, y el detalle día por día. */
import { FORMATOS } from './model.js';
import { diaSemana, fechaLarga, inicioSemana, nombreMes, sumarDias } from './util.js';

const ANCHO = 1080;
const MARGEN = 48;
const CELDA_ALTO = 150;

const token = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
const resolver = (valor) => token(valor.replace(/^var\((--[^)]+)\)$/, '$1')) || valor;

function tintaSobre(color) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return '#0a0b0e';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#0a0b0e' : '#ffffff';
}

function rect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ajustar(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

async function cargarFuentes() {
  try {
    await Promise.all(['500 24px Outfit', '600 24px Outfit', '700 24px Outfit', '800 24px Outfit'].map((f) => document.fonts.load(f)));
  } catch { /* se usa la fuente del sistema */ }
}

function insignia(ctx, x, y, tam, f, colores) {
  const color = colores[f];
  ctx.fillStyle = color.fondo;
  rect(ctx, x, y, tam, tam, Math.round(tam * 0.26));
  ctx.fill();
  ctx.fillStyle = color.tinta;
  ctx.font = `800 ${Math.round(tam * 0.62)}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(FORMATOS[f].letra, x + tam / 2, y + tam / 2 + 1);
  ctx.textAlign = 'left';
}

export async function dibujarMes({ mes, todos, formato, canal }) {
  await cargarFuentes();
  const items = todos.filter((i) => (!formato || i.formato === formato) && (!canal || i.canal === canal));
  const activo = (k) => (!formato || formato === k) && (!canal || (k === 'whatsapp' ? 'whatsapp' : 'instagram') === canal);
  const c = { bg: token('--bg'), s1: token('--s1'), s2: token('--s2'), linea: token('--line-2'), tx: token('--tx'), tx2: token('--tx-2'), tx3: token('--tx-3'), accent: token('--accent') };
  const colores = Object.fromEntries(Object.entries(FORMATOS).map(([k, f]) => { const fondo = resolver(f.color); return [k, { fondo, tinta: tintaSobre(fondo) }]; }));

  const [anio, m] = mes.split('-').map(Number);
  const primero = `${mes}-01`;
  const diasMes = new Date(anio, m, 0).getDate();
  const semanas = Math.ceil((diaSemana(primero) + diasMes) / 7);
  const inicio = inicioSemana(primero);
  const porFecha = new Map();
  items.forEach((i) => { if (!porFecha.has(i.fecha)) porFecha.set(i.fecha, []); porFecha.get(i.fecha).push(i); });
  const fechasConItems = [...porFecha.keys()].sort();

  const anchoGrid = ANCHO - MARGEN * 2;
  const celdaAncho = anchoGrid / 7;
  const altoEncabezado = 150;
  const altoResumen = 120;
  const altoGrid = 40 + semanas * CELDA_ALTO;
  const altoDetalle = items.length ? 90 + fechasConItems.length * 56 + items.length * 52 : 0;
  const alto = altoEncabezado + altoResumen + altoGrid + altoDetalle + 90;

  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, ANCHO, alto);
  ctx.textBaseline = 'alphabetic';

  // Encabezado
  ctx.fillStyle = c.tx;
  ctx.font = '800 56px Outfit, system-ui, sans-serif';
  ctx.fillText(`Contenido · ${nombreMes(primero)}`, MARGEN, 92);
  ctx.fillStyle = c.tx2;
  ctx.font = '500 26px Outfit, system-ui, sans-serif';
  const sub = formato ? `Solo ${FORMATOS[formato].plural}` : canal ? `Solo ${canal === 'instagram' ? 'Instagram' : 'WhatsApp'}` : 'Instagram y WhatsApp · Equipo Creativo TLC';
  ctx.fillText(sub, MARGEN, 132);

  // Resumen por formato
  let x = MARGEN;
  const yResumen = altoEncabezado + 14;
  Object.entries(FORMATOS).forEach(([k, f]) => {
    const cantidad = todos.filter((i) => i.formato === k).length;
    ctx.globalAlpha = activo(k) ? 1 : 0.4;
    insignia(ctx, x, yResumen, 44, k, colores);
    ctx.fillStyle = c.tx;
    ctx.font = '700 28px Outfit, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const etiqueta = `${cantidad} ${f.plural}`;
    ctx.fillText(etiqueta, x + 56, yResumen + 23);
    x += 56 + ctx.measureText(etiqueta).width + 28;
    ctx.globalAlpha = 1;
  });
  ctx.textBaseline = 'alphabetic';

  // Calendario
  const yGrid = altoEncabezado + altoResumen;
  ctx.fillStyle = c.tx3;
  ctx.font = '700 20px Outfit, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].forEach((d, k) => ctx.fillText(d, MARGEN + celdaAncho * k + celdaAncho / 2, yGrid + 26));
  ctx.textAlign = 'left';
  for (let s = 0; s < semanas; s++) {
    for (let k = 0; k < 7; k++) {
      const fecha = sumarDias(inicio, s * 7 + k);
      const dentro = fecha.slice(0, 7) === mes;
      const cx = MARGEN + celdaAncho * k;
      const cy = yGrid + 40 + s * CELDA_ALTO;
      ctx.fillStyle = dentro ? c.s1 : c.bg;
      rect(ctx, cx + 2, cy + 2, celdaAncho - 4, CELDA_ALTO - 4, 12);
      ctx.fill();
      if (dentro) { ctx.strokeStyle = c.linea; ctx.lineWidth = 1; ctx.stroke(); }
      if (!dentro) continue;
      ctx.fillStyle = c.tx2;
      ctx.font = '700 22px Outfit, system-ui, sans-serif';
      ctx.fillText(String(Number(fecha.slice(8))), cx + 12, cy + 30);
      const delDia = porFecha.get(fecha) || [];
      const tam = 30; const sep = 6; const porFila = Math.floor((celdaAncho - 20) / (tam + sep));
      const maximo = delDia.length > porFila * 3 ? porFila * 3 - 1 : delDia.length;
      delDia.slice(0, maximo).forEach((it, idx) => insignia(ctx, cx + 12 + (idx % porFila) * (tam + sep), cy + 42 + Math.floor(idx / porFila) * (tam + sep), tam, it.formato, colores));
      if (delDia.length > maximo) {
        ctx.fillStyle = c.tx2;
        ctx.font = '700 20px Outfit, system-ui, sans-serif';
        ctx.fillText(`+${delDia.length - maximo}`, cx + 12 + (maximo % porFila) * (tam + sep) + 2, cy + 42 + Math.floor(maximo / porFila) * (tam + sep) + 22);
      }
    }
  }

  // Detalle día por día
  let y = yGrid + altoGrid + 50;
  if (items.length) {
    ctx.fillStyle = c.tx;
    ctx.font = '800 36px Outfit, system-ui, sans-serif';
    ctx.fillText('Detalle', MARGEN, y);
    y += 30;
    fechasConItems.forEach((fecha) => {
      y += 40;
      ctx.fillStyle = c.accent;
      ctx.font = '700 26px Outfit, system-ui, sans-serif';
      ctx.fillText(fechaLarga(fecha), MARGEN, y);
      y += 16;
      porFecha.get(fecha).forEach((it) => {
        insignia(ctx, MARGEN, y + 6, 34, it.formato, colores);
        ctx.fillStyle = c.tx;
        ctx.font = '600 26px Outfit, system-ui, sans-serif';
        const hora = it.ini ? `${it.ini}  ` : '';
        const etiqueta = FORMATOS[it.formato].label;
        ctx.font = '500 22px Outfit, system-ui, sans-serif';
        const anchoEtiqueta = ctx.measureText(etiqueta).width;
        ctx.font = '600 26px Outfit, system-ui, sans-serif';
        ctx.fillText(ajustar(ctx, `${hora}${it.titulo}`, ANCHO - MARGEN * 2 - 34 - 16 - anchoEtiqueta - 20), MARGEN + 34 + 16, y + 32);
        ctx.fillStyle = c.tx3;
        ctx.font = '500 22px Outfit, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(etiqueta, ANCHO - MARGEN, y + 31);
        ctx.textAlign = 'left';
        y += 52;
      });
    });
  }

  ctx.fillStyle = c.tx3;
  ctx.font = '500 20px Outfit, system-ui, sans-serif';
  ctx.fillText(`Coordinación · Equipo Creativo TLC`, MARGEN, alto - 36);
  return lienzo;
}

const aBlob = (lienzo) => new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear el PNG'))), 'image/png'));

/** Comparte la imagen (WhatsApp, Guardar imagen…) o, si el teléfono no puede, la descarga. */
export async function compartirLienzo(lienzo, nombre, titulo) {
  const blob = await aBlob(lienzo);
  const archivo = new File([blob], nombre, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: titulo });
      return 'compartida';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelada';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'descargada';
}

/** Crea la imagen del mes y la comparte. */
export async function exportarMes({ mes, todos, formato, canal }) {
  const lienzo = await dibujarMes({ mes, todos, formato, canal });
  const nombre = `contenido-${mes}${formato ? `-${formato}` : canal ? `-${canal}` : ''}.png`;
  return compartirLienzo(lienzo, nombre, `Contenido ${nombreMes(`${mes}-01`)}`);
}

// ---------- Turnos ----------
const mezclar = (hex, fondo, alfa) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(hex) || !/^#[0-9a-f]{6}$/i.test(fondo)) return hex;
  const [a, b] = [p(hex), p(fondo)];
  return `rgb(${a.map((v, i) => Math.round(v * alfa + b[i] * (1 - alfa))).join(',')})`;
};

function partirTexto(ctx, texto, ancho) {
  const palabras = texto.split(' ');
  const lineas = [];
  let actual = '';
  palabras.forEach((w) => {
    const prueba = actual ? `${actual} ${w}` : w;
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba; else { lineas.push(actual); actual = w; }
  });
  if (actual) lineas.push(actual);
  return lineas;
}

/** Tabla de turnos: roles en filas, domingos en columnas, con los colores de cada reunión y el bloque "No estarán". */
export async function dibujarTurnos({ titulo, subtitulo, fechas, filas, ausentes }) {
  await cargarFuentes();
  const c = { bg: token('--bg'), s1: token('--s1'), linea: token('--line-2'), tx: token('--tx'), tx2: token('--tx-2'), tx3: token('--tx-3') };
  const MARGEN_T = 36;
  const ancho_rol = 300;
  const ancho_col = fechas.length === 1 ? 380 : 230;
  const W = MARGEN_T * 2 + ancho_rol + ancho_col * fechas.length;
  const medidor = document.createElement('canvas').getContext('2d');
  medidor.font = '600 24px Outfit, system-ui, sans-serif';
  const altoFila = (textos, rol = '') => Math.max(...textos.map((t) => partirTexto(medidor, t || '—', ancho_col - 28).length), rol ? partirTexto(medidor, rol, ancho_rol - 28).length : 1) * 30 + 22;

  // Preparar contenido: filas = [{grupo:{label,color}}] | [{rol, textos:[...]}]
  const bloques = [];
  filas.forEach((f) => {
    if (f.grupo) bloques.push({ grupo: f.grupo, alto: 52 });
    else bloques.push({ ...f, alto: Math.max(altoFila(f.textos, f.rol), 56) });
  });
  const hayAus = ausentes.some((x) => x.length);
  const altoAus = hayAus ? 52 + altoFila(ausentes.map((x) => x.join('\n').replace(/\n/g, ', '))) : 0;
  const H = 130 + 60 + bloques.reduce((n, b) => n + b.alto, 0) + altoAus + 70;

  const lienzo = document.createElement('canvas');
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = c.tx;
  ctx.font = '800 46px Outfit, system-ui, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(titulo, MARGEN_T, 70);
  ctx.fillStyle = c.tx2;
  ctx.font = '500 24px Outfit, system-ui, sans-serif';
  ctx.fillText(subtitulo, MARGEN_T, 108);

  let y = 130;
  // Encabezado de fechas
  ctx.fillStyle = c.s1;
  rect(ctx, MARGEN_T, y, W - MARGEN_T * 2, 56, 10);
  ctx.fill();
  ctx.fillStyle = c.tx2;
  ctx.font = '700 22px Outfit, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Rol', MARGEN_T + 16, y + 29);
  ctx.textAlign = 'center';
  fechas.forEach((f, i) => ctx.fillText(fechaDiaMesLargo(f), MARGEN_T + ancho_rol + ancho_col * i + ancho_col / 2, y + 29));
  ctx.textAlign = 'left';
  y += 64;

  const xFin = W - MARGEN_T;
  bloques.forEach((b) => {
    if (b.grupo) {
      const col = resolver(b.grupo.color);
      ctx.fillStyle = col;
      rect(ctx, MARGEN_T, y + 6, xFin - MARGEN_T, b.alto - 8, 10);
      ctx.fill();
      ctx.font = '800 24px Outfit, system-ui, sans-serif';
      ctx.fillStyle = tintaSobre(col);
      ctx.textBaseline = 'middle';
      ctx.fillText(b.grupo.label, MARGEN_T + 16, y + 6 + (b.alto - 8) / 2 + 1);
    } else {
      const col = resolver(b.color);
      ctx.fillStyle = mezclar(col, c.bg, 0.16);
      ctx.fillRect(MARGEN_T, y, xFin - MARGEN_T, b.alto);
      ctx.strokeStyle = c.linea;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGEN_T, y + b.alto); ctx.lineTo(xFin, y + b.alto); ctx.stroke();
      ctx.fillStyle = c.tx;
      ctx.font = '600 24px Outfit, system-ui, sans-serif';
      ctx.textBaseline = 'alphabetic';
      partirTexto(ctx, b.rol, ancho_rol - 28).forEach((l, k) => ctx.fillText(l, MARGEN_T + 16, y + 38 + k * 30));
      b.textos.forEach((t, i) => {
        const vacio = !t;
        ctx.fillStyle = vacio ? c.tx3 : c.tx;
        ctx.font = `${vacio ? 500 : 600} 24px Outfit, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        partirTexto(ctx, t || '—', ancho_col - 28).forEach((l, k) => ctx.fillText(l, MARGEN_T + ancho_rol + ancho_col * i + ancho_col / 2, y + 38 + k * 30));
        ctx.textAlign = 'left';
      });
    }
    y += b.alto;
  });

  if (hayAus) {
    const col = resolver('var(--tx-3)');
    ctx.fillStyle = col;
    rect(ctx, MARGEN_T, y + 6, xFin - MARGEN_T, 44, 10);
    ctx.fill();
    ctx.fillStyle = tintaSobre(col);
    ctx.font = '800 24px Outfit, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('No estarán', MARGEN_T + 16, y + 29);
    ctx.textBaseline = 'alphabetic';
    y += 52;
    const textos = ausentes.map((x) => x.join(', '));
    const alto = altoFila(textos);
    ctx.fillStyle = mezclar(col, c.bg, 0.12);
    ctx.fillRect(MARGEN_T, y, xFin - MARGEN_T, alto);
    textos.forEach((t, i) => {
      ctx.fillStyle = t ? c.tx : c.tx3;
      ctx.font = '600 24px Outfit, system-ui, sans-serif';
      ctx.textAlign = 'center';
      partirTexto(ctx, t || '—', ancho_col - 28).forEach((l, k) => ctx.fillText(l, MARGEN_T + ancho_rol + ancho_col * i + ancho_col / 2, y + 38 + k * 30));
      ctx.textAlign = 'left';
    });
  }

  ctx.fillStyle = c.tx3;
  ctx.font = '500 20px Outfit, system-ui, sans-serif';
  ctx.fillText('Coordinación · Equipo Creativo TLC', MARGEN_T, H - 28);
  return lienzo;
}

const fechaDiaMesLargo = (iso) => `Dom ${Number(iso.slice(8))} ${nombreMes(iso).split(' ')[0].slice(0, 3).toLowerCase()}`;

export async function compartirTurnos(datos, nombreArchivo) {
  const lienzo = await dibujarTurnos(datos);
  return compartirLienzo(lienzo, nombreArchivo, datos.titulo);
}
