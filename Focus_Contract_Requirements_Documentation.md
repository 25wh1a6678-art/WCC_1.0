# Focus Contract
## Requirements & MVP Architecture Document

**Hackathon Track:** Open Innovation  
**Target Users:** College/university students  
**Build Constraint:** Approximately 30 hours  
**Primary Platform:** Web application + Chrome/Chromium browser extension  
**MVP Goal:** A fully demonstrable end-to-end product, not a concept-only prototype

---

# 1. Product Definition

## 1.1 Working Product Name

**Focus Contract**

The name is provisional. The product concept is more important than the final brand name.

## 1.2 One-Line Product Definition

**Focus Contract is an AI-powered anti-procrastination system that converts a student's daily reflection into actionable tasks, turns selected tasks into commitments, protects those commitments from browser distractions, and rewards meaningful follow-through with streaks and virtual coins.**

## 1.3 Problem Statement

Students often know what they need to do but still postpone small or manageable academic tasks because immediate entertainment and other short-term rewards feel more attractive in the moment. Traditional to-do applications primarily remind students of tasks; they do not actively bridge the gap between intention and execution.

A student may think:

> "This assignment will only take 15 minutes. I'll watch one episode first and do it afterward."

The episode becomes another episode, the task is repeatedly delayed, and the student eventually goes to sleep without completing it.

The product addresses the behavioral gap between:

**"I should do this"** and **"I actually did it."**

## 1.4 Proposed Solution

Focus Contract creates a behavioral execution loop:

**Reflect → Understand → Plan → Commit → Focus → Restrict Distractions → Complete → Reward → Build Streak → Adapt**

The system should not merely tell the student what to do. It should help the student create a commitment and then provide controlled friction against selected digital distractions during that commitment.

---

# 2. Core Product Philosophy

The product is NOT primarily:

- an AI chatbot;
- a normal to-do list;
- a generic Pomodoro timer;
- a permanent website blocker;
- a financial rewards platform.

The core product is:

> **A commitment-based anti-procrastination system for students.**

AI is used where language understanding and planning are useful. Deterministic software is used where predictable behavior is required.

### AI responsibilities

- Interpret natural-language reflections.
- Extract tasks.
- Suggest priority.
- Estimate duration.
- Suggest task decomposition.
- Suggest adaptive planning.

### Deterministic application responsibilities

- Authentication.
- Task state.
- Commitment state.
- Timers.
- Focus session state.
- Website restriction state.
- Coins.
- Streaks.
- Reward redemption using virtual items.
- Database writes.

The AI must never be the authority for security-sensitive or reward-accounting decisions.

---

# 3. Goals

## 3.1 Primary Goals

1. Convert a student's unstructured daily reflection into a useful task list.
2. Allow the student to review and edit the generated plan.
3. Let the student commit to a task for a focus session.
4. Provide browser-level distraction controls during an active commitment.
5. Reward meaningful task completion with streaks and virtual coins.
6. Give the user a visible sense of progress.
7. Demonstrate the entire experience in a 3-5 minute live hackathon demo.

## 3.2 Secondary Goals

1. Break repeatedly postponed tasks into smaller steps.
2. Use task history to suggest better plans.
3. Provide a reward shop for virtual rewards.
4. Make the architecture extensible toward mobile and real-world reward integrations.

---

# 4. Explicit Constraints

## 4.1 Time Constraint

The implementation target is approximately **30 hours**.

Therefore:

- working functionality is prioritized over feature quantity;
- external integrations must be minimized;
- advanced security and anti-cheat systems are out of scope for the MVP;
- the team must reach a working demo before the final hours;
- later versions must not destabilize earlier versions.

## 4.2 Platform Constraint

The MVP is a **web application**.

Browser-level distraction control is implemented through a **Chrome/Chromium extension**.

The MVP does NOT claim to block arbitrary applications, operating-system-wide activity, or all mobile apps.

## 4.3 Financial Constraint

The MVP uses **virtual coins only**.

Real-money payouts and actual gift-card issuance are **future scope** and must not be presented as a currently operational feature.

