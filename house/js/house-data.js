/**
 * house-data.js - Standalone House Layout & Architecture Data
 * 
 * 17x17 House Blueprint (walls on perimeter, 15x15 interior):
 * - House bounding box: x: 24..40, y: 22..38 (width: 17, height: 17)
 * - Front Door: (32, 38) [Center of South wall]
 * - Back Door: (32, 22) [Center of North wall]
 * - 8 Windows (2 per outer wall):
 *     * North wall: (27, 22), (37, 22)
 *     * South wall: (27, 38), (37, 38)
 *     * West wall:  (24, 26), (24, 34)
 *     * East wall:  (40, 26), (40, 34)
 * - 4-Zone House Architecture:
 *     1. Top-Left: Private Bathroom (enclosed with interior partition walls & doorway)
 *     2. Bottom-Left: Cozy Living Room
 *     3. Bottom-Right: Kitchen & Dining
 *     4. Top-Right: Bedroom Sanctuary
 */

(function () {
  'use strict';

  const HOUSE_CONFIG = {
    // 64x64 grassy world lot
    worldSize: 64,

    // 17x17 footprint positioned centrally
    house: {
      x: 24,
      y: 22,
      width: 17,
      height: 17
    },

    // Front & Back Doors (2 tiles wide each for smooth, effortless passage)
    frontDoor: { x: 31, y: 38, width: 2 },
    backDoor: { x: 31, y: 22, width: 2 },

    // Player spawn (inside the home near the front door)
    spawn: { x: 32, y: 36 },

    // 8 Wall Windows
    windows: [
      { x: 27, y: 22, wall: 'north' },
      { x: 37, y: 22, wall: 'north' },
      { x: 27, y: 38, wall: 'south' },
      { x: 37, y: 38, wall: 'south' },
      { x: 24, y: 26, wall: 'west' },
      { x: 24, y: 34, wall: 'west' },
      { x: 40, y: 26, wall: 'east' },
      { x: 40, y: 34, wall: 'east' }
    ],

    // Bathroom Enclosure: Top-left private room
    // Bounds: x: 24 to 29 (inner x: 25 to 28), y: 22 to 27 (inner y: 23 to 26)
    // Partition walls on the east side (x: 29, y: 23..27) and south side (y: 27, x: 25..29)
    // Doorway opening at (29, 24..25) on the east partition wall (2 tiles high for easy access)
    bathroom: {
      bounds: { x1: 24, y1: 22, x2: 29, y2: 27 },
      // Interior partition wall segments (leaving y: 24 and y: 25 open as a wide doorway)
      walls: [
        // East partition wall
        { x: 29, y: 23 },
        // (29, 24) and (29, 25) are doorway opening
        { x: 29, y: 26 },
        { x: 29, y: 27 },
        // South partition wall
        { x: 25, y: 27 },
        { x: 26, y: 27 },
        { x: 27, y: 27 },
        { x: 28, y: 27 }
      ],
      doorway: { x: 29, y: 25 }
    },

    // Room zone bounds for HUD and floor indicators
    zones: [
      {
        id: 'bathroom',
        name: 'Bathroom',
        icon: '🛁',
        bounds: { minX: 25, maxX: 28, minY: 23, maxY: 26 },
        color: '#38bdf8'
      },
      {
        id: 'living',
        name: 'Living Room',
        icon: '🛋️',
        bounds: { minX: 25, maxX: 31, minY: 29, maxY: 37 },
        color: '#f59e0b'
      },
      {
        id: 'kitchen',
        name: 'Kitchen & Dining',
        icon: '🍳',
        bounds: { minX: 33, maxX: 39, minY: 29, maxY: 37 },
        color: '#10b981'
      },
      {
        id: 'bedroom',
        name: 'Bedroom Sanctuary',
        icon: '🛏️',
        bounds: { minX: 31, maxX: 39, minY: 23, maxY: 28 },
        color: '#a855f7'
      },
      {
        id: 'backyard',
        name: 'North Backyard',
        icon: '🌲',
        bounds: { minX: 0, maxX: 63, minY: 0, maxY: 21 },
        color: '#22c55e'
      },
      {
        id: 'frontyard',
        name: 'South Front Yard',
        icon: '🌻',
        bounds: { minX: 0, maxX: 63, minY: 39, maxY: 63 },
        color: '#22c55e'
      }
    ]
  };

  /**
   * Item definitions for house architecture
   */
  const ITEMS = {
    // --- Bathroom Fixtures ---
    'bathtub': {
      id: 'bathtub',
      label: 'Bathtub & Shower',
      zone: 'bathroom',
      icon: '🛁',
      size: { w: 2, h: 1 },
      solid: true,
      shape: 'bathtub',
      colors: {
        tub: '#f8fafc',
        rim: '#cbd5e1',
        water: '#67e8f9',
        faucet: '#e2e8f0',
        drain: '#94a3b8'
      }
    },
    'bath-vanity': {
      id: 'bath-vanity',
      label: 'Porcelain Vanity & Sink',
      zone: 'bathroom',
      icon: '🪞',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'bath-vanity',
      colors: {
        counter: '#f1f5f9',
        basin: '#e2e8f0',
        faucet: '#cbd5e1',
        mirror: '#38bdf8'
      }
    },
    'toilet': {
      id: 'toilet',
      label: 'Toilet',
      zone: 'bathroom',
      icon: '🚽',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'toilet',
      colors: {
        porcelain: '#ffffff',
        seat: '#e2e8f0',
        tank: '#f8fafc',
        handle: '#94a3b8'
      }
    },
    'bath-mat': {
      id: 'bath-mat',
      label: 'Plush Bath Mat',
      zone: 'bathroom',
      icon: '🧼',
      size: { w: 1, h: 1 },
      solid: false,
      shape: 'bath-mat',
      colors: {
        base: '#38bdf8',
        stripe: '#bae6fd'
      }
    },

    // --- Living Room ---
    'couch': {
      id: 'couch',
      label: 'Plush Sofa',
      zone: 'living',
      icon: '🛋️',
      size: { w: 3, h: 1 },
      solid: true,
      shape: 'couch',
      colors: {
        base: '#475569',
        accent: '#64748b',
        trim: '#334155'
      }
    },
    'armchair': {
      id: 'armchair',
      label: 'Lounge Armchair',
      zone: 'living',
      icon: '🪑',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'armchair',
      colors: {
        base: '#854d0e',
        accent: '#a16207',
        trim: '#713f12'
      }
    },
    'coffee-table': {
      id: 'coffee-table',
      label: 'Oak Coffee Table',
      zone: 'living',
      icon: '☕',
      size: { w: 2, h: 1 },
      solid: true,
      shape: 'coffee-table',
      colors: {
        base: '#a16207',
        accent: '#ca8a04',
        trim: '#713f12'
      }
    },
    'living-rug': {
      id: 'living-rug',
      label: 'Persian Area Rug',
      zone: 'living',
      icon: '🧶',
      size: { w: 4, h: 3 },
      solid: false,
      shape: 'rug',
      colors: {
        base: '#991b1b',
        border: '#d97706',
        center: '#fef3c7'
      }
    },
    'modern-tv': {
      id: 'modern-tv',
      label: 'Ultra-Slim Modern Smart TV (8x4)',
      zone: 'living',
      icon: '🖥️',
      size: { w: 8, h: 4 },
      solid: true,
      shape: 'modern-tv',
      colors: {
        bezel: '#0f172a',
        screen: '#020617',
        glow: '#38bdf8',
        stand: '#334155',
        led: '#22d3ee'
      }
    },
    'retro-tv': {
      id: 'retro-tv',
      label: 'Ultra-Slim Modern Smart TV',
      zone: 'living',
      icon: '📺',
      size: { w: 8, h: 4 },
      solid: true,
      shape: 'modern-tv',
      colors: {
        bezel: '#0f172a',
        screen: '#020617',
        glow: '#38bdf8',
        stand: '#334155',
        led: '#22d3ee'
      }
    },
    'living-bookshelf': {
      id: 'living-bookshelf',
      label: 'Hardwood Bookshelf',
      zone: 'living',
      icon: '📚',
      size: { w: 2, h: 1 },
      solid: true,
      shape: 'bookshelf',
      colors: {
        frame: '#78350f',
        shelf: '#92400e',
        books: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
      }
    },
    'floor-lamp': {
      id: 'floor-lamp',
      label: 'Arc Floor Lamp',
      zone: 'living',
      icon: '💡',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'floor-lamp',
      colors: {
        pole: '#e2e8f0',
        shade: '#fef08a',
        glow: 'rgba(254, 240, 138, 0.4)'
      }
    },
    'living-plant': {
      id: 'living-plant',
      label: 'Monstera Plant',
      zone: 'living',
      icon: '🪴',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'plant',
      colors: {
        pot: '#ea580c',
        leaves: '#15803d',
        highlight: '#22c55e'
      }
    },

    // --- Kitchen & Dining ---
    'stove': {
      id: 'stove',
      label: 'Stainless Cooking Stove',
      zone: 'kitchen',
      icon: '🍳',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'stove',
      colors: {
        body: '#334155',
        burners: '#0f172a',
        knobs: '#94a3b8',
        glow: '#f97316'
      }
    },
    'refrigerator': {
      id: 'refrigerator',
      label: 'French Door Refrigerator',
      zone: 'kitchen',
      icon: '🧊',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'refrigerator',
      colors: {
        body: '#e2e8f0',
        handles: '#94a3b8',
        shadow: '#cbd5e1'
      }
    },
    'kitchen-counter': {
      id: 'kitchen-counter',
      label: 'Prep Counter & Sink',
      zone: 'kitchen',
      icon: '🥣',
      size: { w: 2, h: 1 },
      solid: true,
      shape: 'counter',
      colors: {
        top: '#f1f5f9',
        body: '#475569',
        faucet: '#94a3b8'
      }
    },
    'dining-table': {
      id: 'dining-table',
      label: 'Birch Dining Table',
      zone: 'kitchen',
      icon: '🪑',
      size: { w: 2, h: 2 },
      solid: true,
      shape: 'dining-table',
      colors: {
        top: '#b45309',
        edge: '#92400e',
        cloth: '#fef3c7'
      }
    },
    'dining-chair': {
      id: 'dining-chair',
      label: 'Dining Chair',
      zone: 'kitchen',
      icon: '🪑',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'chair',
      colors: {
        wood: '#b45309',
        cushion: '#dc2626'
      }
    },

    // --- Bedroom Sanctuary ---
    'bed': {
      id: 'bed',
      label: 'King Canopy Bed',
      zone: 'bedroom',
      icon: '🛏️',
      size: { w: 2, h: 2 },
      solid: true,
      shape: 'bed',
      colors: {
        frame: '#451a03',
        blanket: '#4338ca',
        sheet: '#818cf8',
        pillow: '#f8fafc'
      }
    },
    'nightstand': {
      id: 'nightstand',
      label: 'Nightstand with Lamp',
      zone: 'bedroom',
      icon: '🏮',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'nightstand',
      colors: {
        wood: '#78350f',
        lamp: '#fde047',
        shade: '#fef08a'
      }
    },
    'wardrobe': {
      id: 'wardrobe',
      label: 'Cedar Wardrobe & Dresser',
      zone: 'bedroom',
      icon: '🚪',
      size: { w: 2, h: 1 },
      solid: true,
      shape: 'wardrobe',
      colors: {
        body: '#78350f',
        doors: '#92400e',
        handles: '#fbbf24'
      }
    },
    'bedroom-rug': {
      id: 'bedroom-rug',
      label: 'Soft Velvet Rug',
      zone: 'bedroom',
      icon: '🧶',
      size: { w: 3, h: 2 },
      solid: false,
      shape: 'rug',
      colors: {
        base: '#581c87',
        border: '#9333ea',
        center: '#d8b4fe'
      }
    },
    'bedroom-plant': {
      id: 'bedroom-plant',
      label: 'Bonsai Tree',
      zone: 'bedroom',
      icon: '🪴',
      size: { w: 1, h: 1 },
      solid: true,
      shape: 'plant',
      colors: {
        pot: '#78350f',
        leaves: '#166534',
        highlight: '#4ade80'
      }
    }
  };

  /**
   * Layout placement of furniture inside the 17x17 footprint
   * House bounds: x: 24..40, y: 22..38.
   * Interior: x: 25..39, y: 23..37.
   */
  const LAYOUT = [
    // === ZONE 1: Bathroom (Top-Left: x: 25..28, y: 23..26) ===
    // Bathtub along the north wall inside bathroom
    { itemId: 'bathtub', x: 25, y: 23 },
    // Toilet next to north wall
    { itemId: 'toilet', x: 28, y: 23 },
    // Vanity along west wall
    { itemId: 'bath-vanity', x: 25, y: 25 },
    // Bath mat in center of bathroom floor
    { itemId: 'bath-mat', x: 26, y: 25 },

    // === ZONE 2: Cozy Living Room (Bottom-Left: x: 25..31, y: 29..37) ===
    // Living room large rug
    { itemId: 'living-rug', x: 26, y: 33 },
    // Sofa facing north toward TV
    { itemId: 'couch', x: 26, y: 34 },
    // Coffee table in front of sofa
    { itemId: 'coffee-table', x: 26, y: 32 },
    // Armchair angled toward living room
    { itemId: 'armchair', x: 29, y: 33 },
    // Modern Flat-Screen TV spanning across living room north partition (8 tiles wide)
    { itemId: 'modern-tv', x: 24, y: 28 },
    // Bookshelf along west wall
    { itemId: 'living-bookshelf', x: 25, y: 36 },
    // Floor lamp in the corner
    { itemId: 'floor-lamp', x: 30, y: 35 },
    // Plant in corner
    { itemId: 'living-plant', x: 25, y: 32 },

    // === ZONE 3: Kitchen & Dining (Bottom-Right: x: 33..39, y: 29..37) ===
    // Refrigerator in corner
    { itemId: 'refrigerator', x: 39, y: 29 },
    // Cooking stove next to fridge
    { itemId: 'stove', x: 38, y: 29 },
    // Counter with sink
    { itemId: 'kitchen-counter', x: 35, y: 29 },
    // Dining table (2x2)
    { itemId: 'dining-table', x: 35, y: 33 },
    // Dining chairs around the table
    { itemId: 'dining-chair', x: 34, y: 33 },
    { itemId: 'dining-chair', x: 37, y: 33 },
    { itemId: 'dining-chair', x: 35, y: 35 },
    { itemId: 'dining-chair', x: 36, y: 35 },

    // === ZONE 4: Bedroom Sanctuary (Top-Right: x: 31..39, y: 23..28) ===
    // Bedroom soft rug
    { itemId: 'bedroom-rug', x: 34, y: 24 },
    // King canopy bed (2x2) along east wall
    { itemId: 'bed', x: 36, y: 23 },
    // Nightstands flanking bed
    { itemId: 'nightstand', x: 35, y: 23 },
    { itemId: 'nightstand', x: 38, y: 23 },
    // Wardrobe along south bedroom partition/wall
    { itemId: 'wardrobe', x: 34, y: 27 },
    // Bonsai tree / plant
    { itemId: 'bedroom-plant', x: 39, y: 27 }
  ];

  window.HOUSE_DATA = {
    config: HOUSE_CONFIG,
    items: ITEMS,
    layout: LAYOUT
  };
})();
