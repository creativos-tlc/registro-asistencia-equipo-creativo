import { HttpError, aleatorioHex, codificar, desdeHex, hex, igualesSeguro, leerCookie, normalizar } from './util.js';

const ITERACIONES = 100000; // máximo que permite Cloudflare Workers en PBKDF2
export const COOKIE = 'tlc_sid';
const SESION_MS = 30 * 24 * 3600 * 1000;
const VENTANA_MS = 15 * 60 * 1000;
const PINES_DEBILES = new Set(['0000', '1111', '1234', '4321', '123456', '000000', '111111', '654321', '12345678']);

export async function derivarPin(pin, saltHex) {
  const clave = await crypto.subtle.importKey('raw', codificar(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: desdeHex(saltHex), iterations: ITERACIONES },
    clave,
    256
  );
  return hex(bits);
}

async function sha256(texto) {
  return hex(await crypto.subtle.digest('SHA-256', codificar(texto)));
}

export const PERMISOS_VALIDOS = ['contenido'];
const leerPermisos = (texto) => { try { const p = JSON.parse(texto || '[]'); return Array.isArray(p) ? p.filter((x) => PERMISOS_VALIDOS.includes(x)) : []; } catch { return []; } };

export async function cambiarPermisos(env, personaId, permisos) {
  const limpios = [...new Set((Array.isArray(permisos) ? permisos : []).filter((p) => PERMISOS_VALIDOS.includes(p)))];
  const r = await env.DB.prepare('UPDATE credenciales SET permisos = ? WHERE persona_id = ? AND activo = 1').bind(JSON.stringify(limpios), personaId).run();
  if (!r.meta.changes) throw new HttpError(404, 'Esa persona no tiene acceso a la app');
  return limpios;
}

export function validarPinNuevo(pin) {
  if (!/^\d{4,8}$/.test(String(pin || ''))) throw new HttpError(400, 'El PIN debe tener entre 4 y 8 dígitos');
  if (PINES_DEBILES.has(pin) || /^(\d)\1+$/.test(pin)) throw new HttpError(400, 'Ese PIN es demasiado fácil de adivinar');
}

export function pinTemporal() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, '0');
}

// ---------- freno a la fuerza bruta ----------
async function estadoBloqueo(db, clave, ahora) {
  const fila = await db.prepare('SELECT fallos, ventana_desde, bloqueado_hasta FROM intentos WHERE clave = ?').bind(clave).first();
  if (fila && fila.bloqueado_hasta > ahora) {
    throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.', {
      reintentarEnSeg: Math.ceil((fila.bloqueado_hasta - ahora) / 1000),
    });
  }
  return fila;
}

async function registrarFallo(db, clave, fila, ahora, maximo) {
  const enVentana = fila && ahora - fila.ventana_desde < VENTANA_MS;
  const fallos = enVentana ? fila.fallos + 1 : 1;
  const desde = enVentana ? fila.ventana_desde : ahora;
  const bloqueado = fallos >= maximo ? ahora + VENTANA_MS : 0;
  await db
    .prepare(
      `INSERT INTO intentos (clave, fallos, ventana_desde, bloqueado_hasta) VALUES (?, ?, ?, ?)
       ON CONFLICT(clave) DO UPDATE SET fallos = excluded.fallos, ventana_desde = excluded.ventana_desde, bloqueado_hasta = excluded.bloqueado_hasta`
    )
    .bind(clave, fallos, desde, bloqueado)
    .run();
}

