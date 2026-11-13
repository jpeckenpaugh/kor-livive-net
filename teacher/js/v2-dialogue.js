/**
 * v2-dialogue.js - 20-Beat Home Tutoring Role-Playing Scenario
 * 
 * Features:
 * - 20-beat curriculum for Lesson 1 (Korean Foundations & Etiquette)
 * - Dual-Bot Interpreter model:
 *   * Teacher speaks Korean -> T-Bot translates to English
 *   * Student speaks English -> Student Bot translates to Korean
 * - Dual TTS using SpeechSynthesis (ko-KR / en-US) with robot & teacher presets
 * - Web Audio API synthesized doorbell chime, success chimes, and confetti
 * - Full state machine with next / prev / skip / audio toggle / repeat
 */

(function () {
  'use strict';

  // --- Sound Effects using Web Audio API ---
  const SoundFX = {
    ctx: null,
    muted: false,

    getAudioContext: function () {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctor();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    },

    playDoorbell: function () {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Ding-Dong chime (E5 -> C5)
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.35, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(659.25, now, 0.7);        // E5 (Ding)
      playTone(523.25, now + 0.35, 1.1);  // C5 (Dong)
    },

    playSuccess: function () {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    },

    playFanfare: function () {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Majestic 5-chord celebration
      const chords = [
        { freqs: [523.25, 659.25], start: 0, dur: 0.18 },
        { freqs: [523.25, 659.25], start: 0.18, dur: 0.18 },
        { freqs: [523.25, 659.25], start: 0.36, dur: 0.18 },
        { freqs: [523.25, 659.25, 783.99], start: 0.54, dur: 0.5 },
        { freqs: [659.25, 783.99, 1046.50], start: 1.08, dur: 1.1 }
      ];

      chords.forEach(c => {
        c.freqs.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + c.start);

          gain.gain.setValueAtTime(0.001, now + c.start);
          gain.gain.exponentialRampToValueAtTime(0.2, now + c.start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + c.start + c.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + c.start);
          osc.stop(now + c.start + c.dur);
        });
      });
    }
  };

  // --- Speech Audio Manager (Dual TTS: ko-KR and en-US) ---
  const DualTTS = {
    supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    voices: [],
    voicesLoaded: false,
    enabled: true,
    currentUtterance: null,

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
      const matches = this.voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
      if (matches.length === 0) return null;

      if (prefix.startsWith('ko')) {
        const priorities = [
          v => v.name.includes('Google'),
          v => v.name.includes('Sora'),
          v => v.name.includes('Yuna') && v.name.includes('Enhanced'),
          v => v.name.includes('Yuna'),
          v => !v.localService
        ];
        for (const match of priorities) {
          const found = matches.find(match);
          if (found) return found;
        }
        return matches[0];
      }

      // Prefer local voice first for non-Korean languages
      const localMatch = matches.find(v => v.localService);
      if (localMatch) return localMatch;
      return matches[0];
    },

    stop: function () {
      if (this.supported) {
        try {
          window.speechSynthesis.cancel();
          this.currentUtterance = null;
        } catch (e) {
          console.warn('TTS cancel error:', e);
        }
      }
    },

    /**
     * Speak speech line
     * @param {string} text
     * @param {'ko-KR'|'en-US'} lang
     * @param {Object} options { pitch, rate }
     * @param {Function} onEnd
     */
    speak: function (text, lang, options = {}, onEnd = null) {
      if (!this.supported || !this.enabled) {
        if (typeof onEnd === 'function') setTimeout(onEnd, 400);
        return;
      }

      try {
        window.speechSynthesis.cancel();

        // Strip emoji or brackets from speech if any
        const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/\([^)]*\)/g, '').trim();
        if (!cleanText) {
          if (typeof onEnd === 'function') onEnd();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.pitch = typeof options.pitch === 'number' ? options.pitch : (lang === 'ko-KR' ? 1.05 : 1.0);
        utterance.rate = typeof options.rate === 'number' ? options.rate : (lang === 'ko-KR' ? 0.9 : 1.0);

        const voice = this.getVoiceForLang(lang);
        if (voice) utterance.voice = voice;

        let finished = false;
        const triggerEnd = () => {
          if (!finished) {
            finished = true;
            this.currentUtterance = null;
            if (typeof onEnd === 'function') onEnd();
          }
        };

        utterance.onend = triggerEnd;
        utterance.onerror = triggerEnd;

        // Safety fallback timeout in case browser TTS drops onend
        const words = cleanText.split(/\s+/).length;
        const fallbackMs = Math.max(2500, words * 500);
        setTimeout(() => {
          if (!finished) triggerEnd();
        }, fallbackMs);

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('TTS error:', err);
        if (typeof onEnd === 'function') onEnd();
      }
    }
  };

  // --- 20-Beat Dialogue Data ---
  // Teacher: 박 선생님 (Teacher Park)
  // Teacher's Bot: T-Bot
  // Student: Player (name dynamic)
  // Student's Bot: Companion Bot (name dynamic)
  const LESSON_1_BEATS = [
    // === PHASE 1: Core Lesson (Beats 1 - 10) ===
    {
      id: 1,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Arrival & Greeting',
      concept: 'Formal Korean Greeting (안녕하세요)',
      teacherKo: '안녕하세요! 오늘부터 한국어 수업을 함께할 박 선생님이에요.',
      teacherEn: 'Hello! I am Teacher Park, and we will be learning Korean together starting today.',
      promptEn: 'Respond politely to Teacher Park:',
      options: [
        {
          en: 'Hello, Teacher Park! Please come in.',
          ko: '안녕하세요, 박 선생님! 들어오세요.',
          feedback: 'Perfect polite greeting to welcome your guest!'
        },
        {
          en: 'Nice to meet you! Welcome to my house.',
          ko: '만나서 반가워요! 저희 집에 오신 것을 환영해요.',
          feedback: 'Warm and welcoming!'
        }
      ],
      culturalNote: '안녕하세요 (An-nyeong-ha-se-yo) is the universal polite greeting. The root "안녕" means peace and good health.'
    },
    {
      id: 2,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Self-Introduction',
      concept: 'Introducing Oneself & Asking Name (저는 ~이에요)',
      teacherKo: '집이 정말 아늑하네요. 학생분의 이름을 알려주시겠어요?',
      teacherEn: 'Your home is lovely and cozy. Could you please tell me your name?',
      promptEn: 'Introduce yourself politely:',
      options: [
        {
          en: 'My name is {playerName}. Nice to meet you.',
          ko: '제 이름은 {playerName}이에요. 잘 부탁드립니다.',
          feedback: 'Well done! "제 이름은 ~이에요" means "My name is ~".'
        },
        {
          en: 'I am {playerName}. Thank you for coming.',
          ko: '저는 {playerName}이에요. 와주셔서 감사합니다.',
          feedback: 'Excellent! "저는 ~이에요" is natural and polite.'
        }
      ],
      culturalNote: 'Use "제 이름은" (my name) or "저는" (I am). When speaking to elders or teachers, always introduce yourself politely.'
    },
    {
      id: 3,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Pleasure to Meet You',
      concept: 'Expressing Delight in Meeting (만나서 반갑습니다)',
      teacherKo: '{playerName} 씨, 반갑습니다! 우리 T-Bot과 {botName}도 인사를 나눠볼까요?',
      teacherEn: '{playerName}, wonderful to meet you! Shall our companion robots exchange greetings too?',
      promptEn: 'Have your companion robot reply:',
      options: [
        {
          en: 'Hello T-Bot! It is great to meet you too.',
          ko: '안녕 T-Bot! 너를 만나서 정말 반가워.',
          feedback: 'Voxel companions connect instantly!'
        },
        {
          en: 'Sparky & T-Bot, best study buddies!',
          ko: '우리는 최고의 한국어 공부 단짝이 될 거야!',
          feedback: 'Team spirit activated!'
        }
      ],
      culturalNote: 'Robots and young friends often speak comfortably in friendly 반말 (casual speech) to each other!'
    },
    {
      id: 4,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Glad to Meet You (만나서 반가워요)',
      concept: 'Formal vs Polite: 반갑습니다 vs 반가워요',
      teacherKo: '처음 만났을 때는 "만나서 반가워요" 또는 더 격식 있게 "만나서 반갑습니다"라고 해요.',
      teacherEn: 'When meeting someone for the first time, say "만나서 반가워요" or more formally "만나서 반갑습니다".',
      promptEn: 'Repeat and practice the phrase:',
      options: [
        {
          en: '만나서 반가워요! (It is nice to meet you!)',
          ko: '만나서 반가워요!',
          feedback: 'Clear pronunciation and correct polite tone!'
        },
        {
          en: '만나서 반갑습니다! (Honored to meet you!)',
          ko: '만나서 반갑습니다!',
          feedback: 'Very formal and respectful - excellent for official settings!'
        }
      ],
      culturalNote: '-습니다 is formal high-polite (합쇼체), while -요 is polite informal (해요체), widely used in everyday life.'
    },
    {
      id: 5,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Polite Agreement (네)',
      concept: 'Affirmation & Active Listening (네 / 예)',
      teacherKo: '한국어에서 동의할 때는 "네"라고 대답해요. 상대방의 말을 잘 듣고 있다는 뜻도 돼요.',
      teacherEn: 'In Korean, you agree by saying "네" (Ne). It also functions as an attentive "yes, I understand" while listening.',
      promptEn: 'Practice acknowledging Teacher Park:',
      options: [
        {
          en: '네, 알겠습니다! (Yes, I understand!)',
          ko: '네, 알겠습니다!',
          feedback: 'Perfect! "네, 알겠습니다" is what Korean students say to teachers.'
        },
        {
          en: '네, 선생님! (Yes, Teacher!)',
          ko: '네, 선생님!',
          feedback: 'Sweet and respectful!'
        }
      ],
      culturalNote: 'Korean speakers frequently nod and say "네... 네..." during conversation as active listening (맞장구).'
    },
    {
      id: 6,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Polite Disagreement (아니요)',
      concept: 'Gentle Negation (아니요)',
      teacherKo: '반대로 아니라고 할 때는 "아니요"라고 말해요. "아니" 뒤에 "요"를 붙여야 예의가 있어요.',
      teacherEn: 'Conversely, when saying no, say "아니요" (A-ni-yo). Adding "요" at the end makes it polite.',
      promptEn: 'How would you say "No, that is not it" politely?',
      options: [
        {
          en: '아니요, 괜찮아요. (No, it is okay.)',
          ko: '아니요, 괜찮아요.',
          feedback: 'Gentle and considerate refusal!'
        },
        {
          en: '아니요, 아닙니다. (No, that is not the case.)',
          ko: '아니요, 아닙니다.',
          feedback: 'Clear, polite, and respectful negation.'
        }
      ],
      culturalNote: 'Dropping "요" turns it into "아니" (informal), which you should only use with close peers or younger friends.'
    },
    {
      id: 7,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Gratitude (감사합니다)',
      concept: 'Expressing Thanks (감사합니다 / 고맙습니다)',
      teacherKo: '정말 잘하고 있어요! 고마움을 표현할 때는 "감사합니다" 또는 "고맙습니다"라고 해요.',
      teacherEn: 'You are doing fantastic! To express gratitude, say "감사합니다" or "고맙습니다".',
      promptEn: 'Thank Teacher Park for teaching you:',
      options: [
        {
          en: '가르쳐 주셔서 감사합니다! (Thank you for teaching me!)',
          ko: '가르쳐 주셔서 감사합니다!',
          feedback: 'Splendid expression! Teachers in Korea love hearing this.'
        },
        {
          en: '감사합니다, 선생님! (Thank you, Teacher!)',
          ko: '감사합니다, 선생님!',
          feedback: 'Concise, heartfelt, and polite!'
        }
      ],
      culturalNote: '감사 (感謝) is of Sino-Korean origin and considered very formal and elegant, while 고맙다 is pure Korean.'
    },
    {
      id: 8,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Honorifics Concept (존댓말 vs 반말)',
      concept: 'Why We Are Polite: Building Trust & Respect',
      teacherKo: '한국어에는 존댓말(높임말)과 반말이 있어요. 서로를 존중하고 배려하기 위해 존댓말을 써요.',
      teacherEn: 'Korean has honorific speech (존댓말) and casual speech (반말). We use honorifics to show mutual respect and care.',
      promptEn: 'Reflect on honorific etiquette:',
      options: [
        {
          en: 'I understand. Respect builds warm friendships.',
          ko: '이해했어요. 존중이 따뜻한 관계를 만드는군요.',
          feedback: 'Deep cultural understanding unlocked!'
        },
        {
          en: 'I will always speak politely with 존댓말.',
          ko: '항상 예의 바르게 존댓말을 연습할게요.',
          feedback: 'That is the ideal learner mindset!'
        }
      ],
      culturalNote: 'Even adults meeting for the first time always start with 존댓말, switching to 반말 only after mutual consent.'
    },
    {
      id: 9,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Farewell Distinction',
      concept: 'Stay Peacefully (안녕히 계세요) vs Go Peacefully (안녕히 가세요)',
      teacherKo: '중요한 차이점! 떠나는 사람은 "안녕히 계세요"(Stay well), 배웅하는 사람은 "안녕히 가세요"(Go well)라고 해요.',
      teacherEn: 'Crucial distinction! The person leaving says "안녕히 계세요" (Stay peacefully), while the host says "안녕히 가세요" (Go peacefully).',
      promptEn: 'As the host at home, what will you say when Teacher Park leaves later?',
      options: [
        {
          en: '안녕히 가세요! (Please go safely!)',
          ko: '안녕히 가세요, 박 선생님!',
          feedback: 'Correct! Because the teacher is departing, you say "가세요" (go).'
        },
        {
          en: 'What if we are both leaving a coffee shop together?',
          ko: '만약 둘 다 카페에서 떠날 때는 어떻게 인사하나요?',
          feedback: 'Great thought! When both people are leaving, both say "안녕히 가세요"!'
        }
      ],
      culturalNote: '계시다 = honorific for "to stay/exist". 가시다 = honorific for "to go". Remember: Stay = 계세요, Go = 가세요!'
    },
    {
      id: 10,
      phase: 1,
      phaseName: 'Phase 1: Core Lesson',
      title: 'Practice Check & Encouragement',
      concept: 'Phase 1 Mastery Check',
      teacherKo: '훌륭해요! 이제 기본 인사와 예절의 핵심 원리를 완벽하게 익히셨어요.',
      teacherEn: 'Outstanding! You have now mastered the core principles of Korean greetings and etiquette.',
      promptEn: 'Celebrate your progress:',
      options: [
        {
          en: 'Korean is so fascinating! I want to ask some questions.',
          ko: '한국어가 정말 재미있어요! 궁금한 것들을 여쭤봐도 될까요?',
          feedback: 'Terrific enthusiasm! Let us move into Question Time.'
        },
        {
          en: 'Thank you for your guidance, Teacher Park!',
          ko: '친절하게 알려주셔서 감사해요, 박 선생님!',
          feedback: 'Teacher Park is proud of your dedication!'
        }
      ],
      culturalNote: 'Asking questions shows curiosity and attentiveness, which Korean teachers celebrate warmly.'
    },

    // === PHASE 2: Student Questions (Beats 11 - 15) ===
    {
      id: 11,
      phase: 2,
      phaseName: 'Phase 2: Student Questions',
      title: 'The Concept of "Our" (우리)',
      concept: 'Collectivism & Warmth: 우리 (Our) vs 내/제 (My)',
      teacherKo: '아주 좋은 질문이에요! 한국에서는 "내 집", "내 가족" 대신 "우리 집", "우리 가족", 심지어 "우리 나라"라고 해요.',
      teacherEn: 'What an insightful question! In Korea, instead of "my house" or "my family", we say "our house" (우리 집) and "our country" (우리 나라).',
      promptEn: 'Ask why Koreans prefer "Our" (우리):',
      options: [
        {
          en: 'Why do Koreans say "Our" instead of "My"?',
          ko: '왜 "내" 대신 "우리"라는 말을 자주 쓰나요?',
          feedback: 'Teacher Park will explain the beauty of communal warmth (정 - Jeong).'
        },
        {
          en: 'So is this house "our house" while you visit?',
          ko: '그럼 선생님이 계신 동안 여기도 "우리 집"이네요!',
          feedback: 'How delightful and warm!'
        }
      ],
      culturalNote: 'The word "우리" (Uri) reflects Korea\'s deep communal warmth and shared community spirit (정 - 情).'
    },
    {
      id: 12,
      phase: 2,
      phaseName: 'Phase 2: Student Questions',
      title: 'Using "안녕" with Friends',
      concept: 'Informal Greeting (안녕) vs Polite Greeting (안녕하세요)',
      teacherKo: '맞아요! "안녕"은 나이가 같은 친구나 어린 동생에게만 쓰는 반말이에요. 선생님께는 꼭 "안녕하세요"라고 해야 해요.',
      teacherEn: 'Exactly right! "안녕" (An-nyeong) is casual speech used only with friends of the same age or younger. With teachers, always use "안녕하세요".',
      promptEn: 'Check when it is safe to use "안녕":',
      options: [
        {
          en: 'Can I say "안녕" to my companion bot Sparky?',
          ko: '제 로봇 친구에게는 "안녕!"이라고 해도 되나요?',
          feedback: 'Yes! Companion bots and close peers are best friends.'
        },
        {
          en: 'So age and closeness decide between 안녕 and 안녕하세요?',
          ko: '나이와 친밀도에 따라 인사말이 달라지는 거군요!',
          feedback: 'Spot-on deduction!'
        }
      ],
      culturalNote: 'Greeting an elder or stranger with just "안녕" is considered rude. When in doubt, always default to "안녕하세요".'
    },
    {
      id: 13,
      phase: 2,
      phaseName: 'Phase 2: Student Questions',
      title: '고마워 vs 감사합니다',
      concept: 'Casual Thanks vs Formal Gratitude',
      teacherKo: '"고마워"는 친구에게, "고맙습니다"는 일상적인 존댓말, "감사합니다"는 조금 더 격식 있는 정중한 표현이에요.',
      teacherEn: '"고마워" is for friends, "고맙습니다" is everyday polite thanks, and "감사합니다" is formal and courteous.',
      promptEn: 'Test your understanding of thank-you levels:',
      options: [
        {
          en: 'So with cashiers, waiters, and teachers: 감사합니다!',
          ko: '가게나 식당, 선생님께는 "감사합니다"가 가장 안전하군요!',
          feedback: 'You got it! "감사합니다" is universally polite everywhere.'
        },
        {
          en: 'And with classmates after class: 고마워!',
          ko: '친한 반 친구에게는 "고마워"라고 하면 되고요!',
          feedback: 'Exactly right!'
        }
      ],
      culturalNote: 'Both 고맙습니다 and 감사합니다 are polite. In official announcements or speeches, 감사합니다 is preferred.'
    },
    {
      id: 14,
      phase: 2,
      phaseName: 'Phase 2: Student Questions',
      title: 'Meaning of "선생님" (Teacher)',
      concept: 'Etymology: 先 (Before) + 生 (Born) + 님 (Venerable)',
      teacherKo: '선생(先生)은 "먼저 태어난 사람", 즉 인생의 지혜를 먼저 배운 사람을 뜻하고, "님"은 가장 높은 존칭이에요.',
      teacherEn: '선생 (Seon-saeng) literally means "one born earlier" with prior wisdom, and "님" (Nim) is the highest honorific suffix.',
      promptEn: 'Express admiration for the title:',
      options: [
        {
          en: 'What a beautiful meaning: a wise guide born before!',
          ko: '먼저 지혜를 배운 인도자라는 뜻이 참 아름다워요.',
          feedback: 'Teacher Park is visibly moved by your appreciation!'
        },
        {
          en: 'Can "님" be attached to other titles too?',
          ko: '"님"은 다른 호칭 뒤에도 붙일 수 있나요?',
          feedback: 'Yes! Like 부모님 (parents), 사장님 (CEO), and even customer/user (고객님)!'
        }
      ],
      culturalNote: 'Adding 님 transforms any role into a title of deep respect. Never call a teacher just "선생", always "선생님".'
    },
    {
      id: 15,
      phase: 2,
      phaseName: 'Phase 2: Student Questions',
      title: 'Is Hangul Difficult?',
      concept: 'King Sejong the Great & The Scientific Hangul Alphabet',
      teacherKo: '한글은 1443년 세종대왕이 백성을 사랑하는 마음으로 만든 과학적인 글자예요. 모양이 발음 기관을 본떠서 아주 배우기 쉬워요!',
      teacherEn: 'Hangul was created in 1443 by King Sejong out of deep love for his people. The letters mimic speech organs, making it very easy to learn!',
      promptEn: 'Share your excitement for learning the alphabet:',
      options: [
        {
          en: 'Knowing it was designed scientifically makes me eager to learn!',
          ko: '과학적으로 만들어진 글자라니 더 배우고 싶어져요!',
          feedback: 'A famous proverb says: "A wise person can learn Hangul in a morning!"'
        },
        {
          en: 'King Sejong was truly a caring and visionary ruler.',
          ko: '백성을 진심으로 아낀 세종대왕의 마음이 느껴져요.',
          feedback: 'Historically profound observation!'
        }
      ],
      culturalNote: 'Hangul is acclaimed worldwide by linguists as one of the most logical and scientific writing systems ever devised.'
    },

    // === PHASE 3: Teacher Summary & Wrap-up (Beats 16 - 20) ===
    {
      id: 16,
      phase: 3,
      phaseName: 'Phase 3: Review & Wrap-up',
      title: 'Summary 1: The Essential Greetings Trio',
      concept: 'Core Memory: 안녕하세요, 감사합니다, 네',
      teacherKo: '자, 오늘 배운 핵심 세 단어를 복습해 볼까요? "안녕하세요", "감사합니다", 그리고 "네"예요.',
      teacherEn: 'Now, let us review today\'s Essential Trio: "안녕하세요" (Hello), "감사합니다" (Thank you), and "네" (Yes).',
      promptEn: 'Recite the Essential Trio with pride:',
      options: [
        {
          en: '안녕하세요! 감사합니다! 네! (Hello! Thank you! Yes!)',
          ko: '안녕하세요! 감사합니다! 네!',
          feedback: 'Golden pronunciation! These 3 words will open doors anywhere in Korea.'
        },
        {
          en: 'I will remember these three magic words forever!',
          ko: '이 세 가지 마법의 단어를 꼭 기억할게요!',
          feedback: 'They truly are the magic keys to Korean courtesy.'
        }
      ],
      culturalNote: 'With just these three words, any traveler or learner can navigate Korea with warmth and respect.'
    },
    {
      id: 17,
      phase: 3,
      phaseName: 'Phase 3: Review & Wrap-up',
      title: 'Summary 2: Respectful Body Language',
      concept: 'Bowing (절/인사) & Two Hands (두 손) Etiquette',
      teacherKo: '인사할 때는 가볍게 허리를 숙이고, 물건을 건넬 때는 두 손을 사용하는 것이 한국의 아름다운 예절이에요.',
      teacherEn: 'When greeting, bow slightly from the waist. When giving or receiving items, always use both hands—this is Korean etiquette.',
      promptEn: 'Practice respectful posture:',
      options: [
        {
          en: 'Two hands and a gentle bow—practicing right now!',
          ko: '두 손으로 정중하게, 허리를 숙여 인사 연습을 해볼게요!',
          feedback: 'Your character bows respectfully in the room!'
        },
        {
          en: 'Our companion robots can bow together too!',
          ko: '우리 로봇 친구들도 함께 공손하게 인사해요!',
          feedback: 'T-Bot and your bot blink their LEDs in unison!'
        }
      ],
      culturalNote: 'Using two hands shows full attention and sincerity. Even holding your right forearm with your left hand is polite.'
    },
    {
      id: 18,
      phase: 3,
      phaseName: 'Phase 3: Review & Wrap-up',
      title: 'Summary 3: Goodbye Review',
      concept: 'Mastering the Host vs Guest Farewell',
      teacherKo: '제가 이제 문을 나서면, 집주인인 {playerName} 씨는 뭐라고 인사해야 할까요?',
      teacherEn: 'When I step out the door now, as the host staying home, what will {playerName} say to me?',
      promptEn: 'Choose the correct goodbye for departing Teacher Park:',
      options: [
        {
          en: '안녕히 가세요, 선생님! (Go peacefully, Teacher!)',
          ko: '안녕히 가세요, 박 선생님!',
          feedback: 'CORRECT! Teacher Park is leaving, so you say "가세요" (go safely)!'
        },
        {
          en: '안녕히 계세요, 선생님! (Stay peacefully, Teacher!)',
          ko: '안녕히 계세요, 박 선생님!',
          feedback: 'Remember: "계세요" is what Teacher Park says to YOU, because you are staying home!'
        }
      ],
      culturalNote: 'Mastering this single distinction sets true Korean language scholars apart!'
    },
    {
      id: 19,
      phase: 3,
      phaseName: 'Phase 3: Review & Wrap-up',
      title: 'Summary 4: Sneak Peek of Lesson 2',
      concept: 'Next Milestone: Numbers, Counting & Daily Objects',
      teacherKo: '다음 2과에서는 한국어 숫자(하나, 둘, 셋 / 일, 이, 삼)와 방 안의 물건 세기를 배워볼 거예요!',
      teacherEn: 'In Lesson 2, we will explore Korean numbers (Native & Sino-Korean) and counting furniture items in your room!',
      promptEn: 'Express your readiness for Lesson 2:',
      options: [
        {
          en: 'I can hardly wait for Lesson 2! Numbers sound exciting.',
          ko: '다음 수업이 정말 기대돼요! 숫자도 열심히 배울게요.',
          feedback: 'Lesson 2 will open up shopping, clocks, and ordering food!'
        },
        {
          en: 'Sparky and I will review our notes until next time!',
          ko: '다음 시간까지 로봇과 함께 오늘 배운 내용을 복습할게요!',
          feedback: 'Superb study habit!'
        }
      ],
      culturalNote: 'Korean uses two number systems: Native Korean (하나, 둘, 셋) for counting items/hours, and Sino-Korean (일, 이, 삼) for money/dates.'
    },
    {
      id: 20,
      phase: 3,
      phaseName: 'Phase 3: Review & Wrap-up',
      title: 'Summary 5: Final Parting Bow & Reward',
      concept: 'Lesson 1 Completion & 5-Star Scholar Award',
      teacherKo: '오늘 첫 수업을 완벽하게 마쳤어요! {playerName} 씨에게 1과 수료 별 5개를 드릴게요. 안녕히 계세요!',
      teacherEn: 'You have flawlessly completed your first tutoring lesson! Awarding 5 Scholar Stars to {playerName}. Stay peacefully!',
      promptEn: 'Deliver your final heartfelt farewell bow:',
      options: [
        {
          en: '감사합니다, 선생님! 안녕히 가세요! (Thank you, Teacher! Please go safely!)',
          ko: '감사합니다, 선생님! 안녕히 가세요!',
          feedback: 'FLAWLESS! 5 Stars Awarded! Confetti celebration triggered!'
        },
        {
          en: 'It was the best lesson ever! See you next time!',
          ko: '최고의 수업이었어요! 다음 시간에 또 만나요, 선생님!',
          feedback: 'A memorable tutoring session completed with highest honors!'
        }
      ],
      culturalNote: 'Congratulations! You have completed Lesson 1: Korean Foundations & Etiquette with Teacher Park and T-Bot.'
    }
  ];

  // --- Dialogue Engine Coordinator ---
  class V2DialogueManager {
    constructor(engine, app) {
      this.engine = engine;
      this.app = app;
      this.currentBeatIndex = 0;
      this.isPlaying = false;
      this.subStep = 'idle'; // 'idle' | 'teacher-ko' | 'tbot-en' | 'student-choice' | 'student-bot-ko'
      this.autoAdvance = false;
      this.soundEnabled = true;

      // DOM Elements
      this.container = null;
      this.bubbleContainer = null;
      this.cardContainer = null;

      DualTTS.init();
    }

    initUI() {
      // Create dialogue overlay container in app
      const appContainer = document.getElementById('app-container');
      if (!appContainer) return;

      const overlay = document.createElement('div');
      overlay.id = 'v2-dialogue-overlay';
      overlay.className = 'dialogue-overlay hidden';
      overlay.innerHTML = `
        <!-- Top Status Bar: Progress, Sound Toggle, Skip -->
        <div class="dialogue-top-bar">
          <div class="dialogue-badge-box">
            <span class="beat-pill" id="dialogue-beat-pill">Beat 1 of 20</span>
            <span class="phase-pill" id="dialogue-phase-pill">Phase 1: Core Lesson</span>
          </div>
          <div class="dialogue-ctrls">
            <button class="d-btn icon-btn" id="d-btn-tts" title="Toggle Voice/Sound">🔊 Voice ON</button>
            <button class="d-btn icon-btn" id="d-btn-repeat" title="Repeat Audio">🔁 Replay</button>
            <button class="d-btn secondary-btn" id="d-btn-skip">Skip &raquo;</button>
          </div>
        </div>

        <!-- Floating Dialogue Card (Bottom) -->
        <div class="dialogue-card" id="dialogue-card">
          <!-- Active Speaker Header -->
          <div class="speaker-row">
            <div class="speaker-avatar-wrapper" id="speaker-avatar-box"></div>
            <div class="speaker-meta">
              <div class="speaker-name-badge" id="speaker-name">박 선생님 (Teacher Park)</div>
              <div class="speaker-role-tag" id="speaker-role">Korean Tutor • Home Visit</div>
            </div>
          </div>

          <!-- Main Text Box -->
          <div class="speech-content-box">
            <div class="speech-primary" id="speech-primary-text">안녕하세요! 오늘부터 한국어 수업을 함께할 박 선생님이에요.</div>
            <div class="speech-secondary" id="speech-secondary-text">Hello! I am Teacher Park, and we will be learning Korean together starting today.</div>
          </div>

          <!-- Cultural Tip Accordion / Tag -->
          <div class="cultural-tip-box" id="cultural-tip-box">
            <span class="tip-icon">💡</span>
            <span class="tip-text" id="cultural-tip-text">안녕하세요 (An-nyeong-ha-se-yo) is the universal polite greeting.</span>
          </div>

          <!-- Interactive Choices for Student -->
          <div class="interactive-choices hidden" id="interactive-choices">
            <div class="choices-prompt" id="choices-prompt">Choose your response:</div>
            <div class="choices-list" id="choices-list"></div>
          </div>

          <!-- Navigation / Action Bar -->
          <div class="dialogue-actions-bar">
            <button class="d-action-btn back-btn" id="d-btn-prev">&laquo; Back</button>
            <div class="progress-bar-wrapper">
              <div class="progress-bar-fill" id="dialogue-progress-fill"></div>
            </div>
            <button class="d-action-btn primary-btn" id="d-btn-next">Next Step &raquo;</button>
          </div>
        </div>

        <!-- Confetti & Celebration Layer -->
        <canvas id="dialogue-celebration-canvas" class="celebration-canvas pointer-none"></canvas>
      `;

      appContainer.appendChild(overlay);
      this.container = overlay;

      // Event bindings
      const btnTts = document.getElementById('d-btn-tts');
      const btnRepeat = document.getElementById('d-btn-repeat');
      const btnSkip = document.getElementById('d-btn-skip');
      const btnPrev = document.getElementById('d-btn-prev');
      const btnNext = document.getElementById('d-btn-next');

      if (btnTts) {
        btnTts.addEventListener('click', () => {
          this.soundEnabled = !this.soundEnabled;
          DualTTS.enabled = this.soundEnabled;
          SoundFX.muted = !this.soundEnabled;
          btnTts.textContent = this.soundEnabled ? '🔊 Voice ON' : '🔇 Voice Muted';
          btnTts.classList.toggle('muted', !this.soundEnabled);
        });
      }

      if (btnRepeat) {
        btnRepeat.addEventListener('click', () => {
          this.replayCurrentSpeakerAudio();
        });
      }

      if (btnSkip) {
        btnSkip.addEventListener('click', () => {
          this.skipToNextBeat();
        });
      }

      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          this.goToBeat(this.currentBeatIndex - 1);
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          this.handleNextAction();
        });
      }
    }

    startScenario() {
      if (!this.container) this.initUI();
      this.currentBeatIndex = 0;
      this.isPlaying = true;
      this.container.classList.remove('hidden');

      // Play arrival doorbell chime
      SoundFX.playDoorbell();

      // Trigger entrance sequence of Teacher and T-Bot
      if (this.engine) {
        this.engine.spawnTeacherAndBot();
      }

      // Start Beat 1 after entrance walk arrives (approx 2s)
      setTimeout(() => {
        this.renderBeat(0);
      }, 1800);
    }

    renderBeat(index) {
      if (index < 0) index = 0;
      if (index >= LESSON_1_BEATS.length) {
        this.finishScenario();
        return;
      }

      this.currentBeatIndex = index;
      const beat = LESSON_1_BEATS[index];
      const playerName = (this.app && this.app.state && this.app.state.playerName) || 'Learner';
      const botName = (this.app && this.app.state && this.app.state.botName) || 'SparkyBot';

      // Update pills
      const pillBeat = document.getElementById('dialogue-beat-pill');
      const pillPhase = document.getElementById('dialogue-phase-pill');
      const progressFill = document.getElementById('dialogue-progress-fill');

      if (pillBeat) pillBeat.textContent = `Beat ${beat.id} of 20: ${beat.title}`;
      if (pillPhase) pillPhase.textContent = beat.phaseName;
      if (progressFill) {
        const percent = ((beat.id) / 20) * 100;
        progressFill.style.width = `${percent}%`;
      }

      // Step 1: Teacher speaks Korean first
      this.stepTeacherKo(beat, playerName, botName);
    }

    stepTeacherKo(beat, playerName, botName) {
      this.subStep = 'teacher-ko';
      DualTTS.stop();

      const teacherKoFormatted = beat.teacherKo
        .replace(/\{playerName\}/g, playerName)
        .replace(/\{botName\}/g, botName);

      const teacherEnFormatted = beat.teacherEn
        .replace(/\{playerName\}/g, playerName)
        .replace(/\{botName\}/g, botName);

      this.updateSpeaker(
        'teacher',
        '박 선생님 (Teacher Park)',
        'Korean Tutor • Native Speaker',
        teacherKoFormatted,
        teacherEnFormatted,
        beat.culturalNote
      );

      // Hide student choices during teacher speech
      this.setChoicesVisibility(false);
      this.setNextButtonState('Translate »', () => {
        this.stepTBotEn(beat, playerName, botName);
      });

      // Play Korean TTS
      if (this.soundEnabled) {
        DualTTS.speak(teacherKoFormatted, 'ko-KR', { pitch: 1.1, rate: 0.88 }, () => {
          // If autoAdvance is enabled, transition to T-Bot
        });
      }
    }

    stepTBotEn(beat, playerName, botName) {
      this.subStep = 'tbot-en';
      DualTTS.stop();

      const teacherEnFormatted = beat.teacherEn
        .replace(/\{playerName\}/g, playerName)
        .replace(/\{botName\}/g, botName);

      this.updateSpeaker(
        'tbot',
        'T-Bot (Teacher\'s AI Companion)',
        'Real-time Korean ➔ English Interpreter',
        `"${teacherEnFormatted}"`,
        `[Translated from Korean]`,
        beat.culturalNote
      );

      this.setChoicesVisibility(false);
      this.setNextButtonState('Your Turn »', () => {
        this.stepStudentChoice(beat, playerName, botName);
      });

      // Play English TTS with T-Bot synthesized robot profile
      if (this.soundEnabled) {
        DualTTS.speak(teacherEnFormatted, 'en-US', { pitch: 1.25, rate: 0.95 }, () => {});
      }
    }

    stepStudentChoice(beat, playerName, botName) {
      this.subStep = 'student-choice';
      DualTTS.stop();

      this.updateSpeaker(
        'student',
        `${playerName} (You)`,
        'Student • English Line Selection',
        beat.promptEn,
        'Select an answer below to respond in English:',
        beat.culturalNote
      );

      // Render interactive choices
      this.renderChoices(beat, playerName, botName);
      this.setChoicesVisibility(true);
      this.setNextButtonDisabled(true);
    }

    stepStudentBotKo(chosenOption, beat, playerName, botName) {
      this.subStep = 'student-bot-ko';
      DualTTS.stop();

      const botKo = chosenOption.ko
        .replace(/\{playerName\}/g, playerName)
        .replace(/\{botName\}/g, botName);

      const botEn = chosenOption.en
        .replace(/\{playerName\}/g, playerName)
        .replace(/\{botName\}/g, botName);

      this.updateSpeaker(
        'student-bot',
        `${botName} (Your Companion Bot)`,
        'Real-time English ➔ Korean Interpreter',
        botKo,
        `"${botEn}" • ${chosenOption.feedback}`,
        beat.culturalNote
      );

      this.setChoicesVisibility(false);
      this.setNextButtonDisabled(false);

      // Play success chime
      SoundFX.playSuccess();

      // If Beat 20, trigger victory celebration fanfare and confetti
      if (beat.id === 20) {
        this.triggerCelebration();
        this.setNextButtonState('Finish Lesson 🏆', () => {
          this.finishScenario();
        });
      } else {
        this.setNextButtonState('Next Beat »', () => {
          this.goToBeat(this.currentBeatIndex + 1);
        });
      }

      // Play Korean translation TTS
      if (this.soundEnabled) {
        DualTTS.speak(botKo, 'ko-KR', { pitch: 1.15, rate: 0.90 }, () => {});
      }
    }

    renderChoices(beat, playerName, botName) {
      const listEl = document.getElementById('choices-list');
      const promptEl = document.getElementById('choices-prompt');
      if (!listEl) return;

      listEl.innerHTML = '';
      if (promptEl) promptEl.textContent = beat.promptEn;

      beat.options.forEach((opt, idx) => {
        const itemEn = opt.en.replace(/\{playerName\}/g, playerName).replace(/\{botName\}/g, botName);
        const itemKo = opt.ko.replace(/\{playerName\}/g, playerName).replace(/\{botName\}/g, botName);

        const btn = document.createElement('button');
        btn.className = 'choice-option-btn';
        btn.innerHTML = `
          <div class="choice-number">${idx + 1}</div>
          <div class="choice-text-col">
            <div class="choice-en">${itemEn}</div>
            <div class="choice-ko-preview">↳ ${itemKo}</div>
          </div>
          <div class="choice-arrow">&rarr;</div>
        `;

        btn.addEventListener('click', () => {
          this.stepStudentBotKo(opt, beat, playerName, botName);
        });

        listEl.appendChild(btn);
      });
    }

    updateSpeaker(speakerType, name, role, primaryText, secondaryText, culturalNote) {
      const nameEl = document.getElementById('speaker-name');
      const roleEl = document.getElementById('speaker-role');
      const primEl = document.getElementById('speech-primary-text');
      const secEl = document.getElementById('speech-secondary-text');
      const avatarBox = document.getElementById('speaker-avatar-box');
      const tipText = document.getElementById('cultural-tip-text');

      if (nameEl) nameEl.textContent = name;
      if (roleEl) roleEl.textContent = role;
      if (primEl) primEl.textContent = primaryText;
      if (secEl) secEl.textContent = secondaryText;
      if (tipText && culturalNote) tipText.textContent = culturalNote;

      if (avatarBox) {
        avatarBox.innerHTML = '';
        avatarBox.className = `speaker-avatar-wrapper ${speakerType}`;

        let svgContent = '';
        if (speakerType === 'teacher' && this.engine && this.engine.teacherSvg) {
          svgContent = this.engine.teacherSvg;
        } else if (speakerType === 'tbot' && this.engine && this.engine.tBotSvg) {
          svgContent = this.engine.tBotSvg;
        } else if (speakerType === 'student' && this.engine && this.engine.playerSvg) {
          svgContent = this.engine.playerSvg;
        } else if (speakerType === 'student-bot' && this.engine && this.engine.botSvg) {
          svgContent = this.engine.botSvg;
        }

        if (svgContent) {
          avatarBox.innerHTML = svgContent;
        } else {
          avatarBox.textContent = speakerType.includes('bot') ? '🤖' : '🧑';
        }
      }
    }

    setChoicesVisibility(show) {
      const el = document.getElementById('interactive-choices');
      if (el) el.classList.toggle('hidden', !show);
    }

    setNextButtonState(label, onClick) {
      const btn = document.getElementById('d-btn-next');
      if (!btn) return;
      btn.innerHTML = label;
      btn.disabled = false;
      this.currentNextAction = onClick;
    }

    setNextButtonDisabled(disabled) {
      const btn = document.getElementById('d-btn-next');
      if (btn) btn.disabled = disabled;
    }

    handleNextAction() {
      if (typeof this.currentNextAction === 'function') {
        this.currentNextAction();
      }
    }

    goToBeat(index) {
      if (index < 0) return;
      if (index >= LESSON_1_BEATS.length) {
        this.finishScenario();
        return;
      }
      this.renderBeat(index);
    }

    skipToNextBeat() {
      this.goToBeat(this.currentBeatIndex + 1);
    }

    replayCurrentSpeakerAudio() {
      const beat = LESSON_1_BEATS[this.currentBeatIndex];
      if (!beat) return;
      const playerName = (this.app && this.app.state && this.app.state.playerName) || 'Learner';
      const botName = (this.app && this.app.state && this.app.state.botName) || 'SparkyBot';

      if (this.subStep === 'teacher-ko') {
        const text = beat.teacherKo.replace(/\{playerName\}/g, playerName).replace(/\{botName\}/g, botName);
        DualTTS.speak(text, 'ko-KR', { pitch: 1.1, rate: 0.88 });
      } else if (this.subStep === 'tbot-en') {
        const text = beat.teacherEn.replace(/\{playerName\}/g, playerName).replace(/\{botName\}/g, botName);
        DualTTS.speak(text, 'en-US', { pitch: 1.25, rate: 0.95 });
      } else if (this.subStep === 'student-bot-ko') {
        const opt = beat.options[0];
        const text = opt.ko.replace(/\{playerName\}/g, playerName).replace(/\{botName\}/g, botName);
        DualTTS.speak(text, 'ko-KR', { pitch: 1.15, rate: 0.90 });
      }
    }

    triggerCelebration() {
      SoundFX.playFanfare();

      const canvas = document.getElementById('dialogue-celebration-canvas');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#facc15'];

      for (let i = 0; i < 140; i++) {
        particles.push({
          x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
          y: canvas.height * 0.4,
          vx: (Math.random() - 0.5) * 14,
          vy: -(Math.random() * 12 + 6),
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10,
          gravity: 0.35,
          life: 1.0,
          decay: 0.007 + Math.random() * 0.008
        });
      }

      let animId = null;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeCount = 0;

        for (const p of particles) {
          if (p.life <= 0) continue;
          activeCount++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.rotation += p.rotSpeed;
          p.life -= p.decay;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }

        if (activeCount > 0) {
          animId = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      animate();
    }

    finishScenario() {
      this.isPlaying = false;
      DualTTS.stop();

      // Show completion banner
      const card = document.getElementById('dialogue-card');
      if (card) {
        card.innerHTML = `
          <div class="scenario-complete-card">
            <div class="trophy-icon">🌟 5-STAR SCHOLAR 🌟</div>
            <h2>Lesson 1 Complete: Korean Foundations &amp; Etiquette</h2>
            <p>Congratulations! Teacher Park and T-Bot have concluded today's home lesson.</p>
            <div class="completion-stats">
              <div class="stat-box">
                <span class="stat-num">20 / 20</span>
                <span class="stat-label">Beats Completed</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">★★★★★</span>
                <span class="stat-label">Scholar Rating</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">Lesson 2</span>
                <span class="stat-label">Numbers &amp; Counting (Ready)</span>
              </div>
            </div>
            <div class="completion-btns">
              <button class="d-action-btn primary-btn" id="d-btn-replay">Replay Lesson 1 🔁</button>
              <button class="d-action-btn secondary-btn" id="d-btn-close">Return to Free Walk 🏠</button>
            </div>
          </div>
        `;

        document.getElementById('d-btn-replay')?.addEventListener('click', () => {
          this.container.remove();
          this.initUI();
          this.startScenario();
        });

        document.getElementById('d-btn-close')?.addEventListener('click', () => {
          this.container.classList.add('hidden');
          if (this.engine) {
            this.engine.dismissTeacherAndBot();
          }
        });
      }
    }
  }

  // Export to global namespace
  window.LESSON_1_BEATS = LESSON_1_BEATS;
  window.V2DialogueManager = V2DialogueManager;
  window.SoundFX = SoundFX;
  window.DualTTS = DualTTS;
})();
