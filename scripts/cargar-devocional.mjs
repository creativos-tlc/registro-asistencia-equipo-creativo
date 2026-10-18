#!/usr/bin/env node
// Crea el devocional semanal del equipo (martes 5:00, videollamada) y la primera lectura.
// Uso:  node scripts/cargar-devocional.mjs [--local | --remote] [--hasta 2026-12-29]
// Es seguro repetirlo: usa ids fijos por fecha y actualiza sin duplicar.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const destino = args.includes('--remote') ? '--remote' : '--local';
const hasta = args.includes('--hasta') ? args[args.indexOf('--hasta') + 1] : '2026-12-29';
const PRIMERA = '2026-10-20';
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const ahora = Date.now();
const upsert = (coleccion, id, data) => `INSERT INTO registros (coleccion, id, equipo_id, data, rev, borrado, actualizado_en, actualizado_por)
VALUES (${lit(coleccion)}, ${lit(id)}, 'creativo', ${lit(JSON.stringify(data))}, 1, 0, ${ahora}, 'carga')
ON CONFLICT(coleccion, id) DO UPDATE SET data = CASE WHEN registros.borrado = 1 THEN excluded.data ELSE registros.data END, rev = registros.rev + 1, actualizado_en = excluded.actualizado_en, borrado = registros.borrado, actualizado_por = 'carga';`;

const sql = [];
const f = new Date(`${PRIMERA}T12:00:00`);
let n = 0;
while (f.toISOString().slice(0, 10) <= hasta) {
  const fecha = f.toISOString().slice(0, 10);
  sql.push(upsert('eventos', `ev_devo_${fecha.replace(/-/g, '')}`, {
    equipoId: 'creativo', tipo: 'reunion', titulo: 'Devocional del equipo', fecha, horaInicio: '05:00', horaFin: '06:00',
    lugar: 'Videollamada', notas: 'Estudiamos juntos los libros de la Biblia y compartimos un tiempo devocional como equipo.',
    participantes: [], tomaLista: false, devocional: true, programa: [], serieId: 'ser_devocional',
  }));
  n++;
  f.setDate(f.getDate() + 7);
}
sql.push(upsert('devocionales', PRIMERA, { equipoId: 'creativo', fecha: PRIMERA, lectura: 'Juan 1–3', versiculos: '', nota: '' }));

const dir = mkdtempSync(join(tmpdir(), 'devo-'));
const archivo = join(dir, 'devo.sql');
writeFileSync(archivo, sql.join('\n'));
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'asistencia-creativo', destino, '--file', archivo], { encoding: 'utf8' });
rmSync(dir, { recursive: true, force: true });
if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(r.status || 1); }
console.log(`Listo (${destino === '--remote' ? 'PRODUCCIÓN' : 'local'}): ${n} devocionales (martes ${PRIMERA} a ${hasta}).`);
