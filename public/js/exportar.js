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

/** Crea la imagen del mes y la comparte (WhatsApp, Guardar imagen…) o, si no se puede, la descarga. */
export async function exportarMes({ mes, todos, formato, canal }) {
  const lienzo = await dibujarMes({ mes, todos, formato, canal });
  const blob = await aBlob(lienzo);
  const nombre = `contenido-${mes}${formato ? `-${formato}` : canal ? `-${canal}` : ''}.png`;
  const archivo = new File([blob], nombre, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: `Contenido ${nombreMes(`${mes}-01`)}` });
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
