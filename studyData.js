// 9TH CLASS SINDH TEXTBOOK DATA
// Replace this content with your actual textbook content

export const studyData = {
  subjects: [
    {
      id: 1,
      name: 'Urdu',
      icon: '📖'
    },
    {
      id: 2,
      name: 'English',
      icon: '🌍'
    },
    {
      id: 3,
      name: 'Mathematics',
      icon: '🔢'
    },
    {
      id: 4,
      name: 'Science',
      icon: '🧪'
    },
    {
      id: 5,
      name: 'Islamic Studies',
      icon: '📿'
    }
  ],

  chapters: {
    1: [ // Urdu
      {
        id: 1,
        title: 'Chapter 1: اردو ادب کی تاریخ',
        content: `
          یہاں اپنے textbook سے chapter کا مکمل ٹیکسٹ پیسٹ کریں۔
          
          یہ حصہ پڑھنے کے لیے ہے۔ سب ٹاپکس، تاریخ، اور تفصیلات شامل کریں۔
          
          مثال:
          - نقطہ 1
          - نقطہ 2
          - نقطہ 3
        `,
        questions: [
          {
            question: 'سوال 1: اردو ادب کب سے شروع ہوا؟',
            answer: 'جواب یہاں لکھیں'
          },
          {
            question: 'سوال 2: مشہور شاعر کون تھے؟',
            answer: 'جواب یہاں لکھیں'
          }
        ],
        mcqs: [
          {
            id: 1,
            question: 'اردو ادب کی بنیاد کس نے رکھی؟',
            options: ['آپشن A', 'آپشن B', 'آپشن C', 'آپشن D'],
            correctAnswer: 0
          },
          {
            id: 2,
            question: 'کون سی تاریخ اہم ہے؟',
            options: ['سن A', 'سن B', 'سن C', 'سن D'],
            correctAnswer: 1
          }
        ]
      },
      {
        id: 2,
        title: 'Chapter 2: شاعری اور نثر',
        content: `
          یہاں Chapter 2 کا مکمل ٹیکسٹ پیسٹ کریں۔
        `,
        questions: [
          {
            question: 'شاعری اور نثر میں کیا فرق ہے؟',
            answer: 'جواب یہاں لکھیں'
          }
        ],
        mcqs: [
          {
            id: 1,
            question: 'نثر کے کتنے حصے ہیں؟',
            options: ['2', '3', '4', '5'],
            correctAnswer: 1
          }
        ]
      }
    ],

    2: [ // English
      {
        id: 1,
        title: 'Chapter 1: English Grammar Basics',
        content: `
          English grammar fundamentals from your textbook.
          
          Topics to cover:
          - Parts of Speech
          - Tenses
          - Sentence Structure
          - Punctuation
        `,
        questions: [
          {
            question: 'What are the parts of speech?',
            answer: 'Answer here from textbook'
          }
        ],
        mcqs: [
          {
            id: 1,
            question: 'Which is a noun?',
            options: ['run', 'book', 'quickly', 'beautiful'],
            correctAnswer: 1
          }
        ]
      }
    ],

    3: [ // Mathematics
      {
        id: 1,
        title: 'Chapter 1: Algebraic Expressions',
        content: `
          Mathematical concepts from textbook.
        `,
        questions: [
          {
            question: 'حل کریں: 2x + 5 = 13',
            answer: 'x = 4'
          }
        ],
        mcqs: [
          {
            id: 1,
            question: '3 + 5 × 2 = ?',
            options: ['16', '13', '11', '10'],
            correctAnswer: 1
          }
        ]
      }
    ],

    4: [ // Science
      {
        id: 1,
        title: 'Chapter 1: Matter and Energy',
        content: `
          Science concepts from textbook.
        `,
        questions: [
          {
            question: 'مادہ کیا ہے؟',
            answer: 'وہ چیز جس میں حجم اور وزن ہو'
          }
        ],
        mcqs: [
          {
            id: 1,
            question: 'درجہ حرارت کی اکائی کیا ہے؟',
            options: ['میٹر', 'سیلسیس', 'کلوگرام', 'لیٹر'],
            correctAnswer: 1
          }
        ]
      }
    ],

    5: [ // Islamic Studies
      {
        id: 1,
        title: 'Chapter 1: اسلام کے بنیادی اصول',
        content: `
          اسلامیات کے نکات۔
        `,
        questions: [
          {
            question: 'اسلام کے پانچ ستون کیا ہیں؟',
            answer: 'جواب یہاں لکھیں'
          }
        ],
        mcqs: [
          {
            id: 1,
            question: 'نماز دن میں کتنی بار ہے؟',
            options: ['3', '4', '5', '6'],
            correctAnswer: 2
          }
        ]
      }
    ]
  }
};
