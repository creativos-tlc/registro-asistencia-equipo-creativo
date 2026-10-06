# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Fase actual: solo **líderes** del Equipo Creativo de The Life Church Santiago (TLC) — Daniel y David — que coordinan desde el celular, durante la semana y también en pleno servicio dominical. Fase futura (confirmada como dirección, sin fecha): **voluntarios** con su propio acceso, y otros equipos de servicio (según la exploración previa: Kids Life, Alabanza/Worship, Lobby, Generosidad+Bienvenida).

Trabajo a resolver: saber de un vistazo qué viene (reuniones, servicio del domingo, grabaciones, contenido), quién está asignado a qué, quién falta o cumple, y que ambos líderes vean lo mismo sin pasarse archivos.

## Product Purpose

Espacio de coordinación y gestión de voluntarios y tareas del equipo. Reemplaza el registro de asistencia de un solo archivo por una herramienta que crece: calendario interno unificado (reuniones, servicios, grabaciones, tareas con fecha, publicaciones de Instagram/WhatsApp), asistencia, tareas asignadas a voluntarios, perfil completo por voluntario y programa del servicio de cada domingo. Éxito = menos enredo y pérdida de tiempo; cada líder sabe qué hacer hoy sin preguntar.

## Positioning

No es un CRM ni un gestor de proyectos genérico: es la mesa de coordinación de un equipo de servicio de iglesia, con el domingo como eje de la semana (programa del servicio, asistencia, asignaciones) y con el ritmo de contenido de redes del equipo creativo integrado.

## Operating Context

- Se usa sobre todo desde el teléfono, a veces de pie y con prisa (domingo).
- Hoy los datos viven en el navegador de cada persona (localStorage) en `asistencia-creativo.pages.dev`; Daniel y David no ven lo mismo.
- Existe un calendario 2026 externo (GitHub Pages: `creativos-tlc.github.io/Equipo-Creativo/calendario-2026`, devocionales e informaciones) que a futuro debería vivir dentro de la app.
- Idioma de interfaz: español (Chile). Semana con el domingo como día central del ministerio.
- Despliegue: Cloudflare Pages (repositorio GitHub `creativos-tlc/registro-asistencia-equipo-creativo`, rama `main`), base de datos Cloudflare D1 ya creada (`asistencia-creativo`).

## Capabilities and Constraints

Confirmado por Daniel (20-sep-2026):
- **Datos compartidos primero**: backend real (Cloudflare Pages Functions + D1) con login liviano nombre + PIN, no email/password.
- Módulos de esta entrega: calendario interno unificado, tareas con asignación, perfil de voluntarios, programa del domingo, más lo ya existente (eventos, asistencia, reportes, planificador de contenido).
- Perfil de voluntario: alta y baja de voluntarios, nombre, edad / año de nacimiento, correo, dirección y otros "datos importantes".
- Reemplazo directo de la versión en producción, migrando los datos ya cargados en los navegadores (con respaldo previo).
- Stack existente: HTML/CSS/JS vanilla sin dependencias ni build (preferencia del dueño); se extiende, no se reemplaza por un framework.

Sin decidir: largo del PIN (4 vs 6 dígitos), roles finos más allá de líder/voluntario, cómo entrarán los voluntarios en la fase futura, cómo se importará el calendario 2026 externo.

Dato sensible: correos, direcciones y años de nacimiento de personas (posiblemente menores) — exigen acceso autenticado en el servidor, mínimo necesario y ninguna exposición pública.

## Brand Commitments

Identidad existente que se conserva: interfaz oscura con acento dorado/ámbar (`#f5a623`), tipografía Outfit, tono cercano en español. Nombre visible "Equipo Creativo · TLC".

## Evidence on Hand

- Plantel inicial real de 9 personas (Sorimar, Karol, David, Sofia, Kathy, Jazmin, Ronald, Daniel, Renata) como datos por defecto en la versión actual. No hay más datos personales cargados en el repositorio: edades, correos y direcciones deben ingresarse por el equipo, nunca inventarse.
- Backup local previo: `registro_asistencia.backup-20260831-003448.html`.

## Product Principles

1. El domingo manda: lo que vence hoy y el próximo servicio son lo primero que se ve.
2. Una sola verdad compartida: un dato se registra una vez y aparece donde corresponde (evento, tarea, perfil).
3. Menos pasos que una planilla: cualquier acción frecuente (marcar asistencia, asignar, mover una fecha) en pocos toques y sin perder datos.
4. Crece sin rehacerse: equipos, roles y módulos nuevos son configuración, no reescritura.
5. Datos de personas con respeto: acceso con login, solo lo necesario, sin borrar historial por accidente.

## Accessibility & Inclusion

Uso de una mano en teléfono, luz variable (interior con poca luz, sala de servicio): contraste mínimo AA, áreas táctiles ≥44px, texto base ≥16px, sin depender solo del color.
