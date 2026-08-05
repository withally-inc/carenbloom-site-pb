const careerRoles = [
  {
    slug: "chief-of-staff",
    title: "Chief of Staff",
    team: "Operations",
    level: "Manager/Supervisor",
    locationType: "On-site, Hong Kong",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through how you've kept a fast-scaling company organized — what was messy, what you built, and how you made the team faster.",
    portfolioRequired: false,
    summary: "Connective tissue across every team, project, and priority — working directly with the CEO.",
    mission: "You'll be the connective tissue across every team, project, and priority in the company — working directly with the CEO to keep high-leverage work moving. This isn't a back-office ops role. You're in the room for every critical decision, making sure nothing falls between the cracks, unblocking teams, and driving execution across marketing, product, creative, finance, and vendors.",
    responsibilities: [
      "Keep high-leverage company-building work moving across all teams and priorities.",
      "Unblock teams, drive execution, and make sure nothing falls between the cracks.",
      "Build systems that reduce founder dependency without adding bureaucracy."
    ],
    requirements: [
      "Built or scaled operations in a high-growth DTC or consumer brand.",
      "Strong systems thinker — workflows and reporting that reduce founder dependency.",
      "Experience with AI tools is a plus, though we equally value the willingness to learn and work with them.",
      "High agency — you don't wait for permission."
    ],
    questions: [
      "What's the most complex cross-functional initiative you've driven from start to finish? What was your specific role?",
      "What AI tools have you integrated into how you work, if any? If not, what does your operating system look like for managing priorities, decisions, and execution across teams?",
      "Give an example of a decision that was stuck between multiple teams. How did you unblock it?"
    ]
  },
  {
    slug: "graphic-designer",
    title: "Graphic Designer",
    team: "Creative",
    level: "Individual Contributor",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through 2-3 of your strongest ad creatives.",
    portfolioRequired: true,
    portfolioLabel: "Portfolio / Work Samples (ad creatives, design work)*",
    summary: "Design ad creatives that drive performance across Meta, TikTok, and paid channels.",
    mission: "You design ad creatives that drive performance across Meta, TikTok, and paid channels. This isn't brand design — every asset gets tested, measured, and iterated on.",
    responsibilities: [
      "Design ad creatives, landing page assets, and social content for paid channels.",
      "Work with creative strategists and media buyers to turn hooks and offers into assets that convert.",
      "Produce multiple ad variations at high volume without sacrificing quality."
    ],
    requirements: [
      "Portfolio of ad creatives for DTC or performance marketing.",
      "You design for conversion — visuals, copy, layout, CTA that drive purchases.",
      "Fast and high-volume without sacrificing quality.",
      "Strong in static and motion graphics.",
      "Can protect a warm brand voice while making scroll-stopping creative."
    ],
    questions: [
      "What types of performance ads have you designed, and what results did they drive?",
      "How do you approach designing an ad when the brief is just a product image and a hook — what's your process?",
      "How do you handle producing high volume (multiple variations per day) without sacrificing quality?"
    ]
  },
  {
    slug: "video-editor",
    title: "Video Editor",
    team: "Creative",
    level: "Individual Contributor",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through your strongest edit — why you made the creative choices you did.",
    portfolioRequired: true,
    portfolioLabel: "Portfolio / Work Samples (video edits, reels, VSLs)*",
    summary: "Turn product proof and offer structure into direct-response sales videos that convert.",
    mission: "You turn product proof, customer insight, and offer structure into direct-response sales videos. Your work gets shipped, tested, and measured by real market response.",
    responsibilities: [
      "Edit direct-response VSLs, advertorial videos, and sales videos for paid channels.",
      "Build hooks, pacing, captions, and CTA flow that drive retention and conversion.",
      "Iterate based on performance data — not just creative direction."
    ],
    requirements: [
      "Proven portfolio of direct-response VSLs or sales videos.",
      "You edit for retention, not just aesthetics.",
      "You balance softness with sales — discreet, trustworthy, human.",
      "You understand hooks, mechanisms, proof, objection handling, CTA.",
      "Experience with AI tools is a plus, though we equally value the willingness to learn and work with them."
    ],
    questions: [
      "What's the highest-performing video you've edited, and what do you think made it work?",
      "How do you approach the first 3 seconds of a performance video — what decisions are you making?",
      "What's your editing workflow and turnaround speed? How do you diagnose when something isn't retaining?"
    ]
  },
  {
    slug: "product-marketing-lead",
    title: "Product Marketing Lead",
    team: "Marketing",
    level: "Individual Contributor",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through a product launch you coordinated — what you prepared, who you worked with, and how you kept it on track.",
    portfolioRequired: false,
    summary: "Own product launch coordination — planning, copy, research, assets, and cross-team execution working directly with the CEO.",
    mission: "You\u2019ll work directly with the CEO to plan and execute product launches end-to-end. With 40+ products in the pipeline, we need someone who can own the launch playbook \u2014 product sheets, copywriting, image assets, email strategy, one-pagers \u2014 and coordinate across social, email marketing, and creative teams to make sure everything ships on time.",
    responsibilities: [
      "Own the product launch playbook \u2014 product sheets, one-pagers, copy, image galleries, and launch timelines.",
      "Coordinate launch execution across social media, email marketing, and creative teams.",
      "Research products, prepare decks, and ensure every launch has the right assets ready before go-live."
    ],
    requirements: [
      "Experience in product launches, marketing coordination, or project management in DTC or e-commerce.",
      "Strong copywriting and research skills \u2014 you can write product copy that sells and do the research to back it up.",
      "Organized and detail-oriented \u2014 you track every deliverable and nothing slips.",
      "Good creative eye \u2014 you know when an asset looks right and when it doesn\u2019t.",
      "Experience with AI tools is a plus, though we equally value the willingness to learn and work with them."
    ],
    questions: [
      "Describe a product launch you coordinated. What were the deliverables, and how did you keep everything on track?",
      "How do you approach writing copy for a new product you\u2019ve never seen before?",
      "How do you manage multiple launches happening at the same time without dropping quality?"
    ]
  },
  {
    slug: "social-media-strategist",
    title: "Social Media Strategist",
    team: "Marketing",
    level: "Individual Contributor",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through a social account or campaign you grew.",
    portfolioRequired: true,
    portfolioLabel: "Portfolio / Work Samples (social accounts, content samples)*",
    summary: "Own organic social across TikTok, Instagram, and key platforms.",
    mission: "You own organic social across TikTok, Instagram, and key platforms. Content calendars, community engagement, growing the audience. In a sensitive category, tone matters.",
    responsibilities: [
      "Plan and publish social content across priority platforms.",
      "Engage with the community and grow the audience organically.",
      "Spot platform trends and translate them into brand-appropriate creative."
    ],
    requirements: [
      "Proven experience growing social accounts for DTC or consumer brands.",
      "Deep fluency in platform culture — native vs forced.",
      "Strong copywriting — captions, scripts, hooks that match brand voice.",
      "Community engagement — loyal followers, not just posts.",
      "Comfortable with sexual wellness — playful, warm, trustworthy."
    ],
    questions: [
      "What social accounts have you managed, and what growth or engagement results did you achieve?",
      "Which brand do you think has the best organic social media presence right now, and what makes it stand out?",
      "How do you measure whether a piece of content actually worked, and what metrics matter most to you?"
    ]
  },
  {
    slug: "head-of-performance-marketing",
    title: "Head of Performance Marketing",
    team: "Growth",
    level: "Director",
    locationType: "On-site, Hong Kong",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through a campaign you scaled — the budget, channels, creative approach, and results.",
    portfolioRequired: false,
    summary: "Own the growth engine \u2014 paid acquisition, data analytics, retention modeling, and channel strategy. Scale toward $100M.",
    mission: "You\u2019ll own the growth engine end-to-end \u2014 paid acquisition, retention modeling, channel LTV analysis, and cross-sell strategy. This isn\u2019t just about scaling ad spend. We need someone who bridges data-driven analytics with creative strategy, supports the founders on growth decisions, and brings the diligence to deeply analyze performance that the current team lacks.",
    responsibilities: [
      "Own paid channel strategy, budget allocation, reporting, and growth targets across Meta, TikTok, Google.",
      "Build retention models, analyze channel LTV, and identify cross-sell and upsell opportunities.",
      "Lead creative testing and funnel optimization \u2014 work closely with strategists, editors, and designers."
    ],
    requirements: [
      "Scaled DTC ad spend profitably from 7 to 8 figures.",
      "Strong data and analytics skills \u2014 dashboards, attribution, cohort analysis, retention curves.",
      "Deep expertise across Meta, TikTok, Google at scale.",
      "Can think strategically about growth levers beyond just paid \u2014 retention, LTV, funnels.",
      "Leadership experience managing performance teams."
    ],
    questions: [
      "What's the largest monthly ad budget you've managed, and what ROAS did you achieve?",
      "Describe a performance plateau you diagnosed and broke through — what was the root cause?",
      "How do you structure creative testing when the data is noisy and sample sizes are small?"
    ]
  },
  {
    slug: "creative-strategist-performance-marketing",
    title: "Creative Strategist, Performance Marketing",
    team: "Growth",
    level: "Individual Contributor",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through a campaign you concepted — the insight, the creative approach, and how it performed.",
    portfolioRequired: true,
    portfolioLabel: "Portfolio / Work Samples (briefs, scripts, ad examples)*",
    summary: "Bridge between data and creative that converts. In the trenches, not handing off decks.",
    mission: "You're the bridge between data and creative that converts. You concept campaigns across Meta, TikTok, YouTube, Snapchat then work with editors, designers, UGC creators to ship them. You're in the trenches, not handing off decks.",
    responsibilities: [
      "Concept ad campaigns and write briefs, hooks, scripts, and testing plans.",
      "Analyze winners and losers to identify repeatable creative patterns.",
      "Work directly with editors, designers, and UGC creators to ship creative fast."
    ],
    requirements: [
      "Concepted and shipped performance creative that drove real revenue.",
      "You write briefs, hooks, scripts, ad angles — know which to change when ROAS drops.",
      "Fluent in platform culture across TikTok, Meta, YouTube.",
      "Strong portfolio with conceptual thinking and storytelling.",
      "Experience with AI tools is a plus, though we equally value the willingness to learn and work with them."
    ],
    questions: [
      "What's a paid social ad you think is excellent? Break down why it works.",
      "How would you create 5 distinct creative angles for the same product?",
      "What's your process for writing a creative brief — what inputs do you need and what does the output look like?"
    ]
  },
  {
    slug: "product-project-manager",
    title: "Product & Project Manager",
    team: "Product",
    level: "Manager",
    locationType: "On-site, Shenzhen, China",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through a product launch you managed end-to-end — what you coordinated and how you kept things on track.",
    portfolioRequired: false,
    summary: "Co-pilot to the Head of Product. Build a product launch engine that ships a product a week.",
    mission: "You\u2019ll co-pilot alongside the Head of Product to build a product launch engine that can ship a product a week. That means managing a diverse pipeline \u2014 moonshot projects, product innovation, licensing deals, and products from scratch \u2014 while removing blockers, coordinating across teams, and running to factories when needed. You live in Shenzhen and you\u2019re comfortable breaking apart products yourself.",
    responsibilities: [
      "Build and run a product launch engine \u2014 from initial brief through to market-ready, at a pace of one product per week.",
      "Manage a diverse project pipeline \u2014 moonshots, licensing, innovation, and products from scratch.",
      "Think commercially about product assortments \u2014 engineer bundles and lineups that improve customer LTV across the business.",
      "Remove blockers for the Head of Product \u2014 jump into factory issues, team structure, supplier problems.",
      "Help organize and improve team pod structure alongside the Head of Product."
    ],
    requirements: [
      "4\u20137 years in product management, project management, or operations \u2014 ideally at a fast-growing DTC or hardware brand.",
      "Experience with physical product businesses \u2014 packaging, manufacturing timelines, MOQs, and supplier dependencies.",
      "Experience supporting a senior product leader \u2014 you\u2019ve been a strong co-pilot before and know how to amplify a leader\u2019s impact.",
      "Management consulting mindset \u2014 you can jump into the hardest problem and structure a path forward.",
      "Business-level English and Mandarin \u2014 both required.",
      "Comfortable running to factories, breaking apart products, and getting hands-on.",
      "Global company experience is a plus."
    ],
    questions: [
      "What\u2019s the most complex product launch you\u2019ve managed end-to-end, and how did you keep sourcing, marketing, and product aligned on the timeline?",
      "How do you track and communicate project status across multiple stakeholders in different time zones?",
      "Describe a time a product launch was at risk of delay \u2014 what caused it, and what did you do to get it back on track?"
    ]
  },
  {
    slug: "growth-lead-mobile-apps",
    title: "Growth Lead, Mobile Apps",
    team: "Growth",
    level: "Director",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through a mobile app you scaled — the channels, the numbers, and what you learned.",
    portfolioRequired: false,
    summary: "Scale consumer health apps from zero to revenue through performance marketing and user acquisition.",
    mission: "Own growth for our mobile app portfolio — taking consumer health apps from zero to scale through performance marketing, user acquisition, and retention.",
    responsibilities: [
      "Run paid UA campaigns across Meta, TikTok, Google UAC, Apple Search Ads, and emerging platforms.",
      "Optimize funnels, test channels, and find repeatable paths to revenue from zero to $100K–$500K+/month.",
      "Build measurement systems around CPI, LTV, ROAS, retention curves, and payback periods."
    ],
    requirements: [
      "Scaled a consumer mobile app from 0 to $100K–$500K+/month in revenue through performance marketing.",
      "Deep expertise in mobile UA channels and mobile-specific metrics.",
      "Data-driven and hands-on — you run the campaigns yourself, read the data, and make the calls."
    ],
    questions: [
      "What's the largest mobile app you've scaled, and what was monthly revenue at peak?",
      "Which UA channel gave you the best results, and how did you crack it?",
      "Describe a repeatable growth loop you found for a mobile product."
    ]
  },
  {
    slug: "entrepreneur-in-residence",
    title: "Entrepreneur-in-Residence",
    team: "Venture",
    level: "Founder Track",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) telling us what consumer health company you'd want to build and why.",
    portfolioRequired: false,
    summary: "Find, shape, and launch consumer health companies with $100M+ potential — with Care & Bloom's capital and operating support behind you.",
    mission: "You'll find and shape a company worth building, then drive it from insight to launch with Care & Bloom's capital, team, and infrastructure behind you. This is for people who want to build something real — not pitch decks and fundraising loops. You validate opportunities, test acquisition channels, build early operating plans, and move fast from idea to proof.",
    responsibilities: [
      "Research markets, validate opportunities, and test acquisition channels.",
      "Build early operating plans across product, brand, supply, finance, and growth.",
      "Move quickly from idea to proof with high ownership and practical judgment."
    ],
    requirements: [
      "Founder, operator, or category-building experience — you've taken something from zero to one.",
      "Comfort with ambiguity and direct accountability — no one is going to tell you what to do.",
      "Strong taste for consumer health opportunities and willingness to build hands-on.",
      "You'd rather build than advise."
    ],
    questions: [
      "What consumer health company would you want to build right now?",
      "Describe something you have taken from zero to one.",
      "What would you need from Care & Bloom to move fastest?"
    ]
  },
  {
    slug: "ai-native-product-manager-apps",
    title: "AI-Native Product Manager, Apps",
    team: "Product",
    level: "Manager",
    introVideoRequired: true,
    loomPrompt: "Record a short Loom (2-3 min) walking us through an app or product you've built or improved using AI tools.",
    portfolioRequired: false,
    summary: "Design with AI, push code, and drive the product roadmap for consumer health apps.",
    mission: "You'll own the product direction for our consumer health apps — designing with Claude, coordinating development, and driving the roadmap. You bridge the gap between moonshot ideas and stable execution, working alongside developers and designers to ship fast.",
    responsibilities: [
      "Own the product roadmap for consumer health apps — features, priorities, and releases.",
      "Design with AI tools and push code when needed to unblock the team.",
      "Coordinate between developers, designers, and founders to keep the app moving."
    ],
    requirements: [
      "Experience as a product manager or product designer for mobile apps.",
      "AI-native — you design, prototype, and solve problems with Claude, Cursor, or similar tools daily.",
      "Can push code when needed — not a full-time developer, but not afraid of a codebase.",
      "Strong product taste — you know what makes an app feel good and what doesn't.",
      "Consumer health, wellness, or lifestyle app experience preferred."
    ],
    questions: [
      "What app have you built or significantly improved, and what was your role end-to-end?",
      "How do you use AI tools in your product development workflow? Give a specific example.",
      "Describe a time you had to bridge the gap between a big idea and the team's ability to execute it."
    ]
  }
];

if (typeof window !== "undefined") {
  window.careerRoles = careerRoles;
}
