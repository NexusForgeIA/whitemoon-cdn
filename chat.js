/**
 * WHITEMOON CHATBOT — Engine v3 con flujos modulares por sector
 * <script src="https://nexusforgeia.github.io/whitemoon-cdn/chat.js" data-token="WM-XXXX"></script>
 * © WhiteMoon · whitemoon.es
 */
(function(){
  var script = document.currentScript || document.querySelector('script[data-token][src*="chat.js"]');
  if(!script) return;
  var token = script.getAttribute('data-token');
  if(!token){ console.warn('[WM-CHAT] Sin token'); return; }
  var BASE = script.src.replace(/\/chat\.js.*$/, '');

  // ─── 1. VALIDAR LICENCIA — Edge Function pública → fallback licenses.json ─────
  // La verificación se hace contra una Edge Function pública. La función usa una
  // clave de servidor (NUNCA expuesta) y responde {active,nombre,sector,pack,url}.
  // Este archivo público NO incluye ninguna credencial de Supabase.
  // licenses.json se mantiene como fallback para no interrumpir clientes instalados.
  var VERIFY_ENDPOINT = 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/verify-token';

  verifyToken();

  function verifyToken(){
    verifyEdge(token).then(function(res){
      if(res && res.active === true){
        // Activo: si el token ya existe en licenses.json usa su config rica (no
        // cambia el comportamiento de clientes ya instalados, p.ej. Bambú); si no,
        // construye config mínima con los datos de la Edge Function.
        fetchLicensesJson().then(function(licenses){
          var rich = licenses && licenses[token];
          proceed(rich || licFromEdge(res));
        });
        return;
      }
      // active === false o falló la llamada → fallback a licenses.json (comportamiento actual).
      fetchLicensesJson().then(function(licenses){
        var lic = licenses && licenses[token];
        if(!lic){ console.warn('[WM-CHAT] Token inválido'); return; }
        if(!lic.active){ console.warn('[WM-CHAT] Licencia inactiva'); return; }
        proceed(lic);
      });
    });
  }

  function verifyEdge(tk){
    return fetch(VERIFY_ENDPOINT + '?token=' + encodeURIComponent(tk))
    .then(function(r){ if(!r.ok) throw new Error('verify ' + r.status); return r.json(); })
    .then(function(data){ return data || null; })
    .catch(function(){ return null; }); // null → Edge Function no disponible → fallback
  }

  function fetchLicensesJson(){
    return fetch(BASE + '/licenses.json?_=' + Date.now())
    .then(function(r){ if(!r.ok) throw new Error('Sin conexión'); return r.json(); })
    .then(function(data){ return data.licenses || {}; })
    .catch(function(){ return null; });
  }

  function licFromEdge(res){
    var agentEndpoint = res.agente_edge_function || '';
    var aiPrompt = res.agente_system_prompt || '';
    return {
      biz: res.nombre || '', domain: res.url || '', pack: res.pack || '', template: res.sector || '',
      active: true, _source: 'edge',
      agentEndpoint: agentEndpoint,        // '' → ai-claude usa la Edge Function por defecto
      aiPrompt: aiPrompt,
      aiEnabled: !!(aiPrompt || agentEndpoint)  // cliente Laura si tiene prompt o endpoint propio
    };
  }

  function proceed(lic){
    var host = window.location.hostname;
    var local = host === 'localhost' || host === '127.0.0.1' || host === '' || host.includes('github.io');
    if(!local && lic.domain && !host.includes(lic.domain)){ console.warn('[WM-CHAT] Dominio no autorizado'); return; }
    if(lic.expires && new Date(lic.expires) < new Date()){ console.warn('[WM-CHAT] Licencia expirada'); return; }

    if(lic.template){
      fetch(BASE + '/templates/' + lic.template + '.json?_=' + Date.now())
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(tpl){ boot(script, lic, tpl || null); })
      .catch(function(){ boot(script, lic, null); });
    } else {
      boot(script, lic, null);
    }
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  function parseServices(str){
    if(!str || !str.trim()) return null;
    var arr = str.split(',').map(function(s){ return s.trim(); }).filter(function(s){ return s; });
    return arr.length ? arr : null;
  }
  function mergeResponses(tplResp, licResp){
    var out = {};
    if(tplResp){ Object.keys(tplResp).forEach(function(k){ if(!k.startsWith('_')) out[k] = tplResp[k]; }); }
    if(licResp){ Object.keys(licResp).forEach(function(k){ if(!k.startsWith('_')) out[k] = licResp[k]; }); }
    return out;
  }
  function normalize(s){
    return String(s||'').toLowerCase().trim()
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i')
      .replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n');
  }
  function matchKeyword(text, responses){
    var t = normalize(text);
    var keys = Object.keys(responses);
    for(var i = 0; i < keys.length; i++){
      if(keys[i].charAt(0) === '_') continue;
      var parts = keys[i].split(',');
      for(var j = 0; j < parts.length; j++){
        var kw = normalize(parts[j]);
        if(kw && t.indexOf(kw) !== -1) return responses[keys[i]];
      }
    }
    return null;
  }
  function replaceVars(text, vars){
    return String(text||'').replace(/\{(\w+)\}/g, function(_, k){ return vars[k] !== undefined ? vars[k] : ''; });
  }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
  function hexToRgb(hex){
    var c = (hex||'#7c3aed').replace('#','');
    if(c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
  }

  // ─── BOOT ───────────────────────────────────────────────────────────────────
  function boot(el, lic, tpl){
    var tplResp = tpl && tpl.responses ? tpl.responses : null;
    var licResp = lic.responses || null;
    var cfg = {
      botName:    el.getAttribute('data-bot-name') || lic.botName || (tpl && tpl.botName) || 'Asistente',
      color:      el.getAttribute('data-color')    || lic.color   || (tpl && tpl.color)   || '#7c3aed',
      greeting:   lic.greeting || (tpl && tpl.greeting) || '¡Hola! 👋 ¿En qué puedo ayudarte?',
      tel:        (lic.phone || '').replace(/[^0-9]/g, ''),
      biz:        lic.biz || '',
      serviceButtons: parseServices(el.getAttribute('data-services')) || lic.serviceButtons || (tpl && tpl.serviceButtons) || [],
      responses:  mergeResponses(tplResp, licResp),
      askName:    (licResp && licResp._ask_name)  || (tplResp && tplResp._ask_name)  || 'Para continuar, ¿me dices tu nombre?',
      askPhone:   (licResp && licResp._ask_phone) || (tplResp && tplResp._ask_phone) || 'Gracias {nombre} 👋 ¿Tu teléfono de contacto? (9 dígitos)',
      summary:    (licResp && licResp._summary)   || (tplResp && tplResp._summary)   || 'Perfecto {nombre}. Te contactamos en breve.',
      template:   lic.template || '',
      token:      token,
      aiEnabled:  !!lic.aiEnabled,
      agentEndpoint: lic.agentEndpoint || '',  // Edge Function propia del cliente ('' = por defecto)
      aiPrompt:   lic.aiPrompt || ''
    };

    var widget = buildWidget(cfg);
    var flowName = lic.template || 'generic';
    if (lic.aiEnabled) {
      loadFlow('ai-claude', widget, cfg);
      return;
    }
    loadFlow(flowName, widget, cfg);
  }

  function loadFlow(name, widget, cfg){
    var s = document.createElement('script');
    s.src = BASE + '/chat-flows/' + name + '.js?_=' + Date.now();
    s.onload = function(){
      if(window.WMFlow && typeof window.WMFlow.init === 'function'){
        try { window.WMFlow.init(cfg, widget); }
        catch(e){ console.error('[WM-CHAT] flow init', e); }
      }
    };
    s.onerror = function(){
      if(name !== 'generic'){ loadFlow('generic', widget, cfg); }
      else { console.error('[WM-CHAT] No se pudo cargar el flujo'); }
    };
    document.head.appendChild(s);
  }

  // ─── WIDGET ─────────────────────────────────────────────────────────────────
  function buildWidget(cfg){
    var rgb = hexToRgb(cfg.color);
    var colorLight = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.12)';
    var colorMid   = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.25)';

    var sty = document.createElement('style');
    sty.textContent = [
      '#wm-chat-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:'+cfg.color+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.35);z-index:9999;opacity:0;transition:opacity .4s,transform .2s;}',
      '#wm-chat-btn.wm-visible{opacity:1;}',
      '#wm-chat-btn:hover{transform:scale(1.08);}',
      '#wm-chat-btn svg{width:26px;height:26px;fill:#fff;}',
      '@keyframes wm-pulse{0%,100%{box-shadow:0 4px 20px rgba(0,0,0,.35)}50%{box-shadow:0 4px 28px '+colorMid+',0 0 0 8px '+colorLight+'}}',
      '#wm-chat-btn.wm-visible{animation:wm-pulse 4s ease-in-out infinite;}',
      '#wm-chat-btn.wm-open{display:none;}',
      '#wm-chat-btn::after{content:"¿En qué podemos ayudarte?";position:absolute;right:66px;bottom:50%;transform:translateY(50%);background:#1a1a2e;color:#fff;font-size:12px;font-family:system-ui,sans-serif;white-space:nowrap;padding:6px 10px;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .2s;}',
      '#wm-chat-btn:hover::after{opacity:1;}',
      '#wm-chat-modal{position:fixed;bottom:90px;right:20px;width:360px;height:520px;background:#1a1a2e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:9998;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;}',
      '#wm-chat-modal.wm-show{display:flex;}',
      '@media(max-width:600px){#wm-chat-modal{bottom:0;right:0;width:100vw;height:80vh;border-radius:16px 16px 0 0;}}',
      '#wm-chat-modal .wm-header{background:'+cfg.color+';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
      '#wm-chat-modal .wm-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}',
      '#wm-chat-modal .wm-hinfo{flex:1;min-width:0;}',
      '#wm-chat-modal .wm-hname{color:#fff;font-weight:700;font-size:.88rem;}',
      '#wm-chat-modal .wm-hstatus{color:rgba(255,255,255,.8);font-size:.7rem;display:flex;align-items:center;gap:4px;}',
      '#wm-chat-modal .wm-hdot{width:7px;height:7px;background:#4ade80;border-radius:50%;display:inline-block;}',
      '#wm-chat-modal .wm-close{background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;padding:4px;line-height:1;opacity:.85;}',
      '#wm-chat-modal .wm-close:hover{opacity:1;}',
      '#wm-chat-modal .wm-close.wm-hidden{display:none;}',
      '#wm-chat-modal .wm-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;}',
      '#wm-chat-modal .wm-msgs::-webkit-scrollbar{width:4px;}',
      '#wm-chat-modal .wm-msgs::-webkit-scrollbar-thumb{background:#2a2a4e;border-radius:2px;}',
      '.wm-msg{max-width:82%;font-size:.83rem;line-height:1.45;padding:9px 13px;word-break:break-word;}',
      '.wm-msg.wm-bot{background:#2a2a4e;color:#e0e0ff;border-radius:12px 12px 12px 4px;align-self:flex-start;}',
      '.wm-msg.wm-usr{background:'+cfg.color+';color:#fff;border-radius:12px 12px 4px 12px;align-self:flex-end;}',
      '.wm-typing{display:flex;gap:5px;padding:12px 14px;background:#2a2a4e;border-radius:12px 12px 12px 4px;align-self:flex-start;align-items:center;}',
      '.wm-typing span{width:7px;height:7px;background:#7c7caa;border-radius:50%;animation:wm-dot 1.2s ease-in-out infinite;}',
      '.wm-typing span:nth-child(2){animation-delay:.2s;}',
      '.wm-typing span:nth-child(3){animation-delay:.4s;}',
      '@keyframes wm-dot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}',
      '#wm-chat-modal .wm-opts{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px;align-self:flex-start;max-width:100%;}',
      '#wm-chat-modal .wm-opts button{background:transparent;color:#e0e0ff;border:1px solid '+colorMid+';border-radius:18px;padding:7px 13px;font-size:.76rem;font-family:inherit;cursor:pointer;transition:background .15s,color .15s;white-space:normal;}',
      '#wm-chat-modal .wm-opts button:hover{background:'+cfg.color+';color:#fff;border-color:'+cfg.color+';}',
      '#wm-chat-modal .wm-input-wrap{padding:10px 12px;background:#111827;display:flex;gap:8px;flex-shrink:0;border-top:1px solid #2a2a4e;}',
      '#wm-chat-modal .wm-input{flex:1;background:#1f2937;border:1px solid #374151;border-radius:10px;padding:9px 12px;color:#fff;font-size:.83rem;font-family:inherit;outline:none;}',
      '#wm-chat-modal .wm-input:focus{border-color:'+cfg.color+';}',
      '#wm-chat-modal .wm-send{background:'+cfg.color+';border:none;border-radius:10px;padding:9px 14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}',
      '#wm-chat-modal .wm-send:hover{opacity:.85;}',
      '#wm-chat-modal .wm-send svg{width:18px;height:18px;fill:#fff;}',
      '#wm-chat-modal .wm-warn{display:block;margin-top:6px;padding:8px 10px;background:rgba(245,158,11,.1);border-left:3px solid #f59e0b;border-radius:4px;color:#fbbf24;font-size:.72rem;line-height:1.4;font-style:italic;}',
      '#wm-chat-modal .wm-final{margin-top:8px;padding:16px;border-radius:12px;background:linear-gradient(135deg,rgba('+rgb.r+','+rgb.g+','+rgb.b+',.22) 0%,rgba('+rgb.r+','+rgb.g+','+rgb.b+',.06) 100%);border:1px solid '+colorMid+';color:#f1f5f9;align-self:stretch;}',
      '#wm-chat-modal .wm-final-title{font-size:.95rem;font-weight:700;margin-bottom:8px;color:#fff;}',
      '#wm-chat-modal .wm-final-text{font-size:.82rem;line-height:1.5;color:#e5e7eb;margin-bottom:10px;}',
      '#wm-chat-modal .wm-final-cta{font-size:.78rem;color:#cbd5e1;margin-bottom:10px;text-align:center;}',
      '#wm-chat-modal .wm-final-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#25D366;color:#fff;padding:13px 14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:.9rem;box-shadow:0 4px 14px rgba(37,211,102,.35);transition:transform .15s,box-shadow .15s;}',
      '#wm-chat-modal .wm-final-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(37,211,102,.5);}',
      '#wm-chat-modal .wm-final-btn svg{width:20px;height:20px;fill:#fff;flex-shrink:0;}',
      '#wm-chat-modal .wm-final-foot{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);text-align:center;font-size:.76rem;color:#cbd5e1;}',
      '#wm-chat-modal .wm-powered{text-align:center;padding:4px 0 8px;font-size:.6rem;color:#4a4a6a;}',
      '#wm-chat-modal .wm-powered a{color:#6a6a9a;text-decoration:none;}'
    ].join('');
    document.head.appendChild(sty);

    var btn = document.createElement('button');
    btn.id = 'wm-chat-btn';
    btn.setAttribute('aria-label', 'Abrir chat');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';

    var modal = document.createElement('div');
    modal.id = 'wm-chat-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Chat con ' + escapeHtml(cfg.botName));
    modal.innerHTML = [
      '<div class="wm-header">',
        '<div class="wm-avatar">💬</div>',
        '<div class="wm-hinfo">',
          '<div class="wm-hname">' + escapeHtml(cfg.botName) + '</div>',
          '<div class="wm-hstatus"><span class="wm-hdot"></span> En línea</div>',
        '</div>',
        '<button class="wm-close" aria-label="Cerrar chat">×</button>',
      '</div>',
      '<div class="wm-msgs" id="wm-msgs"></div>',
      '<div class="wm-input-wrap">',
        '<input type="text" class="wm-input" id="wm-input" placeholder="Escribe tu mensaje..." autocomplete="off">',
        '<button class="wm-send" id="wm-send" aria-label="Enviar">',
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
        '</button>',
      '</div>',
      '<div class="wm-powered">Powered by <a href="https://whitemoon.es" target="_blank">WhiteMoon</a></div>'
    ].join('');

    document.body.appendChild(btn);
    document.body.appendChild(modal);

    var msgsEl  = modal.querySelector('#wm-msgs');
    var inputEl = modal.querySelector('#wm-input');
    var sendBtn = modal.querySelector('#wm-send');
    var closeBtn= modal.querySelector('.wm-close');

    // ─── ESTADO COMPARTIDO ────────────────────────────────────────────────────
    var inputHandler = null;
    var captureCtx   = null;     // {step: 1=name, 2=phone, opts}
    var started      = false;
    var leadData     = {};

    // ─── PRIMITIVAS ───────────────────────────────────────────────────────────
    function addBot(html){
      var d = document.createElement('div');
      d.className = 'wm-msg wm-bot';
      d.innerHTML = html;
      msgsEl.appendChild(d);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return d;
    }
    function addUser(text){
      var d = document.createElement('div');
      d.className = 'wm-msg wm-usr';
      d.innerHTML = escapeHtml(text);
      msgsEl.appendChild(d);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return d;
    }
    function showTyping(cb){
      var t = document.createElement('div');
      t.className = 'wm-typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      msgsEl.appendChild(t);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      var delay = 600 + Math.floor(Math.random() * 500);
      setTimeout(function(){
        if(t.parentNode) t.parentNode.removeChild(t);
        cb();
      }, delay);
    }
    function bot(html, cb){ showTyping(function(){ addBot(html); if(cb) cb(); }); }
    function botText(text, cb){ bot(escapeHtml(text).replace(/\n/g,'<br>'), cb); }

    function showOpts(opts, onPick){
      var wrap = document.createElement('div');
      wrap.className = 'wm-opts';
      opts.forEach(function(o){
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = o.label;
        b.addEventListener('click', function(){
          if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
          addUser(o.label);
          onPick(o);
        });
        wrap.appendChild(b);
      });
      msgsEl.appendChild(wrap);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function setInput(enabled, placeholder, type){
      inputEl.disabled = !enabled;
      sendBtn.disabled = !enabled;
      inputEl.placeholder = placeholder || (enabled ? 'Escribe tu mensaje...' : '');
      inputEl.type = type || 'text';
      inputEl.value = '';
      if(enabled) setTimeout(function(){ inputEl.focus(); }, 50);
    }
    function onInput(fn){ inputHandler = fn; }
    function onInputOnce(fn){
      var prev = inputHandler;
      inputHandler = function(text){
        var ok = fn(text);
        if(ok !== false) inputHandler = prev;
      };
    }

    function hideClose(){ closeBtn.classList.add('wm-hidden'); }
    function showCloseBtn(){ closeBtn.classList.remove('wm-hidden'); }

    function openChat(initFn){
      modal.classList.add('wm-show');
      btn.classList.add('wm-open');
      if(!started){ started = true; if(initFn) initFn(); }
      else if(!inputEl.disabled){ inputEl.focus(); }
    }
    function closeChat(){
      modal.classList.remove('wm-show');
      btn.classList.remove('wm-open');
    }

    // ─── flow(): runner declarativo ───────────────────────────────────────────
    function flow(steps, onDone){
      var idx = 0;
      var data = {};
      function next(){
        if(idx >= steps.length){ onDone(data); return; }
        var s = steps[idx];
        bot(s.msg, function(){
          if(s.input){
            setInput(true, s.placeholder || '', s.type || 'text');
            onInputOnce(function(text){
              text = (text || '').trim();
              if(!text) return false;
              if(s.validate){
                var ok = s.validate(text);
                if(ok !== true){ if(typeof ok === 'string') botText(ok); return false; }
              }
              data[s.key || ('step'+idx)] = text;
              addUser(text);
              idx++; next();
              return true;
            });
          } else {
            setInput(false);
            var opts = (s.opts || []).map(function(o){
              return typeof o === 'string' ? { label: o, value: o } : o;
            });
            showOpts(opts, function(o){
              if(typeof o.action === 'function'){ o.action(data); return; }
              data[s.key || ('step'+idx)] = o.value != null ? o.value : (o.label || '');
              if(s.tag) data[s.tag] = o.tag || data[s.key];
              idx++; next();
            });
          }
        });
      }
      next();
    }

    // ─── CAPTURA + FINISH ─────────────────────────────────────────────────────
    function startCapture(opts){
      opts = opts || {};
      captureCtx = { step: 1, opts: opts };
      if(opts.tramite)   leadData.tramite = opts.tramite;
      if(opts.prioridad) leadData.prioridad = opts.prioridad;
      if(opts.detalle)   leadData.detalle = opts.detalle;
      hideClose();
      bot(escapeHtml(opts.askName || cfg.askName), function(){
        setInput(true, 'Tu nombre');
      });
    }
    function handleCaptureInput(text){
      if(!captureCtx) return;
      if(captureCtx.step === 1){
        leadData.nombre = text.trim();
        addUser(leadData.nombre);
        captureCtx.step = 2;
        var ph = replaceVars(captureCtx.opts.askPhone || cfg.askPhone, { nombre: leadData.nombre });
        bot(escapeHtml(ph), function(){
          setInput(true, '612345678', 'tel');
        });
      } else if(captureCtx.step === 2){
        var digits = text.replace(/[^0-9]/g, '');
        if(digits.length < 9){ botText('⚠️ El teléfono debe tener al menos 9 dígitos.'); return; }
        leadData.telefono = digits.slice(-9);
        addUser(leadData.telefono);
        finishCapture(captureCtx.opts || {});
      }
    }

    function buildDetalle(extra){
      var src = extra || leadData.detalle;
      if(!src) return 'Consulta general';
      if(typeof src === 'string') return src;
      var parts = [];
      Object.keys(src).forEach(function(k){
        if(k.charAt(0) === '_') return;
        parts.push(k + ': ' + src[k]);
      });
      return parts.length ? parts.join(' | ') : 'Consulta general';
    }

    function finishCapture(opts){
      opts = opts || {};
      captureCtx = null;
      setInput(false, 'Conversación finalizada');

      var detalle = buildDetalle(opts.detalle);
      var prioridad = opts.prioridad || leadData.prioridad || '';
      var tramite = opts.tramite || leadData.tramite || 'Consulta general';

      var defaultTpl = '📋 NUEVA CONSULTA — {botName}\n━━━━━━━━━━━━━━━\n👤 {nombre} · 📱 +34{telefono}\n📋 {tramite}{prioridadLine}\n📝 Detalle: {detalle}\n━━━━━━━━━━━━━━━\nVia chatbot WhiteMoon · whitemoon.es';
      var tpl = opts.waTemplate || defaultTpl;
      var msg = replaceVars(tpl, {
        botName:  cfg.botName,
        biz:      cfg.biz,
        nombre:   leadData.nombre,
        telefono: leadData.telefono,
        tramite:  tramite,
        prioridad: prioridad,
        prioridadLine: prioridad ? '\n🚨 Prioridad: ' + prioridad : '',
        detalle:  detalle
      });
      var waLink = cfg.tel
        ? 'https://wa.me/34'+cfg.tel+'?text='+encodeURIComponent(msg)
        : 'https://wa.me/?text='+encodeURIComponent(msg);

      var fin = opts.finish || {};
      var agente = opts.agent || fin.agent || 'gestor/a';
      var title = replaceVars(fin.title || '✅ ¡Perfecto, {nombre}!', { nombre: leadData.nombre });
      var text  = replaceVars(fin.text  || 'Un/a {agent} recibirá tus datos y te llamará en menos de 1 hora para informarte sobre toda la gestión y el trámite.', { nombre: leadData.nombre, agent: agente });
      var cta   = fin.cta || '👇 Pulsa para confirmar tu solicitud';
      var btnLb = fin.btn || '📲 Confirmar solicitud';
      var foot  = fin.foot || '🌟 ¡Que tengas un excelente día!';

      showTyping(function(){
        var card = document.createElement('div');
        card.className = 'wm-final';
        var html = '<div class="wm-final-title">'+escapeHtml(title)+'</div>'+
                   '<div class="wm-final-text">'+escapeHtml(text)+'</div>';
        if(cta) html += '<div class="wm-final-cta">'+escapeHtml(cta)+'</div>';
        html += '<a class="wm-final-btn" href="'+escAttr(waLink)+'" target="_blank" rel="noopener">'+
                  '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074z"/></svg>'+
                  escapeHtml(btnLb)+
                '</a>';
        if(foot) html += '<div class="wm-final-foot">'+escapeHtml(foot)+'</div>';
        card.innerHTML = html;
        msgsEl.appendChild(card);
        msgsEl.scrollTop = msgsEl.scrollHeight;
        showCloseBtn();
      });
    }

    // ─── INPUT GLOBAL ─────────────────────────────────────────────────────────
    sendBtn.addEventListener('click', function(){ dispatch(inputEl.value); });
    inputEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); dispatch(inputEl.value); }
    });
    function dispatch(text){
      text = (text || '').trim();
      if(!text) return;
      inputEl.value = '';
      if(captureCtx){ handleCaptureInput(text); return; }
      if(typeof inputHandler === 'function'){ inputHandler(text); return; }
    }

    btn.addEventListener('click', function(){ openChat(api._onOpen); });
    closeBtn.addEventListener('click', closeChat);
    setTimeout(function(){ btn.classList.add('wm-visible'); }, 1500);

    // ─── API EXPUESTA ─────────────────────────────────────────────────────────
    var api = {
      cfg: cfg,
      addBot: addBot,
      addUser: addUser,
      bot: bot,
      botText: botText,
      showTyping: showTyping,
      showOpts: showOpts,
      flow: flow,
      setInput: setInput,
      onInput: onInput,
      onInputOnce: onInputOnce,
      hideClose: hideClose,
      showClose: showCloseBtn,
      closeWidget: closeChat,
      startCapture: startCapture,
      finishCapture: finishCapture,
      data: leadData,
      utils: { normalize: normalize, matchKeyword: matchKeyword, replaceVars: replaceVars, escapeHtml: escapeHtml },
      _onOpen: null
    };
    api.onOpen = function(fn){ api._onOpen = fn; };
    return api;
  }
})();
