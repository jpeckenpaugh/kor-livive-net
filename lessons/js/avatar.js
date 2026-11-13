/**
 * avatar.js - DiceBear Voxel & Companion Avatar Helper Module
 * Provides procedural SVG generation for characters, NPCs, and companion pets.
 */

(function () {
  'use strict';

  // Fallback SVG avatars if DiceBearVoxel is not loaded
  function createFallbackSvg(emoji, label, bgColor = '#e0f2fe') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" aria-label="${label || emoji}">
      <rect width="100" height="100" rx="20" fill="${bgColor}" />
      <text x="50" y="62" font-size="52" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    </svg>`;
  }

  const AvatarEngine = {
    /**
     * Checks if DiceBearVoxel engine is available
     */
    isEngineAvailable: function () {
      return typeof window !== 'undefined' && typeof window.DiceBearVoxel !== 'undefined';
    },

    /**
     * Renders a human character avatar as SVG string
     * @param {string} seed
     * @param {Object} options
     * @returns {string} SVG string
     */
    renderCharacterAvatar: function (seed = 'learner', options = {}) {
      if (this.isEngineAvailable() && typeof window.DiceBearVoxel.createVoxelAvatar === 'function') {
        try {
          return window.DiceBearVoxel.createVoxelAvatar({
            seed: String(seed),
            backgroundColor: [],
            ...options
          });
        } catch (err) {
          console.warn('AvatarEngine: createVoxelAvatar failed for seed ' + seed, err);
        }
      }
      return createFallbackSvg('🧑', seed, '#dbeafe');
    },

    /**
     * Renders a companion avatar (critters / clay / sprouts / etc.) as SVG string
     * @param {string} style - 'critters' | 'clay' | 'sprouts' | 'voxel-bot' | 'gaze'
     * @param {string} seed - e.g. 'grey-cat', 'white-cat', 'brown-cat', 'dog', 'rabbit', 'horse'
     * @param {Object} options
     * @returns {string} SVG string
     */
    renderCompanionAvatar: function (style = 'critters', seed = 'cat', options = {}) {
      if (this.isEngineAvailable() && typeof window.DiceBearVoxel.createCompanionAvatar === 'function') {
        try {
          return window.DiceBearVoxel.createCompanionAvatar(style, {
            seed: String(seed),
            backgroundColor: [],
            ...options
          });
        } catch (err) {
          console.warn(`AvatarEngine: createCompanionAvatar failed for style ${style}, seed ${seed}`, err);
        }
      }
      const emojiMap = {
        cat: '🐱',
        dog: '🐶',
        rabbit: '🐰',
        horse: '🐴',
        panda: '🐼',
        tiger: '🐯',
        bear: '🐻'
      };
      const key = Object.keys(emojiMap).find(k => String(seed).toLowerCase().includes(k)) || 'cat';
      return createFallbackSvg(emojiMap[key] || '🐾', seed, '#fef3c7');
    },

    /**
     * Helper to render NPC avatars
     */
    renderNpcAvatar: function (npcId, seed) {
      if (npcId === 'teacher_park') {
        return this.renderCharacterAvatar(seed || 'TeacherPark', { flip: false });
      }
      if (npcId === 'shopkeeper') {
        return this.renderCharacterAvatar(seed || 'Shopkeeper', { flip: true });
      }
      if (npcId === 'horse_companion' || npcId === 'horse') {
        return this.renderCompanionAvatar('critters', 'horse');
      }
      return this.renderCharacterAvatar(seed || npcId || 'NPC');
    },

    /**
     * Convert SVG string into data URL for img src or background-image
     */
    svgToDataUrl: function (svgString) {
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
    }
  };

  // Export to global scope
  if (typeof window !== 'undefined') {
    window.AvatarEngine = AvatarEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarEngine;
  }
})();
