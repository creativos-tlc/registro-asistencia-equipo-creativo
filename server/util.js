const enc = new TextEncoder();

export const codificar = (s) => enc.encode(s);

export const hex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const desdeHex = (h) => Uint8Array.from((h.match(/../g) || []).map((x) => parseInt(x, 16)));

export const aleatorioHex = (bytes = 32) => hex(crypto.getRandomValues(new Uint8Array(bytes)));

export class HttpError extends Error {
  constructor(status, mensaje, extra = {}) {
    super(mensaje);
    this.status = status;
    this.extra = extra;
  }
}

export function responder(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function igualesSeguro(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function leerCookie(request, nombre) {
  const raw = request.headers.get('cookie') || '';
  for (const parte of raw.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

export async function leerJSON(request, maxBytes = 512 * 1024) {
  const tipo = request.headers.get('content-type') || '';
  if (!tipo.includes('application/json')) throw new HttpError(415, 'Se esperaba JSON');
  const texto = await request.text();
  if (texto.length > maxBytes) throw new HttpError(413, 'Solicitud demasiado grande');
  try {
    return JSON.parse(texto || '{}');
  } catch {
    throw new HttpError(400, 'JSON inválido');
  }
}
