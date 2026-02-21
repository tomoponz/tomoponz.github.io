/*
  A-Frame simple FPS controls (keyboard + touch joysticks) with in-page settings UI.

  - WASD: move
  - Arrow keys: look
  - Space / Jump button: jump
  - Touch: left joystick move, right joystick look
  - Gear button: move speed / look speed / master volume sliders

  Usage:
    <a-entity id="rig" fps-player wall-collider> ... <a-entity camera> ...
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
  };

  function getSettings(){
    const s = (window[SETTINGS_KEY] ||= {...DEFAULTS});
    // fill missing
    for (const k of Object.keys(DEFAULTS)) if (typeof s[k] !== 'number') s[k] = DEFAULTS[k];
    return s;
  }

  function isCoarsePointer(){
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 900;
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

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
    const mv = clamp(v, 0, 1);
    const s = getSettings();
    s.volume = mv;
    document.querySelectorAll('audio').forEach(a => {
      const base = clamp(parseFloat(a.dataset.basevol || '1'), 0, 1);
      a.volume = clamp(base * mv, 0, 1);
    });
  }

  // Expose for pages that want to call it.
  window.__setMasterVolume = applyMasterVolume;

  // ---------- UI injection ----------
  function injectStyles(){
    if (document.getElementById('fps-ui-style')) return;
    const css = `
      #fps-ui{position:fixed;inset:0;z-index:9999;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;}
      #fps-ui .fps-btn{pointer-events:auto;user-select:none;touch-action:manipulation;}
      #fps-gear{position:fixed;top:14px;right:14px;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;display:grid;place-items:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
      #fps-gear:active{transform:scale(.98)}
      #fps-panel{position:fixed;top:68px;right:14px;width:min(320px,calc(100vw - 28px));padding:12px 12px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.40);color:#fff;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 18px 60px rgba(0,0,0,.45);pointer-events:auto;display:none}
      #fps-panel.open{display:block}
      #fps-panel h3{margin:0 0 8px;font-size:14px;opacity:.9}
      #fps-panel .row{display:grid;grid-template-columns:1fr 90px;gap:10px;align-items:center;margin:10px 0}
      #fps-panel label{font-size:13px;opacity:.85}
      #fps-panel input[type=range]{width:100%}
      #fps-panel .val{font-variant-numeric:tabular-nums;text-align:right;font-size:13px;opacity:.9}

      .fps-joy{position:fixed;bottom:18px;width:128px;height:128px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.20);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:auto;touch-action:none;display:none}
      .fps-joy .stick{position:absolute;left:50%;top:50%;width:54px;height:54px;border-radius:999px;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08)}
      #fps-joy-move{left:18px}
      #fps-joy-look{right:18px}
      #fps-jump{position:fixed;right:18px;bottom:160px;width:84px;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;display:none;place-items:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
      #fps-jump:active{transform:scale(.98)}
      @media (max-width:900px){
        .fps-joy{display:block}
        #fps-jump{display:grid}
      }
    `;
    const style = document.createElement('style');
    style.id = 'fps-ui-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildUI(){
    if (document.getElementById('fps-ui')) return;
    injectStyles();
    const s = getSettings();

    const ui = document.createElement('div');
    ui.id = 'fps-ui';
    ui.innerHTML = `
      <button id="fps-gear" class="fps-btn" aria-label="settings" title="settings">⚙️</button>
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
      </div>
      <div id="fps-joy-move" class="fps-joy" aria-label="move joystick"><div class="stick"></div></div>
      <div id="fps-joy-look" class="fps-joy" aria-label="look joystick"><div class="stick"></div></div>
      <button id="fps-jump" class="fps-btn" aria-label="jump">JUMP</button>
    `;
    document.body.appendChild(ui);

    const gear = ui.querySelector('#fps-gear');
    const panel = ui.querySelector('#fps-panel');
    const move = ui.querySelector('#fps-move');
    const look = ui.querySelector('#fps-look');
    const vol = ui.querySelector('#fps-vol');
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
    refreshLabels();

    gear.addEventListener('click', () => {
      panel.classList.toggle('open');
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

    // ensure current basevols captured, apply volume in case user already changed.
    ensureBaseVolumes();
    applyMasterVolume(s.volume);
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
        this.keys[e.code] = true;
        if (e.code === 'Space') this.jumpQueued = true;
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

      // touch UI wiring
      const joyMove = document.getElementById('fps-joy-move');
      const joyLook = document.getElementById('fps-joy-look');
      if (joyMove && joyLook){
        setupJoystick(joyMove, (x,y) => { this.jMoveX = x; this.jMoveY = y; });
        setupJoystick(joyLook, (x,y) => { this.jLookX = x; this.jLookY = y; });
      }

      const jumpBtn = document.getElementById('fps-jump');
      if (jumpBtn){
        const q = () => { this.jumpQueued = true; };
        jumpBtn.addEventListener('pointerdown', (e) => { q(); e.preventDefault(); });
      }
    },
    tick: function(time, timeDelta){
      // Optional global gate used by dreamcore.
      if (typeof window.isPlaying === 'boolean' && !window.isPlaying) return;

      const s = getSettings();
      const moveSpeed = (typeof s.moveSpeed === 'number') ? s.moveSpeed : this.data.moveSpeed;
      const lookSpeed = (typeof s.lookSpeed === 'number') ? s.lookSpeed : this.data.lookSpeed;

      const delta = Math.min(timeDelta / 16.6, 2);

      // ----- look -----
      if (this.keys['ArrowLeft'])  this.yaw += lookSpeed * delta;
      if (this.keys['ArrowRight']) this.yaw -= lookSpeed * delta;
      if (this.keys['ArrowUp'])    this.pitch += lookSpeed * delta;
      if (this.keys['ArrowDown'])  this.pitch -= lookSpeed * delta;

      // joystick look (constant while held)
      this.yaw   -= (this.jLookX * lookSpeed * 1.6) * delta;
      this.pitch -= (this.jLookY * lookSpeed * 1.6) * delta;

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
