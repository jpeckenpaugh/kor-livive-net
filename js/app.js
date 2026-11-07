/**
 * Korean Language Buddy - Main Application Logic
 * Modules: LessonRepository, ProfileManager, SpeechAudio, AutoPlayEngine, QuizEngine, UIController
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
        utterance.onerror = (e) => {
          // If canceled intentionally, onerror may fire
          triggerCallbackOnce();
        };

        // Safety fallback timer in case speech synthesis engine hangs or onend fails to fire
        const estimatedDurationMs = Math.max(1200, (text.length * 180) + 800);
        setTimeout(() => {
          if (!callbackFired && window.speechSynthesis.speaking) {
            // still speaking or hung
          }
        }, estimatedDurationMs);

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
        lessonProgress: {} // [lessonId]: { status: 'untouched'|'started'|'completed', cardsViewed: [], quizPassed: boolean, quizStreak: number }
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

    recordCardView: function (lessonId, wordIndex) {
      const profile = this.getActiveProfile();
      if (!profile) return;

      if (!profile.lessonProgress[lessonId]) {
        profile.lessonProgress[lessonId] = {
          status: 'started',
          cardsViewed: [wordIndex],
          quizStreak: 0,
          quizPassed: false,
          stars: 0,
          highScore: 0
        };
      } else {
        const prog = profile.lessonProgress[lessonId];
        if (!prog.cardsViewed) prog.cardsViewed = [];
        if (!prog.cardsViewed.includes(wordIndex)) {
          prog.cardsViewed.push(wordIndex);
        }
        if (prog.status === 'untouched' || prog.status === 'new') {
          prog.status = 'started';
        }
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

      // Calculate round stars: 5/5 = 3 stars, 3-4 = 2 stars, 1-2 = 1 star, 0 = 0
      let starsAwarded = 0;
      if (score >= 5) {
        starsAwarded = 3;
      } else if (score >= 3) {
        starsAwarded = 2;
      } else if (score >= 1) {
        starsAwarded = 1;
      }

      if (!profile.lessonProgress[lessonId]) {
        profile.lessonProgress[lessonId] = {
          status: 'started',
          cardsViewed: [],
          quizStreak: score,
          quizPassed: score >= 3,
          stars: 0,
          highScore: 0
        };
      }

      const prog = profile.lessonProgress[lessonId];
      if (typeof prog.stars !== 'number') prog.stars = 0;
      if (typeof prog.highScore !== 'number') prog.highScore = 0;

      // Update highest score and per-lesson stars
      if (score > prog.highScore) {
        prog.highScore = score;
      }
      if (starsAwarded > prog.stars) {
        prog.stars = starsAwarded;
      }

      let isNewlyCompleted = false;
      // Mark completed if at least 3 correct or 2+ stars earned
      if (score >= 3 && prog.status !== 'completed') {
        prog.status = 'completed';
        prog.quizPassed = true;
        isNewlyCompleted = true;
      }

      // Recalculate global profile stars from all lessons (ensuring consistency)
      let sumStars = 0;
      Object.keys(profile.lessonProgress).forEach(id => {
        sumStars += (profile.lessonProgress[id].stars || 0);
      });
      profile.stars = sumStars;

      this.save();

      return {
        roundScore: score,
        totalQuestions: totalQuestions,
        starsAwarded: starsAwarded,
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

    getLessonStatus: function (lessonId) {
      const profile = this.getActiveProfile();
      if (!profile || !profile.lessonProgress[lessonId]) {
        return 'untouched';
      }
      return profile.lessonProgress[lessonId].status || 'untouched';
    }
  };

  /* ==========================================================================
     3. AUTO-PLAY ENGINE
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
                  // End of lesson reached
                  this.stop();
                  UIController.setCardFlipped(false);
                  UIController.showToast('🎉 Awesome! You completed all cards in this lesson!');
                } else {
                  // Advance to next word (unflipped) and continue cycle
                  UIController.nextCard(false); // don't flip yet
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
     4. QUIZ ENGINE
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

      // Ensure quiz question view is visible and results view hidden
      UIController.showQuizQuestionView();

      // Build 5 randomized questions from lesson words
      const words = [...lesson.words];
      words.sort(() => 0.5 - Math.random());

      // If lesson has fewer words than 5, repeat or use what's available
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

      // If pool is small, supplement from all lessons in curriculum
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

      // Shuffle pool and pick 3
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
      UIController.updateLessonBannerStars(lesson.id);
      UIController.renderQuizResults(results, lesson);
    }
  };

  /* ==========================================================================
     5. UI CONTROLLER & APP ORCHESTRATION
     ========================================================================== */
  const UIController = {
    currentLessonIndex: 0,
    currentWordIndex: 0,
    activeTab: 'cards', // 'cards' | 'quiz' | 'all'
    selectedAvatar: DEFAULT_AVATARS[0],

    init: async function () {
      SpeechAudio.init();
      this.bindEvents();

      // Load curriculum data from JSON with fallback
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
      // Mobile Drawer Toggle
      const drawerBtn = document.getElementById('mobile-drawer-toggle');
      const sidebar = document.getElementById('sidebar-nav');
      const backdrop = document.getElementById('sidebar-backdrop');

      if (drawerBtn && sidebar && backdrop) {
        const toggleDrawer = () => {
          sidebar.classList.toggle('open');
          backdrop.classList.toggle('open');
        };
        drawerBtn.addEventListener('click', toggleDrawer);
        backdrop.addEventListener('click', toggleDrawer);
      }

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
          // If clicking an inner interactive audio button, avoid double toggling
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

      // Navigation Buttons
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

      // Tabs
      const tabBtns = document.querySelectorAll('.mode-tabs .tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          this.switchTab(tab);
        });
      });

      // Window blur & Visibility change: safely stop auto-play and audio
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

      // Keyboard navigation (Left/Right arrows, Spacebar flip)
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
    },

    loadLesson: function (lessonIndex) {
      const lesson = LessonRepository.getLesson(lessonIndex);
      if (!lesson) return;

      AutoPlayEngine.stop();

      this.currentLessonIndex = lessonIndex;
      this.currentWordIndex = 0;

      // Update banner
      const numElem = document.getElementById('lesson-banner-number');
      const titleElem = document.getElementById('lesson-banner-title');
      const catElem = document.getElementById('lesson-banner-category');
      const descElem = document.getElementById('lesson-banner-desc');
      const badgeElem = document.getElementById('lesson-banner-status-badge');

      if (numElem) numElem.textContent = `Lesson ${lesson.number}`;
      if (titleElem) titleElem.textContent = `${lesson.icon} ${lesson.title}`;
      if (catElem) catElem.textContent = lesson.category;
      if (descElem) descElem.textContent = lesson.description;

      const status = ProfileManager.getLessonStatus(lesson.id);
      if (badgeElem) {
        badgeElem.className = `status-badge ${status}`;
        badgeElem.textContent = this.formatStatusLabel(status);
      }

      this.updateLessonBannerStars(lesson.id);

      // Render views
      this.updateCardView();
      this.renderVocabGrid(lesson);
      this.updateSidebarLessons();

      // If active tab is quiz, initialize quiz
      if (this.activeTab === 'quiz') {
        QuizEngine.initQuiz(lesson);
      }

      // Close mobile drawer if open
      const sidebar = document.getElementById('sidebar-nav');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
      }
    },

    advanceToNextLesson: function () {
      const totalLessons = LessonRepository.count();
      if (this.currentLessonIndex + 1 < totalLessons) {
        this.loadLesson(this.currentLessonIndex + 1);
        this.switchTab('cards');
        this.showToast(`Ready for Lesson ${this.currentLessonIndex + 1}! Let's go! 🚀`);
      } else {
        // Last lesson reached: wrap around to Lesson 1 or congratulate
        this.loadLesson(0);
        this.switchTab('cards');
        this.showToast('🎉 You completed the curriculum! Starting review at Lesson 1!');
      }
    },

    updateLessonBannerStars: function (lessonId) {
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

      // Update Front
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

      // Update Progress
      const progressFill = document.getElementById('card-progress-fill');
      const counterText = document.getElementById('card-counter-label');
      const percent = ((this.currentWordIndex + 1) / lesson.words.length) * 100;

      if (progressFill) progressFill.style.width = `${percent}%`;
      if (counterText) counterText.textContent = `Word ${this.currentWordIndex + 1} of ${lesson.words.length}`;

      // Track card view in ProfileManager
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
      // Always stop active auto-play when switching views
      AutoPlayEngine.stop();

      this.activeTab = tabId;

      document.querySelectorAll('.mode-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      });

      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

      if (tabId === 'cards') {
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

      // Quiz Sound Button
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

      // Fill stats
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

      // Celebration tone based on performance
      if (results.roundScore === results.totalQuestions) {
        if (badgeElem) badgeElem.textContent = '🏆';
        if (titleElem) titleElem.textContent = 'Perfect Score! 🌟';
        if (subElem) subElem.textContent = `Flawless mastery of ${lesson.title}! You earned 3 Stars!`;
      } else if (results.roundScore >= 3) {
        if (badgeElem) badgeElem.textContent = '🎉';
        if (titleElem) titleElem.textContent = 'Great Job! 👏';
        if (subElem) subElem.textContent = `You know most of these words! You earned ${results.starsAwarded} Stars!`;
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

      // Hook new profile button in switcher
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

  // Expose to window for inline onclick handlers if needed
  window.App = {
    LessonRepository,
    UIController,
    ProfileManager,
    SpeechAudio,
    AutoPlayEngine,
    QuizEngine
  };

  document.addEventListener('DOMContentLoaded', () => {
    UIController.init();
  });
})();
