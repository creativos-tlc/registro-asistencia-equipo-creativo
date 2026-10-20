import {
  cambiarPermisos,
  cambiarPin,
  cambiarRol,
  cerrarSesion,
  crearOReiniciarCredencial,
  exigirSesion,
  iniciarSesion,
  listarAcceso,
  quitarCredencial,
  sesionActual,
} from './auth.js';
import { HttpError, leerJSON, responder } from './util.js';

const COLECCIONES = new Set(['equipos', 'personas', 'eventos', 'asistencia', 'tareas', 'publicaciones', 'notas', 'roles', 'turnos', 'ausencias', 'proyectos', 'devocionales', 'categorias', 'avisos', 'ajustes']);
const ID_VALIDO = /^[\w:~.-]{1,90}$/;
const MAX_OPS = 300;
const MAX_DATA = 24 * 1024;
const LIMITE_PULL = 5000;

// Punto único de permisos. Hoy solo entran líderes; cuando entren voluntarios se afina aquí.
// Un voluntario ve el calendario y las tareas, y puede crear y asignar tareas. Nada más.
const LECTURA_VOLUNTARIO = new Set(['equipos', 'personas', 'eventos', 'tareas', 'notas', 'roles', 'turnos', 'ausencias', 'proyectos', 'devocionales', 'categorias']);
const ESCRITURA_VOLUNTARIO = new Set(['tareas']);
const CAMPOS_PRIVADOS = ['telefono', 'correo', 'direccion', 'anioNac', 'emergencia', 'notas', 'fechaNac', 'alergias', 'talla'];
// Lo que cada persona puede cambiar de su propia ficha (nunca su rol, sus permisos ni su fecha de ingreso).
const CAMPOS_PROPIOS = ['telefono', 'correo', 'fechaNac', 'anioNac', 'direccion', 'alergias', 'talla', 'emergencia'];

// Lo que suma cada permiso extra (lo da un líder desde el perfil de la persona).
const PERMISO_COLECCIONES = { contenido: ['publicaciones'], turnos: ['roles', 'turnos', 'ausencias'], devocional: ['devocionales'] };

function puede(yo, operacion, coleccion) {
  if (yo.rol === 'lider') return true;
  if ((operacion === 'leer' ? LECTURA_VOLUNTARIO : ESCRITURA_VOLUNTARIO).has(coleccion)) return true;
  return (yo.permisos || []).some((p) => (PERMISO_COLECCIONES[p] || []).includes(coleccion));
}

// Un voluntario ve quién está en el equipo, pero no sus datos de contacto ni notas.
function paraRol(yo, coleccion, data, id) {
  if (yo.rol === 'lider' || coleccion !== 'personas' || !data) return data;
  if (id === yo.personaId) return data; // cada quien ve su propia ficha completa
  const copia = { ...data };
  // El cumpleaños se comparte sin el año; lo demás de la ficha es solo para líderes.
  if (typeof data.fechaNac === 'string' && data.fechaNac.length >= 10) copia.cumple = data.fechaNac.slice(5, 10);
  CAMPOS_PRIVADOS.forEach((c) => delete copia[c]);
  return copia;
}

function paraDe(texto) { try { return JSON.parse(texto).para || null; } catch { return null; } }
function responsableDe(texto) { try { return JSON.parse(texto).responsableId || null; } catch { return null; } }
const ESTADOS_PUBLICACION = ['idea', 'en_curso', 'falta_info', 'listo', 'publicado'];

function verificarOrigen(request, url) {
  const origen = request.headers.get('origin');
  if (origen && new URL(origen).host !== url.host) throw new HttpError(403, 'Origen no permitido');
}

async function pull(env, yo, url) {
  const desde = Math.max(0, parseInt(url.searchParams.get('since') || '0', 10) || 0);
  const { results } = await env.DB
    .prepare(
      `SELECT coleccion AS c, id, data, rev, borrado, actualizado_en AS t
       FROM registros WHERE actualizado_en > ? ORDER BY actualizado_en LIMIT ?`
    )
    .bind(desde, LIMITE_PULL)
    .all();
  // Quien no tiene el permiso de Contenido igual recibe las publicaciones que tiene a su cargo (y los borrados, que no traen datos).
  // Los avisos son personales: cada quien recibe solo los suyos, también los líderes.
  const visibles = results.filter((r) => (r.c === 'avisos' ? (r.borrado || paraDe(r.data) === yo.personaId) : puede(yo, 'leer', r.c) || (r.c === 'publicaciones' && (r.borrado || responsableDe(r.data) === yo.personaId))));
  const registros = visibles.map((r) => ({
    c: r.c,
    id: r.id,
    rev: r.rev,
    t: r.t,
    borrado: !!r.borrado,
    data: r.borrado ? null : paraRol(yo, r.c, JSON.parse(r.data), r.id),
  }));
  const ultimo = results.length ? results[results.length - 1].t : desde;
  return { ahora: Date.now(), cursor: ultimo, hayMas: results.length === LIMITE_PULL, registros };
}

