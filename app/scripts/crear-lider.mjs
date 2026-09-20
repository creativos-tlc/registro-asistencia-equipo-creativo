// Genera el comando SQL para crear (o cambiar el PIN de) un líder en producción.
// Uso: node scripts/crear-lider.mjs "Daniel" 4821
//
// El script no toca la base de datos — solo imprime el comando `wrangler d1 execute`
// listo para copiar y pegar, con el PIN ya convertido a hash (nunca se guarda en texto plano).

const [, , nombre, pin] = process.argv;

if (!nombre || !/^\d{4}$/.test(pin || '')) {
  console.error('Uso: node scripts/crear-lider.mjs "<Nombre>" <PIN de 4 dígitos>');
  process.exit(1);
}

const data = new TextEncoder().encode(pin);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hash = [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
const id = `lid_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

console.log('\nEjecuta este comando (contra la base de datos remota en Cloudflare):\n');
console.log(
  `wrangler d1 execute asistencia_creativo --remote --command "INSERT INTO lideres (id, nombre, pin_hash) VALUES ('${id}', '${nombre}', '${hash}') ON CONFLICT(nombre) DO UPDATE SET pin_hash = excluded.pin_hash"`
);
console.log('\n(quita --remote para probarlo primero contra la base de datos local)\n');