## 4.4 AI Constraint

The project should use a cloud LLM API rather than training a custom model during the hackathon.

## 4.5 Demo Constraint

The core demo must work with a fresh or seeded account and must not depend on long-running background processes or features that are difficult to reproduce live.

---

# 5. Target User

## Primary Persona

A college/university student who:

- has multiple academic tasks;
- frequently postpones tasks that appear small or manageable;
- uses a laptop/browser for entertainment and academic work;
- understands what should be done but struggles with execution;
- wants productivity support without a complicated setup.

## Example User Story

A student says:

> "I finished Java today, I didn't do DBMS, I have a DLD test tomorrow, and I need to submit my assignment."

Focus Contract should understand that reflection, create tasks, suggest priorities and durations, and allow the student to commit to one task.

---

# 6. End-to-End Workflow

```text
Student
  ↓
Daily Reflection
  ↓
Text or Voice Input
  ↓
Speech-to-Text (when voice is used)
  ↓
AI Task Extraction + Planning
  ↓
Review / Edit Suggested Tasks
  ↓
Student Selects Task
  ↓
Create Commitment
  ↓
Focus Mode Starts
  ↓
Chrome Extension Restricts Selected Distractions
  ↓
Student Completes Focus Session / Task
  ↓
Completion Verified by Application State
  ↓
Reward Engine Calculates Virtual Coins
  ↓
Streak Updated
  ↓
Progress Dashboard Updated
  ↓
Optional Reward Shop Purchase
  ↓
Historical Data Available for Future Adaptive Planning
```

---

# 7. Functional Requirements

## FR-01: User Authentication

The system shall allow a student to:

- create an account;
- log in;
- log out;
- maintain an authenticated session.

## FR-02: Dashboard

The system shall display:

- today's tasks;
- task completion progress;
- active commitment if one exists;
- current streak;
- coin balance;
- focus time;
- recent reward activity.

## FR-03: Manual Task Management

The user shall be able to:

- create tasks manually;
- edit tasks;
- delete tasks;
- mark tasks complete;
- assign priority;
- specify estimated duration;
- optionally specify a deadline.

## FR-04: Daily Reflection

The system shall provide a reflection interface where the user can describe what happened today and what remains unfinished.

Input types:

- text;
- voice transcription where browser support is available.

## FR-05: Voice Input

The system shall:

- request microphone access when required;
- record speech through browser-supported speech recognition for the MVP;
- display the resulting transcription;
- allow the user to edit the transcription;
- fall back to typed text when voice recognition is unavailable or denied.

Raw audio storage is not required for the MVP.

## FR-06: AI Task Extraction

The system shall send the user's reflection to the AI service and request structured task output.

Each suggested task should include, where available:

- title;
- description;
- priority;
- estimated duration;
- deadline;
- reason for priority;
- suggested subtasks when appropriate.

The user shall review generated tasks before they become confirmed tasks.

## FR-07: AI Output Validation

AI responses shall be validated against a strict schema before they are persisted.

Invalid, incomplete, or malformed responses shall not directly become application state.

The system shall provide a user-visible error or retry path if the AI request fails.

## FR-08: Commitment Creation

A user shall be able to select a confirmed task and create a commitment.

A commitment shall contain at least:

- task ID;
- committed duration;
- start time;
- status;
- completion/termination time when applicable.

## FR-09: Focus Mode

When a commitment starts, the application shall show:

- active task;
- countdown timer;
- committed duration;
- focus state;
- completion action;
- reschedule/abort action.

## FR-10: Deterministic Focus Session State

Focus session state shall be managed by application logic rather than by the LLM.

Supported states should include:

- scheduled;
- active;
- completed;
- rescheduled;
- abandoned.

## FR-11: Browser Distraction Control

The Chrome/Chromium extension shall be able to restrict selected domains during an active focus session.

Default demo domains may include:

- youtube.com;
- instagram.com;
- reddit.com.

The blocked list shall be configurable at a basic level.

## FR-12: Blocking Rules

While a focus session is active:

