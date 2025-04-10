// survivalMode.js
// ============================
// CHAOS KEYBOARD BATTLE - SURVIVAL MODE (Enhanced)
// ============================

let canvas, ctx;
let paused = false;
let gameOverState = false;
let startTime = 0;
let enemySpawnInterval, powerUpSpawnInterval;

const enemyBullets = [];
const enemies = [];
const powerUps = [];

// Audio assets (add your actual file paths)
const bgMusic = new Audio("assets/sounds/survival_bg.mp3");
const shootSound = new Audio("assets/sounds/shoot.wav");
const enemyDeathSound = new Audio("assets/sounds/enemy_death.wav");
const gameOverSound = new Audio("assets/sounds/game_over.wav");

// Player setup
const player = {
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  speed: 5,
  baseSpeed: 5,
  health: 100,
  score: 0,
  bullets: [],
  shieldActive: false,
  dashCooldown: 0,
  lastShot: 0,
};

// Controls state
const keys = {};

function attachEventListeners() {
  document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'p') togglePause();
  });
  document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });
}

function spawnEnemy() {
  enemies.push({
    x: Math.random() * (canvas.width - 50),
    y: -50,
    width: 50,
    height: 50,
    speed: Math.random() * 2 + 1 + getWave() * 0.2,
    health: 30 + getWave() * 5,
    lastShot: Date.now(),
  });
}

function spawnPowerUp() {
  const types = ["health", "shield", "speed", "bullet"];
  const type = types[Math.floor(Math.random() * types.length)];
  const pu = {
    x: Math.random() * (canvas.width - 30),
    y: Math.random() * (canvas.height - 30),
    width: 30,
    height: 30,
    type,
    spawnTime: Date.now(),
  };
  powerUps.push(pu);
}

function shootBullet(dx = 0, dy = -1) {
  const mag = Math.hypot(dx, dy) || 1;
  player.bullets.push({
    x: player.x + player.width/2 - 5,
    y: player.y + player.height/2 - 5,
    width: 10,
    height: 10,
    vx: (dx/mag)*6,
    vy: (dy/mag)*6,
  });
  shootSound.currentTime = 0;
  shootSound.play();
}

function dash() {
  if (player.dashCooldown <= 0) {
    player.speed = player.baseSpeed * 3;
    player.dashCooldown = 2000;
    setTimeout(() => player.speed = player.baseSpeed, 300);
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function getWave() {
  return Math.floor((Date.now() - startTime)/30000) + 1;
}

function update() {
  if (paused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const wave = getWave();

  // Movement with normalization
  let dx = 0, dy = 0;
  if (keys['a']) dx -= 1;
  if (keys['d']) dx += 1;
  if (keys['w']) dy -= 1;
  if (keys['s']) dy += 1;
  if (dx || dy) {
    const m = Math.hypot(dx, dy);
    player.x += (dx/m) * player.speed;
    player.y += (dy/m) * player.speed;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
  }

  // Shooting in any direction
  if (keys[' '] && Date.now() - player.lastShot > 300) {
    let sx = 0, sy = 0;
    if (keys['arrowup']) sy = -1;
    if (keys['arrowdown']) sy = 1;
    if (keys['arrowleft']) sx = -1;
    if (keys['arrowright']) sx = 1;
    if (!sx && !sy) sy = -1;
    shootBullet(sx, sy);
    player.lastShot = Date.now();
  }

  // Shield & Dash
  player.shieldActive = !!keys['q'];
  if (keys['e']) dash();
  if (player.dashCooldown > 0) player.dashCooldown -= 16;

  // Update bullets
  player.bullets.forEach((b,i) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      player.bullets.splice(i,1);
    }
  });

  // Enemies & collisions
  enemies.forEach((en, ei) => {
    en.y += en.speed;
    if (Date.now() - en.lastShot > 2000) {
      en.lastShot = Date.now();
      const dirX = (player.x - en.x);
      const dirY = (player.y - en.y);
      const mag = Math.hypot(dirX, dirY);
      enemyBullets.push({
        x: en.x + en.width/2,
        y: en.y + en.height/2,
        width: 10,
        height: 10,
        vx: dirX/mag*4,
        vy: dirY/mag*4
      });
    }
    if (isColliding(player, en)) {
      if (!player.shieldActive) player.health -= 10;
      enemies.splice(ei,1);
      return;
    }
    player.bullets.forEach((b, bi) => {
      if (isColliding(b, en)) {
        en.health -= 20;
        player.bullets.splice(bi,1);
        if (en.health <= 0) {
          player.score += 10;
          enemyDeathSound.currentTime = 0;
          enemyDeathSound.play();
          enemies.splice(ei,1);
        }
      }
    });
  });

  // Enemy bullets
  enemyBullets.forEach((b,i) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      enemyBullets.splice(i,1);
      return;
    }
    if (isColliding(b, player)) {
      if (!player.shieldActive) player.health -= 10;
      enemyBullets.splice(i,1);
    }
  });

  // Power-ups & timed removal
  powerUps.forEach((pu,i) => {
    const elapsed = Date.now() - pu.spawnTime;
    if (elapsed > 5000) return powerUps.splice(i,1);
    if (isColliding(player, pu)) {
      switch(pu.type) {
        case 'health':  player.health = Math.min(100, player.health + 20); break;
        case 'shield':  player.shieldActive = true; break;
        case 'speed':   player.speed += 2; break;
        case 'bullet':  player.bullets.forEach(bl => { bl.vx *= 1.5; bl.vy *= 1.5; }); break;
      }
      powerUps.splice(i,1);
    }
  });

  // Draw Section
  ctx.fillStyle = 'blue';
  ctx.fillRect(player.x, player.y, player.width, player.height);
  if (player.shieldActive) {
    ctx.strokeStyle = 'cyan'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width, 0, Math.PI*2);
    ctx.stroke();
  }

  ctx.fillStyle = 'red';    player.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
  ctx.fillStyle = 'green';  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.width, e.height));
  ctx.fillStyle = 'orange'; enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // Power-ups with name & timer
  powerUps.forEach(pu => {
    ctx.fillStyle = 'yellow'; ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
    ctx.fillStyle = 'white'; ctx.font = '12px Arial';
    ctx.fillText(pu.type, pu.x, pu.y - 5);
    const tLeft = Math.ceil((5000 - (Date.now() - pu.spawnTime)) / 1000);
    ctx.fillText(`(${tLeft})`, pu.x + pu.width - 12, pu.y + pu.height + 12);
  });

  // UI: Health, Score, Wave, Time
  ctx.fillStyle = 'white'; ctx.font = '20px Arial';
  ctx.fillText(`Health: ${player.health}`, 10, 30);
  ctx.fillText(`Score: ${player.score}`, 10, 60);
  ctx.fillText(`Wave: ${wave}`, 10, 90);
  ctx.fillText(`Time: ${Math.floor((Date.now() - startTime)/1000)}s`, 10, 120);

  // Controls centered
  
  ctx.font = '16px Arial';
  const w = ctx.measureText(ctrl).width;
  ctx.fillText(ctrl, canvas.width/2 - w/2, canvas.height/2);
  Move: W/A/S/D | Shoot: Arrow Keys | Dash: E | Shield: Q Pause: P
  if (player.health <= 0) return gameOver();
  requestAnimationFrame(update);
}

