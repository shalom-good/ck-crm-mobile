/**
 * academyExtras.ts: what the CK Academy website carries on each lesson page
 * besides the video, the quiz and the worksheet. Copied 2026-11-11 from the
 * course's own data (ck-academy src/data/newlyweds-lessons.ts) so the app's
 * lesson page reads like the full course: the one quiz explanation the
 * course has, the lesson's quote, the Episode I walk-through for opening a
 * retirement account, the optional call with the course coach, and the
 * further-study links. Keep in sync when the course changes.
 */
export interface LessonResource { kind: string; title: string; blurb: string | null; section: string; href: string }
export interface LessonGuideStep { title: string; lines: string[]; tip?: string }
export interface LessonGuide { eyebrow: string; title: string; intro: string[]; disclaimer: string; steps: LessonGuideStep[]; closing: string[]; author?: string }
export interface LessonExtras { explain: (string | null)[]; quote: { text: string; author: string; source?: string; kind: string } | null; coachWhy: string | null; guide: LessonGuide | null; resources: LessonResource[] }

/** The course coach (CRM lib/ckaCoach.js): an optional 30-minute call. */
export const ACADEMY_COACH = { name: "Leivi Bartfield", firstName: "Leivi", bookingUrl: "https://calendly.com/leivi/30min" };

