(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const hud = document.getElementById('hud');
  const hudHealth = document.getElementById('hudHealth');
  const hudWave = document.getElementById('hudWave');
  const hudCoins = document.getElementById('hudCoins');
  const hudTime = document.getElementById('hudTime');
  const hudKills = document.getElementById('hudKills');
  const hudAmmo = document.getElementById('hudAmmo');

  const menu = document.getElementById('menu');
  const howto = document.getElementById('howto');
  const shop = document.getElementById('shop');
  const death = document.getElementById('death');

  const menuRecord = document.getElementById('menuRecord');

  const btnStart = document.getElementById('btnStart');
  const btnHow = document.getElementById('btnHow');
  const btnBack = document.getElementById('btnBack');
  const btnShopContinue = document.getElementById('btnShopContinue');
  const btnRestart = document.getElementById('btnRestart');
  const btnMenu = document.getElementById('btnMenu');

  const shopItems = document.getElementById('shopItems');
  const deathTime = document.getElementById('deathTime');
  const deathWaves = document.getElementById('deathWaves');
  const deathKills = document.getElementById('deathKills');
  const deathCoins = document.getElementById('deathCoins');
  const deathUpgrade = document.getElementById('deathUpgrade');
  const deathRecord = document.getElementById('deathRecord');
  const deathQuote = document.getElementById('deathQuote');

  const touchLayer = document.getElementById('touch');
  const touchLeft = document.getElementById('touchLeft');
  const touchRight = document.getElementById('touchRight');
  const joystick = document.getElementById('joystick');
  const joystickThumb = document.getElementById('joystickThumb');

  // Logical game resolution (world size). Keep 16:9.
  const BASE_WIDTH = 640;
  const BASE_HEIGHT = 360;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let worldWidth = BASE_WIDTH;
  let worldHeight = BASE_HEIGHT;
  let viewScale = 1;
  let viewOffsetX = 0;
  let viewOffsetY = 0;

  const sprites = {};
  let arenaPattern = null;
  const SPRITE_SCALE = 4; // 32px logical -> 128px actual

  // World-space draw sizes (logical pixels), independent of sprite bitmap resolution.
  const DRAW = {
    player: 32,
    enemy: 32,
    coin: 8,
    arrowW: 12,
    arrowH: 6,
    bowOffset: 9, // how far bow sits from player center (world px)
  };

  const state = {
    running: false,
    inMenu: true,
    inShop: false,
    gameOver: false,
    lastTime: 0,
    startTime: 0,
    elapsed: 0,
    wave: 1,
    kills: 0,
    coins: 0,
    bestUpgrade: '—',
    record: 0,
  };

  const player = {
    x: 0,
    y: 0,
    r: 12,
    speed: 220,
    maxHealth: 100,
    health: 100,
    damage: 20,
    fireRate: 3,
    arrowSpeed: 520,
    multiShot: 1,
    explosive: false,
    invuln: 0,
    clipSize: 8,
    ammo: 8,
    reloadTime: 1.1,
    reloading: false,
    reloadLeft: 0,
  };

  const inputs = {
    up: false,
    down: false,
    left: false,
    right: false,
    mouseX: 0,
    mouseY: 0,
    shooting: false,
    lastShot: 0,
    touchMove: { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 },
    touchShoot: { active: false, id: null },
  };

  const enemies = [];
  const arrows = [];
  const coins = [];

  const enemyTypes = [
    { name: 'Слизь', chance: 0.7, speed: 90, health: 50, damage: 8, r: 14, reward: 3 },
    { name: 'Летучая мышь', chance: 0.2, speed: 140, health: 40, damage: 6, r: 12, reward: 4 },
    { name: 'Голем', chance: 0.1, speed: 60, health: 120, damage: 14, r: 16, reward: 6 },
  ];

  const upgradePool = [
    {
      id: 'damage',
      name: 'Урон пули',
      desc: '+6 к урону',
      baseCost: 15,
      apply: () => { player.damage += 6; },
    },
    {
      id: 'firerate',
      name: 'Скорость стрельбы',
      desc: '+0.6 выстр./сек',
      baseCost: 18,
      apply: () => { player.fireRate += 0.6; },
    },
    {
      id: 'speed',
      name: 'Скорость бега',
      desc: '+30 к скорости',
      baseCost: 16,
      apply: () => { player.speed += 30; },
    },
    {
      id: 'health',
      name: 'Макс. здоровье',
      desc: '+20 к максимуму',
      baseCost: 20,
      apply: () => { player.maxHealth += 20; player.health += 20; },
    },
    {
      id: 'arrowSpeed',
      name: 'Скорость пули',
      desc: '+120 к скорости',
      baseCost: 14,
      apply: () => { player.arrowSpeed += 120; },
    },
    {
      id: 'multishot',
      name: 'Очередь',
      desc: '+1 пуля',
      baseCost: 28,
      apply: () => { player.multiShot = Math.min(4, player.multiShot + 1); },
    },
    {
      id: 'explosive',
      name: 'Разрывные пули',
      desc: 'Небольшой урон по области',
      baseCost: 30,
      apply: () => { player.explosive = true; },
    },
    {
      id: 'heal',
      name: 'Лечение',
      desc: '+35 здоровья',
      baseCost: 12,
      apply: () => { player.health = Math.min(player.maxHealth, player.health + 35); },
    },
  ];

  const upgradeLevels = {};

  const deathQuotes = [
    'Арена запомнит тебя, но недолго.',
    'Патроны кончились раньше врагов.',
    'Сегодня удача была на их стороне.',
    'Ты пал, но бой был ярким.',
  ];

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    // Fit world into screen proportionally (letterbox), allow fractional scale.
    viewScale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    if (!Number.isFinite(viewScale) || viewScale <= 0) viewScale = 1;
    viewOffsetX = Math.floor((width - BASE_WIDTH * viewScale) / 2);
    viewOffsetY = Math.floor((height - BASE_HEIGHT * viewScale) / 2);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function readRecord() {
    const raw = localStorage.getItem('arena_shooter_record');
    const val = raw ? parseInt(raw, 10) : 0;
    state.record = Number.isFinite(val) ? val : 0;
    menuRecord.textContent = formatTime(state.record);
  }

  function writeRecord() {
    localStorage.setItem('arena_shooter_record', String(state.record));
  }

  function resetPlayer() {
    player.x = worldWidth / 2;
    player.y = worldHeight / 2;
    player.health = player.maxHealth;
    player.invuln = 0;
    player.reloading = false;
    player.reloadLeft = 0;
    player.ammo = player.clipSize;
    inputs.lastShot = 0;
    // Avoid first-shot aiming to (0,0) if cursor/touch hasn't moved yet.
    inputs.mouseX = player.x;
    inputs.mouseY = player.y;
  }

  function resetGame() {
    state.running = true;
    state.inMenu = false;
    state.inShop = false;
    state.gameOver = false;
    state.wave = 1;
    state.kills = 0;
    state.coins = 0;
    state.bestUpgrade = '—';
    state.startTime = performance.now();
    state.elapsed = 0;

    player.maxHealth = 100;
    player.health = 100;
    player.speed = 220;
    player.damage = 20;
    player.fireRate = 3;
    player.arrowSpeed = 520;
    player.multiShot = 1;
    player.explosive = false;
    player.invuln = 0;
    player.clipSize = 8;
    player.ammo = 8;
    player.reloadTime = 1.1;
    player.reloading = false;
    player.reloadLeft = 0;

    enemies.length = 0;
    arrows.length = 0;
    coins.length = 0;

    for (const key of Object.keys(upgradeLevels)) {
      delete upgradeLevels[key];
    }

    resetPlayer();
    spawnWave();
    updateHud();
  }

  function spawnWave() {
    const base = 3;
    const extra = Math.max(0, state.wave - 5);
    const count = base + extra + Math.floor(state.wave / 2);

    for (let i = 0; i < count; i++) {
      const type = rollEnemyType();
      enemies.push(createEnemy(type));
    }
  }

  function rollEnemyType() {
    const r = Math.random();
    let sum = 0;
    for (const type of enemyTypes) {
      sum += type.chance;
      if (r <= sum) return type;
    }
    return enemyTypes[0];
  }

  function createEnemy(type) {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = -40; y = Math.random() * worldHeight; }
    if (edge === 1) { x = worldWidth + 40; y = Math.random() * worldHeight; }
    if (edge === 2) { x = Math.random() * worldWidth; y = -40; }
    if (edge === 3) { x = Math.random() * worldWidth; y = worldHeight + 40; }

    return {
      x,
      y,
      r: type.r,
      health: type.health,
      maxHealth: type.health,
      speed: type.speed,
      damage: type.damage,
      reward: type.reward,
      type: type.name,
    };
  }

  function openShop() {
    state.inShop = true;
    shop.classList.remove('hidden');
    shopItems.innerHTML = '';

    const options = pickUpgrades();
    options.forEach((opt) => {
      const cost = getUpgradeCost(opt.id, opt.baseCost);
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <h3>${opt.name}</h3>
        <p>${opt.desc}</p>
        <p>Цена: ${cost}</p>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = 'Купить';
      btn.disabled = state.coins < cost;
      btn.addEventListener('click', () => {
        if (state.coins < cost) return;
        state.coins -= cost;
        opt.apply();
        upgradeLevels[opt.id] = (upgradeLevels[opt.id] || 0) + 1;
        state.bestUpgrade = opt.name;
        openShop();
      });
      card.appendChild(btn);
      shopItems.appendChild(card);
    });
  }

  function pickUpgrades() {
    const pool = [...upgradePool];
    const picks = [];
    while (picks.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    return picks;
  }

  function getUpgradeCost(id, baseCost) {
    const level = upgradeLevels[id] || 0;
    return Math.floor(baseCost * (1 + level * 0.35));
  }

  function closeShop() {
    state.inShop = false;
    shop.classList.add('hidden');
    state.wave += 1;
    spawnWave();
  }

  function updateHud() {
    hudHealth.textContent = Math.max(0, Math.round(player.health));
    hudWave.textContent = state.wave;
    hudCoins.textContent = state.coins;
    hudKills.textContent = state.kills;
    hudTime.textContent = formatTime(state.elapsed);
    if (hudAmmo) {
      hudAmmo.textContent = player.reloading
        ? `.../${player.clipSize}`
        : `${player.ammo}/${player.clipSize}`;
    }
  }

  function startReload() {
    if (player.reloading) return;
    if (player.ammo >= player.clipSize) return;
    player.reloading = true;
    player.reloadLeft = player.reloadTime;
  }

  function shoot() {
    const now = performance.now();
    const interval = 1000 / player.fireRate;
    if (now - inputs.lastShot < interval) return;
    inputs.lastShot = now;

    if (player.reloading) return;
    if (player.ammo <= 0) {
      startReload();
      return;
    }
    player.ammo -= 1;

    const angle = Math.atan2(inputs.mouseY - player.y, inputs.mouseX - player.x);
    // Spawn arrows closer to the bow (visual alignment)
    const spawnX = player.x + Math.cos(angle) * DRAW.bowOffset;
    const spawnY = player.y + Math.sin(angle) * DRAW.bowOffset;
    const spread = player.multiShot > 1 ? 0.2 : 0;
    for (let i = 0; i < player.multiShot; i++) {
      const offset = (i - (player.multiShot - 1) / 2) * spread;
      arrows.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle + offset) * player.arrowSpeed,
        vy: Math.sin(angle + offset) * player.arrowSpeed,
        damage: player.damage,
        life: 1.2,
      });
    }

    if (player.ammo <= 0) {
      startReload();
    }
  }

  function update(delta) {
    if (!state.running || state.gameOver) return;

    if (!state.inShop) {
      if (player.invuln > 0) {
        player.invuln = Math.max(0, player.invuln - delta);
      }
      if (player.reloading) {
        player.reloadLeft = Math.max(0, player.reloadLeft - delta);
        if (player.reloadLeft <= 0) {
          player.reloading = false;
          player.ammo = player.clipSize;
        }
      }
      const dir = getMoveVector();
      player.x += dir.x * player.speed * delta;
      player.y += dir.y * player.speed * delta;
      player.x = clamp(player.x, player.r, worldWidth - player.r);
      player.y = clamp(player.y, player.r, worldHeight - player.r);

      if (inputs.shooting) {
        shoot();
      }

      updateArrows(delta);
      updateEnemies(delta);
      updateCoins(delta);
    }

    state.elapsed = Math.floor((performance.now() - state.startTime) / 1000);
    updateHud();

    if (!state.inShop && enemies.length === 0) {
      openShop();
    }
  }

  function updateArrows(delta) {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      a.x += a.vx * delta;
      a.y += a.vy * delta;
      a.life -= delta;

      if (a.life <= 0 || a.x < -50 || a.x > worldWidth + 50 || a.y < -50 || a.y > worldHeight + 50) {
        arrows.splice(i, 1);
        continue;
      }

      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (dist(a.x, a.y, e.x, e.y) <= e.r) {
          e.health -= a.damage;
          arrows.splice(i, 1);
          if (player.explosive) {
            explodeDamage(a.x, a.y, 40, a.damage * 0.4);
          }
          break;
        }
      }
    }
    cleanupDeadEnemies();
  }

  function explodeDamage(x, y, radius, damage) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (dist(x, y, e.x, e.y) <= radius) {
        e.health -= damage;
      }
    }
  }

  function cleanupDeadEnemies() {
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (enemies[j].health <= 0) {
        killEnemy(j);
      }
    }
  }

  function killEnemy(index) {
    const e = enemies[index];
    enemies.splice(index, 1);
    state.kills += 1;
    spawnCoin(e.x, e.y, e.reward);
  }

  function spawnCoin(x, y, amount) {
    for (let i = 0; i < amount; i++) {
      coins.push({ x: x + rand(-12, 12), y: y + rand(-12, 12), r: 4, value: 1 });
    }
  }

  function updateCoins(delta) {
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      const d = dist(c.x, c.y, player.x, player.y);
      if (d < 16) {
        state.coins += c.value;
        coins.splice(i, 1);
      }
    }
  }

  function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      e.x += Math.cos(angle) * e.speed * delta;
      e.y += Math.sin(angle) * e.speed * delta;

      if (dist(e.x, e.y, player.x, player.y) < e.r + player.r) {
        if (player.invuln <= 0) {
          player.health -= e.damage;
          player.invuln = 0.5;
          if (player.health <= 0) {
            die();
            return;
          }
        }
      }
    }
  }

  function crash(err) {
    console.error('Game loop crashed:', err);
    state.gameOver = true;
    state.running = false;
    hud.classList.add('hidden');
    death.classList.remove('hidden');
    deathQuote.textContent = `Ошибка: ${err && err.message ? err.message : String(err)}`;
  }

  function die() {
    state.gameOver = true;
    state.running = false;

    const elapsed = state.elapsed;
    if (elapsed > state.record) {
      state.record = elapsed;
      writeRecord();
    }

    deathTime.textContent = formatTime(elapsed);
    deathWaves.textContent = state.wave;
    deathKills.textContent = state.kills;
    deathCoins.textContent = state.coins;
    deathUpgrade.textContent = state.bestUpgrade;
    deathRecord.textContent = formatTime(state.record);
    deathQuote.textContent = deathQuotes[Math.floor(Math.random() * deathQuotes.length)];

    death.classList.remove('hidden');
    hud.classList.add('hidden');
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    ctx.setTransform(viewScale * dpr, 0, 0, viewScale * dpr, viewOffsetX * dpr, viewOffsetY * dpr);

    drawArena();
    drawCoins();
    drawArrows();
    drawEnemies();
    drawPlayer();
  }

  function drawArena() {
    if (!arenaPattern) {
      arenaPattern = createArenaPattern();
    }
    ctx.fillStyle = arenaPattern;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    ctx.strokeStyle = '#7a1d1d';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, worldWidth - 12, worldHeight - 12);
  }

  function isPlayerMoving() {
    if (inputs.up || inputs.down || inputs.left || inputs.right) return true;
    if (inputs.touchMove.active) {
      return Math.abs(inputs.touchMove.dx) > 0.1 || Math.abs(inputs.touchMove.dy) > 0.1;
    }
    return false;
  }

  function drawPlayer() {
    const moving = isPlayerMoving();
    const frame = Math.floor((performance.now() / 200) % 2);
    const sprite = moving ? sprites.playerWalk[frame] : sprites.player;
    const baseSize = DRAW.player;
    ctx.drawImage(sprite, player.x - baseSize / 2, player.y - baseSize / 2, baseSize, baseSize);

    const angle = Math.atan2(inputs.mouseY - player.y, inputs.mouseX - player.x);
    const gun = sprites.gun;
    if (gun) {
      ctx.save();
      // Place the bow ahead of the player in aim direction,
      // so bow rotation doesn't "slide" the muzzle visually.
      const bx = player.x + Math.cos(angle) * DRAW.bowOffset;
      const by = player.y + Math.sin(angle) * DRAW.bowOffset;
      ctx.translate(bx, by);
      // Gun sprite is authored pointing right; mirror for left.
      const flip = Math.cos(angle) < 0;
      ctx.rotate(angle);
      if (flip) ctx.scale(1, -1);
      const bowSize = baseSize;
      ctx.drawImage(gun, -bowSize / 2, -bowSize / 2, bowSize, bowSize);
      ctx.restore();
    }
  }

  function drawEnemies() {
    const frame = Math.floor((performance.now() / 250) % 2);
    enemies.forEach((e) => {
      let sprite = sprites.slime;
      if (e.type === 'Летучая мышь') sprite = sprites.bat;
      if (e.type === 'Голем') sprite = sprites.golem;

      if (e.type === 'Слизь' && sprites.slimeWalk) sprite = sprites.slimeWalk[frame];
      if (e.type === 'Летучая мышь' && sprites.batWalk) sprite = sprites.batWalk[frame];
      if (e.type === 'Голем' && sprites.golemWalk) sprite = sprites.golemWalk[frame];
      const size = DRAW.enemy;
      ctx.drawImage(sprite, e.x - size / 2, e.y - size / 2, size, size);

      // Health bar
      if (e.maxHealth && e.health < e.maxHealth) {
        const pct = clamp(e.health / e.maxHealth, 0, 1);
        const barW = 22;
        const barH = 3;
        const y = e.y - size / 2 - 6;
        const x = e.x - barW / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#2a2f3a';
        ctx.fillRect(x, y, barW, barH);

        ctx.fillStyle = pct > 0.5 ? '#44c06f' : pct > 0.2 ? '#ffcc00' : '#ff4d4d';
        ctx.fillRect(x, y, Math.max(0, Math.floor(barW * pct)), barH);
      }
    });
  }

  function drawArrows() {
    arrows.forEach((a) => {
      const sprite = sprites.arrow;
      const angle = Math.atan2(a.vy, a.vx);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(angle);
      ctx.drawImage(sprite, -DRAW.arrowW / 2, -DRAW.arrowH / 2, DRAW.arrowW, DRAW.arrowH);
      ctx.restore();
    });
  }

  function drawCoins() {
    coins.forEach((c) => {
      const sprite = sprites.coin;
      const size = DRAW.coin;
      ctx.drawImage(sprite, c.x - size / 2, c.y - size / 2, size, size);
    });
  }

  function getMoveVector() {
    let x = 0;
    let y = 0;

    if (inputs.up) y -= 1;
    if (inputs.down) y += 1;
    if (inputs.left) x -= 1;
    if (inputs.right) x += 1;

    if (inputs.touchMove.active) {
      x = inputs.touchMove.dx;
      y = inputs.touchMove.dy;
    }

    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  function loop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const delta = Math.min(0.05, (timestamp - state.lastTime) / 1000);
    state.lastTime = timestamp;

    try {
      update(delta);
      render();
    } catch (err) {
      crash(err);
      return;
    }

    requestAnimationFrame(loop);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - viewOffsetX) / viewScale;
    const y = (clientY - rect.top - viewOffsetY) / viewScale;
    return { x, y };
  }

  function bindControls() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputs.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputs.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputs.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputs.right = true;
      if (e.code === 'KeyR') startReload();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputs.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputs.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputs.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputs.right = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const pos = screenToWorld(e.clientX, e.clientY);
      inputs.mouseX = clamp(pos.x, 0, worldWidth);
      inputs.mouseY = clamp(pos.y, 0, worldHeight);
    });

    canvas.addEventListener('mousedown', () => {
      inputs.shooting = true;
    });
    window.addEventListener('mouseup', () => {
      inputs.shooting = false;
    });

    touchLeft.addEventListener('pointerdown', (e) => {
      try { touchLeft.setPointerCapture(e.pointerId); } catch {}
      inputs.touchMove.active = true;
      inputs.touchMove.id = e.pointerId;
      inputs.touchMove.startX = e.clientX;
      inputs.touchMove.startY = e.clientY;
      inputs.touchMove.dx = 0;
      inputs.touchMove.dy = 0;

      joystick.classList.remove('hidden');
      joystick.style.left = `${e.clientX - 60}px`;
      joystick.style.top = `${e.clientY - 60}px`;
      joystickThumb.style.left = '35px';
      joystickThumb.style.top = '35px';
    });

    touchLeft.addEventListener('pointermove', (e) => {
      if (!inputs.touchMove.active || e.pointerId !== inputs.touchMove.id) return;
      const dx = e.clientX - inputs.touchMove.startX;
      const dy = e.clientY - inputs.touchMove.startY;
      const max = 40;
      const len = Math.hypot(dx, dy);
      const norm = len > max ? max / len : 1;
      const clampedX = dx * norm;
      const clampedY = dy * norm;
      inputs.touchMove.dx = clampedX / max;
      inputs.touchMove.dy = clampedY / max;
      joystickThumb.style.left = `${35 + clampedX}px`;
      joystickThumb.style.top = `${35 + clampedY}px`;
    });

    const endTouchMove = (e) => {
      if (!inputs.touchMove.active || e.pointerId !== inputs.touchMove.id) return;
      inputs.touchMove.active = false;
      inputs.touchMove.dx = 0;
      inputs.touchMove.dy = 0;
      joystick.classList.add('hidden');
      try { touchLeft.releasePointerCapture(e.pointerId); } catch {}
    };

    touchLeft.addEventListener('pointerup', endTouchMove);
    touchLeft.addEventListener('pointercancel', endTouchMove);

    touchRight.addEventListener('pointerdown', (e) => {
      try { touchRight.setPointerCapture(e.pointerId); } catch {}
      inputs.touchShoot.active = true;
      inputs.touchShoot.id = e.pointerId;
      const pos = screenToWorld(e.clientX, e.clientY);
      inputs.mouseX = clamp(pos.x, 0, worldWidth);
      inputs.mouseY = clamp(pos.y, 0, worldHeight);
      inputs.shooting = true;
    });

    const endShoot = (e) => {
      if (inputs.touchShoot.id !== e.pointerId) return;
      inputs.touchShoot.active = false;
      inputs.shooting = false;
      try { touchRight.releasePointerCapture(e.pointerId); } catch {}
    };

    touchRight.addEventListener('pointerup', endShoot);
    touchRight.addEventListener('pointercancel', endShoot);

    touchRight.addEventListener('pointermove', (e) => {
      const pos = screenToWorld(e.clientX, e.clientY);
      inputs.mouseX = clamp(pos.x, 0, worldWidth);
      inputs.mouseY = clamp(pos.y, 0, worldHeight);
    });
  }

  function setupButtons() {
    btnStart.addEventListener('click', () => {
      menu.classList.add('hidden');
      howto.classList.add('hidden');
      death.classList.add('hidden');
      shop.classList.add('hidden');
      hud.classList.remove('hidden');
      resetGame();
    });

    btnHow.addEventListener('click', () => {
      howto.classList.remove('hidden');
      menu.classList.add('hidden');
    });

    btnBack.addEventListener('click', () => {
      howto.classList.add('hidden');
      menu.classList.remove('hidden');
    });

    btnShopContinue.addEventListener('click', () => {
      closeShop();
    });

    btnRestart.addEventListener('click', () => {
      death.classList.add('hidden');
      hud.classList.remove('hidden');
      resetGame();
    });

    btnMenu.addEventListener('click', () => {
      death.classList.add('hidden');
      menu.classList.remove('hidden');
    });
  }

  function setupTouch() {
    const isTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
      || ('ontouchstart' in window)
      || window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      touchLayer.classList.remove('hidden');
    }
  }

  function createSprite(width, height, drawFn) {
    const c = document.createElement('canvas');
    c.width = width * SPRITE_SCALE;
    c.height = height * SPRITE_SCALE;
    const sctx = c.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.setTransform(SPRITE_SCALE, 0, 0, SPRITE_SCALE, 0, 0);
    drawFn(sctx);
    return c;
  }

  function createSprites() {
    const drawPlayerSprite = (s, stepOffset) => {
      // Shadow
      s.fillStyle = '#0a0b0f';
      s.fillRect(10, 26, 12, 2);
      // Hood
      s.fillStyle = '#22252b';
      s.fillRect(10, 4, 12, 10);
      s.fillRect(8, 6, 16, 6);
      s.fillStyle = '#3a3f48';
      s.fillRect(10, 6, 12, 2);
      // Face
      s.fillStyle = '#d8b27c';
      s.fillRect(12, 10, 8, 6);
      s.fillStyle = '#f0cfa0';
      s.fillRect(13, 11, 3, 2);
      // Cloak
      s.fillStyle = '#2f3a49';
      s.fillRect(9, 16, 14, 10);
      s.fillRect(7, 18, 18, 8);
      s.fillStyle = '#465467';
      s.fillRect(10, 18, 4, 3);
      // Belt
      s.fillStyle = '#7a5a35';
      s.fillRect(10, 22, 12, 2);
      // Boots
      s.fillStyle = '#4a3623';
      s.fillRect(10 + stepOffset, 26, 4, 4);
      s.fillRect(18 - stepOffset, 26, 4, 4);
      // Quiver
      s.fillStyle = '#6a3f2b';
      s.fillRect(22, 14, 4, 8);
      s.fillStyle = '#c05050';
      s.fillRect(23, 12, 2, 2);
    };

    sprites.player = createSprite(32, 32, (s) => {
      drawPlayerSprite(s, 0);
    });

    sprites.playerWalk = [
      createSprite(32, 32, (s) => {
        drawPlayerSprite(s, 1);
      }),
      createSprite(32, 32, (s) => {
        drawPlayerSprite(s, -1);
      }),
    ];

    sprites.gun = createSprite(32, 32, (s) => {
      // Simple pistol sprite (points right)
      // Grip
      s.fillStyle = '#2a2f3a';
      s.fillRect(12, 18, 5, 7);
      s.fillRect(11, 20, 4, 6);
      s.fillStyle = '#1a1d26';
      s.fillRect(12, 20, 2, 4);

      // Body
      s.fillStyle = '#3f4248';
      s.fillRect(10, 14, 14, 4);
      s.fillRect(16, 12, 10, 3);
      s.fillStyle = '#60656f';
      s.fillRect(12, 15, 8, 2);

      // Barrel + muzzle
      s.fillStyle = '#1f2126';
      s.fillRect(24, 12, 4, 3);
      s.fillStyle = '#ffcc00';
      s.fillRect(28, 13, 1, 1);
    });

    sprites.slime = createSprite(32, 32, (s) => {
      // New look: toxic green blob
      s.fillStyle = '#0a0b0f';
      s.fillRect(8, 23, 16, 2);

      s.fillStyle = '#12311f';
      s.fillRect(6, 12, 20, 12);
      s.fillRect(8, 10, 16, 6);
      s.fillRect(10, 8, 12, 4);

      s.fillStyle = '#1f5a35';
      s.fillRect(10, 14, 12, 6);
      s.fillStyle = '#44c06f';
      s.fillRect(12, 12, 6, 2);

      s.fillStyle = '#0a0b0f';
      s.fillRect(12, 15, 2, 2);
      s.fillRect(18, 15, 2, 2);
      s.fillStyle = '#b7ffd1';
      s.fillRect(12, 15, 1, 1);
      s.fillRect(18, 15, 1, 1);
      s.fillStyle = '#b00020';
      s.fillRect(14, 18, 4, 2);
    });
    sprites.slimeWalk = [
      createSprite(32, 32, (s) => {
        s.fillStyle = '#0a0b0f';
        s.fillRect(9, 23, 14, 2);
        s.fillStyle = '#12311f';
        s.fillRect(6, 12, 20, 12);
        s.fillRect(8, 10, 16, 6);
        s.fillRect(10, 8, 12, 4);
        s.fillStyle = '#1f5a35';
        s.fillRect(10, 14, 12, 6);
        s.fillStyle = '#44c06f';
        s.fillRect(12, 12, 6, 2);
        s.fillStyle = '#0a0b0f';
        s.fillRect(12, 15, 2, 2);
        s.fillRect(18, 15, 2, 2);
        s.fillStyle = '#b7ffd1';
        s.fillRect(12, 15, 1, 1);
        s.fillRect(18, 15, 1, 1);
        s.fillStyle = '#b00020';
        s.fillRect(14, 18, 4, 2);
      }),
      createSprite(32, 32, (s) => {
        s.fillStyle = '#0a0b0f';
        s.fillRect(8, 23, 14, 2);
        s.fillStyle = '#12311f';
        s.fillRect(6, 12, 20, 12);
        s.fillRect(8, 10, 16, 6);
        s.fillRect(10, 8, 12, 4);
        s.fillStyle = '#1f5a35';
        s.fillRect(10, 14, 12, 6);
        s.fillStyle = '#44c06f';
        s.fillRect(12, 12, 6, 2);
        s.fillStyle = '#0a0b0f';
        s.fillRect(12, 15, 2, 2);
        s.fillRect(18, 15, 2, 2);
        s.fillStyle = '#b7ffd1';
        s.fillRect(12, 15, 1, 1);
        s.fillRect(18, 15, 1, 1);
        s.fillStyle = '#b00020';
        s.fillRect(14, 18, 4, 2);
      }),
    ];

    sprites.bat = createSprite(32, 32, (s) => {
      const ox = 2;
      const oy = 6;
      // New look: wider wings + brighter eyes
      s.fillStyle = '#0f121a';
      s.fillRect(ox + 2, oy + 10, 26, 6);
      s.fillRect(ox + 4, oy + 8, 22, 4);
      s.fillRect(ox + 8, oy + 6, 14, 4);
      // Body
      s.fillStyle = '#1a1d26';
      s.fillRect(ox + 12, oy + 10, 8, 6);
      // Eyes
      s.fillStyle = '#ff3b30';
      s.fillRect(ox + 13, oy + 11, 2, 2);
      s.fillRect(ox + 17, oy + 11, 2, 2);
      s.fillStyle = '#ffd1d1';
      s.fillRect(ox + 13, oy + 11, 1, 1);
      s.fillRect(ox + 17, oy + 11, 1, 1);
    });
    sprites.batWalk = [
      createSprite(32, 32, (s) => {
        const ox = 2;
        const oy = 6;
        s.fillStyle = '#0f121a';
        s.fillRect(ox + 2, oy + 11, 26, 5);
        s.fillRect(ox + 4, oy + 9, 22, 4);
        s.fillRect(ox + 8, oy + 7, 14, 3);
        s.fillStyle = '#1a1d26';
        s.fillRect(ox + 12, oy + 10, 8, 6);
        s.fillStyle = '#ff3b30';
        s.fillRect(ox + 13, oy + 11, 2, 2);
        s.fillRect(ox + 17, oy + 11, 2, 2);
      }),
      createSprite(32, 32, (s) => {
        const ox = 2;
        const oy = 6;
        s.fillStyle = '#0f121a';
        s.fillRect(ox + 2, oy + 9, 26, 5);
        s.fillRect(ox + 4, oy + 11, 22, 4);
        s.fillRect(ox + 8, oy + 13, 14, 3);
        s.fillStyle = '#1a1d26';
        s.fillRect(ox + 12, oy + 10, 8, 6);
        s.fillStyle = '#ff3b30';
        s.fillRect(ox + 13, oy + 11, 2, 2);
        s.fillRect(ox + 17, oy + 11, 2, 2);
      }),
    ];

    sprites.golem = createSprite(32, 32, (s) => {
      // New look: bronze golem with core
      s.fillStyle = '#3a2f22';
      s.fillRect(8, 8, 16, 16);
      s.fillRect(6, 12, 4, 10);
      s.fillRect(22, 12, 4, 10);
      s.fillStyle = '#6a5540';
      s.fillRect(10, 10, 12, 10);
      // Core
      s.fillStyle = '#ffcc00';
      s.fillRect(15, 14, 2, 2);
      s.fillStyle = '#b00020';
      s.fillRect(14, 14, 1, 1);
      s.fillRect(17, 14, 1, 1);
      // Feet shadow
      s.fillStyle = '#1f2126';
      s.fillRect(10, 24, 12, 2);
    });
    sprites.golemWalk = [
      createSprite(32, 32, (s) => {
        s.fillStyle = '#3a2f22';
        s.fillRect(8, 8, 16, 16);
        s.fillRect(6, 12, 4, 10);
        s.fillRect(22, 12, 4, 10);
        s.fillStyle = '#6a5540';
        s.fillRect(10, 10, 12, 10);
        s.fillStyle = '#ffcc00';
        s.fillRect(15, 14, 2, 2);
        s.fillStyle = '#1f2126';
        s.fillRect(9, 24, 5, 2);
        s.fillRect(18, 23, 5, 2);
      }),
      createSprite(32, 32, (s) => {
        s.fillStyle = '#3a2f22';
        s.fillRect(8, 8, 16, 16);
        s.fillRect(6, 12, 4, 10);
        s.fillRect(22, 12, 4, 10);
        s.fillStyle = '#6a5540';
        s.fillRect(10, 10, 12, 10);
        s.fillStyle = '#ffcc00';
        s.fillRect(15, 14, 2, 2);
        s.fillStyle = '#1f2126';
        s.fillRect(10, 23, 5, 2);
        s.fillRect(17, 24, 5, 2);
      }),
    ];

    sprites.arrow = createSprite(32, 32, (s) => {
      const ox = 10;
      const oy = 13;
      s.fillStyle = '#f7f1e1';
      s.fillRect(ox + 0, oy + 2, 9, 2);
      s.fillStyle = '#d6c07a';
      s.fillRect(ox + 9, oy + 1, 3, 4);
      s.fillStyle = '#a8834a';
      s.fillRect(ox + 0, oy + 1, 1, 4);
    });

    sprites.coin = createSprite(32, 32, (s) => {
      const ox = 12;
      const oy = 12;
      s.fillStyle = '#d7a93b';
      s.fillRect(ox + 1, oy + 1, 6, 6);
      s.fillStyle = '#f7d86b';
      s.fillRect(ox + 2, oy + 2, 2, 2);
      s.fillStyle = '#b8872e';
      s.fillRect(ox + 2, oy + 5, 4, 1);
    });
  }

  function createArenaPattern() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const s = c.getContext('2d');
    // Slightly brighter floor so arena isn't too dark.
    s.fillStyle = '#23222a';
    s.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 16);
      const y = Math.floor(Math.random() * 16);
      s.fillStyle = Math.random() > 0.5 ? '#2f2e39' : '#1a1921';
      s.fillRect(x, y, 1, 1);
    }
    return ctx.createPattern(c, 'repeat');
  }

  function init() {
    resize();
    createSprites();
    readRecord();
    bindControls();
    setupButtons();
    setupTouch();
    window.addEventListener('resize', resize);
    requestAnimationFrame(loop);
  }

  init();
})();