// ---------- sesiones ----------
function cookieSesion(token, maxAge, esHttps) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${esHttps ? '; Secure' : ''}`;
}

export async function iniciarSesion(env, request, { nombre, pin }) {
  const ahora = Date.now();
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const claveNombre = `n:${normalizar(nombre)}`;
  const claveIp = `ip:${ip}`;

  const filaNombre = await estadoBloqueo(env.DB, claveNombre, ahora);
  const filaIp = await estadoBloqueo(env.DB, claveIp, ahora);

  const cred = await env.DB.prepare('SELECT * FROM credenciales WHERE nombre_norm = ? AND activo = 1').bind(normalizar(nombre)).first();
  // Se calcula siempre el hash para que el tiempo no delate si el nombre existe.
  const hash = await derivarPin(String(pin || ''), cred ? cred.pin_salt : '00'.repeat(16));
  const ok = cred && igualesSeguro(hash, cred.pin_hash);

  if (!ok) {
    await registrarFallo(env.DB, claveNombre, filaNombre, ahora, 5);
    await registrarFallo(env.DB, claveIp, filaIp, ahora, 25);
    throw new HttpError(401, 'Nombre o PIN incorrecto');
  }

  await env.DB.prepare('DELETE FROM intentos WHERE clave = ?').bind(claveNombre).run();
  const token = aleatorioHex(32);
  await env.DB
    .prepare('INSERT INTO sesiones (token_hash, persona_id, creada_en, expira_en, ip) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256(token), cred.persona_id, ahora, ahora + SESION_MS, ip)
    .run();
  await env.DB.prepare('DELETE FROM sesiones WHERE expira_en < ?').bind(ahora).run();

  const esHttps = new URL(request.url).protocol === 'https:';
  return {
    yo: { personaId: cred.persona_id, nombre: cred.nombre, rol: cred.rol, permisos: leerPermisos(cred.permisos), debeCambiarPin: !!cred.debe_cambiar },
    cookie: cookieSesion(token, SESION_MS / 1000, esHttps),
  };
}

export async function sesionActual(env, request) {
  const token = leerCookie(request, COOKIE);
  if (!token) return null;
  const fila = await env.DB
    .prepare(
      `SELECT s.persona_id, s.expira_en, c.nombre, c.rol, c.permisos, c.debe_cambiar
       FROM sesiones s JOIN credenciales c ON c.persona_id = s.persona_id
       WHERE s.token_hash = ? AND c.activo = 1`
    )
    .bind(await sha256(token))
    .first();
  if (!fila || fila.expira_en < Date.now()) return null;
  return { personaId: fila.persona_id, nombre: fila.nombre, rol: fila.rol, permisos: leerPermisos(fila.permisos), debeCambiarPin: !!fila.debe_cambiar };
}

export async function exigirSesion(env, request) {
  const yo = await sesionActual(env, request);
  if (!yo) throw new HttpError(401, 'Sesión no válida');
  return yo;
}

export async function cerrarSesion(env, request) {
  const token = leerCookie(request, COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sesiones WHERE token_hash = ?').bind(await sha256(token)).run();
  const esHttps = new URL(request.url).protocol === 'https:';
  return cookieSesion('', 0, esHttps);
}

export async function cambiarPin(env, request, yo, { actual, nuevo }) {
  validarPinNuevo(nuevo);
  const cred = await env.DB.prepare('SELECT pin_hash, pin_salt FROM credenciales WHERE persona_id = ?').bind(yo.personaId).first();
  const hash = await derivarPin(String(actual || ''), cred.pin_salt);
  if (!igualesSeguro(hash, cred.pin_hash)) throw new HttpError(401, 'El PIN actual no es correcto');
  if (nuevo === actual) throw new HttpError(400, 'El PIN nuevo debe ser distinto');

  const salt = aleatorioHex(16);
  await env.DB
    .prepare('UPDATE credenciales SET pin_hash = ?, pin_salt = ?, debe_cambiar = 0 WHERE persona_id = ?')
    .bind(await derivarPin(nuevo, salt), salt, yo.personaId)
    .run();
  const token = leerCookie(request, COOKIE);
  const actualHash = token ? await sha256(token) : '';
  await env.DB.prepare('DELETE FROM sesiones WHERE persona_id = ? AND token_hash != ?').bind(yo.personaId, actualHash).run();
}

export async function crearOReiniciarCredencial(env, { personaId, nombre, rol }) {
  if (!/^[\w:-]{1,80}$/.test(personaId || '')) throw new HttpError(400, 'Persona inválida');
  const limpio = String(nombre || '').trim().slice(0, 80);
  if (!limpio) throw new HttpError(400, 'Falta el nombre');
  if (!['lider', 'voluntario'].includes(rol)) throw new HttpError(400, 'Rol inválido');

  const temporal = pinTemporal();
  const salt = aleatorioHex(16);
  const hash = await derivarPin(temporal, salt);
  const ahora = Date.now();
  try {
    await env.DB
      .prepare(
        `INSERT INTO credenciales (persona_id, nombre, nombre_norm, rol, pin_hash, pin_salt, debe_cambiar, activo, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
         ON CONFLICT(persona_id) DO UPDATE SET nombre = excluded.nombre, nombre_norm = excluded.nombre_norm, rol = excluded.rol,
           pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, debe_cambiar = 1, activo = 1`
      )
      .bind(personaId, limpio, normalizar(limpio), rol, hash, salt, ahora)
      .run();
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Ya existe otra persona con acceso y ese nombre');
    throw e;
  }
  await env.DB.prepare('DELETE FROM sesiones WHERE persona_id = ?').bind(personaId).run();
  return temporal;
}

export async function cambiarRol(env, personaId, rol) {
  if (!['lider', 'voluntario'].includes(rol)) throw new HttpError(400, 'Rol inválido');
  const r = await env.DB.prepare('UPDATE credenciales SET rol = ? WHERE persona_id = ? AND activo = 1').bind(rol, personaId).run();
  if (!r.meta.changes) throw new HttpError(404, 'Esa persona no tiene acceso a la app');
}

export async function quitarCredencial(env, personaId) {
  await env.DB.prepare('UPDATE credenciales SET activo = 0 WHERE persona_id = ?').bind(personaId).run();
  await env.DB.prepare('DELETE FROM sesiones WHERE persona_id = ?').bind(personaId).run();
}

export async function listarAcceso(env) {
  const { results } = await env.DB.prepare('SELECT persona_id, nombre FROM credenciales WHERE activo = 1 ORDER BY nombre').all();
  return results.map((r) => ({ personaId: r.persona_id, nombre: r.nombre }));
}
