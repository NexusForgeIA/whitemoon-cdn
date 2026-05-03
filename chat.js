/**
 * WHITEMOON CHATBOT — Engine con soporte plantillas sectoriales
 * <script src="https://nexusforgeia.github.io/whitemoon-cdn/chat.js" data-token="WM-XXXX"></script>
 * © WhiteMoon · whitemoon.es
 */
(function(){
  var script = document.currentScript || document.querySelector('script[data-token][src*="chat.js"]');
  if(!script) return;
  var token = script.getAttribute('data-token');
  if(!token){ console.warn('[WM-CHAT] Sin token'); return; }
  var BASE = script.src.replace(/\/chat\.js.*$/, '');

  // ─── 1. VALIDAR LICENCIA ───────────────────────────────────────────────────
  fetch(BASE + '/licenses.json?_=' + Date.now())
  .then(function(r){ if(!r.ok) throw new Error('Sin conexión'); return r.json(); })
  .then(function(data){
    var lic = data.licenses[token];
    if(!lic){ console.warn('[WM-CHAT] Token inválido'); return; }
    if(!lic.active){ console.warn('[WM-CHAT] Licencia inactiva'); return; }

    var host = window.location.hostname;
    var local = host === 'localhost' || host === '127.0.0.1' || host === '' || host.includes('github.io');
    if(!local && lic.domain && !host.includes(lic.domain)){ console.warn('[WM-CHAT] Dominio no autorizado'); return; }
    if(lic.expires && new Date(lic.expires) < new Date()){ console.warn('[WM-CHAT] Licencia expirada'); return; }

    // ─── 2. CARGAR PLANTILLA SI EXISTE ──────────────────────────────────────
    if(lic.template){
      fetch(BASE + '/templates/' + lic.template + '.json?_=' + Date.now())
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(tpl){ initChatbot(script, lic, tpl || null); })
      .catch(function(){ initChatbot(script, lic, null); });
    } else {
      initChatbot(script, lic, null);
    }
  })
  .catch(function(e){ console.error('[WM-CHAT]', e); });

  // ─── HELPERS ──────────────────────────────────────────────────────────────

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

  function matchKeyword(text, responses){
    var t = text.toLowerCase().trim();
    var keys = Object.keys(responses);
    for(var i = 0; i < keys.length; i++){
      var parts = keys[i].split(',');
      for(var j = 0; j < parts.length; j++){
        var kw = parts[j].trim().toLowerCase();
        if(kw && t.indexOf(kw) !== -1) return responses[keys[i]];
      }
    }
    return null;
  }

  function replaceVars(text, vars){
    return text.replace(/\{(\w+)\}/g, function(_, k){ return vars[k] !== undefined ? vars[k] : '{' + k + '}'; });
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function hexToRgb(hex){
    var c = (hex||'#7c3aed').replace('#','');
    if(c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
  }

  // ─── 3. INIT CHATBOT ──────────────────────────────────────────────────────
  function initChatbot(el, lic, tpl){
    var tplResp = tpl && tpl.responses ? tpl.responses : null;
    var licResp = lic.responses || null;

    var cfg = {
      botName:  el.getAttribute('data-bot-name') || lic.botName || (tpl && tpl.botName) || 'Asistente',
      color:    el.getAttribute('data-color')    || lic.color   || (tpl && tpl.color)   || '#7c3aed',
      greeting: lic.greeting || (tpl && tpl.greeting) || '¡Hola! 👋 Bienvenido/a. ¿En qué puedo ayudarte?',
      phone:    lic.phone    || '',
      biz:      lic.biz      || '',
      buttons:  parseServices(el.getAttribute('data-services')) || lic.serviceButtons || (tpl && tpl.serviceButtons) || [],
      responses: mergeResponses(tplResp, licResp),
      askName:  (licResp && licResp._ask_name)  || (tplResp && tplResp._ask_name)  || '¿Me dices tu nombre y apellidos?',
      askPhone: (licResp && licResp._ask_phone) || (tplResp && tplResp._ask_phone) || 'Perfecto {nombre}. ¿Un teléfono de contacto?',
      summary:  (licResp && licResp._summary)   || (tplResp && tplResp._summary)   || 'Perfecto {nombre}. He tomado nota y nuestro equipo te contactará pronto.',
      goodbye:  (licResp && licResp._goodbye)   || (tplResp && tplResp._goodbye)   || '¡Hasta pronto! 👋',
      hasCalendar: lic.calendar !== false,
      whatsapp:  (lic.phone || '').replace(/[^0-9]/g, '')
    };

    var rgb = hexToRgb(cfg.color);
    var colorLight = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.12)';
    var colorMid   = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.25)';
    var colorDark  = 'rgba('+Math.max(0,rgb.r-30)+','+Math.max(0,rgb.g-30)+','+Math.max(0,rgb.b-30)+',1)';

    // ─── CSS ────────────────────────────────────────────────────────────────
    var sty = document.createElement('style');
    sty.textContent = [
      /* botón flotante */
      '#wm-chat-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:'+cfg.color+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.35);z-index:9999;opacity:0;transition:opacity .4s,transform .2s;}',
      '#wm-chat-btn.wm-visible{opacity:1;}',
      '#wm-chat-btn:hover{transform:scale(1.08);}',
      '#wm-chat-btn svg{width:26px;height:26px;fill:#fff;}',
      '@keyframes wm-pulse{0%,100%{box-shadow:0 4px 20px rgba(0,0,0,.35)}50%{box-shadow:0 4px 28px '+colorMid+',0 0 0 8px '+colorLight+'}}',
      '#wm-chat-btn.wm-visible{animation:wm-pulse 4s ease-in-out infinite;}',
      '#wm-chat-btn.wm-open{display:none;}',
      /* tooltip */
      '#wm-chat-btn::after{content:"¿En qué podemos ayudarte?";position:absolute;right:66px;bottom:50%;transform:translateY(50%);background:#1a1a2e;color:#fff;font-size:12px;font-family:system-ui,sans-serif;white-space:nowrap;padding:6px 10px;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .2s;}',
      '#wm-chat-btn:hover::after{opacity:1;}',
      /* modal */
      '#wm-chat-modal{position:fixed;bottom:90px;right:20px;width:360px;height:520px;background:#1a1a2e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:9998;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;}',
      '#wm-chat-modal.wm-show{display:flex;}',
      '@media(max-width:600px){#wm-chat-modal{bottom:0;right:0;width:100vw;height:80vh;border-radius:16px 16px 0 0;}}',
      /* header */
      '#wm-chat-modal .wm-header{background:'+cfg.color+';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
      '#wm-chat-modal .wm-header .wm-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}',
      '#wm-chat-modal .wm-header .wm-hinfo{flex:1;}',
      '#wm-chat-modal .wm-header .wm-hname{color:#fff;font-weight:700;font-size:.88rem;}',
      '#wm-chat-modal .wm-header .wm-hstatus{color:rgba(255,255,255,.8);font-size:.7rem;display:flex;align-items:center;gap:4px;}',
      '#wm-chat-modal .wm-header .wm-hdot{width:7px;height:7px;background:#4ade80;border-radius:50%;display:inline-block;}',
      '#wm-chat-modal .wm-header .wm-close{background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;padding:4px;line-height:1;opacity:.8;}',
      '#wm-chat-modal .wm-header .wm-close:hover{opacity:1;}',
      /* mensajes */
      '#wm-chat-modal .wm-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;}',
      '#wm-chat-modal .wm-msgs::-webkit-scrollbar{width:4px;}',
      '#wm-chat-modal .wm-msgs::-webkit-scrollbar-thumb{background:#2a2a4e;border-radius:2px;}',
      '.wm-msg{max-width:82%;font-size:.83rem;line-height:1.45;padding:9px 13px;word-break:break-word;}',
      '.wm-msg.wm-bot{background:#2a2a4e;color:#e0e0ff;border-radius:12px 12px 12px 4px;align-self:flex-start;}',
      '.wm-msg.wm-usr{background:'+cfg.color+';color:#fff;border-radius:12px 12px 4px 12px;align-self:flex-end;}',
      /* typing */
      '.wm-typing{display:flex;gap:5px;padding:12px 14px;background:#2a2a4e;border-radius:12px 12px 12px 4px;align-self:flex-start;align-items:center;}',
      '.wm-typing span{width:7px;height:7px;background:#7c7caa;border-radius:50%;animation:wm-dot 1.2s ease-in-out infinite;}',
      '.wm-typing span:nth-child(2){animation-delay:.2s;}',
      '.wm-typing span:nth-child(3){animation-delay:.4s;}',
      '@keyframes wm-dot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}',
      /* botones rápidos */
      '#wm-chat-modal .wm-btns{padding:4px 12px 8px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;}',
      '#wm-chat-modal .wm-btns button{background:'+colorLight+';color:#ffffff;border:1px solid '+colorMid+';border-radius:20px;padding:6px 13px;font-size:.75rem;font-family:inherit;cursor:pointer;white-space:nowrap;transition:background .15s;}',
      '#wm-chat-modal .wm-btns button:hover{background:'+colorMid+';}',
      /* input */
      '#wm-chat-modal .wm-input-wrap{padding:10px 12px;background:#111827;display:flex;gap:8px;flex-shrink:0;border-top:1px solid #2a2a4e;}',
      '#wm-chat-modal .wm-input{flex:1;background:#1f2937;border:1px solid #374151;border-radius:10px;padding:9px 12px;color:#fff;font-size:.83rem;font-family:inherit;outline:none;resize:none;max-height:80px;line-height:1.4;}',
      '#wm-chat-modal .wm-input:focus{border-color:'+cfg.color+';}',
      '#wm-chat-modal .wm-send{background:'+cfg.color+';border:none;border-radius:10px;padding:9px 14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}',
      '#wm-chat-modal .wm-send:hover{opacity:.85;}',
      '#wm-chat-modal .wm-send svg{width:18px;height:18px;fill:#fff;}',
      /* botón WA */
      '.wm-wa-btn{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-size:.82rem;font-weight:600;margin-top:4px;transition:opacity .15s;}',
      '.wm-wa-btn:hover{opacity:.88;}',
      '.wm-wa-btn svg{width:18px;height:18px;fill:#fff;flex-shrink:0;}',
      /* powered */
      '#wm-chat-modal .wm-powered{text-align:center;padding:4px 0 8px;font-size:.6rem;color:#4a4a6a;}',
      '#wm-chat-modal .wm-powered a{color:#6a6a9a;text-decoration:none;}'
    ].join('');
    document.head.appendChild(sty);

    // ─── DOM ────────────────────────────────────────────────────────────────
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
      '<div class="wm-btns" id="wm-btns"></div>',
      '<div class="wm-input-wrap">',
        '<textarea class="wm-input" id="wm-input" placeholder="Escribe tu mensaje..." rows="1"></textarea>',
        '<button class="wm-send" id="wm-send" aria-label="Enviar">',
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
        '</button>',
      '</div>',
      '<div class="wm-powered">Powered by <a href="https://whitemoon.es" target="_blank">WhiteMoon</a></div>'
    ].join('');

    document.body.appendChild(btn);
    document.body.appendChild(modal);

    // ─── ESTADO CONVERSACIONAL ───────────────────────────────────────────────
    var state = 0;        // 0=bienvenida, 1=conversación, 2=captura
    var captureStep = 0;  // 0=askName, 1=askPhone, 2=summary, 3=goodbye
    var userName = '';
    var userPhone = '';
    var lastService = '';
    var buttonsShown = false;
    var CAPTURE_TRIGGERS = 'cita,reserva,contacto,llamar,llamada,precio,presupuesto,quiero,información,info,consulta';

    var msgsEl   = document.getElementById('wm-msgs');
    var btnsEl   = document.getElementById('wm-btns');
    var inputEl  = document.getElementById('wm-input');
    var sendBtn  = document.getElementById('wm-send');

    function addMsg(text, who){
      var d = document.createElement('div');
      d.className = 'wm-msg wm-' + who;
      d.innerHTML = text.replace(/\n/g, '<br>');
      msgsEl.appendChild(d);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return d;
    }

    function showTyping(cb){
      var delay = 600 + Math.floor(Math.random() * 600);
      var t = document.createElement('div');
      t.className = 'wm-typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      msgsEl.appendChild(t);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      setTimeout(function(){
        if(t.parentNode) t.parentNode.removeChild(t);
        cb();
      }, delay);
    }

    function botSay(text){
      showTyping(function(){ addMsg(escapeHtml(text), 'bot'); });
    }

    function buildWaLink(nombre, telefono, servicio){
      var num = '34' + cfg.whatsapp;
      var msg = '🔔 *Nueva consulta - ' + cfg.biz + '*\n\n' +
                '👤 *Nombre:* ' + nombre + '\n' +
                '📞 *Tel:* +34' + telefono + '\n' +
                '💬 *Servicio:* ' + (servicio || 'Consulta general') + '\n\n' +
                '_Via chatbot WhiteMoon_';
      return 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
    }

    function showWaButton(nombre, telefono, servicio){
      if(!cfg.whatsapp) return;
      showTyping(function(){
        var d = document.createElement('div');
        d.className = 'wm-msg wm-bot';
        d.style.background = 'transparent';
        d.style.padding = '0';
        var a = document.createElement('a');
        a.className = 'wm-wa-btn';
        a.href = buildWaLink(nombre, telefono, servicio);
        a.target = '_blank';
        a.rel = 'noopener';
        a.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>' +
                      'Escríbenos por WhatsApp';
        d.appendChild(a);
        msgsEl.appendChild(d);
        msgsEl.scrollTop = msgsEl.scrollHeight;
      });
    }

    function hideButtons(){
      btnsEl.innerHTML = '';
      btnsEl.style.display = 'none';
    }

    function showQuickButtons(){
      if(buttonsShown || !cfg.buttons.length) return;
      buttonsShown = true;
      btnsEl.style.display = 'flex';
      cfg.buttons.forEach(function(label){
        var b = document.createElement('button');
        b.textContent = label;
        b.addEventListener('click', function(){
          if(state === 2) return;
          addMsg(escapeHtml(label), 'usr');
          hideButtons();
          state = 1;
          var match = matchKeyword(label, cfg.responses);
          if(match){
            lastService = label;
            showTyping(function(){
              addMsg(escapeHtml(match), 'bot');
              if(isCaptureIntent(label)){
                setTimeout(function(){ startCapture(label); }, 1400);
              }
            });
          } else if(isCaptureIntent(label)){
            lastService = label;
            startCapture(label);
          } else {
            var fb = '¡Gracias por tu mensaje! 😊 Puedo ayudarte con información sobre nuestros servicios o puedes solicitar que te contactemos directamente.';
            if(cfg.hasCalendar){ fb += ' ¿Quieres que tomemos nota para contactarte?'; }
            showTyping(function(){ addMsg(escapeHtml(fb), 'bot'); });
          }
        });
        btnsEl.appendChild(b);
      });
    }

    function isCaptureIntent(text){
      var t = text.toLowerCase();
      var triggers = CAPTURE_TRIGGERS.split(',');
      for(var i = 0; i < triggers.length; i++){
        if(t.indexOf(triggers[i].trim()) !== -1) return true;
      }
      return false;
    }

    function startCapture(servicio){
      state = 2;
      captureStep = 0;
      lastService = servicio || '';
      showTyping(function(){ addMsg(escapeHtml(cfg.askName), 'bot'); });
    }

    function handleCapture(text){
      if(captureStep === 0){
        userName = text.trim();
        captureStep = 1;
        var msg = replaceVars(cfg.askPhone, { nombre: userName });
        showTyping(function(){ addMsg(escapeHtml(msg), 'bot'); });
      } else if(captureStep === 1){
        var digits = text.replace(/[^0-9]/g,'');
        if(digits.length < 9){
          botSay('Por favor introduce un teléfono válido (9 dígitos).');
          return;
        }
        userPhone = digits.slice(-9);
        captureStep = 2;
        var sum = replaceVars(cfg.summary, { nombre: userName, telefono: userPhone, servicio: lastService });
        showTyping(function(){
          addMsg(escapeHtml(sum), 'bot');
          captureStep = 3;
          var bye = replaceVars(cfg.goodbye, { nombre: userName });
          showTyping(function(){
            addMsg(escapeHtml(bye), 'bot');
            if(cfg.whatsapp) showWaButton(userName, userPhone, lastService);
            state = 1;
          });
        });
      }
    }

    function handleUserInput(text){
      text = (text || '').trim();
      if(!text) return;
      addMsg(escapeHtml(text), 'usr');
      inputEl.value = '';
      inputEl.style.height = 'auto';

      if(state === 0){
        state = 1;
        hideButtons();
      }

      if(state === 2){
        handleCapture(text);
        return;
      }

      // STATE 1: conversación
      var match = matchKeyword(text, cfg.responses);
      if(match){
        lastService = text;
        showTyping(function(){
          addMsg(escapeHtml(match), 'bot');
          if(isCaptureIntent(text)){
            setTimeout(function(){ startCapture(text); }, 1400);
          }
        });
      } else if(isCaptureIntent(text)){
        lastService = text;
        startCapture(text);
      } else {
        var fallback = '¡Gracias por tu mensaje! 😊 Puedo ayudarte con información sobre nuestros servicios o puedes solicitar que te contactemos directamente.';
        if(cfg.hasCalendar){
          fallback += ' ¿Quieres que tomemos nota para contactarte?';
        }
        showTyping(function(){
          addMsg(escapeHtml(fallback), 'bot');
        });
      }
    }

    // ─── INICIO ──────────────────────────────────────────────────────────────
    function openChat(){
      modal.classList.add('wm-show');
      btn.classList.add('wm-open');
      inputEl.focus();
      if(msgsEl.children.length === 0){
        state = 0;
        showTyping(function(){
          addMsg(escapeHtml(cfg.greeting), 'bot');
          setTimeout(showQuickButtons, 300);
        });
      }
    }

    function closeChat(){
      modal.classList.remove('wm-show');
      btn.classList.remove('wm-open');
    }

    btn.addEventListener('click', openChat);
    modal.querySelector('.wm-close').addEventListener('click', closeChat);

    sendBtn.addEventListener('click', function(){ handleUserInput(inputEl.value); });

    inputEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        handleUserInput(inputEl.value);
      }
    });

    inputEl.addEventListener('input', function(){
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });

    // Fade-in del botón tras 2s
    setTimeout(function(){ btn.classList.add('wm-visible'); }, 2000);
  }

})();
