/**
 * WHITEMOON CALCULADORA ITP — Widget con Licencia White Label
 * <script src="https://nexusforgeia.github.io/whitemoon-cdn/itp.js" data-token="WM-XXXX"></script>
 * © WhiteMoon · whitemoon.es
 */
(function(){
  var script = document.currentScript || document.querySelector('script[data-token][src*="itp.js"]');
  if(!script) return;
  var token = script.getAttribute('data-token');
  if(!token){ console.warn('[WM-ITP] Sin token'); return; }
  var BASE = script.src.replace(/\/itp\.js.*$/, '');

  fetch(BASE + '/licenses.json?_=' + Date.now()).then(function(r){
    if(!r.ok) throw new Error('Sin conexión');
    return r.json();
  }).then(function(data){
    var lic = data.licenses[token];
    if(!lic){ console.warn('[WM-ITP] Token inválido'); return; }
    if(!lic.active){ console.warn('[WM-ITP] Licencia inactiva'); return; }
    if(!lic.itp){ console.warn('[WM-ITP] Módulo ITP no activado para esta licencia'); return; }

    var host = window.location.hostname;
    var local = host === 'localhost' || host === '127.0.0.1' || host === '' || host.includes('github.io');
    if(!local && lic.domain && !host.includes(lic.domain)){
      console.warn('[WM-ITP] Dominio no autorizado');
      return;
    }
    if(lic.expires && new Date(lic.expires) < new Date()){
      console.warn('[WM-ITP] Licencia expirada');
      return;
    }

    initITP(script, lic);
  }).catch(function(e){ console.error('[WM-ITP]', e); });

  function initITP(el, lic){
    var itp = lic.itp;
    var cfg = {
      nombre:   el.getAttribute('data-nombre')  || itp.nombre  || lic.biz || 'Gestoría',
      color:    el.getAttribute('data-color')   || itp.color   || '#1565C0',
      tel:      el.getAttribute('data-tel')     || itp.tel     || lic.phone || '',
      logo:     el.getAttribute('data-logo')    || itp.logo    || '',
      cta:      el.getAttribute('data-cta')     || itp.cta     || 'Solicitar gestión del ITP',
      target:   el.getAttribute('data-target')  || 'wm-itp-widget'
    };

    var waNum = cfg.tel.replace(/[^0-9]/g, '');
    var waLink = waNum
      ? 'https://wa.me/34' + waNum + '?text=Hola%2C%20quiero%20gestionar%20el%20ITP%20de%20mi%20veh%C3%ADculo'
      : '#';

    // Color derivado
    var r = parseInt(cfg.color.slice(1,3),16);
    var g = parseInt(cfg.color.slice(3,5),16);
    var b = parseInt(cfg.color.slice(5,7),16);
    var colorLight = 'rgba('+r+','+g+','+b+',.08)';
    var colorMid   = 'rgba('+r+','+g+','+b+',.15)';
    var colorDark  = 'rgba('+Math.max(0,r-30)+','+Math.max(0,g-30)+','+Math.max(0,b-30)+',1)';

    // CSS
    var sty = document.createElement('style');
    sty.textContent = [
      '#wm-itp-widget{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;text-align:center;padding:2rem 1rem;max-width:520px;margin:0 auto;}',
      '#wm-itp-widget .itp-logo{height:48px;display:block;margin:0 auto 1.25rem;object-fit:contain;}',
      '#wm-itp-widget .itp-title{font-size:1.4rem;font-weight:700;color:#1a1a2e;margin-bottom:.4rem;line-height:1.2;}',
      '#wm-itp-widget .itp-sub{color:#666;font-size:.88rem;margin-bottom:1.5rem;line-height:1.5;}',
      '#wm-itp-widget .itp-badges{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:1.5rem;}',
      '#wm-itp-widget .itp-badge{font-size:.68rem;padding:3px 10px;border-radius:20px;background:'+colorLight+';color:'+cfg.color+';border:1px solid '+colorMid+';}',
      '#wm-itp-widget .itp-btn-calc{display:inline-block;background:'+cfg.color+';color:#fff;padding:.875rem 2rem;border-radius:4px;text-decoration:none;font-weight:600;font-size:.9rem;transition:opacity .2s;margin-bottom:.75rem;}',
      '#wm-itp-widget .itp-btn-calc:hover{opacity:.85;}',
      '#wm-itp-widget .itp-btn-wa{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;padding:.75rem 1.75rem;border-radius:4px;text-decoration:none;font-weight:500;font-size:.875rem;transition:opacity .2s;}',
      '#wm-itp-widget .itp-btn-wa:hover{opacity:.88;}',
      '#wm-itp-widget .itp-btn-wa svg{width:18px;height:18px;fill:#fff;flex-shrink:0;}',
      '#wm-itp-widget .itp-divider{font-size:.72rem;color:#bbb;margin:.5rem 0;}',
      '#wm-itp-widget .itp-pw{font-size:.6rem;color:#ccc;margin-top:1rem;}',
      '#wm-itp-widget .itp-pw a{color:#aaa;text-decoration:none;}'
    ].join('');
    document.head.appendChild(sty);

    // Buscar o crear contenedor
    var container = document.getElementById(cfg.target);
    if(!container){
      container = document.createElement('div');
      container.id = 'wm-itp-widget';
      script.parentNode.insertBefore(container, script.nextSibling);
    } else {
      container.id = 'wm-itp-widget';
    }

    // HTML del widget
    var html = '';
    if(cfg.logo){
      html += '<img src="' + cfg.logo + '" alt="' + cfg.nombre + '" class="itp-logo">';
    }
    html += '<div class="itp-title">Calculadora ITP Vehículos 2026</div>';
    html += '<div class="itp-sub">Calcula el Impuesto de Transmisiones Patrimoniales<br>de tu vehículo de segunda mano. BOE 2026 actualizado.</div>';
    html += '<div class="itp-badges">';
    html += '<span class="itp-badge">BOE 2026</span>';
    html += '<span class="itp-badge">Todas las CCAA</span>';
    html += '<span class="itp-badge">Gratuito</span>';
    html += '</div>';
    html += '<a href="https://nexusforgeia.github.io/WHITEMOON-CRM-SAAS-GESTORIAS-ITP/" target="_blank" class="itp-btn-calc">Calcular mi ITP gratis</a>';
    if(waNum){
      html += '<div class="itp-divider">o</div>';
      html += '<a href="' + waLink + '" target="_blank" class="itp-btn-wa">';
      html += '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>';
      html += cfg.cta;
      html += '</a>';
    }
    html += '<div class="itp-pw">Powered by <a href="https://whitemoon.es" target="_blank">WhiteMoon</a></div>';

    container.innerHTML = html;
  }
})();
