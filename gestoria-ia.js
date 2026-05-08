/**
 * WHITEMOON GESTORÍA IA — Chatbot multi-flujo (estilo Gestram)
 * <script src="https://nexusforgeia.github.io/whitemoon-cdn/gestoria-ia.js"
 *   data-token="WM-XXXX" data-nombre="..." data-color="#cc0000"
 *   data-tel="..." data-honorarios="..." data-tasas="true"
 *   data-direccion="..."></script>
 * © WhiteMoon · whitemoon.es
 */
(function(){
  var script = document.currentScript || document.querySelector('script[data-token][src*="gestoria-ia.js"]');
  if(!script) return;
  var token = script.getAttribute('data-token');
  if(!token){ console.warn('[WM-GIA] Sin token'); return; }
  var BASE = script.src.replace(/\/gestoria-ia\.js.*$/, '');

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

  function initWidget(el, lic){
    var itp = lic.itp || {};
    var TASAS_DGT = 55.70;
    var attrTasas = el.getAttribute('data-tasas');
    var tasasIncluidas = attrTasas != null
      ? (attrTasas === 'true' || attrTasas === '1')
      : (itp.tasas !== false);
    var CFG = {
      nombre:     el.getAttribute('data-nombre')     || itp.nombre || lic.biz || 'Gestoría',
      color:      el.getAttribute('data-color')      || itp.color  || lic.color || '#cc0000',
      tel:        (el.getAttribute('data-tel')       || itp.tel    || lic.phone || '').replace(/[^0-9]/g, ''),
      honorarios: parseFloat(el.getAttribute('data-honorarios') != null ? el.getAttribute('data-honorarios') : itp.honorarios) || 0,
      tasas:      tasasIncluidas ? TASAS_DGT : 0,
      direccion:  el.getAttribute('data-direccion')  || itp.direccion || ''
    };

    var ITP_TABLE = {"Andalucía":8,"Aragón":8,"Asturias":8,"Baleares":8,"Canarias":5.5,"Cantabria":8,"Castilla-La Mancha":9,"Castilla y León":8,"Cataluña":5,"C. Valenciana":8,"Extremadura":8,"Galicia":8,"La Rioja":7,"Madrid":4,"Murcia":8,"Navarra":4,"País Vasco":4,"Ceuta":4,"Melilla":4};
    var CCAA_LIST = Object.keys(ITP_TABLE);

    var rgb = hexToRgb(CFG.color);
    var colorLight = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.15)';
    var colorMid   = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.35)';

    // ─── CSS ──────────────────────────────────────────────────────────────────
    var sty = document.createElement('style');
    sty.textContent = [
      '#wm-gia-btn{position:fixed;bottom:30px;right:30px;width:64px;height:64px;border-radius:50%;background:'+CFG.color+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.4);z-index:998;opacity:0;transition:opacity .4s,transform .2s;}',
      '#wm-gia-btn.wm-visible{opacity:1;animation:wm-gia-pulse 2.4s ease-in-out infinite;}',
      '#wm-gia-btn:hover{transform:scale(1.08);}',
      '#wm-gia-btn.wm-open{display:none;}',
      '#wm-gia-btn svg{width:30px;height:30px;fill:#fff;}',
      '@keyframes wm-gia-pulse{0%,100%{box-shadow:0 4px 20px rgba(0,0,0,.4),0 0 0 0 '+colorMid+'}50%{box-shadow:0 4px 24px rgba(0,0,0,.45),0 0 0 12px '+colorLight+'}}',
      '#wm-gia-tip{position:fixed;bottom:48px;right:104px;background:#0d0d0d;color:#fff;border:1px solid '+CFG.color+';font-size:13px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;white-space:nowrap;padding:10px 14px;border-radius:10px;z-index:997;box-shadow:0 4px 16px rgba(0,0,0,.4);opacity:0;transform:translateX(8px);transition:opacity .3s,transform .3s;pointer-events:none;}',
      '#wm-gia-tip.wm-show{opacity:1;transform:translateX(0);}',
      '#wm-gia-tip::after{content:"";position:absolute;right:-6px;top:50%;transform:translateY(-50%) rotate(45deg);width:10px;height:10px;background:#0d0d0d;border-right:1px solid '+CFG.color+';border-top:1px solid '+CFG.color+';}',
      '#wm-gia-modal{position:fixed;bottom:110px;right:30px;width:360px;max-height:560px;background:#0d0d0d;border:1px solid '+CFG.color+';border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.55);z-index:998;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}',
      '#wm-gia-modal.wm-show{display:flex;animation:wm-gia-slide .25s ease-out;}',
      '@keyframes wm-gia-slide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
      '@media(max-width:600px){#wm-gia-modal{bottom:0;right:0;left:0;width:100vw;max-height:90vh;height:90vh;border-radius:12px 12px 0 0;}#wm-gia-btn{bottom:20px;right:20px;}#wm-gia-tip{bottom:38px;right:94px;}}',
      '#wm-gia-modal *{box-sizing:border-box;margin:0;padding:0;}',
      '#wm-gia-modal .gia-head{background:#000;border-bottom:3px solid '+CFG.color+';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
      '#wm-gia-modal .gia-hinfo{flex:1;min-width:0;}',
      '#wm-gia-modal .gia-title{color:#fff;font-weight:700;font-size:.95rem;line-height:1.2;}',
      '#wm-gia-modal .gia-sub{color:#cbd5e1;font-size:.72rem;display:flex;align-items:center;gap:6px;margin-top:3px;}',
      '#wm-gia-modal .gia-dot{width:8px;height:8px;background:#22c55e;border-radius:50%;display:inline-block;animation:wm-gia-blink 1.6s ease-in-out infinite;}',
      '@keyframes wm-gia-blink{0%,100%{opacity:1}50%{opacity:.35}}',
      '#wm-gia-modal .gia-close{background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;padding:2px 6px;line-height:1;opacity:.85;flex-shrink:0;font-family:inherit;}',
      '#wm-gia-modal .gia-close:hover{opacity:1;}',
      '#wm-gia-modal .gia-close.gia-hidden{display:none;}',
      '#wm-gia-modal .gia-body{flex:1;padding:14px 12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;}',
      '#wm-gia-modal .gia-body::-webkit-scrollbar{width:5px;}',
      '#wm-gia-modal .gia-body::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px;}',
      '#wm-gia-modal .gia-msg{max-width:85%;font-size:.83rem;line-height:1.5;padding:9px 13px;word-break:break-word;border-radius:12px;}',
      '#wm-gia-modal .gia-msg.gia-bot{background:#1a1a1a;color:#e5e7eb;border:1px solid '+CFG.color+';border-radius:12px 12px 12px 4px;align-self:flex-start;}',
      '#wm-gia-modal .gia-msg.gia-usr{background:'+CFG.color+';color:#fff;border-radius:12px 12px 4px 12px;align-self:flex-end;}',
      '#wm-gia-modal .gia-warn{display:block;margin-top:6px;padding:8px 10px;background:rgba(245,158,11,.1);border-left:3px solid #f59e0b;border-radius:4px;color:#fbbf24;font-size:.72rem;line-height:1.4;font-style:italic;}',
      '#wm-gia-modal .gia-typing{display:flex;gap:5px;padding:11px 14px;background:#1a1a1a;border:1px solid '+CFG.color+';border-radius:12px 12px 12px 4px;align-self:flex-start;align-items:center;}',
      '#wm-gia-modal .gia-typing span{width:7px;height:7px;background:'+CFG.color+';border-radius:50%;animation:wm-gia-dot 1.2s ease-in-out infinite;}',
      '#wm-gia-modal .gia-typing span:nth-child(2){animation-delay:.2s;}',
      '#wm-gia-modal .gia-typing span:nth-child(3){animation-delay:.4s;}',
      '@keyframes wm-gia-dot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}',
      '#wm-gia-modal .gia-opts{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px;}',
      '#wm-gia-modal .gia-opts button{background:transparent;color:'+CFG.color+';border:1px solid '+CFG.color+';border-radius:18px;padding:7px 13px;font-size:.76rem;font-family:inherit;cursor:pointer;white-space:normal;transition:background .15s,color .15s;}',
      '#wm-gia-modal .gia-opts button:hover{background:'+CFG.color+';color:#fff;}',
      '#wm-gia-modal .gia-input-wrap{padding:10px;background:#0d0d0d;display:flex;gap:8px;flex-shrink:0;border-top:1px solid #222;}',
      '#wm-gia-modal .gia-input{flex:1;background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:9px 12px;color:#fff;font-size:.85rem;font-family:inherit;outline:none;}',
      '#wm-gia-modal .gia-input:focus{border-color:'+CFG.color+';}',
      '#wm-gia-modal .gia-input::placeholder{color:#6b7280;}',
      '#wm-gia-modal .gia-send{background:'+CFG.color+';color:#fff;border:none;border-radius:6px;padding:0 14px;cursor:pointer;font-size:1.05rem;font-weight:700;flex-shrink:0;font-family:inherit;display:flex;align-items:center;justify-content:center;}',
      '#wm-gia-modal .gia-send:hover{opacity:.88;}',
      '#wm-gia-modal .gia-send svg{width:18px;height:18px;fill:#fff;}',
      '#wm-gia-modal .gia-wa{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff !important;padding:9px 16px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.8rem;}',
      '#wm-gia-modal .gia-wa svg{width:16px;height:16px;fill:#fff;}',
      '#wm-gia-modal .gia-foot{text-align:center;padding:6px;font-size:.64rem;color:#4b5563;background:#000;border-top:1px solid #1f2937;flex-shrink:0;}',
      '#wm-gia-modal .gia-foot a{color:#6b7280;text-decoration:none;}'
    ].join('');
    document.head.appendChild(sty);

    // ─── DOM ──────────────────────────────────────────────────────────────────
    var btn = document.createElement('button');
    btn.id = 'wm-gia-btn';
    btn.setAttribute('aria-label', 'Abrir asistente de ' + esc(CFG.nombre));
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 7h-3V5.5C16 4.12 14.88 3 13.5 3h-3C9.12 3 8 4.12 8 5.5V7H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V7h-4V5.5zM19 19H5V9h14v10zm-7-1c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/></svg>';

    var tip = document.createElement('div');
    tip.id = 'wm-gia-tip';
    tip.textContent = '🚗 ¿Necesitas gestionar un trámite?';

    var modal = document.createElement('div');
    modal.id = 'wm-gia-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Asistente de ' + esc(CFG.nombre));
    modal.innerHTML =
      '<div class="gia-head">'+
        '<div class="gia-hinfo">'+
          '<div class="gia-title">'+esc(CFG.nombre)+'</div>'+
          '<div class="gia-sub"><span class="gia-dot"></span>Asistente · En línea</div>'+
        '</div>'+
        '<button class="gia-close" type="button" aria-label="Cerrar">×</button>'+
      '</div>'+
      '<div class="gia-body" id="gia-body"></div>'+
      '<div class="gia-input-wrap">'+
        '<input type="text" class="gia-input" id="gia-in" placeholder="Escribe tu mensaje..." autocomplete="off">'+
        '<button class="gia-send" id="gia-send" type="button" aria-label="Enviar"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>'+
      '</div>'+
      '<div class="gia-foot">Powered by <a href="https://whitemoon.es" target="_blank" rel="noopener">WhiteMoon</a></div>';

    document.body.appendChild(btn);
    document.body.appendChild(tip);
    document.body.appendChild(modal);

    var body     = modal.querySelector('#gia-body');
    var input    = modal.querySelector('#gia-in');
    var sendBtn  = modal.querySelector('#gia-send');
    var closeBtn = modal.querySelector('.gia-close');

    // ─── ESTADO ───────────────────────────────────────────────────────────────
    // chatStep: 0=normal/menu, 1=captura nombre, 2=captura tel, 3=finalizado
    // flowStep: paso dentro del flujo activo (0..N)
    var chatStep = 0;
    var flowStep = 0;
    var activeFlow = null;
    var started = false;
    var data = {};

    // ─── HELPERS ──────────────────────────────────────────────────────────────
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function escAttr(s){ return esc(s).replace(/"/g,'&quot;'); }
    function fmtEur(n){ return Number(n).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
    function hexToRgb(hex){
      var c = (hex||'#cc0000').replace('#','');
      if(c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
      return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
    }
    function normalize(s){
      return String(s||'').toLowerCase().trim()
        .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i')
        .replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n');
    }

    function addMsg(html, who){
      var d = document.createElement('div');
      d.className = 'gia-msg gia-' + who;
      d.innerHTML = html;
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    }
    function userMsg(text){ addMsg(esc(text), 'usr'); }
    function showTyping(cb){
      var t = document.createElement('div');
      t.className = 'gia-typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
      var delay = 600 + Math.floor(Math.random() * 500);
      setTimeout(function(){
        if(t.parentNode) t.parentNode.removeChild(t);
        cb();
      }, delay);
    }
    function bot(html){ showTyping(function(){ addMsg(html, 'bot'); }); }
    function botPlain(text){ showTyping(function(){ addMsg(esc(text).replace(/\n/g,'<br>'), 'bot'); }); }

    function showOpts(opts, onPick){
      showTyping(function(){
        var d = document.createElement('div');
        d.className = 'gia-opts';
        opts.forEach(function(o){
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = o.label || o;
          b.onclick = function(){
            d.remove();
            userMsg(o.label || o);
            onPick(o.value != null ? o.value : (o.label || o));
          };
          d.appendChild(b);
        });
        body.appendChild(d);
        body.scrollTop = body.scrollHeight;
      });
    }

    function setInputState(enabled, placeholder, type){
      input.disabled = !enabled;
      sendBtn.disabled = !enabled;
      input.placeholder = placeholder || (enabled ? 'Escribe tu mensaje...' : '');
      input.type = type || 'text';
      input.value = '';
      if(enabled) setTimeout(function(){ input.focus(); }, 50);
    }

    function hideClose(){ closeBtn.classList.add('gia-hidden'); }
    function showClose(){ closeBtn.classList.remove('gia-hidden'); }

    // ─── MENÚ PRINCIPAL ───────────────────────────────────────────────────────
    var MAIN_OPTS = [
      { label:'🚗 Transferencia de vehículo', value:'transfer' },
      { label:'🧮 Calcular ITP de mi vehículo', value:'itp' },
      { label:'🔋 Coche eléctrico / Plan Moves', value:'moves' },
      { label:'🚛 Tarjeta de transporte', value:'transporte' },
      { label:'🛴 Patinete / VMP', value:'patinete' },
      { label:'📋 Otro trámite DGT', value:'otro' }
    ];

    function showMainMenu(){
      activeFlow = null;
      flowStep = 0;
      bot('¡Hola! 👋 Bienvenido/a a <b>'+esc(CFG.nombre)+'</b>.<br>¿En qué puedo ayudarte hoy?');
      showOpts(MAIN_OPTS, function(v){ routeFlow(v); });
      setInputState(true, 'O escribe tu consulta...');
    }

    function routeFlow(key){
      activeFlow = key;
      flowStep = 0;
      if(key === 'transfer')   return flowTransfer();
      if(key === 'itp')        return flowITP();
      if(key === 'moves')      return flowMoves();
      if(key === 'transporte') return flowTransporte();
      if(key === 'patinete')   return flowPatinete();
      if(key === 'otro')       return flowOtro();
    }

    // ─── FLUJO TRANSFERENCIA ──────────────────────────────────────────────────
    function flowTransfer(){
      data.tramite = 'Transferencia de vehículo';
      bot('¿Estás comprando o vendiendo el vehículo?');
      showOpts(['Comprando','Vendiendo','Los dos'], function(v){
        data.transfer_rol = v;
        bot('¿Tienes toda la documentación preparada?');
        showOpts(['Sí tengo todo','Me falta algo','No sé qué necesito'], function(d2){
          data.transfer_doc = d2;
          if(d2 === 'Sí tengo todo'){
            bot('Perfecto. Con todo listo el trámite es muy ágil ✅');
          } else {
            bot('Para una transferencia necesitas:<br>'+
              '📄 DNI de comprador y vendedor<br>'+
              '📋 Permiso de circulación original<br>'+
              '🔧 Ficha técnica del vehículo<br>'+
              '🧾 Justificante pago impuesto municipal');
          }
          setTimeout(startCapture, 1400);
        });
      });
    }

    // ─── FLUJO ITP ────────────────────────────────────────────────────────────
    function flowITP(){
      data.tramite = 'Cálculo ITP vehículo';
      bot('Vamos a calcular el ITP de tu vehículo paso a paso 🧮');
      flowStep = 1;
      setTimeout(function(){
        bot('¿Cuál es la <b>marca</b> de tu vehículo?');
        setInputState(true, 'Ej: Toyota, Seat, BMW...');
      }, 900);
    }

    function handleITPInput(text){
      if(flowStep === 1){
        data.marca = text; userMsg(text); flowStep = 2;
        bot('Genial. ¿Y el <b>modelo</b>?');
        setInputState(true, 'Ej: Corolla, Ibiza, Serie 3...');
      } else if(flowStep === 2){
        data.modelo = text; userMsg(text); flowStep = 3;
        bot('Perfecto. ¿Cuál es la <b>matrícula</b>?');
        setInputState(true, 'Ej: 1234ABC');
      } else if(flowStep === 3){
        data.matricula = text.toUpperCase(); userMsg(data.matricula); flowStep = 4;
        bot('¿En qué <b>año</b> se matriculó por primera vez?');
        setInputState(true, 'Ej: 2018', 'number');
      } else if(flowStep === 4){
        var n = parseInt(text, 10);
        if(isNaN(n) || n < 1950 || n > 2100){ bot('⚠️ Introduce un año válido.'); return; }
        data.anio = n; userMsg(String(n)); flowStep = 5;
        bot('¿Cuál es el <b>precio de compra</b>? (en euros)');
        setInputState(true, 'Ej: 12000', 'number');
      } else if(flowStep === 5){
        var p = parseFloat(text.replace(/\./g,'').replace(/,/g,'.'));
        if(isNaN(p) || p <= 0){ bot('⚠️ Introduce un precio válido.'); return; }
        data.precio = p; userMsg(fmtEur(p)); flowStep = 6;
        bot('¿En qué <b>Comunidad Autónoma</b> vas a matricularlo?');
        setInputState(false);
        showOpts(CCAA_LIST, function(ccaa){
          data.ccaa = ccaa;
          flowStep = 7;
          calcITP();
        });
      }
    }

    function calcITP(){
      var pct = ITP_TABLE[data.ccaa] || 8;
      var imp = Math.round(data.precio * pct * 100) / 10000;
      var total = imp + CFG.honorarios + CFG.tasas;
      data.itp_pct = pct;
      data.itp_imp = imp;
      data.total = total;

      var html = '📊 <b>Estimación ITP:</b><br>'+
        '🚗 '+esc(data.marca)+' '+esc(data.modelo)+' · '+esc(data.matricula)+' · '+esc(String(data.anio))+'<br>'+
        '💰 Precio: '+fmtEur(data.precio)+'<br>'+
        '🏛️ ITP ('+esc(data.ccaa)+' '+pct+'%): <b>'+fmtEur(imp)+'</b>';
      if(CFG.tasas > 0)      html += '<br>🚗 Tasas DGT: '+fmtEur(CFG.tasas);
      if(CFG.honorarios > 0) html += '<br>👔 Honorarios '+esc(CFG.nombre)+': '+fmtEur(CFG.honorarios);
      if(CFG.tasas > 0 || CFG.honorarios > 0){
        html += '<br>─────────────<br>💵 <b>TOTAL: '+fmtEur(total)+'</b>';
      }
      html += '<br><br><span class="gia-warn">⚠️ Cálculo orientativo basado en el valor del contrato. Hacienda puede aplicar el valor mínimo del vehículo si es superior al precio de compraventa. Un/a gestor/a te llamará para darte el cálculo exacto.</span>';
      bot(html);

      setTimeout(function(){
        bot('¿Quieres que gestionemos el trámite?');
        showOpts(['Sí, gestionar','Tengo dudas'], function(v){
          data.itp_decision = v;
          startCapture();
        });
      }, 1400);
    }

    // ─── FLUJO PLAN MOVES ─────────────────────────────────────────────────────
    function flowMoves(){
      data.tramite = 'Plan Moves / coche eléctrico';
      bot('El Plan Moves 2025 ofrece hasta 7.000€ de ayuda ♻️<br>¿Ya compraste el vehículo o estás pensando en comprarlo?');
      showOpts(['Ya lo compré','Pensando en comprar'], function(v){
        data.moves_estado = v;
        if(v === 'Ya lo compré'){
          bot('¿Eléctrico puro o híbrido enchufable?');
          showOpts(['Eléctrico puro','Híbrido enchufable'], function(t){
            data.moves_tipo = t;
            bot('¿Vas a achatarrar un vehículo antiguo?');
            showOpts([{label:'Sí (ayuda mayor)', value:'Sí — achatarra'},'No'], function(c){
              data.moves_achatarra = c;
              startCapture();
            });
          });
        } else {
          data.detalle = 'Asesoramiento previo';
          startCapture();
        }
      });
    }

    // ─── FLUJO TARJETA TRANSPORTE ─────────────────────────────────────────────
    function flowTransporte(){
      data.tramite = 'Tarjeta de transporte';
      bot('Gestionamos todo tipo de tarjetas de transporte 🚛<br>¿Qué necesitas?');
      showOpts(['Alta nueva','Visado/Renovación','Autorización especial','Permiso VTC','No sé'], function(v){
        data.transporte_tipo = v;
        if(v === 'Visado/Renovación'){
          bot('¿Cuándo caduca tu tarjeta?');
          showOpts(['Ya caducada (URGENTE)','Este mes','Más de 1 mes'], function(c){
            data.transporte_caducidad = c;
            startCapture();
          });
        } else {
          startCapture();
        }
      });
    }

    // ─── FLUJO PATINETE / VMP ─────────────────────────────────────────────────
    function flowPatinete(){
      data.tramite = 'Patinete / VMP';
      bot('La inscripción es OBLIGATORIA desde 2024 🛴<br>Sin inscripción: multas hasta 500€.<br>¿Ya tienes el patinete?');
      showOpts(['Sí tengo patinete','Pensando en comprar'], function(v){
        data.patinete_estado = v;
        startCapture();
      });
    }

    // ─── FLUJO OTRO TRÁMITE ───────────────────────────────────────────────────
    function flowOtro(){
      data.tramite = 'Otro trámite DGT';
      bot('Cuéntame qué necesitas y te ayudamos.');
      flowStep = 1;
      activeFlow = 'otro';
      setInputState(true, 'Describe tu trámite...');
    }

    function handleOtroInput(text){
      data.detalle = text;
      userMsg(text);
      startCapture();
    }

    // ─── KEYWORD ROUTER ───────────────────────────────────────────────────────
    function routeByKeyword(text){
      var t = normalize(text);
      var matches = [
        { kws:['transferencia','comprar','vender','compraventa','cambio nombre','titularidad'], fn:flowTransfer },
        { kws:['itp','impuesto','calcular','calculo','transmision'], fn:flowITP },
        { kws:['moves','electrico','hibrido','subvencion','ayuda','plan moves'], fn:flowMoves },
        { kws:['tarjeta','transporte','vtc','visado','autorizacion'], fn:flowTransporte },
        { kws:['patinete','vmp','scooter','monopatin'], fn:flowPatinete }
      ];
      for(var i=0;i<matches.length;i++){
        for(var j=0;j<matches[i].kws.length;j++){
          if(t.indexOf(matches[i].kws[j]) !== -1){ matches[i].fn(); return true; }
        }
      }

      if(/precio|cuanto|cuesta|honorarios|tarifa|presupuesto/.test(t)){
        bot('Nuestros honorarios dependen del trámite concreto 📋<br>'+
            'Cuéntanos qué necesitas y te damos un presupuesto sin compromiso.');
        setTimeout(function(){ showMainMenu(); }, 1400);
        return true;
      }
      if(/urgente|urgencia|caducado|multa|sancion/.test(t)){
        data.tramite = 'Trámite URGENTE';
        data.detalle = text;
        bot('Entiendo que es urgente ⚠️<br>Te contactamos lo antes posible.');
        setTimeout(startCapture, 1200);
        return true;
      }
      if(/online|email|whatsapp|telematico|distancia|digital/.test(t)){
        bot('Ofrecemos servicio completamente online 💻<br>'+
            'Documentación por email o plataforma segura, firma electrónica y gestión sin desplazamientos.');
        setTimeout(function(){ showMainMenu(); }, 1500);
        return true;
      }
      if(/donde|ubicacion|oficina|direccion|llegar/.test(t)){
        if(CFG.direccion){
          bot('📍 Nuestra dirección:<br><b>'+esc(CFG.direccion)+'</b>');
        } else {
          bot('📍 Te facilitamos la dirección al contactarte. También trabajamos 100% online.');
        }
        setTimeout(function(){ showMainMenu(); }, 1500);
        return true;
      }
      if(/^(hola|buenos|buenas|hey|hi|hello)/.test(t)){
        showMainMenu();
        return true;
      }
      return false;
    }

    // ─── CAPTURA DE LEAD ──────────────────────────────────────────────────────
    function startCapture(){
      chatStep = 1;
      hideClose();
      bot('Para contactarte sin compromiso, ¿me dices tu nombre?');
      setInputState(true, 'Tu nombre');
    }

    function handleCapture(text){
      if(chatStep === 1){
        data.nombre = text.trim();
        userMsg(data.nombre);
        chatStep = 2;
        bot('Gracias '+esc(data.nombre)+' 👋 ¿Tu teléfono de contacto? (9 dígitos)');
        setInputState(true, '612345678', 'tel');
      } else if(chatStep === 2){
        var digits = text.replace(/[^0-9]/g, '');
        if(digits.length < 9){
          bot('⚠️ El teléfono debe tener al menos 9 dígitos.');
          return;
        }
        data.telefono = digits.slice(-9);
        userMsg(data.telefono);
        finishCapture();
      }
    }

    function finishCapture(){
      chatStep = 3;
      setInputState(false, 'Conversación finalizada');

      var detalle = buildDetalle();
      var msg = '🚗 NUEVA CONSULTA — '+CFG.nombre+'\n'+
                '👤 Nombre: '+data.nombre+'\n'+
                '📞 Tel: +34'+data.telefono+'\n'+
                '📋 Trámite: '+(data.tramite || 'Consulta general')+'\n'+
                '📝 Detalle: '+detalle+'\n'+
                'Via chatbot WhiteMoon · whitemoon.es';
      var waLink = CFG.tel
        ? 'https://wa.me/34'+CFG.tel+'?text='+encodeURIComponent(msg)
        : 'https://wa.me/?text='+encodeURIComponent(msg);

      bot('¡Perfecto! ✅<br>Te contactaremos en horario de oficina.<br>Si prefieres contactar ahora:');

      setTimeout(function(){
        var wrap = document.createElement('div');
        wrap.className = 'gia-opts';
        var a = document.createElement('a');
        a.className = 'gia-wa';
        a.href = waLink;
        a.target = '_blank';
        a.rel = 'noopener';
        a.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074z"/></svg>📲 Enviar por WhatsApp';
        wrap.appendChild(a);
        var bClose = document.createElement('button');
        bClose.type = 'button';
        bClose.textContent = 'Cerrar chat';
        bClose.onclick = function(){ closeWidget(); };
        wrap.appendChild(bClose);
        body.appendChild(wrap);
        body.scrollTop = body.scrollHeight;
        showClose();
      }, 1300);
    }

    function buildDetalle(){
      var parts = [];
      if(data.transfer_rol)         parts.push('Rol: '+data.transfer_rol);
      if(data.transfer_doc)         parts.push('Doc: '+data.transfer_doc);
      if(data.marca)                parts.push('Vehículo: '+data.marca+' '+(data.modelo||''));
      if(data.matricula)            parts.push('Matrícula: '+data.matricula);
      if(data.anio)                 parts.push('Año: '+data.anio);
      if(data.precio)               parts.push('Precio: '+fmtEur(data.precio));
      if(data.ccaa)                 parts.push('CCAA: '+data.ccaa);
      if(data.itp_imp != null)      parts.push('ITP: '+fmtEur(data.itp_imp));
      if(data.total != null && data.total !== data.itp_imp) parts.push('Total: '+fmtEur(data.total));
      if(data.itp_decision)         parts.push('Decisión: '+data.itp_decision);
      if(data.moves_estado)         parts.push('Estado Moves: '+data.moves_estado);
      if(data.moves_tipo)           parts.push('Tipo: '+data.moves_tipo);
      if(data.moves_achatarra)      parts.push('Achatarra: '+data.moves_achatarra);
      if(data.transporte_tipo)      parts.push('Transporte: '+data.transporte_tipo);
      if(data.transporte_caducidad) parts.push('Caducidad: '+data.transporte_caducidad);
      if(data.patinete_estado)      parts.push('Patinete: '+data.patinete_estado);
      if(data.detalle)              parts.push(data.detalle);
      return parts.length ? parts.join(' | ') : 'Consulta general';
    }

    // ─── INPUT ────────────────────────────────────────────────────────────────
    function handleInput(text){
      text = (text || '').trim();
      if(!text) return;

      if(chatStep === 3) return;
      if(chatStep === 1 || chatStep === 2){ handleCapture(text); return; }

      if(activeFlow === 'itp' && flowStep >= 1 && flowStep <= 5){
        handleITPInput(text);
        return;
      }
      if(activeFlow === 'otro' && flowStep === 1){
        handleOtroInput(text);
        return;
      }

      userMsg(text);
      if(!routeByKeyword(text)){
        bot('No estoy seguro de haberte entendido. Elige una opción:');
        setTimeout(function(){
          showOpts(MAIN_OPTS, function(v){ routeFlow(v); });
        }, 700);
      }
    }

    // ─── INICIO / CIERRE ──────────────────────────────────────────────────────
    function openWidget(){
      modal.classList.add('wm-show');
      btn.classList.add('wm-open');
      tip.classList.remove('wm-show');
      if(!started){
        started = true;
        setTimeout(showMainMenu, 400);
      } else if(!input.disabled){
        input.focus();
      }
    }

    function closeWidget(){
      modal.classList.remove('wm-show');
      btn.classList.remove('wm-open');
    }

    btn.addEventListener('click', openWidget);
    closeBtn.addEventListener('click', closeWidget);
    sendBtn.addEventListener('click', function(){ handleInput(input.value); });
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); handleInput(input.value); }
    });

    // Aparición + tooltip
    setTimeout(function(){ btn.classList.add('wm-visible'); }, 1500);
    setTimeout(function(){
      if(!started) tip.classList.add('wm-show');
      setTimeout(function(){ tip.classList.remove('wm-show'); }, 6000);
    }, 2500);
  }
})();
