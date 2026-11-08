/**
 * v2-engine.js - Canvas 2D Top-Down / 3/4 Perspective Room & Entity Renderer
 * Faithful to pp-livive-net rendering style:
 * - 17x17 footprint with wall borders, doorway at (8, 16), floor tiles.
 * - Furniture rendering from pp-livive-net vector path rules.
 * - Procedural/SVG avatar rendering for player and companion VoxelBot.
 * - Smooth camera centering and shadow pass.
 */

(function () {
  'use strict';

  const TILE = 48;
  const ITEM_SHADOW = 'rgba(8, 14, 9, 0.3)';

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
    fillRoundRect(ctx, box.left + TILE * 0.12, box.baseY - TILE * 0.05, TILE * 0.08, TILE * 0.07, 2, colors.trim);
    fillRoundRect(ctx, box.right - TILE * 0.2, box.baseY - TILE * 0.05, TILE * 0.08, TILE * 0.07, 2, colors.trim);
  }

  function drawCoffeeTable(ctx, box, colors) {
    itemShadow(ctx, box);
    const topY = box.baseY - TILE * 0.52;
    fillRoundRect(ctx, box.left + TILE * 0.08, topY + TILE * 0.14, TILE * 0.07, TILE * 0.42, 2, colors.trim);
    fillRoundRect(ctx, box.right - TILE * 0.15, topY + TILE * 0.14, TILE * 0.07, TILE * 0.42, 2, colors.trim);
    fillRoundRect(ctx, box.left, topY, box.width, TILE * 0.16, 5, colors.accent);
    fillRoundRect(ctx, box.left + 3, topY + TILE * 0.14, box.width - 6, TILE * 0.1, 3, colors.base);
  }

  function drawTv(ctx, box, colors) {
    itemShadow(ctx, box);
    const centerX = (box.left + box.right) / 2;
    const bodyWidth = Math.min(box.width * 0.88, TILE * 0.9);
    const bodyHeight = TILE * 0.76;
    const bodyX = centerX - bodyWidth / 2;
    const bodyY = box.baseY - TILE * 0.12 - bodyHeight;
    fillRoundRect(ctx, centerX - TILE * 0.2, box.baseY - TILE * 0.14, TILE * 0.4, TILE * 0.1, 3, colors.trim);
    fillRoundRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 6, colors.base);
    fillRoundRect(ctx, bodyX + 4, bodyY + 4, bodyWidth - 16, bodyHeight - 10, 4, colors.accent);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 1;
    for (let line = 1; line <= 3; line += 1) {
      const y = bodyY + 4 + ((bodyHeight - 10) * line) / 4;
      ctx.beginPath();
      ctx.moveTo(bodyX + 5, y);
      ctx.lineTo(bodyX + bodyWidth - 13, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(bodyX + bodyWidth - 7, bodyY + bodyHeight * 0.36, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = colors.trim;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bodyX + bodyWidth - 7, bodyY + bodyHeight * 0.6, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRadio(ctx, box, colors) {
    itemShadow(ctx, box);
    const centerX = (box.left + box.right) / 2;
    const bodyWidth = Math.min(box.width * 0.72, TILE * 0.66);
    const bodyHeight = TILE * 0.46;
    const bodyX = centerX - bodyWidth / 2;
    const bodyY = box.baseY - TILE * 0.1 - bodyHeight;
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bodyX + bodyWidth * 0.2, bodyY + 2);
    ctx.lineTo(bodyX + bodyWidth * 0.05, bodyY - TILE * 0.28);
    ctx.stroke();
    fillRoundRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 5, colors.base);
    ctx.beginPath();
    ctx.arc(bodyX + bodyWidth * 0.3, bodyY + bodyHeight * 0.52, bodyHeight * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = colors.trim;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bodyX + bodyWidth * 0.3, bodyY + bodyHeight * 0.52, bodyHeight * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    fillRoundRect(ctx, bodyX + bodyWidth * 0.62, bodyY + bodyHeight * 0.22, bodyWidth * 0.24, bodyHeight * 0.16, 2, colors.accent);
    fillRoundRect(ctx, bodyX + bodyWidth * 0.62, bodyY + bodyHeight * 0.5, bodyWidth * 0.24, bodyHeight * 0.16, 2, colors.trim);
  }

  function drawFloorLamp(ctx, box, colors) {
    itemShadow(ctx, box);
    const centerX = (box.left + box.right) / 2;
    const topY = box.baseY - TILE * 1.14;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.ellipse(centerX, topY + TILE * 0.18, TILE * 0.34, TILE * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = Math.max(2, TILE * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, box.baseY - TILE * 0.02);
    ctx.lineTo(centerX, topY + TILE * 0.26);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(centerX, box.baseY, TILE * 0.16, TILE * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.trim;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX - TILE * 0.2, topY + TILE * 0.26);
    ctx.lineTo(centerX + TILE * 0.2, topY + TILE * 0.26);
    ctx.lineTo(centerX + TILE * 0.13, topY);
    ctx.lineTo(centerX - TILE * 0.13, topY);
    ctx.closePath();
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawBookshelf(ctx, box, colors) {
    itemShadow(ctx, box);
    const top = box.baseY - Math.min(box.height * 0.92, TILE * 1.82);
    fillRoundRect(ctx, box.left, top, box.width, box.baseY - top, 4, colors.trim);
    fillRoundRect(ctx, box.left + 3, top + 3, box.width - 6, box.baseY - top - 6, 2, colors.base);
    const shelves = 3;
    const shelfHeight = (box.baseY - top - 8) / shelves;
    for (let row = 0; row < shelves; row += 1) {
      const shelfY = top + 4 + row * shelfHeight;
      ctx.beginPath();
      ctx.moveTo(box.left + 4, shelfY + shelfHeight - 2);
      ctx.lineTo(box.right - 4, shelfY + shelfHeight - 2);
      ctx.strokeStyle = colors.trim;
      ctx.lineWidth = 2;
      ctx.stroke();
      const bookWidth = (box.width - 12) / 4;
      for (let book = 0; book < 4; book += 1) {
        const height = shelfHeight * (0.42 + ((row + book) % 3) * 0.12);
        fillRoundRect(
          ctx,
          box.left + 6 + book * bookWidth,
          shelfY + shelfHeight - 3 - height,
          bookWidth - 2,
          height,
          1,
          book % 2 ? colors.accent : colors.trim
        );
      }
    }
  }

  function drawPlant(ctx, box, colors) {
    itemShadow(ctx, box);
    const centerX = (box.left + box.right) / 2;
    const potTop = box.baseY - TILE * 0.34;
    ctx.beginPath();
    ctx.moveTo(centerX - TILE * 0.17, potTop);
    ctx.lineTo(centerX + TILE * 0.17, potTop);
    ctx.lineTo(centerX + TILE * 0.13, box.baseY - TILE * 0.02);
    ctx.lineTo(centerX - TILE * 0.13, box.baseY - TILE * 0.02);
    ctx.closePath();
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = colors.trim;
    ctx.beginPath();
    ctx.moveTo(centerX, potTop);
    ctx.lineTo(centerX, potTop - TILE * 0.34);
    ctx.stroke();
    const leaves = [
      { dx: -0.18, dy: -0.5, rx: 0.19, ry: 0.11, angle: -0.5, color: colors.base },
      { dx: 0.17, dy: -0.44, rx: 0.19, ry: 0.11, angle: 0.5, color: colors.base },
      { dx: -0.04, dy: -0.66, rx: 0.14, ry: 0.2, angle: -0.15, color: colors.trim },
      { dx: 0.1, dy: -0.6, rx: 0.14, ry: 0.12, angle: 0.9, color: colors.base }
    ];
    for (const leaf of leaves) {
      ctx.beginPath();
      ctx.ellipse(
        centerX + TILE * leaf.dx,
        potTop + TILE * leaf.dy,
        TILE * leaf.rx,
        TILE * leaf.ry,
        leaf.angle,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = leaf.color;
      ctx.fill();
    }
  }

  function drawFridge(ctx, box, colors) {
    itemShadow(ctx, box);
    const width = Math.min(box.width * 0.72, TILE * 0.7);
    const height = TILE * 1.36;
    const x = (box.left + box.right) / 2 - width / 2;
    const y = box.baseY - height;
    fillRoundRect(ctx, x, y, width, height, 5, colors.base);
    fillRoundRect(ctx, x + 2, y + 2, width - 4, height * 0.32, 3, colors.accent);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + height * 0.36);
    ctx.lineTo(x + width - 2, y + height * 0.36);
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
    fillRoundRect(ctx, x + width - TILE * 0.09, y + TILE * 0.08, TILE * 0.035, TILE * 0.2, 2, colors.trim);
    fillRoundRect(ctx, x + width - TILE * 0.09, y + height * 0.44, TILE * 0.035, TILE * 0.26, 2, colors.trim);
  }

  function drawStove(ctx, box, colors) {
    itemShadow(ctx, box);
    const width = Math.min(box.width * 0.8, TILE * 0.76);
    const height = TILE * 0.82;
    const x = (box.left + box.right) / 2 - width / 2;
    const y = box.baseY - height;
    fillRoundRect(ctx, x, y, width, height, 4, colors.base);
    fillRoundRect(ctx, x + 2, y + 2, width - 4, TILE * 0.16, 3, colors.accent);
    for (let index = 0; index < 4; index += 1) {
      const cx = x + width * (0.3 + (index % 2) * 0.4);
      const cy = y + TILE * 0.16 * (index < 2 ? 0.45 : 1.05);
      ctx.beginPath();
      ctx.arc(cx, cy, TILE * 0.06, 0, Math.PI * 2);
      ctx.strokeStyle = colors.trim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    fillRoundRect(ctx, x + 4, y + TILE * 0.26, width - 8, height - TILE * 0.32, 3, colors.trim);
    ctx.save();
    ctx.globalAlpha = 0.35;
    fillRoundRect(ctx, x + 7, y + TILE * 0.3, width - 14, height - TILE * 0.4, 2, colors.accent);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x + 8, y + TILE * 0.26);
    ctx.lineTo(x + width - 8, y + TILE * 0.26);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawCounter(ctx, box, colors) {
    itemShadow(ctx, box);
    const height = TILE * 0.76;
    const y = box.baseY - height;
    fillRoundRect(ctx, box.left, y, box.width, height, 3, colors.base);
    fillRoundRect(ctx, box.left - 2, y - TILE * 0.04, box.width + 4, TILE * 0.14, 3, colors.accent);
    const doors = Math.max(2, Math.round(box.width / TILE));
    const doorWidth = box.width / doors;
    for (let index = 0; index < doors; index += 1) {
      strokeRoundRect(
        ctx,
        box.left + index * doorWidth + 3,
        y + TILE * 0.16,
        doorWidth - 6,
        height - TILE * 0.2,
        2,
        colors.trim,
        1.5
      );
      ctx.beginPath();
      ctx.arc(box.left + (index + 1) * doorWidth - 6, y + height * 0.52, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = colors.trim;
      ctx.fill();
    }
  }

  function drawDiningTable(ctx, box, colors) {
    itemShadow(ctx, box);
    const topX = box.left + TILE * 0.1;
    const topW = box.width - TILE * 0.2;
    const topY = box.top + TILE * 0.1;
    const topH = Math.max(TILE * 0.5, box.height - TILE * 0.5);
    const legTop = topY + topH - TILE * 0.06;
    const legHeight = Math.max(TILE * 0.12, box.baseY - legTop + TILE * 0.06);
    fillRoundRect(ctx, topX + TILE * 0.12, legTop, TILE * 0.11, legHeight, 2, colors.trim);
    fillRoundRect(ctx, topX + topW - TILE * 0.23, legTop, TILE * 0.11, legHeight, 2, colors.trim);
    fillRoundRect(ctx, topX, topY, topW, topH, 8, colors.accent);
    strokeRoundRect(ctx, topX, topY, topW, topH, 8, colors.trim, 2);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 1.5;
    for (let line = 1; line <= 2; line += 1) {
      const y = topY + (topH * line) / 3;
      ctx.beginPath();
      ctx.moveTo(topX + 6, y);
      ctx.lineTo(topX + topW - 6, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(
      topX + topW / 2,
      topY + topH / 2,
      TILE * 0.26,
      TILE * 0.12,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = colors.base;
    ctx.fill();
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawChair(ctx, box, colors) {
    itemShadow(ctx, box);
    const centerX = (box.left + box.right) / 2;
    const seatWidth = Math.min(box.width * 0.62, TILE * 0.6);
    const seatY = box.baseY - TILE * 0.42;
    fillRoundRect(ctx, centerX - seatWidth / 2, box.baseY - TILE * 0.62, seatWidth, TILE * 0.2, 4, colors.trim);
    fillRoundRect(ctx, centerX - seatWidth / 2, seatY, seatWidth, TILE * 0.2, 4, colors.base);
    fillRoundRect(ctx, centerX - seatWidth / 2, box.baseY - TILE * 0.63, seatWidth, TILE * 0.1, 3, colors.accent);
    fillRoundRect(ctx, centerX - seatWidth / 2 + 2, seatY + TILE * 0.18, TILE * 0.07, TILE * 0.2, 2, colors.trim);
    fillRoundRect(ctx, centerX + seatWidth / 2 - TILE * 0.09, seatY + TILE * 0.18, TILE * 0.07, TILE * 0.2, 2, colors.trim);
  }

  function drawBed(ctx, box, colors) {
    itemShadow(ctx, box);
    fillRoundRect(ctx, box.left, box.top + TILE * 0.08, box.width, box.height - TILE * 0.16, 6, colors.trim);
    fillRoundRect(ctx, box.left + 3, box.top + TILE * 0.16, box.width - 6, box.height - TILE * 0.3, 5, colors.accent);
    fillRoundRect(ctx, box.left + 2, box.top + TILE * 0.14, box.width - 4, TILE * 0.16, 4, colors.trim);
    const pillowWidth = (box.width - TILE * 0.42) / 2;
    fillRoundRect(ctx, box.left + TILE * 0.16, box.top + TILE * 0.32, pillowWidth, TILE * 0.34, 6, colors.accent);
    fillRoundRect(ctx, box.left + TILE * 0.26 + pillowWidth, box.top + TILE * 0.32, pillowWidth, TILE * 0.34, 6, colors.accent);
    fillRoundRect(
      ctx,
      box.left + 3,
      box.top + TILE * 0.78,
      box.width - 6,
      box.height - TILE * 0.92,
      4,
      colors.base
    );
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(box.left + 4, box.top + TILE * 0.8);
    ctx.lineTo(box.right - 4, box.top + TILE * 0.8);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawNightstand(ctx, box, colors) {
    itemShadow(ctx, box);
    const width = Math.min(box.width * 0.72, TILE * 0.68);
    const height = TILE * 0.56;
    const x = (box.left + box.right) / 2 - width / 2;
    const y = box.baseY - height;
    fillRoundRect(ctx, x, y, width, height, 3, colors.base);
    fillRoundRect(ctx, x - 1, y - TILE * 0.03, width + 2, TILE * 0.08, 2, colors.accent);
    strokeRoundRect(ctx, x + 4, y + TILE * 0.12, width - 8, height - TILE * 0.18, 2, colors.trim, 1.5);
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height * 0.52, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent;
    ctx.fill();
  }

  function drawDresser(ctx, box, colors) {
    itemShadow(ctx, box);
    const height = TILE * 0.62;
    const y = box.baseY - height;
    fillRoundRect(ctx, box.left, y, box.width, height, 3, colors.base);
    fillRoundRect(ctx, box.left - 1, y - TILE * 0.04, box.width + 2, TILE * 0.1, 2, colors.accent);
    const drawers = Math.max(2, Math.round(box.width / TILE));
    const drawerWidth = box.width / drawers;
    for (let index = 0; index < drawers; index += 1) {
      strokeRoundRect(
        ctx,
        box.left + index * drawerWidth + 4,
        y + TILE * 0.14,
        drawerWidth - 8,
        height - TILE * 0.2,
        2,
        colors.trim,
        1.5
      );
      ctx.beginPath();
      ctx.arc(box.left + (index + 0.5) * drawerWidth, y + height * 0.55, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent;
      ctx.fill();
    }
  }

  function drawRugShape(ctx, bounds, colors) {
    const inset = TILE * 0.08;
    const x = bounds.left + inset;
    const y = bounds.top + inset;
    const w = bounds.width - inset * 2;
    const h = bounds.height - inset * 2;
    fillRoundRect(ctx, x, y, w, h, TILE * 0.26, colors.base);
    strokeRoundRect(ctx, x + 2, y + 2, w - 4, h - 4, TILE * 0.24, colors.accent, Math.max(1.5, TILE * 0.035));
    ctx.save();
    ctx.globalAlpha = 0.5;
    strokeRoundRect(
      ctx,
      x + TILE * 0.24,
      y + TILE * 0.24,
      w - TILE * 0.48,
      h - TILE * 0.48,
      TILE * 0.2,
      colors.accent,
      Math.max(1, TILE * 0.025)
    );
    ctx.restore();
  }

  const FURNITURE_SHAPES = {
    couch: drawCouch,
    armchair: drawArmchair,
    'coffee-table': drawCoffeeTable,
    tv: drawTv,
    radio: drawRadio,
    'floor-lamp': drawFloorLamp,
    bookshelf: drawBookshelf,
    plant: drawPlant,
    fridge: drawFridge,
    stove: drawStove,
    counter: drawCounter,
    'dining-table': drawDiningTable,
    chair: drawChair,
    bed: drawBed,
    nightstand: drawNightstand,
    dresser: drawDresser
  };

  /* --- Cached Pre-rendered Textures --- */
  function buildTextures() {
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = TILE;
    floorCanvas.height = TILE;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#b58c5a';
    fctx.fillRect(0, 0, TILE, TILE);
    const boards = 4;
    const boardH = TILE / boards;
    for (let i = 0; i < boards; i++) {
      fctx.fillStyle = i % 2 === 0 ? 'rgba(255, 231, 190, 0.09)' : 'rgba(58, 36, 20, 0.09)';
      fctx.fillRect(0, i * boardH, TILE, boardH);
      fctx.strokeStyle = 'rgba(58, 38, 22, 0.38)';
      fctx.lineWidth = 1.5;
      fctx.beginPath();
      fctx.moveTo(0, i * boardH + boardH);
      fctx.lineTo(TILE, i * boardH + boardH);
      fctx.stroke();
      const joint = (i % 2 === 0 ? 0.3 : 0.7) * TILE;
      fctx.beginPath();
      fctx.moveTo(joint, i * boardH);
      fctx.lineTo(joint, i * boardH + boardH);
      fctx.stroke();
    }

    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = TILE;
    wallCanvas.height = TILE;
    const wctx = wallCanvas.getContext('2d');
    wctx.fillStyle = '#4c392c';
    wctx.fillRect(0, 0, TILE, TILE);
    const rows = 4;
    const bH = TILE / rows;
    const bW = TILE / 3;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 === 0 ? 0 : -bW / 2;
      for (let c = -1; c <= 3; c++) {
        const bx = c * bW + off + 2;
        const by = r * bH + 2;
        wctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255, 239, 214, 0.12)' : 'rgba(24, 18, 14, 0.16)';
        wctx.fillRect(bx, by, bW - 4, bH - 4);
      }
    }
    wctx.strokeStyle = 'rgba(28, 22, 18, 0.4)';
    wctx.lineWidth = 1.5;
    for (let r = 1; r < rows; r++) {
      wctx.beginPath();
      wctx.moveTo(0, (TILE * r) / rows);
      wctx.lineTo(TILE, (TILE * r) / rows);
      wctx.stroke();
    }

    // Door mat tile
    const matCanvas = document.createElement('canvas');
    matCanvas.width = TILE;
    matCanvas.height = TILE;
    const mctx = matCanvas.getContext('2d');
    mctx.drawImage(floorCanvas, 0, 0);
    mctx.fillStyle = '#5c4033';
    fillRoundRect(mctx, 4, 10, TILE - 8, TILE - 20, 4, '#7c5335');
    strokeRoundRect(mctx, 4, 10, TILE - 8, TILE - 20, 4, '#422817', 2);
    mctx.fillStyle = '#e8d5b5';
    mctx.font = 'bold 10px sans-serif';
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    mctx.fillText('WELCOME', TILE / 2, TILE / 2);

    return { floor: floorCanvas, wall: wallCanvas, mat: matCanvas };
  }

  class V2Engine {
    constructor(canvas, data) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.data = data;
      this.textures = buildTextures();

      this.width = canvas.width;
      this.height = canvas.height;

      // Entities
      this.player = {
        x: data.spawn.x * TILE + TILE / 2,
        y: data.spawn.y * TILE + TILE / 2,
        radius: 18,
        speed: 180, // px per sec
        facing: 'down',
        name: 'Player',
        seed: 'Player1',
        img: null
      };

      this.bot = {
        x: data.spawn.x * TILE - 30,
        y: data.spawn.y * TILE + TILE / 2,
        radius: 14,
        speed: 165,
        targetX: data.spawn.x * TILE - 30,
        targetY: data.spawn.y * TILE + TILE / 2,
        name: 'Botty',
        seed: 'Botty1',
        img: null,
        bobPhase: 0
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

      this.blockedTiles = new Set();
      this.solidBoxes = [];
      this.rugs = [];
      this.furniture = [];

      this.initWorldGeometry();
    }

    initWorldGeometry() {
      // 17x17 grid: 0..16
      this.blockedTiles.clear();
      this.solidBoxes = [];
      this.rugs = [];
      this.furniture = [];

      const maxX = this.house.width - 1;
      const maxY = this.house.height - 1;

      // Build wall collisions
      for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
          const isPerimeter = x === 0 || x === maxX || y === 0 || y === maxY;
          const isDoor = x === this.door.x && y === this.door.y;
          if (isPerimeter && !isDoor) {
            this.blockedTiles.add(`${x},${y}`);
            this.solidBoxes.push({
              left: x * TILE,
              top: y * TILE,
              right: (x + 1) * TILE,
              bottom: (y + 1) * TILE
            });
          }
        }
      }

      // Furniture layout
      for (const entry of this.layout) {
        const itemDef = this.items[entry.itemId];
        if (!itemDef) continue;
        const w = itemDef.size?.w || 1;
        const h = itemDef.size?.h || 1;
        const x = entry.dx;
        const y = entry.dy;

        const bounds = {
          left: x * TILE,
          top: y * TILE,
          right: (x + w) * TILE,
          bottom: (y + h) * TILE,
          width: w * TILE,
          height: h * TILE
        };

        const fRecord = {
          itemId: entry.itemId,
          def: itemDef,
          x,
          y,
          w,
          h,
          bounds,
          pad: itemPad(bounds),
          solid: itemDef.solid !== false,
          ground: itemDef.ground === true,
          shape: itemDef.shape,
          colors: itemDef.colors || { base: '#888', accent: '#aaa', trim: '#555' }
        };

        if (fRecord.ground) {
          this.rugs.push(fRecord);
        } else {
          this.furniture.push(fRecord);
          if (fRecord.solid) {
            this.solidBoxes.push(bounds);
            for (let dy = 0; dy < h; dy++) {
              for (let dx = 0; dx < w; dx++) {
                this.blockedTiles.add(`${x + dx},${y + dy}`);
              }
            }
          }
        }
      }

      // Sort furniture by bottom Y for proper top-down depth sorting
      this.furniture.sort((a, b) => a.bounds.bottom - b.bounds.bottom);
    }

    setPlayerAvatar(svgString, name) {
      if (name) this.player.name = name;
      if (!svgString) return;
      const img = new Image();
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
      img.onload = () => {
        this.player.img = img;
      };
    }

    setBotAvatar(svgString, name) {
      if (name) this.bot.name = name;
      if (!svgString) return;
      const img = new Image();
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
      img.onload = () => {
        this.bot.img = img;
      };
    }

    canMoveTo(x, y, radius) {
      // Circle-AABB collision check with all solid boxes
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
      // 1. Move Player
      if (inputDir.x !== 0 || inputDir.y !== 0) {
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
        if (this.canMoveTo(newX, this.player.y, this.player.radius)) {
          this.player.x = newX;
        }
        if (this.canMoveTo(this.player.x, newY, this.player.radius)) {
          this.player.y = newY;
        }
      }

      // 2. Bot Companion Follow Logic
      // Ideal offset behind player depending on facing
      const followDist = 42;
      let targetX = this.player.x;
      let targetY = this.player.y;
      if (this.player.facing === 'down') targetY -= followDist;
      else if (this.player.facing === 'up') targetY += followDist;
      else if (this.player.facing === 'left') targetX += followDist;
      else if (this.player.facing === 'right') targetX -= followDist;

      // Spring / smooth lerp follow
      const botDist = Math.hypot(targetX - this.bot.x, targetY - this.bot.y);
      if (botDist > 10) {
        const lerpFactor = Math.min(1.0, 4.5 * dt);
        const nextBotX = this.bot.x + (targetX - this.bot.x) * lerpFactor;
        const nextBotY = this.bot.y + (targetY - this.bot.y) * lerpFactor;
        // Companion is hovering/flying, but we can verify it stays in room
        this.bot.x = nextBotX;
        this.bot.y = nextBotY;
      }
      this.bot.bobPhase += dt * 3.5;

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
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));

      // Player shadow
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = ITEM_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 14, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Avatar graphic or fallback
      const avatarSize = 46;
      if (p.img && p.img.complete) {
        ctx.save();
        if (p.facing === 'left') {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(p.img, -avatarSize / 2, -avatarSize + 12, avatarSize, avatarSize);
        ctx.restore();
      } else {
        // Crisp Top-Down Fallback Pin
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
      }

      // Name label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      const labelW = ctx.measureText(p.name).width + 12;
      fillRoundRect(ctx, -labelW / 2, -avatarSize - 6, labelW, 16, 4, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, 0, -avatarSize + 2);

      ctx.restore();
    }

    renderBot(ctx) {
      const b = this.bot;
      const bobY = Math.sin(b.bobPhase) * 5;
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));

      // Bot hover shadow shrinks/expands with bob
      ctx.save();
      ctx.globalAlpha = 0.3 - bobY * 0.015;
      ctx.fillStyle = ITEM_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 14, 12 + bobY * 0.5, 5 + bobY * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Float position
      ctx.translate(0, bobY - 4);

      const botSize = 38;
      if (b.img && b.img.complete) {
        ctx.drawImage(b.img, -botSize / 2, -botSize + 10, botSize, botSize);
      } else {
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
      }

      // Bot Name label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const labelW = ctx.measureText(b.name).width + 10;
      fillRoundRect(ctx, -labelW / 2, -botSize - 6, labelW, 14, 3, 'rgba(16, 185, 129, 0.85)');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.name, 0, -botSize + 1);

      ctx.restore();
    }
  }

  window.V2Engine = V2Engine;
})();
