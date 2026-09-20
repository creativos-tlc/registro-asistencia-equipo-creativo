import type { Db } from './db';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const SESSION_DIAS = 30;

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function nuevoId(prefijo: string): string {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ============ AUTH ============

export async function login(db: Db, nombre: string, pin: string) {
  if (!nombre || !pin) throw new ApiError('Falta nombre o PIN', 400);

  const lider = await db.first<{ id: string; nombre: string; pin_hash: string }>(
    'SELECT id, nombre, pin_hash FROM lideres WHERE nombre = ?',
    [nombre]
  );
  if (!lider) throw new ApiError('Nombre o PIN incorrecto', 401);

  const hash = await hashPin(pin);
  if (hash !== lider.pin_hash) throw new ApiError('Nombre o PIN incorrecto', 401);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DIAS * 24 * 60 * 60 * 1000).toISOString();
  await db.run('INSERT INTO sessions (token, lider_id, expires_at) VALUES (?, ?, ?)', [
    token,
    lider.id,
    expiresAt,
  ]);

  return { token, nombre: lider.nombre };
}

export async function logout(db: Db, token: string | null) {
  if (token) await db.run('DELETE FROM sessions WHERE token = ?', [token]);
}

export async function requireAuth(db: Db, token: string | null) {
  if (!token) throw new ApiError('No autorizado', 401);
  const session = await db.first<{ lider_id: string; expires_at: string; nombre: string }>(
    `SELECT sessions.lider_id as lider_id, sessions.expires_at as expires_at, lideres.nombre as nombre
     FROM sessions JOIN lideres ON lideres.id = sessions.lider_id
     WHERE sessions.token = ?`,
    [token]
  );
  if (!session) throw new ApiError('Sesión inválida', 401);
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw new ApiError('Sesión expirada', 401);
  }
  return { liderId: session.lider_id, nombre: session.nombre };
}

// ============ ESTADO COMPLETO ============

export async function getEstado(db: Db) {
  const voluntarios = await db.all<{ nombre: string; fecha_union: string }>(
    'SELECT nombre, fecha_union FROM voluntarios ORDER BY created_at ASC'
  );
  const eventos = await db.all<{ id: string; nombre: string; fecha: string; tipo: string; asignados: string }>(
    'SELECT id, nombre, fecha, tipo, asignados FROM eventos ORDER BY fecha ASC'
  );
  const filasAsistencia = await db.all<{ evento_id: string; voluntario_nombre: string; presente: number }>(
    'SELECT evento_id, voluntario_nombre, presente FROM asistencias'
  );

  const asistencias: Record<string, Record<string, boolean>> = {};
  for (const fila of filasAsistencia) {
    if (!asistencias[fila.evento_id]) asistencias[fila.evento_id] = {};
    asistencias[fila.evento_id][fila.voluntario_nombre] = !!fila.presente;
  }

  return {
    voluntarios: voluntarios.map((v) => ({ nombre: v.nombre, fechaUnion: v.fecha_union })),
    eventos: eventos.map((e) => ({ ...e, asignados: JSON.parse(e.asignados || '[]') })),
    asistencias,
  };
}

// ============ VOLUNTARIOS ============

export async function crearVoluntario(db: Db, nombre: string, fechaUnion: string) {
  if (!nombre?.trim()) throw new ApiError('Falta el nombre', 400);
  const existente = await db.first('SELECT nombre FROM voluntarios WHERE nombre = ?', [nombre]);
  if (existente) throw new ApiError('Ese voluntario ya existe', 409);
  await db.run('INSERT INTO voluntarios (nombre, fecha_union) VALUES (?, ?)', [nombre, fechaUnion]);
  return { nombre, fechaUnion };
}

export async function actualizarVoluntario(
  db: Db,
  nombreViejo: string,
  nombreNuevo: string,
  fechaUnion: string
) {
  const existente = await db.first('SELECT nombre FROM voluntarios WHERE nombre = ?', [nombreViejo]);
  if (!existente) throw new ApiError('Voluntario no encontrado', 404);

  if (nombreNuevo !== nombreViejo) {
    const duplicado = await db.first('SELECT nombre FROM voluntarios WHERE nombre = ?', [nombreNuevo]);
    if (duplicado) throw new ApiError('Ese voluntario ya existe', 409);
  }

  await db.run('UPDATE voluntarios SET nombre = ?, fecha_union = ? WHERE nombre = ?', [
    nombreNuevo,
    fechaUnion,
    nombreViejo,
  ]);

  if (nombreNuevo !== nombreViejo) {
    // Migrar asistencias con el nombre viejo
    await db.run('UPDATE asistencias SET voluntario_nombre = ? WHERE voluntario_nombre = ?', [
      nombreNuevo,
      nombreViejo,
    ]);
    // Migrar referencias dentro de eventos.asignados (JSON)
    const eventos = await db.all<{ id: string; asignados: string }>(
      'SELECT id, asignados FROM eventos WHERE asignados LIKE ?',
      [`%${nombreViejo}%`]
    );
    for (const e of eventos) {
      const asignados: string[] = JSON.parse(e.asignados || '[]');
      if (asignados.includes(nombreViejo)) {
        const nuevos = asignados.map((n) => (n === nombreViejo ? nombreNuevo : n));
        await db.run('UPDATE eventos SET asignados = ? WHERE id = ?', [JSON.stringify(nuevos), e.id]);
      }
    }
  }

  return { nombre: nombreNuevo, fechaUnion };
}