- configured distraction domains shall be restricted;
- the focus application shall remain accessible;
- a blocked-page explanation shall be displayed;
- restrictions shall end when the focus session ends according to application state.

The MVP does not need sophisticated anti-bypass protection.

## FR-13: Extension/Application Synchronization

The web application and extension shall synchronize enough state to determine whether a focus session is active.

The implementation must ensure that the extension does not independently invent a focus state that conflicts with the application's authoritative state.

## FR-14: Task Completion

A student shall be able to complete a task after participating in the relevant workflow.

Completion shall update task status and trigger eligible reward processing.

## FR-15: Streak System

The system shall maintain a daily productivity streak.

A streak day is earned when the user satisfies the product's defined daily success condition.

For MVP, a valid streak day may be defined as completing at least one committed focus task or meeting the daily goal.

The streak shall:

- increase on consecutive successful days;
- reset according to the defined missed-day rule;
- display current streak;
- display milestone progress.

## FR-16: Recovery / Grace Mechanism

The MVP may provide a limited recovery pass that protects one missed day.

The pass should be earned as a reward rather than being freely unlimited.

## FR-17: Virtual Coin System

The system shall maintain a virtual currency balance called **FocusCoins**.

Coins shall be awarded for meaningful behavior such as:

- completing eligible committed tasks;
- completing a daily goal;
- maintaining streak milestones.

Coins shall not be awarded merely for:

- opening the app;
- creating arbitrary tasks;
- deleting tasks;
- browsing the dashboard.

## FR-18: Coin Anti-Farming Controls

The MVP shall include basic deterministic protections:

- only eligible committed tasks can generate completion rewards;
- a completed task can award its completion reward only once;
- very short tasks below the minimum eligibility threshold do not earn coins;
- a daily coin cap is applied.

## FR-19: Suggested Coin Schedule

A simple MVP schedule may be:

| Eligible committed duration | Base reward |
|---|---:|
| 5-14 minutes | 10 coins |
| 15-29 minutes | 20 coins |
| 30-59 minutes | 35 coins |
| 60+ minutes | 50 coins |

Additional bonuses may include:

- daily goal completion: +25 coins;
- streak milestone: +20 to +50 coins depending on milestone.

Suggested daily cap: **200 coins**.

These values are configuration, not hard-coded business assumptions, and may be tuned after testing.

For the MVP, daily boundaries use UTC. A task's completion reward is claimable only once per user, including tasks completed below the five-minute reward threshold or while the daily cap is reached. Completing a qualifying focus contract adds a +25 first-success-of-the-day bonus; 3-, 7-, 14-, and 30-day streak milestones add +20, +30, +40, and +50 respectively, all subject to the daily cap. A purchased recovery pass automatically bridges exactly one missed day and is consumed when used; a longer gap resets the streak.

## FR-20: Reward Shop

The system shall show a virtual reward catalog.

Example rewards:

| Reward | Example cost |
|---|---:|
| 10-minute Break Pass | 100 coins |
| New Dashboard Theme | 100 coins |
| Streak Recovery Pass | 250 coins |
| Badge / Cosmetic Item | 150 coins |

A reward purchase shall:

- verify balance;
- deduct coins atomically;
- record a transaction;
- add the purchased item to the user's inventory.

## FR-21: Reward Transaction History

The system shall record:

- coin awards;
- coin deductions;
- source event;
- amount;
- timestamp;
- resulting balance.

## FR-22: Progress Dashboard

The dashboard shall display, at minimum:

- tasks completed today;
- total focus time;
- current streak;
- FocusCoin balance;
- commitments completed;
- optional distraction-block count when available.

## FR-23: Adaptive Accountability

When historical data indicates repeated postponement, the system may suggest:

- breaking the task into smaller subtasks;
- shortening the next commitment;
- rescheduling;
- asking whether the student is blocked by task difficulty.

AI suggestions must be reviewable and must not silently modify confirmed tasks.

## FR-24: Adaptive Daily Planning

The system may generate a suggested daily plan using:

- deadlines;
- priority;
- estimated duration;
- unfinished tasks;
- previous task behavior.

