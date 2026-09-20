/* Datos de ejemplo SOLO para desarrollo (el botón únicamente aparece en localhost). */
import { guardar } from './store.js';
import { EQUIPO_CREATIVO, PLANTEL_INICIAL } from './model.js';
import { diaSemana, hoy, nuevoId, sumarDias } from './util.js';

let semilla = 7;
const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };

export function cargarDemo() {
  const ops = [];
  const areas = [['Cámara', 'Edición'], ['Diseño'], ['Fotografía', 'Redes sociales'], ['Streaming', 'Sonido'], ['Luces'], ['Guion', 'Redes sociales'], ['Cámara'], ['Edición', 'Diseño'], ['Proyección']];
  const personas = PLANTEL_INICIAL.map((n, i) => {
    const id = `per_demo_${i}`;
    ops.push({ c: 'personas', id, data: { equipoId: EQUIPO_CREATIVO, equipos: [EQUIPO_CREATIVO], activo: true, nombre: n, apellidos: '', rol: n === 'David' ? 'lider' : 'voluntario', telefono: `+56 9 5${String(1000000 + i * 111111).slice(0, 7)}`, correo: `${n.toLowerCase()}@example.com`, anioNac: 1988 + i * 2, direccion: i % 2 ? 'Chicureo, Colina' : '', desde: sumarDias(hoy(), -300 + i * 20), areas: areas[i], emergencia: '', notas: i === 3 ? 'Alérgica a los maníes. Disponible solo domingos.' : '' } });
    return id;
  });

  const evs = [];
  const desde = sumarDias(hoy(), -42);
  for (let d = 0; d <= 84; d++) {
    const f = sumarDias(desde, d);
    const dow = diaSemana(f);
    let e = null;
    if (dow === 6) e = { tipo: 'servicio', titulo: 'Servicio dominical', horaInicio: '09:30', horaFin: '12:00', lugar: 'Auditorio' };
    else if (dow === 0) e = { tipo: 'reunion', titulo: 'Reunión de lunes', horaInicio: '20:00', horaFin: '21:30', lugar: 'Sala creativa' };
    else if (dow === 3 && d % 14 < 7) e = { tipo: 'ensayo', titulo: 'Ensayo de alabanza', horaInicio: '19:00', horaFin: '21:00', lugar: 'Auditorio' };
    if (e) evs.push({ id: nuevoId('ev'), fecha: f, ...e });
  }
  evs.push({ id: nuevoId('ev'), fecha: sumarDias(hoy(), 9), tipo: 'grabacion', titulo: 'Grabación testimonios', horaInicio: '10:00', horaFin: '13:00', lugar: 'Estudio' });
  const bloques = ['Bienvenida', 'Alabanza', 'Anuncios', 'Mensaje', 'Cierre'];
  let primerosServicios = 0;
  evs.forEach((e) => {
    const programa = e.tipo === 'servicio' && e.fecha >= hoy() && primerosServicios < 3 ? (primerosServicios++, bloques.map((t, i) => ({ id: nuevoId('pr'), hora: ['09:30', '09:40', '10:20', '10:35', '11:30'][i], titulo: t, responsableId: i === 3 ? '' : personas[(i * 2) % personas.length] }))) : [];
    ops.push({ c: 'eventos', id: e.id, data: { equipoId: EQUIPO_CREATIVO, tipo: e.tipo, titulo: e.titulo, fecha: e.fecha, horaInicio: e.horaInicio, horaFin: e.horaFin, lugar: e.lugar, notas: '', participantes: [], tomaLista: true, programa, serieId: null } });
    if (e.fecha < sumarDias(hoy(), -2)) {
      personas.forEach((p, i) => {
        const r = azar();
        if (r < 0.72 + (i % 3) * 0.05) ops.push({ c: 'asistencia', id: `${e.id}~${p}`, data: { eventoId: e.id, personaId: p, estado: 'p' } });
        else if (r < 0.9) ops.push({ c: 'asistencia', id: `${e.id}~${p}`, data: { eventoId: e.id, personaId: p, estado: 'a' } });
        else ops.push({ c: 'asistencia', id: `${e.id}~${p}`, data: { eventoId: e.id, personaId: p, estado: 'j' } });
      });
    }
  });

  const tareas = [
    ['Editar reel del domingo', [personas[7]], -2, 'alta'], ['Diseñar arte de la serie', [personas[1]], 1, 'normal'], ['Cámara 2: revisar baterías', [personas[0], personas[6]], 0, 'normal'],
    ['Subir fotos al drive', [personas[2]], 4, 'normal'], ['Guion del video de anuncios', [personas[5]], 6, 'alta'], ['Cotizar luces nuevas', [], 12, 'normal'], ['Actualizar lower thirds', [personas[3]], null, 'normal'],
  ];
  tareas.forEach(([titulo, asignados, dias, prioridad]) => ops.push({ c: 'tareas', id: nuevoId('ta'), data: { equipoId: EQUIPO_CREATIVO, titulo, detalle: '', asignados, vence: dias === null ? '' : sumarDias(hoy(), dias), prioridad, estado: 'pendiente', eventoId: '', creada: hoy(), hechaEn: '' } }));
  ops.push({ c: 'tareas', id: nuevoId('ta'), data: { equipoId: EQUIPO_CREATIVO, titulo: 'Exportar intro nueva', detalle: '', asignados: [personas[7]], vence: sumarDias(hoy(), -4), prioridad: 'normal', estado: 'hecha', eventoId: '', creada: sumarDias(hoy(), -9), hechaEn: sumarDias(hoy(), -4) } });

  const pubs = [['Reflexión del lunes', 'instagram', 'post', 1], ['Detrás de cámaras', 'instagram', 'historia', 2], ['Reel del servicio', 'instagram', 'reel', 4], ['Invitación al domingo', 'whatsapp', 'estado', 5], ['Versículo de la semana', 'instagram', 'post', 8], ['Testimonios', 'instagram', 'reel', 10], ['Recordatorio reunión', 'whatsapp', 'mensaje', 0]];
  pubs.forEach(([titulo, canal, formato, dias], i) => ops.push({ c: 'publicaciones', id: nuevoId('pu'), data: { equipoId: EQUIPO_CREATIVO, canal, formato, titulo, fecha: sumarDias(hoy(), dias), hora: i % 2 ? '12:30' : '', estado: i === 0 ? 'listo' : 'idea', responsableId: personas[i % personas.length], detalle: '' } }));

  guardar(ops);
}
