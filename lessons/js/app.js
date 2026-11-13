/**
 * Korean Language Buddy - Main Application Logic
 * Modules: LessonRepository, SpeechAudio, ProfileManager, ScenarioEngine, AutoPlayEngine, QuizEngine, UIController
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kor_buddy_profiles_v1';
  const DEFAULT_AVATARS = ['🐯', '🐰', '🦊', '🐼', '🦁', '🐻'];
  const PROCEDURAL_AVATAR_OPTIONS = [
    { id: 'tiger', name: '호랑이 (Tiger)', type: 'companion', style: 'critters', seed: 'tiger', emoji: '🐯' },
    { id: 'cat', name: '고양이 (Cat)', type: 'companion', style: 'critters', seed: 'cat', emoji: '🐱' },
    { id: 'dog', name: '강아지 (Puppy)', type: 'companion', style: 'critters', seed: 'dog', emoji: '🐶' },
    { id: 'rabbit', name: '토끼 (Bunny)', type: 'companion', style: 'critters', seed: 'rabbit', emoji: '🐰' },
    { id: 'horse', name: '말 (Horse)', type: 'companion', style: 'critters', seed: 'horse', emoji: '🐴' },
    { id: 'minsoo', name: '민수 (Minsoo)', type: 'voxel', seed: 'Minsoo', emoji: '👦' },
    { id: 'jiwoo', name: '지우 (Jiwoo)', type: 'voxel', seed: 'Jiwoo', emoji: '👧' },
    { id: 'alex', name: '알렉스 (Alex)', type: 'voxel', seed: 'Alex', emoji: '🧑' }
  ];

  /* ==========================================================================
     0. LESSON REPOSITORY (JSON LOADER WITH FALLBACK)
     ========================================================================== */
  const LessonRepository = {
    lessons: [],
    loaded: false,

    load: async function () {
      try {
        const response = await fetch('data/lessons.json');
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' ' + response.statusText);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.lessons = data;
          this.loaded = true;
          return this.lessons;
        }
        throw new Error('Invalid JSON payload structure');
      } catch (err) {
        console.warn('LessonRepository: Fetch data/lessons.json failed or running via file:// protocol. Falling back to embedded LESSONS_DATA.', err);
        if (typeof LESSONS_DATA !== 'undefined' && Array.isArray(LESSONS_DATA)) {
          this.lessons = LESSONS_DATA;
          this.loaded = true;
          return this.lessons;
        }
        console.error('LessonRepository: No lesson data could be resolved.', err);
        this.lessons = [];
        return [];
      }
    },

    getAll: function () {
      return this.lessons;
    },

    getLesson: function (index) {
      return this.lessons[index] || null;
    },

    count: function () {
      return this.lessons.length;
    }
  };

  /* ==========================================================================
     1. SPEECH SYNTHESIS ENGINE (KOREAN + ENGLISH) WITH VOICE PROFILE TUNING
     ========================================================================== */
  const SpeechAudio = {
    supported: 'speechSynthesis' in window,
    voices: [],
    voicesLoaded: false,

    // Character voice profiles with pitch and rate tuning
    characterPresets: {
      teacher: { pitch: 1.1, rate: 0.85 },       // Teacher Park: warm, clear, slightly higher & measured
      customer_horse: { pitch: 0.85, rate: 0.85 }, // Horse / Shopkeeper: grounded, calm, slightly deeper
      horse: { pitch: 0.85, rate: 0.85 },
      shopkeeper: { pitch: 0.85, rate: 0.85 },
      halmeoni: { pitch: 0.9, rate: 0.85 },      // Bunsik Halmeoni: warm elder tone
      minjun: { pitch: 1.25, rate: 0.90 },       // Classmate Min-jun: youthful, lively peer
      nurse: { pitch: 1.1, rate: 0.85 },         // School Health Nurse
      mom: { pitch: 1.15, rate: 0.85 },          // Caring Mother
      child: { pitch: 1.3, rate: 0.90 },         // Child / young learner: bright, cheerful
      learner: { pitch: 1.2, rate: 0.90 },
      default: { pitch: 1.0, rate: 0.85 }
    },

    init: function () {
      if (!this.supported) return;
      this.populateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.populateVoices();
      }
    },

    populateVoices: function () {
      if (!this.supported) return;
      this.voices = window.speechSynthesis.getVoices() || [];
      if (this.voices.length > 0) {
        this.voicesLoaded = true;
      }
    },

    getVoiceForLang: function (langPrefix) {
      if (!this.supported) return null;
      if (!this.voices || this.voices.length === 0) {
        this.populateVoices();
      }
      const prefix = langPrefix.toLowerCase();
      // 1. Prefer natural / local service voice with exact or starting lang match
      const localMatch = this.voices.find(v => v.lang.toLowerCase().startsWith(prefix) && v.localService);
      if (localMatch) return localMatch;

      // 2. Any voice matching language code prefix
      const anyMatch = this.voices.find(v => v.lang.toLowerCase().startsWith(prefix));
      if (anyMatch) return anyMatch;

      return null;
    },

    /**
     * Speaks text in target language with character voice tuning
     * @param {string} text
     * @param {string} lang 'ko-KR' | 'en-US'
     * @param {Function|null} onEndCallback
     * @param {Object|string|null} characterVoice - Character key or { pitch, rate }
     */
    speak: function (text, lang = 'ko-KR', onEndCallback = null, characterVoice = null) {
      if (!this.supported) {
        UIController.showToast('Sound playback is not supported on this browser.');
        if (typeof onEndCallback === 'function') onEndCallback();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;

        // Resolve pitch and rate based on character preset or explicit options
        let pitch = 1.0;
        let rate = lang.startsWith('ko') ? 0.85 : 0.95;

        if (typeof characterVoice === 'string') {
          const preset = this.characterPresets[characterVoice] || this.characterPresets.default;
          pitch = preset.pitch;
          rate = preset.rate;
        } else if (characterVoice && typeof characterVoice === 'object') {
          if (typeof characterVoice.pitch === 'number') pitch = characterVoice.pitch;
          if (typeof characterVoice.rate === 'number') rate = characterVoice.rate;
        }

        utterance.pitch = pitch;
        utterance.rate = rate;

        const voice = this.getVoiceForLang(lang);
        if (voice) {
          utterance.voice = voice;
        }

        let callbackFired = false;
        const triggerCallbackOnce = () => {
          if (!callbackFired) {
            callbackFired = true;
            if (typeof onEndCallback === 'function') {
              onEndCallback();
            }
          }
        };

        utterance.onend = () => triggerCallbackOnce();
        utterance.onerror = () => triggerCallbackOnce();

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Speech error:', err);
        if (typeof onEndCallback === 'function') onEndCallback();
      }
    },

    stop: function () {
      if (this.supported) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          console.warn('Speech cancellation error:', e);
        }
      }
    }
  };

  /* ==========================================================================
     2. PROFILE & LOCALSTORAGE MANAGER
     ========================================================================== */
  const ProfileManager = {
    data: {
      activeProfileId: null,
      profiles: []
    },

    init: function () {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          this.data = JSON.parse(raw);
        } catch (e) {
          console.error('Failed to parse profile data from localStorage', e);
          this.data = { activeProfileId: null, profiles: [] };
        }
      }

      if (!this.data.profiles || this.data.profiles.length === 0) {
        return false;
      }

      if (!this.getActiveProfile()) {
        this.data.activeProfileId = this.data.profiles[0].id;
        this.save();
      }
      return true;
    },

    save: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
    },

    getActiveProfile: function () {
      return this.data.profiles.find(p => p.id === this.data.activeProfileId) || null;
    },

    createProfile: function (name, avatar, companion = null) {
      const cleanName = (name || '').trim() || 'Learner';
      let cleanAvatar = avatar || DEFAULT_AVATARS[0];
      // If avatar is object or string seed
      const newProfile = {
        id: 'prof_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: cleanName,
        avatar: cleanAvatar,
        companion: companion || { animal: 'cat', color: 'grey', koreanName: '회색 고양이', seed: 'grey-cat' },
        createdAt: Date.now(),
        stars: 0,
        lessonProgress: {}
      };
      this.data.profiles.push(newProfile);
      this.data.activeProfileId = newProfile.id;
      this.save();
      return newProfile;
    },

    saveLearnerPet: function (petData) {
      const profile = this.getActiveProfile();
      if (!profile) return;
      profile.companion = {
        ...(profile.companion || {}),
        ...petData,
        updatedAt: Date.now()
      };
      this.save();
    },

    getLearnerPet: function () {
      const profile = this.getActiveProfile();
      if (!profile || !profile.companion) {
        return { animal: 'cat', color: 'grey', koreanName: '회색 고양이', seed: 'grey-cat' };
      }
      return profile.companion;
    },

    createGuestProfile: function () {
      return this.createProfile('Learner', '🐯');
    },

    switchProfile: function (profileId) {
      const target = this.data.profiles.find(p => p.id === profileId);
      if (target) {
        this.data.activeProfileId = target.id;
        this.save();
        return true;
      }
      return false;
    },

    deleteProfile: function (profileId) {
      if (this.data.profiles.length <= 1) {
        UIController.showToast('You must keep at least one profile.');
        return false;
      }
      this.data.profiles = this.data.profiles.filter(p => p.id !== profileId);
      if (this.data.activeProfileId === profileId) {
        this.data.activeProfileId = this.data.profiles[0].id;
      }
      this.save();
      return true;
    },

    ensureLessonEntry: function (profile, lessonId) {
      if (!profile.lessonProgress[lessonId]) {
        profile.lessonProgress[lessonId] = {
          status: 'started',
          cardsViewed: [],
          scenarioCompleted: false,
          scenarioStars: 0,
          quizStars: 0,
          quizPassed: false,
          stars: 0,
          highScore: 0
        };
      }
      const prog = profile.lessonProgress[lessonId];
      if (typeof prog.scenarioCompleted !== 'boolean') prog.scenarioCompleted = false;
      if (typeof prog.scenarioStars !== 'number') prog.scenarioStars = 0;
      if (typeof prog.quizStars !== 'number') prog.quizStars = 0;
      if (typeof prog.stars !== 'number') prog.stars = 0;
      return prog;
    },

    recalculateProfileStars: function (profile) {
      let sumStars = 0;
      Object.keys(profile.lessonProgress).forEach(id => {
        const prog = profile.lessonProgress[id];
        const scStars = prog.scenarioStars || (prog.scenarioCompleted ? 1 : 0);
        const qzStars = prog.quizStars || 0;
        prog.stars = Math.min(3, scStars + qzStars);
        sumStars += prog.stars;
      });
      profile.stars = sumStars;
    },

    recordScenarioCompletion: function (lessonId) {
      const profile = this.getActiveProfile();
      if (!profile) return { isNew: false, lessonStars: 0, totalStars: 0 };

      const prog = this.ensureLessonEntry(profile, lessonId);
      let isNew = false;

      if (!prog.scenarioCompleted) {
        prog.scenarioCompleted = true;
        prog.scenarioStars = 1;
        isNew = true;
      } else {
        prog.scenarioStars = 1;
      }

      if (prog.status === 'untouched' || prog.status === 'new') {
        prog.status = 'started';
      }

      this.recalculateProfileStars(profile);
      this.save();

      return {
        isNew,
        lessonStars: prog.stars,
        totalStars: profile.stars
      };
    },

    recordCardView: function (lessonId, wordIndex) {
      const profile = this.getActiveProfile();
      if (!profile) return;

      const prog = this.ensureLessonEntry(profile, lessonId);
      if (!prog.cardsViewed) prog.cardsViewed = [];
      if (!prog.cardsViewed.includes(wordIndex)) {
        prog.cardsViewed.push(wordIndex);
      }
      if (prog.status === 'untouched' || prog.status === 'new') {
        prog.status = 'started';
      }
      this.save();
    },

    recordQuizCompletion: function (lessonId, score, totalQuestions) {
      const profile = this.getActiveProfile();
      if (!profile) {
        return {
          roundScore: score,
          totalQuestions: totalQuestions,
          starsAwarded: 0,
          lessonStars: 0,
          totalStars: 0,
          isNewlyCompleted: false
        };
      }

      // Quiz awards up to 2 stars: score >= 5 => 2 stars, score >= 3 => 1 star
      let quizStarsAwarded = 0;
      if (score >= 5) {
        quizStarsAwarded = 2;
      } else if (score >= 3) {
        quizStarsAwarded = 1;
      }

      const prog = this.ensureLessonEntry(profile, lessonId);

      if (score > prog.highScore) {
        prog.highScore = score;
      }
      if (quizStarsAwarded > prog.quizStars) {
        prog.quizStars = quizStarsAwarded;
      }

      let isNewlyCompleted = false;
      if (score >= 3 && prog.status !== 'completed') {
        prog.status = 'completed';
        prog.quizPassed = true;
        isNewlyCompleted = true;
      }

      this.recalculateProfileStars(profile);
      this.save();

      return {
        roundScore: score,
        totalQuestions: totalQuestions,
        starsAwarded: quizStarsAwarded,
        lessonStars: prog.stars,
        totalStars: profile.stars,
        isNewlyCompleted: isNewlyCompleted
      };
    },

    getLessonStars: function (lessonId) {
      const profile = this.getActiveProfile();
      if (!profile || !profile.lessonProgress[lessonId]) {
        return 0;
      }
      return profile.lessonProgress[lessonId].stars || 0;
    },

    isScenarioCompleted: function (lessonId) {
      const profile = this.getActiveProfile();
      if (!profile || !profile.lessonProgress[lessonId]) {
        return false;
      }
      return !!profile.lessonProgress[lessonId].scenarioCompleted;
    },

    getLessonStatus: function (lessonId) {
      const profile = this.getActiveProfile();
      if (!profile || !profile.lessonProgress[lessonId]) {
        return 'untouched';
      }
      return profile.lessonProgress[lessonId].status || 'untouched';
    }
  };

  /* ==========================================================================
     3. SCENARIO ENGINE (PRIMARY SITUATIONAL LEARNER JOURNEY & ADVANCED SCENARIOS)
     ========================================================================== */
  const ScenarioEngine = {
    currentLesson: null,
    currentTurnIndex: 0,
    turns: [],
    selectedOption: null,
    isDisclosureRevealed: false,
    optionsTimer: null,

    // Scenario A State (Pet Customizer)
    petState: {
      animal: 'cat',
      color: 'grey'
    },

    // Scenario B State (Interactive Visual Counter)
    counterState: {
      trayItems: [],
      targetItem: 'apple',
      targetCount: 3
    },

    // Lesson 4 Color State
    colorState: {
      stepIndex: 0,
      selectedColor: null
    },

    // Lesson 7 Backpack State
    backpackState: {
      packedItems: []
    },

    // Lesson 8 Emotion State
    emotionState: {
      selectedEmotion: null
    },

    // Lesson 9 Body State
    bodyState: {
      stepIndex: 0,
      tappedParts: []
    },

    initScenario: function (lesson) {
      this.currentLesson = lesson;
      this.selectedOption = null;
      if (this.optionsTimer) {
        clearTimeout(this.optionsTimer);
        this.optionsTimer = null;
      }

      const stage = document.getElementById('scenario-stage');
      const completionCard = document.getElementById('scenario-completion-card');
      const arena = document.getElementById('dialogue-arena');
      const feedbackCard = document.getElementById('etiquette-feedback-card');

      if (stage) stage.style.display = 'flex';
      if (completionCard) completionCard.style.display = 'none';
      if (arena) arena.style.display = 'flex';
      if (feedbackCard) feedbackCard.style.display = 'none';

      // Setting minimal subtle stage indicator
      const locText = document.getElementById('scene-location-text');
      if (lesson.scene) {
        if (locText) locText.textContent = `${lesson.scene.illustration || '📍'} ${lesson.scene.location || 'Scene'}`;
      } else {
        if (locText) locText.textContent = `${lesson.icon || '📍'} ${lesson.title}`;
      }

      // Hide static context box if it exists in DOM
      const ctxBox = document.getElementById('scene-context-box');
      if (ctxBox) ctxBox.style.display = 'none';

      // Bind speech bubble tap-to-reveal toggle
      this.bindSpeechDisclosure();

      // Render NPC Avatar via DiceBear
      if (lesson.characters && lesson.characters.npc) {
        const npc = lesson.characters.npc;
        const npcAvatar = document.getElementById('npc-avatar');
        const npcName = document.getElementById('npc-name');

        if (npcName) npcName.textContent = npc.name || 'Conversation Partner';
        if (npcAvatar) {
          npcAvatar.classList.add('npc-interactive');
          if (typeof AvatarEngine !== 'undefined') {
            if (npc.id === 'customer_horse') {
              npcAvatar.innerHTML = AvatarEngine.renderCompanionAvatar('critters', 'horse');
            } else if (npc.avatarSeed) {
              npcAvatar.innerHTML = AvatarEngine.renderCharacterAvatar(npc.avatarSeed);
            } else if (npc.id === 'teacher_park') {
              npcAvatar.innerHTML = AvatarEngine.renderCharacterAvatar('TeacherPark');
            } else if (npc.id === 'classmate_minjun') {
              npcAvatar.innerHTML = AvatarEngine.renderCharacterAvatar('MinjunVoxel');
            } else if (npc.id === 'shopkeeper_halmeoni') {
              npcAvatar.innerHTML = AvatarEngine.renderCharacterAvatar('Halmeoni');
            } else if (npc.id === 'nurse_song') {
              npcAvatar.innerHTML = AvatarEngine.renderCharacterAvatar('NurseSong');
            } else if (npc.id === 'mom_avatar') {
              npcAvatar.innerHTML = AvatarEngine.renderCharacterAvatar('KoreanMom');
            } else {
              npcAvatar.innerHTML = AvatarEngine.renderCharacterAvatar(npc.id || 'NPC');
            }
          } else {
            npcAvatar.textContent = npc.avatar || '👩‍🏫';
          }
        }
      }

      // Load scenario turns
      if (lesson.scenario && Array.isArray(lesson.scenario.turns) && lesson.scenario.turns.length > 0) {
        this.turns = lesson.scenario.turns;
        this.currentTurnIndex = 0;
        this.presentTurn(0);
      } else {
        // Fallback scenario for lessons without explicit scenario schema yet
        this.buildFallbackScenario(lesson);
      }
    },

    bindSpeechDisclosure: function () {
      const bubble = document.getElementById('npc-speech-bubble');
      const toggleBtn = document.getElementById('scenario-translate-btn');

      const toggle = (e) => {
        if (e) e.stopPropagation();
        this.setSpeechDisclosure(!this.isDisclosureRevealed);
      };

      if (toggleBtn && !toggleBtn._bound) {
        toggleBtn._bound = true;
        toggleBtn.addEventListener('click', toggle);
      }

      if (bubble && !bubble._bound) {
        bubble._bound = true;
        bubble.addEventListener('click', (e) => {
          if (e.target.closest('.bubble-action-bar')) return;
          toggle(e);
        });
        bubble.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle(e);
          }
        });
      }
    },

    setSpeechDisclosure: function (reveal) {
      this.isDisclosureRevealed = reveal;
      const wrap = document.getElementById('bubble-disclosure-wrap');
      const toggleBtn = document.getElementById('scenario-translate-btn');

      if (wrap) {
        wrap.classList.toggle('revealed', reveal);
      }
      if (toggleBtn) {
        toggleBtn.classList.toggle('active', reveal);
        toggleBtn.setAttribute('aria-expanded', reveal ? 'true' : 'false');
        const label = toggleBtn.querySelector('.translate-btn-label');
        if (label) label.textContent = reveal ? 'Hide English' : 'Translate';
      }
    },

    buildFallbackScenario: function (lesson) {
      const firstWord = lesson.words[0];
      const secondWord = lesson.words[1] || lesson.words[0];

      this.turns = [
        {
          id: 'fallback-turn-1',
          speaker: 'partner',
          speech: {
            korean: firstWord.korean,
            phonetic: firstWord.phonetic,
            english: firstWord.english
          },
          prompt: `How do you express: "${secondWord.english}"?`,
          options: [
            {
              id: 'fb-opt-1',
              korean: secondWord.korean,
              phonetic: secondWord.phonetic,
              english: secondWord.english,
              isCorrect: true,
              feedback: {
                title: 'Spot on! 🌟',
                explanation: secondWord.fact || 'Great choice!',
                socialNuance: 'Use this naturally in conversation!'
              },
              nextTurnId: 'turn-complete'
            },
            {
              id: 'fb-opt-2',
              korean: (lesson.words[2] || lesson.words[0]).korean,
              phonetic: (lesson.words[2] || lesson.words[0]).phonetic,
              english: (lesson.words[2] || lesson.words[0]).english,
              isCorrect: false,
              feedback: {
                title: 'Try again! 🌱',
                explanation: `That means "${(lesson.words[2] || lesson.words[0]).english}".`,
                socialNuance: 'Give it another look!'
              },
              nextTurnId: null
            }
          ]
        }
      ];
      this.currentTurnIndex = 0;
      this.presentTurn(0);
    },

    presentTurn: function (index) {
      if (index >= this.turns.length) {
        this.finishScenario();
        return;
      }

      this.currentTurnIndex = index;
      const turn = this.turns[index];
      const lesson = this.currentLesson;

      // Reset progressive disclosure for the new line
      this.setSpeechDisclosure(false);

      if (this.optionsTimer) {
        clearTimeout(this.optionsTimer);
        this.optionsTimer = null;
      }

      // Update NPC speech
      const speechKr = document.getElementById('npc-speech-kr');
      const speechPhonetic = document.getElementById('npc-speech-phonetic');
      const speechEn = document.getElementById('npc-speech-en');
      const audioBtn = document.getElementById('scenario-audio-btn');

      if (speechKr) speechKr.textContent = turn.speech.korean;
      if (speechPhonetic) speechPhonetic.textContent = turn.speech.phonetic;
      if (speechEn) speechEn.textContent = turn.speech.english;

      // Resolve character voice
      const npcVoice = (lesson.characters && lesson.characters.npc && lesson.characters.npc.voice) || 'teacher';

      if (audioBtn) {
        audioBtn.onclick = () => {
          SpeechAudio.speak(turn.speech.korean, 'ko-KR', null, npcVoice);
        };
      }

      // Beat 1: Animate NPC character row entry and speak Korean phrase
      const npcRow = document.getElementById('npc-speaker-row');
      if (npcRow) {
        npcRow.classList.remove('beat-entering');
        void npcRow.offsetWidth;
        npcRow.classList.add('beat-entering');
      }
      SpeechAudio.speak(turn.speech.korean, 'ko-KR', null, npcVoice);

      // Update prompt
      const promptText = document.getElementById('scenario-prompt-text');
      if (promptText) {
        promptText.textContent = turn.prompt;
      }

      const grid = document.getElementById('scenario-options-grid');
      const feedbackCard = document.getElementById('etiquette-feedback-card');
      const challengeZone = document.getElementById('learner-challenge-zone');

      if (feedbackCard) feedbackCard.style.display = 'none';

      // Check scenario type: Specialized Interactive Mechanics
      const scenarioType = lesson.scenario ? lesson.scenario.type : null;

      if (turn.isCustomizerTurn || scenarioType === 'pet_customizer') {
        if (challengeZone) challengeZone.classList.remove('beat-options-in');
        this.renderPetCustomizer(grid);
        return;
      }

      if (turn.isCounterTurn || scenarioType === 'interactive_counter') {
        if (challengeZone) challengeZone.classList.remove('beat-options-in');
        this.renderInteractiveCounter(grid, lesson.scenario);
        return;
      }

      if (scenarioType === 'color_palette') {
        if (challengeZone) challengeZone.classList.remove('beat-options-in');
        this.renderColorPalette(grid, lesson.scenario);
        return;
      }

      if (scenarioType === 'backpack_pack') {
        if (challengeZone) challengeZone.classList.remove('beat-options-in');
        this.renderBackpackPack(grid, lesson.scenario);
        return;
      }

      if (scenarioType === 'emotion_check') {
        if (challengeZone) challengeZone.classList.remove('beat-options-in');
        this.renderEmotionCheck(grid, lesson.scenario);
        return;
      }

      if (scenarioType === 'body_tap') {
        if (challengeZone) challengeZone.classList.remove('beat-options-in');
        this.renderBodyTap(grid, lesson.scenario);
        return;
      }

      // Beat 2: Standard dialogue options smoothly slide/fade in
      if (grid) {
        grid.innerHTML = '';
        turn.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'scenario-option-btn';
          btn.innerHTML = `
            <div class="option-kr-col">
              <span class="option-kr">${opt.korean}</span>
              <span class="option-phonetic">${opt.phonetic}</span>
            </div>
            <span class="option-en-label">${opt.english}</span>
          `;
          btn.onclick = () => this.handleOptionSelect(opt, btn, turn);
          grid.appendChild(btn);
        });
      }

      if (challengeZone) {
        challengeZone.classList.remove('beat-options-in');
        this.optionsTimer = setTimeout(() => {
          challengeZone.classList.add('beat-options-in');
        }, 320);
      }
    },

    /* ==========================================================================
       SCENARIO A: PET CUSTOMIZER ("What pet do you have?")
       ========================================================================== */
    renderPetCustomizer: function (container) {
      if (!container) return;

      // Retrieve existing pet from profile if available
      const savedPet = ProfileManager.getLearnerPet();
      if (savedPet) {
        this.petState.animal = savedPet.animal || 'cat';
        this.petState.color = savedPet.color || 'grey';
      }

      const animals = [
        { id: 'cat', kr: '고양이', en: 'Cat', emoji: '🐱' },
        { id: 'dog', kr: '강아지', en: 'Puppy', emoji: '🐶' },
        { id: 'rabbit', kr: '토끼', en: 'Rabbit', emoji: '🐰' }
      ];

      const colors = [
        { id: 'grey', kr: '회색', en: 'Grey', hex: '#94a3b8' },
        { id: 'white', kr: '하얀색', en: 'White', hex: '#f8fafc' },
        { id: 'brown', kr: '갈색', en: 'Brown', hex: '#b45309' }
      ];

      const self = this;

      function getSentence() {
        const curAnimal = animals.find(a => a.id === self.petState.animal) || animals[0];
        const curColor = colors.find(c => c.id === self.petState.color) || colors[0];

        const sentenceKr = `저는 ${curColor.kr} ${curAnimal.kr}가 있어요!`;
        const colorPhonetic = curColor.id === 'grey' ? 'hoe-saek' : curColor.id === 'white' ? 'ha-yan-saek' : 'gal-saek';
        const animalPhonetic = curAnimal.id === 'cat' ? 'go-yang-i-ga' : curAnimal.id === 'dog' ? 'gang-a-ji-ga' : 'to-kki-ga';
        const sentencePhonetic = `Jeo-neun ${colorPhonetic} ${animalPhonetic} i-sseo-yo!`;
        const sentenceEn = `I have a ${curColor.en.toLowerCase()} ${curAnimal.en.toLowerCase()}!`;
        const seed = `${self.petState.color}-${self.petState.animal}`;

        return { sentenceKr, sentencePhonetic, sentenceEn, seed, curAnimal, curColor };
      }

      function updateDisplay() {
        const data = getSentence();

        const avatarWrapper = document.getElementById('pet-live-avatar');
        const krNameElem = document.getElementById('pet-display-kr-name');
        const enNameElem = document.getElementById('pet-display-en-name');
        const sentKrElem = document.getElementById('pet-sentence-kr');
        const sentPhoneticElem = document.getElementById('pet-sentence-phonetic');
        const sentEnElem = document.getElementById('pet-sentence-en');

        if (avatarWrapper && typeof AvatarEngine !== 'undefined') {
          avatarWrapper.innerHTML = AvatarEngine.renderCompanionAvatar('critters', data.seed);
          avatarWrapper.classList.remove('pet-bounce');
          void avatarWrapper.offsetWidth;
          avatarWrapper.classList.add('pet-bounce');
        }

        if (krNameElem) krNameElem.textContent = `${data.curColor.kr} ${data.curAnimal.kr} ${data.curAnimal.emoji}`;
        if (enNameElem) enNameElem.textContent = `${data.curColor.en} ${data.curAnimal.en}`;
        if (sentKrElem) sentKrElem.textContent = data.sentenceKr;
        if (sentPhoneticElem) sentPhoneticElem.textContent = data.sentencePhonetic;
        if (sentEnElem) sentEnElem.textContent = data.sentenceEn;
      }

      const initialData = getSentence();
      const initialSvg = (typeof AvatarEngine !== 'undefined')
        ? AvatarEngine.renderCompanionAvatar('critters', initialData.seed)
        : initialData.curAnimal.emoji;

      container.innerHTML = `
        <div class="pet-customizer-container">
          <div class="pet-stage-display">
            <div class="pet-avatar-wrapper pet-bounce" id="pet-live-avatar">
              ${initialSvg}
            </div>
            <div class="pet-info-card">
              <span class="pet-korean-name" id="pet-display-kr-name">${initialData.curColor.kr} ${initialData.curAnimal.kr} ${initialData.curAnimal.emoji}</span>
              <span class="pet-english-name" id="pet-display-en-name">${initialData.curColor.en} ${initialData.curAnimal.en}</span>
              <span class="pet-saved-badge">✨ Companion Profile Ready</span>
            </div>
          </div>

          <div class="pet-controls-row">
            <div class="pet-selector-group">
              <span class="pet-selector-title">동물 (Animal)</span>
              <div class="pet-choice-chips" id="pet-animal-chips">
                ${animals.map(a => `
                  <button type="button" class="pet-chip-btn ${a.id === self.petState.animal ? 'active' : ''}" data-animal="${a.id}">
                    <span>${a.emoji}</span> ${a.kr}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="pet-selector-group">
              <span class="pet-selector-title">색상 (Color)</span>
              <div class="pet-choice-chips" id="pet-color-chips">
                ${colors.map(c => `
                  <button type="button" class="pet-chip-btn ${c.id === self.petState.color ? 'active' : ''}" data-color="${c.id}">
                    <span class="pet-chip-color-dot" style="background-color: ${c.hex};"></span> ${c.kr}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="pet-sentence-card">
            <span class="pet-sentence-title">말하기 (Speak in Korean)</span>
            <div class="pet-sentence-kr" id="pet-sentence-kr">${initialData.sentenceKr}</div>
            <div class="pet-sentence-phonetic" id="pet-sentence-phonetic">${initialData.sentencePhonetic}</div>
            <div class="pet-sentence-en" id="pet-sentence-en">${initialData.sentenceEn}</div>
            <div class="pet-action-row">
              <button type="button" class="btn-secondary" id="pet-listen-btn">
                <span>🔊</span> Listen
              </button>
              <button type="button" class="btn-primary" id="pet-confirm-btn">
                <span>💬</span> 저는 ... 있어요! (Say & Confirm)
              </button>
            </div>
          </div>
        </div>
      `;

      const animalBtns = container.querySelectorAll('#pet-animal-chips .pet-chip-btn');
      animalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          animalBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          self.petState.animal = btn.getAttribute('data-animal');
          updateDisplay();
        });
      });

      const colorBtns = container.querySelectorAll('#pet-color-chips .pet-chip-btn');
      colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          colorBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          self.petState.color = btn.getAttribute('data-color');
          updateDisplay();
        });
      });

      const listenBtn = container.querySelector('#pet-listen-btn');
      if (listenBtn) {
        listenBtn.addEventListener('click', () => {
          const data = getSentence();
          SpeechAudio.speak(data.sentenceKr, 'ko-KR', null, 'child');
        });
      }

      const confirmBtn = container.querySelector('#pet-confirm-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const data = getSentence();

          ProfileManager.saveLearnerPet({
            animal: self.petState.animal,
            color: self.petState.color,
            koreanName: `${data.curColor.kr} ${data.curAnimal.kr}`,
            seed: data.seed
          });

          SpeechAudio.speak(data.sentenceKr, 'ko-KR', () => {
            const feedbackCard = document.getElementById('etiquette-feedback-card');
            const feedbackTitle = document.getElementById('etiquette-title');
            const feedbackExp = document.getElementById('etiquette-explanation');
            const feedbackNuance = document.getElementById('etiquette-nuance');
            const continueBtn = document.getElementById('etiquette-continue-btn');

            if (feedbackCard) {
              feedbackCard.className = 'etiquette-feedback-card correct';
              feedbackTitle.textContent = '참 잘했어요! 🌟 (Wonderful sentence!)';
              feedbackExp.textContent = `You answered Teacher Park with polite 존댓말 ("${data.sentenceKr}"). Your ${data.curColor.en} ${data.curAnimal.en} is now saved as your companion pet!`;
              feedbackNuance.textContent = '💡 Etiquette tip: Using "~가 있어요" (I have / There is) with polite "~요" is the standard respectful way to talk about family and pets.';
              feedbackCard.style.display = 'flex';

              continueBtn.style.display = 'inline-flex';
              continueBtn.textContent = 'Finish Lesson & Collect Star ⭐';
              continueBtn.onclick = () => {
                self.finishScenario();
              };
            }
          }, 'child');
        });
      }
    },

    /* ==========================================================================
       SCENARIO B: INTERACTIVE VISUAL COUNTER ("Buy 3 apples for my horse")
       ========================================================================== */
    renderInteractiveCounter: function (container, scenarioData) {
      if (!container) return;

      const self = this;
      this.counterState.trayItems = [];
      this.counterState.targetItem = (scenarioData && scenarioData.targetItem) || 'apple';
      this.counterState.targetCount = (scenarioData && scenarioData.targetCount) || 3;

      const koreanCounters = [
        { count: 1, kr: '하나', phonetic: 'Hana', en: 'One' },
        { count: 2, kr: '둘', phonetic: 'Dul', en: 'Two' },
        { count: 3, kr: '셋', phonetic: 'Set', en: 'Three' },
        { count: 4, kr: '넷', phonetic: 'Net', en: 'Four' }
      ];

      const shelfItems = [
        { id: 'apple', kr: '사과', en: 'Apple', emoji: '🍎', isTarget: true },
        { id: 'watermelon', kr: '수박', en: 'Watermelon', emoji: '🍉', isTarget: false },
        { id: 'carrot', kr: '당근', en: 'Carrot', emoji: '🥕', isTarget: false },
        { id: 'banana', kr: '바나나', en: 'Banana', emoji: '🍌', isTarget: false }
      ];

      const horseSvg = (typeof AvatarEngine !== 'undefined')
        ? AvatarEngine.renderCompanionAvatar('critters', 'horse')
        : '🐴';

      container.innerHTML = `
        <div class="counter-scenario-container">
          <div class="counter-stage-header">
            <div class="counter-horse-wrapper">
              <div class="counter-horse-avatar" id="counter-horse-avatar">
                ${horseSvg}
              </div>
              <div class="counter-horse-speech">
                <span class="counter-horse-label">Traveler & Horse (말과 손님)</span>
                <span class="counter-horse-request">"말한테 줄 사과 세 개 주세요." (3 apples, please!)</span>
              </div>
            </div>
            <div class="counter-progress-badge" id="counter-tray-count-badge">
              0 / 3 Apples
            </div>
          </div>

          <div class="counter-tray-section">
            <span class="counter-tray-title">🛒 과일 쟁반 (Fruit Tray)</span>
            <div class="counter-tray-slots" id="counter-tray-slots">
              ${[0, 1, 2].map(i => `
                <div class="counter-tray-slot" id="counter-slot-${i}">
                  <span style="font-size:0.8rem; color:#d97706; font-weight:600;">Slot ${i+1}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div id="counter-feedback-banner" style="display:none;" class="counter-feedback-banner"></div>

          <div class="counter-market-shelf">
            <span class="counter-shelf-title">과일 고르기 (Select Fruit)</span>
            <div class="counter-shelf-items">
              ${shelfItems.map(item => `
                <button type="button" class="counter-item-btn" data-item-id="${item.id}" data-item-kr="${item.kr}" data-item-emoji="${item.emoji}" data-is-target="${item.isTarget}">
                  <span class="counter-item-icon">${item.emoji}</span>
                  <span class="counter-item-name-kr">${item.kr}</span>
                  <span class="counter-item-name-en">${item.en}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="counter-submit-bar">
            <button type="button" class="btn-primary" id="counter-handover-btn" style="min-width: 240px;" disabled>
              <span>🍎</span> 여기 있어요! (Here you go!)
            </button>
          </div>
        </div>
      `;

      function showBanner(message, isGentleWarn = true) {
        const banner = document.getElementById('counter-feedback-banner');
        if (!banner) return;
        banner.className = isGentleWarn ? 'counter-feedback-banner gentle-warn' : 'counter-feedback-banner success';
        banner.textContent = message;
        banner.style.display = 'flex';
      }

      function updateTrayUI() {
        const badge = document.getElementById('counter-tray-count-badge');
        const handoverBtn = document.getElementById('counter-handover-btn');

        if (badge) {
          badge.textContent = `${self.counterState.trayItems.length} / 3 Apples`;
        }

        for (let i = 0; i < 3; i++) {
          const slot = document.getElementById(`counter-slot-${i}`);
          if (!slot) continue;

          if (i < self.counterState.trayItems.length) {
            const item = self.counterState.trayItems[i];
            const counterWord = koreanCounters[i];
            slot.className = 'counter-tray-slot filled';
            slot.innerHTML = `
              <span class="counter-slot-emoji">${item.emoji}</span>
              <span class="counter-slot-korean-count">${counterWord.kr}</span>
              <button type="button" class="counter-tray-remove-btn" title="Remove" data-remove-index="${i}">✕</button>
            `;
          } else {
            slot.className = 'counter-tray-slot';
            slot.innerHTML = `<span style="font-size:0.8rem; color:#d97706; font-weight:600;">Slot ${i+1}</span>`;
          }
        }

        container.querySelectorAll('.counter-tray-remove-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const rmIdx = parseInt(btn.getAttribute('data-remove-index'), 10);
            self.counterState.trayItems.splice(rmIdx, 1);
            updateTrayUI();
          };
        });

        if (handoverBtn) {
          handoverBtn.disabled = self.counterState.trayItems.length !== 3;
        }
      }

      const itemBtns = container.querySelectorAll('.counter-item-btn');
      itemBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.getAttribute('data-item-id');
          const itemKr = btn.getAttribute('data-item-kr');
          const itemEmoji = btn.getAttribute('data-item-emoji');
          const isTarget = btn.getAttribute('data-is-target') === 'true';

          if (!isTarget) {
            btn.classList.add('wrong-shake');
            setTimeout(() => btn.classList.remove('wrong-shake'), 500);
            SpeechAudio.speak('사과를 주세요', 'ko-KR', null, 'customer_horse');
            showBanner(`Gentle tip: The customer asked for apples (사과), not ${itemKr}! 말은 사과를 좋아해요 (The horse loves apples).`, true);
            return;
          }

          if (self.counterState.trayItems.length >= 3) {
            btn.classList.add('wrong-shake');
            setTimeout(() => btn.classList.remove('wrong-shake'), 500);
            SpeechAudio.speak('세 개면 충분해요', 'ko-KR', null, 'customer_horse');
            showBanner('The tray already has 3 apples! Tap "여기 있어요!" (Here you go!) to deliver.', true);
            return;
          }

          self.counterState.trayItems.push({ id: itemId, kr: itemKr, emoji: itemEmoji });
          const countIdx = self.counterState.trayItems.length;
          const counterWord = koreanCounters[countIdx - 1];

          SpeechAudio.speak(counterWord.kr, 'ko-KR', null, 'child');
          showBanner(`Added apple ${countIdx}: "${counterWord.kr}" (${counterWord.phonetic} - ${counterWord.en})! ✨`, false);

          updateTrayUI();
        });
      });

      const handoverBtn = container.querySelector('#counter-handover-btn');
      if (handoverBtn) {
        handoverBtn.addEventListener('click', () => {
          if (self.counterState.trayItems.length !== 3) return;

          const horseAvatar = document.getElementById('counter-horse-avatar');
          if (horseAvatar) {
            horseAvatar.classList.add('horse-cheer');
          }

          SpeechAudio.speak('여기 있어요!', 'ko-KR', () => {
            setTimeout(() => {
              SpeechAudio.speak('고마워요! 맛있게 먹을게요!', 'ko-KR', () => {
                const feedbackCard = document.getElementById('etiquette-feedback-card');
                const feedbackTitle = document.getElementById('etiquette-title');
                const feedbackExp = document.getElementById('etiquette-explanation');
                const feedbackNuance = document.getElementById('etiquette-nuance');
                const continueBtn = document.getElementById('etiquette-continue-btn');

                if (feedbackCard) {
                  feedbackCard.className = 'etiquette-feedback-card correct';
                  feedbackTitle.textContent = '말이 사과를 맛있게 먹었어요! 🐴🍎';
                  feedbackExp.textContent = 'You accurately counted 3 apples in native Korean numbers (하나, 둘, 셋) and politely served them with "여기 있어요!" (Here you go!).';
                  feedbackNuance.textContent = '💡 Etiquette tip: "여기 있어요" is the friendly polite phrase when handing items or food to customers and friends.';
                  feedbackCard.style.display = 'flex';

                  continueBtn.style.display = 'inline-flex';
                  continueBtn.textContent = 'Finish Lesson & Collect Star ⭐';
                  continueBtn.onclick = () => {
                    self.finishScenario();
                  };
                }
              }, 'customer_horse');
            }, 600);
          }, 'learner');
        });
      }
    },

    
    /* ==========================================================================
       SCENARIO: COLOR PALETTE (LESSON 4 - ART STUDIO PAINTING)
       ========================================================================== */
    renderColorPalette: function (container, scenarioData) {
      if (!container) return;
      const self = this;
      this.colorState.stepIndex = 0;
      this.colorState.selectedColor = null;

      const targetColors = (scenarioData && scenarioData.targetColors) || [
        { id: 'red', kr: '빨간색', en: 'Red', hex: '#ef4444', phonetic: 'Ppal-gan-saek' },
        { id: 'blue', kr: '파란색', en: 'Blue', hex: '#3b82f6', phonetic: 'Pa-ran-saek' },
        { id: 'yellow', kr: '노란색', en: 'Yellow', hex: '#eab308', phonetic: 'No-ran-saek' }
      ];

      const palette = (scenarioData && scenarioData.palette) || [
        { id: 'red', kr: '빨간색', en: 'Red', hex: '#ef4444', phonetic: 'Ppal-gan-saek' },
        { id: 'blue', kr: '파란색', en: 'Blue', hex: '#3b82f6', phonetic: 'Pa-ran-saek' },
        { id: 'yellow', kr: '노란색', en: 'Yellow', hex: '#eab308', phonetic: 'No-ran-saek' },
        { id: 'green', kr: '초록색', en: 'Green', hex: '#22c55e', phonetic: 'Cho-rok-saek' },
        { id: 'white', kr: '하얀색', en: 'White', hex: '#f8fafc', phonetic: 'Ha-yan-saek' },
        { id: 'black', kr: '검은색', en: 'Black', hex: '#1e293b', phonetic: 'Geom-eun-saek' }
      ];

      container.innerHTML = `
        <div class="art-studio-container">
          <div class="art-easel-stage">
            <div class="art-canvas-frame" id="art-canvas-frame">
              <div class="canvas-splash-effect" id="art-canvas-splash">🎨</div>
              <div class="canvas-color-label" id="art-canvas-label">Clean Canvas (도화지)</div>
            </div>
            <div class="art-mission-badge" id="art-mission-badge">
              <span>🎯 Request:</span> <strong id="art-target-req">${targetColors[0].kr} 크레파스 주세요!</strong>
            </div>
          </div>

          <div id="art-feedback-banner" class="counter-feedback-banner" style="display:none;"></div>

          <div class="art-crayons-tray">
            <span class="art-tray-title">🎨 크레파스 (Crayons)</span>
            <div class="art-crayons-grid" id="art-crayons-grid">
              ${palette.map(c => `
                <button type="button" class="art-crayon-btn" data-color-id="${c.id}" data-color-kr="${c.kr}" data-color-hex="${c.hex}" data-color-en="${c.en}">
                  <span class="crayon-swatch" style="background-color: ${c.hex};"></span>
                  <div class="crayon-names">
                    <span class="crayon-kr">${c.kr}</span>
                    <span class="crayon-phonetic">${c.phonetic}</span>
                    <span class="crayon-en">${c.en}</span>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      function showArtBanner(msg, isWarn = false) {
        const banner = document.getElementById('art-feedback-banner');
        if (!banner) return;
        banner.className = isWarn ? 'counter-feedback-banner gentle-warn' : 'counter-feedback-banner success';
        banner.textContent = msg;
        banner.style.display = 'flex';
      }

      function updateTargetUI() {
        const targetReq = document.getElementById('art-target-req');
        const curTarget = targetColors[self.colorState.stepIndex];
        if (targetReq && curTarget) {
          targetReq.textContent = `${curTarget.kr} (${curTarget.en}) 크레파스 주세요!`;
          SpeechAudio.speak(`${curTarget.kr} 크레파스 주세요`, 'ko-KR', null, 'teacher');
        }
      }

      const crayonBtns = container.querySelectorAll('.art-crayon-btn');
      crayonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const colorId = btn.getAttribute('data-color-id');
          const colorKr = btn.getAttribute('data-color-kr');
          const colorHex = btn.getAttribute('data-color-hex');
          const colorEn = btn.getAttribute('data-color-en');
          const curTarget = targetColors[self.colorState.stepIndex];

          if (colorId !== curTarget.id) {
            btn.classList.add('wrong-shake');
            setTimeout(() => btn.classList.remove('wrong-shake'), 500);
            SpeechAudio.speak(`${curTarget.kr} 주세요`, 'ko-KR', null, 'teacher');
            showArtBanner(`Art Teacher asked for ${curTarget.kr} (${curTarget.en}), but you chose ${colorKr}! Try again! 🖌️`, true);
            return;
          }

          // Correct crayon picked!
          const canvas = document.getElementById('art-canvas-frame');
          const splash = document.getElementById('art-canvas-splash');
          const label = document.getElementById('art-canvas-label');

          SpeechAudio.speak(`${colorKr}!`, 'ko-KR', null, 'learner');

          if (canvas) {
            canvas.style.backgroundColor = colorHex;
            canvas.classList.remove('paint-splashed');
            void canvas.offsetWidth;
            canvas.classList.add('paint-splashed');
          }
          if (splash) splash.textContent = '✨🎨🖌️';
          if (label) {
            label.textContent = `${colorKr} (${colorEn}) Painted!`;
            label.style.color = (colorId === 'white') ? '#0f172a' : (colorId === 'black') ? '#ffffff' : '#0f172a';
          }

          showArtBanner(`Brilliant! Painted canvas with ${colorKr} (${colorEn})! 🌟`, false);

          self.colorState.stepIndex++;

          if (self.colorState.stepIndex < targetColors.length) {
            setTimeout(() => {
              updateTargetUI();
            }, 1200);
          } else {
            // Completed all colors!
            setTimeout(() => {
              SpeechAudio.speak('정말 예쁜 그림이에요! 감사합니다!', 'ko-KR', () => {
                const feedbackCard = document.getElementById('etiquette-feedback-card');
                const feedbackTitle = document.getElementById('etiquette-title');
                const feedbackExp = document.getElementById('etiquette-explanation');
                const feedbackNuance = document.getElementById('etiquette-nuance');
                const continueBtn = document.getElementById('etiquette-continue-btn');

                if (feedbackCard) {
                  feedbackCard.className = 'etiquette-feedback-card correct';
                  feedbackTitle.textContent = '아름다운 그림이 완성되었어요! 🎨✨';
                  feedbackExp.textContent = 'You identified Korean color words (빨간색, 파란색, 노란색) and painted a colorful masterpiece canvas with Teacher Park!';
                  feedbackNuance.textContent = '💡 Etiquette tip: Adding "~색" (saek) denotes the color itself. Use "~색 크레파스 주세요" when asking for art supplies.';
                  feedbackCard.style.display = 'flex';

                  continueBtn.style.display = 'inline-flex';
                  continueBtn.textContent = 'Finish Lesson & Collect Star ⭐';
                  continueBtn.onclick = () => {
                    self.finishScenario();
                  };
                }
              }, 'teacher');
            }, 1000);
          }
        });
      });
    },

    /* ==========================================================================
       SCENARIO: BACKPACK SUPPLY CHECK (LESSON 7 - SCHOOL DESK)
       ========================================================================== */
    renderBackpackPack: function (container, scenarioData) {
      if (!container) return;
      const self = this;
      this.backpackState.packedItems = [];

      const deskItems = (scenarioData && scenarioData.deskItems) || [
        { id: 'book', kr: '책', en: 'Book', emoji: '📖', phonetic: 'Chaek', isEssential: true },
        { id: 'pencil', kr: '연필', en: 'Pencil', emoji: '✏️', phonetic: 'Yeon-pil', isEssential: true },
        { id: 'clock', kr: '시계', en: 'Clock / Watch', emoji: '⏰', phonetic: 'Si-gye', isEssential: true },
        { id: 'desk', kr: '책상', en: 'Desk (Too heavy!)', emoji: '🪑', phonetic: 'Chaek-sang', isEssential: false },
        { id: 'school', kr: '학교', en: 'School Building', emoji: '🏫', phonetic: 'Hak-gyo', isEssential: false }
      ];

      const requiredCount = deskItems.filter(item => item.isEssential).length;

      container.innerHTML = `
        <div class="backpack-scenario-container">
          <div class="backpack-station">
            <div class="backpack-visual-target">
              <span class="backpack-icon-huge">🎒</span>
              <div>
                <strong>가방 (School Backpack)</strong>
                <div style="font-size:0.85rem; color:#0369a1;">필요한 학용품 3개를 챙겨요! (Pack 3 items)</div>
              </div>
            </div>
            <div class="backpack-packed-slots" id="backpack-slots-container">
              ${[0, 1, 2].map(i => `<div class="backpack-slot" id="pack-slot-${i}">🎒</div>`).join('')}
            </div>
          </div>

          <div id="backpack-feedback-banner" class="counter-feedback-banner" style="display:none;"></div>

          <div class="desk-shelf-container">
            <span class="desk-shelf-title">책상 (Desk Supplies)</span>
            <div class="desk-items-grid" id="desk-items-grid">
              ${deskItems.map(item => `
                <button type="button" class="desk-item-card" data-item-id="${item.id}" data-item-kr="${item.kr}" data-item-en="${item.en}" data-item-emoji="${item.emoji}" data-essential="${item.isEssential}">
                  <span class="desk-item-emoji">${item.emoji}</span>
                  <span class="desk-item-kr">${item.kr}</span>
                  <span class="desk-item-phonetic">${item.phonetic}</span>
                  <span class="desk-item-en">${item.en}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      function showBackpackBanner(msg, isWarn = false) {
        const banner = document.getElementById('backpack-feedback-banner');
        if (!banner) return;
        banner.className = isWarn ? 'counter-feedback-banner gentle-warn' : 'counter-feedback-banner success';
        banner.textContent = msg;
        banner.style.display = 'flex';
      }

      function updateBackpackSlots() {
        for (let i = 0; i < 3; i++) {
          const slot = document.getElementById(`pack-slot-${i}`);
          if (!slot) continue;
          if (i < self.backpackState.packedItems.length) {
            slot.className = 'backpack-slot filled';
            slot.textContent = self.backpackState.packedItems[i].emoji;
          } else {
            slot.className = 'backpack-slot';
            slot.textContent = '🎒';
          }
        }
      }

      const itemCards = container.querySelectorAll('.desk-item-card');
      itemCards.forEach(card => {
        card.addEventListener('click', () => {
          if (card.classList.contains('packed')) return;

          const itemId = card.getAttribute('data-item-id');
          const itemKr = card.getAttribute('data-item-kr');
          const itemEn = card.getAttribute('data-item-en');
          const itemEmoji = card.getAttribute('data-item-emoji');
          const isEssential = card.getAttribute('data-essential') === 'true';

          if (!isEssential) {
            card.classList.add('wrong-shake');
            setTimeout(() => card.classList.remove('wrong-shake'), 500);
            SpeechAudio.speak('가방에 넣을 수 없어요', 'ko-KR', null, 'mom');
            showBackpackBanner(`Whoops! ${itemKr} (${itemEn}) cannot fit inside your backpack! Pack small study items.`, true);
            return;
          }

          // Pack item
          self.backpackState.packedItems.push({ id: itemId, kr: itemKr, emoji: itemEmoji, en: itemEn });
          card.classList.add('packed');
          SpeechAudio.speak(`${itemKr}! 가방에 넣었어요!`, 'ko-KR', null, 'learner');
          showBackpackBanner(`Packed ${itemKr} (${itemEn}) into your school backpack! ✨`, false);
          updateBackpackSlots();

          if (self.backpackState.packedItems.length >= requiredCount) {
            setTimeout(() => {
              SpeechAudio.speak('가방 준비 완료! 학교 잘 다녀오세요!', 'ko-KR', () => {
                const feedbackCard = document.getElementById('etiquette-feedback-card');
                const feedbackTitle = document.getElementById('etiquette-title');
                const feedbackExp = document.getElementById('etiquette-explanation');
                const feedbackNuance = document.getElementById('etiquette-nuance');
                const continueBtn = document.getElementById('etiquette-continue-btn');

                if (feedbackCard) {
                  feedbackCard.className = 'etiquette-feedback-card correct';
                  feedbackTitle.textContent = '등교 준비 완료! 🎒🏫 (Backpack Packed!)';
                  feedbackExp.textContent = 'You identified essential stationery words (책 Book, 연필 Pencil, 시계 Clock) and packed your school bag with full confidence!';
                  feedbackNuance.textContent = '💡 Etiquette tip: In Korean schools, organizing your desk and backpack neatly is an important daily habit called "정리정돈" (organizing well).';
                  feedbackCard.style.display = 'flex';

                  continueBtn.style.display = 'inline-flex';
                  continueBtn.textContent = 'Finish Lesson & Collect Star ⭐';
                  continueBtn.onclick = () => {
                    self.finishScenario();
                  };
                }
              }, 'mom');
            }, 800);
          }
        });
      });
    },

    /* ==========================================================================
       SCENARIO: EMOTION & FEELING CHECK-IN (LESSON 8 - PLAYGROUND)
       ========================================================================== */
    renderEmotionCheck: function (container, scenarioData) {
      if (!container) return;
      const self = this;
      this.emotionState.selectedEmotion = null;

      const emotions = (scenarioData && scenarioData.emotions) || [
        { id: 'happy', kr: '행복해요', en: 'Happy', emoji: '😊', phonetic: 'Haeng-bok-hae-yo', response: '우와, 정말 멋져요! 같이 신나게 놀아요!' },
        { id: 'tired', kr: '피곤해요', en: 'Tired / Sleepy', emoji: '😴', phonetic: 'Pi-gon-hae-yo', response: '그렇군요! 벤치에서 조금 쉬어요, 괜찮아요!' },
        { id: 'excited', kr: '신나요', en: 'Excited / Fun', emoji: '🥳', phonetic: 'Sin-na-yo', response: '최고예요! 그네 타러 갈까요?' },
        { id: 'good', kr: '좋아요', en: 'Good / Feeling well', emoji: '👍', phonetic: 'Jo-a-yo', response: '좋은 하루예요! 힘차게 보내요!' }
      ];

      const minjunSvg = (typeof AvatarEngine !== 'undefined')
        ? AvatarEngine.renderCharacterAvatar('MinjunVoxel')
        : '👦';

      container.innerHTML = `
        <div class="emotion-scenario-container">
          <div class="emotion-stage-header">
            <div class="emotion-buddy-avatar" id="emotion-minjun-avatar">${minjunSvg}</div>
            <div>
              <strong style="color:#065f46;">Min-jun (민준)</strong>
              <div style="font-size:0.9rem; color:#047857;">"오늘 기분이 어때요?" (How do you feel today?)</div>
            </div>
          </div>

          <div id="emotion-feedback-banner" class="counter-feedback-banner" style="display:none;"></div>

          <div class="emotion-cards-grid" id="emotion-cards-grid">
            ${emotions.map(e => `
              <button type="button" class="emotion-card-btn" data-emotion-id="${e.id}" data-emotion-kr="${e.kr}" data-emotion-en="${e.en}" data-emotion-response="${e.response}">
                <span class="emotion-card-emoji">${e.emoji}</span>
                <div class="emotion-card-details">
                  <span class="emotion-card-kr">${e.kr}</span>
                  <span class="emotion-card-phonetic">${e.phonetic}</span>
                  <span class="emotion-card-en">${e.en}</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      function showEmotionBanner(msg) {
        const banner = document.getElementById('emotion-feedback-banner');
        if (!banner) return;
        banner.className = 'counter-feedback-banner success';
        banner.textContent = msg;
        banner.style.display = 'flex';
      }

      const emotionBtns = container.querySelectorAll('.emotion-card-btn');
      emotionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          emotionBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');

          const emotionId = btn.getAttribute('data-emotion-id');
          const emotionKr = btn.getAttribute('data-emotion-kr');
          const emotionEn = btn.getAttribute('data-emotion-en');
          const responseText = btn.getAttribute('data-emotion-response');

          self.emotionState.selectedEmotion = emotionId;

          // Learner speaks their emotion
          SpeechAudio.speak(`저는 오늘 ${emotionKr}!`, 'ko-KR', () => {
            showEmotionBanner(`Min-jun says: "${responseText}"`);

            // Min-jun responds empathetically
            setTimeout(() => {
              SpeechAudio.speak(responseText, 'ko-KR', () => {
                const feedbackCard = document.getElementById('etiquette-feedback-card');
                const feedbackTitle = document.getElementById('etiquette-title');
                const feedbackExp = document.getElementById('etiquette-explanation');
                const feedbackNuance = document.getElementById('etiquette-nuance');
                const continueBtn = document.getElementById('etiquette-continue-btn');

                if (feedbackCard) {
                  feedbackCard.className = 'etiquette-feedback-card correct';
                  feedbackTitle.textContent = '따뜻한 마음을 나누었어요! 🤝✨';
                  feedbackExp.textContent = `You honestly shared your feeling with "${emotionKr}" (${emotionEn}). Min-jun listened attentively and supported your mood!`;
                  feedbackNuance.textContent = '💡 Etiquette tip: Asking "기분이 어때요?" and replying with polite "~해요 / ~아요" is the fundamental building block of Korean peer empathy.';
                  feedbackCard.style.display = 'flex';

                  continueBtn.style.display = 'inline-flex';
                  continueBtn.textContent = 'Finish Lesson & Collect Star ⭐';
                  continueBtn.onclick = () => {
                    self.finishScenario();
                  };
                }
              }, 'minjun');
            }, 600);
          }, 'learner');
        });
      });
    },

    /* ==========================================================================
       SCENARIO: BODY TAP / HEALTH CHECK (LESSON 9 - CLINIC SIMON SAYS)
       ========================================================================== */
    renderBodyTap: function (container, scenarioData) {
      if (!container) return;
      const self = this;
      this.bodyState.stepIndex = 0;
      this.bodyState.tappedParts = [];

      const targets = (scenarioData && scenarioData.targets) || [
        { id: 'eyes', kr: '눈', en: 'Eye', emoji: '👀', phonetic: 'Nun', promptKr: '눈을 가리켜 보세요!' },
        { id: 'nose', kr: '코', en: 'Nose', emoji: '👃', phonetic: 'Ko', promptKr: '코를 가리켜 보세요!' },
        { id: 'mouth', kr: '입', en: 'Mouth', emoji: '👄', phonetic: 'Ip', promptKr: '입을 가리켜 보세요!' },
        { id: 'ears', kr: '귀', en: 'Ear', emoji: '👂', phonetic: 'Gwi', promptKr: '귀를 가리켜 보세요!' },
        { id: 'hands', kr: '손', en: 'Hand', emoji: '✋', phonetic: 'Son', promptKr: '손을 가리켜 보세요!' }
      ];

      const nurseSvg = (typeof AvatarEngine !== 'undefined')
        ? AvatarEngine.renderCharacterAvatar('NurseSong')
        : '👩‍⚕️';

      const learnerSvg = (typeof AvatarEngine !== 'undefined')
        ? AvatarEngine.renderCharacterAvatar('LearnerBody', { scale: 1.1 })
        : '🧑';

      container.innerHTML = `
        <div class="body-scenario-container">
          <div class="clinic-nurse-bar">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.8rem;">🩺</span>
              <div>
                <strong>Nurse Song (송 선생님)</strong>
                <div style="font-size:0.85rem; color:#1d4ed8;" id="clinic-prompt-display">"눈을 가리켜 보세요!" (Point to eyes!)</div>
              </div>
            </div>
            <div class="art-mission-badge" id="clinic-progress-badge">Step 1 / ${targets.length}</div>
          </div>

          <div id="body-feedback-banner" class="counter-feedback-banner" style="display:none;"></div>

          <div class="body-diagram-stage">
            <div class="body-avatar-large" id="body-avatar-large">${learnerSvg}</div>
            <div class="body-parts-grid" id="body-parts-grid">
              ${targets.map(part => `
                <button type="button" class="body-part-btn" data-part-id="${part.id}" data-part-kr="${part.kr}" data-part-en="${part.en}">
                  <span class="body-part-icon">${part.emoji}</span>
                  <span class="body-part-kr">${part.kr}</span>
                  <span class="body-part-phonetic">${part.phonetic}</span>
                  <span class="body-part-en">${part.en}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      function showBodyBanner(msg, isWarn = false) {
        const banner = document.getElementById('body-feedback-banner');
        if (!banner) return;
        banner.className = isWarn ? 'counter-feedback-banner gentle-warn' : 'counter-feedback-banner success';
        banner.textContent = msg;
        banner.style.display = 'flex';
      }

      function updateClinicStep() {
        const curTarget = targets[self.bodyState.stepIndex];
        const promptDisplay = document.getElementById('clinic-prompt-display');
        const badge = document.getElementById('clinic-progress-badge');

        if (promptDisplay && curTarget) {
          promptDisplay.textContent = `"${curTarget.promptKr}" (${curTarget.promptEn || 'Point to ' + curTarget.en + '!'})`;
          SpeechAudio.speak(curTarget.promptKr, 'ko-KR', null, 'nurse');
        }
        if (badge) {
          badge.textContent = `Step ${self.bodyState.stepIndex + 1} / ${targets.length}`;
        }
      }

      const partBtns = container.querySelectorAll('.body-part-btn');
      partBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const partId = btn.getAttribute('data-part-id');
          const partKr = btn.getAttribute('data-part-kr');
          const partEn = btn.getAttribute('data-part-en');
          const curTarget = targets[self.bodyState.stepIndex];

          if (partId !== curTarget.id) {
            btn.classList.add('wrong-shake');
            setTimeout(() => btn.classList.remove('wrong-shake'), 500);
            SpeechAudio.speak(`${curTarget.kr}을 가리켜 보세요`, 'ko-KR', null, 'nurse');
            showBodyBanner(`Nurse asked for ${curTarget.kr} (${curTarget.en}), but you tapped ${partKr}! Try again!`, true);
            return;
          }

          // Correct body part tapped!
          btn.classList.add('correct-tap');
          SpeechAudio.speak(`여기 ${partKr}이에요!`, 'ko-KR', null, 'learner');
          showBodyBanner(`Correct! Found "${partKr}" (${partEn})! ✨`, false);

          self.bodyState.stepIndex++;

          if (self.bodyState.stepIndex < targets.length) {
            setTimeout(() => {
              updateClinicStep();
            }, 1200);
          } else {
            // Health check complete!
            setTimeout(() => {
              SpeechAudio.speak('건강 검진 완벽해요! 아주 잘했어요!', 'ko-KR', () => {
                const feedbackCard = document.getElementById('etiquette-feedback-card');
                const feedbackTitle = document.getElementById('etiquette-title');
                const feedbackExp = document.getElementById('etiquette-explanation');
                const feedbackNuance = document.getElementById('etiquette-nuance');
                const continueBtn = document.getElementById('etiquette-continue-btn');

                if (feedbackCard) {
                  feedbackCard.className = 'etiquette-feedback-card correct';
                  feedbackTitle.textContent = '건강 검진 완료! 🩺 Champion!';
                  feedbackExp.textContent = 'You accurately pointed to all 5 Korean body senses (눈 Eyes, 코 Nose, 입 Mouth, 귀 Ears, 손 Hands) without hesitation!';
                  feedbackNuance.textContent = '💡 Linguistic tip: Korean body words are compact one-syllable native Korean words (눈, 코, 입, 귀, 손, 발) fundamental to everyday health and sensory expressions.';
                  feedbackCard.style.display = 'flex';

                  continueBtn.style.display = 'inline-flex';
                  continueBtn.textContent = 'Finish Lesson & Collect Star ⭐';
                  continueBtn.onclick = () => {
                    self.finishScenario();
                  };
                }
              }, 'nurse');
            }, 1000);
          }
        });
      });
    },

    handleOptionSelect: function (opt, btnElement, turn) {
      const feedbackCard = document.getElementById('etiquette-feedback-card');
      const feedbackTitle = document.getElementById('etiquette-title');
      const feedbackExp = document.getElementById('etiquette-explanation');
      const feedbackNuance = document.getElementById('etiquette-nuance');
      const continueBtn = document.getElementById('etiquette-continue-btn');

      if (!feedbackCard) return;

      // Speak chosen phrase
      SpeechAudio.speak(opt.korean, 'ko-KR', null, 'learner');

      if (opt.isCorrect) {
        btnElement.classList.add('correct');
        // Disable other buttons
        document.querySelectorAll('.scenario-option-btn').forEach(b => (b.disabled = true));

        feedbackCard.className = 'etiquette-feedback-card correct';
        feedbackTitle.textContent = opt.feedback.title || 'Spot on! 🌟';
        feedbackExp.textContent = opt.feedback.explanation || '';
        feedbackNuance.textContent = `💡 Etiquette tip: ${opt.feedback.socialNuance || 'Great polite phrase!'}`;
        feedbackCard.style.display = 'flex';

        continueBtn.style.display = 'inline-flex';
        continueBtn.textContent = 'Continue ▶';
        continueBtn.onclick = () => {
          this.presentTurn(this.currentTurnIndex + 1);
        };
      } else {
        // Shake button for instant gentle retry
        btnElement.classList.add('wrong-shake');
        setTimeout(() => {
          btnElement.classList.remove('wrong-shake');
        }, 500);

        feedbackCard.className = 'etiquette-feedback-card incorrect';
        feedbackTitle.textContent = opt.feedback.title || 'Too casual or not quite! ⚠️';
        feedbackExp.textContent = opt.feedback.explanation || '';
        feedbackNuance.textContent = `💡 Etiquette tip: ${opt.feedback.socialNuance || 'Notice the politeness level!'}`;
        feedbackCard.style.display = 'flex';
        continueBtn.style.display = 'none'; // keep learner in choice state to retry
      }
    },

    triggerConfetti: function () {
      const stage = document.getElementById('scenario-stage') || document.body;
      const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];
      for (let i = 0; i < 40; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = `${Math.random() * 0.8}s`;
        piece.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
        stage.appendChild(piece);
        setTimeout(() => piece.remove(), 3200);
      }
    },

    finishScenario: function () {
      const arena = document.getElementById('dialogue-arena');
      const completionCard = document.getElementById('scenario-completion-card');
      const feedbackCard = document.getElementById('etiquette-feedback-card');

      if (arena) arena.style.display = 'none';
      if (feedbackCard) feedbackCard.style.display = 'none';
      if (completionCard) completionCard.style.display = 'flex';

      const lesson = this.currentLesson;
      const completion = lesson.scenario ? lesson.scenario.completion : null;

      const badge = document.getElementById('scenario-badge');
      const title = document.getElementById('scenario-completion-title');
      const summary = document.getElementById('scenario-completion-summary');
      const rewardPill = document.getElementById('scenario-reward-pill');

      if (badge) badge.textContent = completion ? completion.badge : '🏆';
      if (title) title.textContent = completion ? completion.title : 'Scenario Accomplished!';
      if (summary) summary.textContent = completion ? completion.summary : 'You completed the conversational exchange!';
      if (rewardPill) rewardPill.textContent = completion ? completion.rewardText : '⭐ 1 Star Earned in this Lesson!';

      // Celebration confetti effect
      this.triggerConfetti();

      // Record scenario completion and award star in ProfileManager
      ProfileManager.recordScenarioCompletion(lesson.id);

      UIController.updateHeaderProfile();
      UIController.updateSidebarLessons();
      UIController.updateLessonHeroStars(lesson.id);
    }
  };

  /* ==========================================================================
     4. AUTO-PLAY ENGINE
     ========================================================================== */
  const AutoPlayEngine = {
    isPlaying: false,
    timerId: null,

    start: function () {
      if (this.isPlaying) return;
      this.isPlaying = true;
      UIController.updateAutoPlayUI(true);
      this.playCurrentCard();
    },

    stop: function () {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      this.clearCurrentTimer();
      SpeechAudio.stop();
      UIController.updateAutoPlayUI(false);
    },

    toggle: function () {
      if (this.isPlaying) {
        this.stop();
      } else {
        this.start();
      }
    },

    clearCurrentTimer: function () {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    },

    playCurrentCard: function () {
      if (!this.isPlaying) return;

      const lesson = LessonRepository.getLesson(UIController.currentLessonIndex);
      if (!lesson || !lesson.words || lesson.words.length === 0) {
        this.stop();
        return;
      }

      const word = lesson.words[UIController.currentWordIndex];

      // 1. Ensure card shows Front face (Korean)
      UIController.setCardFlipped(false);

      // 2. Speak Korean word
      SpeechAudio.speak(word.korean, 'ko-KR', () => {
        if (!this.isPlaying) return;

        // 3. Pause 600ms before flip
        this.timerId = setTimeout(() => {
          if (!this.isPlaying) return;

          // 4. Flip to Back face (English)
          UIController.setCardFlipped(true);

          // Give CSS 3D transform 400ms to reveal before speaking English
          this.timerId = setTimeout(() => {
            if (!this.isPlaying) return;

            // 5. Speak English translation
            SpeechAudio.speak(word.english, 'en-US', () => {
              if (!this.isPlaying) return;

              // 6. Pause 1200ms for learner retention
              this.timerId = setTimeout(() => {
                if (!this.isPlaying) return;

                // Check if this was the last word of the lesson
                const isLastWord = UIController.currentWordIndex >= lesson.words.length - 1;

                if (isLastWord) {
                  this.stop();
                  UIController.setCardFlipped(false);
                  UIController.showToast('🎉 Awesome! You completed all cards in this lesson!');
                } else {
                  UIController.nextCard(false);
                  this.timerId = setTimeout(() => {
                    this.playCurrentCard();
                  }, 400);
                }
              }, 1200);
            });
          }, 400);
        }, 600);
      });
    }
  };

  /* ==========================================================================
     5. QUIZ ENGINE
     ========================================================================== */
  const QuizEngine = {
    currentLessonId: null,
    currentWord: null,
    questions: [],
    questionIndex: 0,
    roundLength: 5,
    roundScore: 0,
    isSubmitting: false,

    initQuiz: function (lesson) {
      this.currentLessonId = lesson.id;
      this.roundScore = 0;
      this.questionIndex = 0;
      this.isSubmitting = false;

      UIController.showQuizQuestionView();

      const words = [...lesson.words];
      words.sort(() => 0.5 - Math.random());

      let questionList = words.slice(0, 5);
      if (questionList.length < 5 && words.length > 0) {
        while (questionList.length < 5) {
          const extra = words[Math.floor(Math.random() * words.length)];
          questionList.push(extra);
        }
      }

      this.questions = questionList;
      this.roundLength = this.questions.length;

      this.presentQuestion(lesson);
    },

    presentQuestion: function (lesson) {
      if (this.questionIndex >= this.roundLength) {
        this.finishRound(lesson);
        return;
      }

      this.isSubmitting = false;
      const targetWord = this.questions[this.questionIndex];
      this.currentWord = targetWord;

      // Select 3 distractors
      let pool = [];
      lesson.words.forEach(w => {
        if (w.english !== targetWord.english) pool.push(w.english);
      });

      const allLessons = LessonRepository.getAll();
      if (pool.length < 3 && allLessons.length > 0) {
        allLessons.forEach(les => {
          les.words.forEach(w => {
            if (w.english !== targetWord.english && !pool.includes(w.english)) {
              pool.push(w.english);
            }
          });
        });
      }

      pool.sort(() => 0.5 - Math.random());
      const distractors = pool.slice(0, 3);

      const options = [targetWord.english, ...distractors];
      options.sort(() => 0.5 - Math.random());

      UIController.renderQuizQuestion(
        targetWord,
        options,
        this.questionIndex + 1,
        this.roundLength
      );
    },

    submitAnswer: function (selectedEnglish, btnElement, lesson) {
      if (this.isSubmitting) return;
      this.isSubmitting = true;

      const isCorrect = selectedEnglish === this.currentWord.english;
      const allButtons = document.querySelectorAll('.quiz-opt-btn');
      allButtons.forEach(b => (b.disabled = true));

      const feedback = document.getElementById('quiz-feedback-msg');

      if (isCorrect) {
        btnElement.classList.add('correct');
        this.roundScore += 1;

        feedback.textContent = '🎉 Great job! Correct meaning!';
        feedback.style.color = '#15803d';

        setTimeout(() => {
          this.questionIndex += 1;
          this.presentQuestion(lesson);
        }, 1100);
      } else {
        btnElement.classList.add('wrong');
        allButtons.forEach(b => {
          if (b.textContent === this.currentWord.english) {
            b.classList.add('correct');
          }
        });

        feedback.textContent = `Keep going! The answer was "${this.currentWord.english}". 💪`;
        feedback.style.color = '#b91c1c';

        setTimeout(() => {
          this.questionIndex += 1;
          this.presentQuestion(lesson);
        }, 1500);
      }
    },

    finishRound: function (lesson) {
      const results = ProfileManager.recordQuizCompletion(
        this.currentLessonId,
        this.roundScore,
        this.roundLength
      );

      UIController.updateHeaderProfile();
      UIController.updateSidebarLessons();
      UIController.updateLessonHeroStars(lesson.id);
      UIController.renderQuizResults(results, lesson);
    }
  };

  /* ==========================================================================
     6. UI CONTROLLER & APP ORCHESTRATION
     ========================================================================== */
  const UIController = {
    currentLessonIndex: 0,
    currentWordIndex: 0,
    activeTab: 'scenario', // Default primary view is 'scenario'
    selectedAvatar: DEFAULT_AVATARS[0],

    init: async function () {
      SpeechAudio.init();
      this.bindEvents();

      await LessonRepository.load();

      const hasProfiles = ProfileManager.init();
      if (!hasProfiles) {
        this.openOnboardingModal();
      } else {
        this.updateHeaderProfile();
        this.loadLesson(0);
      }
    },

    bindEvents: function () {
      // Universal Slide-Out Drawer Toggle
      const drawerBtn = document.getElementById('drawer-toggle-btn');
      const drawerCloseBtn = document.getElementById('drawer-close-btn');
      const drawer = document.getElementById('sidebar-nav');
      const backdrop = document.getElementById('sidebar-backdrop');

      const toggleDrawer = () => {
        if (drawer && backdrop) {
          drawer.classList.toggle('open');
          backdrop.classList.toggle('open');
        }
      };

      const closeDrawer = () => {
        if (drawer && backdrop) {
          drawer.classList.remove('open');
          backdrop.classList.remove('open');
        }
      };

      if (drawerBtn) drawerBtn.addEventListener('click', toggleDrawer);
      if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
      if (backdrop) backdrop.addEventListener('click', closeDrawer);

      // Profile Pill Click -> Switcher Modal
      const profilePill = document.getElementById('profile-pill-btn');
      if (profilePill) {
        profilePill.addEventListener('click', () => {
          AutoPlayEngine.stop();
          this.openProfileSwitcherModal();
        });
      }

      // Avatar selection in onboarding modal
      const avatarContainer = document.getElementById('onboard-avatar-options');
      if (avatarContainer) {
        avatarContainer.innerHTML = '';
        PROCEDURAL_AVATAR_OPTIONS.forEach((opt, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `avatar-opt ${i === 0 ? 'selected' : ''}`;

          let avatarVal = opt.emoji;
          let svgContent = '';
          if (opt.type === 'voxel' && typeof AvatarEngine !== 'undefined') {
            avatarVal = `seed:${opt.seed}`;
            svgContent = AvatarEngine.renderCharacterAvatar(opt.seed);
          } else if (opt.type === 'companion' && typeof AvatarEngine !== 'undefined') {
            avatarVal = `companion:${opt.style}:${opt.seed}`;
            svgContent = AvatarEngine.renderCompanionAvatar(opt.style, opt.seed);
          }

          if (i === 0) {
            this.selectedAvatar = avatarVal;
          }

          btn.innerHTML = `
            <div class="avatar-opt-svg">${svgContent || opt.emoji}</div>
            <span class="avatar-opt-label">${opt.name.split(' ')[0]}</span>
          `;

          btn.onclick = () => {
            document.querySelectorAll('#onboard-avatar-options .avatar-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            this.selectedAvatar = avatarVal;
          };
          avatarContainer.appendChild(btn);
        });
      }

      // Form submit: Onboarding
      const onboardForm = document.getElementById('onboard-profile-form');
      if (onboardForm) {
        onboardForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const nameInput = document.getElementById('onboard-name-input');
          const name = nameInput ? nameInput.value.trim() : 'Learner';
          ProfileManager.createProfile(name || 'Learner', this.selectedAvatar);
          this.closeModal('onboard-modal');
          this.updateHeaderProfile();
          this.loadLesson(0);
          this.showToast(`Welcome, ${name || 'Learner'}! Let's practice Korean! 👋`);
        });
      }

      // Guest button in onboarding
      const guestBtn = document.getElementById('onboard-guest-btn');
      if (guestBtn) {
        guestBtn.addEventListener('click', () => {
          ProfileManager.createGuestProfile();
          this.closeModal('onboard-modal');
          this.updateHeaderProfile();
          this.loadLesson(0);
          this.showToast("Welcome! You are learning as Guest 🐯");
        });
      }

      // Card Flip via click
      const card = document.getElementById('flashcard');
      if (card) {
        card.addEventListener('click', (e) => {
          if (e.target.closest('#card-audio-en-btn')) {
            return;
          }
          if (AutoPlayEngine.isPlaying) {
            AutoPlayEngine.stop();
          }
          this.flipCard();
        });
      }

      // Back Face English audio button
      const backEnBtn = document.getElementById('card-audio-en-btn');
      if (backEnBtn) {
        backEnBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (AutoPlayEngine.isPlaying) {
            AutoPlayEngine.stop();
          }
          this.speakCurrentWordEnglish();
        });
      }

      // Flashcard Navigation Buttons
      const nextBtn = document.getElementById('card-next-btn');
      const prevBtn = document.getElementById('card-prev-btn');
      const audioBtn = document.getElementById('card-audio-btn');
      const ctrlAudioEnBtn = document.getElementById('card-ctrl-audio-en-btn');
      const autoPlayBtn = document.getElementById('card-autoplay-btn');

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          AutoPlayEngine.stop();
          this.nextCard();
        });
      }
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          AutoPlayEngine.stop();
          this.prevCard();
        });
      }
      if (audioBtn) {
        audioBtn.addEventListener('click', () => {
          AutoPlayEngine.stop();
          this.speakCurrentWordKorean();
        });
      }
      if (ctrlAudioEnBtn) {
        ctrlAudioEnBtn.addEventListener('click', () => {
          AutoPlayEngine.stop();
          this.speakCurrentWordEnglish();
        });
      }
      if (autoPlayBtn) {
        autoPlayBtn.addEventListener('click', () => {
          AutoPlayEngine.toggle();
        });
      }

      // Secondary Study Mode Tabs
      const tabBtns = document.querySelectorAll('.mode-tabs .tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          this.switchTab(tab);
        });
      });

      // Window blur & Visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && AutoPlayEngine.isPlaying) {
          AutoPlayEngine.stop();
        }
      });
      window.addEventListener('blur', () => {
        if (AutoPlayEngine.isPlaying) {
          AutoPlayEngine.stop();
        }
      });

      // Keyboard navigation
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (this.activeTab === 'cards') {
          if (e.key === 'ArrowRight') {
            AutoPlayEngine.stop();
            this.nextCard();
          } else if (e.key === 'ArrowLeft') {
            AutoPlayEngine.stop();
            this.prevCard();
          } else if (e.key === ' ') {
            e.preventDefault();
            AutoPlayEngine.stop();
            this.flipCard();
          }
        }
      });

      // Quiz Completion Card Buttons
      const nextLessonBtn = document.getElementById('quiz-next-lesson-btn');
      if (nextLessonBtn) {
        nextLessonBtn.addEventListener('click', () => {
          this.advanceToNextLesson();
        });
      }

      const retakeQuizBtn = document.getElementById('quiz-retake-btn');
      if (retakeQuizBtn) {
        retakeQuizBtn.addEventListener('click', () => {
          const lesson = LessonRepository.getLesson(this.currentLessonIndex);
          if (lesson) {
            QuizEngine.initQuiz(lesson);
          }
        });
      }

      const reviewCardsBtn = document.getElementById('quiz-review-cards-btn');
      if (reviewCardsBtn) {
        reviewCardsBtn.addEventListener('click', () => {
          this.switchTab('cards');
        });
      }

      // Scenario Completion Card Actions
      const scenarioTryQuizBtn = document.getElementById('scenario-try-quiz-btn');
      if (scenarioTryQuizBtn) {
        scenarioTryQuizBtn.addEventListener('click', () => {
          this.switchTab('quiz');
        });
      }

      const scenarioReplayBtn = document.getElementById('scenario-replay-btn');
      if (scenarioReplayBtn) {
        scenarioReplayBtn.addEventListener('click', () => {
          const lesson = LessonRepository.getLesson(this.currentLessonIndex);
          if (lesson) {
            ScenarioEngine.initScenario(lesson);
          }
        });
      }

      const scenarioStudyCardsBtn = document.getElementById('scenario-study-cards-btn');
      if (scenarioStudyCardsBtn) {
        scenarioStudyCardsBtn.addEventListener('click', () => {
          this.switchTab('cards');
        });
      }
    },

    loadLesson: function (lessonIndex) {
      const lesson = LessonRepository.getLesson(lessonIndex);
      if (!lesson) return;

      AutoPlayEngine.stop();

      this.currentLessonIndex = lessonIndex;
      this.currentWordIndex = 0;

      // Update Top Drawer Trigger Pill
      const pillLabel = document.getElementById('current-lesson-pill-label');
      if (pillLabel) {
        pillLabel.textContent = `${lesson.number}. ${lesson.goal ? lesson.goal.slice(0, 22) + (lesson.goal.length > 22 ? '…' : '') : lesson.title}`;
      }

      // Update Hero Bar
      const goalElem = document.getElementById('lesson-hero-goal');
      const titleElem = document.getElementById('lesson-hero-title');

      if (goalElem) goalElem.textContent = lesson.goal || lesson.category;
      if (titleElem) titleElem.textContent = `${lesson.icon} ${lesson.title}`;

      this.updateLessonHeroStars(lesson.id);

      // Render primary scenario engine
      ScenarioEngine.initScenario(lesson);

      // Render other views
      this.updateCardView();
      this.renderVocabGrid(lesson);
      this.updateSidebarLessons();

      // Switch to scenario tab by default
      this.switchTab(this.activeTab || 'scenario');

      // Close drawer if open
      const drawer = document.getElementById('sidebar-nav');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (drawer && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
      }
    },

    advanceToNextLesson: function () {
      const totalLessons = LessonRepository.count();
      if (this.currentLessonIndex + 1 < totalLessons) {
        this.loadLesson(this.currentLessonIndex + 1);
        this.switchTab('scenario');
        this.showToast(`Ready for Lesson ${this.currentLessonIndex + 1}! Let's go! 🚀`);
      } else {
        this.loadLesson(0);
        this.switchTab('scenario');
        this.showToast('🎉 You completed the curriculum! Starting review at Lesson 1!');
      }
    },

    updateLessonHeroStars: function (lessonId) {
      const starsElem = document.getElementById('lesson-banner-stars');
      if (!starsElem) return;
      const lessonStars = ProfileManager.getLessonStars(lessonId);
      starsElem.textContent = `⭐ ${lessonStars}/3`;
      starsElem.title = `${lessonStars} of 3 Stars earned in this lesson`;
    },

    updateCardView: function () {
      const lesson = LessonRepository.getLesson(this.currentLessonIndex);
      if (!lesson || !lesson.words || !lesson.words[this.currentWordIndex]) return;

      const word = lesson.words[this.currentWordIndex];

      const card = document.getElementById('flashcard');
      if (card) card.classList.remove('is-flipped');

      const frontEmoji = document.getElementById('card-front-emoji');
      const backEmoji = document.getElementById('card-back-emoji');
      const koreanText = document.getElementById('card-korean-text');
      const phoneticText = document.getElementById('card-phonetic-text');
      const englishText = document.getElementById('card-english-text');
      const factText = document.getElementById('card-fact-text');

      if (frontEmoji) frontEmoji.textContent = word.emoji;
      if (backEmoji) backEmoji.textContent = word.emoji;
      if (koreanText) koreanText.textContent = word.korean;
      if (phoneticText) phoneticText.textContent = word.phonetic;
      if (englishText) englishText.textContent = word.english;
      if (factText) factText.textContent = `💡 ${word.fact}`;

      const progressFill = document.getElementById('card-progress-fill');
      const counterText = document.getElementById('card-counter-label');
      const percent = ((this.currentWordIndex + 1) / lesson.words.length) * 100;

      if (progressFill) progressFill.style.width = `${percent}%`;
      if (counterText) counterText.textContent = `Word ${this.currentWordIndex + 1} of ${lesson.words.length}`;

      ProfileManager.recordCardView(lesson.id, this.currentWordIndex);
      this.updateSidebarLessons();
    },

    setCardFlipped: function (flipped) {
      const card = document.getElementById('flashcard');
      if (!card) return;
      if (flipped) {
        card.classList.add('is-flipped');
      } else {
        card.classList.remove('is-flipped');
      }
    },

    flipCard: function () {
      const card = document.getElementById('flashcard');
      if (card) card.classList.toggle('is-flipped');
    },

    nextCard: function (resetFlip = true) {
      const lesson = LessonRepository.getLesson(this.currentLessonIndex);
      if (!lesson) return;
      this.currentWordIndex = (this.currentWordIndex + 1) % lesson.words.length;
      this.updateCardView();
      if (!resetFlip) {
        this.setCardFlipped(false);
      }
    },

    prevCard: function () {
      const lesson = LessonRepository.getLesson(this.currentLessonIndex);
      if (!lesson) return;
      this.currentWordIndex = (this.currentWordIndex - 1 + lesson.words.length) % lesson.words.length;
      this.updateCardView();
    },

    speakCurrentWordKorean: function () {
      const lesson = LessonRepository.getLesson(this.currentLessonIndex);
      if (!lesson) return;
      const word = lesson.words[this.currentWordIndex];
      SpeechAudio.speak(word.korean, 'ko-KR');
    },

    speakCurrentWordEnglish: function () {
      const lesson = LessonRepository.getLesson(this.currentLessonIndex);
      if (!lesson) return;
      const word = lesson.words[this.currentWordIndex];
      SpeechAudio.speak(word.english, 'en-US');
    },

    updateAutoPlayUI: function (isPlaying) {
      const btn = document.getElementById('card-autoplay-btn');
      const card = document.getElementById('flashcard');

      if (btn) {
        btn.classList.toggle('playing', isPlaying);
        const icon = btn.querySelector('.autoplay-icon');
        const label = btn.querySelector('.autoplay-label');
        if (icon) icon.textContent = isPlaying ? '⏹' : '▶';
        if (label) label.textContent = isPlaying ? 'Stop' : 'Auto';
        btn.setAttribute('aria-label', isPlaying ? 'Stop Auto-Play' : 'Start Auto-Play');
      }

      if (card) {
        card.classList.toggle('is-autoplay-active', isPlaying);
      }
    },

    switchTab: function (tabId) {
      AutoPlayEngine.stop();
      this.activeTab = tabId;

      document.querySelectorAll('.mode-tabs .tab-btn').forEach(btn => {
        const isCurrent = btn.getAttribute('data-tab') === tabId;
        btn.classList.toggle('active', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });

      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

      if (tabId === 'scenario') {
        const scenarioView = document.getElementById('scenario-view');
        if (scenarioView) scenarioView.classList.add('active');
      } else if (tabId === 'cards') {
        const cardsView = document.getElementById('cards-view');
        if (cardsView) cardsView.classList.add('active');
        this.updateCardView();
      } else if (tabId === 'quiz') {
        const quizView = document.getElementById('quiz-view');
        if (quizView) quizView.classList.add('active');
        const lesson = LessonRepository.getLesson(this.currentLessonIndex);
        if (lesson) QuizEngine.initQuiz(lesson);
      } else if (tabId === 'all') {
        const allView = document.getElementById('all-view');
        if (allView) allView.classList.add('active');
      }
    },

    showQuizQuestionView: function () {
      const qContainer = document.getElementById('quiz-question-container');
      const rContainer = document.getElementById('quiz-results-container');
      if (qContainer) qContainer.style.display = 'block';
      if (rContainer) rContainer.style.display = 'none';
    },

    renderQuizQuestion: function (word, options, questionNumber, totalQuestions) {
      this.showQuizQuestionView();

      const krTarget = document.getElementById('quiz-kr-text');
      const feedback = document.getElementById('quiz-feedback-msg');
      const container = document.getElementById('quiz-options-container');
      const roundIndicator = document.getElementById('quiz-round-indicator');
      const progressFill = document.getElementById('quiz-progress-fill');
      const starsDisplay = document.getElementById('quiz-stars-display');

      if (krTarget) krTarget.textContent = word.korean;
      if (feedback) {
        feedback.textContent = 'Pick the correct English translation!';
        feedback.style.color = '#64748b';
      }

      if (roundIndicator) {
        roundIndicator.textContent = `Question ${questionNumber} of ${totalQuestions}`;
      }

      if (progressFill) {
        const percent = ((questionNumber - 1) / totalQuestions) * 100;
        progressFill.style.width = `${percent}%`;
      }

      const lesson = LessonRepository.getLesson(this.currentLessonIndex);
      if (starsDisplay && lesson) {
        const stars = ProfileManager.getLessonStars(lesson.id);
        starsDisplay.textContent = `⭐ Lesson Stars: ${stars}/3`;
      }

      if (container) {
        container.innerHTML = '';
        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'quiz-opt-btn';
          btn.textContent = opt;
          btn.onclick = () => QuizEngine.submitAnswer(opt, btn, lesson);
          container.appendChild(btn);
        });
      }

      const quizSoundBtn = document.getElementById('quiz-sound-mini');
      if (quizSoundBtn) {
        quizSoundBtn.onclick = () => SpeechAudio.speak(word.korean, 'ko-KR');
      }
    },

    renderQuizResults: function (results, lesson) {
      const qContainer = document.getElementById('quiz-question-container');
      const rContainer = document.getElementById('quiz-results-container');
      if (qContainer) qContainer.style.display = 'none';
      if (rContainer) rContainer.style.display = 'block';

      const scoreElem = document.getElementById('quiz-result-score');
      const starsElem = document.getElementById('quiz-result-stars');
      const totalStarsElem = document.getElementById('quiz-result-total-stars');
      const badgeElem = document.getElementById('quiz-result-badge');
      const titleElem = document.getElementById('quiz-result-title');
      const subElem = document.getElementById('quiz-result-subtitle');

      if (scoreElem) scoreElem.textContent = `${results.roundScore} / ${results.totalQuestions}`;
      
      const starsIcons = results.starsAwarded > 0 
        ? '⭐'.repeat(results.starsAwarded) 
        : 'Keep practicing! 💪';
      if (starsElem) starsElem.textContent = starsIcons;
      if (totalStarsElem) totalStarsElem.textContent = `⭐ ${results.totalStars}`;

      if (results.roundScore === results.totalQuestions) {
        if (badgeElem) badgeElem.textContent = '🏆';
        if (titleElem) titleElem.textContent = 'Perfect Score! 🌟';
        if (subElem) subElem.textContent = `Flawless mastery of ${lesson.title}! You earned 2 Quiz Stars!`;
      } else if (results.roundScore >= 3) {
        if (badgeElem) badgeElem.textContent = '🎉';
        if (titleElem) titleElem.textContent = 'Great Job! 👏';
        if (subElem) subElem.textContent = `You know most of these words! You earned ${results.starsAwarded} Star!`;
      } else {
        if (badgeElem) badgeElem.textContent = '🌱';
        if (titleElem) titleElem.textContent = 'Good Practice! 💪';
        if (subElem) subElem.textContent = 'Review the flashcards and try again to score 3 or more!';
      }
    },

    renderVocabGrid: function (lesson) {
      const container = document.getElementById('vocab-grid-container');
      if (!container) return;

      container.innerHTML = '';
      lesson.words.forEach((w, index) => {
        const card = document.createElement('div');
        card.className = 'vocab-card';
        card.onclick = () => {
          this.currentWordIndex = index;
          this.switchTab('cards');
          this.updateCardView();
          SpeechAudio.speak(w.korean, 'ko-KR');
        };
        card.innerHTML = `
          <div class="vocab-card-emoji">${w.emoji}</div>
          <div class="vocab-card-kr">${w.korean}</div>
          <div class="vocab-card-pronounce">${w.phonetic}</div>
          <div class="vocab-card-en">${w.english}</div>
        `;
        container.appendChild(card);
      });
    },

    updateSidebarLessons: function () {
      const container = document.getElementById('sidebar-lessons-list');
      const allLessons = LessonRepository.getAll();
      if (!container || allLessons.length === 0) return;

      container.innerHTML = '';
      let completedCount = 0;

      allLessons.forEach((lesson, index) => {
        const status = ProfileManager.getLessonStatus(lesson.id);
        const stars = ProfileManager.getLessonStars(lesson.id);
        if (status === 'completed') completedCount += 1;

        const navCard = document.createElement('div');
        navCard.className = `lesson-nav-card ${index === this.currentLessonIndex ? 'active' : ''}`;
        navCard.onclick = () => this.loadLesson(index);

        const starsHtml = stars > 0 ? `<span class="lesson-nav-stars" title="${stars} of 3 stars earned">⭐ ${stars}/3</span>` : '';

        navCard.innerHTML = `
          <div class="lesson-nav-icon">${lesson.icon}</div>
          <div class="lesson-nav-info">
            <div class="lesson-nav-category">${lesson.category}</div>
            <div class="lesson-nav-title">${lesson.number}. ${lesson.title}</div>
          </div>
          <div class="lesson-nav-meta">
            ${starsHtml}
            <span class="status-badge ${status}">${this.formatStatusLabel(status)}</span>
          </div>
        `;
        container.appendChild(navCard);
      });

      const progElem = document.getElementById('sidebar-curriculum-progress');
      if (progElem) {
        progElem.textContent = `${completedCount} / ${allLessons.length} Done`;
      }
    },

    formatStatusLabel: function (status) {
      switch (status) {
        case 'completed': return 'Completed ⭐';
        case 'started': return 'In Progress';
        case 'untouched':
        case 'new':
        default: return 'New';
      }
    },

    renderAvatarToElement: function (elem, avatarValue, fallbackEmoji = '🧑') {
      if (!elem) return;
      if (typeof avatarValue === 'string' && avatarValue.startsWith('seed:')) {
        const seed = avatarValue.replace('seed:', '');
        if (typeof AvatarEngine !== 'undefined') {
          elem.innerHTML = AvatarEngine.renderCharacterAvatar(seed);
          return;
        }
      } else if (typeof avatarValue === 'string' && avatarValue.startsWith('companion:')) {
        const parts = avatarValue.replace('companion:', '').split(':');
        const style = parts[0] || 'critters';
        const seed = parts[1] || 'cat';
        if (typeof AvatarEngine !== 'undefined') {
          elem.innerHTML = AvatarEngine.renderCompanionAvatar(style, seed);
          return;
        }
      }
      if (typeof avatarValue === 'string' && avatarValue.trim().startsWith('<svg')) {
        elem.innerHTML = avatarValue;
        return;
      }
      elem.textContent = avatarValue || fallbackEmoji;
    },

    updateHeaderProfile: function () {
      const profile = ProfileManager.getActiveProfile();
      if (!profile) return;

      const avatarElem = document.getElementById('header-avatar');
      const nameElem = document.getElementById('header-name');
      const starsElem = document.getElementById('header-stars');
      const quizStarsElem = document.getElementById('quiz-stars-display');

      if (avatarElem) {
        this.renderAvatarToElement(avatarElem, profile.avatar, '🐯');
      }
      if (nameElem) nameElem.textContent = profile.name;
      if (starsElem) starsElem.textContent = `⭐ ${profile.stars || 0}`;
      if (quizStarsElem) quizStarsElem.textContent = `⭐ Stars: ${profile.stars || 0}`;
    },

    openOnboardingModal: function () {
      const modal = document.getElementById('onboard-modal');
      if (modal) modal.classList.add('open');
    },

    openProfileSwitcherModal: function () {
      const modal = document.getElementById('profile-switcher-modal');
      const listContainer = document.getElementById('profile-switcher-list');
      if (!modal || !listContainer) return;

      listContainer.innerHTML = '';
      const active = ProfileManager.getActiveProfile();

      ProfileManager.data.profiles.forEach(p => {
        const row = document.createElement('div');
        row.className = `profile-select-row ${active && active.id === p.id ? 'active' : ''}`;
        row.onclick = () => {
          ProfileManager.switchProfile(p.id);
          this.updateHeaderProfile();
          this.loadLesson(this.currentLessonIndex);
          this.closeModal('profile-switcher-modal');
          this.showToast(`Switched profile to ${p.name}!`);
        };

        const avatarSvgHtml = (p.avatar && p.avatar.startsWith('seed:'))
          ? AvatarEngine.renderCharacterAvatar(p.avatar.replace('seed:', ''))
          : (p.avatar && p.avatar.startsWith('companion:'))
            ? AvatarEngine.renderCompanionAvatar(p.avatar.replace('companion:', '').split(':')[0], p.avatar.replace('companion:', '').split(':')[1])
            : p.avatar;

        row.innerHTML = `
          <div class="profile-row-info">
            <span class="profile-row-avatar">${avatarSvgHtml}</span>
            <div class="profile-row-details">
              <span class="profile-row-name">${p.name}</span>
              <span class="profile-row-stars">⭐ ${p.stars || 0} stars</span>
            </div>
          </div>
          ${active && active.id === p.id ? '<span style="font-size:0.8rem; font-weight:700; color:#2563eb;">Active ✓</span>' : ''}
        `;
        listContainer.appendChild(row);
      });

      const newProfileBtn = document.getElementById('open-create-profile-btn');
      if (newProfileBtn) {
        newProfileBtn.onclick = () => {
          this.closeModal('profile-switcher-modal');
          this.openOnboardingModal();
        };
      }

      modal.classList.add('open');
    },

    closeModal: function (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('open');
    },

    showToast: function (message) {
      const toast = document.getElementById('toast-notification');
      if (!toast) return;

      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, 2500);
    }
  };

  window.App = {
    LessonRepository,
    UIController,
    ProfileManager,
    ScenarioEngine,
    SpeechAudio,
    AutoPlayEngine,
    QuizEngine
  };

  document.addEventListener('DOMContentLoaded', () => {
    UIController.init();
  });
})();