/* security-lite.js
  NOTE:
  - This is NOT real security. On static hosting, source is always retrievable.
  - This only deters casual "view source" / devtools shortcuts and reduces tabnabbing risks.

  Features:
  - Add rel="noopener noreferrer" to target=_blank links
  - Wrap window.open to enforce noopener/noreferrer where possible
  - Disable context menu (right click)
  - Block common devtools/view-source shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)

  To disable on a page:
    <body data-guard="off">
*/

(function(){
  'use strict';

  function shouldDisable(){
    return document && document.body && document.body.getAttribute('data-guard') === 'off';
  }

  // ---- tabnabbing hardening ----
  function hardenBlankLinks(){
    document.querySelectorAll('a[target="_blank"]').forEach(a => {
      const rel = (a.getAttribute('rel') || '').toLowerCase();
      const set = new Set(rel.split(/\s+/).filter(Boolean));
      set.add('noopener');
      set.add('noreferrer');
      a.setAttribute('rel', Array.from(set).join(' '));
    });
  }

  // window.open wrapper (best-effort)
  (function(){
    const _open = window.open;
    if (typeof _open !== 'function') return;
    window.open = function(url, target, features){
      try{
        if (String(target || '') === '_blank'){
          const f = String(features || '');
          const need = (!/\bnoopener\b/i.test(f) || !/\bnoreferrer\b/i.test(f));
          if (need){
            const add = ['noopener', 'noreferrer'];
            features = (f ? (f + ',') : '') + add.join(',');
          }
        }
      }catch(_){/* ignore */}
      return _open.call(window, url, target, features);
    };
  })();

  // ---- anti-casual-view (deterrence only) ----
  function isTypingTarget(el){
    if (!el) return false;
    const t = (el.tagName || '').toLowerCase();
    return t === 'input' || t === 'textarea' || el.isContentEditable;
  }

  function installGuards(){
    if (shouldDisable()) return;

    // right click
    document.addEventListener('contextmenu', (e) => {
      // allow context menu on inputs if you want: comment out next 2 lines
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
    }, {capture:true});

    // common shortcuts
    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e.target)) return;

      const key = (e.key || '').toLowerCase();
      const code = (e.code || '');

      // F12
      if (code === 'F12'){
        e.preventDefault();
        return;
      }

      // Ctrl+U (view source)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && key === 'u'){
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+I/J/C (devtools)
      if (e.ctrlKey && e.shiftKey && !e.altKey && (key === 'i' || key === 'j' || key === 'c')){
        e.preventDefault();
        return;
      }

      // Cmd+Opt+I on mac (best-effort)
      if (e.metaKey && e.altKey && !e.shiftKey && key === 'i'){
        e.preventDefault();
        return;
      }

    }, {capture:true});

    hardenBlankLinks();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installGuards, {once:true});
  } else {
    installGuards();
  }

})();
