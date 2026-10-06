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
export const tipoDe = (t) => TIPOS[t] || TIPOS.otro;

export const ESTADOS_TAREA = {
  pendiente: { label: 'Por hacer', icono: 'circle' },
  en_curso:  { label: 'En curso',  icono: 'clock' },
  hecha:     { label: 'Hecha',     icono: 'circle-check' },
};
export const PRIORIDADES = { normal: 'Normal', alta: 'Alta' };

export const CANALES = {
  instagram: { label: 'Instagram', color: 'var(--pink)', icono: 'instagram', formatos: { post: 'Post de feed', historia: 'Historia', reel: 'Reel' } },
  whatsapp:  { label: 'WhatsApp',  color: 'var(--ok)',   icono: 'message',   formatos: { estado: 'Estado', mensaje: 'Mensaje', encuesta: 'Encuesta', video: 'Video', foto: 'Foto' } },
};
export const ESTADOS_CONTENIDO = {
  idea:      { label: 'Idea',      tag: '' },
  listo:     { label: 'Listo',     tag: 'tag--info' },
  publicado: { label: 'Publicado', tag: 'tag--ok' },
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
  contenido:  { label: 'Contenido',  icono: 'image',    ruta: 'contenido' },
};

/** Pestañas que ve un voluntario con acceso. */
export const MODULOS_VOLUNTARIO = ['calendario', 'tareas'];

export const EQUIPO_INICIAL = {
  nombre: 'Equipo Creativo',
  iglesia: 'The Life Church',
  modulos: ['hoy', 'calendario', 'tareas', 'equipo', 'contenido'],
  color: '#f5a623',
};

/** Plantilla base del programa de un servicio (editable; no impone contenido). */
export const PLANTILLA_SERVICIO = ['Bienvenida', 'Alabanza', 'Anuncios', 'Mensaje', 'Cierre'];

export const PLANTEL_INICIAL = ['Sorimar', 'Karol', 'David', 'Sofia', 'Kathy', 'Jazmin', 'Ronald', 'Daniel', 'Renata'];

/** Días desde los que un evento sin asistencia tomada se considera "pendiente". */
export const DIAS_ASISTENCIA_PENDIENTE = 14;
export const DIAS_SIN_RESPALDO_AVISO = 14;
