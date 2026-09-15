# Registro de Asistencia + Planificador de Contenido
Equipo Creativo TLC

## Resumen
App completa en **1 archivo HTML** con:
- ✅ Registro de asistencia
- ✅ Gestión de eventos
- ✅ Gestión de voluntarios
- ✅ Calendario interactivo (mes/semana/día)
- ✅ Planificador de contenido (Instagram + WhatsApp)
- ✅ Captura de imágenes del calendario
- ✅ Exportar/importar datos (CSV, JSON)

## Estado actual (15 sept 2026)
**En desarrollo local** - probando diseño y lógica antes de migrar a base de datos.

### Últimos cambios
- ✅ Calendario interactivo con vistas mes/semana/día
- ✅ Crear/editar/eliminar publicaciones de contenido
- ✅ Botón flotante para capturar imágenes (descarga PNG con fecha/hora)
- ✅ Fixes: edición de publicaciones no se elimina al guardar
- ✅ Enlace de calendario 2026 corregido
- ⏳ Pendiente: Botón Logout

## Tecnología
- **Archivo único:** `registro_asistencia.html`
- **Almacenamiento:** localStorage (local en cada dispositivo)
- **Framework:** Vanilla HTML/CSS/JS (sin dependencias)
- **Deploy:** Cloudflare Pages (auto-despliega desde GitHub en cada push)

## URLs
- **Repositorio:** https://github.com/creativos-tlc/registro-asistencia-equipo-creativo
- **En producción:** https://asistencia-creativo.pages.dev/
- **Rama principal:** `main` (auto-deploya)

## Cómo desplegar cambios
```bash
cd /Users/danielgamboaflores/Desktop/TLC\ SANTIAGO/Registro\ de\ asistencia\ Equipo\ Creativo

# 1. Editar archivo
# → editar registro_asistencia.html

# 2. Hacer commit
git add registro_asistencia.html
git commit -m "Descripción de cambios"

# 3. Push a GitHub
git push origin main

# 4. Cloudflare automáticamente despliega (1-2 min)
```

## Estructura de datos (localStorage)
```javascript
{
  "eventos": [{ id, titulo, fecha, hora, voluntarios, tema }],
  "asistencia": [{ voluntario, evento, presente }],
  "voluntarios": [{ id, nombre, fechaIncorporacion }],
  "publicaciones": [{ id, titulo, fecha, hora, tipo, plataforma, descripcion }]
}
```

## Características por sección

### 📊 Inicio (Dashboard)
- Stats: eventos, asistencias, voluntarios
- Próximos eventos
- Top asistencia

### 📅 Eventos
- Crear eventos
- Asignar voluntarios
- Ver lista de eventos

### ✅ Asistencia
- Marcar asistencia por evento
- Grid interactivo
- Reportes

### 📈 Reportes
- Estadísticas
- Filtros por voluntario/evento
- Gráficos de asistencia

### 📱 Contenido (Planificador)
- **Vistas:** Mes / Semana / Día
- **Plataformas:** Instagram (post/story/reel) + WhatsApp
- **Acciones:** Crear / Editar / Duplicar / Eliminar publicaciones
- **Captura:** Botón 📷 para descargar imágenes del calendario (PNG)
- **Navegación:** Flechas para cambiar mes/semana/día

### ⚙️ Más
- Gestión de voluntarios
- Exportar datos (CSV, JSON)
- Importar datos (CSV)
- Respaldo completo (JSON)

## Próximos pasos
1. **Terminar pruebas locales** - confirmar que diseño y lógica son finales
2. **Agregar logout** - botón para borrar localStorage si se necesita
3. **Migrar a Cloudflare D1** - cuando esté todo confirmado
   - Database ya creada: `asistencia-creativo` (ID: `7c513556-e4d9-4c78-933d-971aac644b70`)
   - Requiere: Worker API + cambios en app para fetch()
   - Beneficio: David y Daniel ven datos en tiempo real

## Notas técnicas
- localStorage funciona en Cloudflare Pages porque es HTTPS
- Cada dispositivo tiene su propio localStorage (no sincroniza entre usuarios)
- Exportar/importar JSON permite compartir datos manualmente por ahora
- Próximamente: D1 sincronizará datos entre usuarios

## Contactos
- Daniel: d.gamboaflores@gmail.com
- David: para revisar cambios
