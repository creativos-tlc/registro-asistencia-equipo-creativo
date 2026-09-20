# Coordinación · Equipo Creativo TLC

Espacio de coordinación para líderes y voluntarios: calendario unificado (reuniones, servicios, grabaciones, tareas con fecha y contenido de redes), asistencia con racha, tareas asignadas, perfiles de voluntarios, programa del domingo y planificador de contenido.

- Producción: https://asistencia-creativo.pages.dev
- Stack: HTML/CSS/JS sin dependencias ni build · Cloudflare Pages Functions · Cloudflare D1
- Auditoría, arquitectura y fases: [docs/AUDITORIA.md](docs/AUDITORIA.md)
- Contexto de producto: [PRODUCT.md](PRODUCT.md)

## Estructura

```
public/        sitio estático (index.html, css/, js/, vendor/)
functions/     rutas de la API (Pages Functions)
server/        acceso (PIN + sesiones) y sincronización
migrations/    esquema de la base D1
scripts/       herramientas de operación
```

`registro_asistencia.html` (raíz) es la versión 1, conservada solo como referencia.

## Desarrollo local

```bash
npx wrangler d1 migrations apply asistencia-creativo --local
node scripts/crear-acceso.mjs "Daniel" --local        # imprime un PIN temporal
npx wrangler pages dev public --port 8795 --d1 DB=7c513556-e4d9-4c78-933d-971aac644b70
```

Abre http://localhost:8795. En Ajustes (solo en localhost) hay un botón para cargar datos de ejemplo.

## Publicar

```bash
npx wrangler d1 migrations apply asistencia-creativo --remote   # solo si hay migraciones nuevas
npx wrangler pages deploy public --project-name=asistencia-creativo --branch main
```

## Accesos

Cada persona entra con su nombre y un PIN de 4 a 8 dígitos. Un líder da acceso desde el perfil de la persona (Equipo → persona → "Dar acceso"), o por consola:

```bash
node scripts/crear-acceso.mjs "Nombre" --remote
```

Genera un PIN temporal que la persona debe cambiar al entrar. Tras 5 intentos fallidos el nombre se bloquea 15 minutos.

## Datos y respaldo

- Los datos viven en D1 y se guardan también en cada teléfono (funciona sin señal y se sincroniza al volver).
- Ajustes → "Descargar respaldo completo" genera un `.json` que se puede restaurar.
- Al primer ingreso, la app ofrece traer lo que la versión anterior guardó en ese teléfono, sin duplicar lo que ya esté subido.
