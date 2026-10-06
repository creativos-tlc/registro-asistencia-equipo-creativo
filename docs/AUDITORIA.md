# Auditoría y arquitectura — Coordinación Equipo Creativo TLC

Fecha: 20 de septiembre de 2026 · Alcance: la app publicada en `asistencia-creativo.pages.dev` (versión 1, un solo HTML con localStorage) y su repositorio.

## Resumen

La versión 1 cumplía para "marcar asistencia", pero no puede crecer hacia lo que se busca (rachas, reuniones, base de datos de voluntarios, programa del domingo, tareas, más equipos): guarda los datos por teléfono, mezcla todo en un archivo de 2.500 líneas y cada arreglo de diseño chocaba con otro. Además tenía un error que borra todo (ver P0). Se reconstruyó como versión 2 sobre una base que sí escala.

**Puntuación técnica de la versión 1: 8/20 (deficiente, requiere rehacer).**

| Dimensión | Puntaje | Hallazgo clave |
|---|---|---|
| Accesibilidad | 1 | Contraste 3,55:1 en textos secundarios; áreas táctiles de 33–40 px; selects hechos con `div`; modal sin foco ni Esc |
| Rendimiento | 2 | Todo se vuelve a dibujar en cada cambio; html2canvas desde un CDN sin verificación; un solo archivo de 122 KB |
| Responsive | 2 | Semana con 7 columnas de 90 px que obliga a desplazarse; textos de 11 px |
| Theming | 2 | Hay tokens, pero 322 estilos en línea y colores fijos en JS |
| Integridad de implementación | 1 | `button {}` global que pisa todos los botones, parches con `z-index: -1`, ids por posición en el arreglo, copia manual `registro_asistencia.html` → `public/index.html` |

## Hallazgos por severidad

**P0 — bloquean o destruyen datos**
1. **"Cerrar sesión" borra todos los datos.** `registro_asistencia.html:2023` ejecuta `localStorage.clear()`; no existe login, así que el ícono del encabezado eliminaba eventos, voluntarios, asistencia y publicaciones tras un solo `confirm()`.
2. **Datos no compartidos.** Cada teléfono guarda lo suyo: Daniel y David no ven lo mismo, y limpiar el navegador borra todo. No hay respaldo automático.

**P1 — mayores**
3. **Despliegue confuso.** `public/index.html` era una copia manual del HTML raíz (por eso "los cambios no se veían"). El sitio que se usa (`asistencia-creativo`) no está conectado a Git; la GitHub Action publica en otro proyecto (`registro-asistencia`).
4. **Contraste bajo** (WCAG 1.4.3): texto secundario a 3,55:1 en marca, etiquetas del menú y títulos de sección.
5. **Áreas táctiles < 44 px** en encabezado y navegación (40×40, 33×44).
6. **Fechas en UTC.** `hoyISO()` usaba `toISOString()`: en Chile, pasadas las ~20:00 "hoy" pasaba a ser mañana (afecta próximos eventos, fecha por defecto y porcentajes).
7. **Semana/Día ocultaban publicaciones sin hora** (introducido en la primera versión de la grilla).
8. **CSS global `button { … }`** convertía cualquier botón en una píldora; el selector de plataforma bloqueaba toques (`z-index` 20 → 5 → −1 como parche).
9. **Editar y eliminar por posición en el arreglo** (la causa del error "guardo y se borra otro").
10. **Voluntarios identificados por nombre:** renombrar obliga a reescribir eventos y asistencias; dos personas con el mismo nombre chocan.
11. **Porcentaje engañoso:** un evento sin lista tomada contaba a todos como ausentes; no existía "justificó".

**P2 — menores**
12. 322 estilos en línea, 67 ids, un solo `<script>` sin módulos. 13. Texto de 11 px (6 casos) y emoji 📷 como ícono. 14. Sin CSP ni cabeceras de seguridad. 15. Confirmaciones con `confirm()` nativo, sin deshacer. 16. Modal de publicaciones con estilos en línea. 17. Sin manejo de estados vacíos consistente.

**P3 — orden del proyecto**
18. Tres bases de código sueltas: la app publicada, `app/` (Workers + D1 + PIN, ago-2026) y `../App Voluntarios/` (sin commits); dos bases D1 casi vacías con nombres casi iguales (`asistencia-creativo`, `asistencia_creativo`) y dos proyectos Pages.

## Lo que sí funcionaba (y se conservó)

Identidad oscura con acento ámbar y Outfit; tono cercano en español; pestañas inferiores en móvil; toasts; estados vacíos; la idea de tocar al voluntario para marcarlo; exportar a CSV.

## Qué cambió en la versión 2

**Estructura (sin dependencias ni build, HTML/CSS/JS estático como prefieres):**
```
public/                 sitio estático (fuente única, ya no se copia nada a mano)
  index.html · _headers (CSP, caché, seguridad)
  css/  tokens · base · components · views
  js/   main · router · store (sincronización) · datos (reglas) · model (vocabulario) · ui · gate (acceso) · legacy
        views/  hoy · calendario · tareas · equipo · contenido · ajustes
        hojas/  evento · asistencia · tarea · publicacion · persona
functions/api/          API en Cloudflare Pages Functions
server/                 auth (PIN + sesiones) · api (sincronización)
migrations/             esquema D1
scripts/crear-acceso.mjs
```