The student must be able to accept, edit, reorder, delete, or reschedule suggestions.

---

# 8. Non-Functional Requirements

## NFR-01: Usability

The main student workflow should be understandable without training.

The primary actions should be visually obvious:

**Reflect → Plan → Commit → Focus → Complete**

## NFR-02: Performance

Normal dashboard interactions should feel responsive.

AI requests may take longer, but the interface shall show a loading state rather than appearing frozen.

## NFR-03: Reliability

A failure in the AI service must not corrupt existing tasks, commitments, coins, or streaks.

## NFR-04: Data Integrity

Coin balances and reward purchases must be updated atomically.

A user must not receive the same task-completion reward twice due to refreshes or repeated requests.

## NFR-05: Security

- API keys must never be exposed in client-side code.
- Server-side secrets must use environment variables.
- User data must be scoped to the authenticated user.
- Database access rules must prevent unauthorized access to other users' records.
- Reward transactions must be validated server-side.
- The extension must not blindly trust arbitrary client-side claims of task completion.

## NFR-06: Privacy

The system should collect only the information necessary for the MVP.

Raw audio storage is unnecessary for the MVP.

The product should clearly communicate what text/data is sent to the AI provider.

## NFR-07: Maintainability

The codebase should separate:

- UI;
- business logic;
- AI integration;
- database access;
- reward logic;
- extension logic.

## NFR-08: Extensibility

The reward subsystem must permit future replacement of virtual-only rewards with an external reward provider without redesigning task and commitment logic.

## NFR-09: Accessibility

The core UI should support:

- keyboard navigation;
- readable text;
- clear labels;
- visible focus states;
- sufficient contrast.

## NFR-10: Demoability

A clean demo account or seeded dataset should be available so the team does not depend entirely on live data entry.

---

# 9. Recommended Technical Stack

## Web Application

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

- Next.js server-side/API functionality

## Database

- Supabase PostgreSQL

## Authentication

- Supabase Auth

## AI

- Gemini API

## Voice

- Browser-supported speech recognition for MVP
- Typed text fallback

## Browser Blocking

- Chrome/Chromium Extension
- Manifest V3
- Browser request/navigation restriction mechanisms supported by the extension platform

## Hosting

- Vercel for the web application
- Extension loaded locally for the hackathon demo unless a distribution path is required

## Version Control

- Git
- GitHub

---

# 10. High-Level Architecture

```text
                         ┌─────────────────────┐
                         │      STUDENT        │
                         └──────────┬──────────┘
                                    │
                      Web Browser   │
                                    ▼
                    ┌─────────────────────────┐
                    │       Next.js App       │
                    │                         │
                    │ Dashboard               │
                    │ Daily Reflection        │
                    │ Tasks                   │
                    │ Focus Mode              │
                    │ Rewards                 │
                    │ Progress                │
                    └───────────┬─────────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                ▼               ▼                ▼
        ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
        │ Supabase DB │  │ Gemini API  │  │ Chrome       │
        │ + Auth      │  │             │  │ Extension    │
        └─────────────┘  └─────────────┘  └──────┬───────┘
                                                │
                                                ▼
                                      Selected distraction
                                          domain control
```

### Architectural authority

The web application's backend/database is authoritative for:

- tasks;
- commitments;
- focus-session state;
- coin balance;
- reward transactions;
- streak state.

The extension is an enforcement client for browser distraction control, not the system of record.

---

# 11. Suggested Data Model

## users

- id
- name
- email
- created_at

## tasks

- id
- user_id
- title
- description
- priority
- estimated_minutes
- deadline
- status
- source
- created_at
- completed_at

`source` may contain values such as:

- manual
- reflection_ai
- adaptive_ai

## daily_reflections

- id
- user_id
- text
- created_at

## commitments

- id
- user_id
- task_id
- duration_minutes
- status
- started_at
- completed_at
- created_at

## focus_sessions

- id
- user_id
- commitment_id
- started_at
- ended_at
- duration_seconds
- status

## blocked_sites

- id
- user_id
- domain
- enabled

## streaks

