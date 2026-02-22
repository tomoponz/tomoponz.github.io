/* aframe-gltf-scatter.js
   Split a glTF model into child-objects and scatter them in a tight cluster.

   Usage:
     <a-entity scatter-gltf-children="src:#model; spread:1.0" scale="0.15 0.15 0.15"></a-entity>

   Notes:
     - Assumes each direct child of gltf.scene is a logical prop (e.g. one sign).
     - If the model has only one child, it will fall back to listing that child's children.
*/
(function(){
  if (typeof AFRAME === 'undefined' || typeof THREE === 'undefined') return;

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function resolveSrc(src){
    src = (src||'').trim();
    if(!src) return '';
    if(src[0] !== '#') return src;
    const el = document.querySelector(src);
    if(!el) return '';
    return el.getAttribute('src') || '';
  }

  function pickTopObjects(scene){
    if(!scene) return [];
    if(scene.children && scene.children.length > 1) return scene.children;
    if(scene.children && scene.children.length === 1){
      const one = scene.children[0];
      if(one.children && one.children.length > 0) return one.children;
      return [one];
    }
    return [scene];
  }

  AFRAME.registerComponent('scatter-gltf-children', {
    schema: {
      src: {type:'string'},
      spread: {type:'number', default: 1.0},
      max: {type:'int', default: 999},
      y: {type:'number', default: 0}
    },
    init: function(){
      this.loader = (THREE && THREE.GLTFLoader) ? new THREE.GLTFLoader() : null;
      this.group = new THREE.Group();
      this.el.object3D.add(this.group);
      this._loadedUrl = '';
    },
    update: function(){
      const url = resolveSrc(this.data.src);
      if(!url || !this.loader) return;
      if(url === this._loadedUrl) return;
      this._loadedUrl = url;

      while(this.group.children.length) this.group.remove(this.group.children[0]);

      this.loader.load(url, (gltf)=>{
        const scene = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if(!scene) return;

        let items = pickTopObjects(scene);
        items = items.slice(0, clamp(this.data.max, 1, 999));

        const n = items.length;
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const s = Math.max(0.25, this.data.spread);

        for(let i=0;i<n;i++){
          const r = Math.floor(i / cols);
          const c = i % cols;
          const x = (c - (cols-1)/2) * s;
          const z = (r - (rows-1)/2) * s;

          const obj = items[i].clone(true);
          obj.position.set(x, this.data.y, z);
          obj.rotation.y += (Math.random() - 0.5) * 0.35; // slight variety
          this.group.add(obj);
        }
        this.el.emit('model-loaded');
      }, undefined, (err)=>{
        console.warn('[scatter-gltf-children] load failed', err);
      });
    }
  });
})();
