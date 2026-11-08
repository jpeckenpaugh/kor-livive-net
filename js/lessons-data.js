/**
 * Korean Language Buddy - 10 Structured Lessons
 * Static fallback dataset
 */

const LESSONS_DATA = [
  {
    "id": "lesson-1",
    "number": 1,
    "title": "Essential Greetings",
    "category": "Greetings & Manners",
    "icon": "👋",
    "description": "Start friendly conversations with everyday polite greetings.",
    "words": [
      {
        "korean": "안녕하세요",
        "phonetic": "An-nyeong-ha-se-yo",
        "english": "Hello / Hi",
        "emoji": "👋",
        "fact": "The most common polite greeting in Korea. Give a gentle nod or bow as you say it!"
      },
      {
        "korean": "감사합니다",
        "phonetic": "Gam-sa-ham-ni-da",
        "english": "Thank You",
        "emoji": "🙏",
        "fact": "Use this to show gratitude to teachers, parents, shopkeepers, and friends."
      },
      {
        "korean": "네",
        "phonetic": "Ne",
        "english": "Yes (Sure)",
        "emoji": "👍",
        "fact": "A clear, polite way to agree. Saying it with a smile always sounds pleasant."
      },
      {
        "korean": "아니요",
        "phonetic": "A-ni-yo",
        "english": "No (Nope)",
        "emoji": "🙅",
        "fact": "A polite way to decline or disagree without sounding harsh."
      },
      {
        "korean": "반갑습니다",
        "phonetic": "Ban-gap-seum-ni-da",
        "english": "Nice to meet you / Glad to see you",
        "emoji": "🤝",
        "fact": "A warm, polite expression used when meeting someone or greeting an acquaintance."
      },
      {
        "korean": "안녕히 가세요",
        "phonetic": "An-nyeong-hi ga-se-yo",
        "english": "Goodbye (Go well)",
        "emoji": "🏃",
        "fact": "Say this to someone who is leaving when you are staying."
      }
    ],
    "goal": "Greet someone politely at school",
    "scene": {
      "location": "Classroom Door",
      "backgroundTheme": "school-morning",
      "illustration": "🏫",
      "context": "You arrived at the classroom entrance. Your teacher, Teacher Park (박 선생님), looks up and welcomes you!"
    },
    "characters": {
      "npc": {
        "id": "teacher_park",
        "name": "Teacher Park (박 선생님)",
        "role": "Teacher",
        "avatar": "👩‍🏫",
        "relationshipLevel": "polite_formal",
        "avatarSeed": "TeacherPark",
        "voice": {
          "pitch": 1.1,
          "rate": 0.85
        }
      },
      "learner": {
        "role": "Student",
        "voice": {
          "pitch": 1.3,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "initialTurnId": "turn-1",
      "turns": [
        {
          "id": "turn-1",
          "speaker": "teacher_park",
          "speech": {
            "korean": "좋은 아침이에요! 안녕하세요!",
            "phonetic": "Jo-eun a-chim-i-e-yo! An-nyeong-ha-se-yo!",
            "english": "Good morning! Hello!"
          },
          "prompt": "How do you greet your teacher respectfully?",
          "options": [
            {
              "id": "opt-1a",
              "korean": "안녕하세요!",
              "phonetic": "An-nyeong-ha-se-yo!",
              "english": "Hello! (Polite)",
              "isCorrect": true,
              "feedback": {
                "title": "Spot on! 🌟",
                "explanation": "안녕하세요 is the proper polite greeting (존댓말) for teachers, elders, and new acquaintances.",
                "socialNuance": "Give a gentle head nod or slight bow as you say it!"
              },
              "nextTurnId": "turn-2"
            },
            {
              "id": "opt-1b",
              "korean": "안녕!",
              "phonetic": "An-nyeong!",
              "english": "Hey! / Hi! (Casual)",
              "isCorrect": false,
              "feedback": {
                "title": "Too casual for a teacher! ⚠️",
                "explanation": "안녕 is casual talk (반말) reserved only for close same-age friends or younger kids. When speaking to teachers, always use polite form (존댓말).",
                "socialNuance": "Always use 안녕하세요 with adults and teachers."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-1c",
              "korean": "감사합니다!",
              "phonetic": "Gam-sa-ham-ni-da!",
              "english": "Thank you! (Polite)",
              "isCorrect": false,
              "feedback": {
                "title": "Polite, but not a greeting! 🙏",
                "explanation": "감사합니다 means 'Thank you'. Your teacher just welcomed you, so return the greeting first with 안녕하세요!",
                "socialNuance": "Save 감사합니다 for when Teacher Park hands you study materials."
              },
              "nextTurnId": null
            }
          ]
        },
        {
          "id": "turn-2",
          "speaker": "teacher_park",
          "speech": {
            "korean": "오늘 수업 준비됐어요?",
            "phonetic": "O-neul su-eop jun-bi-dwae-sseo-yo?",
            "english": "Are you ready for class today?"
          },
          "prompt": "Respond politely with 'Yes!'",
          "options": [
            {
              "id": "opt-2a",
              "korean": "네!",
              "phonetic": "Ne!",
              "english": "Yes! (Polite)",
              "isCorrect": true,
              "feedback": {
                "title": "Clear & respectful! 👍",
                "explanation": "네 is standard, polite agreement (존댓말) when answering a teacher or elder.",
                "socialNuance": "Saying 네 with a bright smile starts class on a great note!"
              },
              "nextTurnId": "turn-complete"
            },
            {
              "id": "opt-2b",
              "korean": "응!",
              "phonetic": "Eung!",
              "english": "Yeah! (Casual)",
              "isCorrect": false,
              "feedback": {
                "title": "Watch the politeness level! ⚠️",
                "explanation": "응 is casual agreement between close friends. When answering a teacher, always use 네.",
                "socialNuance": "Adults expect 네 rather than 응 in school settings."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-2c",
              "korean": "안녕히 가세요!",
              "phonetic": "An-nyeong-hi ga-se-yo!",
              "english": "Goodbye! (To someone leaving)",
              "isCorrect": false,
              "feedback": {
                "title": "Don't leave yet! 🏃",
                "explanation": "안녕히 가세요 means 'Goodbye (Go well)'. Class is just starting!",
                "socialNuance": "Save this for when you or someone else departs at the end of the day."
              },
              "nextTurnId": null
            }
          ]
        }
      ],
      "completion": {
        "badge": "🏫",
        "title": "Polite School Morning Greeting Mastered!",
        "summary": "You entered the classroom, greeted Teacher Park respectfully with 안녕하세요, and politely confirmed ready for class with 네!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-2",
    "number": 2,
    "title": "Numbers 1 to 6",
    "category": "Numbers & Counting",
    "icon": "🔢",
    "description": "Master basic Sino-Korean counting words for prices, dates, and order.",
    "words": [
      {
        "korean": "일",
        "phonetic": "Il",
        "english": "One (1)",
        "emoji": "1️⃣",
        "fact": "Also sounds like the Korean word for 'work' and 'day'!"
      },
      {
        "korean": "이",
        "phonetic": "I",
        "english": "Two (2)",
        "emoji": "2️⃣",
        "fact": "Short and sweet! Also the word for 'teeth' in Korean."
      },
      {
        "korean": "삼",
        "phonetic": "Sam",
        "english": "Three (3)",
        "emoji": "3️⃣",
        "fact": "Sam is also in 'samgyeopsal' (Korean pork belly), referring to 3 layers!"
      },
      {
        "korean": "사",
        "phonetic": "Sa",
        "english": "Four (4)",
        "emoji": "4️⃣",
        "fact": "Used in four seasons ('sa-gye-jeol') in Korea."
      },
      {
        "korean": "오",
        "phonetic": "O",
        "english": "Five (5)",
        "emoji": "5️⃣",
        "fact": "Easy to pronounce like the English letter 'O'!"
      },
      {
        "korean": "육",
        "phonetic": "Yuk",
        "english": "Six (6)",
        "emoji": "6️⃣",
        "fact": "Sometimes pronounced as 'ryuk' in certain compound phrases."
      }
    ],
    "scene": {
      "location": "Village Fruit Market",
      "backgroundTheme": "market-stall",
      "illustration": "🍎",
      "context": "A friendly market customer with a gentle companion horse approaches the fresh fruit stand looking for a healthy snack!"
    },
    "characters": {
      "npc": {
        "id": "customer_horse",
        "name": "Market Customer & Horse (말과 손님)",
        "role": "Customer",
        "avatar": "🐴",
        "avatarSeed": "horse",
        "companionSeed": "horse",
        "voice": {
          "pitch": 0.85,
          "rate": 0.85
        },
        "relationshipLevel": "polite_formal"
      },
      "learner": {
        "role": "Fruit Stand Helper",
        "voice": {
          "pitch": 1.2,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "interactive_counter",
      "initialTurnId": "turn-counter-1",
      "targetItem": "apple",
      "targetCount": 3,
      "turns": [
        {
          "id": "turn-counter-1",
          "speaker": "customer_horse",
          "speech": {
            "korean": "말한테 줄 사과 세 개 주세요.",
            "phonetic": "Mal-han-te jul sa-gwa se gae ju-se-yo.",
            "english": "Please give me 3 apples for the horse."
          },
          "prompt": "Count and add 3 red apples to the wooden tray for the horse!",
          "isCounterTurn": true
        }
      ],
      "completion": {
        "badge": "🐴",
        "title": "Visual Counter & Apple Order Mastered!",
        "summary": "You counted three crisp apples (하나, 둘, 셋) and happily fed the companion horse with 여기 있어요!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-3",
    "number": 3,
    "title": "Family & People",
    "category": "People & Relationships",
    "icon": "👨‍👩‍👧",
    "description": "Learn how to talk about family members and people around you.",
    "words": [
      {
        "korean": "엄마",
        "phonetic": "Eom-ma",
        "english": "Mom / Mother",
        "emoji": "👩",
        "fact": "An affectionate, warm word that children and adults often use for their mother."
      },
      {
        "korean": "아빠",
        "phonetic": "A-ppa",
        "english": "Dad / Father",
        "emoji": "👨",
        "fact": "The everyday friendly title for dad in Korean homes."
      },
      {
        "korean": "친구",
        "phonetic": "Chin-gu",
        "english": "Friend",
        "emoji": "🤝",
        "fact": "Traditionally refers to peers of the same age, but widely used for close buddies!"
      },
      {
        "korean": "선생님",
        "phonetic": "Seon-saeng-nim",
        "english": "Teacher",
        "emoji": "🧑‍🏫",
        "fact": "'-nim' is an honorific suffix showing deep respect for mentors and teachers."
      },
      {
        "korean": "동생",
        "phonetic": "Dong-saeng",
        "english": "Younger Sibling",
        "emoji": "🧒",
        "fact": "Can mean younger brother ('nam-dongsaeng') or younger sister ('yeo-dongsaeng')."
      },
      {
        "korean": "가족",
        "phonetic": "Ga-jok",
        "english": "Family",
        "emoji": "🏠",
        "fact": "Literally connects to the characters for 'household' and 'tribe'!"
      }
    ],
    "goal": "Introduce family members respectfully to your teacher",
    "scene": {
      "location": "School Entrance Gate",
      "backgroundTheme": "school-morning",
      "illustration": "🏫",
      "context": "At the school entrance gate, you run into Teacher Park (박 선생님). She warmly smiles and asks you to introduce who is with you today!"
    },
    "characters": {
      "npc": {
        "id": "teacher_park",
        "name": "Teacher Park (박 선생님)",
        "role": "Teacher",
        "avatar": "👩‍🏫",
        "relationshipLevel": "polite_formal",
        "avatarSeed": "TeacherPark",
        "voice": {
          "pitch": 1.1,
          "rate": 0.85
        }
      },
      "learner": {
        "role": "Student",
        "voice": {
          "pitch": 1.3,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "dialogue",
      "initialTurnId": "turn-1",
      "turns": [
        {
          "id": "turn-1",
          "speaker": "teacher_park",
          "speech": {
            "korean": "가족을 소개해 주세요!",
            "phonetic": "Ga-jok-eul so-gae-hae ju-se-yo!",
            "english": "Please introduce your family!"
          },
          "prompt": "Introduce your mom politely using respectful '우리' (our/my):",
          "options": [
            {
              "id": "opt-3-1a",
              "korean": "우리 엄마예요.",
              "phonetic": "U-ri eom-ma-ye-yo.",
              "english": "This is my mom. (Polite & Warm)",
              "isCorrect": true,
              "feedback": {
                "title": "Beautiful & Natural! 💖",
                "explanation": "Koreans say '우리 엄마' (our mom) instead of '내 엄마' (my mom) to express affectionate communal warmth. Ending with '~예요' makes it polite.",
                "socialNuance": "Always use '우리' when referring to family members in Korean!"
              },
              "nextTurnId": "turn-2"
            },
            {
              "id": "opt-3-1b",
              "korean": "내 엄마야.",
              "phonetic": "Nae eom-ma-ya.",
              "english": "It's my mom. (Too casual)",
              "isCorrect": false,
              "feedback": {
                "title": "Too casual for a teacher! ⚠️",
                "explanation": "'~야' is casual talk (반말). When speaking to teachers or elders, introduce your family with polite '~예요'.",
                "socialNuance": "Use '우리 엄마예요' for respectful conversation."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-3-1c",
              "korean": "엄마예요 아니에요.",
              "phonetic": "Eom-ma-ye-yo a-ni-e-yo.",
              "english": "She is mom, she is not.",
              "isCorrect": false,
              "feedback": {
                "title": "Contradictory sentence! ❓",
                "explanation": "'아니에요' means 'is not'. To introduce your mom clearly, say '우리 엄마예요'.",
                "socialNuance": "Keep it clear and polite: '우리 엄마예요.'"
              },
              "nextTurnId": null
            }
          ]
        },
        {
          "id": "turn-2",
          "speaker": "teacher_park",
          "speech": {
            "korean": "반가워요! 옆에 계신 분은 누구예요?",
            "phonetic": "Ban-ga-wo-yo! Yeop-e gye-sin bun-eun nu-gu-ye-yo?",
            "english": "Nice to meet you! Who is the person next to you?"
          },
          "prompt": "Introduce your dad politely:",
          "options": [
            {
              "id": "opt-3-2a",
              "korean": "우리 아빠예요.",
              "phonetic": "U-ri a-ppa-ye-yo.",
              "english": "This is my dad. (Polite)",
              "isCorrect": true,
              "feedback": {
                "title": "Spot on! 🌟",
                "explanation": "'우리 아빠예요' is the perfect polite, respectful way to introduce your father to Teacher Park.",
                "socialNuance": "'우리' creates a warm, respectful family tone."
              },
              "nextTurnId": "turn-3"
            },
            {
              "id": "opt-3-2b",
              "korean": "친구예요.",
              "phonetic": "Chin-gu-ye-yo.",
              "english": "This is my friend.",
              "isCorrect": false,
              "feedback": {
                "title": "That introduces a friend! 🤝",
                "explanation": "'친구' means friend. To introduce your dad, use '아빠' (Dad).",
                "socialNuance": "Choose '우리 아빠예요' for your father."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-3-2c",
              "korean": "내 아빠다.",
              "phonetic": "Nae a-ppa-da.",
              "english": "That's my dad. (Informal monologue)",
              "isCorrect": false,
              "feedback": {
                "title": "Needs polite ending! ⚠️",
                "explanation": "'~다' is plain/informal form. Always address your teacher with polite '~예요'.",
                "socialNuance": "Polite '~예요' shows honor and respect."
              },
              "nextTurnId": null
            }
          ]
        },
        {
          "id": "turn-3",
          "speaker": "teacher_park",
          "speech": {
            "korean": "그리고 함께 온 귀여운 아이는 누구인가요?",
            "phonetic": "Geu-ri-go ham-kke on gwi-yeo-un a-i-neun nu-gu-in-ga-yo?",
            "english": "And who is this cute child who came along?"
          },
          "prompt": "Introduce your companion (friend or younger sibling):",
          "options": [
            {
              "id": "opt-3-3a",
              "korean": "제 친구예요.",
              "phonetic": "Je chin-gu-ye-yo.",
              "english": "This is my friend. (Humble polite)",
              "isCorrect": true,
              "feedback": {
                "title": "Perfect polite introduction! ✨",
                "explanation": "'제' is the humble polite form of 'my', and '친구' means friend. '제 친구예요' or '우리 동생이에요' sounds very natural!",
                "socialNuance": "'제 친구예요' shows courteous manners when introducing peers to teachers."
              },
              "nextTurnId": "turn-complete"
            },
            {
              "id": "opt-3-3b",
              "korean": "선생님이에요.",
              "phonetic": "Seon-saeng-nim-i-e-yo.",
              "english": "This is teacher.",
              "isCorrect": false,
              "feedback": {
                "title": "Teacher Park is the teacher! 👩‍🏫",
                "explanation": "You are talking to Teacher Park ('선생님'). You are introducing your companion friend or sibling!",
                "socialNuance": "Say '제 친구예요' (This is my friend)."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-3-3c",
              "korean": "안녕히 가세요.",
              "phonetic": "An-nyeong-hi ga-se-yo.",
              "english": "Goodbye.",
              "isCorrect": false,
              "feedback": {
                "title": "That's a goodbye! 👋",
                "explanation": "You're introducing someone, not saying farewell yet!",
                "socialNuance": "Use '제 친구예요' to introduce your friend."
              },
              "nextTurnId": null
            }
          ]
        }
      ],
      "completion": {
        "badge": "👨‍👩‍👧‍👦",
        "title": "Family Introduction Mastered!",
        "summary": "You introduced your mom (우리 엄마), dad (우리 아빠), and friend (제 친구) politely using respectful Korean etiquette!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-4",
    "number": 4,
    "title": "Vibrant Colors",
    "category": "Colors & Visuals",
    "icon": "🎨",
    "description": "Name bright and vivid colors you see every day.",
    "words": [
      {
        "korean": "빨간색",
        "phonetic": "Ppal-gan-saek",
        "english": "Red",
        "emoji": "🔴",
        "fact": "'Saek' means color. You see lots of red in Korean chili paste (gochujang)!"
      },
      {
        "korean": "파란색",
        "phonetic": "Pa-ran-saek",
        "english": "Blue",
        "emoji": "🔵",
        "fact": "The color of clear skies and the East Sea in Korea."
      },
      {
        "korean": "노란색",
        "phonetic": "No-ran-saek",
        "english": "Yellow",
        "emoji": "🟡",
        "fact": "Often associated with sweet yellow Forsythia flowers (Gaenari) blooming in spring."
      },
      {
        "korean": "초록색",
        "phonetic": "Cho-rok-saek",
        "english": "Green",
        "emoji": "🟢",
        "fact": "The fresh color of pine trees, jade, and summer mountains."
      },
      {
        "korean": "하얀색",
        "phonetic": "Ha-yan-saek",
        "english": "White",
        "emoji": "⚪",
        "fact": "Historically, Koreans were known as the 'white-clad folk' for wearing clean white Hanbok."
      },
      {
        "korean": "검은색",
        "phonetic": "Geom-eun-saek",
        "english": "Black",
        "emoji": "⚫",
        "fact": "Sleek and classic, like ink used in traditional East Asian calligraphy."
      }
    ],
    "goal": "Pick colors and paint the canvas in Korean",
    "scene": {
      "location": "Sunshine Art Studio",
      "backgroundTheme": "art-studio",
      "illustration": "🎨",
      "context": "Art Teacher Park is preparing a vibrant painting on the easel and asks for specific crayon colors!"
    },
    "characters": {
      "npc": {
        "id": "art_teacher",
        "name": "Art Teacher (미술 선생님)",
        "role": "Art Teacher",
        "avatar": "🎨",
        "avatarSeed": "ArtTeacherPark",
        "voice": {
          "pitch": 1.15,
          "rate": 0.85
        },
        "relationshipLevel": "polite_formal"
      },
      "learner": {
        "role": "Young Artist",
        "voice": {
          "pitch": 1.25,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "color_palette",
      "initialTurnId": "turn-paint-1",
      "targetColors": [
        {
          "id": "red",
          "kr": "빨간색",
          "en": "Red",
          "hex": "#ef4444",
          "phonetic": "Ppal-gan-saek"
        },
        {
          "id": "blue",
          "kr": "파란색",
          "en": "Blue",
          "hex": "#3b82f6",
          "phonetic": "Pa-ran-saek"
        },
        {
          "id": "yellow",
          "kr": "노란색",
          "en": "Yellow",
          "hex": "#eab308",
          "phonetic": "No-ran-saek"
        }
      ],
      "palette": [
        {
          "id": "red",
          "kr": "빨간색",
          "en": "Red",
          "hex": "#ef4444",
          "phonetic": "Ppal-gan-saek"
        },
        {
          "id": "blue",
          "kr": "파란색",
          "en": "Blue",
          "hex": "#3b82f6",
          "phonetic": "Pa-ran-saek"
        },
        {
          "id": "yellow",
          "kr": "노란색",
          "en": "Yellow",
          "hex": "#eab308",
          "phonetic": "No-ran-saek"
        },
        {
          "id": "green",
          "kr": "초록색",
          "en": "Green",
          "hex": "#22c55e",
          "phonetic": "Cho-rok-saek"
        },
        {
          "id": "white",
          "kr": "하얀색",
          "en": "White",
          "hex": "#f8fafc",
          "phonetic": "Ha-yan-saek"
        },
        {
          "id": "black",
          "kr": "검은색",
          "en": "Black",
          "hex": "#1e293b",
          "phonetic": "Geom-eun-saek"
        }
      ],
      "turns": [
        {
          "id": "turn-paint-1",
          "speaker": "art_teacher",
          "speech": {
            "korean": "빨간색 크레파스 주세요!",
            "phonetic": "Ppal-gan-saek keu-re-pa-seu ju-se-yo!",
            "english": "Please give me the red crayon!"
          },
          "prompt": "Select the matching Korean color from your palette to paint the canvas!",
          "targetColorId": "red"
        }
      ],
      "completion": {
        "badge": "🎨",
        "title": "Master Artist Colorist!",
        "summary": "You listened to Korean color requests (빨간색, 파란색, 노란색) and painted a colorful masterpiece canvas!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-5",
    "number": 5,
    "title": "Delicious Foods",
    "category": "Food & Drinks",
    "icon": "🍱",
    "description": "Common Korean meal staples and tasty food terms.",
    "words": [
      {
        "korean": "밥",
        "phonetic": "Bap",
        "english": "Cooked Rice / Meal",
        "emoji": "🍚",
        "fact": "'Bap meogeosseoyo?' (Have you eaten rice?) is a warm everyday way to ask 'How are you?'"
      },
      {
        "korean": "물",
        "phonetic": "Mul",
        "english": "Water",
        "emoji": "💧",
        "fact": "A super handy word in restaurants: 'Mul juseyo' means 'Please give me water'!"
      },
      {
        "korean": "김치",
        "phonetic": "Kim-chi",
        "english": "Kimchi",
        "emoji": "🥬",
        "fact": "Korea's famous fermented vegetable dish made with Napa cabbage, radish, and seasonings."
      },
      {
        "korean": "고기",
        "phonetic": "Go-gi",
        "english": "Meat",
        "emoji": "🥩",
        "fact": "Key ingredient in Korean BBQ favorites like bulgogi and galbi!"
      },
      {
        "korean": "맛있어요",
        "phonetic": "Ma-si-sseo-yo",
        "english": "Delicious / Yum",
        "emoji": "😋",
        "fact": "Say this when enjoying a tasty meal or snack—cooks love hearing it!"
      },
      {
        "korean": "우유",
        "phonetic": "U-yu",
        "english": "Milk",
        "emoji": "🥛",
        "fact": "Korean banana milk ('banana-mat uyu') in the chubby bottle is a beloved classic snack."
      }
    ],
    "goal": "Order delicious food politely at a Korean snack bar",
    "scene": {
      "location": "Happy Snack Bar (분식집)",
      "backgroundTheme": "snack-bar",
      "illustration": "🍲",
      "context": "You sit down at the counter of a cozy neighborhood Bunsikjib. Halmeoni (할머니) greets you with a warm smile!"
    },
    "characters": {
      "npc": {
        "id": "shopkeeper_halmeoni",
        "name": "Bunsik Halmeoni (분식집 할머니)",
        "role": "Shopkeeper",
        "avatar": "👵",
        "avatarSeed": "Halmeoni",
        "voice": {
          "pitch": 0.9,
          "rate": 0.85
        },
        "relationshipLevel": "polite_formal"
      },
      "learner": {
        "role": "Customer",
        "voice": {
          "pitch": 1.2,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "food_order",
      "initialTurnId": "turn-food-1",
      "menuItems": [
        {
          "id": "rice",
          "kr": "밥",
          "en": "Cooked Rice / Meal",
          "emoji": "🍚",
          "phonetic": "Bap"
        },
        {
          "id": "water",
          "kr": "물",
          "en": "Water",
          "emoji": "💧",
          "phonetic": "Mul"
        },
        {
          "id": "kimchi",
          "kr": "김치",
          "en": "Kimchi",
          "emoji": "🥬",
          "phonetic": "Gim-chi"
        },
        {
          "id": "meat",
          "kr": "고기",
          "en": "Meat",
          "emoji": "🥩",
          "phonetic": "Go-gi"
        },
        {
          "id": "milk",
          "kr": "우유",
          "en": "Milk",
          "emoji": "🥛",
          "phonetic": "U-yu"
        }
      ],
      "turns": [
        {
          "id": "turn-food-1",
          "speaker": "shopkeeper_halmeoni",
          "speech": {
            "korean": "어서오세요! 무엇을 드릴까요?",
            "phonetic": "Eo-seo-o-se-yo! Mu-eot-eul deu-ril-kka-yo?",
            "english": "Welcome! What can I get for you?"
          },
          "prompt": "Order rice and water politely using '~주세요' (please give me):",
          "options": [
            {
              "id": "opt-5-1a",
              "korean": "밥 주세요!",
              "phonetic": "Bap ju-se-yo!",
              "english": "Rice / Meal please! (Polite)",
              "isCorrect": true,
              "feedback": {
                "title": "Delicious choice! 🍚",
                "explanation": "'~주세요' (ju-se-yo) is the golden polite phrase for requesting food, items, or services in Korea.",
                "socialNuance": "Always say '주세요' with a friendly tone at restaurants!"
              },
              "nextTurnId": "turn-food-2"
            },
            {
              "id": "opt-5-1b",
              "korean": "밥 줘.",
              "phonetic": "Bap jwo.",
              "english": "Give me rice. (Impolite/Rude)",
              "isCorrect": false,
              "feedback": {
                "title": "Too blunt and impolite! ⚠️",
                "explanation": "'줘' is informal command (반말). When ordering from elders or restaurant staff, always say '주세요'.",
                "socialNuance": "Respectful diners always use '~주세요'."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-5-1c",
              "korean": "안녕히 가세요.",
              "phonetic": "An-nyeong-hi ga-se-yo.",
              "english": "Goodbye.",
              "isCorrect": false,
              "feedback": {
                "title": "Don't leave before eating! 🏃",
                "explanation": "You just arrived at the restaurant table! Place your order with '밥 주세요'.",
                "socialNuance": "Order first before saying goodbye!"
              },
              "nextTurnId": null
            }
          ],
          "isFoodTurn": true
        },
        {
          "id": "turn-food-2",
          "speaker": "shopkeeper_halmeoni",
          "speech": {
            "korean": "따뜻한 밥 나왔어요! 더 필요한 것 있어요?",
            "phonetic": "Tta-tteut-han bap na-wat-seo-yo! Deo pil-yo-han geot i-sseo-yo?",
            "english": "Here is warm rice! Do you need anything else?"
          },
          "prompt": "Request a glass of water politely:",
          "options": [
            {
              "id": "opt-5-2a",
              "korean": "물 주세요!",
              "phonetic": "Mul ju-se-yo!",
              "english": "Water please! (Polite)",
              "isCorrect": true,
              "feedback": {
                "title": "Crystal clear! 💧",
                "explanation": "'물 주세요' is heard every day in Korean dining. Water is often complimentary at restaurants!",
                "socialNuance": "'물 주세요' is universally polite and natural."
              },
              "nextTurnId": "turn-food-3"
            },
            {
              "id": "opt-5-2b",
              "korean": "물 아니에요.",
              "phonetic": "Mul a-ni-e-yo.",
              "english": "It is not water.",
              "isCorrect": false,
              "feedback": {
                "title": "Not an order! ❓",
                "explanation": "'아니에요' means 'is not'. To ask for water, say '물 주세요'.",
                "socialNuance": "Use '~주세요' when making a request."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-5-2c",
              "korean": "잘 자요.",
              "phonetic": "Jal ja-yo.",
              "english": "Sleep well.",
              "isCorrect": false,
              "feedback": {
                "title": "You're at lunch, not bedtime! 😴",
                "explanation": "'잘 자요' means good night. Ask for water with '물 주세요'.",
                "socialNuance": "Keep meal requests focused on food and drinks."
              },
              "nextTurnId": null
            }
          ]
        },
        {
          "id": "turn-food-3",
          "speaker": "shopkeeper_halmeoni",
          "speech": {
            "korean": "시원한 물도 드려요! 맛있게 드세요!",
            "phonetic": "Si-won-han mul-do deu-ryeo-yo! Mas-it-ge deu-se-yo!",
            "english": "Here is cool water too! Enjoy your meal!"
          },
          "prompt": "After tasting the food, show your appreciation politely:",
          "options": [
            {
              "id": "opt-5-3a",
              "korean": "맛있어요! 감사합니다!",
              "phonetic": "Mas-it-seo-yo! Gam-sa-ham-ni-da!",
              "english": "It's delicious! Thank you! (Polite)",
              "isCorrect": true,
              "feedback": {
                "title": "Halmeoni is overjoyed! ❤️",
                "explanation": "Complimenting food with '맛있어요!' and saying '감사합니다!' is the highest etiquette praise for a Korean chef.",
                "socialNuance": "Expressing appreciation makes everyone smile warmly!"
              },
              "nextTurnId": "turn-complete"
            },
            {
              "id": "opt-5-3b",
              "korean": "맛없어요.",
              "phonetic": "Mad-eop-seo-yo.",
              "english": "It tastes bad.",
              "isCorrect": false,
              "feedback": {
                "title": "Ouch, how discouraging! 💔",
                "explanation": "'맛없어요' means it doesn't taste good. Compliment the delicious food with '맛있어요!'.",
                "socialNuance": "Praise food kindly with '맛있어요! 감사합니다!'."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-5-3c",
              "korean": "아니요.",
              "phonetic": "A-ni-yo.",
              "english": "No.",
              "isCorrect": false,
              "feedback": {
                "title": "Don't forget to thank the host! 🙏",
                "explanation": "Thank Halmeoni warmly for the meal by saying '맛있어요! 감사합니다!'.",
                "socialNuance": "Always say thank you after receiving food."
              },
              "nextTurnId": null
            }
          ]
        }
      ],
      "completion": {
        "badge": "🍲",
        "title": "Bunsik Dining Etiquette Mastered!",
        "summary": "You ordered food politely with '~주세요' (밥 주세요, 물 주세요) and praised the chef with '맛있어요! 감사합니다!'",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-6",
    "number": 6,
    "title": "Friendly Animals",
    "category": "Nature & Animals",
    "icon": "🐾",
    "description": "Favorite pets and wild creatures in Korean.",
    "words": [
      {
        "korean": "강아지",
        "phonetic": "Gang-a-ji",
        "english": "Puppy / Dog",
        "emoji": "🐶",
        "fact": "An affectionate word for a puppy or pet dog. Korean dogs bark 'meong-meong'!"
      },
      {
        "korean": "고양이",
        "phonetic": "Go-yang-i",
        "english": "Cat",
        "emoji": "🐱",
        "fact": "Korean cats meow 'ya-ong'! Street cats are lovingly called 'gil-goyangi'."
      },
      {
        "korean": "토끼",
        "phonetic": "To-kki",
        "english": "Rabbit / Bunny",
        "emoji": "🐰",
        "fact": "In Korean folklore, a moon rabbit pounds sweet rice cakes on the full moon!"
      },
      {
        "korean": "곰",
        "phonetic": "Gom",
        "english": "Bear",
        "emoji": "🐻",
        "fact": "Bears play a starring role in the ancient Korean foundation myth of Dangun."
      },
      {
        "korean": "새",
        "phonetic": "Sae",
        "english": "Bird",
        "emoji": "🐦",
        "fact": "Short one-syllable word. Magpies ('kkachi') are considered lucky birds in Korea."
      },
      {
        "korean": "물고기",
        "phonetic": "Mul-go-gi",
        "english": "Fish",
        "emoji": "🐟",
        "fact": "Literally translates to 'water meat' ('mul' = water, 'gogi' = meat)!"
      }
    ],
    "scene": {
      "location": "Sunny Neighborhood Park",
      "backgroundTheme": "park-green",
      "illustration": "🐾",
      "context": "You are strolling in the neighborhood park when Teacher Park stops by with a cheerful smile to ask about your pets!"
    },
    "characters": {
      "npc": {
        "id": "teacher_park",
        "name": "Teacher Park (박 선생님)",
        "role": "Teacher",
        "avatar": "👩‍🏫",
        "avatarSeed": "TeacherPark",
        "voice": {
          "pitch": 1.1,
          "rate": 0.85
        },
        "relationshipLevel": "polite_formal"
      },
      "learner": {
        "role": "Student",
        "voice": {
          "pitch": 1.3,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "pet_customizer",
      "initialTurnId": "turn-pet-1",
      "turns": [
        {
          "id": "turn-pet-1",
          "speaker": "teacher_park",
          "speech": {
            "korean": "어떤 반려동물이 있어요?",
            "phonetic": "Eo-tteon ban-ryeo-dong-mul-i i-sseo-yo?",
            "english": "What kind of pet do you have?"
          },
          "prompt": "Customize your pet (animal & color) and say the matching Korean sentence to Teacher Park!",
          "isCustomizerTurn": true
        }
      ],
      "completion": {
        "badge": "🐾",
        "title": "Pet Introduction Mastered!",
        "summary": "You customized your companion pet and introduced it proudly in polite Korean (존댓말)!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-7",
    "number": 7,
    "title": "School & Stationery",
    "category": "Learning & School",
    "icon": "🎒",
    "description": "Words for school life, writing tools, and study time.",
    "words": [
      {
        "korean": "학교",
        "phonetic": "Hak-gyo",
        "english": "School",
        "emoji": "🏫",
        "fact": "Elementary school in Korea is called 'chodeung-hakgyo'."
      },
      {
        "korean": "책",
        "phonetic": "Chaek",
        "english": "Book",
        "emoji": "📖",
        "fact": "Reading a book is 'chaek-eul ilgeo-yo'."
      },
      {
        "korean": "연필",
        "phonetic": "Yeon-pil",
        "english": "Pencil",
        "emoji": "✏️",
        "fact": "A handy tool for practicing Hangul stroke orders!"
      },
      {
        "korean": "가방",
        "phonetic": "Ga-bang",
        "english": "Bag / Backpack",
        "emoji": "🎒",
        "fact": "Borrowed from Portuguese 'capa' / Japanese centuries ago into modern Korean."
      },
      {
        "korean": "책상",
        "phonetic": "Chaek-sang",
        "english": "Desk",
        "emoji": "🪑",
        "fact": "Literally combines 'chaek' (book) and 'sang' (table)!"
      },
      {
        "korean": "시계",
        "phonetic": "Si-gye",
        "english": "Clock / Watch",
        "emoji": "⏰",
        "fact": "Helps everyone stay punctual for morning classes."
      }
    ],
    "goal": "Pack your school backpack with essential study supplies",
    "scene": {
      "location": "Home Study Desk",
      "backgroundTheme": "study-desk",
      "illustration": "🎒",
      "context": "Before walking to school, Mom checks your desk: '가방에 필요한 학용품이 다 있어요?' (Do you have all your school items in your bag?)"
    },
    "characters": {
      "npc": {
        "id": "mom_avatar",
        "name": "Mom (엄마)",
        "role": "Parent",
        "avatar": "👩",
        "avatarSeed": "KoreanMom",
        "voice": {
          "pitch": 1.15,
          "rate": 0.85
        },
        "relationshipLevel": "polite_formal"
      },
      "learner": {
        "role": "Student",
        "voice": {
          "pitch": 1.25,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "backpack_pack",
      "initialTurnId": "turn-pack-1",
      "requiredItems": [
        {
          "id": "book",
          "kr": "책",
          "en": "Book",
          "emoji": "📖",
          "phonetic": "Chaek"
        },
        {
          "id": "pencil",
          "kr": "연필",
          "en": "Pencil",
          "emoji": "✏️",
          "phonetic": "Yeon-pil"
        },
        {
          "id": "clock",
          "kr": "시계",
          "en": "Clock / Watch",
          "emoji": "⏰",
          "phonetic": "Si-gye"
        }
      ],
      "deskItems": [
        {
          "id": "book",
          "kr": "책",
          "en": "Book",
          "emoji": "📖",
          "phonetic": "Chaek",
          "isEssential": true
        },
        {
          "id": "pencil",
          "kr": "연필",
          "en": "Pencil",
          "emoji": "✏️",
          "phonetic": "Yeon-pil",
          "isEssential": true
        },
        {
          "id": "clock",
          "kr": "시계",
          "en": "Clock / Watch",
          "emoji": "⏰",
          "phonetic": "Si-gye",
          "isEssential": true
        },
        {
          "id": "desk",
          "kr": "책상",
          "en": "Desk (Too heavy!)",
          "emoji": "🪑",
          "phonetic": "Chaek-sang",
          "isEssential": false
        },
        {
          "id": "school",
          "kr": "학교",
          "en": "School Building",
          "emoji": "🏫",
          "phonetic": "Hak-gyo",
          "isEssential": false
        }
      ],
      "turns": [
        {
          "id": "turn-pack-1",
          "speaker": "mom_avatar",
          "speech": {
            "korean": "가방에 책이 있어요?",
            "phonetic": "Ga-bang-e chaek-i i-sseo-yo?",
            "english": "Do you have your book in the bag?"
          },
          "prompt": "Find and tap the requested stationery item from your desk to pack into your backpack!",
          "targetItemId": "book"
        }
      ],
      "completion": {
        "badge": "🎒",
        "title": "School Backpack Ready!",
        "summary": "You identified essential stationery words (책, 연필, 시계, 가방) and packed your school bag perfectly!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-8",
    "number": 8,
    "title": "Feelings & Moods",
    "category": "Feelings & Expressions",
    "icon": "😊",
    "description": "Express how your day is going and share your emotions.",
    "words": [
      {
        "korean": "행복해요",
        "phonetic": "Haeng-bok-hae-yo",
        "english": "Happy",
        "emoji": "😄",
        "fact": "From the noun 'haengbok' (happiness) plus polite 'haeyo' (doing/feeling)."
      },
      {
        "korean": "좋아요",
        "phonetic": "Jo-a-yo",
        "english": "Good / I like it",
        "emoji": "👍",
        "fact": "Used constantly in Korea to say 'Sounds great!' or 'I like that idea!'"
      },
      {
        "korean": "슬퍼요",
        "phonetic": "Seul-peo-yo",
        "english": "Sad",
        "emoji": "😢",
        "fact": "Expresses sadness or empathy when watching an emotional story."
      },
      {
        "korean": "피곤해요",
        "phonetic": "Pi-gon-hae-yo",
        "english": "Tired / Sleepy",
        "emoji": "🥱",
        "fact": "Great phrase after a long day of sports, studying, or travel."
      },
      {
        "korean": "신나요",
        "phonetic": "Sin-na-yo",
        "english": "Excited / Fun",
        "emoji": "🎉",
        "fact": "Say this when you're looking forward to an amusement park or party!"
      },
      {
        "korean": "괜찮아요",
        "phonetic": "Gwaen-chan-a-yo",
        "english": "It's Okay / No problem",
        "emoji": "👌",
        "fact": "One of the most reassuring everyday phrases in the Korean language."
      }
    ],
    "goal": "Express your mood and feelings during school recess",
    "scene": {
      "location": "Sunny School Playground",
      "backgroundTheme": "playground",
      "illustration": "🛝",
      "context": "During recess break under the blue sky, your cheerful classmate Min-jun runs over and asks how you are feeling!"
    },
    "characters": {
      "npc": {
        "id": "classmate_minjun",
        "name": "Classmate Min-jun (민준)",
        "role": "Friend & Classmate",
        "avatar": "👦",
        "avatarSeed": "MinjunVoxel",
        "voice": {
          "pitch": 1.25,
          "rate": 0.9
        },
        "relationshipLevel": "polite_friendly"
      },
      "learner": {
        "role": "Classmate",
        "voice": {
          "pitch": 1.25,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "emotion_check",
      "initialTurnId": "turn-mood-1",
      "emotions": [
        {
          "id": "happy",
          "kr": "행복해요",
          "en": "Happy",
          "emoji": "😊",
          "phonetic": "Haeng-bok-hae-yo",
          "response": "우와, 정말 멋져요! 같이 신나게 놀아요! (Awesome! Let's play together!)"
        },
        {
          "id": "tired",
          "kr": "피곤해요",
          "en": "Tired / Sleepy",
          "emoji": "😴",
          "phonetic": "Pi-gon-hae-yo",
          "response": "그렇군요! 벤치에서 조금 쉬어요, 괜찮아요! (I see! Let's rest a bit on the bench, it's okay!)"
        },
        {
          "id": "excited",
          "kr": "신나요",
          "en": "Excited / Fun",
          "emoji": "🥳",
          "phonetic": "Sin-na-yo",
          "response": "최고예요! 그네 타러 갈까요? (Best feeling ever! Shall we go on the swings?)"
        },
        {
          "id": "good",
          "kr": "좋아요",
          "en": "Good / Feeling well",
          "emoji": "👍",
          "phonetic": "Jo-a-yo",
          "response": "좋은 하루예요! 힘차게 보내요! (Have a wonderful day! Keep up the great energy!)"
        }
      ],
      "turns": [
        {
          "id": "turn-mood-1",
          "speaker": "classmate_minjun",
          "speech": {
            "korean": "오늘 기분이 어때요?",
            "phonetic": "O-neul gi-bun-i eo-ttae-yo?",
            "english": "How do you feel today?"
          },
          "prompt": "Share your current feeling with Min-jun in Korean!"
        }
      ],
      "completion": {
        "badge": "😊",
        "title": "Recess Mood Check-in Complete!",
        "summary": "You communicated your emotions authentically (행복해요, 피곤해요, 신나요) and shared a supportive moment with Min-jun!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-9",
    "number": 9,
    "title": "Body & Senses",
    "category": "Body & Health",
    "icon": "👀",
    "description": "Basic body parts to describe yourself and stay healthy.",
    "words": [
      {
        "korean": "눈",
        "phonetic": "Nun",
        "english": "Eye (or Snow)",
        "emoji": "👁️",
        "fact": "'Nun' means both 'eye' and 'falling snow'—you tell them apart by context!"
      },
      {
        "korean": "코",
        "phonetic": "Ko",
        "english": "Nose",
        "emoji": "👃",
        "fact": "A punchy single syllable that's super easy to remember."
      },
      {
        "korean": "입",
        "phonetic": "Ip",
        "english": "Mouth",
        "emoji": "👄",
        "fact": "Used for speaking and tasting delicious Korean dishes!"
      },
      {
        "korean": "귀",
        "phonetic": "Gwi",
        "english": "Ear",
        "emoji": "👂",
        "fact": "'Gwi' is also the root for 'gwiyeowo' (cute / adorable)!"
      },
      {
        "korean": "손",
        "phonetic": "Son",
        "english": "Hand",
        "emoji": "✋",
        "fact": "Used in 'son-ssitgi' (hand washing) and friendly high fives."
      },
      {
        "korean": "발",
        "phonetic": "Bal",
        "english": "Foot",
        "emoji": "🦶",
        "fact": "Don't confuse with 'dal' (moon) or 'tal' (mask)—notice the crisp 'b' sound!"
      }
    ],
    "goal": "Identify body parts in Korean during a fun health check",
    "scene": {
      "location": "Friendly School Clinic",
      "backgroundTheme": "clinic-room",
      "illustration": "🩺",
      "context": "At the school health clinic, Nurse Song (송 선생님) plays an interactive touch-and-check game: '선생님이 부르는 몸 부위를 짚어보세요!'"
    },
    "characters": {
      "npc": {
        "id": "nurse_song",
        "name": "Nurse Song (송 선생님)",
        "role": "School Health Nurse",
        "avatar": "👩‍⚕️",
        "avatarSeed": "NurseSong",
        "voice": {
          "pitch": 1.1,
          "rate": 0.85
        },
        "relationshipLevel": "polite_formal"
      },
      "learner": {
        "role": "Student",
        "voice": {
          "pitch": 1.25,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "body_tap",
      "initialTurnId": "turn-body-1",
      "targets": [
        {
          "id": "eyes",
          "kr": "눈",
          "en": "Eye",
          "emoji": "👀",
          "phonetic": "Nun",
          "promptKr": "눈을 가리켜 보세요!",
          "promptEn": "Point to your eyes!"
        },
        {
          "id": "nose",
          "kr": "코",
          "en": "Nose",
          "emoji": "👃",
          "phonetic": "Ko",
          "promptKr": "코를 가리켜 보세요!",
          "promptEn": "Point to your nose!"
        },
        {
          "id": "mouth",
          "kr": "입",
          "en": "Mouth",
          "emoji": "👄",
          "phonetic": "Ip",
          "promptKr": "입을 가리켜 보세요!",
          "promptEn": "Point to your mouth!"
        },
        {
          "id": "ears",
          "kr": "귀",
          "en": "Ear",
          "emoji": "👂",
          "phonetic": "Gwi",
          "promptKr": "귀를 가리켜 보세요!",
          "promptEn": "Point to your ears!"
        },
        {
          "id": "hands",
          "kr": "손",
          "en": "Hand",
          "emoji": "✋",
          "phonetic": "Son",
          "promptKr": "손을 가리켜 보세요!",
          "promptEn": "Point to your hands!"
        }
      ],
      "turns": [
        {
          "id": "turn-body-1",
          "speaker": "nurse_song",
          "speech": {
            "korean": "눈을 가리켜 보세요!",
            "phonetic": "Nun-eul ga-ri-kyeo bo-se-yo!",
            "english": "Point to your eyes!"
          },
          "prompt": "Tap the matching body part on the diagram or button grid!",
          "targetPartId": "eyes"
        }
      ],
      "completion": {
        "badge": "🩺",
        "title": "Health Check Champion!",
        "summary": "You listened closely to Korean sensory body cues (눈, 코, 입, 귀, 손) and pointed out every part accurately!",
        "rewardText": "⭐ Scenario Mastered (+1 Star)"
      }
    }
  },
  {
    "id": "lesson-10",
    "number": 10,
    "title": "Daily Action Verbs",
    "category": "Verbs & Actions",
    "icon": "⚡",
    "description": "Everyday action words in polite conversational form.",
    "words": [
      {
        "korean": "가요",
        "phonetic": "Ga-yo",
        "english": "Go / Going",
        "emoji": "🚶",
        "fact": "From the verb 'gada' (to go). 'Haggyo-e gayo' = I'm going to school!"
      },
      {
        "korean": "와요",
        "phonetic": "Wa-yo",
        "english": "Come / Coming",
        "emoji": "🏃",
        "fact": "'Eoseo wayo' means welcome, please come in!"
      },
      {
        "korean": "먹어요",
        "phonetic": "Meog-eo-yo",
        "english": "Eat / Eating",
        "emoji": "🍽️",
        "fact": "From 'meokda' (to eat). 'Masitge meogeoyo' = Enjoy your meal!"
      },
      {
        "korean": "마셔요",
        "phonetic": "Ma-syeo-yo",
        "english": "Drink / Drinking",
        "emoji": "🥤",
        "fact": "Used when drinking water, juice, or warm tea."
      },
      {
        "korean": "자요",
        "phonetic": "Ja-yo",
        "english": "Sleep / Sleeping",
        "emoji": "😴",
        "fact": "'Jal jayo' is the sweet, polite phrase for 'Sleep well' / 'Good night'!"
      },
      {
        "korean": "공부해요",
        "phonetic": "Gong-bu-hae-yo",
        "english": "Study / Studying",
        "emoji": "📚",
        "fact": "From 'gongbu' (study) + 'haeyo' (doing). You are doing it right now with Korean!"
      }
    ],
    "goal": "Plan after-school activities using core Korean action verbs",
    "scene": {
      "location": "School Exit Gate (Afternoon)",
      "backgroundTheme": "school-afternoon",
      "illustration": "🎒",
      "context": "The afternoon bell rings! Classmate Min-jun walks beside you to the front gate and excitedly asks about your plans!"
    },
    "characters": {
      "npc": {
        "id": "classmate_minjun",
        "name": "Classmate Min-jun (민준)",
        "role": "Friend & Classmate",
        "avatar": "👦",
        "avatarSeed": "MinjunVoxel",
        "voice": {
          "pitch": 1.25,
          "rate": 0.9
        },
        "relationshipLevel": "polite_friendly"
      },
      "learner": {
        "role": "Classmate",
        "voice": {
          "pitch": 1.25,
          "rate": 0.9
        }
      }
    },
    "scenario": {
      "type": "dialogue",
      "isFinale": true,
      "initialTurnId": "turn-verb-1",
      "turns": [
        {
          "id": "turn-verb-1",
          "speaker": "classmate_minjun",
          "speech": {
            "korean": "방과 후에 배고프지 않아요? 뭐 해요?",
            "phonetic": "Bang-gwa hu-e bae-go-peu-ji an-a-yo? Mwo hae-yo?",
            "english": "Aren't you hungry after school? What shall we do?"
          },
          "prompt": "Suggest having a delicious snack together:",
          "options": [
            {
              "id": "opt-10-1a",
              "korean": "밥 먹어요!",
              "phonetic": "Bap meog-eo-yo!",
              "english": "Let's eat a meal / snack! (Polite & Friendly)",
              "isCorrect": true,
              "feedback": {
                "title": "Delicious idea! 🍚",
                "explanation": "'먹어요' (from 먹다 - to eat) is the versatile present/polite imperative form meaning 'I eat' or 'Let's eat!'.",
                "socialNuance": "Suggesting food builds great friendships in Korea!"
              },
              "nextTurnId": "turn-verb-2"
            },
            {
              "id": "opt-10-1b",
              "korean": "지금 자요.",
              "phonetic": "Ji-geum ja-yo.",
              "english": "I am sleeping right now.",
              "isCorrect": false,
              "feedback": {
                "title": "You're wide awake standing at the gate! 😴",
                "explanation": "'자요' means 'sleep'. Suggest eating first with '밥 먹어요!'.",
                "socialNuance": "Save '자요' for bedtime."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-10-1c",
              "korean": "학교 가요.",
              "phonetic": "Hak-gyo ga-yo.",
              "english": "I go to school.",
              "isCorrect": false,
              "feedback": {
                "title": "You just finished school! 🏫",
                "explanation": "'학교 가요' means going to school. Class just finished, so invite your buddy to eat!",
                "socialNuance": "Say '밥 먹어요!' (Let's eat!)."
              },
              "nextTurnId": null
            }
          ]
        },
        {
          "id": "turn-verb-2",
          "speaker": "classmate_minjun",
          "speech": {
            "korean": "좋아요! 밥 먹고 나서 우리 뭐 할까요?",
            "phonetic": "Jo-a-yo! Bap meok-go na-seo u-ri mwo hal-kka-yo?",
            "english": "Sounds great! What shall we do after eating?"
          },
          "prompt": "Suggest playing outside together:",
          "options": [
            {
              "id": "opt-10-2a",
              "korean": "놀이터에서 놀아요!",
              "phonetic": "No-ri-teo-e-seo no-ra-yo!",
              "english": "Let's play at the playground! (Polite & Fun)",
              "isCorrect": true,
              "feedback": {
                "title": "Super fun plan! 🛝",
                "explanation": "'놀아요' (from 놀다 - to play/hang out) is widely used by kids and adults alike for having fun together.",
                "socialNuance": "'놀아요!' is full of positive energy."
              },
              "nextTurnId": "turn-verb-3"
            },
            {
              "id": "opt-10-2b",
              "korean": "물 마셔요.",
              "phonetic": "Mul ma-syeo-yo.",
              "english": "I drink water.",
              "isCorrect": false,
              "feedback": {
                "title": "Healthy, but what about the fun? 💧",
                "explanation": "'마셔요' means drink. Invite your friend to play using '놀아요!'.",
                "socialNuance": "'놀아요' invites active friendship."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-10-2c",
              "korean": "안녕히 계세요.",
              "phonetic": "An-nyeong-hi gye-se-yo.",
              "english": "Goodbye (to someone staying).",
              "isCorrect": false,
              "feedback": {
                "title": "Don't say goodbye yet! 👋",
                "explanation": "You're making exciting afternoon plans together! Suggest playing with '놀아요!'.",
                "socialNuance": "Plan together with '놀아요!'."
              },
              "nextTurnId": null
            }
          ]
        },
        {
          "id": "turn-verb-3",
          "speaker": "classmate_minjun",
          "speech": {
            "korean": "신나게 놀고, 저녁에는 내일 시험 준비도 해요!",
            "phonetic": "Sin-na-ge nol-go, jeo-nyeok-e-neun nae-il si-heom jun-bi-do hae-yo!",
            "english": "After playing happily, let's prepare for tomorrow's test this evening too!"
          },
          "prompt": "Agree diligently to study in the evening:",
          "options": [
            {
              "id": "opt-10-3a",
              "korean": "네, 저녁에 같이 공부해요!",
              "phonetic": "Ne, jeo-nyeok-e gat-i gong-bu-hae-yo!",
              "english": "Yes, let's study together in the evening!",
              "isCorrect": true,
              "feedback": {
                "title": "Star Student! 🌟",
                "explanation": "'공부해요' (from 공부하다 - to study) shows dedication and diligence. You balanced play and study perfectly!",
                "socialNuance": "Partnering with study buddies is a cherished Korean school tradition!"
              },
              "nextTurnId": "turn-complete"
            },
            {
              "id": "opt-10-3b",
              "korean": "공부 안 해요.",
              "phonetic": "Gong-bu an hae-yo.",
              "english": "I don't study.",
              "isCorrect": false,
              "feedback": {
                "title": "A true scholar never gives up! 📚",
                "explanation": "Encourage your study buddy with '같이 공부해요!' (Let's study together!).",
                "socialNuance": "Be positive about studying with friends."
              },
              "nextTurnId": null
            },
            {
              "id": "opt-10-3c",
              "korean": "집에 와요.",
              "phonetic": "Jip-e wa-yo.",
              "english": "Come to home.",
              "isCorrect": false,
              "feedback": {
                "title": "Answer the question about study! ✏️",
                "explanation": "Min-jun suggested studying. Agree enthusiastically with '네, 같이 공부해요!'.",
                "socialNuance": "Use '공부해요' to confirm study plans."
              },
              "nextTurnId": null
            }
          ]
        }
      ],
      "completion": {
        "badge": "🎓",
        "title": "10-Lesson Korean Odyssey Complete!",
        "summary": "축하합니다! (Congratulations!) You mastered all 10 Korean foundation lessons, from essential greetings and food etiquette to active after-school plans!",
        "rewardText": "🌟 Grand Star Master (+1 Star & Course Completion)"
      }
    }
  }
];
