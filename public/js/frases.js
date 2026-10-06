/* Frase del día: una por cada día del mes (31), se repiten cada mes.
   Textos bíblicos: Reina-Valera 1960. Las citas de artistas marcadas "atribuida" circulan con ese autor sin fuente primaria segura. */

const VERSOS = [
  ['Lo he llenado del Espíritu de Dios, en sabiduría y en inteligencia, en ciencia y en todo arte.', 'Éxodo 31:3'],
  ['Y creó Dios al hombre a su imagen, a imagen de Dios lo creó.', 'Génesis 1:27'],
  ['Cantadle cántico nuevo; hacedlo bien tañendo con júbilo.', 'Salmo 33:3'],
  ['Los cielos cuentan la gloria de Dios, y el firmamento anuncia la obra de sus manos.', 'Salmo 19:1'],
  ['Te alabaré; porque formidables, maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.', 'Salmo 139:14'],
  ['Y sea la luz de Jehová nuestro Dios sobre nosotros, y la obra de nuestras manos confirma sobre nosotros.', 'Salmo 90:17'],
  ['Encomienda a Jehová tus obras, y tus pensamientos serán afirmados.', 'Proverbios 16:3'],
  ['Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.', 'Proverbios 3:5-6'],
  ['Todo lo que te viniere a la mano para hacer, hazlo según tus fuerzas.', 'Eclesiastés 9:10'],
  ['Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.', 'Colosenses 3:23'],
  ['Todo lo puedo en Cristo que me fortalece.', 'Filipenses 4:13'],
  ['Porque somos hechura suya, creados en Cristo Jesús para buenas obras, las cuales Dios preparó de antemano para que anduviésemos en ellas.', 'Efesios 2:10'],
  ['Ahora, pues, Jehová, tú eres nuestro padre; nosotros barro, y tú el que nos formaste; así que obra de tus manos somos todos nosotros.', 'Isaías 64:8'],
  ['He aquí que yo hago cosa nueva; pronto saldrá a luz; ¿no la conoceréis?', 'Isaías 43:19'],
  ['Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.', 'Isaías 40:31'],
  ['Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.', 'Josué 1:9'],
  ['Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras, y glorifiquen a vuestro Padre que está en los cielos.', 'Mateo 5:16'],
  ['No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.', 'Gálatas 6:9'],
  ['Si, pues, coméis o bebéis, o hacéis otra cosa, hacedlo todo para la gloria de Dios.', '1 Corintios 10:31'],
  ['Por tanto, hermanos míos amados, estad firmes y constantes, creciendo en la obra del Señor siempre, sabiendo que vuestro trabajo en el Señor no es en vano.', '1 Corintios 15:58'],
  ['Bástate mi gracia; porque mi poder se perfecciona en la debilidad.', '2 Corintios 12:9'],
  ['Cada uno según el don que ha recibido, minístrelo a los otros, como buenos administradores de la multiforme gracia de Dios.', '1 Pedro 4:10'],
  ['Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.', 'Jeremías 29:11'],
  ['Te aconsejo que avives el fuego del don de Dios que está en ti.', '2 Timoteo 1:6'],
  ['Escribe la visión, y declárala en tablas, para que corra el que leyere en ella.', 'Habacuc 2:2'],
  ['Levantémonos y edifiquemos. Así esforzaron sus manos para bien.', 'Nehemías 2:18'],
];

const ARTISTAS = [
  ['Si oyes una voz dentro de ti que dice «no puedes pintar», entonces pinta, y esa voz se callará.', 'Vincent van Gogh, en una carta a su hermano Theo'],
  ['El fin y la meta última de toda música no debe ser otra que la gloria de Dios y la recreación del alma.', 'Johann Sebastian Bach'],
  ['Del corazón… ¡que vuelva al corazón!', 'Ludwig van Beethoven, en la partitura de su Missa solemnis'],
  ['Todavía estoy aprendiendo.', 'Miguel Ángel, frase atribuida a sus 87 años'],
  ['La originalidad consiste en volver al origen.', 'Antoni Gaudí, frase atribuida'],
];

// Los artistas caen en los días 4, 9, 15, 21 y 27 para que no se junten.
const DIAS_ARTISTA = [3, 8, 14, 20, 26];

export const FRASES = (() => {
  const lista = [];
  let v = 0;
  let a = 0;
  for (let i = 0; i < VERSOS.length + ARTISTAS.length; i++) {
    const [texto, autor] = DIAS_ARTISTA.includes(i) ? ARTISTAS[a++] : VERSOS[v++];
    lista.push({ texto, autor });
  }
  return lista;
})();

/** La frase de una fecha ISO (yyyy-mm-dd): el día 1 del mes es la primera, el 31 la última. */
export function fraseDelDia(iso) {
  const dia = Number(iso.slice(8, 10));
  return FRASES[(dia - 1) % FRASES.length];
}