function gameOver() {
  gameOverState = true;
  bgMusic.pause();
  gameOverSound.play();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const nameEl = document.getElementById('playerNameInput');
  const nm = nameEl && nameEl.value ? nameEl.value : 'Player';
  ctx.fillStyle = 'red'; ctx.font = '40px Arial';
  ctx.fillText(`${nm}, Game Over`, canvas.width/2 - 150, canvas.height/2);
  const ov = document.getElementById('gameOverScreen');
  if (ov) ov.classList.remove('hidden');
}

function survivalStartGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  attachEventListeners();
  player.x = canvas.width/2 - 25;
  player.y = canvas.height - 100;
  player.health = 100;
  player.score = 0;
  player.bullets = [];
  player.shieldActive = false;
  player.speed = player.baseSpeed;
  player.lastShot = 0;
  player.dashCooldown = 0;
  enemies.length = 0;
  enemyBullets.length = 0;
  powerUps.length = 0;
  gameOverState = false;
  paused = false;
  startTime = Date.now();
  bgMusic.loop = true;
  bgMusic.currentTime = 0;
  bgMusic.play();
  clearInterval(enemySpawnInterval);
  clearInterval(powerUpSpawnInterval);
  enemySpawnInterval = setInterval(spawnEnemy, 2000);
  powerUpSpawnInterval = setInterval(spawnPowerUp, 10000);
  update();
}

function togglePause() {
  paused = !paused;
  const ps = document.getElementById('pauseScreen');
  if (ps) ps.classList.toggle('hidden', !paused);
  if (paused) {
    clearInterval(enemySpawnInterval);
    clearInterval(powerUpSpawnInterval);
    bgMusic.pause();
  } else if (!gameOverState) {
    enemySpawnInterval = setInterval(spawnEnemy, 2000);
    powerUpSpawnInterval = setInterval(spawnPowerUp, 10000);
    bgMusic.play();
    requestAnimationFrame(update);
  }
}

function playAgain() {
  clearInterval(enemySpawnInterval);
  clearInterval(powerUpSpawnInterval);
  const ov = document.getElementById('gameOverScreen');
  if (ov) ov.classList.add('hidden');
  survivalStartGame();
}

// Mode-select glow effect
const duoBtn = document.getElementById('duoModeBtn');
const survivalBtn = document.getElementById('survivalModeBtn');
if (duoBtn && survivalBtn) {
  duoBtn.addEventListener('click', () => {
    duoBtn.style.boxShadow = '0 0 10px 2px #0ff';
    survivalBtn.style.boxShadow = 'none';
  });
  survivalBtn.addEventListener('click', () => {
    survivalBtn.style.boxShadow = '0 0 10px 2px #0ff';
    duoBtn.style.boxShadow = 'none';
  });
}

// Expose globals
window.survivalStartGame = survivalStartGame;
window.togglePause = togglePause;
window.playAgain = playAgain;
