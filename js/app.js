/**
 * Korean Language Buddy - Main Application Logic
 * Modules: LessonRepository, SpeechAudio, ProfileManager, ScenarioEngine, AutoPlayEngine, QuizEngine, UIController
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kor_buddy_profiles_v1';
  const DEFAULT_AVATARS = ['🐯', '🐰', '🦊', '🐼', '🦁', '🐻'];

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
     1. SPEECH SYNTHESIS ENGINE (KOREAN + ENGLISH)
     ========================================================================== */
  const SpeechAudio = {
    supported: 'speechSynthesis' in window,
    voices: [],
    voicesLoaded: false,

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
     * Speaks text in target language with callback support
     * @param {string} text
     * @param {string} lang 'ko-KR' | 'en-US'
     * @param {Function|null} onEndCallback
     */
    speak: function (text, lang = 'ko-KR', onEndCallback = null) {
      if (!this.supported) {
        UIController.showToast('Sound playback is not supported on this browser.');
        if (typeof onEndCallback === 'function') onEndCallback();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        // Natural learning speed: slightly slower for Korean learners, natural pace for English
        utterance.rate = lang.startsWith('ko') ? 0.85 : 0.95;

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

    createProfile: function (name, avatar) {
      const cleanName = (name || '').trim() || 'Learner';
      const cleanAvatar = avatar || DEFAULT_AVATARS[0];
      const newProfile = {
        id: 'prof_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: cleanName,
        avatar: cleanAvatar,
        createdAt: Date.now(),
        stars: 0,
        lessonProgress: {}
      };
      this.data.profiles.push(newProfile);
      this.data.activeProfileId = newProfile.id;
      this.save();
      return newProfile;
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
     3. SCENARIO ENGINE (PRIMARY SITUATIONAL LEARNER JOURNEY)
     ========================================================================== */
  const ScenarioEngine = {
    currentLesson: null,
    currentTurnIndex: 0,
    turns: [],
    selectedOption: null,

    initScenario: function (lesson) {
      this.currentLesson = lesson;
      this.selectedOption = null;

      const stage = document.getElementById('scenario-stage');
      const completionCard = document.getElementById('scenario-completion-card');
      const arena = document.getElementById('dialogue-arena');
      const feedbackCard = document.getElementById('etiquette-feedback-card');

      if (stage) stage.style.display = 'flex';
      if (completionCard) completionCard.style.display = 'none';
      if (arena) arena.style.display = 'flex';
      if (feedbackCard) feedbackCard.style.display = 'none';

      // Setting location and context
      const locText = document.getElementById('scene-location-text');
      const ctxText = document.getElementById('scene-context-text');

      if (lesson.scene) {
        if (locText) locText.textContent = `${lesson.scene.illustration || '📍'} ${lesson.scene.location || 'Scene'}`;
        if (ctxText) ctxText.textContent = lesson.scene.context || '';
      } else {
        if (locText) locText.textContent = `${lesson.icon || '📍'} ${lesson.title}`;
        if (ctxText) ctxText.textContent = lesson.description || '';
      }

      if (lesson.characters && lesson.characters.npc) {
        const npcAvatar = document.getElementById('npc-avatar');
        const npcName = document.getElementById('npc-name');
        if (npcAvatar) npcAvatar.textContent = lesson.characters.npc.avatar || '👩‍🏫';
        if (npcName) npcName.textContent = lesson.characters.npc.name || 'Conversation Partner';
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

      // Update turn counter
      const counter = document.getElementById('scene-turn-counter');
      if (counter) {
        counter.textContent = `Dialogue Turn ${index + 1} of ${this.turns.length}`;
      }

      // Update NPC speech
      const speechKr = document.getElementById('npc-speech-kr');
      const speechPhonetic = document.getElementById('npc-speech-phonetic');
      const speechEn = document.getElementById('npc-speech-en');
      const audioBtn = document.getElementById('scenario-audio-btn');

      if (speechKr) speechKr.textContent = turn.speech.korean;
      if (speechPhonetic) speechPhonetic.textContent = turn.speech.phonetic;
      if (speechEn) speechEn.textContent = turn.speech.english;

      if (audioBtn) {
        audioBtn.onclick = () => {
          SpeechAudio.speak(turn.speech.korean, 'ko-KR');
        };
      }

      // Automatically speak the NPC greeting softly
      SpeechAudio.speak(turn.speech.korean, 'ko-KR');

      // Update prompt
      const promptText = document.getElementById('scenario-prompt-text');
      if (promptText) {
        promptText.textContent = turn.prompt;
      }

      // Render options
      const grid = document.getElementById('scenario-options-grid');
      const feedbackCard = document.getElementById('etiquette-feedback-card');
      if (feedbackCard) feedbackCard.style.display = 'none';

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
    },

    handleOptionSelect: function (opt, btnElement, turn) {
      const feedbackCard = document.getElementById('etiquette-feedback-card');
      const feedbackTitle = document.getElementById('etiquette-title');
      const feedbackExp = document.getElementById('etiquette-explanation');
      const feedbackNuance = document.getElementById('etiquette-nuance');
      const continueBtn = document.getElementById('etiquette-continue-btn');

      if (!feedbackCard) return;

      // Speak chosen phrase
      SpeechAudio.speak(opt.korean, 'ko-KR');

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
        DEFAULT_AVATARS.forEach((av, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `avatar-opt ${i === 0 ? 'selected' : ''}`;
          btn.textContent = av;
          btn.onclick = () => {
            document.querySelectorAll('#onboard-avatar-options .avatar-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            this.selectedAvatar = av;
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

    updateHeaderProfile: function () {
      const profile = ProfileManager.getActiveProfile();
      if (!profile) return;

      const avatarElem = document.getElementById('header-avatar');
      const nameElem = document.getElementById('header-name');
      const starsElem = document.getElementById('header-stars');
      const quizStarsElem = document.getElementById('quiz-stars-display');

      if (avatarElem) avatarElem.textContent = profile.avatar;
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

        row.innerHTML = `
          <div class="profile-row-info">
            <span class="profile-row-avatar">${p.avatar}</span>
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