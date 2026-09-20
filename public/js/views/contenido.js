import { fabricarCalendario } from './calendario.js';

/** Planificador de contenido: el mismo calendario, solo con publicaciones y filtro por canal. */
export const vistaContenido = fabricarCalendario({ id: 'contenido', titulo: 'Contenido', capasFijas: ['contenido'], conCanal: true });
