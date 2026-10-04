/* Store local-first con sincronización.
 *  - Toda escritura se aplica al instante en memoria y se guarda en este dispositivo.
 *  - Los cambios entran a una cola (outbox) que se envía al servidor apenas hay conexión.
 *  - Cada 20 s (y al volver a la app) se consultan los cambios del otro líder.
 *  - Conflictos: gana el último cambio por registro (los registros son pequeños: una tarea, una asistencia).
 */

export const COLECCIONES = ['equipos', 'personas', 'eventos', 'asistencia', 'tareas', 'publicaciones', 'ajustes'];
const CLAVE_CACHE = 'tlc.cache.v1';
const SOLAPE_MS = 5000;
const INTERVALO_MS = 20000;

const vacio = () => Object.fromEntries(COLECCIONES.map((c) => [c, {}]));
const estado = {
  yo: null,
  docs: vacio(),
  revs: {},
  outbox: [],
  cursor: 0,
  ultimoSync: null,
  sync: 'ok', // ok | busy | off
  sinConexion: false,
};
const memo = new Map();
const suscriptores = new Set();
const escuchasSesion = new Set();
let volando = false;
let temporizador = null;
let sesionInvalida = false;

export class ErrorApi extends Error {
  constructor(status, mensaje, datos = {}) { super(mensaje); this.status = status; this.datos = datos; }
}

