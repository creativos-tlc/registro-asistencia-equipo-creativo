import { api, cambiarPin, estadoSync, guardar, lista, pendientes, salir, sincronizarAhora, volcarTodo, yo, COLECCIONES } from '../store.js';
import { html, hoy, icono, raw } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, leerForm, marcarError, registrarAcciones, toast } from '../ui.js';
import { refrescar } from '../router.js';
import { hayDatosAntiguos } from '../legacy.js';

const CLAVE_RESPALDO = 'tlc.ultimoRespaldo';
const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

export function leerUltimoRespaldo() {
  const t = Number(localStorage.getItem(CLAVE_RESPALDO) || 0);
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}

export function descargar(contenido, nombre, mime) {
  const url = URL.createObjectURL(new Blob([contenido], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function respaldo() {
  const datos = { app: 'coordinacion-tlc', version: 2, exportado: new Date().toISOString(), docs: volcarTodo() };
  descargar(JSON.stringify(datos, null, 2), `respaldo_coordinacion_${hoy()}.json`, 'application/json');
  localStorage.setItem(CLAVE_RESPALDO, String(Date.now()));
  toast('Respaldo descargado');
  refrescar();
}

async function restaurar(archivo) {
  let datos;
  try { datos = JSON.parse(await archivo.text()); } catch { toast('El archivo no es un respaldo válido', { tipo: 'error' }); return; }
  if (!datos || datos.app !== 'coordinacion-tlc' || !datos.docs) { toast('Ese archivo no es un respaldo de esta app', { tipo: 'error' }); return; }
  const ops = [];
  COLECCIONES.forEach((c) => Object.entries(datos.docs[c] || {}).forEach(([id, data]) => ops.push({ c, id, data })));
  if (!(await confirmar({ titulo: 'Restaurar respaldo', mensaje: `Se agregarán o actualizarán ${ops.length} registros en los datos compartidos. No se borra nada de lo que ya existe.`, boton: 'Restaurar', peligro: false }))) return;
  guardar(ops);
  toast(`${ops.length} registros restaurados`);
}

function cambiarPinHoja() {
  abrirHoja({
    titulo: 'Cambiar mi PIN',
    cuerpo: html`<form id="fPin" class="form-grid" novalidate>
      <div class="field"><label for="pn-a">PIN actual</label><input class="input" id="pn-a" name="a" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password" autofocus></div>
      <div class="field"><label for="pn-b">PIN nuevo</label><input class="input" id="pn-b" name="b" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"><p class="hint">Entre 4 y 8 números. Evita 1234 o fechas obvias.</p></div>
      <div class="field"><label for="pn-c">Repite el PIN nuevo</label><input class="input" id="pn-c" name="c" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>
    </form>`,
    pie: html`<button class="btn btn--soft" type="button" data-action="cerrar-hoja">Cancelar</button><button class="btn btn--primary" type="button" data-action="pin-guardar">Cambiar PIN</button>`,
  });
}

registrarAcciones({
  'ajustes-respaldo': respaldo,
  'ajustes-restaurar': () => document.getElementById('archivoRespaldo').click(),
  'ajustes-sync': async () => { await sincronizarAhora(); refrescar(); },
  'ajustes-pin': cambiarPinHoja,
  'pin-guardar': async () => {
    const f = document.getElementById('fPin');
    const d = leerForm(f);
    if (!/^\d{4,8}$/.test(d.b)) { marcarError(f.b, 'Usa entre 4 y 8 números'); return; }
    if (d.b !== d.c) { marcarError(f.c, 'Los PIN no coinciden'); return; }
    try { await cambiarPin(d.a, d.b); cerrarHoja(); toast('PIN cambiado'); } catch (e) { marcarError(f.a, e.message || 'No se pudo cambiar'); }
  },
  'ajustes-salir': async () => {
    const n = pendientes();
    if (n && !(await confirmar({ titulo: 'Hay cambios sin enviar', mensaje: `${n} cambio${n === 1 ? '' : 's'} todavía no llegó al servidor. Si cierras sesión ahora se perderá${n === 1 ? '' : 'n'}. Conéctate y espera a ver "Guardado" antes de salir.`, boton: 'Salir igual' }))) return;
    await salir();
  },
  'ajustes-demo': async () => { const { cargarDemo } = await import('../demo.js'); cargarDemo(); toast('Datos de ejemplo cargados'); },
});

export const vistaAjustes = {
  titulo: 'Ajustes',
  sinFab: true,
  render() {
    const persona = yo();
    const s = estadoSync();
    const dias = leerUltimoRespaldo();
    const estadoTxt = s.estado === 'off' ? 'Sin conexión' : s.pendientes ? `${s.pendientes} cambios por enviar` : 'Todo guardado y compartido';
    const fila = (ic, t, sub, accion, extra = '') => html`<button class="row" type="button" data-action="${accion}" ${raw(extra)}>${icono(ic, 'i--lg')}<span class="row__main"><span class="row__title">${t}</span>${sub ? html`<span class="row__sub">${sub}</span>` : ''}</span>${icono('chev-r', 'row__chev')}</button>`;
    return html`
      <div class="ajustes">
        <section class="section"><div class="section__head"><h3 class="section__title">Mi cuenta</h3></div>
          <div class="panel"><div class="list">
            <div class="row">${icono('user', 'i--lg')}<span class="row__main"><span class="row__title">${persona.nombre}</span><span class="row__sub">${persona.rol === 'lider' ? 'Líder' : 'Voluntario'}</span></span></div>
            ${fila('lock', 'Cambiar mi PIN', 'Entre 4 y 8 números', 'ajustes-pin')}
            ${fila('logout', 'Cerrar sesión', 'Este teléfono dejará de tener acceso hasta que vuelvas a entrar', 'ajustes-salir')}
          </div></div></section>

        <section class="section"><div class="section__head"><h3 class="section__title">Sincronización</h3></div>
          <div class="panel"><div class="list">
            ${fila('refresh', estadoTxt, s.ultimo ? `Última consulta: ${new Date(s.ultimo).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}` : 'Aún sin consultar', 'ajustes-sync')}
          </div></div>
          <p class="hint" style="margin-top:var(--sp-2)">Los cambios se guardan al instante en este teléfono y se envían a la base compartida. Sin señal, quedan en cola y salen solos al volver la conexión.</p></section>

        <section class="section"><div class="section__head"><h3 class="section__title">Datos y respaldo</h3></div>
          <div class="panel"><div class="list">
            ${fila('download', 'Descargar respaldo completo', dias === null ? 'Nunca has descargado uno desde este dispositivo' : dias === 0 ? 'Último respaldo: hoy' : `Último respaldo: hace ${dias} días`, 'ajustes-respaldo')}
            ${fila('upload', 'Restaurar desde un respaldo', 'Suma los datos de un archivo .json sin borrar lo actual', 'ajustes-restaurar')}
            ${hayDatosAntiguos() ? fila('users', 'Traer datos de la versión anterior', 'Datos que este teléfono tenía guardados antes de la actualización', 'legacy-abrir') : ''}
          </div></div>
          <input id="archivoRespaldo" type="file" accept="application/json,.json" hidden></section>

        <section class="section"><div class="section__head"><h3 class="section__title">Enlaces</h3></div>
          <div class="panel"><div class="list">
            <a class="row" href="https://creativos-tlc.github.io/Equipo-Creativo/calendario-2026" target="_blank" rel="noopener">${icono('calendar', 'i--lg')}<span class="row__main"><span class="row__title">Calendario 2026 (devocionales e informaciones)</span><span class="row__sub">Sitio externo. Se integrará al calendario de esta app.</span></span>${icono('link', 'row__chev')}</a>
          </div></div></section>

        ${esLocal ? html`<section class="section"><div class="section__head"><h3 class="section__title">Solo desarrollo</h3></div><div class="panel"><div class="list">${fila('sun', 'Cargar datos de ejemplo', 'Solo visible en localhost', 'ajustes-demo')}</div></div></section>` : ''}

        <p class="hint" style="margin-top:var(--sp-8)">Coordinación · Equipo Creativo TLC · versión 2.0</p>
      </div>`;
  },
  montar(raiz) {
    const inp = raiz.querySelector('#archivoRespaldo');
    if (inp) inp.addEventListener('change', () => { if (inp.files[0]) restaurar(inp.files[0]); inp.value = ''; });
  },
};
