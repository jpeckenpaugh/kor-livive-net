/**
 * v2-engine.js - Canvas 2D Top-Down / 3/4 Perspective Room & Entity Renderer
 * Faithful to pp-livive-net rendering style:
 * - 17x17 footprint with wall borders, doorway at (8, 16), floor tiles.
 * - Furniture rendering from pp-livive-net vector path rules.
 * - Procedural/SVG avatar rendering for player and companion VoxelBot.
 * - Locomotion physics & animations (hop arc, wobble, rolling lean, idle stretch/glance, floating bob).
 * - Dynamic cast shadow scaling and polished name badges.
 */

(function () {
  'use strict';

  const TILE = 48;
  const ITEM_SHADOW = 'rgba(8, 14, 9, 0.35)';

  function roundRectPath(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function fillRoundRect(ctx, x, y, w, h, radius, color) {
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeRoundRect(ctx, x, y, w, h, radius, color, lineWidth = 2) {
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function itemShadow(ctx, box) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = ITEM_SHADOW;
    ctx.beginPath();
    ctx.ellipse(
      (box.left + box.right) / 2,
      box.baseY + TILE * 0.02,
      box.width * 0.44,
      TILE * 0.12,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  function itemPad(bounds) {
    const inset = TILE * 0.1;
    return {
      left: bounds.left + inset,
      right: bounds.right - inset,
      top: bounds.top + inset,
      bottom: bounds.bottom - inset,
      width: Math.max(1, bounds.width - inset * 2),
      height: Math.max(1, bounds.height - inset * 2),
      baseY: bounds.bottom - TILE * 0.08
    };
  }

  /* --- Furniture Draw Functions --- */

  function drawCouch(ctx, box, colors) {
    itemShadow(ctx, box);
    const backHeight = TILE * 0.58;
    const seatY = box.baseY - TILE * 0.36;
    fillRoundRect(ctx, box.left, box.baseY - backHeight, box.width, backHeight, 6, colors.trim);
    fillRoundRect(ctx, box.left + TILE * 0.02, box.baseY - TILE * 0.46, box.width - TILE * 0.04, TILE * 0.34, 5, colors.base);
    const cushions = Math.max(2, Math.round(box.width / (TILE * 0.85)));
    const cushionWidth = (box.width - TILE * 0.04) / cushions;
    for (let index = 0; index < cushions; index += 1) {
      fillRoundRect(
        ctx,
        box.left + TILE * 0.02 + index * cushionWidth + 2,
        seatY,
        cushionWidth - 4,
        TILE * 0.26,
        4,
        colors.accent
      );
    }
    fillRoundRect(ctx, box.left, box.baseY - TILE * 0.5, TILE * 0.13, TILE * 0.42, 4, colors.accent);
    fillRoundRect(ctx, box.right - TILE * 0.13, box.baseY - TILE * 0.5, TILE * 0.13, TILE * 0.42, 4, colors.accent);
    fillRoundRect(ctx, box.left + TILE * 0.1, box.baseY - TILE * 0.06, TILE * 0.1, TILE * 0.08, 2, colors.trim);
    fillRoundRect(ctx, box.right - TILE * 0.2, box.baseY - TILE * 0.06, TILE * 0.1, TILE * 0.08, 2, colors.trim);
  }

  function drawArmchair(ctx, box, colors) {
    itemShadow(ctx, box);
    const backHeight = TILE * 0.5;
    fillRoundRect(ctx, box.left, box.baseY - backHeight, box.width, backHeight, 6, colors.trim);
    fillRoundRect(ctx, box.left + 2, box.baseY - TILE * 0.42, box.width - 4, TILE * 0.3, 5, colors.base);
    fillRoundRect(ctx, box.left + TILE * 0.16, box.baseY - TILE * 0.38, box.width - TILE * 0.32, TILE * 0.2, 4, colors.accent);
    fillRoundRect(ctx, box.left, box.baseY - TILE * 0.44, TILE * 0.12, TILE * 0.36, 4, colors.accent);
    fillRoundRect(ctx, box.right - TILE * 0.12, box.baseY - TILE * 0.44, TILE * 0.12, TILE * 0.36, 4, colors.accent);
    fillRoundRect(ctx, box.left + 3, box.baseY - TILE * 0.08, TILE * 0.1, TILE * 0.08, 2, colors.trim);
    fillRoundRect(ctx, box.right - TILE * 0.13, box.baseY - TILE * 0.08, TILE * 0.1, TILE * 0.08, 2, colors.trim);
  }

  function drawBed(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - box.height * 0.88, box.width, box.height * 0.88, 8, colors.trim);
    fillRoundRect(ctx, box.left + 3, box.baseY - box.height * 0.84, box.width - 6, box.height * 0.8, 6, colors.base);
    const blanketHeight = box.height * 0.56;
    fillRoundRect(ctx, box.left + 3, box.baseY - blanketHeight, box.width - 6, blanketHeight, 5, colors.accent);
    fillRoundRect(ctx, box.left + 3, box.baseY - blanketHeight, box.width - 6, TILE * 0.14, 3, colors.accent2 || '#e5e7eb');
    fillRoundRect(ctx, box.left + TILE * 0.14, box.baseY - box.height * 0.8, box.width - TILE * 0.28, TILE * 0.22, 4, '#f8fafc');
  }

  function drawDesk(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left + 2, box.baseY - TILE * 0.44, box.width - 4, TILE * 0.16, 4, colors.base);
    fillRoundRect(ctx, box.left, box.baseY - TILE * 0.48, box.width, TILE * 0.14, 4, colors.accent);
    fillRoundRect(ctx, box.left + 4, box.baseY - TILE * 0.32, TILE * 0.1, TILE * 0.32, 2, colors.trim);
    fillRoundRect(ctx, box.right - TILE * 0.14, box.baseY - TILE * 0.32, TILE * 0.1, TILE * 0.32, 2, colors.trim);
    const laptopW = TILE * 0.38;
    const laptopX = (box.left + box.right - laptopW) / 2;
    fillRoundRect(ctx, laptopX, box.baseY - TILE * 0.46, laptopW, TILE * 0.1, 2, '#475569');
    fillRoundRect(ctx, laptopX + 2, box.baseY - TILE * 0.62, laptopW - 4, TILE * 0.16, 2, '#38bdf8');
  }

  function drawCoffeeTable(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - TILE * 0.3, box.width, TILE * 0.15, 6, colors.base);
    fillRoundRect(ctx, box.left + 2, box.baseY - TILE * 0.32, box.width - 4, TILE * 0.08, 4, colors.accent);
    fillRoundRect(ctx, box.left + 4, box.baseY - TILE * 0.18, TILE * 0.09, TILE * 0.18, 2, colors.trim);
    fillRoundRect(ctx, box.right - TILE * 0.13, box.baseY - TILE * 0.18, TILE * 0.09, TILE * 0.18, 2, colors.trim);
  }

  function drawNightstand(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - TILE * 0.42, box.width, TILE * 0.38, 4, colors.base);
    fillRoundRect(ctx, box.left - 2, box.baseY - TILE * 0.46, box.width + 4, TILE * 0.1, 3, colors.accent);
    fillRoundRect(ctx, box.left + 4, box.baseY - TILE * 0.34, box.width - 8, TILE * 0.11, 2, colors.trim);
    fillRoundRect(ctx, box.left + 4, box.baseY - TILE * 0.2, box.width - 8, TILE * 0.11, 2, colors.trim);
    fillRoundRect(ctx, (box.left + box.right) / 2 - 2, box.baseY - TILE * 0.3, 4, 3, 1, '#cbd5e1');
  }

  function drawBookshelf(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - box.height * 0.9, box.width, box.height * 0.9, 4, colors.trim);
    fillRoundRect(ctx, box.left + 3, box.baseY - box.height * 0.86, box.width - 6, box.height * 0.82, 3, colors.base);
    const shelfCount = 3;
    const shelfSpacing = (box.height * 0.76) / shelfCount;
    for (let index = 0; index < shelfCount; index += 1) {
      const shelfY = box.baseY - box.height * 0.82 + index * shelfSpacing;
      fillRoundRect(ctx, box.left + 3, shelfY, box.width - 6, 4, 1, colors.accent);
      const bookColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
      let bx = box.left + 6;
      while (bx < box.right - 10) {
        const bw = 5 + (bx % 4);
        const bh = shelfSpacing * 0.65 + (bx % 6);
        const col = bookColors[(bx + index) % bookColors.length];
        fillRoundRect(ctx, bx, shelfY - bh, bw, bh, 1, col);
        bx += bw + 2;
      }
    }
  }

  function drawWardrobe(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - box.height * 0.92, box.width, box.height * 0.92, 4, colors.trim);
    fillRoundRect(ctx, box.left + 3, box.baseY - box.height * 0.88, box.width - 6, box.height * 0.84, 3, colors.base);
    const doorW = (box.width - 8) / 2;
    fillRoundRect(ctx, box.left + 3, box.baseY - box.height * 0.86, doorW, box.height * 0.8, 2, colors.accent);
    fillRoundRect(ctx, box.right - 3 - doorW, box.baseY - box.height * 0.86, doorW, box.height * 0.8, 2, colors.accent);
    fillRoundRect(ctx, box.left + 3 + doorW - 4, box.baseY - box.height * 0.5, 3, 10, 1, '#f8fafc');
    fillRoundRect(ctx, box.right - 3 - doorW + 1, box.baseY - box.height * 0.5, 3, 10, 1, '#f8fafc');
  }

  function drawPlant(ctx, box, colors) {
    itemShadow(ctx, box);
    const potW = box.width * 0.6;
    const potX = (box.left + box.right - potW) / 2;
    fillRoundRect(ctx, potX, box.baseY - TILE * 0.32, potW, TILE * 0.3, 4, colors.base);
    fillRoundRect(ctx, potX - 2, box.baseY - TILE * 0.36, potW + 4, TILE * 0.08, 2, colors.accent);
    const leafColors = ['#15803d', '#16a34a', '#22c55e', '#4ade80'];
    const cx = (box.left + box.right) / 2;
    const cy = box.baseY - TILE * 0.44;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const lx = cx + Math.cos(angle) * (TILE * 0.2);
      const ly = cy + Math.sin(angle) * (TILE * 0.16);
      ctx.fillStyle = leafColors[i % leafColors.length];
      ctx.beginPath();
      ctx.ellipse(lx, ly, TILE * 0.14, TILE * 0.18, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLamp(ctx, box, colors) {
    itemShadow(ctx, box);
    const cx = (box.left + box.right) / 2;
    fillRoundRect(ctx, cx - TILE * 0.12, box.baseY - TILE * 0.08, TILE * 0.24, TILE * 0.08, 2, colors.trim);
    fillRoundRect(ctx, cx - 2, box.baseY - TILE * 0.72, 4, TILE * 0.66, 1, colors.accent);
    fillRoundRect(ctx, cx - TILE * 0.2, box.baseY - TILE * 0.9, TILE * 0.4, TILE * 0.24, 4, colors.base);
    // Warm light cone glow
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(cx, box.baseY + 4, TILE * 0.48, TILE * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTvStand(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - TILE * 0.36, box.width, TILE * 0.3, 4, colors.trim);
    fillRoundRect(ctx, box.left + 3, box.baseY - TILE * 0.32, box.width - 6, TILE * 0.24, 3, colors.base);
    const tvW = box.width * 0.8;
    const tvX = (box.left + box.right - tvW) / 2;
    fillRoundRect(ctx, tvX, box.baseY - TILE * 0.86, tvW, TILE * 0.48, 4, '#0f172a');
    fillRoundRect(ctx, tvX + 3, box.baseY - TILE * 0.83, tvW - 6, TILE * 0.42, 2, '#1e293b');
    // Subtle TV power LED
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(tvX + tvW - 8, box.baseY - TILE * 0.42, 3, 3);
  }

  function drawKitchenCounter(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - TILE * 0.48, box.width, TILE * 0.42, 4, colors.base);
    fillRoundRect(ctx, box.left - 1, box.baseY - TILE * 0.54, box.width + 2, TILE * 0.1, 2, colors.accent);
    fillRoundRect(ctx, box.left + 3, box.baseY - TILE * 0.38, box.width - 6, TILE * 0.28, 2, colors.trim);
    // Stove elements
    ctx.fillStyle = '#334155';
    const cx = box.left + box.width * 0.3;
    ctx.beginPath();
    ctx.arc(cx, box.baseY - TILE * 0.5, 6, 0, Math.PI * 2);
    ctx.arc(cx + 18, box.baseY - TILE * 0.5, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRefrigerator(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.baseY - box.height * 0.95, box.width, box.height * 0.95, 5, colors.trim);
    fillRoundRect(ctx, box.left + 2, box.baseY - box.height * 0.92, box.width - 4, box.height * 0.9, 4, colors.base);
    fillRoundRect(ctx, box.left + 2, box.baseY - box.height * 0.48, box.width - 4, 3, 1, colors.accent);
    fillRoundRect(ctx, box.left + 6, box.baseY - box.height * 0.65, 3, 18, 1, colors.accent);
    fillRoundRect(ctx, box.left + 6, box.baseY - box.height * 0.35, 3, 20, 1, colors.accent);
  }

  function drawRugShape(ctx, bounds, colors) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    fillRoundRect(ctx, bounds.left, bounds.top, bounds.width, bounds.height, 10, colors.base);
    strokeRoundRect(ctx, bounds.left + 3, bounds.top + 3, bounds.width - 6, bounds.height - 6, 8, colors.accent, 2);
    fillRoundRect(ctx, bounds.left + 7, bounds.top + 7, bounds.width - 14, bounds.height - 14, 6, colors.trim || colors.base);
    ctx.restore();
  }

  const FURNITURE_SHAPES = {
    couch: drawCouch,
    armchair: drawArmchair,
    bed: drawBed,
    desk: drawDesk,
    coffeeTable: drawCoffeeTable,
    nightstand: drawNightstand,
    bookshelf: drawBookshelf,
    wardrobe: drawWardrobe,
    plant: drawPlant,
    lamp: drawLamp,
    tvStand: drawTvStand,
    kitchenCounter: drawKitchenCounter,
    refrigerator: drawRefrigerator
  };

  function buildTextures() {
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = TILE;
    floorCanvas.height = TILE;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#d7ba89';
    fctx.fillRect(0, 0, TILE, TILE);
    fctx.fillStyle = '#cda974';
    fctx.fillRect(0, TILE - 2, TILE, 2);
    fctx.fillRect(TILE - 2, 0, 2, TILE);
    fctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    fctx.fillRect(2, 2, TILE - 4, 3);

    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = TILE;
    wallCanvas.height = TILE;
    const wctx = wallCanvas.getContext('2d');
    wctx.fillStyle = '#475569';
    wctx.fillRect(0, 0, TILE, TILE);
    wctx.fillStyle = '#334155';
    wctx.fillRect(0, TILE - 6, TILE, 6);
    wctx.fillStyle = '#64748b';
    wctx.fillRect(0, 0, TILE, 3);
    wctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    wctx.fillRect(TILE / 2 - 1, 0, 2, TILE);

    const matCanvas = document.createElement('canvas');
    matCanvas.width = TILE;
    matCanvas.height = TILE;
    const mctx = matCanvas.getContext('2d');
    mctx.fillStyle = '#78350f';
    mctx.fillRect(0, 0, TILE, TILE);
    mctx.fillStyle = '#92400e';
    mctx.fillRect(4, 4, TILE - 8, TILE - 8);

    return { floor: floorCanvas, wall: wallCanvas, mat: matCanvas };
  }

  /* --- Multi-frame SVG generator for procedural facial expressions --- */
  function transformVoxelArtFrame(svg, frame) {
    if (frame === 'blink') {
      return svg.replace(/class="va-blink-[^"]+"\s+opacity="0"/g, match =>
        match.replace('opacity="0"', 'opacity="1"')
      );
    }
    if (frame === 'stretch') {
      return svg.replace(
        /<g class="va-upper">/g,
        '<g class="va-upper" transform="translate(0 -3.5)">'
      );
    }
    if (frame === 'look-left') {
      return svg.replace(
        /(<g id="eyes-[^"]+">)([\s\S]*?)(<\/g>)/,
        '$1<g transform="translate(-2.5 0)">$2</g>$3'
      );
    }
    if (frame === 'look-right') {
      return svg.replace(
        /(<g id="eyes-[^"]+">)([\s\S]*?)(<\/g>)/,
        '$1<g transform="translate(2.5 0)">$2</g>$3'
      );
    }
    return svg;
  }

  function transformVoxelBotFrame(svg, frame) {
    if (frame === 'blink') {
      return svg.replace(/class="vb-blink-[^"]+"\s+opacity="0"/g, match =>
        match.replace('opacity="0"', 'opacity="1"')
      );
    }
    if (frame === 'stretch') {
      return svg
        .replace(/<g class="vb-upper">/g, '<g class="vb-upper" transform="translate(0 -2.5)">')
        .replace(/<g class="vb-head">/g, '<g class="vb-head" transform="translate(0 -2.5)">');
    }
    if (frame === 'look-left') {
      return svg.replace(
        /(<g id="eyes-[^"]+">)([\s\S]*?)(<\/g>)/,
        '$1<g transform="translate(-2.5 0)">$2</g>$3'
      );
    }
    if (frame === 'look-right') {
      return svg.replace(
        /(<g id="eyes-[^"]+">)([\s\S]*?)(<\/g>)/,
        '$1<g transform="translate(2.5 0)">$2</g>$3'
      );
    }
    return svg;
  }

  function createImagesFromSvg(rawSvg, isBot = false) {
    const frames = ['default', 'blink', 'stretch', 'look-left', 'look-right'];
    const imgs = {};
    for (const f of frames) {
      const transformedSvg = isBot
        ? transformVoxelBotFrame(rawSvg, f)
        : transformVoxelArtFrame(rawSvg, f);
      const img = new Image();
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(transformedSvg);
      imgs[f] = img;
    }
    return imgs;
  }

  class V2Engine {
    constructor(canvas, data) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.data = data;
      this.textures = buildTextures();

      this.width = canvas.width;
      this.height = canvas.height;
      this.gameTime = 0;

      // Entities
      this.player = {
        x: data.spawn.x * TILE + TILE / 2,
        y: data.spawn.y * TILE + TILE / 2,
        radius: 18,
        speed: 180, // px per sec
        facing: 'down',
        name: 'Player',
        moving: false,
        walkT: 0,
        img: null,
        frameImages: {}
      };

      this.bot = {
        x: data.spawn.x * TILE - 30,
        y: data.spawn.y * TILE + TILE / 2,
        radius: 14,
        speed: 165,
        targetX: data.spawn.x * TILE - 30,
        targetY: data.spawn.y * TILE + TILE / 2,
        facing: 'right',
        name: 'SparkyBot',
        moving: false,
        rollT: 0,
        img: null,
        frameImages: {}
      };

      // Camera
      this.camera = {
        x: this.player.x,
        y: this.player.y
      };

      // Layout & collisions
      this.house = data.house;
      this.items = data.items;
      this.layout = data.layout;
      this.door = data.door;

      this.solidBoxes = [];
      this.rugs = [];
      this.furniture = [];

      this.initWorld();
    }

    initWorld() {
      const maxX = this.house.width - 1;
      const maxY = this.house.height - 1;

      // Perimeter walls as solid boxes
      for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
          const isPerimeter = x === 0 || x === maxX || y === 0 || y === maxY;
          const isDoor = x === this.door.x && y === this.door.y;
          if (isPerimeter && !isDoor) {
            this.solidBoxes.push({
              left: x * TILE,
              right: (x + 1) * TILE,
              top: y * TILE,
              bottom: (y + 1) * TILE
            });
          }
        }
      }

      // Add furniture from layout
      for (const place of this.layout) {
        const itemDef = this.items[place.item_id];
        if (!itemDef) continue;

        const bounds = {
          left: place.x * TILE,
          top: place.y * TILE,
          width: itemDef.w * TILE,
          height: itemDef.h * TILE,
          right: (place.x + itemDef.w) * TILE,
          bottom: (place.y + itemDef.h) * TILE
        };

        const pad = itemPad(bounds);

        if (itemDef.type === 'rug') {
          this.rugs.push({
            id: place.item_id,
            bounds,
            colors: itemDef.colors
          });
        } else {
          this.furniture.push({
            id: place.item_id,
            shape: itemDef.shape,
            colors: itemDef.colors,
            bounds,
            pad
          });

          // Solid collision if not passable
          if (!itemDef.passable) {
            const inset = 6;
            this.solidBoxes.push({
              left: bounds.left + inset,
              right: bounds.right - inset,
              top: bounds.top + inset,
              bottom: bounds.bottom - inset
            });
          }
        }
      }

      // Sort furniture by bottom Y for proper top-down depth sorting
      this.furniture.sort((a, b) => a.bounds.bottom - b.bounds.bottom);
    }

    setPlayerAvatar(svgString, name) {
      if (name) this.player.name = name;
      if (!svgString) return;
      this.player.frameImages = createImagesFromSvg(svgString, false);
      this.player.img = this.player.frameImages['default'];
    }

    setBotAvatar(svgString, name) {
      if (name) this.bot.name = name;
      if (!svgString) return;
      this.bot.frameImages = createImagesFromSvg(svgString, true);
      this.bot.img = this.bot.frameImages['default'];
    }

    canMoveTo(x, y, radius) {
      for (const box of this.solidBoxes) {
        const closestX = Math.max(box.left, Math.min(x, box.right));
        const closestY = Math.max(box.top, Math.min(y, box.bottom));
        const distX = x - closestX;
        const distY = y - closestY;
        if (distX * distX + distY * distY < radius * radius) {
          return false;
        }
      }
      return true;
    }

    update(dt, inputDir) {
      this.gameTime += dt;

      // 1. Move Player
      const isInputActive = inputDir.x !== 0 || inputDir.y !== 0;
      this.player.moving = isInputActive;

      if (isInputActive) {
        const len = Math.hypot(inputDir.x, inputDir.y);
        const normX = inputDir.x / len;
        const normY = inputDir.y / len;

        const moveStep = this.player.speed * dt;
        const newX = this.player.x + normX * moveStep;
        const newY = this.player.y + normY * moveStep;

        if (Math.abs(normX) > Math.abs(normY)) {
          this.player.facing = normX > 0 ? 'right' : 'left';
        } else {
          this.player.facing = normY > 0 ? 'down' : 'up';
        }

        // Slide along walls
        let didMove = false;
        if (this.canMoveTo(newX, this.player.y, this.player.radius)) {
          this.player.x = newX;
          didMove = true;
        }
        if (this.canMoveTo(this.player.x, newY, this.player.radius)) {
          this.player.y = newY;
          didMove = true;
        }

        if (didMove) {
          // Progress step-hop cycle (roughly 2.8 steps per sec)
          this.player.walkT = (this.player.walkT + dt * 2.8) % 1.0;
        } else {
          this.player.walkT = 0;
        }
      } else {
        this.player.walkT = 0;
      }

      // 2. Bot Companion Follow Logic
      const followDist = 42;
      let targetX = this.player.x;
      let targetY = this.player.y;
      if (this.player.facing === 'down') targetY -= followDist;
      else if (this.player.facing === 'up') targetY += followDist;
      else if (this.player.facing === 'left') targetX += followDist;
      else if (this.player.facing === 'right') targetX -= followDist;

      const botDist = Math.hypot(targetX - this.bot.x, targetY - this.bot.y);
      if (botDist > 8) {
        this.bot.moving = true;
        const lerpFactor = Math.min(1.0, 4.8 * dt);
        const nextBotX = this.bot.x + (targetX - this.bot.x) * lerpFactor;
        const nextBotY = this.bot.y + (targetY - this.bot.y) * lerpFactor;

        const deltaX = nextBotX - this.bot.x;
        if (Math.abs(deltaX) > 0.05) {
          this.bot.facing = deltaX > 0 ? 'right' : 'left';
        }

        this.bot.x = nextBotX;
        this.bot.y = nextBotY;
        this.bot.rollT = (this.bot.rollT + dt * 2.6) % 1.0;
      } else {
        this.bot.moving = false;
        this.bot.rollT = 0;
      }

      // 3. Camera Tracking
      const camLerp = Math.min(1.0, 5.0 * dt);
      this.camera.x += (this.player.x - this.camera.x) * camLerp;
      this.camera.y += (this.player.y - this.camera.y) * camLerp;
    }

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Outside background
      ctx.fillStyle = '#223825'; // Grassy dark outside
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Apply Camera transform
      ctx.translate(Math.round(w / 2 - this.camera.x), Math.round(h / 2 - this.camera.y));

      // Draw Room Floor & Walls
      const maxX = this.house.width - 1;
      const maxY = this.house.height - 1;

      for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
          const isPerimeter = x === 0 || x === maxX || y === 0 || y === maxY;
          const isDoor = x === this.door.x && y === this.door.y;
          const px = x * TILE;
          const py = y * TILE;

          if (isDoor) {
            ctx.drawImage(this.textures.mat, px, py);
          } else if (isPerimeter) {
            ctx.drawImage(this.textures.wall, px, py);
          } else {
            ctx.drawImage(this.textures.floor, px, py);
          }
        }
      }

      // Draw Rugs (ground layer below entities and furniture)
      for (const rug of this.rugs) {
        drawRugShape(ctx, rug.bounds, rug.colors);
      }

      // Gather renderables for Y-sorting: Furniture, Player, Bot
      const drawList = [];

      for (const furn of this.furniture) {
        drawList.push({
          type: 'furniture',
          y: furn.bounds.bottom,
          record: furn
        });
      }

      drawList.push({
        type: 'player',
        y: this.player.y + this.player.radius,
        record: this.player
      });

      drawList.push({
        type: 'bot',
        y: this.bot.y + this.bot.radius,
        record: this.bot
      });

      // Sort by feet/bottom Y
      drawList.sort((a, b) => a.y - b.y);

      // Render sorted entities
      for (const item of drawList) {
        if (item.type === 'furniture') {
          const f = item.record;
          const shapeFn = FURNITURE_SHAPES[f.shape];
          if (shapeFn) {
            shapeFn(ctx, f.pad, f.colors);
          }
        } else if (item.type === 'player') {
          this.renderPlayer(ctx);
        } else if (item.type === 'bot') {
          this.renderBot(ctx);
        }
      }

      ctx.restore();
    }

    renderPlayer(ctx) {
      const p = this.player;
      const t = this.gameTime;
      const characterHeight = 52;
      const avatarSize = 50;

      // 1. Calculate procedural locomotion / idle transform from pp-livive-net animation profile
      let translateY = 0;
      let translateX = 0;
      let rotate = 0;
      let scaleX = 1;
      let scaleY = 1;
      let shadowScale = 1;
      let frame = 'default';

      if (p.moving) {
        // Step-hop arc when walking: const hop = Math.sin(walkT * Math.PI); translateY: -hop * 6px;
        const hop = Math.sin(p.walkT * Math.PI);
        translateY = -characterHeight * 0.12 * hop; // ~6px hop
        // Foot-step bob & slight side-to-side sway / step wobble
        rotate = Math.sin(p.walkT * Math.PI * 2) * (3.0 * Math.PI / 180);
        scaleX = 1 - 0.04 * hop;
        scaleY = 1 + 0.05 * hop;
        shadowScale = 1 - 0.22 * hop;
      } else {
        // Idle breathing/stretching bob cycle + periodic glance left/right
        const stretchCycle = (t % 4.5) / 4.5;
        translateY = -Math.sin(t * 2.2) * 0.5;

        if (stretchCycle >= 0.70 && stretchCycle <= 0.88) {
          const progress = Math.sin(((stretchCycle - 0.70) / 0.18) * Math.PI);
          translateY -= 0.03 * characterHeight * progress;
          scaleY = 1 + 0.04 * progress;
          scaleX = 1 - 0.02 * progress;
          frame = 'stretch';
        } else {
          // Periodic blink & glance
          const blinkCycle = (t % 3.2) / 3.2;
          if (blinkCycle >= 0.88 && blinkCycle <= 0.96) {
            frame = 'blink';
          } else {
            const glanceCycle = (t % 6.0) / 6.0;
            if (glanceCycle >= 0.15 && glanceCycle <= 0.30) frame = 'look-right';
            else if (glanceCycle >= 0.70 && glanceCycle <= 0.85) frame = 'look-left';
          }
        }
      }

      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));

      // 2. Dynamic cast shadow that scales with vertical hop/bob!
      ctx.save();
      ctx.globalAlpha = 0.42 * shadowScale;
      ctx.fillStyle = ITEM_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 14, 15 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Render avatar sprite with locomotion transforms
      const currentImg = (p.frameImages && p.frameImages[frame] && p.frameImages[frame].complete)
        ? p.frameImages[frame]
        : (p.img && p.img.complete ? p.img : null);

      if (currentImg) {
        ctx.save();
        ctx.translate(translateX, translateY);
        if (rotate !== 0) ctx.rotate(p.facing === 'left' ? -rotate : rotate);
        if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);

        if (p.facing === 'left') {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(currentImg, -avatarSize / 2, -avatarSize + 12, avatarSize, avatarSize);
        ctx.restore();
      } else {
        // Fallback Pin
        ctx.save();
        ctx.translate(translateX, translateY);
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, -6, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧑', 0, -2);
        ctx.restore();
      }

      // 4. Polished rounded pill name badge with subtle drop shadow
      this.drawNameplate(ctx, p.name, 0, -avatarSize + translateY + 2, false);

      ctx.restore();
    }

    renderBot(ctx) {
      const b = this.bot;
      const t = this.gameTime;
      const botHeight = 44;
      const botSize = 42;

      let translateY = 0;
      let translateX = 0;
      let rotate = 0;
      let scaleX = 1;
      let scaleY = 1;
      let shadowScale = 1;
      let frame = 'default';

      if (b.moving) {
        // Wheeled rolling tilt when moving: forward roll curve, slight squash/stretch, motor hum
        const rollCurve = Math.sin(b.rollT * Math.PI);
        const motorHum = Math.sin(t * 45) * 0.008;
        // Negative angle leans forward into movement direction
        const forwardLean = -(5.2 * Math.PI / 180) * rollCurve;

        translateY = 0; // Stays firmly wheeled on the ground
        rotate = forwardLean;
        scaleX = 1 + 0.03 * rollCurve;
        scaleY = 1 - 0.025 * rollCurve + motorHum;
        shadowScale = 1.08;
      } else {
        // Smooth floating levitation bob cycle + motor hum
        const hoverWave = Math.sin(t * 3.2);
        translateY = hoverWave * 3.5 - 2;
        shadowScale = 1 - hoverWave * 0.12;

        const stretchCycle = (t % 4.5) / 4.5;
        if (stretchCycle >= 0.68 && stretchCycle <= 0.88) {
          const progress = Math.sin(((stretchCycle - 0.68) / 0.20) * Math.PI);
          translateY -= 0.03 * botHeight * progress;
          scaleY = 1 + 0.03 * progress;
          scaleX = 1 - 0.02 * progress;
          frame = 'stretch';
        } else {
          const blinkCycle = (t % 3.4) / 3.4;
          if (blinkCycle >= 0.88 && blinkCycle <= 0.96) {
            frame = 'blink';
          } else {
            const glanceCycle = (t % 5.8) / 5.8;
            if (glanceCycle >= 0.18 && glanceCycle <= 0.34) frame = 'look-right';
            else if (glanceCycle >= 0.72 && glanceCycle <= 0.86) frame = 'look-left';
          }
        }
      }

      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));

      // Dynamic cast shadow under bot
      ctx.save();
      ctx.globalAlpha = 0.35 * shadowScale;
      ctx.fillStyle = ITEM_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 14, 13 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bot sprite
      const currentImg = (b.frameImages && b.frameImages[frame] && b.frameImages[frame].complete)
        ? b.frameImages[frame]
        : (b.img && b.img.complete ? b.img : null);

      if (currentImg) {
        ctx.save();
        ctx.translate(translateX, translateY);
        if (rotate !== 0) ctx.rotate(b.facing === 'left' ? -rotate : rotate);
        if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
        if (b.facing === 'left') {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(currentImg, -botSize / 2, -botSize + 10, botSize, botSize);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(translateX, translateY);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(0, -6, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🤖', 0, -2);
        ctx.restore();
      }

      // Name badge
      this.drawNameplate(ctx, b.name, 0, -botSize + translateY + 2, true);

      ctx.restore();
    }

    drawNameplate(ctx, label, centerX, topY, isBot = false) {
      ctx.save();
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(label).width;
      const boxW = Math.max(textWidth + 16, 44);
      const boxH = 19;
      const boxX = centerX - boxW / 2;
      const boxY = topY - boxH - 4;

      // Subtle drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      // Background rounded pill styling
      ctx.fillStyle = isBot ? 'rgba(6, 78, 59, 0.88)' : 'rgba(15, 23, 42, 0.88)';
      roundRectPath(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.fill();

      // Clear shadow before border & text
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = isBot ? 'rgba(52, 211, 153, 0.55)' : 'rgba(129, 140, 248, 0.55)';
      ctx.lineWidth = 1;
      roundRectPath(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.stroke();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, centerX, boxY + boxH / 2);
      ctx.restore();
    }
  }

  window.V2Engine = V2Engine;
})();
