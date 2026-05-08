/**
 * WHITEMOON GESTORÍA IA — Chatbot ITP conversacional
 * <script src="https://nexusforgeia.github.io/whitemoon-cdn/gestoria-ia.js"
 *   data-token="WM-XXXX" data-nombre="..." data-color="#1565c0"
 *   data-tel="..." data-honorarios="..." data-tasas="..." data-cta="..."></script>
 * © WhiteMoon · whitemoon.es
 */
(function(){
  var script = document.currentScript || document.querySelector('script[data-token][src*="gestoria-ia.js"]');
  if(!script) return;
  var token = script.getAttribute('data-token');
  if(!token){ console.warn('[WM-GIA] Sin token'); return; }
  var BASE = script.src.replace(/\/gestoria-ia\.js.*$/, '');

  // ─── 1. VALIDAR LICENCIA ────────────────────────────────────────────────────
  fetch(BASE + '/licenses.json?_=' + Date.now())
  .then(function(r){ if(!r.ok) throw new Error('Sin conexión'); return r.json(); })
  .then(function(data){
    var lic = data.licenses[token];
    if(!lic){ console.warn('[WM-GIA] Token inválido'); return; }
    if(!lic.active){ console.warn('[WM-GIA] Licencia inactiva'); return; }
    var host = window.location.hostname;
    var local = host === 'localhost' || host === '127.0.0.1' || host === '' || host.includes('github.io');
    if(!local && lic.domain && !host.includes(lic.domain)){ console.warn('[WM-GIA] Dominio no autorizado'); return; }
    if(lic.expires && new Date(lic.expires) < new Date()){ console.warn('[WM-GIA] Licencia expirada'); return; }
    initWidget(script, lic);
  })
  .catch(function(e){ console.error('[WM-GIA]', e); });

  // ─── 2. INIT WIDGET ─────────────────────────────────────────────────────────
  function initWidget(el, lic){
    var itp = lic.itp || {};
    var CFG = {
      nombre:     el.getAttribute('data-nombre')     || itp.nombre || lic.biz || 'Gestoría',
      color:      el.getAttribute('data-color')      || itp.color  || lic.color || '#1565c0',
      tel:        (el.getAttribute('data-tel')       || itp.tel    || lic.phone || '').replace(/[^0-9]/g, ''),
      logo:       el.getAttribute('data-logo')       || itp.logo   || '',
      cta:        el.getAttribute('data-cta')        || itp.cta    || 'Solicitar gestión del ITP',
      honorarios: parseFloat(el.getAttribute('data-honorarios')) || 0,
      tasas:      parseFloat(el.getAttribute('data-tasas'))      || 0
    };

    var ITP_TABLE = {"Andalucía":8,"Aragón":8,"Asturias":8,"Baleares":8,"Canarias":5.5,"Cantabria":8,"Castilla-La Mancha":9,"Castilla y León":8,"Cataluña":5,"C. Valenciana":8,"Extremadura":8,"Galicia":8,"La Rioja":7,"Madrid":4,"Murcia":8,"Navarra":4,"País Vasco":4,"Ceuta":4,"Melilla":4};
    var CCAA_LIST = Object.keys(ITP_TABLE);

    var rgb = hexToRgb(CFG.color);
    var colorLight = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.12)';

    // ─── CSS ──────────────────────────────────────────────────────────────────
    var sty = document.createElement('style');
    sty.textContent = [
      '#wm-gia *{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
      '#wm-gia{max-width:480px;margin:24px auto;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);overflow:hidden;border:1px solid #e5e7eb}',
      '#wm-gia .gia-head{background:'+CFG.color+';color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}',
      '#wm-gia .gia-head img{height:36px;width:auto;background:#fff;padding:4px;border-radius:6px}',
      '#wm-gia .gia-title{font-weight:600;font-size:.98rem;line-height:1.2}',
      '#wm-gia .gia-sub{font-size:.74rem;opacity:.88;margin-top:2px}',
      '#wm-gia .gia-body{padding:16px 14px;background:#f8fafc;min-height:320px;max-height:480px;overflow-y:auto}',
      '#wm-gia .gia-row{margin-bottom:10px;display:flex}',
      '#wm-gia .gia-row.bot .gia-bub{background:#fff;color:#1a1a2e;border-radius:14px 14px 14px 4px;padding:10px 13px;max-width:82%;box-shadow:0 1px 2px rgba(0,0,0,.05);font-size:.88rem;line-height:1.45}',
      '#wm-gia .gia-row.user{justify-content:flex-end}',
      '#wm-gia .gia-row.user .gia-bub{background:'+CFG.color+';color:#fff;border-radius:14px 14px 4px 14px;padding:10px 13px;max-width:82%;font-size:.88rem;line-height:1.45}',
      '#wm-gia .gia-opts{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px}',
      '#wm-gia .gia-opts button{background:#fff;color:'+CFG.color+';border:1px solid '+CFG.color+';border-radius:18px;padding:6px 12px;font-size:.78rem;cursor:pointer;transition:all .15s}',
      '#wm-gia .gia-opts button:hover{background:'+CFG.color+';color:#fff}',
      '#wm-gia .gia-input{display:flex;border-top:1px solid #e5e7eb;padding:10px;background:#fff;gap:8px}',
      '#wm-gia .gia-input input{flex:1;padding:10px 14px;border:1px solid #e5e7eb;border-radius:24px;font-size:.88rem;outline:none;color:#1a1a2e}',
      '#wm-gia .gia-input input:focus{border-color:'+CFG.color+'}',
      '#wm-gia .gia-input button{background:'+CFG.color+';color:#fff;border:none;border-radius:50%;width:42px;height:42px;cursor:pointer;font-size:1.1rem;font-weight:700}',
      '#wm-gia .gia-wa{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff !important;padding:10px 18px;border-radius:24px;text-decoration:none;font-weight:600;font-size:.85rem;margin-top:6px}',
      '#wm-gia .gia-wa svg{width:16px;height:16px;fill:#fff}',
      '#wm-gia .gia-foot{text-align:center;padding:8px;font-size:.7rem;color:#9ca3af;background:#fff;border-top:1px solid #f1f5f9}'
    ].join('');
    document.head.appendChild(sty);

    // ─── DOM ──────────────────────────────────────────────────────────────────
    var root = document.getElementById('wm-gia');
    if(!root){
      root = document.createElement('div');
      root.id = 'wm-gia';
      (script.parentNode || document.body).insertBefore(root, script);
    }
    root.innerHTML = '<div class="gia-head">'+(CFG.logo?'<img src="'+escAttr(CFG.logo)+'" alt="'+escAttr(CFG.nombre)+'">':'')+'<div><div class="gia-title">'+esc(CFG.nombre)+'</div><div class="gia-sub">Asistente ITP · Cálculo en 1 minuto</div></div></div><div class="gia-body" id="gia-body"></div><div class="gia-input"><input type="text" id="gia-in" placeholder="Escribe aquí..." autocomplete="off"><button id="gia-send" type="button">→</button></div><div class="gia-foot">Powered by <a href="https://whitemoon.es" target="_blank" rel="noopener" style="color:#9ca3af;text-decoration:none">WhiteMoon</a></div>';

    var body = document.getElementById('gia-body');
    var input = document.getElementById('gia-in');
    var sendBtn = document.getElementById('gia-send');

    var STEPS = [
      {key:'marca',     msg:'¡Hola! 👋 Soy el asistente de '+esc(CFG.nombre)+'. Te ayudo a calcular el ITP de tu vehículo en menos de 1 minuto.<br><br>¿Cuál es la <b>marca</b> de tu vehículo?', type:'text',   ph:'Ej: Toyota, Seat, BMW...'},
      {key:'modelo',    msg:'Genial. ¿Y el <b>modelo</b>?',                                               type:'text',   ph:'Ej: Corolla, Ibiza, Serie 3...'},
      {key:'matricula', msg:'Perfecto. ¿Cuál es la <b>matrícula</b>? (la necesitamos para tramitar)',     type:'text',   ph:'Ej: 1234ABC'},
      {key:'anio',      msg:'¿En qué <b>año</b> se matriculó por primera vez?',                          type:'number', ph:'Ej: 2018'},
      {key:'precio',    msg:'¿Cuál es el <b>precio de compra</b>? (en euros)',                           type:'number', ph:'Ej: 12000'},
      {key:'ccaa',      msg:'¿En qué <b>Comunidad Autónoma</b> vas a matricularlo?',                     type:'opts',   opts: CCAA_LIST},
      {key:'resultado', msg:'',                                                                            type:'calc'},
      {key:'nombre',    msg:'Para enviarte la gestión completa, ¿me dices tu <b>nombre y apellidos</b>?', type:'text',   ph:'Tu nombre'},
      {key:'telefono',  msg:'Por último, un <b>teléfono</b> de contacto (te escribiremos por WhatsApp):', type:'tel',    ph:'612345678'},
      {key:'resumen',   msg:'',                                                                            type:'summary'}
    ];

    var data = {};
    var step = 0;

    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function escAttr(s){ return esc(s).replace(/"/g,'&quot;'); }
    function fmtEur(n){ return Number(n).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
    function hexToRgb(hex){
      var c = (hex||'#1565c0').replace('#','');
      if(c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
      return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
    }

    function bot(html){
      var d = document.createElement('div');
      d.className = 'gia-row bot';
      d.innerHTML = '<div class="gia-bub">'+html+'</div>';
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
    }
    function user(text){
      var d = document.createElement('div');
      d.className = 'gia-row user';
      d.innerHTML = '<div class="gia-bub">'+esc(text)+'</div>';
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
    }
    function opts(arr, onPick){
      var d = document.createElement('div');
      d.className = 'gia-opts';
      arr.forEach(function(o){
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = o;
        b.onclick = function(){ d.remove(); onPick(o); };
        d.appendChild(b);
      });
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
    }

    function next(){
      var s = STEPS[step];
      if(!s) return;

      if(s.type === 'calc'){
        var pct = ITP_TABLE[data.ccaa] || 8;
        var imp = Math.round(data.precio * pct * 100) / 10000;
        var total = imp + CFG.honorarios + CFG.tasas;
        data.itp_pct = pct;
        data.itp_imp = imp;
        data.total = total;
        var detalle = '📊 <b>Cálculo estimado del ITP</b><br><br>'+
          'Vehículo: '+esc(data.marca)+' '+esc(data.modelo)+'<br>'+
          'Matrícula: '+esc(data.matricula)+'<br>'+
          'Año: '+esc(data.anio)+'<br>'+
          'Precio: '+fmtEur(data.precio)+'<br>'+
          'CCAA: '+esc(data.ccaa)+' ('+pct+'%)<br><br>'+
          'ITP: '+fmtEur(imp);
        if(CFG.honorarios > 0) detalle += '<br>Honorarios gestoría: '+fmtEur(CFG.honorarios);
        if(CFG.tasas > 0)      detalle += '<br>Tasas DGT: '+fmtEur(CFG.tasas);
        if(CFG.honorarios > 0 || CFG.tasas > 0) detalle += '<br><br><b>Total estimado: '+fmtEur(total)+'</b>';
        else                                    detalle = detalle.replace('ITP: ', '<b>ITP a pagar: ').replace(fmtEur(imp), fmtEur(imp)+'</b>');
        detalle += '<br><br><i>* Estimación orientativa. El cálculo definitivo lo realiza la gestoría según valor fiscal y reducciones aplicables.</i>';
        bot(detalle);
        step++;
        setTimeout(next, 900);
        return;
      }

      if(s.type === 'summary'){
        var msg = 'Hola, soy '+data.nombre+'. Quiero gestionar el ITP de mi '+data.marca+' '+data.modelo+
                  ' (matrícula '+data.matricula+', año '+data.anio+'). Precio: '+fmtEur(data.precio)+
                  '. CCAA: '+data.ccaa+'. ITP estimado: '+fmtEur(data.itp_imp)+
                  (data.total !== data.itp_imp ? '. Total estimado (con honorarios y tasas): '+fmtEur(data.total) : '')+
                  '. Mi teléfono: '+data.telefono;
        var waLink = CFG.tel
          ? ('https://wa.me/34'+CFG.tel+'?text='+encodeURIComponent(msg))
          : ('https://wa.me/?text='+encodeURIComponent(msg));
        bot('✅ <b>¡Gracias, '+esc(data.nombre)+'!</b><br><br>Resumen de tu solicitud:<br><br>'+
          '🚗 '+esc(data.marca)+' '+esc(data.modelo)+'<br>'+
          '🔢 Matrícula: '+esc(data.matricula)+'<br>'+
          '📅 Año: '+esc(data.anio)+'<br>'+
          '💶 Precio: '+fmtEur(data.precio)+'<br>'+
          '📍 CCAA: '+esc(data.ccaa)+'<br>'+
          '🧮 ITP estimado: <b>'+fmtEur(data.itp_imp)+'</b><br>'+
          (data.total !== data.itp_imp ? '💰 Total estimado: <b>'+fmtEur(data.total)+'</b><br>' : '')+
          '📞 Teléfono: '+esc(data.telefono)+'<br><br>'+
          'Pulsa el botón para enviarnos la solicitud por WhatsApp y te ayudaremos con todo el trámite:<br><br>'+
          '<a class="gia-wa" href="'+escAttr(waLink)+'" target="_blank" rel="noopener">'+
          '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>'+
          esc(CFG.cta)+'</a>');
        input.disabled = true;
        sendBtn.disabled = true;
        input.placeholder = 'Conversación finalizada';
        return;
      }

      bot(s.msg);

      if(s.type === 'opts'){
        opts(s.opts, function(v){ user(v); data[s.key] = v; step++; setTimeout(next, 400); });
        input.disabled = true;
        sendBtn.disabled = true;
        return;
      }

      input.disabled = false;
      sendBtn.disabled = false;
      input.placeholder = s.ph || 'Escribe aquí...';
      input.type = (s.type === 'number' ? 'number' : (s.type === 'tel' ? 'tel' : 'text'));
      input.value = '';
      input.focus();
    }

    function submit(){
      var s = STEPS[step];
      if(!s) return;
      var v = input.value.trim();
      if(!v) return;
      if(s.type === 'number'){
        var n = parseFloat(v.replace(/\./g, '').replace(/,/g, '.'));
        if(isNaN(n) || n <= 0){ bot('⚠️ Por favor, introduce un número válido.'); return; }
        data[s.key] = n;
        user(s.key === 'precio' ? fmtEur(n) : String(n));
      } else if(s.type === 'tel'){
        var t = v.replace(/[^0-9]/g, '');
        if(t.length < 9){ bot('⚠️ El teléfono debe tener al menos 9 dígitos.'); return; }
        data[s.key] = t;
        user(t);
      } else {
        data[s.key] = v;
        user(v);
      }
      input.value = '';
      step++;
      setTimeout(next, 400);
    }

    sendBtn.addEventListener('click', submit);
    input.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); submit(); } });
    setTimeout(next, 300);
  }
})();
