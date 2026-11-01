/**
 * lessons.ts — the CK Academy course (8 episodes), copied from the CRM
 * (lib/portalAcademy.js LESSONS) on 2026-10-31 so the app can render the
 * course offline. Images are served by the CRM (public/images/lessons).
 * Keep in sync when the course changes.
 */
export interface Quiz { prompt: string; choices: string[]; answer: number }
export interface Lesson { id: number; roman: string; title: string; duration: string; vimeoId: string; vimeoHash: string | null; image: string; imageAlt: string; blurb: string; inspiration: string; body: string; quiz: Quiz[] }

export const LESSONS: Lesson[] = [
  {
    "id": 1,
    "roman": "I",
    "title": "Compound Interest",
    "duration": "9 min",
    "vimeoId": "1163665652",
    "vimeoHash": "8bac1f7af6",
    "image": "/images/lessons/lesson-1-compound-interest.webp",
    "imageAlt": "An acorn resting on an oak leaf",
    "blurb": "An interest rate is a story about time. Tell it well and it earns for you.",
    "inspiration": "Leave knowing exactly how to start, even at five dollars a week, and how that turns into hundreds of thousands by retirement.",
    "body": "The single most powerful idea in personal finance, and the one most people are taught last. Time and rate compound together. Start now, start small, and the math does the rest.",
    "quiz": [
      {
        "prompt": "Compound interest works best when:",
        "choices": [
          "You pick the highest possible rate.",
          "You start as early as possible.",
          "You contribute a single large amount once.",
          "You time the market correctly."
        ],
        "answer": 1
      },
      {
        "prompt": "In compound interest, why does the total grow fastest in the later years?",
        "choices": [
          "Because monthly contributions get larger over time.",
          "Because past gains start earning their own gains.",
          "Because the interest rate increases the longer you stay invested.",
          "Because markets always rise faster after year twenty."
        ],
        "answer": 1
      },
      {
        "prompt": "One couple invests $200 a month from age 25, stops at 35 and never adds another dollar. Another couple waits until 35 to start and contributes for thirty straight years. At 65, who has more?",
        "choices": [
          "The one who started early and stopped.",
          "The one who waited and saved longer.",
          "About equal.",
          "Depends on the rate."
        ],
        "answer": 0
      }
    ]
  },
  {
    "id": 2,
    "roman": "II",
    "title": "Career Clarity",
    "duration": "9 min",
    "vimeoId": "1175551683",
    "vimeoHash": "5c2a95d9d0",
    "image": "/images/lessons/lesson-2-career-clarity.webp",
    "imageAlt": "A closed brass pocket knife",
    "blurb": "The spread between five hundred thousand and twenty million is your career, not your IQ.",
    "inspiration": "Leave with a clearer view of where the next ten years should head, and which next move actually moves the needle.",
    "body": "Most financial outcomes are decided by the line of work, not by the budget. We walk through how to choose, change, and compound a career, with examples from inside the community.",
    "quiz": [
      {
        "prompt": "What primarily determines the spread in lifetime earnings?",
        "choices": [
          "IQ and intelligence.",
          "Intentionality and career choices.",
          "Family connections alone.",
          "Industry luck and timing."
        ],
        "answer": 1
      },
      {
        "prompt": "When do most career-defining choices get made?",
        "choices": [
          "In your 40s, after experience builds.",
          "In your 30s, once you settle down.",
          "In your 20s, often by accident.",
          "Whenever you finally feel ready."
        ],
        "answer": 2
      },
      {
        "prompt": "The difference between high earners and average earners is mostly:",
        "choices": [
          "Working longer hours each week.",
          "Steering deliberately instead of drifting.",
          "Sleeping less and grinding more.",
          "Picking the right industry first try."
        ],
        "answer": 1
      }
    ]
  },
  {
    "id": 3,
    "roman": "III",
    "title": "Budgeting for Real Life",
    "duration": "11 min",
    "vimeoId": "1172673098",
    "vimeoHash": "607015212e",
    "image": "/images/lessons/lesson-3-budgeting.webp",
    "imageAlt": "A wooden ruler beside a small glass bottle",
    "blurb": "A budget is a plan you can keep, not a prison you escape.",
    "inspiration": "Walk away with a budget built around real Jewish life, tuition, simchas, Shabbos, Yom Tov, that you can actually hold for the next twelve months.",
    "body": "Most budgets fail because they're written for someone else's life. We build one around tuition, simchas, Shabbos, Yom Tov, and the parnassa pressure of a real Jewish household.",
    "quiz": [
      {
        "prompt": "A budget built for religious life has to plan for:",
        "choices": [
          "Generic monthly expenses only.",
          "Shabbos, Yom Tov, simchas, and tuition as real line items.",
          "The same categories an unmarried person would use.",
          "Just the bare minimum."
        ],
        "answer": 1
      },
      {
        "prompt": "The best test of a budget is:",
        "choices": [
          "How much it cuts.",
          "How impressive it looks on paper.",
          "Whether you can keep it for three months.",
          "How closely it matches a textbook."
        ],
        "answer": 2
      },
      {
        "prompt": "When unexpected costs come up, a working budget:",
        "choices": [
          "Breaks completely.",
          "Has a category or a buffer that absorbs them.",
          "Should be discarded and rebuilt.",
          "Means the month is lost."
        ],
        "answer": 1
      }
    ]
  },
  {
    "id": 4,
    "roman": "IV",
    "title": "Debt",
    "duration": "8 min",
    "vimeoId": "1167417517",
    "vimeoHash": "7479857114",
    "image": "/images/lessons/lesson-4-debt.webp",
    "imageAlt": "An open antique padlock with its key beneath",
    "blurb": "Borrowing is a tool. Used well it builds. Used badly it eats.",
    "inspiration": "Finish knowing exactly which debt is building you, which debt is eating you, and the fastest, cleanest path out of the wrong kind.",
    "body": "Not all debt is the same. We walk through what counts as productive borrowing, what counts as expensive borrowing, and how to climb out when it's already gotten heavy.",
    "quiz": [
      {
        "prompt": "A $5,000 credit card balance at 24% APR, paid only at the minimum, costs you:",
        "choices": [
          "Less than the original purchase, over time.",
          "About the same as the original purchase.",
          "More than the original purchase, often twice.",
          "Depends on whether you ever miss a payment."
        ],
        "answer": 2
      },
      {
        "prompt": "The clearest difference between debt that builds and debt that eats is:",
        "choices": [
          "The interest rate alone.",
          "Whether what you bought appreciates, earns, or pays you back.",
          "The lender's reputation.",
          "Whether your parents approve."
        ],
        "answer": 1
      },
      {
        "prompt": "The fastest way out of a credit card hole is usually:",
        "choices": [
          "Wait until you can pay it off at once.",
          "Pay the minimum across all cards equally.",
          "Pay the highest-interest card first, stay minimum on the rest.",
          "Move the balance to a new card and pay nothing for a year."
        ],
        "answer": 2
      }
    ]
  },
  {
    "id": 5,
    "roman": "V",
    "title": "The Checklist Nobody Gave You",
    "duration": "10 min",
    "vimeoId": "1183816632",
    "vimeoHash": "6b85a67ebd",
    "image": "/images/lessons/lesson-5-checklist.webp",
    "imageAlt": "A small notepad with a hand-drawn checklist",
    "blurb": "The boring list that prevents the loud emergencies.",
    "inspiration": "Walk out with the one-page list every household should have but almost none do, the quiet preparation that prevents the loud crises.",
    "body": "A short list of things every household should have in place before they're needed. Wills, beneficiaries, insurance, an emergency fund, the right accounts. Quiet preparation that pays off for years.",
    "quiz": [
      {
        "prompt": "A 401(k) employer match is:",
        "choices": [
          "A bonus you can take or leave.",
          "Free money you are not getting if you do not enroll.",
          "A tax-advantaged loan.",
          "Something to think about after 40."
        ],
        "answer": 1
      },
      {
        "prompt": "The single most useful thing a young couple can do for their credit score is:",
        "choices": [
          "Open as many cards as possible.",
          "Pay on time, every time, even small balances.",
          "Close old accounts to keep things clean.",
          "Carry a small balance to “build” credit."
        ],
        "answer": 1
      },
      {
        "prompt": "Term life insurance is appropriate when:",
        "choices": [
          "You have no dependents and few assets.",
          "Other people would be financially worse off if you died.",
          "You want to make money from the policy.",
          "You are already wealthy."
        ],
        "answer": 1
      }
    ]
  },
  {
    "id": 6,
    "roman": "VI",
    "title": "Increase Your Income",
    "duration": "5 min",
    "vimeoId": "1187019434",
    "vimeoHash": null,
    "image": "/images/lessons/lesson-6-income.webp",
    "imageAlt": "A bundled sheaf of wheat tied with twine",
    "blurb": "Cutting has a ceiling. Earning has none.",
    "inspiration": "Leave with three concrete moves to grow your income inside the work and community you already live in, no career pivot required.",
    "body": "Concrete ways to grow income inside a community-friendly career: raises, side work, skill stacks, and the kinds of conversations to have with the people who decide.",
    "quiz": [
      {
        "prompt": "Cutting has limits but earning does not because:",
        "choices": [
          "You can always cut more if you try.",
          "Expenses cannot go below zero, but income has no ceiling.",
          "Earning is mostly luck.",
          "Most expenses are fixed, most income is variable."
        ],
        "answer": 1
      },
      {
        "prompt": "For someone starting a side income, the most important first move is:",
        "choices": [
          "Forming an LLC and setting up the books.",
          "Finding the first paying customer.",
          "Buying premium software.",
          "Reading more books on the subject."
        ],
        "answer": 1
      },
      {
        "prompt": "Skills compound when:",
        "choices": [
          "You learn many unrelated ones quickly.",
          "Each new one builds on what you already do.",
          "You learn them only in formal classes.",
          "You wait until you have more time."
        ],
        "answer": 1
      }
    ]
  },
  {
    "id": 7,
    "roman": "VII",
    "title": "The Major Decisions",
    "duration": "9 min",
    "vimeoId": "1190535664",
    "vimeoHash": null,
    "image": "/images/lessons/lesson-7-major-decisions.webp",
    "imageAlt": "A fountain pen resting on a stack of clean paper",
    "blurb": "Houses, cars, and where to invest. Three categories that quietly decide whether you build wealth or burn it.",
    "inspiration": "Walk away clearer on the few decisions, made once a decade, that quietly compound for the next thirty years.",
    "body": "The choices made once a decade tend to matter more than the choices made every day. We walk through buying a home, replacing a car, and where to put long-term savings.",
    "quiz": [
      {
        "prompt": "Most of a family's long-term financial trajectory is decided by:",
        "choices": [
          "The daily coffee habit.",
          "A few big decisions: where to live, what to drive, what to do with what is left over.",
          "Tax planning.",
          "Whether they use coupons."
        ],
        "answer": 1
      },
      {
        "prompt": "When evaluating renting versus buying a home, the most honest question is:",
        "choices": [
          "Which is cheaper this month.",
          "Which keeps you flexible and stable for the next five to ten years.",
          "What everyone else is doing on your block.",
          "Which is socially expected."
        ],
        "answer": 1
      },
      {
        "prompt": "Investing $50 a month, started early, in a simple index fund, will over decades:",
        "choices": [
          "Almost certainly underperform a savings account.",
          "Beat most active stock-pickers.",
          "Only matter if the markets crash.",
          "Be lost to fees."
        ],
        "answer": 1
      }
    ]
  },
  {
    "id": 8,
    "roman": "VIII",
    "title": "Giving and Legacy",
    "duration": "5 min",
    "vimeoId": "1189153153",
    "vimeoHash": "4904fc7f94",
    "image": "/images/lessons/lesson-8-giving-legacy.webp",
    "imageAlt": "A lit candle in a brass candlestick",
    "blurb": "The eight levels of Rambam in fifth grade. The gap between what you believe and what you do is the work.",
    "inspiration": "Build a giving practice that fits inside the structure of your life, not on top of it, and the legacy that follows from doing it for thirty years.",
    "body": "How tzedakah, ma'aser, and a longer view of giving fit into a household plan that's built to last. The eighth level of tzedakah, taught practically.",
    "quiz": [
      {
        "prompt": "People who treat tzedakah as a discipline built into their structure typically:",
        "choices": [
          "Give less over a lifetime than people who wait until they “have it.”",
          "Give more over a lifetime than people who wait until they “have it.”",
          "Give about the same.",
          "Stop giving once they become wealthy."
        ],
        "answer": 1
      },
      {
        "prompt": "The highest level of charity, in Rambam's framing, is:",
        "choices": [
          "A large anonymous gift.",
          "A public gift that inspires others.",
          "Helping someone become self-sufficient so they no longer have to ask.",
          "Giving only when asked directly."
        ],
        "answer": 2
      },
      {
        "prompt": "Building giving into the budget from day one usually:",
        "choices": [
          "Reduces your ability to save for emergencies.",
          "Becomes harder over time as expenses grow.",
          "Becomes a habit, not a decision you remake every month.",
          "Means you give less when income rises."
        ],
        "answer": 2
      }
    ]
  }
];

export const lessonImage = (l: Lesson) => `https://crm.collectivekindness.net${l.image}`;
export const lessonEmbed = (l: Lesson) => `https://player.vimeo.com/video/${l.vimeoId}${l.vimeoHash ? `?h=${l.vimeoHash}&` : "?"}title=0&byline=0&portrait=0&dnt=1`;
