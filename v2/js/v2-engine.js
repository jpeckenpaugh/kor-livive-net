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
  const WORLD_SIZE = 64;

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

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

    const matCanvas = document.createElement('canvas');
    matCanvas.width = TILE;
    matCanvas.height = TILE;
    const mctx = matCanvas.getContext('2d');
    mctx.fillStyle = '#78350f';
    mctx.fillRect(0, 0, TILE, TILE);
    mctx.fillStyle = '#92400e';
    mctx.fillRect(4, 4, TILE - 8, TILE - 8);

    // Grass tile variants (subtle blade flecks and color patches: #4b8750, #529358, #457d4a)
    const grassColors = ['#4b8750', '#529358', '#457d4a'];
    const grassTiles = [];
    for (let v = 0; v < 3; v++) {
      const gCanvas = document.createElement('canvas');
      gCanvas.width = TILE;
      gCanvas.height = TILE;
      const gctx = gCanvas.getContext('2d');
      gctx.fillStyle = grassColors[v];
      gctx.fillRect(0, 0, TILE, TILE);

      const rand = mulberry32(10007 + v * 997);
      for (let i = 0; i < 18; i++) {
        const gx = rand() * TILE;
        const gy = rand() * TILE;
        gctx.fillStyle = rand() > 0.5 ? 'rgba(192, 223, 120, 0.35)' : 'rgba(30, 65, 43, 0.35)';
        gctx.fillRect(gx, gy, 2 + rand() * 2, 2 + rand() * 2);
      }
      grassTiles.push(gCanvas);
    }

    // Dirt path tile (#a17a52 with grain)
    const dirtCanvas = document.createElement('canvas');
    dirtCanvas.width = TILE;
    dirtCanvas.height = TILE;
    const dctx = dirtCanvas.getContext('2d');
    dctx.fillStyle = '#a17a52';
    dctx.fillRect(0, 0, TILE, TILE);
    const drand = mulberry32(424242);
    for (let i = 0; i < 20; i++) {
      dctx.fillStyle = drand() > 0.5 ? 'rgba(84, 60, 52, 0.28)' : 'rgba(215, 185, 140, 0.28)';
      dctx.fillRect(drand() * TILE, drand() * TILE, 2 + drand() * 3, 2 + drand() * 2);
    }

    return {
      floor: floorCanvas,
      wall: wallCanvas,
      mat: matCanvas,
      grass: grassTiles,
      dirt: dirtCanvas
    };
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
      this.scenery = [];
      this.sceneryImages = {};
      this.loadSceneryImages();

      this.initWorld();
    }

    loadSceneryImages() {
      if (typeof window !== 'undefined' && window.V2_SCENERY) {
        for (const [key, uri] of Object.entries(window.V2_SCENERY)) {
          const img = new Image();
          img.src = uri;
          this.sceneryImages[key] = img;
        }
      }
    }

    initWorld() {
      const houseX = this.house.x || 0;
      const houseY = this.house.y || 0;
      const maxX = houseX + this.house.width - 1;
      const maxY = houseY + this.house.height - 1;

      // 1. Build 64x64 terrain grid
      this.grid = [];
      for (let y = 0; y < WORLD_SIZE; y++) {
        const row = [];
        for (let x = 0; x < WORLD_SIZE; x++) row.push('grass');
        this.grid.push(row);
      }

      // Home room footprint
      for (let y = houseY; y <= maxY; y++) {
        for (let x = houseX; x <= maxX; x++) {
          const onWall = x === houseX || x === maxX || y === houseY || y === maxY;
          this.grid[y][x] = onWall ? 'home-wall' : 'home-floor';
        }
      }

      // Doorway
      if (this.door && this.door.y < WORLD_SIZE && this.door.x < WORLD_SIZE) {
        this.grid[this.door.y][this.door.x] = 'home-floor';

        // Dirt path south from door through yard
        for (let y = this.door.y + 1; y <= Math.min(WORLD_SIZE - 1, this.door.y + 8); y++) {
          for (let x = this.door.x - 1; x <= this.door.x + 1; x++) {
            if (this.grid[y] && this.grid[y][x] === 'grass') {
              this.grid[y][x] = 'dirt';
            }
          }
        }
      }

      // 2. Perimeter walls as solid boxes
      for (let y = houseY; y <= maxY; y++) {
        for (let x = houseX; x <= maxX; x++) {
          const isPerimeter = x === houseX || x === maxX || y === houseY || y === maxY;
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

      // 3. World bounds outer boundary collision (cannot walk outside 0..WORLD_SIZE)
      this.solidBoxes.push({ left: -TILE * 4, right: 0, top: -TILE * 4, bottom: (WORLD_SIZE + 4) * TILE });
      this.solidBoxes.push({ left: WORLD_SIZE * TILE, right: (WORLD_SIZE + 4) * TILE, top: -TILE * 4, bottom: (WORLD_SIZE + 4) * TILE });
      this.solidBoxes.push({ left: -TILE * 4, right: (WORLD_SIZE + 4) * TILE, top: -TILE * 4, bottom: 0 });
      this.solidBoxes.push({ left: -TILE * 4, right: (WORLD_SIZE + 4) * TILE, top: WORLD_SIZE * TILE, bottom: (WORLD_SIZE + 4) * TILE });

      // 4. Generate outdoor scenery items
      const sceneryRand = mulberry32(hashString('scenery:home-lot'));
      const sceneryTypes = [
        'apple-tree', 'puffy-tree', 'chestnut-tree',
        'rounded-bush', 'flowering-bush', 'rock-boulder',
        'mushroom', 'mushroom-cluster', 'flower-red', 'grass-tuft'
      ];
      const occupied = new Set();
      for (let y = houseY; y <= maxY; y++) {
        for (let x = houseX; x <= maxX; x++) occupied.add(x + ',' + y);
      }
      // Path clear in front of door
      for (let y = this.door.y + 1; y <= this.door.y + 8; y++) {
        for (let x = this.door.x - 1; x <= this.door.x + 1; x++) occupied.add(x + ',' + y);
      }

      const targetCount = 65;
      let attempts = 0;
      while (this.scenery.length < targetCount && attempts < 3000) {
        attempts++;
        const sx = Math.floor(sceneryRand() * WORLD_SIZE);
        const sy = Math.floor(sceneryRand() * WORLD_SIZE);
        const skey = sx + ',' + sy;
        if (occupied.has(skey)) continue;
        if (!this.grid[sy] || this.grid[sy][sx] !== 'grass') continue;

        const stype = sceneryTypes[Math.floor(sceneryRand() * sceneryTypes.length)];
        const isTree = stype.includes('tree');
        const isBushOrRock = stype.includes('bush') || stype.includes('rock');
        const scale = isTree ? (0.85 + sceneryRand() * 0.3) : isBushOrRock ? (0.8 + sceneryRand() * 0.25) : (0.75 + sceneryRand() * 0.3);
        const isObstacle = isTree || stype === 'rock-boulder';

        const sItem = {
          id: 'scenery-' + this.scenery.length,
          type: stype,
          x: sx,
          y: sy,
          scale,
          isObstacle
        };
        this.scenery.push(sItem);
        occupied.add(skey);

        // Solid obstacle collision for trees and boulders
        if (isObstacle) {
          const colInset = isTree ? 10 : 8;
          this.solidBoxes.push({
            left: sx * TILE + colInset,
            right: (sx + 1) * TILE - colInset,
            top: sy * TILE + colInset,
            bottom: (sy + 1) * TILE - colInset
          });
        }
      }

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
        const itemId = place.itemId || place.item_id;
        const itemDef = this.items[itemId];
        if (!itemDef) continue;

        const itemW = itemDef.size?.w || itemDef.w || 1;
        const itemH = itemDef.size?.h || itemDef.h || 1;
        const placeX = typeof place.x === 'number' ? place.x : (houseX + (place.dx || 0));
        const placeY = typeof place.y === 'number' ? place.y : (houseY + (place.dy || 0));

        const bounds = {
          left: placeX * TILE,
          top: placeY * TILE,
          width: itemW * TILE,
          height: itemH * TILE,
          right: (placeX + itemW) * TILE,
          bottom: (placeY + itemH) * TILE
        };

        const pad = itemPad(bounds);

        if (itemDef.type === 'rug') {
          this.rugs.push({
            id: itemId,
            bounds,
            colors: itemDef.colors
          });
        } else {
          this.furniture.push({
            id: itemId,
            shape: itemDef.shape,
            colors: itemDef.colors,
            bounds,
            pad
          });

          // Solid collision if not passable
          if (itemDef.solid !== false && !itemDef.passable) {
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

    drawSceneryItem(ctx, item) {
      const img = this.sceneryImages[item.type];
      if (!img || !img.complete) return;

      const isTree = item.type.includes('tree');
      const isBushOrRock = item.type.includes('bush') || item.type.includes('rock');

      let baseW, baseH;
      if (isTree) {
        baseW = TILE * 2.5;
        baseH = TILE * 3.0;
      } else if (isBushOrRock) {
        baseW = TILE * 1.5;
        baseH = TILE * 1.4;
      } else {
        baseW = TILE * 0.8;
        baseH = TILE * 0.8;
      }

      const width = baseW * (item.scale || 1);
      const height = baseH * (item.scale || 1);

      const footX = (item.x + 0.5) * TILE;
      const footY = (item.y + 1) * TILE;

      const BOTTOM_OFFSETS = {
        'apple-tree': 0.148,
        'chestnut-tree': 0.107,
        'puffy-tree': 0.086,
        'rounded-bush': 0.068,
        'flowering-bush': 0.0,
        'rock-boulder': 0.0,
        'mushroom': 0.0,
        'mushroom-cluster': 0.0,
        'flower-red': 0.088,
        'grass-tuft': 0.0
      };
      const bottomTrim = (BOTTOM_OFFSETS[item.type] || 0) * height;

      // Scenery shadow for trees, rocks, bushes
      if (isTree || isBushOrRock) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = ITEM_SHADOW;
        ctx.beginPath();
        ctx.ellipse(footX, footY - TILE * 0.05, width * 0.32, TILE * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.drawImage(img, footX - width / 2, footY - height + bottomTrim, width, height);
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
      const camX = Math.round(w / 2 - this.camera.x);
      const camY = Math.round(h / 2 - this.camera.y);
      ctx.translate(camX, camY);

      // Camera view culling bounds in tile coordinates
      const minTileX = Math.max(0, Math.floor((this.camera.x - w / 2) / TILE) - 2);
      const maxTileX = Math.min(WORLD_SIZE - 1, Math.ceil((this.camera.x + w / 2) / TILE) + 2);
      const minTileY = Math.max(0, Math.floor((this.camera.y - h / 2) / TILE) - 2);
      const maxTileY = Math.min(WORLD_SIZE - 1, Math.ceil((this.camera.y + h / 2) / TILE) + 2);

      // Draw World Terrain Tiles
      for (let y = minTileY; y <= maxTileY; y++) {
        for (let x = minTileX; x <= maxTileX; x++) {
          const tile = this.grid ? this.grid[y][x] : 'grass';
          const px = x * TILE;
          const py = y * TILE;

          if (tile === 'grass') {
            const v = (x * 7 + y * 13) % 3;
            ctx.drawImage(this.textures.grass[v], px, py);
          } else if (tile === 'dirt') {
            ctx.drawImage(this.textures.dirt, px, py);
          } else if (tile === 'home-wall') {
            ctx.drawImage(this.textures.wall, px, py);
          } else if (tile === 'home-floor') {
            const isDoor = this.door && x === this.door.x && y === this.door.y;
            if (isDoor) {
              ctx.drawImage(this.textures.mat, px, py);
            } else {
              ctx.drawImage(this.textures.floor, px, py);
            }
          }
        }
      }

      // Draw Rugs (ground layer below entities and furniture)
      for (const rug of this.rugs) {
        drawRugShape(ctx, rug.bounds, rug.colors);
      }

      // Gather renderables for Y-sorting: Furniture, Scenery, Player, Bot
      const drawList = [];

      for (const furn of this.furniture) {
        drawList.push({
          type: 'furniture',
          y: furn.bounds.bottom,
          record: furn
        });
      }

      for (const scen of this.scenery) {
        // Draw scenery that is within camera bounds
        if (scen.x >= minTileX - 3 && scen.x <= maxTileX + 3 && scen.y >= minTileY - 3 && scen.y <= maxTileY + 3) {
          drawList.push({
            type: 'scenery',
            y: (scen.y + 1) * TILE,
            record: scen
          });
        }
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

      // Sort by feet/bottom Y for correct depth sorting
      drawList.sort((a, b) => a.y - b.y);

      // Render sorted entities
      for (const item of drawList) {
        if (item.type === 'furniture') {
          const f = item.record;
          const shapeFn = FURNITURE_SHAPES[f.shape];
          if (shapeFn) {
            shapeFn(ctx, f.pad, f.colors);
          }
        } else if (item.type === 'scenery') {
          this.drawSceneryItem(ctx, item.record);
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
        if (rotate !== 0) ctx.rotate(p.facing === 'right' ? rotate : -rotate);
        if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);

        if (p.facing === 'right') {
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
        if (rotate !== 0) ctx.rotate(b.facing === 'right' ? rotate : -rotate);
        if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
        if (b.facing === 'right') {
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