- id
- user_id
- current_streak
- longest_streak
- last_success_date
- recovery_passes

## coin_transactions

- id
- user_id
- amount
- transaction_type
- source_reference
- created_at

`transaction_type` may contain:

- task_completion
- daily_bonus
- streak_bonus
- reward_purchase
- adjustment

## rewards

- id
- name
- description
- reward_type
- coin_cost
- active

## user_rewards

- id
- user_id
- reward_id
- status
- purchased_at
- redeemed_at

---

# 12. AI Contract

AI output should be structured and validated.

Conceptual response shape:

```json
{
  "tasks": [
    {
      "title": "Study DLD",
      "description": "Review sequential logic and practice important questions",
      "priority": "high",
      "estimated_minutes": 45,
      "deadline": "2026-10-05T08:00:00+05:30",
      "reason": "Exam is tomorrow",
      "subtasks": [
        "Review concepts",
        "Practice questions"
      ]
    }
  ]
}
```

The exact schema should be implemented using runtime validation.

The backend must treat the AI response as **untrusted input** until validation succeeds.

---

# 13. Reward Engine Rules

The reward engine should be deterministic.

### Eligibility

A completion reward is granted only if:

1. the task belongs to the authenticated user;
2. the task was confirmed/committed;
3. the task was not already rewarded;
4. the task meets the minimum duration threshold;
5. the daily reward cap has not been exceeded.

### Example flow

```text
Commitment Completed
        ↓
Check Task Eligibility
        ↓
Check Already Rewarded?
        ↓
Calculate Coins
        ↓
Record Transaction
        ↓
Update Balance
        ↓
Update Streak
        ↓
Update Dashboard
```

All reward calculations should occur server-side.

---

# 14. Streak Rules

Suggested MVP definition:

A user earns one successful day when the user completes at least one eligible commitment or completes the daily goal.

Example:

```text
Monday     ✅ 1 successful commitment
Tuesday    ✅ 2 successful commitments
Wednesday  ✅ daily goal
Thursday   ✅ 1 successful commitment

Current Streak = 4 days
```

The MVP should avoid complex streak mathematics.

A limited recovery pass may protect one missed day.

---

# 15. Browser Extension Requirements

## Purpose

The extension provides browser-level friction against selected distractions during an active Focus Contract.

## Minimum MVP behavior

1. Extension is installed in Chrome/Chromium.
2. Extension is configured with selected distraction domains.
3. The web application starts an active focus session.
4. Extension learns that focus mode is active.
5. Navigation to configured domains is restricted.
6. User sees a simple blocked explanation.
7. When the session ends, restrictions stop.

## Deliberate limitations

The MVP does not attempt to:

- block all desktop applications;
- block all operating-system activity;
- guarantee impossible-to-bypass restrictions;
- control unrelated browsers;
- provide device-wide mobile blocking.

These are future-scope capabilities.

---

# 16. UI / Product Theme

## Recommended Theme: Focus Contract

Visual direction:

- clean student productivity dashboard;
- game-inspired reward panel without looking childish;
- strong emphasis on the active commitment;
- prominent streak and FocusCoin balance;
- calm focus screen;
- clear blocked-state screen.

## Core screens

1. Landing / Login
2. Dashboard
3. Daily Reflection
4. AI Generated Plan
5. Task Details
6. Commitment Setup
7. Focus Mode
8. Blocked Distraction Screen
9. Rewards / Shop
10. Progress / History

---

# 17. Version Roadmap

## V0: Foundation

- project setup;
- authentication;
- dashboard shell;
- manual task CRUD;
- database.

**Mandatory:** Yes

## V1: AI Task Planning

- natural-language input;
- structured AI task extraction;
- review/edit before save.

**Mandatory:** Yes

## V2: Daily Reflection + Voice

- voice-to-text;
- typed fallback;
- AI-powered reflection processing.

**Mandatory:** Yes for demo if stable; typed reflection is the fallback.

## V3: Commitment Mode

- commitment creation;
- focus timer;
- completion/reschedule states.

**Mandatory:** Yes

## V4: Browser Distraction Control

