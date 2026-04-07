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
  const arenaChoices = document.getElementById('arenaChoices');
  const weaponChoices = document.getElementById('weaponChoices');

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
  const damageFlash = document.getElementById('damageFlash');
  const waveBanner = document.getElementById('waveBanner');
  const bossHud = document.getElementById('bossHud');
  const bossName = document.getElementById('bossName');
  const bossBar = document.getElementById('bossBar');
  const reloadIndicator = document.getElementById('reloadIndicator');
  const reloadText = document.getElementById('reloadText');
  const reloadBar = document.getElementById('reloadBar');

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
    preparingWave: false,
    prepareTimer: 0,
    lastTime: 0,
    startTime: 0,
    elapsed: 0,
    wave: 1,
    kills: 0,
    coins: 0,
    bestUpgrade: '—',
    record: 0,
    bossWave: false,
    selectedArena: 'crypt',
    selectedWeapon: 'carbine',
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
    explosionRadiusBonus: 0,
    coinMagnet: 80,
    weaponSprite: 'carbine',
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
  const enemyProjectiles = [];
  const particles = [];
  const floatingTexts = [];

  const effects = {
    shakeTime: 0,
    shakeStrength: 0,
    flash: 0,
    bannerTimer: 0,
  };

  const arenaThemes = {
    crypt: {
      name: 'Крипта',
      passive: 'Монеты тянутся дальше',
      bg: '#16181d',
      tileA: '#20252d',
      tileB: '#28303a',
      tileC: '#313a46',
      seam: '#12161c',
      crack: '#556170',
      border: '#9db0c7',
      borderDark: '#4f5f73',
      glow: 'rgba(181, 210, 255, 0.14)',
      apply: () => {
        player.coinMagnet = 120;
      },
    },
    forge: {
      name: 'Кузня',
      passive: 'Быстрее стрельба',
      bg: '#1d1713',
      tileA: '#2a211b',
      tileB: '#352820',
      tileC: '#433128',
      seam: '#17110d',
      crack: '#9a6740',
      border: '#e5a05e',
      borderDark: '#7a4722',
      glow: 'rgba(255, 170, 94, 0.15)',
      apply: () => {
        player.fireRate += 0.35;
      },
    },
    citadel: {
      name: 'Цитадель',
      passive: 'Больше здоровья',
      bg: '#171b22',
      tileA: '#212833',
      tileB: '#2b3441',
      tileC: '#374458',
      seam: '#11161d',
      crack: '#6b7891',
      border: '#9fc0f0',
      borderDark: '#445b80',
      glow: 'rgba(159, 192, 240, 0.16)',
      apply: () => {
        player.maxHealth += 24;
        player.health += 24;
      },
    },
  };

  const weaponCatalog = {
    carbine: {
      name: 'Карабин',
      damage: 20,
      fireRate: 3.1,
      arrowSpeed: 560,
      clipSize: 8,
      reloadTime: 1.05,
      shots: 1,
      spread: 0.03,
      projectileLife: 1.25,
      projectile: 'arrow',
      weaponSprite: 'carbine',
      particle: '#ffcc66',
      pierce: 0,
    },
    scatter: {
      name: 'Дробовик',
      damage: 11,
      fireRate: 1.45,
      arrowSpeed: 430,
      clipSize: 5,
      reloadTime: 1.4,
      shots: 5,
      spread: 0.2,
      projectileLife: 0.72,
      projectile: 'pellet',
      weaponSprite: 'scatter',
      particle: '#ff9a5b',
      pierce: 0,
    },
    lancer: {
      name: 'Ланцер',
      damage: 52,
      fireRate: 0.92,
      arrowSpeed: 760,
      clipSize: 3,
      reloadTime: 1.6,
      shots: 1,
      spread: 0,
      projectileLife: 1.65,
      projectile: 'lance',
      weaponSprite: 'lancer',
      particle: '#9fd5ff',
      pierce: 2,
    },
    storm: {
      name: 'Штормер',
      damage: 15,
      fireRate: 4.7,
      arrowSpeed: 500,
      clipSize: 12,
      reloadTime: 1.1,
      shots: 2,
      spread: 0.08,
      projectileLife: 1.05,
      projectile: 'spark',
      weaponSprite: 'storm',
      particle: '#8ff7ff',
      pierce: 0,
    },
  };

  const enemyTypes = [
    { name: 'Слизь', chance: 0.4, speed: 98, health: 70, damage: 10, r: 14, reward: 2, minWave: 1 },
    { name: 'Летучая мышь', chance: 0.2, speed: 132, health: 58, damage: 10, r: 12, reward: 3, minWave: 2, speedScale: 0.72 },
    { name: 'Скелет-лучник', chance: 0.24, speed: 84, health: 90, damage: 14, r: 13, reward: 4, minWave: 3, ranged: true, preferredDistance: 150, projectileSpeed: 300, attackCooldown: 1.55, contactDamage: 8 },
    { name: 'Голем', chance: 0.16, speed: 74, health: 190, damage: 22, r: 16, reward: 5, minWave: 4 },
  ];

  const bossTypes = [
    {
      name: 'Король костей',
      speed: 90,
      health: 2300,
      damage: 38,
      r: 20,
      reward: 44,
      ranged: true,
      preferredDistance: 165,
      projectileSpeed: 390,
      attackCooldown: 0.78,
      contactDamage: 22,
      sprite: 'skeletonBoss',
    },
    {
      name: 'Титан-слизень',
      speed: 112,
      health: 2800,
      damage: 44,
      r: 24,
      reward: 50,
      contactDamage: 34,
      sprite: 'slimeBoss',
    },
  ];

  const upgradePool = [
    {
      id: 'damage',
      name: 'Урон пули',
      desc: '+4 к урону',
      baseCost: 22,
      apply: () => { player.damage += 4; },
    },
    {
      id: 'firerate',
      name: 'Скорость стрельбы',
      desc: '+0.35 выстр./сек',
      baseCost: 26,
      apply: () => { player.fireRate += 0.35; },
    },
    {
      id: 'speed',
      name: 'Скорость бега',
      desc: '+18 к скорости',
      baseCost: 24,
      apply: () => { player.speed += 18; },
    },
    {
      id: 'health',
      name: 'Макс. здоровье',
      desc: '+14 к максимуму',
      baseCost: 28,
      apply: () => { player.maxHealth += 14; player.health += 14; },
    },
    {
      id: 'arrowSpeed',
      name: 'Скорость пули',
      desc: '+85 к скорости',
      baseCost: 20,
      apply: () => { player.arrowSpeed += 85; },
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
      desc: '+22 здоровья',
      baseCost: 18,
      apply: () => { player.health = Math.min(player.maxHealth, player.health + 22); },
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

  function applySelectedLoadout() {
    const weapon = weaponCatalog[state.selectedWeapon] || weaponCatalog.carbine;
    player.damage = weapon.damage;
    player.fireRate = weapon.fireRate;
    player.arrowSpeed = weapon.arrowSpeed;
    player.clipSize = weapon.clipSize;
    player.ammo = weapon.clipSize;
    player.reloadTime = weapon.reloadTime;
    player.weaponSprite = weapon.weaponSprite;
    player.coinMagnet = 80;
    player.explosionRadiusBonus = 0;

    const theme = arenaThemes[state.selectedArena] || arenaThemes.crypt;
    if (theme.apply) theme.apply();
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
    state.bossWave = false;
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
    player.explosionRadiusBonus = 0;
    player.coinMagnet = 80;
    player.invuln = 0;
    player.clipSize = 8;
    player.ammo = 8;
    player.reloadTime = 1.1;
    player.reloading = false;
    player.reloadLeft = 0;
    player.weaponSprite = 'carbine';

    enemies.length = 0;
    arrows.length = 0;
    coins.length = 0;
    enemyProjectiles.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    effects.shakeTime = 0;
    effects.shakeStrength = 0;
    effects.flash = 0;
    effects.bannerTimer = 0;
    state.preparingWave = false;
    state.prepareTimer = 0;
    damageFlash.style.opacity = '0';
    waveBanner.classList.add('hidden');
    bossHud.classList.add('hidden');
    reloadIndicator.classList.add('hidden');

    for (const key of Object.keys(upgradeLevels)) {
      delete upgradeLevels[key];
    }

    applySelectedLoadout();
    resetPlayer();
    beginWaveCountdown();
    updateHud();
  }

  function beginWaveCountdown() {
    state.preparingWave = true;
    state.prepareTimer = 3;
    player.invuln = Math.max(player.invuln, 3.2);
    showWaveBanner(`Волна ${state.wave} через 3`);
  }

  function spawnWave() {
    state.bossWave = state.wave > 0 && state.wave % 5 === 0;
    if (state.bossWave) {
      spawnBossWave();
      return;
    }

    const base = 4;
    const extra = Math.max(0, state.wave - 5);
    const count = base + extra + Math.floor(state.wave * 0.8);

    showWaveBanner(`Волна ${state.wave}`);

    for (let i = 0; i < count; i++) {
      const type = rollEnemyType();
      enemies.push(createEnemy(type));
    }
  }

  function spawnBossWave() {
    const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    showWaveBanner(`Босс: ${bossType.name}`);
    enemies.push(createBoss(bossType));
  }

  function rollEnemyType() {
    const availableTypes = enemyTypes.filter((type) => state.wave >= (type.minWave || 1));
    const totalChance = availableTypes.reduce((sum, type) => sum + type.chance, 0);
    const r = Math.random() * totalChance;
    let sum = 0;
    for (const type of availableTypes) {
      sum += type.chance;
      if (r <= sum) return type;
    }
    return availableTypes[0] || enemyTypes[0];
  }

  function getWaveScaling(wave = state.wave, boss = false) {
    const safeWave = Math.max(1, wave);
    const regularProgress = safeWave - 1;
    const bossProgress = Math.max(0, safeWave / 5 - 1);

    if (boss) {
      return {
        speed: 1 + bossProgress * 0.18,
        health: 1 + bossProgress * 0.8,
        damage: 1 + bossProgress * 0.36,
      };
    }

    return {
      speed: 1 + regularProgress * 0.065,
      health: 1 + regularProgress * 0.28,
      damage: 1 + regularProgress * 0.18,
    };
  }

  function createEnemy(type) {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = -40; y = Math.random() * worldHeight; }
    if (edge === 1) { x = worldWidth + 40; y = Math.random() * worldHeight; }
    if (edge === 2) { x = Math.random() * worldWidth; y = -40; }
    if (edge === 3) { x = Math.random() * worldWidth; y = worldHeight + 40; }

    const scaling = getWaveScaling(state.wave, false);
    const scaledHealth = Math.round(type.health * scaling.health);
    const scaledDamage = Math.max(1, Math.round(type.damage * scaling.damage));
    const scaledContactDamage = Math.max(1, Math.round((type.contactDamage || type.damage) * scaling.damage));
    const speedScale = type.speedScale || 1;
    const scaledSpeed = type.speed * (1 + (scaling.speed - 1) * speedScale);

    return {
      x,
      y,
      r: type.r,
      health: scaledHealth,
      maxHealth: scaledHealth,
      speed: scaledSpeed,
      damage: scaledDamage,
      reward: type.reward + Math.floor((state.wave - 1) / 5),
      type: type.name,
      ranged: Boolean(type.ranged),
      preferredDistance: type.preferredDistance || 0,
      projectileSpeed: (type.projectileSpeed || 0) * Math.min(1.8, 1 + (scaling.speed - 1) * 0.7),
      attackCooldown: type.attackCooldown ? type.attackCooldown * (0.75 + Math.random() * 0.5) : 0,
      attackTimer: type.attackCooldown ? 0.4 + Math.random() * type.attackCooldown : 0,
      contactDamage: scaledContactDamage,
      boss: false,
      phaseTimer: 0,
      summonCooldown: 0,
      specialCooldown: 0,
      sprite: type.sprite || null,
    };
  }

  function createBoss(type) {
    const boss = createEnemy(type);
    const scaling = getWaveScaling(state.wave, true);
    boss.x = worldWidth / 2;
    boss.y = 72;
    boss.speed = type.speed * scaling.speed;
    boss.health = Math.round(type.health * scaling.health);
    boss.maxHealth = boss.health;
    boss.damage = Math.max(1, Math.round(type.damage * scaling.damage));
    boss.contactDamage = Math.max(1, Math.round((type.contactDamage || type.damage) * scaling.damage));
    boss.projectileSpeed = (type.projectileSpeed || 0) * Math.min(2, 1 + (scaling.speed - 1) * 0.75);
    boss.reward = type.reward + Math.floor(state.wave / 3);
    boss.boss = true;
    boss.attackTimer = 0.8;
    boss.phaseTimer = 2.4;
    boss.summonCooldown = 4.4;
    boss.specialCooldown = boss.type === 'Король костей' ? 2.8 : 3.2;
    boss.sprite = type.sprite;
    return boss;
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
    return Math.floor(baseCost * (1 + level * 0.65 + Math.max(0, state.wave - 1) * 0.08));
  }

  function closeShop() {
    state.inShop = false;
    shop.classList.add('hidden');
    state.wave += 1;
    beginWaveCountdown();
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

    const activeBoss = enemies.find((enemy) => enemy.boss);
    if (activeBoss && !state.gameOver) {
      bossHud.classList.remove('hidden');
      bossName.textContent = activeBoss.type;
      bossBar.style.width = `${Math.max(0, (activeBoss.health / activeBoss.maxHealth) * 100)}%`;
    } else {
      bossHud.classList.add('hidden');
    }

    if (player.reloading) {
      const progress = clamp(1 - player.reloadLeft / player.reloadTime, 0, 1);
      reloadIndicator.classList.remove('hidden');
      reloadBar.style.width = `${Math.round(progress * 100)}%`;
      reloadText.textContent = `Перезарядка ${Math.ceil(player.reloadLeft * 10) / 10}с`;
    } else {
      reloadIndicator.classList.add('hidden');
    }
  }

  function startReload() {
    if (player.reloading) return;
    if (player.ammo >= player.clipSize) return;
    player.reloading = true;
    player.reloadLeft = player.reloadTime;
  }

  function shoot() {
    const weapon = weaponCatalog[state.selectedWeapon] || weaponCatalog.carbine;
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
    const spawnX = player.x + Math.cos(angle) * DRAW.bowOffset;
    const spawnY = player.y + Math.sin(angle) * DRAW.bowOffset;
    const totalShots = weapon.shots + Math.max(0, player.multiShot - 1);
    const spread = weapon.spread || 0;
    for (let i = 0; i < totalShots; i++) {
      const offset = totalShots > 1 ? (i - (totalShots - 1) / 2) * spread : 0;
      arrows.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle + offset) * player.arrowSpeed,
        vy: Math.sin(angle + offset) * player.arrowSpeed,
        damage: player.damage,
        life: weapon.projectileLife,
        projectile: weapon.projectile,
        pierce: weapon.pierce || 0,
        radius: weapon.projectile === 'pellet' ? 4 : weapon.projectile === 'spark' ? 5 : 6,
      });
    }
    spawnParticles(spawnX, spawnY, weapon.particle, 4, 80, 0.18, 2.2);

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

      if (state.preparingWave) {
        updateWaveCountdown(delta);
      } else if (inputs.shooting) {
        shoot();
      }

      updateArrows(delta);
      if (!state.preparingWave) {
        updateEnemies(delta);
        updateEnemyProjectiles(delta);
      }
      updateCoins(delta);
      updateParticles(delta);
      updateFloatingTexts(delta);
    }

    updateEffects(delta);

    state.elapsed = Math.floor((performance.now() - state.startTime) / 1000);
    updateHud();

    if (!state.inShop && !state.preparingWave && enemies.length === 0) {
      openShop();
    }
  }

  function updateWaveCountdown(delta) {
    state.prepareTimer = Math.max(0, state.prepareTimer - delta);
    const secondsLeft = Math.ceil(state.prepareTimer);
    if (secondsLeft > 0) {
      showWaveBanner(`Волна ${state.wave} через ${secondsLeft}`);
      return;
    }

    state.preparingWave = false;
    state.prepareTimer = 0;
    player.invuln = Math.max(player.invuln, 0.6);
    showWaveBanner(state.wave % 5 === 0 ? 'Бой с боссом!' : `Волна ${state.wave}`);
    spawnWave();
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
        if (dist(a.x, a.y, e.x, e.y) <= e.r + (a.radius || 0)) {
          e.health -= a.damage;
          spawnFloatingText(a.x, a.y - 6, `-${Math.round(a.damage)}`, '#ffd166');
          spawnParticles(a.x, a.y, '#ffd166', 4, 90, 0.24, 2.5);
          if (player.explosive) {
            explodeDamage(a.x, a.y, 40 + player.explosionRadiusBonus, a.damage * 0.4);
            shakeScreen(0.12, 5);
          }
          if (a.pierce > 0) {
            a.pierce -= 1;
            a.damage *= 0.82;
          } else {
            arrows.splice(i, 1);
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
        spawnParticles(e.x, e.y, '#ff8c42', 2, 60, 0.18, 2);
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
    spawnFloatingText(e.x, e.y - 10, e.type, '#8ce99a', 20, 0.6, 10);
    spawnParticles(e.x, e.y, '#8ce99a', 7, 120, 0.35, 3);
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
      if (d < player.coinMagnet) {
        const pull = (1 - d / player.coinMagnet) * 240 * delta;
        const angle = Math.atan2(player.y - c.y, player.x - c.x);
        c.x += Math.cos(angle) * pull;
        c.y += Math.sin(angle) * pull;
      }
      if (d < 16) {
        state.coins += c.value;
        spawnFloatingText(c.x, c.y - 4, `+${c.value}`, '#ffde59', 18, 0.45, 10);
        coins.splice(i, 1);
      }
    }
  }

  function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      const distanceToPlayer = dist(e.x, e.y, player.x, player.y);
      if (e.boss) {
        updateBossBehavior(e, angle, distanceToPlayer, delta);
      } else if (e.ranged) {
        e.attackTimer = Math.max(0, e.attackTimer - delta);
        let moveX = 0;
        let moveY = 0;

        if (distanceToPlayer > e.preferredDistance + 18) {
          moveX = Math.cos(angle);
          moveY = Math.sin(angle);
        } else if (distanceToPlayer < e.preferredDistance - 18) {
          moveX = -Math.cos(angle);
          moveY = -Math.sin(angle);
        } else {
          const strafeDirection = Math.sin((performance.now() + i * 137) / 280) >= 0 ? 1 : -1;
          moveX = Math.cos(angle + Math.PI / 2 * strafeDirection) * 0.65;
          moveY = Math.sin(angle + Math.PI / 2 * strafeDirection) * 0.65;
        }

        e.x += moveX * e.speed * delta;
        e.y += moveY * e.speed * delta;

        if (e.attackTimer <= 0 && distanceToPlayer < e.preferredDistance + 70) {
          fireEnemyProjectile(e, angle);
          e.attackTimer = e.attackCooldown;
        }
      } else {
        e.x += Math.cos(angle) * e.speed * delta;
        e.y += Math.sin(angle) * e.speed * delta;
      }

      e.x = clamp(e.x, e.r, worldWidth - e.r);
      e.y = clamp(e.y, e.r, worldHeight - e.r);

      if (dist(e.x, e.y, player.x, player.y) < e.r + player.r) {
        if (player.invuln <= 0) {
          player.health -= e.contactDamage;
          player.invuln = 0.5;
          flashDamage(0.5);
          shakeScreen(0.16, 8);
          spawnFloatingText(player.x, player.y - 18, `-${e.contactDamage}`, '#ff6b6b', 26, 0.55, 12);
          if (player.health <= 0) {
            die();
            return;
          }
        }
      }
    }
  }

  function updateBossBehavior(enemy, angle, distanceToPlayer, delta) {
    enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - delta);
    enemy.summonCooldown = Math.max(0, enemy.summonCooldown - delta);
    enemy.specialCooldown = Math.max(0, enemy.specialCooldown - delta);
    const projectilePressure = enemyProjectiles.length;

    if (enemy.type === 'Король костей') {
      let moveX = 0;
      let moveY = 0;
      if (distanceToPlayer > enemy.preferredDistance + 20) {
        moveX = Math.cos(angle);
        moveY = Math.sin(angle);
      } else if (distanceToPlayer < enemy.preferredDistance - 20) {
        moveX = -Math.cos(angle);
        moveY = -Math.sin(angle);
      }
      enemy.x += moveX * enemy.speed * delta;
      enemy.y += moveY * enemy.speed * delta;

      if (enemy.specialCooldown <= 0 && projectilePressure <= 10) {
        fireRadialBurst(enemy, enemy.health < enemy.maxHealth * 0.45 ? 10 : 7, enemy.projectileSpeed * 0.62, enemy.damage * 0.72);
        spawnFloatingText(enemy.x, enemy.y - 34, 'Костяной шторм', '#d8dde6', 20, 0.75, 12);
        shakeScreen(0.16, 6);
        enemy.specialCooldown = enemy.health < enemy.maxHealth * 0.45 ? 3.2 : 4.8;
        enemy.attackTimer = Math.max(enemy.attackTimer, 0.8);
      } else if (enemy.attackTimer <= 0 && projectilePressure <= 8) {
        const lowHp = enemy.health < enemy.maxHealth * 0.45;
        fireEnemyBurst(enemy, angle, lowHp ? 5 : 4, lowHp ? 0.14 : 0.18, enemy.projectileSpeed * 0.92);
        shakeScreen(0.14, 4);
        enemy.attackTimer = lowHp ? 1.05 : 1.35;
      }

      if (enemy.summonCooldown <= 0) {
        summonMinions(enemy.x, enemy.y, enemy.health < enemy.maxHealth * 0.5 ? 3 : 2, ['Скелет-лучник', 'Летучая мышь']);
        enemy.summonCooldown = enemy.health < enemy.maxHealth * 0.5 ? 5.6 : 7;
      }
    } else {
      if (enemy.phaseTimer <= 0) {
        const lowHp = enemy.health < enemy.maxHealth * 0.5;
        enemy.phaseTimer = lowHp ? 1.1 : 1.8;
        enemy.x += Math.cos(angle) * (lowHp ? 80 : 56);
        enemy.y += Math.sin(angle) * (lowHp ? 80 : 56);
        spawnParticles(enemy.x, enemy.y, '#8ff7c2', 12, 190, 0.45, 4.5);
        spawnFloatingText(enemy.x, enemy.y - 30, 'Рывок', '#8ff7c2', 20, 0.55, 12);
        shakeScreen(0.22, 8);
      }

      enemy.x += Math.cos(angle) * enemy.speed * 1.16 * delta;
      enemy.y += Math.sin(angle) * enemy.speed * 1.16 * delta;

      if (enemy.specialCooldown <= 0 && projectilePressure <= 9) {
        fireEnemyBurst(enemy, angle, enemy.health < enemy.maxHealth * 0.5 ? 4 : 3, 0.22, 190);
        spawnFloatingText(enemy.x, enemy.y - 34, 'Кислотный плевок', '#8ff7c2', 22, 0.75, 12);
        enemy.specialCooldown = enemy.health < enemy.maxHealth * 0.5 ? 3.4 : 4.6;
        enemy.attackTimer = Math.max(enemy.attackTimer, 0.9);
      } else if (enemy.attackTimer <= 0 && projectilePressure <= 7) {
        fireRadialBurst(enemy, enemy.health < enemy.maxHealth * 0.5 ? 8 : 6, (enemy.projectileSpeed || 210) * 0.82, enemy.damage * 0.62, '#8ff7c2');
        enemy.attackTimer = enemy.health < enemy.maxHealth * 0.5 ? 2.1 : 2.9;
      }

      if (enemy.summonCooldown <= 0) {
        summonMinions(enemy.x, enemy.y, enemy.health < enemy.maxHealth * 0.5 ? 3 : 2, ['Слизь', 'Голем']);
        enemy.summonCooldown = enemy.health < enemy.maxHealth * 0.5 ? 4.8 : 6.2;
      }
    }
  }

  function fireEnemyProjectile(enemy, angle) {
    const spawnX = enemy.x + Math.cos(angle) * (enemy.r + 4);
    const spawnY = enemy.y + Math.sin(angle) * (enemy.r + 4);
    enemyProjectiles.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * enemy.projectileSpeed,
      vy: Math.sin(angle) * enemy.projectileSpeed,
      damage: enemy.damage,
      life: 2.4,
      r: 4,
      tint: '#d8dde6',
    });
    spawnParticles(spawnX, spawnY, '#bfc7d5', 3, 60, 0.16, 2);
  }

  function fireEnemyBurst(enemy, angle, count, spread, speed) {
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      const shotAngle = angle + offset;
      const spawnX = enemy.x + Math.cos(shotAngle) * (enemy.r + 4);
      const spawnY = enemy.y + Math.sin(shotAngle) * (enemy.r + 4);
      enemyProjectiles.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(shotAngle) * speed,
        vy: Math.sin(shotAngle) * speed,
        damage: enemy.damage,
        life: 2.4,
        r: 4,
        tint: '#d8dde6',
      });
    }
    spawnParticles(enemy.x, enemy.y, '#d8dde6', 5, 90, 0.2, 2.5);
  }

  function fireRadialBurst(enemy, count, speed, damage = enemy.damage, color = '#d8dde6') {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      enemyProjectiles.push({
        x: enemy.x + Math.cos(angle) * (enemy.r + 6),
        y: enemy.y + Math.sin(angle) * (enemy.r + 6),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: Math.max(1, Math.round(damage)),
        life: 2.1,
        r: 4,
        tint: color,
      });
    }
    spawnParticles(enemy.x, enemy.y, color, 8, 110, 0.24, 3);
  }

  function summonMinions(x, y, count = 2, allowedTypes = null) {
    const options = enemyTypes.filter((type) => {
      if (allowedTypes && allowedTypes.length) return allowedTypes.includes(type.name);
      return type.name !== 'Голем' && type.name !== 'Скелет-лучник';
    });
    for (let i = 0; i < count; i++) {
      const type = options[Math.floor(Math.random() * options.length)];
      const minion = createEnemy(type);
      minion.x = clamp(x + rand(-40, 40), minion.r, worldWidth - minion.r);
      minion.y = clamp(y + rand(-28, 28), minion.r, worldHeight - minion.r);
      enemies.push(minion);
    }
    spawnFloatingText(x, y - 26, `Призыв x${count}`, '#8ff7c2', 20, 0.7, 12);
  }

  function updateEnemyProjectiles(delta) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = enemyProjectiles[i];
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.life -= delta;

      if (
        projectile.life <= 0
        || projectile.x < -30
        || projectile.x > worldWidth + 30
        || projectile.y < -30
        || projectile.y > worldHeight + 30
      ) {
        enemyProjectiles.splice(i, 1);
        continue;
      }

      if (dist(projectile.x, projectile.y, player.x, player.y) <= player.r + projectile.r) {
        enemyProjectiles.splice(i, 1);
        if (player.invuln > 0) continue;
        player.health -= projectile.damage;
        player.invuln = 0.5;
        flashDamage(0.6);
        shakeScreen(0.14, 6);
        spawnParticles(projectile.x, projectile.y, projectile.tint || '#ff8a8a', 5, 90, 0.24, 2.7);
        spawnFloatingText(player.x, player.y - 18, `-${projectile.damage}`, '#ff8787', 26, 0.55, 12);
        if (player.health <= 0) {
          die();
          return;
        }
      }
    }
  }

  function crash(err) {
    console.error('Game loop crashed:', err);
    state.gameOver = true;
    state.running = false;
    hud.classList.add('hidden');
    bossHud.classList.add('hidden');
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
    bossHud.classList.add('hidden');
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const shakeX = effects.shakeTime > 0 ? rand(-effects.shakeStrength, effects.shakeStrength) : 0;
    const shakeY = effects.shakeTime > 0 ? rand(-effects.shakeStrength, effects.shakeStrength) : 0;
    ctx.setTransform(
      viewScale * dpr,
      0,
      0,
      viewScale * dpr,
      (viewOffsetX + shakeX) * dpr,
      (viewOffsetY + shakeY) * dpr
    );

    drawArena();
    drawCoins();
    drawArrows();
    drawEnemyProjectiles();
    drawEnemies();
    drawPlayer();
    drawParticles();
    drawFloatingTexts();
    drawCrosshair();
  }

  function drawArena() {
    const theme = arenaThemes[state.selectedArena] || arenaThemes.crypt;
    if (!arenaPattern) {
      arenaPattern = createArenaPattern();
    }
    ctx.fillStyle = arenaPattern;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, worldWidth, 16);
    ctx.fillRect(0, worldHeight - 16, worldWidth, 16);
    ctx.fillRect(0, 0, 16, worldHeight);
    ctx.fillRect(worldWidth - 16, 0, 16, worldHeight);

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, worldWidth - 12, worldHeight - 12);

    ctx.strokeStyle = theme.borderDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, worldWidth - 24, worldHeight - 24);

    ctx.strokeStyle = theme.glow;
    ctx.lineWidth = 2;
    ctx.strokeRect(worldWidth / 2 - 54, worldHeight / 2 - 32, 108, 64);

    ctx.fillStyle = theme.glow;
    ctx.fillRect(worldWidth / 2 - 3, worldHeight / 2 - 18, 6, 36);
    ctx.fillRect(worldWidth / 2 - 18, worldHeight / 2 - 3, 36, 6);
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
    const gun = sprites[player.weaponSprite] || sprites.carbine || sprites.gun;
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

    if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) {
      ctx.strokeStyle = 'rgba(255,107,107,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEnemies() {
    const frame = Math.floor((performance.now() / 250) % 2);
    enemies.forEach((e) => {
      let sprite = sprites.slime;
      if (e.boss && e.sprite && sprites[e.sprite]) sprite = sprites[e.sprite];
      if (e.type === 'Летучая мышь') sprite = sprites.bat;
      if (e.type === 'Скелет-лучник') sprite = sprites.skeleton;
      if (e.type === 'Голем') sprite = sprites.golem;
      if (e.type === 'Король костей') sprite = sprites.skeletonBoss;
      if (e.type === 'Титан-слизень') sprite = sprites.slimeBoss;

      if (e.type === 'Слизь' && sprites.slimeWalk) sprite = sprites.slimeWalk[frame];
      if (e.type === 'Летучая мышь' && sprites.batWalk) sprite = sprites.batWalk[frame];
      if (e.type === 'Скелет-лучник' && sprites.skeletonWalk) sprite = sprites.skeletonWalk[frame];
      if (e.type === 'Голем' && sprites.golemWalk) sprite = sprites.golemWalk[frame];
      if (e.type === 'Король костей' && sprites.skeletonBossWalk) sprite = sprites.skeletonBossWalk[frame];
      if (e.type === 'Титан-слизень' && sprites.slimeBossWalk) sprite = sprites.slimeBossWalk[frame];
      const size = e.boss ? DRAW.enemy * 1.6 : DRAW.enemy;
      ctx.drawImage(sprite, e.x - size / 2, e.y - size / 2, size, size);

      if (e.ranged) {
        const aimAngle = Math.atan2(player.y - e.y, player.x - e.x);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(aimAngle);
        if (Math.cos(aimAngle) < 0) ctx.scale(1, -1);
        ctx.drawImage(sprites.enemyBow, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

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

      if (e.boss) {
        ctx.strokeStyle = 'rgba(255, 179, 71, 0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x - size / 2 - 2, e.y - size / 2 - 2, size + 4, size + 4);
      }
    });
  }

  function drawArrows() {
    arrows.forEach((a) => {
      const sprite = sprites[a.projectile] || sprites.arrow;
      const angle = Math.atan2(a.vy, a.vx);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(angle);
      const w = a.projectile === 'pellet' ? 8 : a.projectile === 'spark' ? 10 : a.projectile === 'lance' ? 16 : DRAW.arrowW;
      const h = a.projectile === 'spark' ? 8 : DRAW.arrowH;
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  function drawEnemyProjectiles() {
    enemyProjectiles.forEach((projectile) => {
      const angle = Math.atan2(projectile.vy, projectile.vx);
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(angle);
      if (projectile.tint && projectile.tint !== '#d8dde6') {
        ctx.fillStyle = projectile.tint;
        ctx.fillRect(-DRAW.arrowW / 2, -DRAW.arrowH / 2, DRAW.arrowW, DRAW.arrowH);
      }
      ctx.drawImage(sprites.enemyArrow, -DRAW.arrowW / 2, -DRAW.arrowH / 2, DRAW.arrowW, DRAW.arrowH);
      ctx.restore();
    });
  }

  function drawCoins() {
    coins.forEach((c) => {
      const sprite = sprites.coin;
      const size = DRAW.coin;
      const pulse = 1 + Math.sin((performance.now() + c.x * 7 + c.y * 11) / 140) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffd86b';
      ctx.beginPath();
      ctx.arc(c.x, c.y, size * 1.25 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(c.x, c.y, size * 1.9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.drawImage(sprite, c.x - size / 2, c.y - size / 2, size, size);
    });
  }

  function drawParticles() {
    particles.forEach((p) => {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    });
  }

  function drawFloatingTexts() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    floatingTexts.forEach((item) => {
      const alpha = clamp(item.life / item.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = item.color;
      ctx.font = `${item.size}px "Courier New", monospace`;
      ctx.fillText(item.text, item.x, item.y);
      ctx.globalAlpha = 1;
    });
  }

  function drawCrosshair() {
    if (state.inMenu || state.inShop || state.gameOver) return;
    const x = clamp(inputs.mouseX, 0, worldWidth);
    const y = clamp(inputs.mouseY, 0, worldHeight);
    const pulse = 1 + Math.sin(performance.now() / 120) * 0.08;
    ctx.strokeStyle = player.reloading ? '#ff8c42' : '#ffde59';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 7 * pulse, 0, Math.PI * 2);
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
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

  function spawnParticles(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      const maxLife = life * (0.8 + Math.random() * 0.4);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        size: size * (0.8 + Math.random() * 0.4),
        life: maxLife,
        maxLife,
      });
    }
  }

  function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= delta;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function spawnFloatingText(x, y, text, color, rise = 24, life = 0.55, size = 11) {
    floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      rise,
      life,
      maxLife: life,
    });
  }

  function updateFloatingTexts(delta) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const item = floatingTexts[i];
      item.y -= item.rise * delta;
      item.life -= delta;
      if (item.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function shakeScreen(duration, strength) {
    effects.shakeTime = Math.max(effects.shakeTime, duration);
    effects.shakeStrength = Math.max(effects.shakeStrength, strength);
  }

  function flashDamage(amount) {
    effects.flash = Math.max(effects.flash, amount);
  }

  function showWaveBanner(text) {
    effects.bannerTimer = 1.6;
    waveBanner.textContent = text;
    waveBanner.style.opacity = '1';
    waveBanner.classList.remove('hidden');
  }

  function updateEffects(delta) {
    if (effects.shakeTime > 0) {
      effects.shakeTime = Math.max(0, effects.shakeTime - delta);
      if (effects.shakeTime <= 0) effects.shakeStrength = 0;
    }

    if (effects.flash > 0) {
      effects.flash = Math.max(0, effects.flash - delta * 1.8);
      damageFlash.style.opacity = String(clamp(effects.flash, 0, 0.55));
    } else if (damageFlash.style.opacity !== '0') {
      damageFlash.style.opacity = '0';
    }

    if (effects.bannerTimer > 0) {
      effects.bannerTimer = Math.max(0, effects.bannerTimer - delta);
      waveBanner.style.opacity = String(clamp(effects.bannerTimer / 1.6, 0, 1));
      if (effects.bannerTimer <= 0) {
        waveBanner.classList.add('hidden');
      }
    }
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

    // ТОЛЬКО TOUCH СОБЫТИЯ (без pointer)
    const touchOpts = { passive: false };

    const onLeftTouchStart = (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      inputs.touchMove.active = true;
      inputs.touchMove.id = t.identifier;
      inputs.touchMove.startX = t.clientX;
      inputs.touchMove.startY = t.clientY;
      inputs.touchMove.dx = 0;
      inputs.touchMove.dy = 0;
      joystick.classList.remove('hidden');
      joystick.style.left = `${t.clientX - 60}px`;
      joystick.style.top = `${t.clientY - 60}px`;
      joystickThumb.style.left = '35px';
      joystickThumb.style.top = '35px';
    };

    const onLeftTouchMove = (e) => {
      e.preventDefault();
      if (!inputs.touchMove.active) return;
      const t = Array.from(e.changedTouches).find((x) => x.identifier === inputs.touchMove.id);
      if (!t) return;
      const dx = t.clientX - inputs.touchMove.startX;
      const dy = t.clientY - inputs.touchMove.startY;
      const max = 40;
      const len = Math.hypot(dx, dy);
      const norm = len > max ? max / len : 1;
      const clampedX = dx * norm;
      const clampedY = dy * norm;
      inputs.touchMove.dx = clampedX / max;
      inputs.touchMove.dy = clampedY / max;
      joystickThumb.style.left = `${35 + clampedX}px`;
      joystickThumb.style.top = `${35 + clampedY}px`;
    };

    const onLeftTouchEnd = (e) => {
      e.preventDefault();
      if (!inputs.touchMove.active) return;
      const ended = Array.from(e.changedTouches).some((x) => x.identifier === inputs.touchMove.id);
      if (!ended) return;
      inputs.touchMove.active = false;
      inputs.touchMove.dx = 0;
      inputs.touchMove.dy = 0;
      joystick.classList.add('hidden');
    };

    const onRightTouchStart = (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      inputs.touchShoot.active = true;
      inputs.touchShoot.id = t.identifier;
      const pos = screenToWorld(t.clientX, t.clientY);
      inputs.mouseX = clamp(pos.x, 0, worldWidth);
      inputs.mouseY = clamp(pos.y, 0, worldHeight);
      inputs.shooting = true;
    };

    const onRightTouchMove = (e) => {
      e.preventDefault();
      if (!inputs.touchShoot.active) return;
      const t = Array.from(e.changedTouches).find((x) => x.identifier === inputs.touchShoot.id);
      if (!t) return;
      const pos = screenToWorld(t.clientX, t.clientY);
      inputs.mouseX = clamp(pos.x, 0, worldWidth);
      inputs.mouseY = clamp(pos.y, 0, worldHeight);
    };

    const onRightTouchEnd = (e) => {
      e.preventDefault();
      if (!inputs.touchShoot.active) return;
      const ended = Array.from(e.changedTouches).some((x) => x.identifier === inputs.touchShoot.id);
      if (!ended) return;
      inputs.touchShoot.active = false;
      inputs.shooting = false;
    };

    touchLeft.addEventListener('touchstart', onLeftTouchStart, touchOpts);
    touchLeft.addEventListener('touchmove', onLeftTouchMove, touchOpts);
    touchLeft.addEventListener('touchend', onLeftTouchEnd, touchOpts);
    touchLeft.addEventListener('touchcancel', onLeftTouchEnd, touchOpts);

    touchRight.addEventListener('touchstart', onRightTouchStart, touchOpts);
    touchRight.addEventListener('touchmove', onRightTouchMove, touchOpts);
    touchRight.addEventListener('touchend', onRightTouchEnd, touchOpts);
    touchRight.addEventListener('touchcancel', onRightTouchEnd, touchOpts);
  }

  function setupButtons() {
    arenaChoices.querySelectorAll('[data-arena]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedArena = button.dataset.arena;
        arenaChoices.querySelectorAll('[data-arena]').forEach((item) => item.classList.toggle('active', item === button));
        arenaPattern = null;
      });
    });

    weaponChoices.querySelectorAll('[data-weapon]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedWeapon = button.dataset.weapon;
        weaponChoices.querySelectorAll('[data-weapon]').forEach((item) => item.classList.toggle('active', item === button));
      });
    });

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
      hud.classList.add('hidden');
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
      s.fillStyle = '#08090d';
      s.fillRect(9, 27, 14, 2);
      s.fillStyle = '#1a1f29';
      s.fillRect(10, 4, 12, 11);
      s.fillRect(8, 6, 16, 6);
      s.fillRect(9, 12, 2, 4);
      s.fillRect(21, 12, 2, 4);
      s.fillStyle = '#394351';
      s.fillRect(10, 6, 12, 2);
      s.fillRect(11, 8, 10, 1);
      s.fillStyle = '#ddb37f';
      s.fillRect(12, 10, 8, 6);
      s.fillStyle = '#f4d4ad';
      s.fillRect(13, 11, 3, 2);
      s.fillStyle = '#11151b';
      s.fillRect(13, 12, 1, 1);
      s.fillRect(18, 12, 1, 1);
      s.fillStyle = '#2a3443';
      s.fillRect(9, 16, 14, 10);
      s.fillRect(7, 18, 18, 7);
      s.fillStyle = '#4e6178';
      s.fillRect(10, 18, 4, 3);
      s.fillRect(18, 18, 3, 5);
      s.fillStyle = '#7a5a35';
      s.fillRect(10, 22, 12, 2);
      s.fillStyle = '#d6b46d';
      s.fillRect(14, 22, 2, 2);
      s.fillStyle = '#4b3523';
      s.fillRect(10 + stepOffset, 26, 4, 4);
      s.fillRect(18 - stepOffset, 26, 4, 4);
      s.fillStyle = '#6a3f2b';
      s.fillRect(22, 14, 4, 9);
      s.fillStyle = '#d25f5f';
      s.fillRect(23, 12, 2, 2);
      s.fillRect(22, 13, 1, 2);
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

    sprites.carbine = createSprite(32, 32, (s) => {
      s.fillStyle = '#5a341f';
      s.fillRect(11, 18, 5, 8);
      s.fillRect(12, 17, 4, 2);
      s.fillStyle = '#2a1a13';
      s.fillRect(12, 21, 2, 4);
      s.fillStyle = '#2f343d';
      s.fillRect(10, 14, 14, 4);
      s.fillRect(16, 12, 10, 3);
      s.fillRect(21, 13, 5, 4);
      s.fillStyle = '#68707a';
      s.fillRect(12, 15, 8, 2);
      s.fillRect(18, 13, 6, 1);
      s.fillStyle = '#1b1f26';
      s.fillRect(24, 12, 4, 3);
      s.fillStyle = '#ffcf66';
      s.fillRect(28, 13, 1, 1);
    });
    sprites.gun = sprites.carbine;

    sprites.scatter = createSprite(32, 32, (s) => {
      s.fillStyle = '#6d4427';
      s.fillRect(10, 18, 6, 8);
      s.fillStyle = '#2c1b12';
      s.fillRect(11, 21, 2, 4);
      s.fillStyle = '#31353f';
      s.fillRect(10, 14, 11, 4);
      s.fillRect(16, 12, 12, 4);
      s.fillStyle = '#7d858f';
      s.fillRect(12, 15, 6, 2);
      s.fillStyle = '#1b1f26';
      s.fillRect(26, 12, 3, 4);
      s.fillStyle = '#ffb46a';
      s.fillRect(29, 13, 1, 2);
    });

    sprites.lancer = createSprite(32, 32, (s) => {
      s.fillStyle = '#263244';
      s.fillRect(11, 18, 4, 8);
      s.fillStyle = '#171d29';
      s.fillRect(12, 21, 2, 4);
      s.fillStyle = '#3a465a';
      s.fillRect(10, 14, 13, 3);
      s.fillRect(17, 11, 11, 3);
      s.fillStyle = '#9fd5ff';
      s.fillRect(23, 12, 5, 1);
      s.fillRect(20, 13, 7, 1);
      s.fillStyle = '#d8f0ff';
      s.fillRect(28, 12, 1, 1);
    });

    sprites.storm = createSprite(32, 32, (s) => {
      s.fillStyle = '#2e2444';
      s.fillRect(11, 18, 5, 8);
      s.fillStyle = '#1a1324';
      s.fillRect(12, 21, 2, 4);
      s.fillStyle = '#384456';
      s.fillRect(10, 14, 13, 4);
      s.fillRect(17, 12, 8, 3);
      s.fillStyle = '#7ef0ff';
      s.fillRect(18, 13, 6, 1);
      s.fillRect(21, 11, 3, 1);
      s.fillStyle = '#d8ffff';
      s.fillRect(25, 13, 1, 1);
    });

    sprites.slime = createSprite(32, 32, (s) => {
      s.fillStyle = '#0b1013';
      s.fillRect(8, 24, 16, 2);
      s.fillStyle = '#142a22';
      s.fillRect(6, 13, 20, 11);
      s.fillRect(8, 10, 16, 5);
      s.fillRect(11, 8, 10, 3);
      s.fillStyle = '#235a46';
      s.fillRect(9, 14, 14, 7);
      s.fillStyle = '#66d1a8';
      s.fillRect(11, 12, 9, 3);
      s.fillRect(20, 15, 2, 2);
      s.fillStyle = '#d5ffee';
      s.fillRect(12, 15, 2, 2);
      s.fillRect(18, 15, 2, 2);
      s.fillStyle = '#091014';
      s.fillRect(12, 15, 1, 1);
      s.fillRect(18, 15, 1, 1);
      s.fillStyle = '#7cf0c0';
      s.fillRect(13, 18, 6, 2);
    });
    sprites.slimeWalk = [
      createSprite(32, 32, (s) => {
        s.fillStyle = '#0b1013';
        s.fillRect(9, 24, 14, 2);
        s.fillStyle = '#142a22';
        s.fillRect(6, 13, 20, 11);
        s.fillRect(8, 10, 16, 5);
        s.fillRect(11, 8, 10, 3);
        s.fillStyle = '#235a46';
        s.fillRect(9, 14, 14, 7);
        s.fillStyle = '#66d1a8';
        s.fillRect(11, 12, 9, 3);
        s.fillRect(19, 15, 2, 2);
        s.fillStyle = '#d5ffee';
        s.fillRect(12, 15, 2, 2);
        s.fillRect(18, 15, 2, 2);
        s.fillStyle = '#091014';
        s.fillRect(12, 15, 1, 1);
        s.fillRect(18, 15, 1, 1);
        s.fillStyle = '#7cf0c0';
        s.fillRect(13, 18, 6, 2);
      }),
      createSprite(32, 32, (s) => {
        s.fillStyle = '#0b1013';
        s.fillRect(8, 24, 14, 2);
        s.fillStyle = '#142a22';
        s.fillRect(6, 13, 20, 11);
        s.fillRect(8, 10, 16, 5);
        s.fillRect(11, 8, 10, 3);
        s.fillStyle = '#235a46';
        s.fillRect(9, 14, 14, 7);
        s.fillStyle = '#66d1a8';
        s.fillRect(11, 12, 9, 3);
        s.fillRect(21, 15, 2, 2);
        s.fillStyle = '#d5ffee';
        s.fillRect(12, 15, 2, 2);
        s.fillRect(18, 15, 2, 2);
        s.fillStyle = '#091014';
        s.fillRect(12, 15, 1, 1);
        s.fillRect(18, 15, 1, 1);
        s.fillStyle = '#7cf0c0';
        s.fillRect(13, 18, 6, 2);
      }),
    ];

    sprites.bat = createSprite(32, 32, (s) => {
      const ox = 2;
      const oy = 6;
      s.fillStyle = '#05060b';
      s.fillRect(ox + 0, oy + 12, 30, 3);
      s.fillRect(ox + 4, oy + 8, 22, 4);
      s.fillRect(ox + 9, oy + 5, 12, 3);
      s.fillStyle = '#1f1428';
      s.fillRect(ox + 11, oy + 9, 10, 8);
      s.fillRect(ox + 12, oy + 7, 2, 2);
      s.fillRect(ox + 18, oy + 7, 2, 2);
      s.fillStyle = '#5d2b72';
      s.fillRect(ox + 12, oy + 10, 8, 3);
      s.fillStyle = '#ff5b8f';
      s.fillRect(ox + 13, oy + 12, 2, 2);
      s.fillRect(ox + 17, oy + 12, 2, 2);
      s.fillStyle = '#ffd3de';
      s.fillRect(ox + 13, oy + 12, 1, 1);
      s.fillRect(ox + 17, oy + 12, 1, 1);
      s.fillStyle = '#b7446c';
      s.fillRect(ox + 15, oy + 14, 2, 2);
    });
    sprites.batWalk = [
      createSprite(32, 32, (s) => {
        const ox = 2;
        const oy = 6;
        s.fillStyle = '#05060b';
        s.fillRect(ox + 2, oy + 13, 26, 3);
        s.fillRect(ox + 4, oy + 9, 22, 3);
        s.fillRect(ox + 8, oy + 5, 14, 3);
        s.fillStyle = '#1f1428';
        s.fillRect(ox + 11, oy + 9, 10, 8);
        s.fillStyle = '#ff5b8f';
        s.fillRect(ox + 13, oy + 12, 2, 2);
        s.fillRect(ox + 17, oy + 12, 2, 2);
      }),
      createSprite(32, 32, (s) => {
        const ox = 2;
        const oy = 6;
        s.fillStyle = '#05060b';
        s.fillRect(ox + 2, oy + 9, 26, 3);
        s.fillRect(ox + 4, oy + 12, 22, 3);
        s.fillRect(ox + 8, oy + 16, 14, 3);
        s.fillStyle = '#1f1428';
        s.fillRect(ox + 11, oy + 9, 10, 8);
        s.fillStyle = '#ff5b8f';
        s.fillRect(ox + 13, oy + 12, 2, 2);
        s.fillRect(ox + 17, oy + 12, 2, 2);
      }),
    ];

    const drawSkeletonSprite = (s, stepOffset) => {
      s.fillStyle = '#080b10';
      s.fillRect(9, 25, 14, 2);
      s.fillStyle = '#2f3944';
      s.fillRect(11, 5, 10, 8);
      s.fillRect(10, 13, 12, 9);
      s.fillRect(8, 15, 3, 6);
      s.fillRect(21, 15, 3, 6);
      s.fillRect(12 + stepOffset, 22, 3, 5);
      s.fillRect(17 - stepOffset, 22, 3, 5);
      s.fillStyle = '#d7dde4';
      s.fillRect(12, 7, 8, 5);
      s.fillRect(12, 15, 8, 5);
      s.fillRect(10, 16, 2, 4);
      s.fillRect(20, 16, 2, 4);
      s.fillRect(13 + stepOffset, 22, 2, 4);
      s.fillRect(17 - stepOffset, 22, 2, 4);
      s.fillStyle = '#7a8796';
      s.fillRect(11, 13, 10, 2);
      s.fillRect(13, 9, 2, 2);
      s.fillRect(17, 9, 2, 2);
      s.fillStyle = '#f0b85b';
      s.fillRect(14, 18, 4, 2);
      s.fillStyle = '#516171';
      s.fillRect(9, 17, 2, 3);
      s.fillRect(21, 17, 2, 3);
    };

    sprites.skeleton = createSprite(32, 32, (s) => {
      drawSkeletonSprite(s, 0);
    });
    sprites.skeletonWalk = [
      createSprite(32, 32, (s) => {
        drawSkeletonSprite(s, 1);
      }),
      createSprite(32, 32, (s) => {
        drawSkeletonSprite(s, -1);
      }),
    ];

    const drawSkeletonBossSprite = (s, stepOffset) => {
      drawSkeletonSprite(s, stepOffset);
      s.fillStyle = '#f7d86b';
      s.fillRect(10, 4, 12, 2);
      s.fillRect(11, 3, 2, 2);
      s.fillRect(19, 3, 2, 2);
      s.fillStyle = '#b26d2f';
      s.fillRect(12, 4, 1, 4);
      s.fillRect(19, 4, 1, 4);
      s.fillStyle = '#8aa0bf';
      s.fillRect(9, 12, 14, 2);
      s.fillRect(10, 18, 12, 1);
      s.fillStyle = '#d8e1f0';
      s.fillRect(12, 6, 8, 1);
    };

    sprites.skeletonBoss = createSprite(32, 32, (s) => {
      drawSkeletonBossSprite(s, 0);
    });
    sprites.skeletonBossWalk = [
      createSprite(32, 32, (s) => {
        drawSkeletonBossSprite(s, 1);
      }),
      createSprite(32, 32, (s) => {
        drawSkeletonBossSprite(s, -1);
      }),
    ];

    const drawSlimeBossSprite = (s, offset) => {
      s.fillStyle = '#08100f';
      s.fillRect(6, 25, 20, 2);
      s.fillStyle = '#10342d';
      s.fillRect(4, 13, 24, 12);
      s.fillRect(7, 8, 18, 7);
      s.fillRect(10, 5, 12, 3);
      s.fillStyle = '#36a07f';
      s.fillRect(7, 14, 18, 8);
      s.fillStyle = '#93ffd0';
      s.fillRect(10, 11, 10, 4);
      s.fillRect(20 + offset, 15, 3, 3);
      s.fillStyle = '#f2fffb';
      s.fillRect(11, 16, 3, 3);
      s.fillRect(18, 16, 3, 3);
      s.fillStyle = '#123128';
      s.fillRect(12, 17, 1, 1);
      s.fillRect(19, 17, 1, 1);
      s.fillStyle = '#b6ffe4';
      s.fillRect(11, 21, 10, 2);
      s.fillStyle = '#74ffd0';
      s.fillRect(8, 18, 2, 2);
      s.fillRect(22, 18, 2, 2);
    };

    sprites.slimeBoss = createSprite(32, 32, (s) => {
      drawSlimeBossSprite(s, 0);
    });
    sprites.slimeBossWalk = [
      createSprite(32, 32, (s) => {
        drawSlimeBossSprite(s, -1);
      }),
      createSprite(32, 32, (s) => {
        drawSlimeBossSprite(s, 1);
      }),
    ];

    sprites.golem = createSprite(32, 32, (s) => {
      s.fillStyle = '#131110';
      s.fillRect(7, 25, 18, 2);
      s.fillStyle = '#3b3f44';
      s.fillRect(8, 7, 16, 17);
      s.fillRect(5, 11, 5, 11);
      s.fillRect(22, 11, 5, 11);
      s.fillStyle = '#6f7578';
      s.fillRect(10, 9, 12, 11);
      s.fillRect(12, 20, 8, 3);
      s.fillStyle = '#9aa3a7';
      s.fillRect(11, 10, 4, 2);
      s.fillRect(18, 11, 3, 2);
      s.fillStyle = '#7ef0ff';
      s.fillRect(14, 13, 4, 4);
      s.fillStyle = '#dbffff';
      s.fillRect(15, 14, 2, 2);
      s.fillStyle = '#272b28';
      s.fillRect(11, 18, 10, 2);
    });
    sprites.golemWalk = [
      createSprite(32, 32, (s) => {
        s.fillStyle = '#131110';
        s.fillRect(7, 25, 18, 2);
        s.fillStyle = '#3b3f44';
        s.fillRect(8, 7, 16, 17);
        s.fillRect(5, 11, 5, 11);
        s.fillRect(22, 11, 5, 11);
        s.fillStyle = '#6f7578';
        s.fillRect(10, 9, 12, 11);
        s.fillStyle = '#7ef0ff';
        s.fillRect(14, 13, 4, 4);
        s.fillStyle = '#dbffff';
        s.fillRect(15, 14, 2, 2);
        s.fillStyle = '#272b28';
        s.fillRect(9, 23, 5, 3);
        s.fillRect(18, 22, 5, 3);
      }),
      createSprite(32, 32, (s) => {
        s.fillStyle = '#131110';
        s.fillRect(7, 25, 18, 2);
        s.fillStyle = '#3b3f44';
        s.fillRect(8, 7, 16, 17);
        s.fillRect(5, 11, 5, 11);
        s.fillRect(22, 11, 5, 11);
        s.fillStyle = '#6f7578';
        s.fillRect(10, 9, 12, 11);
        s.fillStyle = '#7ef0ff';
        s.fillRect(14, 13, 4, 4);
        s.fillStyle = '#dbffff';
        s.fillRect(15, 14, 2, 2);
        s.fillStyle = '#272b28';
        s.fillRect(10, 22, 5, 3);
        s.fillRect(17, 23, 5, 3);
      }),
    ];

    sprites.enemyBow = createSprite(32, 32, (s) => {
      s.fillStyle = '#6f4a2f';
      s.fillRect(22, 7, 2, 18);
      s.fillRect(21, 8, 1, 4);
      s.fillRect(21, 20, 1, 4);
      s.fillStyle = '#d6dbe4';
      s.fillRect(24, 8, 1, 16);
      s.fillStyle = '#c58a48';
      s.fillRect(18, 15, 4, 2);
    });

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

    sprites.pellet = createSprite(32, 32, (s) => {
      s.fillStyle = '#ffb46a';
      s.fillRect(13, 13, 4, 4);
      s.fillStyle = '#ffe0b5';
      s.fillRect(14, 14, 2, 2);
    });

    sprites.lance = createSprite(32, 32, (s) => {
      s.fillStyle = '#9fd5ff';
      s.fillRect(8, 14, 12, 2);
      s.fillRect(20, 13, 5, 4);
      s.fillStyle = '#dff6ff';
      s.fillRect(22, 14, 2, 2);
    });

    sprites.spark = createSprite(32, 32, (s) => {
      s.fillStyle = '#7ef0ff';
      s.fillRect(11, 13, 8, 4);
      s.fillRect(13, 11, 4, 8);
      s.fillStyle = '#e2ffff';
      s.fillRect(14, 14, 2, 2);
    });

    sprites.enemyArrow = createSprite(32, 32, (s) => {
      const ox = 10;
      const oy = 13;
      s.fillStyle = '#e7edf7';
      s.fillRect(ox + 1, oy + 2, 8, 2);
      s.fillStyle = '#8d9aae';
      s.fillRect(ox + 9, oy + 1, 3, 4);
      s.fillStyle = '#6f4a2f';
      s.fillRect(ox + 0, oy + 1, 1, 4);
    });

    sprites.coin = createSprite(32, 32, (s) => {
      const ox = 12;
      const oy = 12;
      s.fillStyle = '#a36b16';
      s.fillRect(ox + 0, oy + 0, 8, 8);
      s.fillStyle = '#d89b27';
      s.fillRect(ox + 1, oy + 1, 6, 6);
      s.fillStyle = '#ffe178';
      s.fillRect(ox + 2, oy + 2, 3, 3);
      s.fillStyle = '#fff6bf';
      s.fillRect(ox + 3, oy + 2, 1, 1);
      s.fillStyle = '#b57917';
      s.fillRect(ox + 2, oy + 6, 4, 1);
    });
  }

  function createArenaPattern() {
    const theme = arenaThemes[state.selectedArena] || arenaThemes.crypt;
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const s = c.getContext('2d');
    s.fillStyle = theme.bg;
    s.fillRect(0, 0, 32, 32);

    s.fillStyle = theme.tileA;
    s.fillRect(0, 0, 16, 16);
    s.fillRect(16, 16, 16, 16);

    s.fillStyle = theme.tileB;
    s.fillRect(2, 2, 12, 12);
    s.fillRect(18, 2, 12, 12);
    s.fillRect(2, 18, 12, 12);
    s.fillRect(18, 18, 12, 12);

    s.fillStyle = theme.tileC;
    s.fillRect(3, 3, 10, 10);
    s.fillRect(19, 3, 10, 10);
    s.fillRect(3, 19, 10, 10);
    s.fillRect(19, 19, 10, 10);

    s.fillStyle = theme.seam;
    s.fillRect(14, 0, 4, 32);
    s.fillRect(0, 14, 32, 4);

    s.fillStyle = theme.crack;
    s.fillRect(5, 11, 5, 1);
    s.fillRect(22, 8, 4, 1);
    s.fillRect(7, 24, 6, 1);
    s.fillRect(21, 23, 5, 1);
    s.fillRect(9, 5, 1, 4);
    s.fillRect(24, 20, 1, 4);

    for (let i = 0; i < 28; i++) {
      const x = Math.floor(Math.random() * 32);
      const y = Math.floor(Math.random() * 32);
      s.fillStyle = Math.random() > 0.55 ? theme.crack : theme.seam;
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
