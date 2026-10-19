/* Vocabulario de la app: tipos, estados, colores. Cambiar aquí cambia toda la interfaz. */

export const EQUIPO_CREATIVO = 'creativo';

/** Tipos de evento. `asistencia` = por defecto se toma lista. `programa` = admite programa/agenda. */
export const TIPOS = {
  servicio:  { label: 'Servicio', plural: 'Servicios', color: 'var(--accent)', icono: 'sun',      asistencia: true,  programa: true,  hora: ['09:30', '12:00'] },
  reunion:   { label: 'Reunión',  plural: 'Reuniones', color: 'var(--info)',   icono: 'users',    asistencia: true,  programa: true,  hora: ['20:00', '21:30'] },
  ensayo:    { label: 'Ensayo',   plural: 'Ensayos',   color: 'var(--teal)',   icono: 'music',    asistencia: true,  programa: false, hora: ['19:00', '21:00'] },
  grabacion: { label: 'Grabación', plural: 'Grabaciones', color: 'var(--violet)', icono: 'video', asistencia: true,  programa: false, hora: ['10:00', '13:00'] },
  otro:      { label: 'Otro',     plural: 'Otros',     color: 'var(--tx-2)',   icono: 'calendar', asistencia: false, programa: false, hora: ['', ''] },
};
export const ICONOS_CATEGORIA = ['calendar', 'users', 'music', 'video', 'sun', 'image', 'flame', 'clipboard', 'message', 'cake', 'pin', 'tasks'];

// Categorías de evento: las 5 de fábrica se pueden renombrar, recolorear u ocultar, y el equipo puede sumar las suyas.
// Los cambios viven en la colección `categorias` (id = clave de fábrica o `cat_…`) y se cargan aquí con registrarCategorias().
let personalizadas = {};
export const registrarCategorias = (lista) => { personalizadas = Object.fromEntries((lista || []).map((c) => [c.id, c])); };
const desdeRegistro = (c) => ({
  label: c.nombre, plural: c.nombre, color: NOTA_COLORES[c.color]?.color || 'var(--tx-2)', icono: c.icono || 'calendar',
  asistencia: !!c.asistencia, programa: !!c.programa, hora: [c.horaIni || '', c.horaFin || ''],
});
export const tipoDe = (t) => { const a = personalizadas[t]; const base = TIPOS[t]; return a ? { ...(base || TIPOS.otro), ...desdeRegistro(a) } : base || TIPOS.otro; };
export const categoriaRegistro = (t) => personalizadas[t] || null;
export const esDeFabrica = (t) => t in TIPOS;
/** Todas las categorías, en orden: las de fábrica y luego las propias. Las ocultas solo salen si `conOcultas`. */
export function categoriasDisponibles({ conOcultas = false, incluir = '' } = {}) {
  const ids = [...Object.keys(TIPOS).filter((k) => k !== 'otro'), ...Object.keys(personalizadas).filter((k) => !(k in TIPOS)), 'otro'];
  return ids.filter((k) => conOcultas || k === incluir || !personalizadas[k]?.oculta).map((k) => [k, tipoDe(k)]);
}

export const ESTADOS_TAREA = {
  pendiente: { label: 'Por hacer', icono: 'circle' },
  en_curso:  { label: 'En curso',  icono: 'clock' },
  hecha:     { label: 'Hecha',     icono: 'circle-check' },
};
export const PRIORIDADES = { normal: 'Normal', alta: 'Alta' };

export const CANALES = {
  instagram: { label: 'Instagram', color: 'var(--pink)', icono: 'instagram', formatos: { post: 'Feed', historia: 'Historia', reel: 'Reel' } },
  whatsapp:  { label: 'WhatsApp',  color: 'var(--ok)',   icono: 'message',   formatos: { estado: 'Estado', mensaje: 'Mensaje', encuesta: 'Encuesta', video: 'Video', foto: 'Foto' } },
};
/** Cómo se distingue cada tipo de contenido de un vistazo: color + letra. */
export const FORMATOS = {
  post:     { letra: 'F', label: 'Feed',     plural: 'Feed',      color: 'var(--info)' },
  reel:     { letra: 'R', label: 'Reel',     plural: 'Reels',     color: 'var(--pink)' },
  historia: { letra: 'H', label: 'Historia', plural: 'Historias', color: 'var(--orange)' },
  whatsapp: { letra: 'W', label: 'WhatsApp', plural: 'WhatsApp',  color: 'var(--ok)' },
};
export const claveFormato = (p) => (p.canal === 'whatsapp' ? 'whatsapp' : FORMATOS[p.formato] ? p.formato : 'post');