- Chrome extension;
- blocked domain list;
- active focus synchronization;
- blocked page.

**Mandatory:** Yes

## V5: Reward System

- FocusCoins;
- streaks;
- reward calculations;
- reward shop;
- transaction history.

**Mandatory:** Yes

## V6: Adaptive Accountability

- detect repeated postponement;
- suggest smaller tasks;
- suggest adjusted commitments.

**Stretch:** Yes

## V7: Adaptive Planning + Polish

- historical planning;
- analytics;
- improved dashboard;
- demo polish;
- robust loading/error states.

**Stretch:** Yes

## V8: Real-World Rewards Architecture

- abstract reward-provider interface;
- future gift-card provider integration;
- real-world redemption.

**Future scope only.**

---

# 18. MVP Scope Freeze

The MVP is considered complete when the following flow works end to end:

```text
User Login
   ↓
Daily Reflection
   ↓
AI Generates Tasks
   ↓
User Confirms Task
   ↓
User Creates Commitment
   ↓
Focus Mode Starts
   ↓
Selected Distracting Website Is Blocked
   ↓
Commitment Ends
   ↓
Task Is Completed
   ↓
Coins Are Awarded
   ↓
Streak Updates
   ↓
Dashboard Shows Progress
   ↓
Coin Can Be Spent in Reward Shop
```

If the team is running out of time, stop adding features once this flow works.

---

# 19. Out of Scope for the 30-Hour MVP

The following must NOT consume core build time:

- native Android application;
- native iOS application;
- operating-system-wide app blocking;
- real-money payments;
- real gift-card issuance;
- advanced fraud detection;
- advanced anti-bypass mechanisms;
- custom machine-learning model training;
- complex multi-agent architecture;
- social feed/community;
- friend leaderboards;
- calendar ecosystem integrations;
- wearable integrations;
- complicated recommendation systems.

These can be documented under future scope.

---

# 20. Security Requirements for the Hackathon MVP

Even under severe time constraints:

1. Never commit secrets or API keys to Git.
2. Keep AI API keys server-side.
3. Validate authenticated user ownership before database operations.
4. Treat client-side task completion as a request, not unquestionable truth.
5. Calculate reward amounts on the server.
6. Record coin transactions instead of simply overwriting a balance.
7. Prevent duplicate reward transactions.
8. Validate AI-generated JSON.
9. Do not trust arbitrary extension messages without basic validation.
10. Never represent virtual coins as real monetary value in the MVP.

---

# 21. Testing Requirements

## Core tests

### Authentication

- valid login;
- invalid login;
- logout;
- unauthorized access.

### Tasks

- create;
- edit;
- delete;
- complete;
- duplicate reward prevention.

### AI

- valid response;
- malformed response;
- missing field;
- empty input;
- API timeout/error.

### Voice

- permission granted;
- permission denied;
- empty transcription;
- unsupported browser fallback.

### Commitment

- start;
- timer runs;
- completion;
- reschedule;
- abort;
- refresh during session.

### Blocking

- configured site blocked during session;
- focus site remains accessible;
- blocked site becomes available after session;
- extension unavailable fallback.

### Rewards

- eligible task earns coins;
- ineligible task earns none;
- same task cannot earn twice;
- daily cap works;
- purchase deducts coins;
- insufficient balance rejected.

### Streak

- first successful day;
- consecutive day;
- missed day;
- recovery pass;
- milestone bonus.

---

# 22. Acceptance Criteria

The MVP passes acceptance when:

### AC-01
A student can create an account and access a personal dashboard.

### AC-02
A student can describe their day in text and receive a structured task plan.

### AC-03
The student can review and modify AI-generated tasks before confirmation.

### AC-04
A student can create a focus commitment for a task.

### AC-05
Focus Mode displays a working timer and commitment state.

### AC-06
The browser extension restricts at least the configured demo distraction domains during an active focus session.

### AC-07
Completion results in deterministic FocusCoin and streak updates.

### AC-08
A student can spend virtual coins on at least one virtual reward.

### AC-09
The application survives AI failure without corrupting existing application state.

