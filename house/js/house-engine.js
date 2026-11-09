/**
 * house-engine.js - 2D Canvas Engine for House Architecture Demo
 * 
 * Features:
 * - 64x64 Grassy world lot with trees/flowers
 * - 17x17 Brick House (outer bounds x: 24..40, y: 22..38)
 * - Front door at (32, 38) with south yard path & welcome mat
 * - Back door at (32, 22) with north yard path
 * - 8 Windows (north, south, west, east) with custom pane/reflection/glow rendering
 * - Bathroom partition enclosure with doorway at (29, 25)
 * - Custom furniture vector renderers (bathtub, vanity, toilet, bath-mat, couch, armchair,
 *   coffee table, retro TV, bookshelf, floor lamp, plant, stove, fridge, counter,
 *   dining table, chair, canopy bed, nightstand, wardrobe, rugs)
 * - Locomotion physics: smooth player movement & follower VoxelBot
 * - Collision engine against outer walls, windows, partition walls, and solid furniture
 * - Smooth camera following player with bounds clamping
 */

(function () {
  'use strict';

  const TILE = 48;
  const WORLD_SIZE = 64;

  // Simple deterministic PRNG
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ==========================================================================
     Pre-rendered World & Architectural Textures
     ========================================================================== */
  function buildTextures() {
    // 1. Hardwood floor tile
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

    // 2. Bathroom ceramic tile floor
    const bathFloorCanvas = document.createElement('canvas');
    bathFloorCanvas.width = TILE;
    bathFloorCanvas.height = TILE;
    const bctx = bathFloorCanvas.getContext('2d');
    bctx.fillStyle = '#e2e8f0';
    bctx.fillRect(0, 0, TILE, TILE);
    const tilesPerAxis = 3;
    const tSz = TILE / tilesPerAxis;
    for (let ty = 0; ty < tilesPerAxis; ty++) {
      for (let tx = 0; tx < tilesPerAxis; tx++) {
        bctx.fillStyle = (tx + ty) % 2 === 0 ? '#f8fafc' : '#f1f5f9';
        bctx.fillRect(tx * tSz + 1, ty * tSz + 1, tSz - 2, tSz - 2);
        bctx.strokeStyle = '#cbd5e1';
        bctx.lineWidth = 1;
        bctx.strokeRect(tx * tSz + 0.5, ty * tSz + 0.5, tSz - 1, tSz - 1);
      }
    }

    // 3. Exterior brick wall tile
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

    // 4. Exterior window wall tile (Brick wall with classic framed window, glass panes & cyan reflection)
    const windowCanvas = document.createElement('canvas');
    windowCanvas.width = TILE;
    windowCanvas.height = TILE;
    const wnctx = windowCanvas.getContext('2d');
    // First draw brick background
    wnctx.drawImage(wallCanvas, 0, 0);
    // Outer wooden window frame
    wnctx.fillStyle = '#2d1810';
    wnctx.fillRect(6, 6, TILE - 12, TILE - 12);
    // Inner wooden sill
    wnctx.fillStyle = '#78350f';
    wnctx.fillRect(8, 8, TILE - 16, TILE - 16);
    // Glass Pane area with sky-blue / cyan reflective tint
    const glassGrad = wnctx.createLinearGradient(11, 11, TILE - 11, TILE - 11);
    glassGrad.addColorStop(0, '#cbe5f7');
    glassGrad.addColorStop(0.5, '#e0f2fe');
    glassGrad.addColorStop(1, '#93c5fd');
    wnctx.fillStyle = glassGrad;
    wnctx.fillRect(11, 11, TILE - 22, TILE - 22);
    // Subtle interior warm glow / depth
    wnctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
    wnctx.fillRect(11, TILE - 20, TILE - 22, 9);
    // Window mullions (cross frame)
    wnctx.fillStyle = '#451a03';
    wnctx.fillRect(TILE / 2 - 1.5, 11, 3, TILE - 22);
    wnctx.fillRect(11, TILE / 2 - 1.5, TILE - 22, 3);
    // Diagonal glass shine highlight
    wnctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    wnctx.beginPath();
    wnctx.moveTo(13, 13);
    wnctx.lineTo(24, 13);
    wnctx.lineTo(13, 24);
    wnctx.closePath();
    wnctx.fill();

    // 5. Interior partition wall tile (Drywall with warm trim)
    const intWallCanvas = document.createElement('canvas');
    intWallCanvas.width = TILE;
    intWallCanvas.height = TILE;
    const iwctx = intWallCanvas.getContext('2d');
    iwctx.fillStyle = '#64748b';
    iwctx.fillRect(0, 0, TILE, TILE);
    iwctx.fillStyle = '#94a3b8';
    iwctx.fillRect(4, 4, TILE - 8, TILE - 8);
    iwctx.fillStyle = '#cbd5e1';
    iwctx.fillRect(8, 8, TILE - 16, TILE - 16);
    // Top wood trim
    iwctx.fillStyle = '#475569';
    iwctx.fillRect(0, 0, TILE, 3);
    iwctx.fillRect(0, TILE - 3, TILE, 3);

    // 6. Door mat (Welcome mat)
    const matCanvas = document.createElement('canvas');
    matCanvas.width = TILE;
    matCanvas.height = TILE;
    const mctx = matCanvas.getContext('2d');
    mctx.fillStyle = '#78350f';
    mctx.fillRect(0, 0, TILE, TILE);
    mctx.fillStyle = '#92400e';
    mctx.fillRect(4, 4, TILE - 8, TILE - 8);
    // Welcome text line
    mctx.fillStyle = '#fef3c7';
    mctx.font = 'bold 9px monospace';
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    mctx.fillText('WELCOME', TILE / 2, TILE / 2);

    // 7. Grass tile variants
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

    // 8. Dirt / stone path tile
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
    // Subtle flagstone pavers
    for (let i = 0; i < 4; i++) {
      const px = 4 + (i % 2) * 22;
      const py = 4 + Math.floor(i / 2) * 22;
      dctx.fillStyle = 'rgba(120, 113, 108, 0.25)';
      dctx.fillRect(px, py, 18, 18);
      dctx.strokeStyle = 'rgba(68, 64, 60, 0.3)';
      dctx.lineWidth = 1;
      dctx.strokeRect(px + 0.5, py + 0.5, 17, 17);
    }

    return {
      floor: floorCanvas,
      bathFloor: bathFloorCanvas,
      wall: wallCanvas,
      window: windowCanvas,
      intWall: intWallCanvas,
      mat: matCanvas,
      grass: grassTiles,
      dirt: dirtCanvas
    };
  }

  /* ==========================================================================
     Furniture Shape Renderers
     ========================================================================== */
  function drawBathtub(ctx, box, colors) {
    // Outer porcelain rim
    ctx.fillStyle = colors.rim || '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8, 12);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tub inner basin
    ctx.fillStyle = colors.tub || '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(box.left + 8, box.top + 8, box.width - 16, box.height - 16, 8);
    ctx.fill();

    // Water level
    ctx.fillStyle = colors.water || '#67e8f9';
    ctx.beginPath();
    ctx.roundRect(box.left + 12, box.top + 12, box.width - 24, box.height - 24, 6);
    ctx.fill();

    // Chrome faucet / shower head
    ctx.fillStyle = colors.faucet || '#e2e8f0';
    ctx.beginPath();
    ctx.arc(box.left + box.width - 18, box.top + box.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.fillRect(box.left + box.width - 14, box.top + box.height / 2 - 2, 6, 4);
  }

  function drawBathVanity(ctx, box, colors) {
    // Cabinet base
    ctx.fillStyle = colors.counter || '#f1f5f9';
    ctx.fillRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);

    // Oval porcelain sink
    ctx.fillStyle = colors.basin || '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(box.left + box.width / 2, box.top + box.height / 2, box.width / 2 - 12, box.height / 2 - 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Chrome faucet
    ctx.fillStyle = colors.faucet || '#cbd5e1';
    ctx.fillRect(box.left + box.width / 2 - 3, box.top + 8, 6, 8);
  }

  function drawToilet(ctx, box, colors) {
    // Tank against wall
    ctx.fillStyle = colors.tank || '#f8fafc';
    ctx.fillRect(box.left + 8, box.top + 4, box.width - 16, 12);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(box.left + 8, box.top + 4, box.width - 16, 12);

    // Oval toilet bowl
    ctx.fillStyle = colors.porcelain || '#ffffff';
    ctx.beginPath();
    ctx.ellipse(box.left + box.width / 2, box.top + 28, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Seat
    ctx.fillStyle = colors.seat || '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(box.left + box.width / 2, box.top + 28, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBathMat(ctx, box, colors) {
    ctx.fillStyle = colors.base || '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(box.left + 6, box.top + 8, box.width - 12, box.height - 16, 6);
    ctx.fill();
    ctx.strokeStyle = colors.stripe || '#bae6fd';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.left + 10, box.top + 12, box.width - 20, box.height - 24);
  }

  function drawCouch(ctx, box, colors) {
    // Base shadow / bottom
    ctx.fillStyle = colors.trim || '#334155';
    ctx.beginPath();
    ctx.roundRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8, 8);
    ctx.fill();

    // Main cushions
    ctx.fillStyle = colors.base || '#475569';
    ctx.beginPath();
    ctx.roundRect(box.left + 8, box.top + 8, box.width - 16, box.height - 16, 6);
    ctx.fill();

    // Cushions dividers
    const segs = 3;
    const segW = (box.width - 16) / segs;
    ctx.strokeStyle = colors.accent || '#64748b';
    ctx.lineWidth = 2;
    for (let i = 1; i < segs; i++) {
      ctx.beginPath();
      ctx.moveTo(box.left + 8 + i * segW, box.top + 8);
      ctx.lineTo(box.left + 8 + i * segW, box.top + box.height - 8);
      ctx.stroke();
    }
  }

  function drawArmchair(ctx, box, colors) {
    ctx.fillStyle = colors.trim || '#713f12';
    ctx.beginPath();
    ctx.roundRect(box.left + 6, box.top + 6, box.width - 12, box.height - 12, 6);
    ctx.fill();

    ctx.fillStyle = colors.base || '#854d0e';
    ctx.beginPath();
    ctx.roundRect(box.left + 10, box.top + 10, box.width - 20, box.height - 20, 4);
    ctx.fill();
  }

  function drawCoffeeTable(ctx, box, colors) {
    ctx.fillStyle = colors.trim || '#713f12';
    ctx.beginPath();
    ctx.roundRect(box.left + 6, box.top + 8, box.width - 12, box.height - 16, 6);
    ctx.fill();

    ctx.fillStyle = colors.accent || '#ca8a04';
    ctx.beginPath();
    ctx.roundRect(box.left + 9, box.top + 11, box.width - 18, box.height - 22, 4);
    ctx.fill();
  }

  function drawRetroTv(ctx, box, colors) {
    // Wooden console
    ctx.fillStyle = colors.wood || '#573318';
    ctx.fillRect(box.left + 6, box.top + 6, box.width - 12, box.height - 12);
    ctx.strokeStyle = '#291708';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.left + 6, box.top + 6, box.width - 12, box.height - 12);

    // CRT Screen with glow
    ctx.fillStyle = colors.screen || '#1e293b';
    ctx.beginPath();
    ctx.roundRect(box.left + 10, box.top + 10, box.width - 34, box.height - 20, 6);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(box.left + box.width / 2 - 4, box.top + 6);
    ctx.lineTo(box.left + box.width / 2 - 14, box.top - 6);
    ctx.moveTo(box.left + box.width / 2 + 4, box.top + 6);
    ctx.lineTo(box.left + box.width / 2 + 14, box.top - 6);
    ctx.stroke();

    // Dials
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(box.left + box.width - 16, box.top + 18, 4, 0, Math.PI * 2);
    ctx.arc(box.left + box.width - 16, box.top + 28, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBookshelf(ctx, box, colors) {
    ctx.fillStyle = colors.frame || '#78350f';
    ctx.fillRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);

    // Shelf dividers & colorful book spines
    const bookColors = colors.books || ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
    const count = 8;
    const bW = (box.width - 16) / count;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = bookColors[i % bookColors.length];
      ctx.fillRect(box.left + 8 + i * bW, box.top + 8, bW - 2, box.height - 16);
    }
  }

  function drawFloorLamp(ctx, box, colors) {
    // Base
    ctx.fillStyle = colors.pole || '#e2e8f0';
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, box.top + box.height - 12, 8, 0, Math.PI * 2);
    ctx.fill();

    // Pole
    ctx.strokeStyle = colors.pole || '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(box.left + box.width / 2, box.top + box.height - 12);
    ctx.lineTo(box.left + box.width / 2, box.top + 14);
    ctx.stroke();

    // Lamp shade & light halo
    ctx.fillStyle = colors.glow || 'rgba(254, 240, 138, 0.4)';
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, box.top + 12, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.shade || '#fef08a';
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, box.top + 12, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlant(ctx, box, colors) {
    // Terracotta pot
    ctx.fillStyle = colors.pot || '#ea580c';
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, box.top + box.height / 2 + 4, 12, 0, Math.PI * 2);
    ctx.fill();

    // Green foliage
    ctx.fillStyle = colors.leaves || '#15803d';
    for (let a = 0; a < 6; a++) {
      const angle = (a * Math.PI) / 3;
      const lx = box.left + box.width / 2 + Math.cos(angle) * 10;
      const ly = box.top + box.height / 2 + Math.sin(angle) * 10;
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = colors.highlight || '#22c55e';
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, box.top + box.height / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStove(ctx, box, colors) {
    ctx.fillStyle = colors.body || '#334155';
    ctx.fillRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);

    // 4 Cooking burner coils
    ctx.fillStyle = colors.burners || '#0f172a';
    const offsets = [
      [12, 12],
      [box.width - 14, 12],
      [12, box.height - 14],
      [box.width - 14, box.height - 14]
    ];
    for (const [ox, oy] of offsets) {
      ctx.beginPath();
      ctx.arc(box.left + ox, box.top + oy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.glow || '#f97316';
      ctx.beginPath();
      ctx.arc(box.left + ox, box.top + oy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.burners || '#0f172a';
    }
  }

  function drawRefrigerator(ctx, box, colors) {
    ctx.fillStyle = colors.body || '#e2e8f0';
    ctx.fillRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);

    // Vertical french door split
    ctx.beginPath();
    ctx.moveTo(box.left + box.width / 2, box.top + 4);
    ctx.lineTo(box.left + box.width / 2, box.top + box.height - 4);
    ctx.stroke();

    // Handles
    ctx.fillStyle = colors.handles || '#94a3b8';
    ctx.fillRect(box.left + box.width / 2 - 3, box.top + box.height / 2 - 6, 2, 12);
    ctx.fillRect(box.left + box.width / 2 + 1, box.top + box.height / 2 - 6, 2, 12);
  }

  function drawCounter(ctx, box, colors) {
    ctx.fillStyle = colors.body || '#475569';
    ctx.fillRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);

    // Counter marble surface
    ctx.fillStyle = colors.top || '#f1f5f9';
    ctx.fillRect(box.left + 6, box.top + 6, box.width - 12, box.height - 12);

    // Sink basin in right half
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(box.left + box.width / 2 + 4, box.top + 10, box.width / 2 - 12, box.height - 20, 4);
    ctx.fill();
  }

  function drawDiningTable(ctx, box, colors) {
    // Rich wood dining table top
    ctx.fillStyle = colors.top || '#b45309';
    ctx.beginPath();
    ctx.roundRect(box.left + 6, box.top + 6, box.width - 12, box.height - 12, 10);
    ctx.fill();
    ctx.strokeStyle = colors.edge || '#92400e';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Elegant centerpiece / tablecloth
    ctx.fillStyle = colors.cloth || '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(box.left + 18, box.top + 18, box.width - 36, box.height - 36, 6);
    ctx.fill();
  }

  function drawChair(ctx, box, colors) {
    ctx.fillStyle = colors.wood || '#b45309';
    ctx.beginPath();
    ctx.roundRect(box.left + 8, box.top + 8, box.width - 16, box.height - 16, 4);
    ctx.fill();

    ctx.fillStyle = colors.cushion || '#dc2626';
    ctx.beginPath();
    ctx.roundRect(box.left + 12, box.top + 12, box.width - 24, box.height - 24, 3);
    ctx.fill();
  }

  function drawBed(ctx, box, colors) {
    // Bed frame
    ctx.fillStyle = colors.frame || '#451a03';
    ctx.beginPath();
    ctx.roundRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8, 8);
    ctx.fill();

    // Sheet / blanket
    ctx.fillStyle = colors.blanket || '#4338ca';
    ctx.fillRect(box.left + 8, box.top + 22, box.width - 16, box.height - 28);

    // Pillows
    ctx.fillStyle = colors.pillow || '#f8fafc';
    const pW = (box.width - 24) / 2;
    ctx.beginPath();
    ctx.roundRect(box.left + 10, box.top + 8, pW, 12, 4);
    ctx.roundRect(box.left + 14 + pW, box.top + 8, pW, 12, 4);
    ctx.fill();
  }

  function drawNightstand(ctx, box, colors) {
    ctx.fillStyle = colors.wood || '#78350f';
    ctx.fillRect(box.left + 6, box.top + 6, box.width - 12, box.height - 12);

    // Small lamp on nightstand
    ctx.fillStyle = colors.shade || '#fef08a';
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, box.top + box.height / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWardrobe(ctx, box, colors) {
    ctx.fillStyle = colors.body || '#78350f';
    ctx.fillRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8);

    // Doors
    ctx.fillStyle = colors.doors || '#92400e';
    const halfW = (box.width - 12) / 2;
    ctx.fillRect(box.left + 6, box.top + 6, halfW, box.height - 12);
    ctx.fillRect(box.left + 6 + halfW, box.top + 6, halfW, box.height - 12);

    // Handles
    ctx.fillStyle = colors.handles || '#fbbf24';
    ctx.fillRect(box.left + 6 + halfW - 3, box.top + box.height / 2 - 4, 2, 8);
    ctx.fillRect(box.left + 6 + halfW + 1, box.top + box.height / 2 - 4, 2, 8);
  }

  function drawRug(ctx, box, colors) {
    ctx.fillStyle = colors.base || '#991b1b';
    ctx.beginPath();
    ctx.roundRect(box.left + 4, box.top + 4, box.width - 8, box.height - 8, 12);
    ctx.fill();

    ctx.strokeStyle = colors.border || '#d97706';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = colors.center || '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(box.left + 14, box.top + 14, box.width - 28, box.height - 28, 8);
    ctx.fill();
  }

  const SHAPE_HANDLERS = {
    bathtub: drawBathtub,
    'bath-vanity': drawBathVanity,
    toilet: drawToilet,
    'bath-mat': drawBathMat,
    couch: drawCouch,
    armchair: drawArmchair,
    'coffee-table': drawCoffeeTable,
    'retro-tv': drawRetroTv,
    bookshelf: drawBookshelf,
    'floor-lamp': drawFloorLamp,
    plant: drawPlant,
    stove: drawStove,
    refrigerator: drawRefrigerator,
    counter: drawCounter,
    'dining-table': drawDiningTable,
    chair: drawChair,
    bed: drawBed,
    nightstand: drawNightstand,
    wardrobe: drawWardrobe,
    rug: drawRug
  };

  /* ==========================================================================
     House Engine Class
     ========================================================================== */
  class HouseEngine {
    constructor(canvas, data) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.data = data;
      this.textures = buildTextures();

      this.width = canvas.width;
      this.height = canvas.height;
      this.gameTime = 0;

      // Player Entity
      const spawnX = (data.config.spawn.x + 0.5) * TILE;
      const spawnY = (data.config.spawn.y + 0.5) * TILE;

      this.player = {
        x: spawnX,
        y: spawnY,
        radius: 18,
        speed: 185,
        facing: 'down',
        name: 'Learner Kim',
        moving: false,
        walkT: 0,
        img: null,
        frameImages: {}
      };

      // VoxelBot Companion
      this.bot = {
        x: spawnX - 28,
        y: spawnY + 6,
        radius: 14,
        speed: 170,
        targetX: spawnX - 28,
        targetY: spawnY + 6,
        facing: 'right',
        name: 'SparkyBot',
        moving: false,
        rollT: 0,
        img: null,
        frameImages: {}
      };

      this.camera = {
        x: this.player.x,
        y: this.player.y
      };

      this.solidBoxes = [];
      this.furniture = [];
      this.rugs = [];
      this.scenery = [];
      this.grid = [];

      this.initWorld();
    }

    initWorld() {
      const cfg = this.data.config;
      const hx = cfg.house.x;
      const hy = cfg.house.y;
      const maxX = hx + cfg.house.width - 1;
      const maxY = hy + cfg.house.height - 1;

      // 1. Build 64x64 terrain grid
      this.grid = [];
      for (let y = 0; y < WORLD_SIZE; y++) {
        const row = [];
        for (let x = 0; x < WORLD_SIZE; x++) {
          row.push('grass');
        }
        this.grid.push(row);
      }

      // 2. House room footprint
      for (let y = hy; y <= maxY; y++) {
        for (let x = hx; x <= maxX; x++) {
          const onPerimeter = x === hx || x === maxX || y === hy || y === maxY;
          this.grid[y][x] = onPerimeter ? 'home-wall' : 'home-floor';
        }
      }

      // 3. Mark 8 Wall Windows
      for (const win of cfg.windows) {
        if (win.x >= 0 && win.x < WORLD_SIZE && win.y >= 0 && win.y < WORLD_SIZE) {
          this.grid[win.y][win.x] = 'home-wall-window';
        }
      }

      // 4. Mark Bathroom Partition Walls & Doorway
      const bcfg = cfg.bathroom;
      for (const w of bcfg.walls) {
        this.grid[w.y][w.x] = 'home-wall-interior';
      }
      // Bathroom custom tile floor inside its inner bounds
      for (let y = bcfg.bounds.y1 + 1; y <= bcfg.bounds.y2 - 1; y++) {
        for (let x = bcfg.bounds.x1 + 1; x <= bcfg.bounds.x2 - 1; x++) {
          this.grid[y][x] = 'bath-floor';
        }
      }

      // 5. Doorways: Front Door (32, 38) and Back Door (32, 22)
      this.grid[cfg.frontDoor.y][cfg.frontDoor.x] = 'home-door-front';
      this.grid[cfg.backDoor.y][cfg.backDoor.x] = 'home-door-back';

      // 6. Yard stone / dirt paths leading out from doors
      // South path from front door into front yard
      for (let y = cfg.frontDoor.y + 1; y <= Math.min(WORLD_SIZE - 1, cfg.frontDoor.y + 10); y++) {
        for (let x = cfg.frontDoor.x - 1; x <= cfg.frontDoor.x + 1; x++) {
          if (this.grid[y] && this.grid[y][x] === 'grass') {
            this.grid[y][x] = 'dirt';
          }
        }
      }
      // North path from back door into backyard
      for (let y = Math.max(0, cfg.backDoor.y - 10); y < cfg.backDoor.y; y++) {
        for (let x = cfg.backDoor.x - 1; x <= cfg.backDoor.x + 1; x++) {
          if (this.grid[y] && this.grid[y][x] === 'grass') {
            this.grid[y][x] = 'dirt';
          }
        }
      }

      // 7. Collision Boxes for Outer Walls (excluding doorways)
      this.solidBoxes = [];
      for (let y = hy; y <= maxY; y++) {
        for (let x = hx; x <= maxX; x++) {
          const isPerimeter = x === hx || x === maxX || y === hy || y === maxY;
          const isFrontDoor = x === cfg.frontDoor.x && y === cfg.frontDoor.y;
          const isBackDoor = x === cfg.backDoor.x && y === cfg.backDoor.y;
          if (isPerimeter && !isFrontDoor && !isBackDoor) {
            this.solidBoxes.push({
              left: x * TILE,
              right: (x + 1) * TILE,
              top: y * TILE,
              bottom: (y + 1) * TILE,
              type: 'wall'
            });
          }
        }
      }

      // 8. Collision Boxes for Bathroom Interior Partition Walls
      for (const w of bcfg.walls) {
        this.solidBoxes.push({
          left: w.x * TILE,
          right: (w.x + 1) * TILE,
          top: w.y * TILE,
          bottom: (w.y + 1) * TILE,
          type: 'partition'
        });
      }

      // 9. World outer perimeter collision (bounds 0..WORLD_SIZE)
      this.solidBoxes.push({ left: -200, right: 0, top: -200, bottom: WORLD_SIZE * TILE + 200 });
      this.solidBoxes.push({ left: WORLD_SIZE * TILE, right: WORLD_SIZE * TILE + 200, top: -200, bottom: WORLD_SIZE * TILE + 200 });
      this.solidBoxes.push({ left: -200, right: WORLD_SIZE * TILE + 200, top: -200, bottom: 0 });
      this.solidBoxes.push({ left: -200, right: WORLD_SIZE * TILE + 200, top: WORLD_SIZE * TILE, bottom: WORLD_SIZE * TILE + 200 });

      // 10. Load Furniture and Rugs from Layout
      this.furniture = [];
      this.rugs = [];
      for (const entry of this.data.layout) {
        const itemDef = this.data.items[entry.itemId];
        if (!itemDef) continue;

        const w = (itemDef.size ? itemDef.size.w : 1) * TILE;
        const h = (itemDef.size ? itemDef.size.h : 1) * TILE;
        const box = {
          left: entry.x * TILE,
          top: entry.y * TILE,
          right: entry.x * TILE + w,
          bottom: entry.y * TILE + h,
          width: w,
          height: h
        };

        const record = {
          id: entry.itemId,
          label: itemDef.label,
          shape: itemDef.shape,
          zone: itemDef.zone,
          colors: itemDef.colors,
          bounds: box,
          pad: {
            left: box.left + 2,
            top: box.top + 2,
            right: box.right - 2,
            bottom: box.bottom - 2,
            width: w - 4,
            height: h - 4
          }
        };

        if (itemDef.shape === 'rug' || itemDef.shape === 'bath-mat') {
          this.rugs.push(record);
        } else {
          this.furniture.push(record);
          if (itemDef.solid) {
            // Collision box with small padding so player can walk cleanly around
            this.solidBoxes.push({
              left: box.left + 3,
              right: box.right - 3,
              top: box.top + 4,
              bottom: box.bottom - 3,
              type: 'furniture'
            });
          }
        }
      }

      // 11. Yard Scenery (Trees, bushes, flowers scattered outside the house)
      this.initYardScenery();
    }

    initYardScenery() {
      this.scenery = [];
      const hx = this.data.config.house.x;
      const hy = this.data.config.house.y;
      const maxX = hx + this.data.config.house.width - 1;
      const maxY = hy + this.data.config.house.height - 1;

      const rand = mulberry32(888123);
      for (let i = 0; i < 45; i++) {
        const tx = Math.floor(rand() * 58) + 3;
        const ty = Math.floor(rand() * 58) + 3;

        // Skip inside or right against the house or paths
        if (tx >= hx - 2 && tx <= maxX + 2 && ty >= hy - 2 && ty <= maxY + 2) continue;
        if (Math.abs(tx - 32) <= 2) continue; // Keep central paths clear

        const roll = rand();
        let type = 'tree';
        if (roll < 0.45) type = 'tree';
        else if (roll < 0.75) type = 'bush';
        else type = 'flower';

        this.scenery.push({
          x: tx,
          y: ty,
          type: type,
          variant: Math.floor(rand() * 3)
        });

        // Add tree collisions
        if (type === 'tree') {
          this.solidBoxes.push({
            left: tx * TILE + 12,
            right: (tx + 1) * TILE - 12,
            top: ty * TILE + 20,
            bottom: (ty + 1) * TILE,
            type: 'tree'
          });
        }
      }
    }

    // Avatar textures setup
    setPlayerImages(imgs) {
      this.player.frameImages = imgs;
      this.player.img = imgs.default || imgs;
    }

    setBotImages(imgs) {
      this.bot.frameImages = imgs;
      this.bot.img = imgs.default || imgs;
    }

    // Determine which room zone an entity is in
    getZoneAt(x, y) {
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);

      for (const z of this.data.config.zones) {
        if (tx >= z.bounds.minX && tx <= z.bounds.maxX && ty >= z.bounds.minY && ty <= z.bounds.maxY) {
          return z;
        }
      }

      // Check if inside house main footprint
      const h = this.data.config.house;
      if (tx >= h.x && tx <= h.x + h.width - 1 && ty >= h.y && ty <= h.y + h.height - 1) {
        return { id: 'interior', name: 'Main Hall', icon: '🏠', color: '#6366f1' };
      }
      return { id: 'yard', name: 'Yard Grounds', icon: '🌿', color: '#10b981' };
    }

    /* ==========================================================================
       Collision Detection
       ========================================================================== */
    checkCircleBoxCollision(cx, cy, r, box) {
      const closestX = Math.max(box.left, Math.min(cx, box.right));
      const closestY = Math.max(box.top, Math.min(cy, box.bottom));
      const dx = cx - closestX;
      const dy = cy - closestY;
      return dx * dx + dy * dy < r * r;
    }

    moveWithCollision(entity, vx, vy, dt) {
      const stepX = vx * dt;
      const stepY = vy * dt;
      const r = entity.radius;

      // Move X
      let nextX = entity.x + stepX;
      for (const box of this.solidBoxes) {
        if (this.checkCircleBoxCollision(nextX, entity.y, r, box)) {
          if (stepX > 0) nextX = box.left - r - 0.1;
          else if (stepX < 0) nextX = box.right + r + 0.1;
        }
      }
      entity.x = nextX;

      // Move Y
      let nextY = entity.y + stepY;
      for (const box of this.solidBoxes) {
        if (this.checkCircleBoxCollision(entity.x, nextY, r, box)) {
          if (stepY > 0) nextY = box.top - r - 0.1;
          else if (stepY < 0) nextY = box.bottom + r + 0.1;
        }
      }
      entity.y = nextY;
    }

    /* ==========================================================================
       Update Loop
       ========================================================================== */
    update(dt, input) {
      this.gameTime += dt;

      // 1. Process player input
      let vx = 0;
      let vy = 0;
      if (input.left) vx -= 1;
      if (input.right) vx += 1;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;

      const len = Math.hypot(vx, vy);
      if (len > 0) {
        vx = (vx / len) * this.player.speed;
        vy = (vy / len) * this.player.speed;
        this.player.moving = true;
        this.player.walkT += dt * 10;

        if (Math.abs(vx) > Math.abs(vy)) {
          this.player.facing = vx > 0 ? 'right' : 'left';
        } else {
          this.player.facing = vy > 0 ? 'down' : 'up';
        }
      } else {
        this.player.moving = false;
        this.player.walkT = 0;
      }

      this.moveWithCollision(this.player, vx, vy, dt);

      // 2. Companion Bot Follow Logic
      const distToPlayer = Math.hypot(this.player.x - this.bot.x, this.player.y - this.bot.y);
      const followMinDist = 38;
      const followMaxDist = 65;

      if (distToPlayer > followMaxDist) {
        const angle = Math.atan2(this.player.y - this.bot.y, this.player.x - this.bot.x);
        this.bot.targetX = this.player.x - Math.cos(angle) * followMinDist;
        this.bot.targetY = this.player.y - Math.sin(angle) * followMinDist;
      }

      const bdx = this.bot.targetX - this.bot.x;
      const bdy = this.bot.targetY - this.bot.y;
      const bDist = Math.hypot(bdx, bdy);

      if (bDist > 4) {
        const bSpeed = Math.min(this.bot.speed, bDist * 5);
        const bvx = (bdx / bDist) * bSpeed;
        const bvy = (bdy / bDist) * bSpeed;
        this.moveWithCollision(this.bot, bvx, bvy, dt);
        this.bot.moving = true;
        this.bot.rollT += dt * 8;
        this.bot.facing = bdx > 0 ? 'right' : 'left';
      } else {
        this.bot.moving = false;
        this.bot.rollT = 0;
      }

      // 3. Smooth Camera Follow
      const targetCamX = this.player.x;
      const targetCamY = this.player.y;
      const camLerp = 0.08;
      this.camera.x += (targetCamX - this.camera.x) * camLerp;
      this.camera.y += (targetCamY - this.camera.y) * camLerp;

      // Clamp camera within world bounds
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      this.camera.x = Math.max(halfW, Math.min(WORLD_SIZE * TILE - halfW, this.camera.x));
      this.camera.y = Math.max(halfH, Math.min(WORLD_SIZE * TILE - halfH, this.camera.y));
    }

    /* ==========================================================================
       Rendering Pipeline
       ========================================================================== */
    drawYardItem(ctx, scen) {
      const px = scen.x * TILE;
      const py = scen.y * TILE;

      if (scen.type === 'tree') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.beginPath();
        ctx.ellipse(px + 24, py + 42, 18, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 18, py + 22, 12, 22);

        // Foliage layers
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(px + 24, py + 14, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(px + 20, py + 10, 16, 0, Math.PI * 2);
        ctx.fill();
      } else if (scen.type === 'bush') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.beginPath();
        ctx.ellipse(px + 24, py + 34, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(px + 24, py + 24, 14, 0, Math.PI * 2);
        ctx.fill();
      } else if (scen.type === 'flower') {
        // Stem
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px + 23, py + 24, 2, 8);
        // Petals
        ctx.fillStyle = scen.variant === 0 ? '#ec4899' : scen.variant === 1 ? '#eab308' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(px + 24, py + 22, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    renderPlayer(ctx) {
      const p = this.player;
      const bounce = p.moving ? Math.sin(p.walkT) * 4 : 0;
      const lean = p.moving ? (p.facing === 'left' ? -0.06 : 0.06) : 0;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + p.radius - 2, p.radius, p.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Sprite
      const img = p.frameImages.default || p.img;
      const sz = 58;

      ctx.save();
      ctx.translate(p.x, p.y - p.radius + bounce);
      ctx.rotate(lean);

      if (img && img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      } else {
        // Fallback procedural circle if SVG hasn't finished loading
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Name tag badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(p.x - 38, p.y - p.radius - 38 + bounce, 76, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, p.x, p.y - p.radius - 29 + bounce);
    }

    renderBot(ctx) {
      const b = this.bot;
      const hover = Math.sin(this.gameTime * 4) * 3;
      const roll = b.moving ? Math.sin(b.rollT) * 0.1 : 0;

      // Bot shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + b.radius, b.radius * 0.9, b.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      const img = b.frameImages.default || b.img;
      const sz = 46;

      ctx.save();
      ctx.translate(b.x, b.y - b.radius + hover);
      ctx.rotate(roll);

      if (img && img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      } else {
        // Fallback bot rendering
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Bot label badge
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.beginPath();
      ctx.roundRect(b.x - 34, b.y - b.radius - 30 + hover, 68, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.name, b.x, b.y - b.radius - 22 + hover);
    }

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Camera Transform
      const camX = Math.round(w / 2 - this.camera.x);
      const camY = Math.round(h / 2 - this.camera.y);
      ctx.save();
      ctx.translate(camX, camY);

      // Camera view tile bounds culling
      const minTileX = Math.max(0, Math.floor((this.camera.x - w / 2) / TILE) - 1);
      const maxTileX = Math.min(WORLD_SIZE - 1, Math.ceil((this.camera.x + w / 2) / TILE) + 1);
      const minTileY = Math.max(0, Math.floor((this.camera.y - h / 2) / TILE) - 1);
      const maxTileY = Math.min(WORLD_SIZE - 1, Math.ceil((this.camera.y + h / 2) / TILE) + 1);

      // 1. Draw Ground / Floor / Wall Tiles
      for (let y = minTileY; y <= maxTileY; y++) {
        for (let x = minTileX; x <= maxTileX; x++) {
          const tile = this.grid[y][x];
          const px = x * TILE;
          const py = y * TILE;

          if (tile === 'grass') {
            const v = (x * 7 + y * 13) % 3;
            ctx.drawImage(this.textures.grass[v], px, py);
          } else if (tile === 'dirt') {
            ctx.drawImage(this.textures.dirt, px, py);
          } else if (tile === 'home-wall') {
            ctx.drawImage(this.textures.wall, px, py);
          } else if (tile === 'home-wall-window') {
            ctx.drawImage(this.textures.window, px, py);
          } else if (tile === 'home-wall-interior') {
            ctx.drawImage(this.textures.intWall, px, py);
          } else if (tile === 'home-floor') {
            ctx.drawImage(this.textures.floor, px, py);
          } else if (tile === 'bath-floor') {
            ctx.drawImage(this.textures.bathFloor, px, py);
          } else if (tile === 'home-door-front') {
            // Front door welcome mat
            ctx.drawImage(this.textures.mat, px, py);
          } else if (tile === 'home-door-back') {
            // Back door stone threshold
            ctx.drawImage(this.textures.dirt, px, py);
          }
        }
      }

      // 2. Draw Floor Rugs
      for (const rug of this.rugs) {
        const handler = SHAPE_HANDLERS[rug.shape];
        if (handler) {
          handler(ctx, rug.bounds, rug.colors);
        }
      }

      // 3. Depth Sorting: Furniture, Scenery, Player, Companion Bot
      const drawList = [];

      for (const f of this.furniture) {
        drawList.push({
          type: 'furniture',
          y: f.bounds.bottom,
          record: f
        });
      }

      for (const s of this.scenery) {
        if (s.x >= minTileX - 2 && s.x <= maxTileX + 2 && s.y >= minTileY - 2 && s.y <= maxTileY + 2) {
          drawList.push({
            type: 'scenery',
            y: (s.y + 1) * TILE,
            record: s
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

      drawList.sort((a, b) => a.y - b.y);

      // 4. Render sorted entities
      for (const item of drawList) {
        if (item.type === 'furniture') {
          const handler = SHAPE_HANDLERS[item.record.shape];
          if (handler) {
            handler(ctx, item.record.bounds, item.record.colors);
          }
        } else if (item.type === 'scenery') {
          this.drawYardItem(ctx, item.record);
        } else if (item.type === 'player') {
          this.renderPlayer(ctx);
        } else if (item.type === 'bot') {
          this.renderBot(ctx);
        }
      }

      ctx.restore();
    }
  }

  window.HouseEngine = HouseEngine;
})();