async function push(env, yo, request) {
  const cuerpo = await leerJSON(request);
  const ops = Array.isArray(cuerpo.ops) ? cuerpo.ops : [];
  if (ops.length > MAX_OPS) throw new HttpError(413, 'Demasiados cambios en una sola solicitud');
  const ahora = Date.now();
  const stmts = [];
  for (let op of ops) {
    if (!COLECCIONES.has(op.c)) throw new HttpError(400, `Colección desconocida: ${op.c}`);
    if (!ID_VALIDO.test(op.id || '')) throw new HttpError(400, 'Id inválido');
    // Avisos: cualquiera puede avisarle a otra persona (queda firmado con su id), pero solo el destinatario puede marcarlo como leído o borrarlo.
    let esAviso = false;
    if (op.c === 'avisos') {
      esAviso = true;
      const f = await env.DB.prepare(`SELECT data FROM registros WHERE coleccion = 'avisos' AND id = ?`).bind(op.id).first();
      if (!f) {
        const d = op.data;
        if (!d || typeof d !== 'object' || typeof d.para !== 'string' || !d.para) throw new HttpError(400, 'Aviso inválido');
        const ref = d.ref && typeof d.ref === 'object' ? { c: String(d.ref.c || '').slice(0, 30), id: String(d.ref.id || '').slice(0, 90) } : null;
        op = { ...op, data: { equipoId: 'creativo', para: d.para.slice(0, 60), tipo: String(d.tipo || 'aviso').slice(0, 30), texto: String(d.texto || '').slice(0, 300), ref, de: yo.personaId, creado: Date.now(), leido: false } };
      } else {
        const actual = JSON.parse(f.data);
        if (actual.para !== yo.personaId) throw new HttpError(403, 'Ese aviso no es tuyo');
        if (op.data === null || op.data === undefined) op = { ...op, data: null };
        else op = { ...op, data: { ...actual, leido: !!op.data.leido } };
      }
    }
    const propia = op.c === 'personas' && op.id === yo.personaId && yo.rol !== 'lider' && !puede(yo, 'escribir', op.c);
    let aCargo = false;
    if (!propia && op.c === 'publicaciones' && yo.rol !== 'lider' && !puede(yo, 'escribir', op.c) && op.data && typeof op.data === 'object') {
      const f = await env.DB.prepare(`SELECT data FROM registros WHERE coleccion = 'publicaciones' AND id = ? AND borrado = 0`).bind(op.id).first();
      aCargo = !!f && responsableDe(f.data) === yo.personaId;
    }
    if (!esAviso && !propia && !aCargo && !puede(yo, 'escribir', op.c)) throw new HttpError(403, 'No tienes permiso para modificar esto');
    const borrar = op.data === null || op.data === undefined;
    let texto = borrar ? '{}' : JSON.stringify(op.data);
    if (propia) {
      // Solo sus datos personales: el resto de la ficha se conserva tal como está en el servidor.
      if (borrar || typeof op.data !== 'object') throw new HttpError(403, 'No puedes borrar tu ficha');
      const fila = await env.DB.prepare(`SELECT data FROM registros WHERE coleccion = 'personas' AND id = ? AND borrado = 0`).bind(op.id).first();
      if (!fila) throw new HttpError(404, 'No se encontró tu ficha');
      const actual = JSON.parse(fila.data);
      for (const k of CAMPOS_PROPIOS) {
        if (!(k in op.data)) continue;
        const v = op.data[k];
        if (v === null || v === '' || typeof v === 'string' || typeof v === 'number') actual[k] = typeof v === 'string' ? v.slice(0, 500) : v;
      }
      op = { ...op, data: actual };
      texto = JSON.stringify(actual);
    }
    if (aCargo) {
      // Quien tiene a cargo una publicación solo puede cambiar en qué va y su texto; fecha, responsable y formato siguen siendo de los líderes.
      const f = await env.DB.prepare(`SELECT data FROM registros WHERE coleccion = 'publicaciones' AND id = ?`).bind(op.id).first();
      const actual = JSON.parse(f.data);
      if (ESTADOS_PUBLICACION.includes(op.data.estado)) actual.estado = op.data.estado;
      if (typeof op.data.detalle === 'string') actual.detalle = op.data.detalle.slice(0, 4000);
      op = { ...op, data: actual };
      texto = JSON.stringify(actual);
    }
    if (texto.length > MAX_DATA) throw new HttpError(413, 'Un registro es demasiado grande');
    const equipo = !borrar && typeof op.data.equipoId === 'string' ? op.data.equipoId.slice(0, 60) : null;
    stmts.push(
      env.DB
        .prepare(
          `INSERT INTO registros (coleccion, id, equipo_id, data, rev, borrado, actualizado_en, actualizado_por)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?)
           ON CONFLICT(coleccion, id) DO UPDATE SET
             data = excluded.data, equipo_id = excluded.equipo_id, borrado = excluded.borrado,
             rev = registros.rev + 1, actualizado_en = excluded.actualizado_en, actualizado_por = excluded.actualizado_por`
        )
        .bind(op.c, op.id, equipo, texto, borrar ? 1 : 0, ahora, yo.personaId)
    );
  }
  if (stmts.length) await env.DB.batch(stmts);
  return { ahora, aplicados: stmts.length };
}