export async function eliminarVoluntario(db: Db, nombre: string) {
  await db.run('DELETE FROM voluntarios WHERE nombre = ?', [nombre]);
  await db.run('DELETE FROM asistencias WHERE voluntario_nombre = ?', [nombre]);

  const eventos = await db.all<{ id: string; asignados: string }>(
    'SELECT id, asignados FROM eventos WHERE asignados LIKE ?',
    [`%${nombre}%`]
  );
  for (const e of eventos) {
    const asignados: string[] = JSON.parse(e.asignados || '[]');
    if (asignados.includes(nombre)) {
      const nuevos = asignados.filter((n) => n !== nombre);
      await db.run('UPDATE eventos SET asignados = ? WHERE id = ?', [JSON.stringify(nuevos), e.id]);
    }
  }
}

// ============ EVENTOS ============

export async function crearEvento(
  db: Db,
  datos: { nombre: string; fecha: string; tipo: string; asignados: string[] }
) {
  if (!datos.tipo || !datos.fecha) throw new ApiError('Falta el tipo o la fecha', 400);
  const id = nuevoId('evt');
  await db.run('INSERT INTO eventos (id, nombre, fecha, tipo, asignados) VALUES (?, ?, ?, ?, ?)', [
    id,
    datos.nombre,
    datos.fecha,
    datos.tipo,
    JSON.stringify(datos.asignados || []),
  ]);
  return { id, ...datos, asignados: datos.asignados || [] };
}

export async function actualizarEvento(
  db: Db,
  id: string,
  datos: { nombre: string; fecha: string; tipo: string; asignados: string[] }
) {
  const existente = await db.first('SELECT id FROM eventos WHERE id = ?', [id]);
  if (!existente) throw new ApiError('Evento no encontrado', 404);
  await db.run('UPDATE eventos SET nombre = ?, fecha = ?, tipo = ?, asignados = ? WHERE id = ?', [
    datos.nombre,
    datos.fecha,
    datos.tipo,
    JSON.stringify(datos.asignados || []),
    id,
  ]);
  return { id, ...datos, asignados: datos.asignados || [] };
}

export async function eliminarEvento(db: Db, id: string) {
  await db.run('DELETE FROM asistencias WHERE evento_id = ?', [id]);
  await db.run('DELETE FROM eventos WHERE id = ?', [id]);
}

// ============ ASISTENCIA ============

export async function guardarAsistencia(db: Db, eventoId: string, registro: Record<string, boolean>) {
  const evento = await db.first('SELECT id FROM eventos WHERE id = ?', [eventoId]);
  if (!evento) throw new ApiError('Evento no encontrado', 404);

  await db.run('DELETE FROM asistencias WHERE evento_id = ?', [eventoId]);
  for (const [nombre, presente] of Object.entries(registro)) {
    await db.run(
      'INSERT INTO asistencias (evento_id, voluntario_nombre, presente) VALUES (?, ?, ?)',
      [eventoId, nombre, presente ? 1 : 0]
    );
  }
}

// ============ SETUP (crear líder con PIN — uso puntual) ============

export async function crearLider(db: Db, nombre: string, pin: string) {
  if (!nombre?.trim() || !/^\d{4}$/.test(pin)) {
    throw new ApiError('Nombre inválido o PIN debe ser de 4 dígitos', 400);
  }
  const existente = await db.first('SELECT id FROM lideres WHERE nombre = ?', [nombre]);
  if (existente) throw new ApiError('Ese líder ya existe', 409);
  const id = nuevoId('lid');
  const pinHash = await hashPin(pin);
  await db.run('INSERT INTO lideres (id, nombre, pin_hash) VALUES (?, ?, ?)', [id, nombre, pinHash]);
  return { id, nombre };
}
