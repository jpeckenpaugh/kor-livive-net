/**
 * house-app.js - Standalone House Architecture Demo Coordinator
 * 
 * - Coordinates character and companion avatar setup with DiceBear Voxel
 * - Customizer modal with instant preview
 * - Room detection and HUD updates (Living Room, Kitchen & Dining, Bedroom, Bathroom, Yards)
 * - Keyboard (WASD, Arrows) + Touch D-Pad input handling
 * - Clean requestAnimationFrame loop
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kor_house_player';

  // Hair / Top variants
  const TOP_VARIANTS = [
    { id: 'random', label: '🎲 Random Hair' },
    { id: 'none', label: 'None (Bald)' },
    { id: 'afro', label: 'Afro' },
    { id: 'beanie', label: 'Beanie' },
    { id: 'bob', label: 'Bob Cut' },
    { id: 'bowl', label: 'Bowl Cut' },
    { id: 'buns', label: 'Buns' },
    { id: 'cap', label: 'Baseball Cap' },
    { id: 'curly', label: 'Curly Hair' },
    { id: 'longStraight', label: 'Long Straight' },
    { id: 'longWavy', label: 'Long Wavy' },
    { id: 'ponytail', label: 'Ponytail' },
    { id: 'short', label: 'Short Crop' },
    { id: 'spiky', label: 'Spiky Anime' }
  ];

  // Outfit variants
  const OUTFIT_VARIANTS = [
    { id: 'random', label: '🎲 Random Outfit' },
    { id: 'checker', label: 'Checker Shirt' },
    { id: 'coat', label: 'Trench Coat' },
    { id: 'dress', label: 'Casual Dress' },
    { id: 'hoodie', label: 'Comfy Hoodie' },
    { id: 'jacket', label: 'Street Jacket' },
    { id: 'overalls', label: 'Denim Overalls' },
    { id: 'plain', label: 'Plain Tee' },
    { id: 'stripes', label: 'Striped Polo' },
    { id: 'suit', label: 'Business Suit' }
  ];

  // Glasses variants
  const GLASSES_VARIANTS = [
    { id: 'none', label: 'No Glasses' },
    { id: 'random', label: '🎲 Random' },
    { id: 'round', label: 'Round Specs' },
    { id: 'shades', label: 'Cool Shades' },
    { id: 'square', label: 'Square Frames' },
    { id: 'visor', label: 'Cyber Visor' }
  ];

  // Hair color palettes
  const HAIR_COLORS = [
    { id: 'random', label: '🎲 Random Color' },
    { id: '#241a14', label: 'Midnight Black' },
    { id: '#4a2f20', label: 'Espresso Brown' },
    { id: '#7a4a2a', label: 'Warm Chestnut' },
    { id: '#b47a3f', label: 'Caramel Honey' },
    { id: '#d9ad62', label: 'Golden Blonde' },
    { id: '#c7c7c7', label: 'Silver Ash' },
    { id: '#8a3a2a', label: 'Auburn Red' },
    { id: '#3f4a63', label: 'Denim Blue' }
  ];

  // VoxelBot Body Colors
  const BOT_BODY_COLORS = [
    { id: 'random', label: '🎲 Random Chassis' },
    { id: '#e9ecef', label: 'Clean White' },
    { id: '#aeb8c2', label: 'Steel Gray' },
    { id: '#74c0fc', label: 'Sky Azure' },
    { id: '#63e6be', label: 'Mint Neon' },
    { id: '#ffd43b', label: 'Solar Yellow' },
    { id: '#ff9d9d', label: 'Coral Pink' },
    { id: '#b6a6f5', label: 'Cyber Violet' }
  ];

  // VoxelBot Accent Colors
  const BOT_ACCENT_COLORS = [
    { id: 'random', label: '🎲 Random Armor' },
    { id: '#343a40', label: 'Obsidian Black' },
    { id: '#495057', label: 'Graphite Dark' },
    { id: '#2f3b4c', label: 'Deep Cobalt' },
    { id: '#7a4a2d', label: 'Bronze Umber' }
  ];

  // VoxelBot Glow Colors
  const BOT_GLOW_COLORS = [
    { id: 'random', label: '🎲 Random Glow' },
    { id: '#3bc9db', label: 'Neon Cyan' },
    { id: '#69db7c', label: 'Matrix Lime' },
    { id: '#ffd43b', label: 'Golden Pulse' },
    { id: '#ff6b6b', label: 'Laser Ruby' },
    { id: '#74c0fc', label: 'Electric Blue' }
  ];

  const defaultState = {
    playerName: 'Learner Kim',
    playerSeed: 'MinjunKim',
    playerLook: {
      top: 'short',
      outfit: 'hoodie',
      glasses: 'none',
      hairColor: '#4a2f20'
    },
    botName: 'SparkyBot',
    botSeed: 'SparkVoxel',
    botLook: {
      bodyColor: '#74c0fc',
      accentColor: '#343a40',
      glowColor: '#3bc9db'
    }
  };

  function loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...defaultState,
          ...parsed,
          playerLook: { ...defaultState.playerLook, ...(parsed.playerLook || {}) },
          botLook: { ...defaultState.botLook, ...(parsed.botLook || {}) }
        };
      }
    } catch (e) {
      console.warn('Could not load saved state', e);
    }
    return { ...defaultState };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state', e);
    }
  }

  function randomChoice(arr, skip = 1) {
    const subset = arr.slice(skip);
    return subset[Math.floor(Math.random() * subset.length)].id;
  }

  // Multi-frame procedural SVG generation
  function generatePlayerSvg(state) {
    const seed = state.playerSeed || 'player';
    const look = state.playerLook || {};

    if (window.DiceBearVoxel && typeof window.DiceBearVoxel.createVoxelAvatar === 'function') {
      try {
        const options = {
          seed: String(seed),
          backgroundColor: [], // 100% transparent
          tags: ['animation'],
          size: 320
        };

        if (look.top === 'none') {
          options.topProbability = 0;
        } else if (look.top && look.top !== 'random') {
          options.topVariant = [look.top];
          options.topProbability = 100;
        }

        if (look.outfit && look.outfit !== 'random') {
          options.outfitVariant = [look.outfit];
          options.outfitProbability = 100;
        }

        if (look.glasses === 'none') {
          options.glassesProbability = 0;
        } else if (look.glasses && look.glasses !== 'random') {
          options.glassesVariant = [look.glasses];
          options.glassesProbability = 100;
        }

        if (look.hairColor && look.hairColor !== 'random') {
          const hex = look.hairColor.replace('#', '');
          options.hairColor = [hex];
        }

        const avatar = window.DiceBearVoxel.createVoxelAvatar(options);
        return avatar.toString();
      } catch (e) {
        console.error('Error generating player avatar', e);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#4f46e5"/></svg>`;
  }

  function generateBotSvg(state) {
    const seed = state.botSeed || 'SparkyBot';
    const look = state.botLook || {};

    if (window.DiceBearVoxel && typeof window.DiceBearVoxel.createCompanionAvatar === 'function') {
      try {
        const options = {
          seed: String(seed),
          backgroundColor: [],
          tags: ['animation'],
          size: 320
        };

        if (look.bodyColor && look.bodyColor !== 'random') {
          options.bodyColor = [look.bodyColor.replace('#', '')];
        }
        if (look.accentColor && look.accentColor !== 'random') {
          options.accentColor = [look.accentColor.replace('#', '')];
        }
        if (look.glowColor && look.glowColor !== 'random') {
          options.glowColor = [look.glowColor.replace('#', '')];
        }

        return window.DiceBearVoxel.createCompanionAvatar('voxel-bot', options);
      } catch (e) {
        console.error('Error generating bot avatar', e);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" rx="12" fill="#06b6d4"/></svg>`;
  }

  function svgToImage(svgStr) {
    const img = new Image();
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgStr);
    return img;
  }

  /* ==========================================================================
     Application Initialization
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    const state = loadState();

    // DOM Elements
    const canvas = document.getElementById('game-canvas');
    const hudPlayerAvatar = document.getElementById('hud-player-avatar');
    const hudPlayerName = document.getElementById('hud-player-name');
    const hudBotAvatar = document.getElementById('hud-bot-avatar');
    const hudBotName = document.getElementById('hud-bot-name');
    const hudZoneBadge = document.getElementById('hud-zone-badge');
    const btnCustomize = document.getElementById('btn-customize');

    // Selection Modal Elements
    const modalSelection = document.getElementById('screen-selection');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const previewPlayerAvatar = document.getElementById('preview-player-avatar');
    const previewBotAvatar = document.getElementById('preview-bot-avatar');
    const inputPlayerName = document.getElementById('input-player-name');
    const inputBotName = document.getElementById('input-bot-name');

    const selectPlayerTop = document.getElementById('select-player-top');
    const selectPlayerOutfit = document.getElementById('select-player-outfit');
    const selectPlayerGlasses = document.getElementById('select-player-glasses');
    const selectPlayerHairColor = document.getElementById('select-player-hair-color');

    const selectBotBody = document.getElementById('select-bot-body');
    const selectBotAccent = document.getElementById('select-bot-accent');
    const selectBotGlow = document.getElementById('select-bot-glow');

    const btnRandomPlayer = document.getElementById('btn-random-player');
    const btnRandomBot = document.getElementById('btn-random-bot');

    // Populate Select Options
    function populateSelect(elem, options, current) {
      elem.innerHTML = '';
      for (const opt of options) {
        const option = document.createElement('option');
        option.value = opt.id;
        option.textContent = opt.label;
        if (opt.id === current) option.selected = true;
        elem.appendChild(option);
      }
    }

    populateSelect(selectPlayerTop, TOP_VARIANTS, state.playerLook.top);
    populateSelect(selectPlayerOutfit, OUTFIT_VARIANTS, state.playerLook.outfit);
    populateSelect(selectPlayerGlasses, GLASSES_VARIANTS, state.playerLook.glasses);
    populateSelect(selectPlayerHairColor, HAIR_COLORS, state.playerLook.hairColor);

    populateSelect(selectBotBody, BOT_BODY_COLORS, state.botLook.bodyColor);
    populateSelect(selectBotAccent, BOT_ACCENT_COLORS, state.botLook.accentColor);
    populateSelect(selectBotGlow, BOT_GLOW_COLORS, state.botLook.glowColor);

    inputPlayerName.value = state.playerName;
    inputBotName.value = state.botName;

    // Instantiate House Engine
    let engine = null;

    // Resize Canvas to Window
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (engine) {
        engine.width = canvas.width;
        engine.height = canvas.height;
      }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    engine = new window.HouseEngine(canvas, window.HOUSE_DATA);
    engine.width = canvas.width;
    engine.height = canvas.height;

    // Update Avatar Graphics
    function refreshAvatars() {
      const playerSvg = generatePlayerSvg(state);
      const botSvg = generateBotSvg(state);

      previewPlayerAvatar.innerHTML = playerSvg;
      previewBotAvatar.innerHTML = botSvg;
      hudPlayerAvatar.innerHTML = playerSvg;
      hudBotAvatar.innerHTML = botSvg;

      hudPlayerName.textContent = state.playerName;
      hudBotName.textContent = state.botName;

      engine.player.name = state.playerName;
      engine.bot.name = state.botName;

      const playerImg = svgToImage(playerSvg);
      const botImg = svgToImage(botSvg);

      engine.setPlayerImages({ default: playerImg });
      engine.setBotImages({ default: botImg });

      saveState(state);
    }

    refreshAvatars();

    // Modal Interaction
    function openCustomizer() {
      modalSelection.classList.remove('hidden');
    }
    function closeCustomizer() {
      state.playerName = inputPlayerName.value.trim() || 'Learner Kim';
      state.botName = inputBotName.value.trim() || 'SparkyBot';
      saveState(state);
      refreshAvatars();
      modalSelection.classList.add('hidden');
    }

    btnCustomize.addEventListener('click', openCustomizer);
    btnCloseModal.addEventListener('click', closeCustomizer);

    // Selection Inputs change listeners
    selectPlayerTop.addEventListener('change', (e) => {
      state.playerLook.top = e.target.value;
      refreshAvatars();
    });
    selectPlayerOutfit.addEventListener('change', (e) => {
      state.playerLook.outfit = e.target.value;
      refreshAvatars();
    });
    selectPlayerGlasses.addEventListener('change', (e) => {
      state.playerLook.glasses = e.target.value;
      refreshAvatars();
    });
    selectPlayerHairColor.addEventListener('change', (e) => {
      state.playerLook.hairColor = e.target.value;
      refreshAvatars();
    });

    selectBotBody.addEventListener('change', (e) => {
      state.botLook.bodyColor = e.target.value;
      refreshAvatars();
    });
    selectBotAccent.addEventListener('change', (e) => {
      state.botLook.accentColor = e.target.value;
      refreshAvatars();
    });
    selectBotGlow.addEventListener('change', (e) => {
      state.botLook.glowColor = e.target.value;
      refreshAvatars();
    });

    inputPlayerName.addEventListener('input', (e) => {
      state.playerName = e.target.value || 'Learner Kim';
      hudPlayerName.textContent = state.playerName;
      engine.player.name = state.playerName;
    });

    inputBotName.addEventListener('input', (e) => {
      state.botName = e.target.value || 'SparkyBot';
      hudBotName.textContent = state.botName;
      engine.bot.name = state.botName;
    });

    btnRandomPlayer.addEventListener('click', () => {
      state.playerSeed = 'player_' + Math.random().toString(36).substring(2, 8);
      state.playerLook.top = randomChoice(TOP_VARIANTS, 2);
      state.playerLook.outfit = randomChoice(OUTFIT_VARIANTS, 1);
      state.playerLook.glasses = randomChoice(GLASSES_VARIANTS, 2);
      state.playerLook.hairColor = randomChoice(HAIR_COLORS, 1);

      selectPlayerTop.value = state.playerLook.top;
      selectPlayerOutfit.value = state.playerLook.outfit;
      selectPlayerGlasses.value = state.playerLook.glasses;
      selectPlayerHairColor.value = state.playerLook.hairColor;

      refreshAvatars();
    });

    btnRandomBot.addEventListener('click', () => {
      state.botSeed = 'bot_' + Math.random().toString(36).substring(2, 8);
      state.botLook.bodyColor = randomChoice(BOT_BODY_COLORS, 1);
      state.botLook.accentColor = randomChoice(BOT_ACCENT_COLORS, 1);
      state.botLook.glowColor = randomChoice(BOT_GLOW_COLORS, 1);

      selectBotBody.value = state.botLook.bodyColor;
      selectBotAccent.value = state.botLook.accentColor;
      selectBotGlow.value = state.botLook.glowColor;

      refreshAvatars();
    });

    /* ==========================================================================
       Input Management (Keyboard & Mobile D-Pad)
       ========================================================================== */
    const keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    window.addEventListener('keydown', (e) => {
      // Don't capture keys if typing in modal input
      if (e.target.tagName === 'INPUT') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keys.up = true;
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keys.down = true;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = true;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    });

    // Mobile Virtual D-Pad
    function setupTouchBtn(id, dir) {
      const btn = document.getElementById(id);
      if (!btn) return;

      const setDir = (active) => {
        keys[dir] = active;
        if (active) btn.classList.add('active');
        else btn.classList.remove('active');
      };

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        setDir(true);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        setDir(false);
      });
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        setDir(true);
      });
      btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        setDir(false);
      });
    }

    setupTouchBtn('dpad-up', 'up');
    setupTouchBtn('dpad-down', 'down');
    setupTouchBtn('dpad-left', 'left');
    setupTouchBtn('dpad-right', 'right');

    /* ==========================================================================
       Main Game Loop
       ========================================================================== */
    let lastTime = performance.now();
    let currentZoneId = '';

    function loop(currentTime) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Update engine
      engine.update(dt, keys);

      // Check room zone and update HUD badge
      const zone = engine.getZoneAt(engine.player.x, engine.player.y);
      if (zone && zone.id !== currentZoneId) {
        currentZoneId = zone.id;
        if (hudZoneBadge) {
          hudZoneBadge.innerHTML = `<span class="zone-icon">${zone.icon}</span> <span class="zone-name">${zone.name}</span>`;
          hudZoneBadge.style.borderColor = zone.color || 'rgba(255,255,255,0.2)';
        }
      }

      // Render world
      engine.render();

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  });
})();
