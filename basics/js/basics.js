(() => {
  'use strict';

  // --- Data ---
  const CONSONANTS = [
    { char: 'ㄱ', roman: 'g / k', speak: '가', hint: 'like g in go' },
    { char: 'ㄴ', roman: 'n', speak: '나', hint: 'like n in no' },
    { char: 'ㄷ', roman: 'd / t', speak: '다', hint: 'like d in do' },
    { char: 'ㄹ', roman: 'r / l', speak: '라', hint: 'soft r / l' },
    { char: 'ㅁ', roman: 'm', speak: '마', hint: 'like m in mom' },
    { char: 'ㅂ', roman: 'b / p', speak: '바', hint: 'like b in boy' },
    { char: 'ㅅ', roman: 's', speak: '사', hint: 'like s in sun' },
    { char: 'ㅇ', roman: 'silent / ng', speak: '아', hint: 'silent at start' },
    { char: 'ㅈ', roman: 'j', speak: '자', hint: 'like j in jam' },
    { char: 'ㅊ', roman: 'ch', speak: '차', hint: 'like ch in chat' },
    { char: 'ㅋ', roman: 'k', speak: '카', hint: 'strong k' },
    { char: 'ㅌ', roman: 't', speak: '타', hint: 'strong t' },
    { char: 'ㅍ', roman: 'p', speak: '파', hint: 'strong p' },
    { char: 'ㅎ', roman: 'h', speak: '하', hint: 'like h in hat' }
  ];

  const VOWELS = [
    { char: 'ㅏ', roman: 'a', speak: '아', hint: 'ah (father)' },
    { char: 'ㅑ', roman: 'ya', speak: '야', hint: 'yah (yard)' },
    { char: 'ㅓ', roman: 'eo', speak: '어', hint: 'uh (song)' },
    { char: 'ㅕ', roman: 'yeo', speak: '여', hint: 'yuh (young)' },
    { char: 'ㅗ', roman: 'o', speak: '오', hint: 'oh (go)' },
    { char: 'ㅛ', roman: 'yo', speak: '요', hint: 'yoh (yo-yo)' },
    { char: 'ㅜ', roman: 'u', speak: '우', hint: 'oo (moon)' },
    { char: 'ㅠ', roman: 'yu', speak: '유', hint: 'yoo (you)' },
    { char: 'ㅡ', roman: 'eu', speak: '으', hint: 'uh (flat lips)' },
    { char: 'ㅣ', roman: 'i', speak: '이', hint: 'ee (see)' }
  ];

  // Unicode Hangul syllable composition tables
  const UNICODE_INITIALS = [
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
    'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];
  const UNICODE_MEDIALS = [
    'ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ',
    'ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'
  ];

  const INITIAL_ROMAN = {
    'ㄱ': 'g', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄹ': 'r', 'ㅁ': 'm',
    'ㅂ': 'b', 'ㅅ': 's', 'ㅇ': '', 'ㅈ': 'j', 'ㅊ': 'ch',
    'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h'
  };

  const NUMBERS_NATIVE = [
    { n: 1, ko: '하나', roman: 'ha-na' },
    { n: 2, ko: '둘', roman: 'dul' },
    { n: 3, ko: '셋', roman: 'set' },
    { n: 4, ko: '넷', roman: 'net' },
    { n: 5, ko: '다섯', roman: 'da-seot' },
    { n: 6, ko: '여섯', roman: 'yeo-seot' },
    { n: 7, ko: '일곱', roman: 'il-gop' },
    { n: 8, ko: '여덟', roman: 'yeo-deol' },
    { n: 9, ko: '아홉', roman: 'a-hop' },
    { n: 10, ko: '열', roman: 'yeol' }
  ];

  const NUMBERS_SINO = [
    { n: 1, ko: '일', roman: 'il' },
    { n: 2, ko: '이', roman: 'i' },
    { n: 3, ko: '삼', roman: 'sam' },
    { n: 4, ko: '사', roman: 'sa' },
    { n: 5, ko: '오', roman: 'o' },
    { n: 6, ko: '육', roman: 'yuk' },
    { n: 7, ko: '칠', roman: 'chil' },
    { n: 8, ko: '팔', roman: 'pal' },
    { n: 9, ko: '구', roman: 'gu' },
    { n: 10, ko: '십', roman: 'sip' }
  ];

  const FIRST_WORDS = [
    { ko: '네', roman: 'ne', en: 'Yes', emoji: '👍' },
    { ko: '아니요', roman: 'a-ni-yo', en: 'No', emoji: '🙅' },
    { ko: '물', roman: 'mul', en: 'Water', emoji: '💧' },
    { ko: '밥', roman: 'bap', en: 'Rice / Meal', emoji: '🍚' },
    { ko: '엄마', roman: 'eom-ma', en: 'Mom', emoji: '👩' },
    { ko: '아빠', roman: 'a-ppa', en: 'Dad', emoji: '👨' },
    { ko: '강아지', roman: 'gang-a-ji', en: 'Puppy', emoji: '🐶' },
    { ko: '고양이', roman: 'go-yang-i', en: 'Cat', emoji: '🐱' },
    { ko: '집', roman: 'jip', en: 'House', emoji: '🏠' },
    { ko: '사랑', roman: 'sa-rang', en: 'Love', emoji: '❤️' }
  ];

  // --- Speech Synthesis ---
  function speakKorean(text, rate = 0.85) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
  }

  // --- Tabs ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      tabPanels.forEach((panel) => {
        const match = panel.id === `panel-${target}`;
        panel.hidden = !match;
        panel.classList.toggle('active', match);
      });
    });
  });

  // --- Tab 1: Alphabet Soundboard ---
  function renderLetterGrid(items, containerId) {
    const container = document.getElementById(containerId);
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'letter-card';
      btn.innerHTML = `
        <span class="letter-hangul">${item.char}</span>
        <span class="letter-roman">${item.roman}</span>
        <span class="letter-hint">${item.hint}</span>
      `;
      btn.addEventListener('click', () => {
        btn.classList.add('speaking');
        speakKorean(item.speak, 0.8);
        setTimeout(() => btn.classList.remove('speaking'), 450);
      });
      container.appendChild(btn);
    });
  }

  renderLetterGrid(CONSONANTS, 'consonants-grid');
  renderLetterGrid(VOWELS, 'vowels-grid');

  // --- Tab 2: Syllable Builder ---
  let selectedConsonant = CONSONANTS[0];
  let selectedVowel = VOWELS[0];

  const slotConsonant = document.getElementById('slot-consonant');
  const slotVowel = document.getElementById('slot-vowel');
  const resultCharEl = document.getElementById('builder-result-char');
  const resultRomanEl = document.getElementById('builder-result-roman');
  const resultBtn = document.getElementById('builder-result-btn');

  function composeSyllable(cChar, vChar) {
    const iIdx = UNICODE_INITIALS.indexOf(cChar);
    const mIdx = UNICODE_MEDIALS.indexOf(vChar);
    if (iIdx === -1 || mIdx === -1) return '';
    return String.fromCharCode(0xAC00 + (iIdx * 21 + mIdx) * 28);
  }

  function updateBuilder(shouldSpeak) {
    const syllable = composeSyllable(selectedConsonant.char, selectedVowel.char);
    const roman = (INITIAL_ROMAN[selectedConsonant.char] || '') + selectedVowel.roman;
    slotConsonant.textContent = selectedConsonant.char;
    slotVowel.textContent = selectedVowel.char;
    resultCharEl.textContent = syllable;
    resultRomanEl.textContent = roman;
    if (shouldSpeak && syllable) {
      speakKorean(syllable, 0.8);
    }
  }

  function renderBuilderPickers() {
    const cContainer = document.getElementById('builder-consonants');
    CONSONANTS.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-btn' + (idx === 0 ? ' selected' : '');
      btn.innerHTML = `${c.char}<span class="sub">${INITIAL_ROMAN[c.char] || '∅'}</span>`;
      btn.addEventListener('click', () => {
        selectedConsonant = c;
        cContainer.querySelectorAll('.picker-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateBuilder(true);
      });
      cContainer.appendChild(btn);
    });

    const vContainer = document.getElementById('builder-vowels');
    VOWELS.forEach((v, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-btn' + (idx === 0 ? ' selected' : '');
      btn.innerHTML = `${v.char}<span class="sub">${v.roman}</span>`;
      btn.addEventListener('click', () => {
        selectedVowel = v;
        vContainer.querySelectorAll('.picker-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateBuilder(true);
      });
      vContainer.appendChild(btn);
    });
  }

  resultBtn.addEventListener('click', () => {
    speakKorean(resultCharEl.textContent, 0.8);
  });

  renderBuilderPickers();
  updateBuilder(false);

  // --- Tab 3: Numbers 1-10 ---
  let numberSystem = 'native';
  const numbersGrid = document.getElementById('numbers-grid');
  const systemNote = document.getElementById('system-note');
  const sysBtns = document.querySelectorAll('.sys-btn');

  function renderNumbers() {
    numbersGrid.innerHTML = '';
    const list = numberSystem === 'native' ? NUMBERS_NATIVE : NUMBERS_SINO;
    systemNote.innerHTML = numberSystem === 'native'
      ? '<strong>Native Korean</strong> is used for counting objects, people, and age (e.g., 2 apples, 5 years old).'
      : '<strong>Sino-Korean</strong> is used for dates, money, phone numbers, and minutes.';

    list.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'num-card';
      btn.innerHTML = `
        <div class="num-digit">${item.n}</div>
        <div class="num-hangul">${item.ko}</div>
        <div class="num-roman">${item.roman}</div>
      `;
      btn.addEventListener('click', () => speakKorean(item.ko, 0.85));
      numbersGrid.appendChild(btn);
    });
  }

  sysBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      numberSystem = btn.dataset.system;
      sysBtns.forEach((b) => b.classList.toggle('active', b === btn));
      renderNumbers();
    });
  });

  renderNumbers();

  // --- Tab 4: First Words & Sound-to-Symbol Mini-Game ---
  const wordsGrid = document.getElementById('words-grid');
  FIRST_WORDS.forEach((w) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'word-card';
    btn.innerHTML = `
      <div class="word-emoji">${w.emoji}</div>
      <div class="word-hangul">${w.ko}</div>
      <div class="word-roman">${w.roman}</div>
      <div class="word-english">${w.en}</div>
    `;
    btn.addEventListener('click', () => speakKorean(w.ko, 0.85));
    wordsGrid.appendChild(btn);
  });

  let quizScore = 0;
  let currentAnswer = null;
  const quizScoreEl = document.getElementById('quiz-score');
  const quizFeedbackEl = document.getElementById('quiz-feedback');
  const quizOptionsEl = document.getElementById('quiz-options');
  const quizPlayBtn = document.getElementById('quiz-play-btn');

  function nextQuizRound() {
    const pool = [...FIRST_WORDS].sort(() => Math.random() - 0.5).slice(0, 4);
    currentAnswer = pool[Math.floor(Math.random() * pool.length)];
    quizOptionsEl.innerHTML = '';

    pool.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `
        <span class="opt-ko">${item.ko}</span>
        <span class="opt-en">${item.emoji} ${item.en}</span>
      `;
      btn.addEventListener('click', () => {
        if (!currentAnswer) return;
        if (item.ko === currentAnswer.ko) {
          quizScore += 1;
          quizScoreEl.textContent = String(quizScore);
          quizFeedbackEl.textContent = `Correct! ${item.ko} (${item.en})`;
          quizFeedbackEl.className = 'quiz-feedback ok';
          setTimeout(() => {
            quizFeedbackEl.textContent = '';
            nextQuizRound();
            speakKorean(currentAnswer.ko, 0.85);
          }, 900);
        } else {
          quizFeedbackEl.textContent = 'Not quite — listen again!';
          quizFeedbackEl.className = 'quiz-feedback err';
          speakKorean(currentAnswer.ko, 0.85);
        }
      });
      quizOptionsEl.appendChild(btn);
    });
  }

  quizPlayBtn.addEventListener('click', () => {
    if (currentAnswer) {
      speakKorean(currentAnswer.ko, 0.85);
    }
  });

  nextQuizRound();
})();