export const LESSON_EXTRAS: Record<number, LessonExtras> = {
  "1": {
    "explain": [
      null,
      null,
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "Someone is sitting in the shade today because someone planted a tree a long time ago.",
      "author": "Warren Buffett"
    },
    "coachWhy": null,
    "guide": {
      "eyebrow": "Before you go · about 15 minutes",
      "title": "How to open up your retirement account",
      "intro": [
        "Here's how to set up Vanguard from scratch. Takes about 15 minutes. Have your bank login handy.",
        "How it works: you move money from your bank into Vanguard, then use it to buy VOO. VOO is the actual investment. Until you buy VOO, your money is just sitting there."
      ],
      "disclaimer": "This is a walkthrough of the screens, not financial advice. Collective Kindness is not a licensed financial advisor and is not connected to Vanguard. Investments like VOO go up and down, and you can lose money. The steps describe an individual brokerage account; if you want a Roth IRA or another retirement account type, the screens are similar, and your counselor can help you choose. Only invest money you will not need soon, and talk to a licensed professional if you are unsure.",
      "steps": [
        {
          "title": "Open the account",
          "lines": [
            "Go to vanguard.com and click Open an account.",
            "Choose Individual brokerage account.",
            "When it asks where your money should be held, pick Cash Deposit. This is just a waiting spot. Nothing is invested yet.",
            "If it asks you to agree to the Nasdaq and OTC Market Data agreement, click yes. That's normal.",
            "Connect your bank when it asks."
          ]
        },
        {
          "title": "Move money in",
          "lines": [
            "Click Transfer money. Pick your bank, put in your amount, and send it once.",
            "It takes a business day or two to show up. That's normal, just wait."
          ]
        },
        {
          "title": "Buy VOO",
          "lines": [
            "Once the money shows up, click Buy.",
            "Type VOO in the search.",
            "Put in your amount and confirm.",
            "Now you're actually invested."
          ]
        },
        {
          "title": "Make it automatic every month",
          "lines": [
            "On the main page click Automatic investments. You'll land on a page called Create recurring transactions with options on the left and right.",
            "First, on the right side under \"Schedule recurring bank transfers,\" click Settlement fund. Pick your bank, put in your amount, choose monthly, and pick a date right after you get paid. This moves money from your bank to Vanguard every month.",
            "Then go back to the same page and click Vanguard ETFs on the left side. Pick VOO, put in the same amount, choose monthly, and pick a date 2 to 3 days after your transfer date. This uses that money to buy VOO every month.",
            "You need both. The first moves the money in. The second invests it. If you only do the first, your money just piles up in cash."
          ],
          "tip": "If you click Settlement fund and end up on a page about mutual funds, that's the wrong page. Go back and click Settlement fund on the right side again."
        }
      ],
      "closing": [
        "That's it. After that it runs on its own and you can change or pause it anytime.",
        "If you get stuck on any screen, send your coach a screenshot and they'll point you to it."
      ],
      "author": "Leivi"
    },
    "resources": [
      {
        "kind": "article",
        "title": "Class 1: Common Questions",
        "blurb": "IRAs, Vanguard setup, and what to do when a screen looks wrong.",
        "section": "assigned",
        "href": "https://collectivekindness.net/academy/newlyweds-course/questions/class-1"
      },
      {
        "kind": "video",
        "title": "How to invest in Vanguard",
        "blurb": "A quick walkthrough of opening and funding a Vanguard account.",
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=j6sRs1my6mM"
      },
      {
        "kind": "calculator",
        "title": "Compound Interest Calculator",
        "blurb": "Plug in your numbers and watch the curve.",
        "section": "assigned",
        "href": "https://www.nerdwallet.com/banking/calculators/compound-interest-calculator"
      }
    ]
  },
  "2": {
    "explain": [
      null,
      null,
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "I constantly see people rise in life who are not the smartest, sometimes not even the most diligent, but they are learning machines.",
      "author": "Charlie Munger"
    },
    "coachWhy": "a second opinion on where your career should head, or on a move you are weighing",
    "guide": null,
    "resources": [
      {
        "kind": "video",
        "title": "Career clarity. The talk every newlywed should hear.",
        "blurb": null,
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=0-LAT4HjWPo"
      },
      {
        "kind": "video",
        "title": "How to Find a Job You Love",
        "blurb": "Kosher Money",
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=kynCotXxalw&t=322"
      },
      {
        "kind": "podcast",
        "title": "Keevy Fried on rebuilding careers after layoffs",
        "blurb": "KM Episode 114",
        "section": "kosher-money",
        "href": "https://www.livinglchaim.com/shows/kosher-money"
      },
      {
        "kind": "tool",
        "title": "16Personalities",
        "blurb": "Free personality assessment.",
        "section": "other",
        "href": "https://www.16personalities.com/"
      },
      {
        "kind": "article",
        "title": "From Purpose to Impact",
        "blurb": "Harvard Business Review",
        "section": "other",
        "href": "https://hbr.org/2018/01/from-purpose-to-impact"
      },
      {
        "kind": "link",
        "title": "The Jewish Entrepreneur Network",
        "blurb": null,
        "section": "other",
        "href": "https://tjenetwork.com/"
      }
    ]
  },
  "3": {
    "explain": [
      null,
      null,
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "A budget is telling your money where to go instead of wondering where it went.",
      "author": "Dave Ramsey"
    },
    "coachWhy": null,
    "guide": null,
    "resources": [
      {
        "kind": "video",
        "title": "Budgeting walkthrough",
        "blurb": null,
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=78TqcvVNOVk"
      },
      {
        "kind": "article",
        "title": "Budgeting in the New Economy. Finance 101 for the Frum Family",
        "blurb": "Orthodox Union",
        "section": "assigned",
        "href": "https://www.ou.org/life/money/budgeting-in-the-new-economy-finance-101-for-the-frum-family/"
      },
      {
        "kind": "article",
        "title": "Financial Planning Advice for Frum Families Struggling to Make Ends Meet",
        "blurb": "Jewish Press",
        "section": "assigned",
        "href": "https://jewishpress.com/financial-planning-advice-for-frum-families-struggling-to-make-ends-meet/"
      },
      {
        "kind": "podcast",
        "title": "The Secrets to Managing Your Money with Simi Mandelbaum",
        "blurb": "KM Episode 4",
        "section": "kosher-money",
        "href": "https://livingsmarterjewish.org/the-secrets-to-managing-your-money-feat-simi-mandelbaum-kosher-money-episode-4/"
      },
      {
        "kind": "link",
        "title": "Living Smarter Jewish budget template",
        "blurb": null,
        "section": "other",
        "href": "https://livingsmarterjewish.org/"
      },
      {
        "kind": "app",
        "title": "EveryDollar",
        "blurb": "Dave Ramsey's budget app.",
        "section": "other",
        "href": "https://www.everydollar.com/"
      },
      {
        "kind": "app",
        "title": "Monarch Money",
        "blurb": null,
        "section": "other",
        "href": "https://www.monarchmoney.com/"
      },
      {
        "kind": "article",
        "title": "The 50/30/20 Budget Rule",
        "blurb": "NerdWallet",
        "section": "other",
        "href": "https://www.nerdwallet.com/article/finance/nerdwallet-budget-calculator"
      }
    ]
  },
  "4": {
    "explain": [
      null,
      null,
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "Wealth is the income you don't spend.",
      "author": "Morgan Housel",
      "source": "The Psychology of Money"
    },
    "coachWhy": null,
    "guide": null,
    "resources": [
      {
        "kind": "video",
        "title": "Learn about Kosher Debt Help's Lead Mordy Richler on his journey with debt. This will inspire you.",
        "blurb": null,
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=mXnCArKJ8UI"
      },
      {
        "kind": "calculator",
        "title": "Debt Payoff Calculator. Snowball vs. Avalanche",
        "blurb": "NerdWallet",
        "section": "other",
        "href": "https://www.nerdwallet.com/calculator/debt-payoff-calculator"
      },
      {
        "kind": "link",
        "title": "Kosher Debt Help",
        "blurb": "Collective Kindness' rescue arm.",
        "section": "other",
        "href": "https://www.kosherdebthelp.com/"
      },
      {
        "kind": "link",
        "title": "Living Smarter Jewish",
        "blurb": "Free financial coaching.",
        "section": "other",
        "href": "https://livingsmarterjewish.org/"
      }
    ]
  },
  "5": {
    "explain": [
      null,
      null,
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "Take a simple idea and take it seriously.",
      "author": "Charlie Munger"
    },
    "coachWhy": null,
    "guide": null,
    "resources": [
      {
        "kind": "video",
        "title": "What Every Financial Beginner Needs to Know About Money",
        "blurb": "Tamar Snyder Chaitovsky · Kosher Money Episode 85",
        "section": "kosher-money",
        "href": "https://www.youtube.com/watch?v=IPB44ywdptU"
      },
      {
        "kind": "calculator",
        "title": "Emergency Fund Calculator",
        "blurb": "NerdWallet",
        "section": "other",
        "href": "https://www.nerdwallet.com/article/banking/emergency-fund-calculator"
      },
      {
        "kind": "link",
        "title": "High-yield savings comparison",
        "blurb": "Bankrate",
        "section": "other",
        "href": "https://www.bankrate.com/banking/savings/rates/"
      },
      {
        "kind": "link",
        "title": "Ally High Yield Savings",
        "blurb": null,
        "section": "other",
        "href": "https://www.ally.com/bank/online-savings-account/"
      },
      {
        "kind": "link",
        "title": "Marcus by Goldman Sachs",
        "blurb": null,
        "section": "other",
        "href": "https://www.marcus.com/us/en/savings/high-yield-savings"
      }
    ]
  },
  "6": {
    "explain": [
      null,
      null,
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "The most important investment you can make is in yourself.",
      "author": "Warren Buffett"
    },
    "coachWhy": null,
    "guide": null,
    "resources": [
      {
        "kind": "video",
        "title": "19 Jewish Side Hustles to Get You Out of Debt",
        "blurb": null,
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=osHrj727Dfc"
      },
      {
        "kind": "tool",
        "title": "Aptitude Test",
        "blurb": null,
        "section": "assigned",
        "href": "https://aptitude-test.com/"
      },
      {
        "kind": "article",
        "title": "W-2 vs. W-9",
        "blurb": "Paychex",
        "section": "assigned",
        "href": "https://www.paychex.com/articles/payroll-taxes/w2-vs-w9"
      },
      {
        "kind": "video",
        "title": "How to Set Up Your Fidelity 401(k)",
        "blurb": null,
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=A3NFS-2Ts4Y"
      },
      {
        "kind": "podcast",
        "title": "Edward Kholodenko. The entrepreneur who built a business solving problems",
        "blurb": null,
        "section": "kosher-money",
        "href": "https://www.youtube.com/watch?v=45stqhLZmhc"
      },
      {
        "kind": "article",
        "title": "Roth IRA explainer",
        "blurb": "Fidelity",
        "section": "other",
        "href": "https://www.fidelity.com/retirement-ira/roth-ira"
      },
      {
        "kind": "tool",
        "title": "CareerExplorer",
        "blurb": "Career assessment.",
        "section": "other",
        "href": "https://www.careerexplorer.com/"
      },
      {
        "kind": "article",
        "title": "The Ultimate Guide to Negotiating Your Salary",
        "blurb": "The Muse",
        "section": "other",
        "href": "https://www.themuse.com/advice/the-ultimate-guide-to-negotiating-your-salary"
      }
    ]
  },
  "7": {
    "explain": [
      null,
      null,
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "Risk comes from not knowing what you're doing.",
      "author": "Warren Buffett"
    },
    "coachWhy": null,
    "guide": null,
    "resources": [
      {
        "kind": "article",
        "title": "Pros and Cons of Renting vs. Buying",
        "blurb": "Zillow",
        "section": "assigned",
        "href": "https://www.zillow.com/learn/renting-vs-buying-pros-and-cons/"
      },
      {
        "kind": "calculator",
        "title": "Rent vs. Buy Calculator",
        "blurb": "NerdWallet",
        "section": "assigned",
        "href": "https://www.nerdwallet.com/mortgages/calculators/rent-vs-buy-calculator"
      },
      {
        "kind": "article",
        "title": "Leasing vs. Buying a New Car",
        "blurb": "Consumer Reports",
        "section": "assigned",
        "href": "https://www.consumerreports.org/cars/buying-a-car/leasing-vs-buying-a-new-car-a9135602164/"
      },
      {
        "kind": "podcast",
        "title": "Wanna Invest Like a Millionaire? with Naftali Horowitz",
        "blurb": "KM Episode 23",
        "section": "kosher-money",
        "href": "https://www.youtube.com/watch?v=MCzlbtFSUjA"
      },
      {
        "kind": "video",
        "title": "Jonathan Shenkman on automatic savings and simple investing",
        "blurb": null,
        "section": "kosher-money",
        "href": "https://www.youtube.com/watch?v=b_Wlgtb1D6Y"
      },
      {
        "kind": "article",
        "title": "How to Open an IRA",
        "blurb": "Vanguard",
        "section": "other",
        "href": "https://investor.vanguard.com/ira/how-to-open-an-ira"
      },
      {
        "kind": "article",
        "title": "Roth vs. Traditional IRA",
        "blurb": "Investopedia",
        "section": "other",
        "href": "https://www.investopedia.com/retirement/roth-vs-traditional-ira-which-is-right-for-you/"
      },
      {
        "kind": "calculator",
        "title": "Retirement Calculator",
        "blurb": "SmartAsset",
        "section": "other",
        "href": "https://smartasset.com/retirement/retirement-calculator"
      }
    ]
  },
  "8": {
    "explain": [
      null,
      "Prevention of the need is the highest form. That principle is the spine of CK Academy.",
      null
    ],
    "quote": {
      "kind": "famous",
      "text": "The hand that gives, gathers.",
      "author": "Rabbi Yosef Kushner",
      "source": "Kosher Money · Episode 32"
    },
    "coachWhy": null,
    "guide": null,
    "resources": [
      {
        "kind": "video",
        "title": "Incredible life advice. This is highly recommended.",
        "blurb": null,
        "section": "assigned",
        "href": "https://www.youtube.com/watch?v=Zx0yzx1Lf-g"
      },
      {
        "kind": "podcast",
        "title": "Understanding the Jewish Prescription for Wealth. Maaser with Rabbi Yosef Kushner",
        "blurb": "KM Episode 32",
        "section": "kosher-money",
        "href": "https://livingsmarterjewish.org/understanding-the-jewish-prescription-for-wealth-maaser-rabbi-yosef-kushner-kosher-money-ep-32/"
      },
      {
        "kind": "podcast",
        "title": "Dave Ramsey's Best Financial Advice for the Jewish Community",
        "blurb": "KM Episode 39",
        "section": "kosher-money",
        "href": "https://www.livinglchaim.com/shows/kosher-money/dave-ramseys-best-financial-advice-for-the-jewish-community-kosher-money-episode-39"
      }
    ]
  }
};
