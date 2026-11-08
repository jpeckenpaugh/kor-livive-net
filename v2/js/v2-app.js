/**
 * v2-app.js - Standalone Demo Coordinator & State Management
 * - Handles Selection / Customization screen for Player and Companion VoxelBot
 * - Manages DiceBear SVG generation and live preview
 * - Persists setup in localStorage ('kor_v2_player')
 * - Manages keyboard (WASD / Arrows) and touch joystick / D-pad
 * - Runs game loop (requestAnimationFrame) with V2Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kor_v2_player';

  // Default initial configuration
  const defaultState = {
    playerName: 'Learner Kim',
    playerSeed: 'MinjunKim',
    botName: 'SparkyBot',
    botSeed: 'SparkVoxel',
    hasEntered: false
  };

  function loadSavedState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...defaultState, ...JSON.parse(data) };
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

  function generatePlayerSvg(seed) {
    if (window.DiceBearVoxel && typeof window.DiceBearVoxel.createVoxelAvatar === 'function') {
      try {
        return window.DiceBearVoxel.createVoxelAvatar({ seed: String(seed) });
      } catch (err) {
        console.warn('Player avatar generation failed:', err);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#3b82f6"/><text x="50" y="65" font-size="45" text-anchor="middle">🧑</text></svg>`;
  }

  function generateBotSvg(seed) {
    if (window.DiceBearVoxel && typeof window.DiceBearVoxel.createCompanionAvatar === 'function') {
      try {
        return window.DiceBearVoxel.createCompanionAvatar('voxel-bot', { seed: String(seed) });
      } catch (err) {
        console.warn('Bot avatar generation failed:', err);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#10b981"/><text x="50" y="65" font-size="45" text-anchor="middle">🤖</text></svg>`;
  }

  function randomSeed(prefix = 'seed') {
    return prefix + '_' + Math.random().toString(36).substring(2, 8);
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
      this.screenGame = document.getElementById('screen-game');
      this.canvas = document.getElementById('game-canvas');

      // Selection inputs & previews
      this.inputPlayerName = document.getElementById('input-player-name');
      this.inputBotName = document.getElementById('input-bot-name');
      this.previewPlayer = document.getElementById('preview-player-avatar');
      this.previewBot = document.getElementById('preview-bot-avatar');
      this.btnRandomPlayer = document.getElementById('btn-random-player');
      this.btnRandomBot = document.getElementById('btn-random-bot');
      this.btnEnterHome = document.getElementById('btn-enter-home');

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
      this.bindEvents();
      this.updateSelectionUI();

      // If user previously customized and clicked enter, we can let them spawn or review
      // Always showing the selection screen first gives a great character creation feel,
      // with their previous selections pre-filled!
      this.showSelectionScreen();

      // Resize canvas to full window
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      // Start RAF loop
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
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
        this.state.botName = e.target.value.trim() || 'VoxelBot';
        saveState(this.state);
        this.updateHUD();
      });

      // Randomizers
      this.btnRandomPlayer.addEventListener('click', () => {
        this.state.playerSeed = randomSeed('Player');
        saveState(this.state);
        this.updateSelectionUI();
        if (this.engine) {
          const svg = generatePlayerSvg(this.state.playerSeed);
          this.engine.setPlayerAvatar(svg, this.state.playerName);
        }
      });

      this.btnRandomBot.addEventListener('click', () => {
        this.state.botSeed = randomSeed('Bot');
        saveState(this.state);
        this.updateSelectionUI();
        if (this.engine) {
          const svg = generateBotSvg(this.state.botSeed);
          this.engine.setBotAvatar(svg, this.state.botName);
        }
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
          this.updateKeyboardInput(); // restore keyboard state if active, or stop
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

      const playerSvg = generatePlayerSvg(this.state.playerSeed);
      const botSvg = generateBotSvg(this.state.botSeed);

      this.previewPlayer.innerHTML = playerSvg;
      this.previewBot.innerHTML = botSvg;

      this.updateHUD(playerSvg, botSvg);
    }

    updateHUD(playerSvg, botSvg) {
      this.hudPlayerName.textContent = this.state.playerName;
      this.hudBotName.textContent = this.state.botName;

      if (!playerSvg) playerSvg = generatePlayerSvg(this.state.playerSeed);
      if (!botSvg) botSvg = generateBotSvg(this.state.botSeed);

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
      this.state.botName = this.inputBotName.value.trim() || 'VoxelBot';
      this.state.hasEntered = true;
      saveState(this.state);

      this.hideSelectionScreen();

      // Lazy instantiate or update Engine
      if (!this.engine) {
        this.engine = new window.V2Engine(this.canvas, window.V2_DATA);
      }

      const playerSvg = generatePlayerSvg(this.state.playerSeed);
      const botSvg = generateBotSvg(this.state.botSeed);

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
