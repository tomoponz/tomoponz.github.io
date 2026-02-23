/* fps-player.js
  A-Frame simple FPS controls (keyboard + touch). Includes in-page settings UI.

  - WASD: move
  - Arrow keys: look
  - Space / Jump button: jump
  - Touch: left joystick move
  - Touch look: default is D-pad (mobile). Optional right joystick if enabled.
  - Buttons: ⚙️ settings, ⛶ fullscreen

  Usage:
    <a-entity id="rig" fps-player wall-collider>
      <a-entity camera></a-entity>
    </a-entity>

  Notes:
    - If window.isPlaying exists and is false, movement is disabled.
    - Master volume scales all <audio> elements (preserves their base volume ratio).
*/

(function(){
  if (typeof AFRAME === 'undefined') return;

  const SETTINGS_KEY = '__fpsSettings__';
  const DEFAULTS = {
    moveSpeed: 0.20,
    lookSpeed: 0.05,
    volume: 1.0,
    lookMode: null, // 'dpad' | 'stick'
  };


  // ---------- Global audio gate (shared with top pages) ----------
  const AUDIO_ENABLED_KEY = 'audio_enabled';
  function isAudioEnabled(){
    try{ return localStorage.getItem(AUDIO_ENABLED_KEY) !== '0'; }catch(_){ return true; }
  }
  function applyAudioGate(){
    const on = isAudioEnabled();
    try{ document.documentElement.classList.toggle('audioOff', !on); }catch(_){ }
    try{
      document.querySelectorAll('audio,video').forEach(m => {
        try{
          m.muted = !on;
          if(!on){ m.pause(); }
        }catch(_){ }
      });
    }catch(_){ }
    // A-Frame sound components (best-effort)
    try{
      if (typeof AFRAME !== 'undefined' && AFRAME.scenes){
        AFRAME.scenes.forEach(sc => {
          try{
            sc.querySelectorAll('[sound]').forEach(el => {
              const c = el.components && el.components.sound;
              if(!c) return;
              try{
                if(!on){ c.stopSound && c.stopSound(); }
                // Keep attribute in sync so future play honors it
                const vol = on ? (c.data && typeof c.data.volume==='number' ? c.data.volume : 1) : 0;
                el.setAttribute('sound', 'volume', vol);
              }catch(_){ }
            });
          }catch(_){ }
        });
      }
    }catch(_){ }
  }
  // run once (subpages don't have the shell toggle UI, so we rely on localStorage)
  applyAudioGate();



  function isCoarsePointer(){
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 900;
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function getSettings(){
    const s = (window[SETTINGS_KEY] ||= {...DEFAULTS});

    // Numbers
    if (typeof s.moveSpeed !== 'number') s.moveSpeed = DEFAULTS.moveSpeed;
    if (typeof s.lookSpeed !== 'number') s.lookSpeed = DEFAULTS.lookSpeed;
    if (typeof s.volume !== 'number') s.volume = DEFAULTS.volume;

    // Look mode
    const defMode = isCoarsePointer() ? 'dpad' : 'stick';
    if (s.lookMode !== 'dpad' && s.lookMode !== 'stick') s.lookMode = defMode;

    return s;
  }

  // ---------- Master volume (preserve relative mix) ----------
  function ensureBaseVolumes(){
    document.querySelectorAll('audio').forEach(a => {
      if (!a.dataset.basevol){
        const v = (typeof a.volume === 'number') ? a.volume : 1;
        a.dataset.basevol = String(clamp(v, 0, 1));
      }
    });
  }

  function applyMasterVolume(v){
    ensureBaseVolumes();
    const mv0 = clamp(v, 0, 1);
    const mv = isAudioEnabled() ? mv0 : 0;
    const s = getSettings();
    s.volume = mv0; // store requested
    document.querySelectorAll('audio').forEach(a => {
      const base = clamp(parseFloat(a.dataset.basevol || '1'), 0, 1);
      a.volume = clamp(base * mv, 0, 1);
      try{ a.muted = !isAudioEnabled(); if(!isAudioEnabled()) a.pause(); }catch(_){ }
    });
  }

  // Expose for pages that want to call it.
  window.__setMasterVolume = applyMasterVolume;

// ---------- Audio boost (for quiet sfx) ----------
// Usage: window.__boostAudio(audioEl, 2.5)
// This uses WebAudio GainNode to amplify beyond HTMLAudio volume=1.
let __boostCtx = null;
const __boosted = new WeakMap();

function __getBoostCtx(){
  if (__boostCtx) return __boostCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try{ __boostCtx = new AC(); }catch(_){ return null; }
  const resume = ()=>{ try{ __boostCtx.resume().catch(()=>{}); }catch(_){} };
  document.addEventListener('pointerdown', resume, {once:true, capture:true});
  document.addEventListener('touchstart', resume, {once:true, capture:true, passive:true});
  return __boostCtx;
}

function __boostAudio(audioEl, gainValue){
  if (!audioEl) return false;
  const ctx = __getBoostCtx();
  if (!ctx) return false;
  const g = Math.max(1, Number(gainValue) || 1);
  if (__boosted.has(audioEl)){
    try{ __boosted.get(audioEl).gain.gain.value = g; }catch(_){}
    return true;
  }
  try{
    const src = ctx.createMediaElementSource(audioEl);
    const gain = ctx.createGain();
    gain.gain.value = g;
    src.connect(gain).connect(ctx.destination);
    __boosted.set(audioEl, {src, gain});
    return true;
  }catch(_){
    return false;
  }
}

window.__boostAudio = __boostAudio;


  // ---------- Fullscreen ----------
  function fsIsOn(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  async function fsToggle(){
    const doc = document;
    const root = doc.documentElement;
    try {
      if (fsIsOn()){
        (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      } else {
        await (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  // ---------- UI injection ----------
  function injectStyles(){
    if (document.getElementById('fps-ui-style')) return;
    const css = `
      #fps-ui{--fps-ui-side:18px;--fps-ui-top:14px;--fps-ui-bottom:0px;--fps-ui-pad:128px;--fps-ui-gap:16px;position:fixed;inset:0;z-index:9999;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;}
      #fps-ui .fps-btn{pointer-events:auto;user-select:none;touch-action:manipulation;}

      #fps-gear{position:fixed;top:calc(var(--fps-ui-top) + env(safe-area-inset-top));right:calc(var(--fps-ui-side) + env(safe-area-inset-right));width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;display:grid;place-items:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
      #fps-full{position:fixed;top:calc(var(--fps-ui-top) + env(safe-area-inset-top));left:calc(var(--fps-ui-side) + env(safe-area-inset-left));width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;display:grid;place-items:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
      #fps-gear:active,#fps-full:active{transform:scale(.98)}

      #fps-panel{position:fixed;top:calc(68px + env(safe-area-inset-top));right:calc(var(--fps-ui-side) + env(safe-area-inset-right));width:min(340px,calc(100vw - 28px));padding:12px 12px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.40);color:#fff;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 18px 60px rgba(0,0,0,.45);pointer-events:auto;display:none}
      #fps-panel.open{display:block}
      #fps-panel h3{margin:0 0 8px;font-size:14px;opacity:.9}
      #fps-panel .row{display:grid;grid-template-columns:1fr 92px;gap:10px;align-items:center;margin:10px 0}
      #fps-panel label{font-size:13px;opacity:.85}
      #fps-panel input[type=range]{width:100%}
      #fps-panel .val{font-variant-numeric:tabular-nums;text-align:right;font-size:13px;opacity:.9}
      #fps-panel select{width:100%;padding:6px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff}

      #fps-toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.55);color:#fff;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:none;opacity:0;transition:opacity .2s ease;z-index:10000;font-size:13px;}
      #fps-toast.show{opacity:1;}

      .fps-joy{position:fixed;bottom:calc(var(--fps-ui-bottom) + env(safe-area-inset-bottom) + 18px);width:128px;height:128px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.20);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:auto;touch-action:none;display:none}
      .fps-joy .stick{position:absolute;left:50%;top:50%;width:54px;height:54px;border-radius:999px;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08)}
      #fps-joy-move{left:calc(var(--fps-ui-side) + env(safe-area-inset-left))}
      #fps-joy-look{right:calc(var(--fps-ui-side) + env(safe-area-inset-right))}

      /* Look D-pad */
      #fps-lookpad{position:fixed;right:calc(var(--fps-ui-side) + env(safe-area-inset-right));bottom:calc(var(--fps-ui-bottom) + env(safe-area-inset-bottom) + 18px);width:var(--fps-ui-pad);height:var(--fps-ui-pad);border-radius:18px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.20);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:auto;touch-action:none;display:none;}
      #fps-lookpad .pad{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:calc(var(--fps-ui-pad) - 12px);height:calc(var(--fps-ui-pad) - 12px);display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr;gap:8px;}
      #fps-lookpad button{width:100%;height:100%;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;font-size:18px;line-height:1;}
      #fps-lookpad button:active{transform:scale(.98)}
      #fps-lookpad .up{grid-column:2;grid-row:1}
      #fps-lookpad .left{grid-column:1;grid-row:2}
      #fps-lookpad .right{grid-column:3;grid-row:2}
      #fps-lookpad .down{grid-column:2;grid-row:3}

      #fps-jump{position:fixed;right:calc(var(--fps-ui-side) + env(safe-area-inset-right));bottom:calc(var(--fps-ui-bottom) + env(safe-area-inset-bottom) + 18px + var(--fps-ui-pad) + var(--fps-ui-gap));width:84px;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;display:none;place-items:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
      #fps-jump:active{transform:scale(.98)}

      @media (max-width:900px){
        .fps-joy{display:block}
        #fps-jump{display:grid}
      }

      /* Mobile default: D-pad look (joystick look hidden unless user chooses stick) */
      @media (max-width:900px){
        #fps-lookpad{display:block}
        #fps-joy-look{display:none}
      }
    
      @media (max-width: 520px){
        #fps-ui{--fps-ui-side:12px;--fps-ui-pad:112px;--fps-ui-gap:14px;}
        #fps-gear,#fps-full{width:40px;height:40px;border-radius:12px;}
        #fps-jump{width:76px;height:48px;}
      }
`;
    const style = document.createElement('style');
    style.id = 'fps-ui-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showToast(msg){
    const t = document.getElementById('fps-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function buildUI(){
  // ===== audio gate (respects localStorage audio_enabled) =====
  function __fpsAudioEnabled(){
    try{ return localStorage.getItem("audio_enabled") !== "0"; }catch(_){ return true; }
  }
  function __fpsApplyAudioGate(){
    const on = __fpsAudioEnabled();
    try{
      document.querySelectorAll("audio,video").forEach(m=>{
        try{
          m.muted = !on;
          if(!on){ m.pause(); m.currentTime = 0; }
        }catch(_){ }
      });
    }catch(_){ }

    // A-Frame sound (best-effort)
    try{
      document.querySelectorAll("[sound]").forEach(el=>{
        try{
          const c = el.components && el.components.sound;
          if(!c) return;
          if(!on){
            try{ el.setAttribute("sound","volume",0); }catch(_){}
            try{ c.pauseSound && c.pauseSound(); }catch(_){}
            try{ c.stopSound && c.stopSound(); }catch(_){}
          }else{
            // do nothing: page scripts may set proper volumes
          }
        }catch(_){ }
      });
    }catch(_){ }
  }
  // initial + react to changes
  try{ window.addEventListener("audiochange", __fpsApplyAudioGate); }catch(_){ }
  try{ window.addEventListener("storage", (e)=>{ if(e && e.key==="audio_enabled") __fpsApplyAudioGate(); }); }catch(_){ }
  try{ window.addEventListener("message", (ev)=>{ const d=ev.data||{}; if(d && d.type==="AUDIO"){ __fpsApplyAudioGate(); } }); }catch(_){ }
  try{ __fpsApplyAudioGate(); }catch(_){ }

    if (document.getElementById('fps-ui')) return;
    injectStyles();
    const s = getSettings();

    const ui = document.createElement('div');
    ui.id = 'fps-ui';
    ui.innerHTML = `
      <button id="fps-full" class="fps-btn" aria-label="fullscreen" title="fullscreen">⛶</button>
      <button id="fps-gear" class="fps-btn" aria-label="settings" title="settings">⚙️</button>
      <div id="fps-toast"></div>
      <div id="fps-panel" role="dialog" aria-label="fps settings">
        <h3>操作設定</h3>
        <div class="row">
          <label for="fps-move">移動速度</label>
          <div class="val" id="fps-move-val"></div>
        </div>
        <input id="fps-move" type="range" min="0.04" max="0.35" step="0.005">

        <div class="row">
          <label for="fps-look">視点速度</label>
          <div class="val" id="fps-look-val"></div>
        </div>
        <input id="fps-look" type="range" min="0.01" max="0.12" step="0.005">

        <div class="row">
          <label for="fps-vol">音量</label>
          <div class="val" id="fps-vol-val"></div>
        </div>
        <input id="fps-vol" type="range" min="0" max="1" step="0.01">

        <div class="row" style="margin-top:12px;">
          <label for="fps-lookmode">視点操作</label>
          <div class="val"></div>
        </div>
        <select id="fps-lookmode">
          <option value="dpad">十字</option>
          <option value="stick">スティック</option>
        </select>
      </div>

      <div id="fps-joy-move" class="fps-joy" aria-label="move joystick"><div class="stick"></div></div>
      <div id="fps-joy-look" class="fps-joy" aria-label="look joystick"><div class="stick"></div></div>

      <div id="fps-lookpad" aria-label="look pad">
        <div class="pad">
          <button class="up" data-dir="up" aria-label="look up">▲</button>
          <button class="left" data-dir="left" aria-label="look left">◀</button>
          <button class="right" data-dir="right" aria-label="look right">▶</button>
          <button class="down" data-dir="down" aria-label="look down">▼</button>
        </div>
      </div>

      <button id="fps-jump" class="fps-btn" aria-label="jump">JUMP</button>
    `;
    document.body.appendChild(ui);

    const gear = ui.querySelector('#fps-gear');
    const full = ui.querySelector('#fps-full');
    const panel = ui.querySelector('#fps-panel');
    const move = ui.querySelector('#fps-move');
    const look = ui.querySelector('#fps-look');
    const vol = ui.querySelector('#fps-vol');
    const lookModeSel = ui.querySelector('#fps-lookmode');
    const moveVal = ui.querySelector('#fps-move-val');
    const lookVal = ui.querySelector('#fps-look-val');
    const volVal = ui.querySelector('#fps-vol-val');

    function refreshLabels(){
      moveVal.textContent = s.moveSpeed.toFixed(2);
      lookVal.textContent = s.lookSpeed.toFixed(3);
      volVal.textContent = Math.round(s.volume * 100) + '%';
    }

    move.value = String(s.moveSpeed);
    look.value = String(s.lookSpeed);
    vol.value = String(s.volume);
    lookModeSel.value = s.lookMode;
    refreshLabels();

    function applyLookModeUI(){
      const joyLook = document.getElementById('fps-joy-look');
      const dpad = document.getElementById('fps-lookpad');
      const mobile = isCoarsePointer();

      if (!joyLook || !dpad) return;

      if (!mobile){
        // Desktop: don't force; show nothing unless stick mode selected
        if (s.lookMode === 'stick'){
          joyLook.style.display = 'block';
          dpad.style.display = 'none';
        } else {
          joyLook.style.display = 'none';
          dpad.style.display = 'none';
        }
        return;
      }

      // Mobile
      if (s.lookMode === 'stick'){
        joyLook.style.display = 'block';
        dpad.style.display = 'none';
      } else {
        joyLook.style.display = 'none';
        dpad.style.display = 'block';
      }
    }

    gear.addEventListener('click', () => {
      panel.classList.toggle('open');
      applyLookModeUI();
    });

    full.addEventListener('click', async () => {
      const ok = await fsToggle();
      if (!ok){
        showToast('全画面にできない端末です（iPhoneは「共有→ホーム画面に追加」が確実）');
      }
    });

    move.addEventListener('input', () => {
      s.moveSpeed = parseFloat(move.value);
      refreshLabels();
    });
    look.addEventListener('input', () => {
      s.lookSpeed = parseFloat(look.value);
      refreshLabels();
    });
    vol.addEventListener('input', () => {
      applyMasterVolume(parseFloat(vol.value));
      refreshLabels();
    });

    lookModeSel.addEventListener('change', () => {
      s.lookMode = lookModeSel.value;
      applyLookModeUI();
    });

    // ensure current basevols captured, apply volume in case user already changed.
    ensureBaseVolumes();
    applyMasterVolume(s.volume);

    // Apply mode once on build.
    applyLookModeUI();
    window.addEventListener('resize', applyLookModeUI);
  }

  // ---------- joystick helpers ----------
  function setupJoystick(el, onMove){
    const stick = el.querySelector('.stick');
    let activeId = null;
    let centerX = 0, centerY = 0;
    const maxR = 44;

    function setStick(dx, dy){
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    function reset(){
      activeId = null;
      setStick(0,0);
      onMove(0,0);
    }

    el.addEventListener('pointerdown', (e) => {
      activeId = e.pointerId;
      el.setPointerCapture(activeId);
      const rect = el.getBoundingClientRect();
      centerX = rect.left + rect.width/2;
      centerY = rect.top + rect.height/2;
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (activeId !== e.pointerId) return;
      const dx0 = e.clientX - centerX;
      const dy0 = e.clientY - centerY;
      const len = Math.hypot(dx0, dy0) || 1;
      const r = Math.min(maxR, len);
      const dx = (dx0/len) * r;
      const dy = (dy0/len) * r;
      setStick(dx, dy);
      onMove(dx/maxR, dy/maxR);
      e.preventDefault();
    });

    el.addEventListener('pointerup', (e) => {
      if (activeId !== e.pointerId) return;
      reset();
      e.preventDefault();
    });
    el.addEventListener('pointercancel', (e) => {
      if (activeId !== e.pointerId) return;
      reset();
    });
  }

  // ---------- D-pad helpers ----------
  function setupPadButton(btn, onDown, onUp){
    let activeId = null;
    const down = (e) => {
      activeId = e.pointerId;
      btn.setPointerCapture(activeId);
      onDown();
      e.preventDefault();
    };
    const up = (e) => {
      if (activeId !== null && e.pointerId !== activeId) return;
      activeId = null;
      onUp();
      e.preventDefault();
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', (e) => {
      // If finger slides out, keep it pressed only while captured.
      if (activeId === null) return;
    });
  }

  // ---------- Component ----------
  AFRAME.registerComponent('fps-player', {
    schema: {
      // fallback defaults; sliders override via shared settings.
      moveSpeed: {type: 'number', default: DEFAULTS.moveSpeed},
      lookSpeed: {type: 'number', default: DEFAULTS.lookSpeed},
      // jump physics
      jumpVelocity: {type: 'number', default: 0.28},
      gravity: {type: 'number', default: 0.018},
      // which camera to pitch (if entity isn't the camera)
      cameraSelector: {type: 'string', default: '[camera]'}
    },
    init: function(){
      buildUI();

      this.keys = {};
      this.yaw = 0;
      this.pitch = 0;
      this.vy = 0;
      this.groundY = null;
      this.jumpQueued = false;

      // joystick state
      this.jMoveX = 0; // -1..1
      this.jMoveY = 0;
      this.jLookX = 0;
      this.jLookY = 0;

      // d-pad state
      this.padL = false;
      this.padR = false;
      this.padU = false;
      this.padD = false;

      // determine camera element
      this.cameraEl = null;
      if (this.el.components.camera){
        this.cameraEl = this.el;
      } else {
        this.cameraEl = this.el.querySelector(this.data.cameraSelector) || this.el;
      }

      // init yaw/pitch from current rotation
      const rot = this.cameraEl.object3D.rotation;
      this.pitch = rot.x || 0;
      // if cameraEl is same as el, yaw is on same object; else yaw is on rig (this.el)
      this.yaw = (this.el.object3D.rotation.y || 0);

      window.addEventListener('keydown', (e) => {
        const t = e.target;
        const tag = (t && t.tagName) ? t.tagName.toLowerCase() : "";
        const isTyping = (tag === "input" || tag === "textarea" || (t && t.isContentEditable));
        if(isTyping) return;

        this.keys[e.code] = true;
        if (e.code === 'Space') this.jumpQueued = true;

        // prevent page scroll / browser shortcuts while looking around
        if (e.code === 'Space' || e.code.startsWith('Arrow')){
          try{ e.preventDefault(); }catch(_){}
        }
      }, {passive:false});
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

      // touch UI wiring
      const joyMove = document.getElementById('fps-joy-move');
      const joyLook = document.getElementById('fps-joy-look');
      if (joyMove) setupJoystick(joyMove, (x,y) => { this.jMoveX = x; this.jMoveY = y; });
      if (joyLook) setupJoystick(joyLook, (x,y) => { this.jLookX = x; this.jLookY = y; });

      const pad = document.getElementById('fps-lookpad');
      if (pad){
        const up = pad.querySelector('button[data-dir="up"]');
        const down = pad.querySelector('button[data-dir="down"]');
        const left = pad.querySelector('button[data-dir="left"]');
        const right = pad.querySelector('button[data-dir="right"]');
        if (left) setupPadButton(left, () => this.padL = true, () => this.padL = false);
        if (right) setupPadButton(right, () => this.padR = true, () => this.padR = false);
        if (up) setupPadButton(up, () => this.padU = true, () => this.padU = false);
        if (down) setupPadButton(down, () => this.padD = true, () => this.padD = false);
      }

      const jumpBtn = document.getElementById('fps-jump');
      if (jumpBtn){
        const q = () => { this.jumpQueued = true; };
        jumpBtn.addEventListener('pointerdown', (e) => { q(); e.preventDefault(); });
      }

      // iOS gesture unlock hint (optional)
      if (isCoarsePointer()){
        // capture base volumes once at start
        ensureBaseVolumes();
      }
    },
    tick: function(time, timeDelta){
      // Optional global gate used by dreamcore.
      if (typeof window.isPlaying === 'boolean' && !window.isPlaying) return;

      const s = getSettings();
      const moveSpeed = (typeof s.moveSpeed === 'number') ? s.moveSpeed : this.data.moveSpeed;
      const lookSpeed = (typeof s.lookSpeed === 'number') ? s.lookSpeed : this.data.lookSpeed;
      const lookMode = s.lookMode;

      const delta = Math.min(timeDelta / 16.6, 2);

      // ----- look -----
      // keyboard
      if (this.keys['ArrowLeft'])  this.yaw += lookSpeed * delta;
      if (this.keys['ArrowRight']) this.yaw -= lookSpeed * delta;
      if (this.keys['ArrowUp'])    this.pitch -= lookSpeed * delta;
      if (this.keys['ArrowDown'])  this.pitch += lookSpeed * delta;

      // touch look
      if (lookMode === 'stick'){
        this.yaw   -= (this.jLookX * lookSpeed * 1.6) * delta;
        this.pitch -= (this.jLookY * lookSpeed * 1.6) * delta;
      } else {
        if (this.padL) this.yaw += lookSpeed * delta;
        if (this.padR) this.yaw -= lookSpeed * delta;
        if (this.padU) this.pitch -= lookSpeed * delta;
        if (this.padD) this.pitch += lookSpeed * delta;
      }

      const limit = Math.PI / 2.2;
      this.pitch = clamp(this.pitch, -limit, limit);

      // apply rotations
      this.el.object3D.rotation.y = this.yaw;
      if (this.cameraEl && this.cameraEl !== this.el){
        this.cameraEl.object3D.rotation.set(this.pitch, 0, 0);
      } else {
        this.el.object3D.rotation.x = this.pitch;
        this.el.object3D.rotation.z = 0;
      }

      // ----- movement -----
      let moveX = 0, moveZ = 0;
      if (this.keys['KeyW']) moveZ -= 1;
      if (this.keys['KeyS']) moveZ += 1;
      if (this.keys['KeyA']) moveX -= 1;
      if (this.keys['KeyD']) moveX += 1;

      // joystick move (y up is -z)
      moveX += this.jMoveX;
      moveZ += this.jMoveY;

      if (moveX !== 0 || moveZ !== 0){
        const v = new THREE.Vector3(moveX, 0, moveZ);
        v.normalize();
        v.multiplyScalar(moveSpeed * delta);
        v.applyAxisAngle(new THREE.Vector3(0,1,0), this.yaw);
        this.el.object3D.position.add(v);
      }

      // ----- jump -----
      if (this.groundY === null) this.groundY = this.el.object3D.position.y;

      const grounded = (this.el.object3D.position.y <= this.groundY + 1e-4);
      if (grounded) {
        this.el.object3D.position.y = this.groundY;
        if (this.vy < 0) this.vy = 0;
      }

      if (this.jumpQueued && grounded){
        this.vy = this.data.jumpVelocity;
      }
      this.jumpQueued = false;

      if (!grounded || this.vy > 0){
        this.vy -= this.data.gravity * delta;
        this.el.object3D.position.y += this.vy * delta;
        if (this.el.object3D.position.y < this.groundY){
          this.el.object3D.position.y = this.groundY;
          this.vy = 0;
        }
      }
    }
  });

})();
