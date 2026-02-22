// tetris.js (no external libs)
(function(){
  "use strict";

  const canvas = document.getElementById('tetrisCanvas');
  const nextCanvas = document.getElementById('nextCanvas');
  if(!canvas) return;

  const ctx = canvas.getContext('2d');
  const nctx = nextCanvas.getContext('2d');

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 24; // 240/10

  const UI = {
    score: document.getElementById('tScore'),
    lines: document.getElementById('tLines'),
    level: document.getElementById('tLevel'),
    best:  document.getElementById('tBest'),
    state: document.getElementById('tState'),
    btnLeft: document.getElementById('btnLeft'),
    btnRight: document.getElementById('btnRight'),
    btnDown: document.getElementById('btnDown'),
    btnRot: document.getElementById('btnRot'),
    btnDrop: document.getElementById('btnDrop'),
    btnPause: document.getElementById('btnPause'),
    btnStart: document.getElementById('btnStart'),
    btnRestart: document.getElementById('btnRestart'),
  };

  const COLORS = {
    0: 'rgba(0,0,0,0)',
    1: 'rgba(124,203,255,.95)', // I
    2: 'rgba(182,156,255,.95)', // J
    3: 'rgba(124,255,178,.95)', // L
    4: 'rgba(255,210,124,.95)', // O
    5: 'rgba(255,124,124,.95)', // S
    6: 'rgba(255,170,255,.95)', // T
    7: 'rgba(255,255,255,.92)', // Z
  };

  const PIECES = {
    'I': { id:1, m:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    'J': { id:2, m:[[2,0,0],[2,2,2],[0,0,0]] },
    'L': { id:3, m:[[0,0,3],[3,3,3],[0,0,0]] },
    'O': { id:4, m:[[4,4],[4,4]] },
    'S': { id:5, m:[[0,5,5],[5,5,0],[0,0,0]] },
    'T': { id:6, m:[[0,6,0],[6,6,6],[0,0,0]] },
    'Z': { id:7, m:[[7,7,0],[0,7,7],[0,0,0]] },
  };

  function createMatrix(w,h){
    const m=[];
    while(h--) m.push(new Array(w).fill(0));
    return m;
  }

  function cloneMatrix(m){
    return m.map(r=>r.slice());
  }

  function rotate(mat, dir){
    // transpose
    for(let y=0;y<mat.length;y++){
      for(let x=0;x<y;x++){
        [mat[x][y], mat[y][x]] = [mat[y][x], mat[x][y]];
      }
    }
    if(dir>0){
      mat.forEach(row=>row.reverse());
    } else {
      mat.reverse();
    }
  }

  function collide(board, player){
    const m = player.matrix;
    const o = player.pos;
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x] !== 0){
          const by = y + o.y;
          const bx = x + o.x;
          if(bx < 0 || bx >= COLS || by >= ROWS) return true;
          if(by >= 0 && board[by][bx] !== 0) return true;
        }
      }
    }
    return false;
  }

  function merge(board, player){
    player.matrix.forEach((row,y)=>{
      row.forEach((v,x)=>{
        if(v!==0){
          const by = y + player.pos.y;
          const bx = x + player.pos.x;
          if(by>=0 && by<ROWS && bx>=0 && bx<COLS) board[by][bx]=v;
        }
      });
    });
  }

  function sweep(board){
    let rowCount = 0;
    outer: for(let y=ROWS-1; y>=0; y--){
      for(let x=0; x<COLS; x++){
        if(board[y][x] === 0) continue outer;
      }
      const row = board.splice(y,1)[0].fill(0);
      board.unshift(row);
      y++;
      rowCount++;
    }
    return rowCount;
  }

  // 7-bag random
  let bag=[];
  function refillBag(){
    bag = ['I','J','L','O','S','T','Z'];
    for(let i=bag.length-1;i>0;i--){
      const j = (Math.random()*(i+1))|0;
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  function nextType(){
    if(bag.length===0) refillBag();
    return bag.pop();
  }

  function pieceMatrix(type){
    return cloneMatrix(PIECES[type].m);
  }

  const board = createMatrix(COLS, ROWS);

  const player = {
    pos: {x:0,y:0},
    matrix: pieceMatrix('T'),
    next: pieceMatrix('I'),
    type: 'T',
    nextType: 'I',
  };

  const state = {
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: 800,
    best: 0,
  };

  const BEST_KEY = 'tomoponz_tetris_best';
  state.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;

  function updateHUD(){
    UI.score.textContent = String(state.score);
    UI.lines.textContent = String(state.lines);
    UI.level.textContent = String(state.level);
    UI.best.textContent  = String(state.best);
    if(state.gameOver) UI.state.textContent = 'GAME OVER';
    else if(!state.running) UI.state.textContent = 'READY';
    else if(state.paused) UI.state.textContent = 'PAUSE';
    else UI.state.textContent = 'PLAY';
  }

  function calcLevel(){
    const lv = 1 + Math.floor(state.lines / 10);
    state.level = lv;
    // faster, but not insane
    state.dropInterval = Math.max(120, 800 - (lv-1)*70);
  }

  function scoreFor(lines){
    const tbl = [0, 100, 300, 500, 800];
    return tbl[lines] * state.level;
  }

  function drawCell(c, x, y){
    if(c===0) return;
    ctx.fillStyle = COLORS[c];
    ctx.fillRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
    // inner highlight
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x*BLOCK+1, y*BLOCK+1, BLOCK-2, BLOCK-2);
  }

  function drawBoard(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for(let x=0;x<=COLS;x++){
      ctx.beginPath();
      ctx.moveTo(x*BLOCK,0);
      ctx.lineTo(x*BLOCK,canvas.height);
      ctx.stroke();
    }
    for(let y=0;y<=ROWS;y++){
      ctx.beginPath();
      ctx.moveTo(0,y*BLOCK);
      ctx.lineTo(canvas.width,y*BLOCK);
      ctx.stroke();
    }

    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) drawCell(board[y][x], x, y);

    // ghost (hard drop preview)
    const ghostY = getHardDropY();
    ctx.save();
    ctx.globalAlpha = 0.25;
    player.matrix.forEach((row, y)=>row.forEach((v,x)=>{
      if(v!==0){
        const gx = x + player.pos.x;
        const gy = y + ghostY;
        if(gy>=0) drawCell(v, gx, gy);
      }
    }));
    ctx.restore();

    // piece
    player.matrix.forEach((row, y)=>row.forEach((v,x)=>{
      if(v!==0){
        const px = x + player.pos.x;
        const py = y + player.pos.y;
        if(py>=0) drawCell(v, px, py);
      }
    }));
  }

  function drawNext(){
    nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
    const m = player.next;
    const bs = 24;
    // center
    const w = m[0].length;
    const h = m.length;
    const ox = Math.floor((nextCanvas.width - w*bs)/2);
    const oy = Math.floor((nextCanvas.height - h*bs)/2);

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const v = m[y][x];
        if(v===0) continue;
        nctx.fillStyle = COLORS[v];
        nctx.fillRect(ox + x*bs, oy + y*bs, bs, bs);
        nctx.strokeStyle = 'rgba(255,255,255,.22)';
        nctx.lineWidth = 2;
        nctx.strokeRect(ox + x*bs + 1, oy + y*bs + 1, bs-2, bs-2);
      }
    }
  }

  function spawn(){
    player.matrix = player.next;
    player.type = player.nextType;
    player.nextType = nextType();
    player.next = pieceMatrix(player.nextType);

    player.pos.y = -2;
    player.pos.x = ((COLS/2)|0) - ((player.matrix[0].length/2)|0);

    // if immediately collides => game over
    if(collide(board, player)){
      state.gameOver = true;
      state.running = false;
      state.paused = false;
      // update best
      if(state.score > state.best){
        state.best = state.score;
        localStorage.setItem(BEST_KEY, String(state.best));
      }
    }
    drawNext();
    updateHUD();
  }

  function resetGame(){
    for(let y=0;y<ROWS;y++) board[y].fill(0);

    bag = [];
    refillBag();

    // next + current
    player.nextType = nextType();
    player.next = pieceMatrix(player.nextType);

    player.type = nextType();
    player.matrix = pieceMatrix(player.type);

    player.pos.y = -2;
    player.pos.x = ((COLS/2)|0) - ((player.matrix[0].length/2)|0);

    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.dropInterval = 800;
    state.gameOver = false;
    state.paused = false;

    drawNext();
    updateHUD();
  }

  function start(){
    if(state.gameOver) resetGame();
    if(!state.running){
      state.running = true;
      state.paused = false;
      // re-seed if first time
      if(bag.length===0) refillBag();
      // ensure next exists
      if(!player.next) {
        player.nextType = nextType();
        player.next = pieceMatrix(player.nextType);
      }
      // create current piece if needed
      if(!player.matrix) {
        player.nextType = nextType();
        player.matrix = pieceMatrix(player.nextType);
      }
      // make sure next preview consistent
      drawNext();
      updateHUD();
    }
  }

  function togglePause(){
    if(!state.running || state.gameOver) return;
    state.paused = !state.paused;
    updateHUD();
  }

  function move(dir){
    if(!state.running || state.paused || state.gameOver) return;
    player.pos.x += dir;
    if(collide(board, player)) player.pos.x -= dir;
  }

  function drop(){
    if(!state.running || state.paused || state.gameOver) return;
    player.pos.y++;
    if(collide(board, player)){
      player.pos.y--;
      merge(board, player);
      const cleared = sweep(board);
      if(cleared>0){
        state.lines += cleared;
        state.score += scoreFor(cleared);
        calcLevel();
      }
      spawn();
    }
  }

  function getHardDropY(){
    const y0 = player.pos.y;
    let y = y0;
    while(true){
      y++;
      const test = { pos:{x:player.pos.x, y}, matrix: player.matrix };
      if(collide(board, test)) return y-1;
    }
  }

  function hardDrop(){
    if(!state.running || state.paused || state.gameOver) return;
    player.pos.y = getHardDropY();
    merge(board, player);
    const cleared = sweep(board);
    if(cleared>0){
      state.lines += cleared;
      state.score += scoreFor(cleared);
      calcLevel();
    }
    spawn();
  }

  function rotatePlayer(dir){
    if(!state.running || state.paused || state.gameOver) return;
    const pos = player.pos.x;
    const m = player.matrix;
    rotate(m, dir);

    // wall kick (simple)
    let offset = 1;
    while(collide(board, player)){
      player.pos.x += offset;
      offset = -(offset + (offset>0 ? 1 : -1));
      if(Math.abs(offset) > m[0].length){
        rotate(m, -dir);
        player.pos.x = pos;
        return;
      }
    }
  }

  // ----- input -----
  document.addEventListener('keydown', (e)=>{
    if(e.code === 'KeyP'){ togglePause(); return; }
    if(e.code === 'KeyR'){ resetGame(); state.running = true; updateHUD(); return; }
    if(e.code === 'Enter'){ start(); return; }

    if(!state.running){
      // allow quick start
      if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyX','KeyZ'].includes(e.code)) start();
      else return;
    }

    if(state.paused || state.gameOver) return;

    if(e.code === 'ArrowLeft') move(-1);
    else if(e.code === 'ArrowRight') move(1);
    else if(e.code === 'ArrowDown') drop();
    else if(e.code === 'ArrowUp' || e.code === 'KeyX') rotatePlayer(1);
    else if(e.code === 'KeyZ') rotatePlayer(-1);
    else if(e.code === 'Space') hardDrop();
  });

  // ----- on-screen buttons (repeat on hold) -----
  function bindHold(btn, fn, interval=70){
    if(!btn) return;
    let t=null;
    const clear=()=>{ if(t){ clearInterval(t); t=null; } };
    btn.addEventListener('pointerdown', (e)=>{
      e.preventDefault();
      if(!state.running) start();
      fn();
      clear();
      t = setInterval(fn, interval);
    });
    btn.addEventListener('pointerup', clear);
    btn.addEventListener('pointercancel', clear);
    btn.addEventListener('pointerleave', clear);
  }

  function bindTap(btn, fn){
    if(!btn) return;
    btn.addEventListener('pointerdown', (e)=>{
      e.preventDefault();
      if(!state.running) start();
      fn();
    });
  }

  bindHold(UI.btnLeft, ()=>move(-1));
  bindHold(UI.btnRight, ()=>move(1));
  bindHold(UI.btnDown, ()=>drop(), 55);
  bindTap(UI.btnRot, ()=>rotatePlayer(1));
  bindTap(UI.btnDrop, ()=>hardDrop());

  if(UI.btnPause) UI.btnPause.addEventListener('click', ()=>togglePause());
  if(UI.btnStart) UI.btnStart.addEventListener('click', ()=>{ start(); updateHUD(); });
  if(UI.btnRestart) UI.btnRestart.addEventListener('click', ()=>{ resetGame(); state.running=true; updateHUD(); });

  // ----- loop -----
  let lastTime = 0;
  let dropCounter = 0;

  function update(time=0){
    const dt = time - lastTime;
    lastTime = time;

    if(state.running && !state.paused && !state.gameOver){
      dropCounter += dt;
      if(dropCounter > state.dropInterval){
        drop();
        dropCounter = 0;
      }
    }

    drawBoard();
    updateHUD();

    requestAnimationFrame(update);
  }

  // init
  refillBag();
  player.nextType = nextType();
  player.next = pieceMatrix(player.nextType);
  player.nextType = nextType();
  player.matrix = pieceMatrix(player.nextType);
  player.pos.y = -2;
  player.pos.x = ((COLS/2)|0) - ((player.matrix[0].length/2)|0);
  drawNext();
  updateHUD();
  requestAnimationFrame(update);
})();