### AC-10
The complete demo can be presented in approximately 3-5 minutes.

---

# 23. Hackathon Demo Script

## Demo Setup

Use a prepared student account and extension configuration.

## Step 1: Reflection

Student says:

> "I finished Java today, didn't do DBMS, and I have a DLD test tomorrow. I also need to submit an assignment."

## Step 2: AI Plan

Show generated tasks and priorities.

## Step 3: Commitment

Select:

> Study DLD for 30 minutes.

Press **Commit**.

## Step 4: Focus Mode

Timer starts.

## Step 5: Distraction Attempt

Open YouTube.

Show the blocked page.

## Step 6: Complete

Finish the commitment.

## Step 7: Reward

Show:

- FocusCoins earned;
- streak increment;
- progress update.

## Step 8: Reward Shop

Spend coins on a virtual reward.

## Closing Message

> **Focus Contract does not just remind students what they should do. It helps them commit, protects that commitment from distractions, and rewards them for following through.**

---

# 24. Future Scope

## 24.1 Mobile Application

A future Android/iOS version can provide deeper device-level distraction controls that cannot be guaranteed by a normal web application.

## 24.2 Real-World Rewards

A future implementation may connect the virtual reward economy to an authorized reward or gift-card provider.

The architecture should use a provider abstraction so the current virtual reward system can later delegate redemption to an external service.

## 24.3 Calendar Integration

The system could use calendar schedules to automatically suggest focus windows.

## 24.4 Personalized Behavioral Model

Over time, the system could learn:

- preferred study hours;
- common postponement patterns;
- typical task duration;
- common distractions;
- completion behavior.

## 24.5 Advanced Adaptive Accountability

The system could distinguish between:

- low motivation;
- overly large tasks;
- lack of understanding;
- unrealistic scheduling;
- external blockers.

## 24.6 Cross-Device Focus

A future architecture could synchronize focus commitments across:

- laptop;
- phone;
- tablet;
- browser extensions.

---

# 25. Product Risks and Mitigations

## Risk 1: Blocking is unreliable

**Mitigation:** Limit the MVP claim to supported Chrome/Chromium browser domains and demonstrate a controlled browser scenario.

## Risk 2: AI generates bad tasks

**Mitigation:** Require structured output, validate it, and require human review before persistence.

## Risk 3: Users game the coin system

**Mitigation:** minimum-duration eligibility, commitment requirement, duplicate-reward prevention, and daily coin cap.

## Risk 4: Reward system becomes the product instead of productivity

**Mitigation:** reward only meaningful behavior; keep task completion and commitment as the center of the experience.

## Risk 5: Too many features for 30 hours

**Mitigation:** V0-V5 are the hard MVP boundary. V6-V8 are optional/future work.

## Risk 6: Real-money rewards create operational complexity

**Mitigation:** virtual FocusCoins in MVP; real-world rewards are future scope only.

---

# 26. Definition of Done

The project is ready for judging when:

- the application starts cleanly;
- a student can log in;
- reflection can be entered;
- AI can generate tasks;
- tasks can be reviewed;
- a commitment can be started;
- the timer works;
- at least one distraction domain is demonstrably blocked by the extension;
- task completion updates coins;
- streak updates correctly;
- at least one reward can be purchased with coins;
- the dashboard reflects the activity;
- no core flow requires manual database edits during the demo;
- the team has a fallback demo account/data path;
- the core flow has been tested after the final code changes.

---

# 27. Final Product Summary

Focus Contract is a student-focused behavior-change system built around a simple idea:

> **The problem is not always knowing what to do. The problem is doing it when a more immediately rewarding distraction is available.**

The MVP therefore creates a closed loop:

**AI understands the student's day → creates tasks → student commits → browser distractions are restricted → student completes meaningful work → streak and FocusCoins provide immediate feedback → progress becomes visible.**

The 30-hour implementation intentionally stops before native mobile control and real-money reward infrastructure.

The product should be judged on the strength of the core loop, reliability of the live demo, clarity of the problem, and the quality of the commitment-based experience rather than on the number of features.
