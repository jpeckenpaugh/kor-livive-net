/**
 * v2-app.js - Standalone Demo Coordinator & State Management
 * - Handles Selection / Customization screen for Player and Companion VoxelBot
 * - Integrates rich recipe system (topVariant, outfitVariant, glassesVariant, color palettes)
 * - Integrates vivid VoxelBot colors (bodyColor, accentColor, glowColor)
 * - Manages DiceBear SVG generation with 100% transparent backgrounds (`backgroundColor: []`)
 * - Persists setup in localStorage ('kor_v2_player')
 * - Manages keyboard (WASD / Arrows) and touch joystick / D-pad
 * - Runs game loop (requestAnimationFrame) with V2Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kor_v2_player';

  // Rich Avatar Artwork & Customizer Variants from pp-livive-net
  const TOP_VARIANTS = [
    { id: 'random', label: '🎲 Random Hair' },
    { id: 'none', label: 'None (Bald)' },
    { id: 'afro', label: 'Afro' },
    { id: 'animalEars', label: 'Animal Ears' },
    { id: 'beanie', label: 'Beanie' },
    { id: 'bob', label: 'Bob Cut' },
    { id: 'bowl', label: 'Bowl Cut' },
    { id: 'braids', label: 'Braids' },
    { id: 'buns', label: 'Buns' },
    { id: 'bunnyEars', label: 'Bunny Ears' },
    { id: 'cap', label: 'Baseball Cap' },
    { id: 'curly', label: 'Curly Hair' },
    { id: 'halfShaved', label: 'Half Shaved' },
    { id: 'longStraight', label: 'Long Straight' },
    { id: 'longWavy', label: 'Long Wavy' },
    { id: 'mohawk', label: 'Mohawk' },
    { id: 'partedLong', label: 'Parted Long' },
    { id: 'ponytail', label: 'Ponytail' },
    { id: 'short', label: 'Short Crop' },
    { id: 'shoulderLength', label: 'Shoulder Length' },
    { id: 'sideSwept', label: 'Side Swept' },
    { id: 'spiky', label: 'Spiky Anime' },
    { id: 'twinTails', label: 'Twin Tails' }
  ];

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
    { id: 'suit', label: 'Business Suit' },
    { id: 'tie', label: 'Shirt & Tie' }
  ];

  const GLASSES_VARIANTS = [
    { id: 'none', label: 'No Glasses' },
    { id: 'random', label: '🎲 Random' },
    { id: 'cat', label: 'Cat Eye' },
    { id: 'round', label: 'Round Specs' },
    { id: 'shades', label: 'Cool Shades' },
    { id: 'square', label: 'Square Frames' },
    { id: 'visor', label: 'Cyber Visor' }
  ];

  const HAIR_COLORS = [
    { id: 'random', label: '🎲 Random Color' },
    { id: '#241a14', label: 'Midnight Black' },
    { id: '#4a2f20', label: 'Espresso Brown' },
    { id: '#7a4a2a', label: 'Warm Chestnut' },
    { id: '#b47a3f', label: 'Caramel Honey' },
    { id: '#d9ad62', label: 'Golden Blonde' },
    { id: '#e8d8b0', label: 'Platinum Blonde' },
    { id: '#c7c7c7', label: 'Silver Ash' },
    { id: '#8a3a2a', label: 'Auburn Red' },
    { id: '#3f4a63', label: 'Denim Blue' },
    { id: '#b34f6b', label: 'Rose Pink' }
  ];

  // VoxelBot Vivid Colors
  const BOT_BODY_COLORS = [
    { id: 'random', label: '🎲 Random Chassis' },
    { id: '#e9ecef', label: 'Clean White' },
    { id: '#aeb8c2', label: 'Steel Gray' },
    { id: '#74c0fc', label: 'Sky Azure' },
    { id: '#63e6be', label: 'Mint Neon' },
    { id: '#ffd43b', label: 'Solar Yellow' },
    { id: '#ff9d9d', label: 'Coral Coral' },
    { id: '#b6a6f5', label: 'Cyber Violet' },
    { id: '#69db7c', label: 'Emerald Lime' }
  ];

  const BOT_ACCENT_COLORS = [
    { id: 'random', label: '🎲 Random Armor' },
    { id: '#343a40', label: 'Obsidian Black' },
    { id: '#495057', label: 'Graphite Dark' },
    { id: '#2f3b4c', label: 'Deep Cobalt' },
    { id: '#5f6b7a', label: 'Slate Gunmetal' },
    { id: '#7a4a2d', label: 'Bronze Umber' },
    { id: '#243b53', label: 'Navy Titanium' }
  ];

  const BOT_GLOW_COLORS = [
    { id: 'random', label: '🎲 Random Glow' },
    { id: '#3bc9db', label: 'Neon Cyan' },
    { id: '#69db7c', label: 'Matrix Lime' },
    { id: '#ffd43b', label: 'Golden Pulse' },
    { id: '#ff6b6b', label: 'Laser Ruby' },
    { id: '#e599f7', label: 'Plasma Orchid' },
    { id: '#74c0fc', label: 'Electric Blue' },
    { id: '#fff3bf', label: 'Warm Sun' }
  ];

  // Default initial configuration
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
    },
    hasEntered: false
  };

  function loadSavedState() {
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
      console.warn('Could not read from localStorage', e);
    }
    return { ...defaultState };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not write to localStorage', e);
    }
  }

  function randomSeed(prefix = 'seed') {
    return prefix + '_' + Math.random().toString(36).substring(2, 8);
  }

  function pickRandomItem(arr, skipFirst = 1) {
    const list = arr.slice(skipFirst);
    return list[Math.floor(Math.random() * list.length)].id;
  }

  function generatePlayerSvg(state) {
    const seed = state.playerSeed || 'player';
    const look = state.playerLook || {};

    if (window.DiceBearVoxel && typeof window.DiceBearVoxel.createVoxelAvatar === 'function') {
      try {
        const options = {
          seed: String(seed),
          backgroundColor: [], // Crucial! 100% transparent background
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
          options.hairColor = [look.hairColor];
        }

        return window.DiceBearVoxel.createVoxelAvatar(options);
      } catch (err) {
        console.warn('Player avatar generation failed:', err);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#3b82f6"/><text x="50" y="65" font-size="45" text-anchor="middle">🧑</text></svg>`;
  }

  function generateBotSvg(state) {
    const seed = state.botSeed || 'bot';
    const look = state.botLook || {};

    if (window.DiceBearVoxel && typeof window.DiceBearVoxel.createCompanionAvatar === 'function') {
      try {
        const options = {
          seed: String(seed),
          backgroundColor: [], // Crucial! 100% transparent background
          tags: ['animation'],
          size: 320
        };

        if (look.bodyColor && look.bodyColor !== 'random') {
          options.bodyColor = [look.bodyColor];
        }
        if (look.accentColor && look.accentColor !== 'random') {
          options.accentColor = [look.accentColor];
        }
        if (look.glowColor && look.glowColor !== 'random') {
          options.glowColor = [look.glowColor];
        }

        return window.DiceBearVoxel.createCompanionAvatar('voxel-bot', options);
      } catch (err) {
        console.warn('Bot avatar generation failed:', err);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#10b981"/><text x="50" y="65" font-size="45" text-anchor="middle">🤖</text></svg>`;
  }

  function populateSelect(selectEl, items, selectedValue) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    for (const item of items) {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.label;
      if (item.id === selectedValue) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    }
  }

  class V2App {
    constructor() {
      this.state = loadSavedState();
      this.engine = null;
      this.input = { x: 0, y: 0 };
      this.keysDown = new Set();
      this.lastTime = 0;

      // DOM Elements
      this.screenSelect = document.getElementById('screen-selection');
      this.canvas = document.getElementById('game-canvas');

      // Selection inputs & previews
      this.inputPlayerName = document.getElementById('input-player-name');
      this.inputBotName = document.getElementById('input-bot-name');
      this.previewPlayer = document.getElementById('preview-player-avatar');
      this.previewBot = document.getElementById('preview-bot-avatar');
      this.btnRandomPlayer = document.getElementById('btn-random-player');
      this.btnRandomBot = document.getElementById('btn-random-bot');
      this.btnEnterHome = document.getElementById('btn-enter-home');

      // Select dropdowns
      this.selectPlayerTop = document.getElementById('select-player-top');
      this.selectPlayerOutfit = document.getElementById('select-player-outfit');
      this.selectPlayerGlasses = document.getElementById('select-player-glasses');
      this.selectPlayerHairColor = document.getElementById('select-player-hair-color');

      this.selectBotBody = document.getElementById('select-bot-body');
      this.selectBotAccent = document.getElementById('select-bot-accent');
      this.selectBotGlow = document.getElementById('select-bot-glow');

      // HUD elements
      this.hudPlayerAvatar = document.getElementById('hud-player-avatar');
      this.hudPlayerName = document.getElementById('hud-player-name');
      this.hudBotAvatar = document.getElementById('hud-bot-avatar');
      this.hudBotName = document.getElementById('hud-bot-name');
      this.btnCustomize = document.getElementById('btn-customize');

      // Virtual D-pad / Joystick buttons
      this.dpadUp = document.getElementById('dpad-up');
      this.dpadDown = document.getElementById('dpad-down');
      this.dpadLeft = document.getElementById('dpad-left');
      this.dpadRight = document.getElementById('dpad-right');

      this.init();
    }

    init() {
      this.initDropdowns();
      this.bindEvents();
      this.updateSelectionUI();

      this.showSelectionScreen();

      // Resize canvas to full window
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      // Start RAF loop
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    initDropdowns() {
      populateSelect(this.selectPlayerTop, TOP_VARIANTS, this.state.playerLook.top);
      populateSelect(this.selectPlayerOutfit, OUTFIT_VARIANTS, this.state.playerLook.outfit);
      populateSelect(this.selectPlayerGlasses, GLASSES_VARIANTS, this.state.playerLook.glasses);
      populateSelect(this.selectPlayerHairColor, HAIR_COLORS, this.state.playerLook.hairColor);

      populateSelect(this.selectBotBody, BOT_BODY_COLORS, this.state.botLook.bodyColor);
      populateSelect(this.selectBotAccent, BOT_ACCENT_COLORS, this.state.botLook.accentColor);
      populateSelect(this.selectBotGlow, BOT_GLOW_COLORS, this.state.botLook.glowColor);
    }

    resizeCanvas() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      if (this.engine) {
        this.engine.width = this.canvas.width;
        this.engine.height = this.canvas.height;
      }
    }

    bindEvents() {
      // Name inputs
      this.inputPlayerName.addEventListener('input', (e) => {
        this.state.playerName = e.target.value.trim() || 'Player';
        saveState(this.state);
        this.updateHUD();
      });

      this.inputBotName.addEventListener('input', (e) => {
        this.state.botName = e.target.value.trim() || 'SparkyBot';
        saveState(this.state);
        this.updateHUD();
      });

      // Player Dropdown change events
      this.selectPlayerTop.addEventListener('change', (e) => {
        this.state.playerLook.top = e.target.value;
        this.onPlayerLookChanged();
      });

      this.selectPlayerOutfit.addEventListener('change', (e) => {
        this.state.playerLook.outfit = e.target.value;
        this.onPlayerLookChanged();
      });

      this.selectPlayerGlasses.addEventListener('change', (e) => {
        this.state.playerLook.glasses = e.target.value;
        this.onPlayerLookChanged();
      });

      this.selectPlayerHairColor.addEventListener('change', (e) => {
        this.state.playerLook.hairColor = e.target.value;
        this.onPlayerLookChanged();
      });

      // Bot Dropdown change events
      this.selectBotBody.addEventListener('change', (e) => {
        this.state.botLook.bodyColor = e.target.value;
        this.onBotLookChanged();
      });

      this.selectBotAccent.addEventListener('change', (e) => {
        this.state.botLook.accentColor = e.target.value;
        this.onBotLookChanged();
      });

      this.selectBotGlow.addEventListener('change', (e) => {
        this.state.botLook.glowColor = e.target.value;
        this.onBotLookChanged();
      });

      // Randomizers
      this.btnRandomPlayer.addEventListener('click', () => {
        this.state.playerSeed = randomSeed('Player');
        this.state.playerLook.top = pickRandomItem(TOP_VARIANTS, 2);
        this.state.playerLook.outfit = pickRandomItem(OUTFIT_VARIANTS, 1);
        this.state.playerLook.glasses = Math.random() < 0.4 ? 'none' : pickRandomItem(GLASSES_VARIANTS, 2);
        this.state.playerLook.hairColor = pickRandomItem(HAIR_COLORS, 1);

        this.initDropdowns();
        this.onPlayerLookChanged();
      });

      this.btnRandomBot.addEventListener('click', () => {
        this.state.botSeed = randomSeed('Bot');
        this.state.botLook.bodyColor = pickRandomItem(BOT_BODY_COLORS, 1);
        this.state.botLook.accentColor = pickRandomItem(BOT_ACCENT_COLORS, 1);
        this.state.botLook.glowColor = pickRandomItem(BOT_GLOW_COLORS, 1);

        this.initDropdowns();
        this.onBotLookChanged();
      });

      // Enter House Action
      this.btnEnterHome.addEventListener('click', () => {
        this.enterHome();
      });

      // Customize in HUD
      this.btnCustomize.addEventListener('click', () => {
        this.showSelectionScreen();
      });

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
          this.keysDown.add(key);
          this.updateKeyboardInput();
          e.preventDefault();
        }
      });

      window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
          this.keysDown.delete(key);
          this.updateKeyboardInput();
          e.preventDefault();
        }
      });

      // Touch / Virtual D-pad
      const bindDpad = (btn, dirX, dirY) => {
        if (!btn) return;
        const start = (e) => {
          e.preventDefault();
          this.input.x = dirX;
          this.input.y = dirY;
          btn.classList.add('active');
        };
        const end = (e) => {
          e.preventDefault();
          btn.classList.remove('active');
          this.updateKeyboardInput();
        };

        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
        btn.addEventListener('touchcancel', end, { passive: false });
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
        btn.addEventListener('mouseleave', end);
      };

      bindDpad(this.dpadUp, 0, -1);
      bindDpad(this.dpadDown, 0, 1);
      bindDpad(this.dpadLeft, -1, 0);
      bindDpad(this.dpadRight, 1, 0);
    }

    onPlayerLookChanged() {
      saveState(this.state);
      this.updateSelectionUI();
      if (this.engine) {
        const svg = generatePlayerSvg(this.state);
        this.engine.setPlayerAvatar(svg, this.state.playerName);
      }
    }

    onBotLookChanged() {
      saveState(this.state);
      this.updateSelectionUI();
      if (this.engine) {
        const svg = generateBotSvg(this.state);
        this.engine.setBotAvatar(svg, this.state.botName);
      }
    }

    updateKeyboardInput() {
      let x = 0;
      let y = 0;
      if (this.keysDown.has('arrowup') || this.keysDown.has('w')) y -= 1;
      if (this.keysDown.has('arrowdown') || this.keysDown.has('s')) y += 1;
      if (this.keysDown.has('arrowleft') || this.keysDown.has('a')) x -= 1;
      if (this.keysDown.has('arrowright') || this.keysDown.has('d')) x += 1;
      this.input.x = x;
      this.input.y = y;
    }

    updateSelectionUI() {
      this.inputPlayerName.value = this.state.playerName;
      this.inputBotName.value = this.state.botName;

      const playerSvg = generatePlayerSvg(this.state);
      const botSvg = generateBotSvg(this.state);

      this.previewPlayer.innerHTML = playerSvg;
      this.previewBot.innerHTML = botSvg;

      this.updateHUD(playerSvg, botSvg);
    }

    updateHUD(playerSvg, botSvg) {
      this.hudPlayerName.textContent = this.state.playerName;
      this.hudBotName.textContent = this.state.botName;

      if (!playerSvg) playerSvg = generatePlayerSvg(this.state);
      if (!botSvg) botSvg = generateBotSvg(this.state);

      this.hudPlayerAvatar.innerHTML = playerSvg;
      this.hudBotAvatar.innerHTML = botSvg;
    }

    showSelectionScreen() {
      this.screenSelect.classList.remove('hidden');
    }

    hideSelectionScreen() {
      this.screenSelect.classList.add('hidden');
    }

    enterHome() {
      this.state.playerName = this.inputPlayerName.value.trim() || 'Player';
      this.state.botName = this.inputBotName.value.trim() || 'SparkyBot';
      this.state.hasEntered = true;
      saveState(this.state);

      this.hideSelectionScreen();

      if (!this.engine) {
        this.engine = new window.V2Engine(this.canvas, window.V2_DATA);
      }

      const playerSvg = generatePlayerSvg(this.state);
      const botSvg = generateBotSvg(this.state);

      this.engine.setPlayerAvatar(playerSvg, this.state.playerName);
      this.engine.setBotAvatar(botSvg, this.state.botName);

      this.updateHUD(playerSvg, botSvg);
    }

    loop(currentTime) {
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      if (this.engine) {
        this.engine.update(dt, this.input);
        this.engine.render();
      }

      requestAnimationFrame((t) => this.loop(t));
    }
  }

  // Launch when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    new V2App();
  });
})();
