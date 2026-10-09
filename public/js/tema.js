/* Tema claro/oscuro. Se carga como script normal en <head> para pintar el tema correcto desde el primer cuadro (sin parpadeo). */
(function () {
  var CLAVE = 'tlc.tema';
  var colores = { claro: '#f1f2f5', oscuro: '#0a0b0e' };
  function guardada() { try { return localStorage.getItem(CLAVE) || 'oscuro'; } catch (e) { return 'oscuro'; } }
  function sistemaClaro() { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches); }
  function efectivo() { var p = guardada(); return p === 'auto' ? (sistemaClaro() ? 'claro' : 'oscuro') : p; }
  function aplicar() {
    var t = efectivo();
    document.documentElement.setAttribute('data-tema', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', colores[t]);
    document.dispatchEvent(new CustomEvent('tema-cambio', { detail: { tema: t, preferencia: guardada() } }));
  }
  window.tlcTema = {
    preferencia: guardada,
    efectivo: efectivo,
    fijar: function (valor) { try { localStorage.setItem(CLAVE, valor); } catch (e) { /* sin almacenamiento */ } aplicar(); },
  };
  aplicar();
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: light)');
    var alCambiar = function () { if (guardada() === 'auto') aplicar(); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar); else if (mq.addListener) mq.addListener(alCambiar);
  }
})();
