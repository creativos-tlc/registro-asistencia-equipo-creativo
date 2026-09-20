import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Db } from './src/db';
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
  crearLider,
} from './src/handlers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8793;

const sqlite = new Database(path.join(__dirname, 'dev.db'));
sqlite.pragma('foreign_keys = ON');
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
schema.split(';').forEach((sql) => {
  if (sql.trim()) sqlite.exec(sql);
});

function sqliteDb(database: Database.Database): Db {
  return {
    async first<T>(sql: string, params: any[] = []) {
      return (database.prepare(sql).get(...params) ?? null) as T | null;
    },
    async all<T>(sql: string, params: any[] = []) {
      return database.prepare(sql).all(...params) as T[];
    },
    async run(sql: string, params: any[] = []) {
      database.prepare(sql).run(...params);
    },
  };
}

const db = sqliteDb(sqlite);

// Semilla de líderes solo para desarrollo local (PIN fijo y conocido)
async function seedLideres() {
  const existentes = await db.all('SELECT nombre FROM lideres');
  if (existentes.length > 0) return;
  await crearLider(db, 'Daniel', '1234');
  await crearLider(db, 'David', '1234');
  console.log('✓ Líderes de desarrollo creados: Daniel / David — PIN: 1234 (solo local, cambiar en producción)');
}
await seedLideres();

// Semilla de voluntarios (mismo seed.sql que se usa en producción)
async function seedVoluntarios() {
  const existentes = await db.all('SELECT nombre FROM voluntarios');
  if (existentes.length > 0) return;
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
  seed.split(';').forEach((sql) => {
    if (sql.trim()) sqlite.exec(sql);
  });
  console.log('✓ Voluntarios iniciales cargados desde seed.sql');
}
await seedVoluntarios();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function tokenDe(req: express.Request): string | null {
  return req.headers.authorization?.replace(/^Bearer\s+/i, '') || null;
}

function param(req: express.Request, nombre: string): string {
  const valor = req.params[nombre];
  return Array.isArray(valor) ? valor[0] : valor;
}

function ruta(fn: (req: express.Request, res: express.Response) => Promise<unknown>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const resultado = await fn(req, res);
      if (!res.headersSent) res.json(resultado);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ error: error.message });
      } else {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
      }
    }
  };
}

app.post(
  '/api/login',
  ruta(async (req) => login(db, req.body.nombre, req.body.pin))
);

app.post(
  '/api/logout',
  ruta(async (req) => {
    await logout(db, tokenDe(req));
    return { ok: true };
  })
);

app.get(
  '/api/data',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    return getEstado(db);
  })
);

app.post(
  '/api/voluntarios',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    return crearVoluntario(db, req.body.nombre, req.body.fechaUnion);
  })
);

app.put(
  '/api/voluntarios/:nombre',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    return actualizarVoluntario(db, decodeURIComponent(param(req, 'nombre')), req.body.nombre, req.body.fechaUnion);
  })
);

app.delete(
  '/api/voluntarios/:nombre',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    await eliminarVoluntario(db, decodeURIComponent(param(req, 'nombre')));
    return { ok: true };
  })
);

app.post(
  '/api/eventos',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    return crearEvento(db, req.body);
  })
);

app.put(
  '/api/eventos/:id',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    return actualizarEvento(db, param(req, 'id'), req.body);
  })
);

app.delete(
  '/api/eventos/:id',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    await eliminarEvento(db, param(req, 'id'));
    return { ok: true };
  })
);

app.put(
  '/api/asistencias/:eventoId',
  ruta(async (req) => {
    await requireAuth(db, tokenDe(req));
    await guardarAsistencia(db, param(req, 'eventoId'), req.body.registro || {});
    return { ok: true };
  })
);

app.listen(PORT, () => {
  console.log(`✓ Servidor local en http://localhost:${PORT}`);
});
