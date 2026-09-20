import { Router, type IRequest } from 'itty-router';
import { d1Db } from './db';
import {
  ApiError,
  login,
  logout,
  requireAuth,
  getEstado,
  crearVoluntario,
  actualizarVoluntario,
  eliminarVoluntario,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  guardarAsistencia,
} from './handlers';

export interface Env {
  DB: D1Database;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function tokenDe(request: Request): string | null {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

const router = Router();

router.options('*', () => new Response(null, { headers: cors }));

router.post('/api/login', async (request: Request, env: Env) => {
  const db = d1Db(env.DB);
  const { nombre, pin } = (await request.json()) as { nombre: string; pin: string };
  const resultado = await login(db, nombre, pin);
  return json(resultado);
});

router.post('/api/logout', async (request: Request, env: Env) => {
  const db = d1Db(env.DB);
  await logout(db, tokenDe(request));
  return json({ ok: true });
});

router.get('/api/data', async (request: Request, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  return json(await getEstado(db));
});

router.post('/api/voluntarios', async (request: Request, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  const { nombre, fechaUnion } = (await request.json()) as { nombre: string; fechaUnion: string };
  return json(await crearVoluntario(db, nombre, fechaUnion), 201);
});

router.put('/api/voluntarios/:nombre', async (request: IRequest, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  const { nombre, fechaUnion } = (await request.json()) as { nombre: string; fechaUnion: string };
  return json(await actualizarVoluntario(db, decodeURIComponent(request.params.nombre), nombre, fechaUnion));
});

router.delete('/api/voluntarios/:nombre', async (request: IRequest, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  await eliminarVoluntario(db, decodeURIComponent(request.params.nombre));
  return json({ ok: true });
});

router.post('/api/eventos', async (request: Request, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  const datos = (await request.json()) as any;
  return json(await crearEvento(db, datos), 201);
});

router.put('/api/eventos/:id', async (request: IRequest, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  const datos = (await request.json()) as any;
  return json(await actualizarEvento(db, request.params.id, datos));
});

router.delete('/api/eventos/:id', async (request: IRequest, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  await eliminarEvento(db, request.params.id);
  return json({ ok: true });
});

router.put('/api/asistencias/:eventoId', async (request: IRequest, env: Env) => {
  const db = d1Db(env.DB);
  await requireAuth(db, tokenDe(request));
  const { registro } = (await request.json()) as { registro: Record<string, boolean> };
  await guardarAsistencia(db, request.params.eventoId, registro || {});
  return json({ ok: true });
});

router.all('/api/*', () => json({ error: 'No encontrado' }, 404));

// Todo lo que no sea /api/* se sirve como archivo estático (el frontend)
router.all('*', (request: Request, env: Env) => env.ASSETS.fetch(request));

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await router.fetch(request, env);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      console.error(error);
      return json({ error: 'Error interno' }, 500);
    }
  },
};
