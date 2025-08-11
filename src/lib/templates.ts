// src/lib/templates.ts
import { Template } from '@/types';

export const TEMPLATES: Template[] = [
  // Productivity Templates
  {
    id: 'daily-tasks',
    title: 'Daily Tasks',
    description: 'Organize your daily to-do items',
    content: `# Daily Tasks - ${new Date().toLocaleDateString()}

## Priority Tasks
- [ ] 
- [ ] 
- [ ] 

## Regular Tasks
- [ ] 
- [ ] 
- [ ] 

## Notes
`,
    type: 'todo',
    category: 'Productivity',
    icon: '✅',
    tags: ['daily', 'tasks', 'productivity']
  },
  {
    id: 'weekly-planner',
    title: 'Weekly Planner',
    description: '7-day structured planning',
    content: `# Weekly Planner

## Week of ${new Date().toLocaleDateString()}

### Monday
- [ ] 
- [ ] 

### Tuesday
- [ ] 
- [ ] 

### Wednesday
- [ ] 
- [ ] 

### Thursday
- [ ] 
- [ ] 

### Friday
- [ ] 
- [ ] 

### Weekend Goals
- [ ] 
- [ ] 

## Weekly Reflection
- What went well:
- What to improve:
- Next week's focus:
`,
    type: 'todo',
    category: 'Productivity',
    icon: '📅',
    tags: ['weekly', 'planning', 'schedule']
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Structured meeting documentation',
    content: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Time:** 
**Attendees:** 
**Meeting Type:** 

## Agenda
1. 
2. 
3. 

## Discussion Points
- 
- 
- 

## Decisions Made
- 
- 

## Action Items
- [ ] [Person] - 
- [ ] [Person] - 
- [ ] [Person] - 

## Next Meeting
**Date:** 
**Topics:** 
`,
    type: 'note',
    category: 'Productivity',
    icon: '🤝',
    tags: ['meeting', 'work', 'notes']
  },
  {
    id: 'project-planning',
    title: 'Project Planning',
    description: 'Plan projects with goals and milestones',
    content: `# Project Planning

## Project Overview
**Project Name:** 
**Start Date:** 
**Target Completion:** 
**Priority:** High/Medium/Low

## Objectives
- 
- 
- 

## Milestones
- [ ] **Phase 1:** 
- [ ] **Phase 2:** 
- [ ] **Phase 3:** 
- [ ] **Final Review:** 

## Resources Needed
- 
- 
- 

## Potential Challenges
- 
- 

## Success Metrics
- 
- 
`,
    type: 'note',
    category: 'Productivity',
    icon: '🎯',
    tags: ['project', 'planning', 'goals']
  },
  {
    id: 'goal-setting',
    title: 'Goal Setting',
    description: 'SMART goals framework',
    content: `# Goal Setting

## Goal: 

### SMART Criteria
- **Specific:** 
- **Measurable:** 
- **Achievable:** 
- **Relevant:** 
- **Time-bound:** 

## Action Steps
1. [ ] 
2. [ ] 
3. [ ] 
4. [ ] 
5. [ ] 

## Resources Needed
- 
- 

## Potential Obstacles
- 
- 

## Success Indicators
- 
- 

## Review Date: 
`,
    type: 'note',
    category: 'Productivity',
    icon: '🏆',
    tags: ['goals', 'planning', 'smart']
  },

  // Personal Life Templates
  {
    id: 'grocery-list',
    title: 'Grocery List',
    description: 'Categorized shopping list',
    content: `# Grocery List

## Fruits & Vegetables
- [ ] 
- [ ] 
- [ ] 

## Dairy & Eggs
- [ ] 
- [ ] 

## Meat & Seafood
- [ ] 
- [ ] 

## Pantry Items
- [ ] 
- [ ] 
- [ ] 

## Frozen Foods
- [ ] 
- [ ] 

## Household Items
- [ ] 
- [ ] 

## Total Budget: $
`,
    type: 'list',
    category: 'Personal',
    icon: '🛒',
    tags: ['shopping', 'grocery', 'list']
  },
  {
    id: 'meal-planning',
    title: 'Meal Planning',
    description: 'Weekly meal prep organizer',
    content: `# Weekly Meal Plan

## Week of ${new Date().toLocaleDateString()}

### Monday
- **Breakfast:** 
- **Lunch:** 
- **Dinner:** 
- **Snacks:** 

### Tuesday
- **Breakfast:** 
- **Lunch:** 
- **Dinner:** 
- **Snacks:** 

### Wednesday
- **Breakfast:** 
- **Lunch:** 
- **Dinner:** 
- **Snacks:** 

### Thursday
- **Breakfast:** 
- **Lunch:** 
- **Dinner:** 
- **Snacks:** 

### Friday
- **Breakfast:** 
- **Lunch:** 
- **Dinner:** 
- **Snacks:** 

### Weekend
- **Saturday:** 
- **Sunday:** 

## Prep Tasks
- [ ] 
- [ ] 
- [ ] 
`,
    type: 'note',
    category: 'Personal',
    icon: '🍽️',
    tags: ['meal', 'planning', 'food']
  },
  {
    id: 'travel-itinerary',
    title: 'Travel Itinerary',
    description: 'Trip planning with dates and locations',
    content: `# Travel Itinerary

## Trip Details
**Destination:** 
**Dates:** 
**Travelers:** 
**Budget:** 

## Transportation
- **Flights:** 
- **Local Transport:** 
- **Car Rental:** 

## Accommodation
- **Hotel/Airbnb:** 
- **Address:** 
- **Check-in:** 
- **Check-out:** 

## Daily Itinerary

### Day 1
- **Morning:** 
- **Afternoon:** 
- **Evening:** 

### Day 2
- **Morning:** 
- **Afternoon:** 
- **Evening:** 

## Important Information
- **Emergency Contacts:** 
- **Insurance:** 
- **Documents:** 
- **Weather:** 

## Packing Checklist
- [ ] 
- [ ] 
- [ ] 
`,
    type: 'note',
    category: 'Personal',
    icon: '✈️',
    tags: ['travel', 'planning', 'vacation']
  },
  {
    id: 'packing-checklist',
    title: 'Packing Checklist',
    description: 'Travel packing organizer',
    content: `# Packing Checklist

## Trip: 
**Duration:** 
**Weather:** 
**Activities:** 

## Clothing
- [ ] Underwear (${''} days)
- [ ] Socks (${''} pairs)
- [ ] T-shirts/Tops
- [ ] Pants/Shorts
- [ ] Jacket/Sweater
- [ ] Sleepwear
- [ ] Shoes
- [ ] Accessories

## Toiletries
- [ ] Toothbrush & Toothpaste
- [ ] Shampoo & Conditioner
- [ ] Body wash/Soap
- [ ] Deodorant
- [ ] Skincare items
- [ ] Medications
- [ ] Sunscreen

## Electronics
- [ ] Phone & Charger
- [ ] Camera & Charger
- [ ] Laptop/Tablet
- [ ] Power bank
- [ ] Adapters

## Documents
- [ ] Passport/ID
- [ ] Tickets
- [ ] Hotel confirmations
- [ ] Insurance papers
- [ ] Emergency contacts

## Miscellaneous
- [ ] 
- [ ] 
- [ ] 
`,
    type: 'list',
    category: 'Personal',
    icon: '🧳',
    tags: ['packing', 'travel', 'checklist']
  },
  {
    id: 'gift-ideas',
    title: 'Gift Ideas',
    description: 'Holiday and birthday gift tracker',
    content: `# Gift Ideas

## Upcoming Occasions
- **${new Date().getFullYear()} Birthdays:**
- **Holidays:**
- **Anniversaries:**

## Gift Ideas by Person

### [Person Name]
**Occasion:** 
**Budget:** 
**Ideas:**
- 
- 
- 
**Notes:** 

### [Person Name]
**Occasion:** 
**Budget:** 
**Ideas:**
- 
- 
- 
**Notes:** 

## Shopping List
- [ ] [Person] - [Gift] - $
- [ ] [Person] - [Gift] - $
- [ ] [Person] - [Gift] - $

## Total Budget: $
**Spent:** $
**Remaining:** $
`,
    type: 'note',
    category: 'Personal',
    icon: '🎁',
    tags: ['gifts', 'shopping', 'occasions']
  },

  // Health & Wellness Templates
  {
    id: 'workout-log',
    title: 'Workout Log',
    description: 'Exercise tracking and progress',
    content: `# Workout Log

## Date: ${new Date().toLocaleDateString()}
**Workout Type:** 
**Duration:** 
**Location:** 

## Warm-up (5-10 min)
- 
- 

## Main Workout

### Exercise 1: 
- Set 1: 
- Set 2: 
- Set 3: 

### Exercise 2: 
- Set 1: 
- Set 2: 
- Set 3: 

### Exercise 3: 
- Set 1: 
- Set 2: 
- Set 3: 

## Cool-down (5-10 min)
- 
- 

## Notes
- **Energy Level:** /10
- **Difficulty:** /10
- **How I felt:** 
- **Next time:** 

## Progress Tracking
- **Weight:** 
- **Body Fat %:** 
- **Measurements:** 
`,
    type: 'note',
    category: 'Health',
    icon: '💪',
    tags: ['workout', 'fitness', 'health']
  },
  {
    id: 'habit-tracker',
    title: 'Habit Tracker',
    description: 'Daily habit monitoring',
    content: `# Habit Tracker - ${new Date().toLocaleDateString()}

## Daily Habits

### Health & Wellness
- [ ] Drink 8 glasses of water
- [ ] Exercise (30+ min)
- [ ] Take vitamins
- [ ] Get 7+ hours sleep
- [ ] Meditate (10+ min)

### Productivity
- [ ] Review daily goals
- [ ] Complete priority tasks
- [ ] Limit social media (< 1hr)
- [ ] Read (30+ min)
- [ ] Plan tomorrow

### Personal
- [ ] Connect with family/friends
- [ ] Practice gratitude
- [ ] Learn something new
- [ ] Tidy living space
- [ ] Prepare healthy meals

## Weekly Goals
- [ ] 
- [ ] 
- [ ] 

## Reflection
**What went well today:** 

**What to improve:** 

**Tomorrow's focus:** 
`,
    type: 'todo',
    category: 'Health',
    icon: '📊',
    tags: ['habits', 'tracking', 'wellness']
  },
  {
    id: 'mood-journal',
    title: 'Mood Journal',
    description: 'Daily mood and reflection tracking',
    content: `# Mood Journal - ${new Date().toLocaleDateString()}

## Today's Mood
**Overall mood:** 😊 😐 😔 (circle one)
**Energy level:** ⚡⚡⚡⚡⚡ (1-5)
**Stress level:** 📈📈📈📈📈 (1-5)

## What happened today?
### Positive moments:
- 
- 
- 

### Challenges:
- 
- 
- 

## Emotions I felt:
- [ ] Happy
- [ ] Grateful
- [ ] Excited
- [ ] Calm
- [ ] Anxious
- [ ] Frustrated
- [ ] Sad
- [ ] Angry
- [ ] Overwhelmed
- [ ] Content

## What triggered strong emotions?
**Positive triggers:** 

**Negative triggers:** 

## Self-care activities:
- [ ] 
- [ ] 
- [ ] 

## Tomorrow I want to:
- 
- 
- 

## Gratitude (3 things):
1. 
2. 
3. 
`,
    type: 'note',
    category: 'Health',
    icon: '💭',
    tags: ['mood', 'journal', 'mental-health']
  },
  {
    id: 'water-intake',
    title: 'Water Intake Tracker',
    description: 'Daily hydration monitoring',
    content: `# Water Intake Tracker

## Date: ${new Date().toLocaleDateString()}
**Goal:** 8 glasses (64 oz / 2L)

## Tracking
- [ ] Glass 1 (8 oz) - Time: ____
- [ ] Glass 2 (8 oz) - Time: ____
- [ ] Glass 3 (8 oz) - Time: ____
- [ ] Glass 4 (8 oz) - Time: ____
- [ ] Glass 5 (8 oz) - Time: ____
- [ ] Glass 6 (8 oz) - Time: ____
- [ ] Glass 7 (8 oz) - Time: ____
- [ ] Glass 8 (8 oz) - Time: ____

## Additional Fluids
- [ ] Coffee: ____ cups
- [ ] Tea: ____ cups
- [ ] Other: ____

## Total Intake: _____ oz
**Goal achieved:** Yes / No

## Notes
- **Urine color:** Light/Dark (hydration indicator)
- **Energy level:** High/Medium/Low
- **How I feel:** 

## Reminders for tomorrow:
- Set water bottle reminders
- Keep water visible
- Drink before meals
`,
    type: 'todo',
    category: 'Health',
    icon: '💧',
    tags: ['water', 'hydration', 'health']
  },
  {
    id: 'sleep-log',
    title: 'Sleep Log',
    description: 'Sleep quality and pattern tracking',
    content: `# Sleep Log - ${new Date().toLocaleDateString()}

## Sleep Schedule
**Bedtime:** 
**Wake time:** 
**Total sleep:** _____ hours _____ minutes

## Sleep Quality
**Overall quality:** ⭐⭐⭐⭐⭐ (1-5 stars)
**Time to fall asleep:** _____ minutes
**Number of wake-ups:** _____
**Morning alertness:** ⚡⚡⚡⚡⚡ (1-5)

## Pre-sleep Activities (2 hours before bed)
- [ ] No screens
- [ ] No caffeine
- [ ] No large meals
- [ ] Relaxing activity
- [ ] Room preparation (cool, dark, quiet)

## Sleep Environment
- **Room temperature:** ___°F
- **Noise level:** Quiet/Moderate/Loud
- **Light level:** Dark/Dim/Bright
- **Comfort:** Comfortable/Okay/Uncomfortable

## Factors Affecting Sleep
### Positive factors:
- 
- 

### Negative factors:
- 
- 

## Dreams/Notes
- 

## Tomorrow's Sleep Goal
**Target bedtime:** 
**Target wake time:** 
**Improvements to make:** 
`,
    type: 'note',
    category: 'Health',
    icon: '😴',
    tags: ['sleep', 'health', 'tracking']
  },

  // Learning & Development Templates
  {
    id: 'book-notes',
    title: 'Book Notes',
    description: 'Reading notes and key takeaways',
    content: `# Book Notes

## Book Information
**Title:** 
**Author:** 
**Genre:** 
**Pages:** 
**Started:** 
**Finished:** 

## Rating: ⭐⭐⭐⭐⭐ (1-5 stars)

## Key Takeaways
1. 
2. 
3. 
4. 
5. 

## Favorite Quotes
> "Quote 1"
- Page: ___

> "Quote 2"
- Page: ___

> "Quote 3"
- Page: ___

## Chapter Notes

### Chapter 1: 
**Main points:**
- 
- 

### Chapter 2: 
**Main points:**
- 
- 

## Action Items
- [ ] 
- [ ] 
- [ ] 

## Would I recommend this book?
**Yes/No** - Why?

## Related books to read:
- 
- 
- 
`,
    type: 'note',
    category: 'Learning',
    icon: '📚',
    tags: ['books', 'reading', 'notes']
  },
  {
    id: 'course-notes',
    title: 'Course Notes',
    description: 'Learning material organization',
    content: `# Course Notes

## Course Information
**Course:** 
**Instructor:** 
**Platform:** 
**Duration:** 
**Started:** 

## Learning Objectives
- 
- 
- 

## Module/Lesson Notes

### Module 1: 
**Key concepts:**
- 
- 
- 

**Important formulas/code:**
\`\`\`
// Code or formulas here
\`\`\`

**Questions:**
- 
- 

### Module 2: 
**Key concepts:**
- 
- 
- 

**Important formulas/code:**
\`\`\`
// Code or formulas here
\`\`\`

## Assignments/Projects
- [ ] Assignment 1: 
- [ ] Assignment 2: 
- [ ] Final Project: 

## Resources
- 
- 
- 

## Progress Tracking
**Completion:** ____%
**Next milestone:** 
**Target completion:** 
`,
    type: 'note',
    category: 'Learning',
    icon: '🎓',
    tags: ['course', 'learning', 'education']
  },
  {
    id: 'language-learning',
    title: 'Language Learning',
    description: 'Vocabulary and phrases practice',
    content: `# Language Learning - [Language]

## Today's Date: ${new Date().toLocaleDateString()}
**Lesson/Topic:** 
**Study time:** _____ minutes

## New Vocabulary

| Word/Phrase | Translation | Example Sentence |
|-------------|-------------|------------------|
|             |             |                  |
|             |             |                  |
|             |             |                  |
|             |             |                  |
|             |             |                  |

## Grammar Focus
**Today's grammar rule:** 

**Examples:**
- 
- 
- 

## Practice Exercises
- [ ] Vocabulary flashcards (15 min)
- [ ] Grammar exercises
- [ ] Listening practice
- [ ] Speaking practice
- [ ] Writing practice

## Conversation Practice
**New phrases learned:**
- 
- 
- 

**Practice conversations:**
- 
- 

## Review
**Words to review tomorrow:**
- 
- 
- 

**Difficulty level today:** Easy/Medium/Hard
**Confidence level:** ⭐⭐⭐⭐⭐ (1-5)

## Goals for next session:
- 
- 
`,
    type: 'note',
    category: 'Learning',
    icon: '🌍',
    tags: ['language', 'learning', 'vocabulary']
  },
  {
    id: 'skill-development',
    title: 'Skill Development',
    description: 'Track progress learning new skills',
    content: `# Skill Development Tracker

## Skill: 
**Start date:** 
**Target proficiency date:** 
**Current level:** Beginner/Intermediate/Advanced

## Learning Plan
**Goal:** 

**Resources:**
- 
- 
- 

**Practice schedule:** 
- **Daily:** _____ minutes
- **Weekly goals:** 
- **Monthly milestones:** 

## Progress Log

### Week 1
**Focus:** 
**Time spent:** _____ hours
**Achievements:**
- 
- 
**Challenges:**
- 
- 

### Week 2
**Focus:** 
**Time spent:** _____ hours
**Achievements:**
- 
- 
**Challenges:**
- 
- 

## Skills Assessment
**What I can do now:**
- 
- 
- 

**What I need to work on:**
- 
- 
- 

## Next Steps
- [ ] 
- [ ] 
- [ ] 

## Reflection
**Most effective learning method:** 
**Biggest breakthrough:** 
**Areas for improvement:** 
`,
    type: 'note',
    category: 'Learning',
    icon: '🚀',
    tags: ['skills', 'development', 'progress']
  },

  // Financial Templates
  {
    id: 'monthly-budget',
    title: 'Monthly Budget',
    description: 'Income and expense planning',
    content: `# Monthly Budget - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

## Income
- **Salary:** $
- **Side income:** $
- **Other:** $
- **Total Income:** $

## Fixed Expenses
- **Rent/Mortgage:** $
- **Insurance:** $
- **Phone:** $
- **Internet:** $
- **Subscriptions:** $
- **Loan payments:** $
- **Total Fixed:** $

## Variable Expenses
- **Groceries:** $ (Budget: $)
- **Transportation:** $ (Budget: $)
- **Utilities:** $ (Budget: $)
- **Entertainment:** $ (Budget: $)
- **Dining out:** $ (Budget: $)
- **Shopping:** $ (Budget: $)
- **Total Variable:** $

## Savings & Investments
- **Emergency fund:** $
- **Retirement:** $
- **Investments:** $
- **Other savings:** $
- **Total Savings:** $

## Summary
- **Total Income:** $
- **Total Expenses:** $
- **Total Savings:** $
- **Remaining:** $

## Financial Goals
- [ ] 
- [ ] 
- [ ] 
`,
    type: 'money',
    category: 'Financial',
    icon: '💰',
    tags: ['budget', 'money', 'planning']
  },
  {
    id: 'expense-tracker',
    title: 'Daily Expense Tracker',
    description: 'Track daily spending',
    content: `# Daily Expense Tracker - ${new Date().toLocaleDateString()}

## Today's Expenses

| Time | Category | Description | Amount |
|------|----------|-------------|--------|
|      |          |             | $      |
|      |          |             | $      |
|      |          |             | $      |
|      |          |             | $      |
|      |          |             | $      |

## Category Totals
- **Food & Dining:** $
- **Transportation:** $
- **Shopping:** $
- **Entertainment:** $
- **Bills & Utilities:** $
- **Healthcare:** $
- **Other:** $

## Daily Total: $

## Payment Methods
- **Cash:** $
- **Credit Card:** $
- **Debit Card:** $
- **Digital Payment:** $

## Budget Check
- **Daily budget:** $
- **Spent today:** $
- **Remaining:** $
- **Status:** Under/Over budget

## Notes
- **Largest expense:** 
- **Unnecessary purchases:** 
- **Money-saving opportunities:** 

## Tomorrow's Spending Plan
- **Planned expenses:** $
- **Budget limit:** $
`,
    type: 'money',
    category: 'Financial',
    icon: '📊',
    tags: ['expenses', 'tracking', 'money']
  },
  {
    id: 'savings-goals',
    title: 'Savings Goals',
    description: 'Track financial savings objectives',
    content: `# Savings Goals Tracker

## Goal 1: 
**Target amount:** $
**Current saved:** $
**Remaining:** $
**Target date:** 
**Monthly contribution:** $
**Progress:** ____%

### Progress Bar
[████████████████████████████████████████] 100%

## Goal 2: 
**Target amount:** $
**Current saved:** $
**Remaining:** $
**Target date:** 
**Monthly contribution:** $
**Progress:** ____%

### Progress Bar
[████████████████████████████████████████] 100%

## Goal 3: 
**Target amount:** $
**Current saved:** $
**Remaining:** $
**Target date:** 
**Monthly contribution:** $
**Progress:** ____%

### Progress Bar
[████████████████████████████████████████] 100%

## Savings Strategy
**Primary savings account:** 
**High-yield savings:** 
**Investment accounts:** 
**Automatic transfers:** $___/month

## Monthly Review
**Total saved this month:** $
**Best performing goal:** 
**Challenges:** 
**Adjustments needed:** 

## Motivation
**Why these goals matter:**
- 
- 
- 

**Rewards for milestones:**
- 25%: 
- 50%: 
- 75%: 
- 100%: 
`,
    type: 'money',
    category: 'Financial',
    icon: '🎯',
    tags: ['savings', 'goals', 'money']
  },

  // Quick Capture Templates
  {
    id: 'quick-notes',
    title: 'Quick Notes',
    description: 'Rapid idea capture',
    content: `# Quick Notes - ${new Date().toLocaleDateString()}

## Ideas
- 
- 
- 

## To Remember
- 
- 
- 

## Follow Up
- [ ] 
- [ ] 
- [ ] 

## Random Thoughts
- 
- 
- 

## Links to Check
- 
- 
- 

---
*Created: ${new Date().toLocaleString()}*
`,
    type: 'note',
    category: 'Quick Capture',
    icon: '⚡',
    tags: ['quick', 'notes', 'ideas']
  },
  {
    id: 'link-collection',
    title: 'Link Collection',
    description: 'Organize useful URLs and bookmarks',
    content: `# Link Collection

## Work/Professional
- [Title](URL) - Description
- [Title](URL) - Description
- [Title](URL) - Description

## Learning Resources
- [Title](URL) - Description
- [Title](URL) - Description
- [Title](URL) - Description

## Tools & Apps
- [Title](URL) - Description
- [Title](URL) - Description
- [Title](URL) - Description

## Entertainment
- [Title](URL) - Description
- [Title](URL) - Description
- [Title](URL) - Description

## Shopping
- [Title](URL) - Description
- [Title](URL) - Description
- [Title](URL) - Description

## To Read Later
- [ ] [Title](URL) - Priority: High/Medium/Low
- [ ] [Title](URL) - Priority: High/Medium/Low
- [ ] [Title](URL) - Priority: High/Medium/Low

## Archive (Completed/No longer needed)
- ~~[Title](URL)~~ - Completed
- ~~[Title](URL)~~ - No longer relevant

---
*Last updated: ${new Date().toLocaleString()}*
`,
    type: 'list',
    category: 'Quick Capture',
    icon: '🔗',
    tags: ['links', 'bookmarks', 'resources']
  }
];

// Helper functions
export const getTemplateById = (id: string): Template | undefined => {
  return TEMPLATES.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): Template[] => {
  return TEMPLATES.filter(template => template.category === category);
};

export const getTemplatesByType = (type: string): Template[] => {
  return TEMPLATES.filter(template => template.type === type);
};

export const searchTemplates = (query: string): Template[] => {
  const lowercaseQuery = query.toLowerCase();
  return TEMPLATES.filter(template => 
    template.title.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const TEMPLATE_CATEGORIES = [
  'Productivity',
  'Personal',
  'Health',
  'Learning',
  'Financial',
  'Quick Capture'
];