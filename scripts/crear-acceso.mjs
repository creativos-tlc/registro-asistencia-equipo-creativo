#!/usr/bin/env node
// Crea (o reinicia) el acceso de una persona a la app y crea su ficha si no existe.
// Uso:  node scripts/crear-acceso.mjs "Daniel" [--rol lider] [--local | --remote] [--pin 123456]
// Sin --pin genera un PIN temporal de 6 dígitos: la persona debe cambiarlo al primer ingreso.
import { pbkdf2Sync, randomBytes, randomInt } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const nombre = args[0] && !args[0].startsWith('--') ? args[0] : null;
const opcion = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const rol = opcion('--rol') || 'lider';
const remoto = args.includes('--remote');
const pin = opcion('--pin') || String(randomInt(0, 1000000)).padStart(6, '0');

if (!nombre) { console.error('Falta el nombre. Ej: node scripts/crear-acceso.mjs "Daniel" --remote'); process.exit(1); }
if (!['lider', 'voluntario'].includes(rol)) { console.error('Rol inválido'); process.exit(1); }

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const personaId = 'per_' + norm(nombre).replace(/[^a-z0-9]+/g, '_');
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(pin, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const ahora = Date.now();
const ficha = JSON.stringify({ nombre, rol, equipos: ['creativo'], activo: true, desde: new Date().toISOString().slice(0, 10), areas: [], equipoId: 'creativo' });

const sql = `
INSERT INTO credenciales (persona_id, nombre, nombre_norm, rol, pin_hash, pin_salt, debe_cambiar, activo, creado_en)
VALUES (${q(personaId)}, ${q(nombre)}, ${q(norm(nombre))}, ${q(rol)}, ${q(hash)}, ${q(salt)}, 1, 1, ${ahora})
ON CONFLICT(persona_id) DO UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, rol = excluded.rol, debe_cambiar = 1, activo = 1;
INSERT OR IGNORE INTO registros (coleccion, id, equipo_id, data, rev, borrado, actualizado_en, actualizado_por)
VALUES ('personas', ${q(personaId)}, 'creativo', ${q(ficha)}, 1, 0, ${ahora}, 'script');
DELETE FROM sesiones WHERE persona_id = ${q(personaId)};
`;

const dir = mkdtempSync(join(tmpdir(), 'acceso-'));
const archivo = join(dir, 'acceso.sql');
writeFileSync(archivo, sql);
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'asistencia-creativo', remoto ? '--remote' : '--local', '--file', archivo], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
rmSync(dir, { recursive: true, force: true });
if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(r.status || 1); }
console.log(`\nAcceso listo para ${nombre} (${rol}) en ${remoto ? 'PRODUCCIÓN' : 'local'}.\nPIN temporal: ${pin}\nLa persona deberá cambiarlo al ingresar por primera vez.\n`);