export async function manejar({ request, env }) {
  const url = new URL(request.url);
  const ruta = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const metodo = request.method;
  try {
    if (!env.DB) throw new HttpError(500, 'Base de datos no configurada');
    if (metodo !== 'GET' && metodo !== 'HEAD') verificarOrigen(request, url);

    switch (`${metodo} ${ruta}`) {
      case 'GET acceso':
        return responder({ personas: await listarAcceso(env) });

      case 'POST login': {
        const { nombre, pin } = await leerJSON(request, 2048);
        if (!nombre || !pin) throw new HttpError(400, 'Falta nombre o PIN');
        const { yo, cookie } = await iniciarSesion(env, request, { nombre: String(nombre), pin: String(pin) });
        return responder({ yo }, 200, { 'set-cookie': cookie });
      }

      case 'POST logout':
        return responder({ ok: true }, 200, { 'set-cookie': await cerrarSesion(env, request) });

      case 'GET yo': {
        const yo = await sesionActual(env, request);
        if (!yo) throw new HttpError(401, 'Sin sesión');
        return responder({ yo });
      }

      case 'POST pin': {
        const yo = await exigirSesion(env, request);
        await cambiarPin(env, request, yo, await leerJSON(request, 2048));
        return responder({ ok: true });
      }

      case 'GET sync': {
        const yo = await exigirSesion(env, request);
        return responder(await pull(env, yo, url));
      }

      // Cada persona puede ver su propia asistencia sin ver la de los demás: solo qué listas se tomaron y su marca en cada una.
      case 'GET mi-asistencia': {
        const yo = await exigirSesion(env, request);
        const { results } = await env.DB
          .prepare(`SELECT json_extract(data, '$.eventoId') AS e, json_extract(data, '$.personaId') AS p, json_extract(data, '$.estado') AS s FROM registros WHERE coleccion = 'asistencia' AND borrado = 0`)
          .all();
        const listas = new Set();
        const marcas = {};
        for (const r of results) { listas.add(r.e); if (r.p === yo.personaId) marcas[r.e] = r.s; }
        return responder({ listas: [...listas], marcas });
      }

      case 'POST sync': {
        const yo = await exigirSesion(env, request);
        return responder(await push(env, yo, request));
      }

      case 'POST admin/credencial': {
        const yo = await exigirSesion(env, request);
        if (yo.rol !== 'lider') throw new HttpError(403, 'Solo un líder puede dar acceso');
        const temporal = await crearOReiniciarCredencial(env, await leerJSON(request, 2048));
        return responder({ pinTemporal: temporal });
      }

      case 'POST admin/rol': {
        const yo = await exigirSesion(env, request);
        if (yo.rol !== 'lider') throw new HttpError(403, 'Solo un líder puede cambiar permisos');
        const { personaId, rol } = await leerJSON(request, 1024);
        if (personaId === yo.personaId) throw new HttpError(400, 'No puedes cambiar tu propio nivel de permisos');
        await cambiarRol(env, String(personaId), String(rol));
        return responder({ ok: true });
      }

      case 'POST admin/permisos': {
        const yo = await exigirSesion(env, request);
        if (yo.rol !== 'lider') throw new HttpError(403, 'Solo un líder puede cambiar permisos');
        const { personaId, permisos } = await leerJSON(request, 1024);
        return responder({ permisos: await cambiarPermisos(env, String(personaId), permisos) });
      }

      case 'POST admin/quitar-acceso': {
        const yo = await exigirSesion(env, request);
        if (yo.rol !== 'lider') throw new HttpError(403, 'Solo un líder puede quitar acceso');
        const { personaId } = await leerJSON(request, 1024);
        if (personaId === yo.personaId) throw new HttpError(400, 'No puedes quitarte tu propio acceso');
        await quitarCredencial(env, String(personaId));
        return responder({ ok: true });
      }

      default:
        throw new HttpError(404, 'No existe');
    }
  } catch (e) {
    if (e instanceof HttpError) return responder({ error: e.message, ...e.extra }, e.status);
    console.error('API error', e && e.stack ? e.stack : e);
    return responder({ error: 'Error interno' }, 500);
  }
}