/** Tipos de línea de la hoja de notas y colores para agrupar. */
export const NOTA_TIPOS = {
  h1:     { label: 'Título' },
  h2:     { label: 'Subtítulo' },
  p:      { label: 'Texto' },
  check:  { label: 'Casilla' },
  bullet: { label: 'Lista' },
};
export const NOTA_COLORES = {
  ambar:    { label: 'Ámbar',    color: 'var(--accent)' },
  azul:     { label: 'Azul',     color: 'var(--info)' },
  verde:    { label: 'Verde',    color: 'var(--ok)' },
  rosa:     { label: 'Rosa',     color: 'var(--pink)' },
  violeta:  { label: 'Violeta',  color: 'var(--violet)' },
  turquesa: { label: 'Turquesa', color: 'var(--teal)' },
  naranja:  { label: 'Naranja',  color: 'var(--orange)' },
  gris:     { label: 'Gris',     color: 'var(--tx-3)' },
};
export const HOJA_NOTAS = 'principal';

/** Turnos del domingo: dos reuniones, más lo que se hace antes de empezar. Cada grupo tiene su color, como en la planilla. */
export const GRUPOS_TURNO = {
  dia:    { label: 'Antes de la reunión', color: 'var(--bad)',    orden: 0 },
  r1:     { label: '1ra reunión',         color: 'var(--orange)', orden: 1 },
  r2:     { label: '2da reunión',         color: 'var(--info)',   orden: 2 },
  prueba: { label: 'En prueba',           color: 'var(--violet)', orden: 3 },
};
export const REUNIONES = { r1: '1ra', r2: '2da' };
export const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const PERMISOS_ETIQUETA = { contenido: 'Contenido', turnos: 'Turnos', devocional: 'Devocional' };

/** Camino de una publicación. `falta_info` es la pausa para pedir lo que falta (copy, material, definiciones) sin perderla de vista. */
export const ESTADOS_CONTENIDO = {
  idea:       { label: 'Idea',                 tag: '',          color: 'var(--tx-3)',   ayuda: 'Una idea suelta, todavía sin trabajar.' },
  en_curso:   { label: 'En curso',             tag: 'tag--info', color: 'var(--info)',   ayuda: 'Alguien ya está trabajando en ella.' },
  falta_info: { label: 'Falta información',    tag: 'tag--bad',  color: 'var(--orange)', ayuda: 'Quien la hace necesita más datos, material o una definición. Cuéntalo en el texto y avisa a un líder.' },
  listo:      { label: 'Lista para publicar',  tag: 'tag--ok',   color: 'var(--teal)',   ayuda: 'Terminada. Solo falta publicarla.' },
  publicado:  { label: 'Publicada',            tag: 'tag--ok',   color: 'var(--ok)',     ayuda: 'Ya salió.' },
};

export const ASISTENCIA = {
  p: { label: 'Presente',   corto: 'Sí',  tag: 'tag--ok',   icono: 'check' },
  a: { label: 'Ausente',    corto: 'No',  tag: 'tag--bad',  icono: 'x' },
  j: { label: 'Justificó',  corto: 'Just.', tag: 'tag--info', icono: 'info' },
};

export const AREAS_SUGERIDAS = ['Cámara', 'Edición', 'Fotografía', 'Diseño', 'Streaming', 'Luces', 'Sonido', 'Redes sociales', 'Proyección', 'Guion'];

export const MODULOS = {
  hoy:        { label: 'Hoy',        icono: 'home',     ruta: 'hoy' },
  calendario: { label: 'Calendario', icono: 'calendar', ruta: 'calendario' },
  tareas:     { label: 'Tareas',     icono: 'tasks',    ruta: 'tareas' },
  equipo:     { label: 'Equipo',     icono: 'users',    ruta: 'equipo' },
  turnos:     { label: 'Turnos',     icono: 'clipboard', ruta: 'turnos' },
  contenido:  { label: 'Contenido',  icono: 'image',    ruta: 'contenido' },
};

/** Pestañas que ve un voluntario con acceso. */
export const MODULOS_VOLUNTARIO = ['hoy', 'calendario', 'tareas', 'turnos'];

export const EQUIPO_INICIAL = {
  nombre: 'Equipo Creativo',
  iglesia: 'The Life Church',
  modulos: ['hoy', 'calendario', 'tareas', 'turnos', 'equipo', 'contenido'],
  color: '#f5a623',
};

/** Plantilla base del programa de un servicio (editable; no impone contenido). */
export const PLANTILLA_SERVICIO = ['Bienvenida', 'Alabanza', 'Anuncios', 'Mensaje', 'Cierre'];

export const PLANTEL_INICIAL = ['Sorimar', 'Karol', 'David', 'Sofia', 'Kathy', 'Jazmin', 'Ronald', 'Daniel', 'Renata'];

/** Días desde los que un evento sin asistencia tomada se considera "pendiente". */
export const DIAS_ASISTENCIA_PENDIENTE = 14;
export const DIAS_SIN_RESPALDO_AVISO = 14;