export async function api(ruta, { metodo = 'GET', cuerpo, timeout = 15000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`/api/${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo ? { 'content-type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: ctl.signal,
    });
    let datos = {};
    try { datos = await r.json(); } catch { /* respuesta sin JSON */ }
    if (!r.ok) throw new ErrorApi(r.status, datos.error || 'Error del servidor', datos);
    return datos;
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    throw new ErrorApi(0, 'Sin conexión');
  } finally {
    clearTimeout(t);
  }
}

// ---------- persistencia local ----------
let guardando = null;
function persistir() {
  clearTimeout(guardando);
  guardando = setTimeout(guardarYa, 250);
}
function guardarYa() {
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify({ v: 1, yo: estado.yo, docs: estado.docs, revs: estado.revs, outbox: estado.outbox, cursor: estado.cursor, ultimoSync: estado.ultimoSync }));
  } catch (e) {
    console.warn('No se pudo guardar en este dispositivo', e);
  }
}
addEventListener('pagehide', guardarYa);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarYa(); });

function cargarCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
    if (!c || c.v !== 1) return null;
    return c;
  } catch { return null; }
}

// ---------- suscripciones ----------
export const suscribir = (fn) => { suscriptores.add(fn); return () => suscriptores.delete(fn); };
export const alExpirarSesion = (fn) => { escuchasSesion.add(fn); return () => escuchasSesion.delete(fn); };
let avisoPendiente = null;
function avisar(colecciones) {
  memo.clear();
  if (avisoPendiente) { colecciones.forEach((c) => avisoPendiente.add(c)); return; }
  avisoPendiente = new Set(colecciones);
  queueMicrotask(() => { const cs = avisoPendiente; avisoPendiente = null; suscriptores.forEach((fn) => fn(cs)); });
}
function marcarSync(s) {
  if (estado.sync === s) return;
  estado.sync = s;
  suscriptores.forEach((fn) => fn(new Set(['_sync'])));
}
export const estadoSync = () => ({ estado: estado.sync, pendientes: estado.outbox.length, ultimo: estado.ultimoSync, sinConexion: estado.sinConexion });
export const pendientes = () => estado.outbox.length;

// ---------- lectura ----------
export const yo = () => estado.yo;

export function lista(c) {
  if (!memo.has(c)) memo.set(c, Object.entries(estado.docs[c] || {}).map(([id, d]) => ({ id, ...d })));
  return memo.get(c);
}
export const obtener = (c, id) => (estado.docs[c]?.[id] ? { id, ...estado.docs[c][id] } : null);

// ---------- escritura ----------
/** ops: [{c, id, data}] — data null borra. Devuelve una función `deshacer`. */
export class ErrorPermiso extends Error {}
export const puedeEscribir = (c) => estado.yo?.rol === 'lider' || c === 'publicaciones';

export function guardar(ops) {
  if (ops.some((op) => !puedeEscribir(op.c))) throw new ErrorPermiso('Solo los líderes pueden hacer este cambio.');
  const previos = [];
  const tocadas = new Set();
  for (const op of ops) {
    const previo = estado.docs[op.c]?.[op.id];
    previos.push({ c: op.c, id: op.id, data: previo ? structuredClone(previo) : null });
    const datos = op.data ? (({ id, ...resto }) => resto)(op.data) : null;
    if (datos) estado.docs[op.c][op.id] = datos; else delete estado.docs[op.c][op.id];
    estado.outbox = estado.outbox.filter((o) => !(o.c === op.c && o.id === op.id));
    estado.outbox.push({ c: op.c, id: op.id, data: datos });
    tocadas.add(op.c);
  }
  persistir();
  avisar(tocadas);
  marcarSync(estado.sinConexion ? 'off' : estado.sync);
  suscriptores.forEach((fn) => fn(new Set(['_sync'])));
  vaciarCola();
  return () => guardar(previos.reverse());
}
export const poner = (c, id, data) => guardar([{ c, id, data }]);
export const quitar = (c, id) => guardar([{ c, id, data: null }]);

// ---------- sincronización ----------
function aplicarRemotos(registros) {
  const tocadas = new Set();
  const enCola = new Set(estado.outbox.map((o) => `${o.c}|${o.id}`));
  for (const r of registros) {
    if (!COLECCIONES.includes(r.c)) continue;
    const k = `${r.c}|${r.id}`;
    if (enCola.has(k)) continue; // el cambio local pendiente gana hasta que se envíe
    if ((estado.revs[k] || 0) > r.rev) continue;
    estado.revs[k] = r.rev;
    const antes = JSON.stringify(estado.docs[r.c][r.id] ?? null);
    if (r.borrado) delete estado.docs[r.c][r.id]; else estado.docs[r.c][r.id] = r.data;
    if (antes !== JSON.stringify(estado.docs[r.c][r.id] ?? null)) tocadas.add(r.c);
  }
  return tocadas;
}

function manejarFallo(e) {
  if (e.status === 401) {
    marcarSync('off');
    if (!sesionInvalida) { sesionInvalida = true; escuchasSesion.forEach((fn) => fn()); }
    return;
  }
  if (e.status === 0 || e.status >= 500 || e.status === 429) { estado.sinConexion = e.status === 0; marcarSync('off'); return; }
}

export async function traer({ completo = false } = {}) {
  if (!estado.yo || sesionInvalida) return;
  let desde = completo ? 0 : Math.max(0, estado.cursor - SOLAPE_MS);
  let hayMas = true;
  const tocadas = new Set();
  while (hayMas) {
    const r = await api(`sync?since=${desde}`);
    aplicarRemotos(r.registros).forEach((c) => tocadas.add(c));
    if (r.cursor > estado.cursor) estado.cursor = r.cursor;
    desde = r.cursor;
    hayMas = r.hayMas;
  }
  estado.ultimoSync = Date.now();
  estado.sinConexion = false;
  if (tocadas.size) avisar(tocadas);
  persistir();
}

export async function vaciarCola() {
  if (volando || !estado.outbox.length || !estado.yo || sesionInvalida) return;
  volando = true;
  marcarSync('busy');
  try {
    while (estado.outbox.length) {
      const lote = estado.outbox.slice(0, 150);
      try {
        await api('sync', { metodo: 'POST', cuerpo: { ops: lote } });
      } catch (e) {
        if (e.status >= 400 && e.status < 500 && ![401, 429].includes(e.status) && lote.length > 1) {
          // un registro inválido no puede trabar al resto: se aísla y se descarta
          for (const op of lote) {
            try { await api('sync', { metodo: 'POST', cuerpo: { ops: [op] } }); }
            catch (e2) { if (e2.status >= 400 && e2.status < 500 && e2.status !== 401 && e2.status !== 429) console.warn('Cambio descartado', op, e2.message); else throw e2; }
          }
        } else if (e.status >= 400 && e.status < 500 && ![401, 429].includes(e.status)) {
          console.warn('Cambio descartado', lote[0], e.message);
        } else throw e;
      }
      estado.outbox = estado.outbox.filter((o) => !lote.includes(o));
      persistir();
    }
    estado.sinConexion = false;
    marcarSync('ok');
  } catch (e) {
    manejarFallo(e);
  } finally {
    volando = false;
    suscriptores.forEach((fn) => fn(new Set(['_sync'])));
  }
}

export async function sincronizarAhora() {
  if (!estado.yo || sesionInvalida) return;
  try {
    await vaciarCola();
    await traer();
    if (!estado.outbox.length) marcarSync('ok');
  } catch (e) {
    manejarFallo(e);
  }
  suscriptores.forEach((fn) => fn(new Set(['_sync'])));
}

function iniciarLatido() {
  clearInterval(temporizador);
  temporizador = setInterval(() => { if (document.visibilityState === 'visible') sincronizarAhora(); }, INTERVALO_MS);
  addEventListener('online', sincronizarAhora);
  addEventListener('focus', sincronizarAhora);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizarAhora(); });
}

// ---------- sesión ----------
/** Devuelve 'ok' | 'login' | 'offline-ok'. Con caché de la misma persona se puede trabajar sin conexión. */
export async function arrancar() {
  const cache = cargarCache();
  try {
    const { yo: persona } = await api('yo');
    if (cache && cache.yo && cache.yo.personaId === persona.personaId) {
      Object.assign(estado, { docs: { ...vacio(), ...cache.docs }, revs: cache.revs || {}, outbox: cache.outbox || [], cursor: cache.cursor || 0, ultimoSync: cache.ultimoSync || null });
    } else {
      localStorage.removeItem(CLAVE_CACHE);
    }
    estado.yo = persona;
    return 'ok';
  } catch (e) {
    if (e.status === 401) {
      // conservamos la cola pendiente de esta persona para enviarla tras volver a entrar
      if (cache) Object.assign(estado, { docs: { ...vacio(), ...cache.docs }, revs: cache.revs || {}, outbox: cache.outbox || [], cursor: cache.cursor || 0, ultimoSync: cache.ultimoSync || null });
      estado.pendienteDe = cache?.yo?.personaId || null;
      return 'login';
    }
    if (cache && cache.yo) {
      Object.assign(estado, { yo: cache.yo, docs: { ...vacio(), ...cache.docs }, revs: cache.revs || {}, outbox: cache.outbox || [], cursor: cache.cursor || 0, ultimoSync: cache.ultimoSync || null, sinConexion: true, sync: 'off' });
      return 'offline-ok';
    }
    throw e;
  }
}

export async function comenzar() {
  iniciarLatido();
  if (!estado.sinConexion) {
    try { await traer({ completo: estado.cursor === 0 }); await vaciarCola(); } catch (e) { manejarFallo(e); }
  }
  avisar(COLECCIONES);
}

export async function ingresar(nombre, pin) {
  const { yo: persona } = await api('login', { metodo: 'POST', cuerpo: { nombre, pin } });
  if (estado.pendienteDe && estado.pendienteDe !== persona.personaId) {
    estado.docs = vacio(); estado.revs = {}; estado.outbox = []; estado.cursor = 0;
    localStorage.removeItem(CLAVE_CACHE);
  }
  estado.yo = persona;
  estado.pendienteDe = null;
  sesionInvalida = false;
  persistir();
  return persona;
}

export async function cambiarPin(actual, nuevo) {
  await api('pin', { metodo: 'POST', cuerpo: { actual, nuevo } });
  if (estado.yo) { estado.yo = { ...estado.yo, debeCambiarPin: false }; persistir(); }
}

export async function salir() {
  try { await vaciarCola(); } catch { /* se avisa desde la interfaz si quedaron pendientes */ }
  try { await api('logout', { metodo: 'POST', cuerpo: {} }); } catch { /* sin conexión: se limpia igual */ }
  localStorage.removeItem(CLAVE_CACHE);
  location.reload();
}

export const debeCambiarPin = () => !!estado.yo?.debeCambiarPin;
export const esLider = () => estado.yo?.rol === 'lider';

// Para pruebas locales y respaldo
export const volcarTodo = () => structuredClone(estado.docs);
export function reemplazarLocal(docs) { estado.docs = { ...vacio(), ...docs }; memo.clear(); avisar(COLECCIONES); }
