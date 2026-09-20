# Asistencia Equipo Creativo

Versión con backend compartido del registro de asistencia — para que Daniel y David
puedan marcar y ver la misma asistencia desde sus propios teléfonos. Reemplaza a la
versión anterior (`../registro_asistencia.html`), que guardaba todo solo en el
navegador de quien la abría.

## Stack

- **Frontend:** el mismo HTML/CSS/JS vanilla (sin build), en `public/index.html`
- **Backend:** Cloudflare Workers (TypeScript) + itty-router
- **Base de datos:** Cloudflare D1 (SQLite)
- **Login:** nombre + PIN de 4 dígitos (solo Daniel y David)

La lógica de negocio (`src/handlers.ts`) es compartida entre el Worker de producción
y el servidor de desarrollo local — no hay dos implementaciones separadas que
mantener sincronizadas.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:8793`. La primera vez crea automáticamente dos líderes de
prueba: **Daniel** y **David**, ambos con PIN **1234** — y una base de datos local
(`dev.db`, con SQLite) que no se sube a ningún lado. Bórrala si quieres empezar de cero.

## Deploy a producción

### 1. Crear la base de datos D1 en Cloudflare

```bash
wrangler login
wrangler d1 create asistencia_creativo
```

Copia el `database_id` que te devuelve y pégalo en `wrangler.toml`
(reemplaza `"your-db-id-here"`).

### 2. Crear las tablas

```bash
wrangler d1 execute asistencia_creativo --remote --file schema.sql
```

### 3. Crear a Daniel y David con sus PIN reales

**No** uses el PIN de desarrollo (1234) en producción. Genera el comando con:

```bash
node scripts/crear-lider.mjs "Daniel" 1234    # reemplaza 1234 por el PIN real
node scripts/crear-lider.mjs "David" 1234     # y aquí también
```

Cada comando imprime un `wrangler d1 execute ... --remote` listo para copiar y pegar
— el PIN nunca se guarda en texto plano, solo su hash.

### 4. Deploy

```bash
npm run deploy
```

Wrangler imprime la URL final (algo como `asistencia-creativo.<tu-cuenta>.workers.dev`).
Esa es la que abren Daniel y David desde su teléfono — no hace falta dominio propio,
aunque se puede agregar uno después desde el dashboard de Cloudflare.

## Estructura

```
app/
├── public/index.html    → frontend completo (login + app)
├── src/
│   ├── worker.ts         → entrada del Worker, rutas HTTP
│   ├── handlers.ts        → lógica de negocio (compartida con dev-server)
│   └── db.ts              → adaptador D1
├── dev-server.ts          → servidor local (Express + better-sqlite3)
├── schema.sql              → esquema de la base de datos
└── scripts/crear-lider.mjs → genera el comando para crear/cambiar un líder
```

## Notas

- Las sesiones duran 30 días — no hay que estar iniciando sesión todo el rato.
- "Cerrar sesión" revoca el token en el servidor, no solo lo borra del teléfono.
- El botón "Descargar JSON (Backup)" en la pestaña Datos sigue funcionando igual
  que antes, como respaldo adicional fuera de la base de datos.
