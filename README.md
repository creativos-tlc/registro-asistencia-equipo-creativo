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

No hay publicación automática: subir código a GitHub no actualiza el sitio. Se publica con el comando de abajo (la Action antigua de GitHub se quitó porque apuntaba a otro proyecto de Cloudflare).

```bash
npx wrangler d1 migrations apply asistencia-creativo --remote   # solo si hay migraciones nuevas
npx wrangler pages deploy public --project-name=asistencia-creativo --branch main
```

## Accesos

Cada persona entra con su nombre y un PIN de 4 a 8 dígitos. Hay dos niveles:

- **Voluntario**: ve el calendario y las tareas, y puede crear y asignar tareas. No ve asistencia, equipo ni datos de contacto.
- **Líder**: ve y edita todo, incluidos los datos personales, y puede dar o quitar accesos.

Un líder crea accesos desde la app: Equipo → Agregar voluntario → "Darle acceso a la app ahora" (o, en alguien ya existente, su perfil → "Dar acceso"). La app muestra un PIN temporal una sola vez; la persona lo cambia al entrar. El nivel sale del "Rol en el equipo" y se puede cambiar editando el perfil (nadie puede cambiarse el suyo). Por consola sigue disponible: `node scripts/crear-acceso.mjs "Nombre" --rol voluntario --remote`.

A un voluntario se le puede sumar el permiso **Contenido** (ver el calendario de publicaciones y crear/editar las de Instagram y WhatsApp) desde su perfil en Equipo → "Acceso a la app" → Contenido.

**Turnos** (pestaña para todos, solo lectura para voluntarios): roles × domingos, con "Slides Mensaje" antes de la reunión, 1ra y 2da reunión, "En prueba" y "No estarán". El permiso **Armar turnos** (Equipo → persona → Acceso a la app) deja armar el domingo, anotar quién no estará, editar los roles y compartir la imagen para WhatsApp. Colecciones `roles`, `turnos` (id `fecha~rol`) y `ausencias` (id `fecha~persona`). Septiembre 2026 se cargó con `node scripts/cargar-turnos.mjs --remote` (repetible sin duplicar).

Tras 5 intentos fallidos el nombre se bloquea 15 minutos.

## Datos y respaldo

- Los datos viven en D1 y se guardan también en cada teléfono (funciona sin señal y se sincroniza al volver).
- Ajustes → "Descargar respaldo completo" genera un `.json` que se puede restaurar.
- Al primer ingreso, la app ofrece traer lo que la versión anterior guardó en ese teléfono, sin duplicar lo que ya esté subido.