**Navegación:** Hoy · Calendario · Tareas · Equipo · Contenido (+ Ajustes). "Reportes" pasó a ser una pestaña dentro de Equipo; "Eventos" y "Asistencia" viven dentro del calendario y del evento (tocas el evento → "Tomar asistencia").

**Diseño:** un solo botón, un solo campo, un solo formulario (hoja modal nativa `<dialog>`); selects nativos (fin del problema de capas); íconos propios en un mismo trazo; texto base 16 px y mínimo 12 px; contraste real ≥ 5,3:1 en el texto más tenue; áreas táctiles de 44 px en pantallas táctiles; escritorio con barra lateral.

**Medición posterior** (misma prueba sobre las 6 vistas, 375 px): 0 textos bajo 12 px, 0 fallas de contraste reales, áreas táctiles ≥ 44 px en dispositivos táctiles.

### Arreglos de lógica
- Fechas siempre locales (Chile), semana de lunes a domingo.
- Ids únicos por registro; nada se identifica por posición ni por nombre.
- Asistencia con tres estados (presente / ausente / justificó); el porcentaje solo cuenta eventos con lista tomada y "justificó" no baja el porcentaje ni corta la racha.
- Todo borrado se puede deshacer; eliminar a un voluntario ofrece **archivar** (conserva historial) o eliminar.
- Publicaciones y tareas sin hora aparecen en la fila "Todo el día".
- Arrastrar para mover (escritorio; con Alt/Opción duplica) y duplicar desde la hoja (celular).

## Arquitectura pensada para crecer

**Datos.** Una sola tabla `registros` (colección, id, JSON, versión) en D1. Agregar un campo (p. ej. "dirección") o una colección nueva (rachas, reuniones internas, programas) **no requiere migración SQL**. Las colecciones actuales: `equipos, personas, eventos, asistencia, tareas, publicaciones, ajustes`.

**Sincronización local-first.** Cada cambio se guarda al instante en el teléfono y se envía al servidor; sin señal (típico en el servicio) queda en cola y sale solo al volver la conexión. Cada 20 s y al abrir la app se consulta lo que hizo el otro líder. Conflictos: gana el último cambio *por registro* (una asistencia, una tarea), por lo que dos líderes marcando personas distintas no se pisan.

**Acceso.** Nombre + PIN de 4–8 dígitos, PBKDF2 con sal por persona, sesión de 30 días en cookie `HttpOnly`, bloqueo tras 5 intentos fallidos, revisión de origen y CSP. Los PIN los entrega un líder (PIN temporal que se cambia al primer ingreso). Los permisos viven en un solo lugar (`server/api.js → puede()`).

**Crecimiento.**
- *Otros equipos:* `equipos[].modulos` decide qué pestañas ve cada equipo (Contenido es solo del Creativo); las personas tienen `equipos: []` (muchos a muchos) y cada registro lleva `equipoId`.
- *Voluntarios con acceso:* el rol `voluntario` ya existe en credenciales; falta solo afinar `puede()` (p. ej. ver el calendario y marcar sus tareas).
- *Calendario 2026 externo:* se integra como una colección más (`devocionales`) sin tocar el resto.

## Fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Base compartida, acceso por PIN, calendario unificado, tareas, perfiles, programa del domingo, asistencia con racha, contenido | **Esta entrega** |
| 2 | Voluntarios con acceso propio (ver su calendario y tareas), notificaciones dentro de la app, importar el calendario 2026 | Siguiente |
| 3 | Otros equipos (Kids, Alabanza, Lobby…) con sus módulos y permisos por equipo | Cuando se decida |

## Decisiones abiertas y riesgos

- **Datos personales** (correo, dirección, año de nacimiento, posibles menores): solo se ven con sesión iniciada. Revisar con la iglesia qué datos es necesario guardar de menores.
- **PIN:** 6 dígitos con bloqueo es razonable para este uso; si algún día se abre a más gente, migrar a enlace mágico por correo.
- **Duplicados de nombre:** resuelto el 5-oct-2026: la ficha antigua "Danny" se unió a Daniel.
- **Limpieza pendiente:** archivar `app/` y `../App Voluntarios/`, borrar la base D1 `asistencia_creativo` (guion bajo) y el proyecto Pages `registro-asistencia` cuando se confirme que no se usan; alinear la GitHub Action con el proyecto `asistencia-creativo`.

## Operación

```bash
# Crear o reiniciar el acceso de alguien (imprime un PIN temporal)
node scripts/crear-acceso.mjs "Nombre" --remote

# Probar en local
npx wrangler pages dev public --port 8795 --d1 DB=<id-de-la-base>

# Publicar
npx wrangler pages deploy public --project-name=asistencia-creativo --branch main
```
