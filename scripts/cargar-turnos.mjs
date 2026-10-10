#!/usr/bin/env node
// Carga el catálogo de roles de turnos y el historial de septiembre 2026 (de la planilla del equipo).
// Uso:  node scripts/cargar-turnos.mjs [--local | --remote] [--tolerante]
// --tolerante: si hay dos personas con el mismo nombre de pila usa la primera, y omite a quien no exista (solo para pruebas locales).
// Es seguro repetirlo: usa ids fijos y actualiza lo que ya existe.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const remoto = process.argv.includes('--remote');
const destino = remoto ? '--remote' : '--local';
const tolerante = process.argv.includes('--tolerante');
const DB = 'asistencia-creativo';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const wrangler = (args) => spawnSync('npx', ['wrangler', 'd1', 'execute', DB, destino, ...args], { encoding: 'utf8' });

// ---- personas existentes (por nombre de pila)
const q = wrangler(['--json', '--command', "select id, json_extract(data,'$.nombre') nombre from registros where coleccion='personas' and borrado=0"]);
const personas = JSON.parse(q.stdout.slice(q.stdout.indexOf('[')))[0].results;
const porNombre = new Map();
personas.forEach((p) => { const k = norm(p.nombre); porNombre.set(k, [...(porNombre.get(k) || []), p.id]); });
const persona = (nombre) => {
  const ids = porNombre.get(norm(nombre)) || [];
  if (tolerante && ids.length === 0) { console.warn(`(aviso) No existe "${nombre}" en esta base; se omite.`); return null; }
  if (ids.length === 0 || (ids.length > 1 && !tolerante)) throw new Error(`No pude identificar a "${nombre}" (${ids.length} coincidencias). Corrige el nombre en Equipo y repite.`);
  return ids[0];
};

// ---- catálogo de roles
const ROLES = [
  ['rol_slides', 'Slides Mensaje', 'dia', 10],
  ['rol_r1_foto_1', 'Fotografía', 'r1', 10],
  ['rol_r1_foto_2', 'Fotografía', 'r1', 20],
  ['rol_r1_ingesta', 'Ingesta de fotografía', 'r1', 30],
  ['rol_r1_album', 'Diseño de álbum', 'r1', 40],
  ['rol_r1_stories', 'Stories', 'r1', 50],
  ['rol_r2_foto_lobby', 'Fotografía: Lobby + Mensaje', 'r2', 10],
  ['rol_r2_foto_aud', 'Fotografía: Auditorio', 'r2', 20],
  ['rol_r2_video', 'Video e ingesta', 'r2', 30],
  ['rol_r2_stories', 'Stories', 'r2', 40],
  ['rol_r2_album', 'Diseño de álbum', 'r2', 50],
  ['rol_r2_edicion', 'Ingesta de fotografía y edición', 'r2', 60],
  ['rol_prueba', 'En prueba', 'prueba', 10],
];

// ---- septiembre 2026: [rol, [13 sep], [20 sep], [27 sep]]
const FECHAS = ['2026-09-13', '2026-09-20', '2026-09-27'];
const TURNOS = [
  ['rol_r1_foto_1', ['Ronald'], ['David'], ['Kathy']],
  ['rol_r1_foto_2', ['Sofia'], ['Ronald'], ['Renata']],
  ['rol_r1_ingesta', ['David'], [], []],
  ['rol_r1_album', ['David', 'Sofia'], [], []],
  ['rol_r1_stories', ['Renata'], ['Sofia'], ['Karol']],
  ['rol_r2_foto_lobby', [], ['David'], ['Sofia']],
  ['rol_r2_foto_aud', [], [], ['Ronald']],
  ['rol_r2_video', [], [], ['Mauricio']],
  ['rol_r2_stories', [], ['Sofia'], ['Sorimar']],
  ['rol_r2_album', [], ['Sorimar', 'David'], ['David']],
  ['rol_r2_edicion', [], ['Sorimar'], ['Jazmin']],
];
const AUSENCIAS = { '2026-09-20': ['Jazmin', 'Kathy', 'Daniel', 'Mauricio', 'Renata'], '2026-09-27': ['Daniel'] };

const ahora = Date.now();
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const upsert = (coleccion, id, data) => `INSERT INTO registros (coleccion, id, equipo_id, data, rev, borrado, actualizado_en, actualizado_por)
VALUES (${lit(coleccion)}, ${lit(id)}, 'creativo', ${lit(JSON.stringify(data))}, 1, 0, ${ahora}, 'carga')
ON CONFLICT(coleccion, id) DO UPDATE SET data = excluded.data, borrado = 0, rev = registros.rev + 1, actualizado_en = excluded.actualizado_en, actualizado_por = 'carga';`;

const sql = [];
ROLES.forEach(([id, nombre, grupo, orden]) => sql.push(upsert('roles', id, { equipoId: 'creativo', nombre, grupo, orden, activo: true })));
let nTurnos = 0;
TURNOS.forEach(([rolId, ...porFecha]) => porFecha.forEach((nombres, i) => {
  if (!nombres.length) return;
  sql.push(upsert('turnos', `${FECHAS[i]}~${rolId}`, { equipoId: 'creativo', fecha: FECHAS[i], rolId, personas: nombres.map(persona).filter(Boolean) }));
  nTurnos++;
}));
let nAus = 0;
Object.entries(AUSENCIAS).forEach(([fecha, nombres]) => nombres.forEach((n) => {
  const id = persona(n);
  if (!id) return;
  sql.push(upsert('ausencias', `${fecha}~${id}`, { equipoId: 'creativo', fecha, personaId: id, reuniones: ['r1', 'r2'], nota: '' }));
  nAus++;
}));
// la pestaña Turnos entra al menú del equipo
sql.push(`UPDATE registros SET data = json_set(data, '$.modulos', json('["hoy","calendario","tareas","turnos","equipo","contenido"]')), rev = rev + 1, actualizado_en = ${ahora}, actualizado_por = 'carga' WHERE coleccion = 'equipos' AND id = 'creativo';`);

const dir = mkdtempSync(join(tmpdir(), 'turnos-'));
const archivo = join(dir, 'turnos.sql');
writeFileSync(archivo, sql.join('\n'));
const r = wrangler(['--file', archivo]);
rmSync(dir, { recursive: true, force: true });
if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(r.status || 1); }
console.log(`Listo (${remoto ? 'PRODUCCIÓN' : 'local'}): ${ROLES.length} roles, ${nTurnos} turnos y ${nAus} ausencias de septiembre.`);
