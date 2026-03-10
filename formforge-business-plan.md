# FormForge — תוכנית עסקית ומפת דרכים לפיתוח

## מוצר משולב: FormForge + LaunchList + ClientPulse + HelpDeskMini

---

## חלק 1: חזון המוצר

### מה זה FormForge?

FormForge הוא פלטפורמת SaaS שמאפשרת לעסקים לאסוף, לנהל ולפעול על מידע שמגיע מאנשים — לקוחות, עובדים, משתמשים או מועמדים. במקום ארבעה כלים נפרדים לטפסים, waitlists, פידבק ותמיכה, FormForge מאחד את הכל תחת מנוע אחד עם ארבעה מצבי פעולה.

### הבעיה שהמוצר פותר

כל עסק דיגיטלי עובר את אותו מחזור חיים:

1. **לפני ההשקה** — צריך לאסוף קהל מתעניינים ולבנות hype. היום זה דורש כלי waitlist נפרד (Waitlist API, LaunchRock).
2. **בהשקה** — צריך טפסי הרשמה, אינטייק, onboarding. היום זה דורש כלי טפסים (Typeform, JotForm, Google Forms).
3. **אחרי ההשקה** — צריך לאסוף פידבק ולמדוד שביעות רצון. היום זה דורש כלי NPS (Delighted, Hotjar).
4. **בצמיחה** — צריך לטפל בפניות ובעיות של לקוחות. היום זה דורש מערכת תמיכה (Zendesk, Freshdesk).

הלקוח משלם ל-4 ספקים שונים, מנהל 4 דשבורדים, ונתוני הלקוחות שלו מפוזרים ב-4 מערכות שלא מדברות אחת עם השנייה.

FormForge פותר את זה: **מנוע אחד, ארבעה מצבים, דשבורד אחד, תשלום אחד.**

### למי המוצר מיועד

**קהל ראשי (Primary Market):**
- סטארטאפים ו-SaaS founders שמשיקים מוצרים — צריכים waitlist, feedback ו-support
- Indie hackers ויוצרים דיגיטליים — תקציב מוגבל, רוצים כלי אחד שעושה הכל
- סוכנויות דיגיטליות — בונים ומשיקים מוצרים עבור לקוחות, צריכים תשתית חוזרת

**קהל משני (Secondary Market):**
- עסקים קטנים ובינוניים — קליניקות, משרדי עו"ד, חברות שירות שצריכים טפסי קליטה ופידבק
- צוותי HR — טפסי onboarding, סקרי עובדים, דיווחי תקלות פנימיים
- מוסדות חינוך — טפסי הרשמה, סקרי הערכה, דיווח בעיות

### הצעת הערך הייחודית (UVP)

**"כל מה שעסק צריך כדי לאסוף מידע מאנשים — מהיום הראשון לפני ההשקה ועד מיליון לקוחות."**

מה שמבדיל את FormForge מכל כלי קיים:
- **Typeform / JotForm** — עושים רק טפסים. אין waitlists, אין NPS, אין תמיכה.
- **Waitlist API / LaunchRock** — עושים רק waitlists. אין טפסים כלליים.
- **Delighted / SatisMeter** — עושים רק NPS. יקרים ומוגבלים.
- **Zendesk / Freshdesk** — עושים רק תמיכה. מורכבים ויקרים לעסקים קטנים.
- **FormForge** — עושה את כל הארבעה, במוצר אחד, בתמחור שמתחיל ב-$0.

---

## חלק 2: ארכיטקטורת המוצר

### עקרון הליבה — "הכל זה טופס"

הרעיון המרכזי: כל אינטראקציה שבה אדם שולח מידע לעסק היא בבסיסה טופס. waitlist זה טופס עם לוגיקת תור. סקר NPS זה טופס עם לוגיקת ציונים. טיקט תמיכה זה טופס עם לוגיקת שיחה.

לכן FormForge בנוי סביב **form engine** אחד עם שכבות (layers) שמשתנות לפי המצב:

```
┌─────────────────────────────────────────────┐
│              FormForge UI Layer              │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌───────┐    │
│  │ Form │ │ Wait │ │Feedback│ │Support│    │
│  │ Mode │ │ Mode │ │  Mode  │ │ Mode  │    │
│  └──┬───┘ └──┬───┘ └───┬────┘ └──┬────┘    │
│     └────────┴─────────┴─────────┘          │
│              Core Form Engine                │
│     ┌──────────────────────────┐            │
│     │  Fields · Validation ·   │            │
│     │  Storage · Public Page · │            │
│     │  Submissions · Export    │            │
│     └──────────────────────────┘            │
│              Shared Services                 │
│  ┌──────────────────────────────────────┐   │
│  │ Auth · Notifications · Analytics ·   │   │
│  │ Branding · API · Workspace/Teams     │   │
│  └──────────────────────────────────────┘   │
│              Supabase (PostgreSQL)           │
└─────────────────────────────────────────────┘
```

### ארבעת המצבים בפירוט

#### Standard Form Mode
**מטרה:** אסוף כל סוג של מידע מכל סוג של אדם.
**דוגמאות שימוש:** טופס הרשמה, קליטת עובד, טופס יצירת קשר, דיווח באג, בקשת הצעת מחיר, טופס RSVP לאירוע.
**מה המשתמש בונה:** טופס עם שדות גרירה-שחרור (טקסט, בחירה, דירוג, תאריך, קובץ), לוגיקה מותנית, עיצוב מותאם.
**הפלט:** דף ציבורי שכל אחד יכול למלא, טבלת תשובות בדשבורד, ייצוא CSV, סטטיסטיקות בסיסיות.
**מה ייחודי למצב זה:** גמישות מלאה — היוצר מחליט אילו שדות, באיזה סדר, עם איזו ולידציה. אין הנחות מוקדמות על סוג השימוש.

#### Waitlist Mode
**מטרה:** אסוף קהל לפני השקה עם מנגנון ויראלי מובנה.
**דוגמאות שימוש:** waitlist למוצר SaaS, רשימת המתנה לאפליקציה, early access לפיצ'ר חדש, רשימה לאירוע מוגבל.
**מה המשתמש בונה:** דף נחיתה ממותג עם כותרת, תיאור, ולוגו — ושדה email (ואופציונלית שם).
**הפלט:** דף ציבורי עם מונה נרשמים, לינק referral ייחודי לכל נרשם, לוח referral leaderboard, מנגנון הזמנות בבאצ'ים.
**מה ייחודי למצב זה:**
- **מיקום אוטומטי בתור** — כל נרשם מקבל מספר סידורי.
- **Referral engine** — לינק ייחודי. כל חבר שנרשם דרכו מעלה את המפנה בתור.
- **דף נחיתה ממותג** — עיצוב שמותאם למותג של הלקוח, לא נראה כמו "טופס."
- **הזמנות בבאצ'ים** — "הזמן את 100 הראשונים" בלחיצה.
- **A/B Testing** (Growth tier) — בדיקת כותרות וצבעים שונים לאופטימיזציה.

#### Feedback Mode
**מטרה:** מדוד שביעות רצון לקוחות ואתר לקוחות בסיכון נטישה.
**דוגמאות שימוש:** סקר NPS אחרי שירות, סקר CSAT אחרי רכישה, דירוג חוויה, סקר עובדים.
**מה המשתמש בונה:** סקר קצר — בדרך כלל שאלת NPS (0-10) ושאלה פתוחה אחת. אפשר להוסיף שאלות מותאמות.
**הפלט:** ציון NPS מחושב אוטומטית, חלוקה ל-Promoters/Passives/Detractors, גרף מגמה לאורך זמן, התראות על ציונים נמוכים.
**מה ייחודי למצב זה:**
- **חישוב NPS אוטומטי** — NPS = %Promoters(9-10) פחות %Detractors(0-6). המשתמש לא צריך לחשב כלום.
- **At-Risk Alerts** — כשלקוח נותן ציון 0-6, המערכת שולחת התראה לצוות עם הציון והתגובה הפתוחה.
- **Sentiment Tracking** — גרף שמראה איך ה-NPS משתנה לאורך שבועות וחודשים.
- **Segment by Source** — פילוח ציונים לפי מקור (מוצר, שירות, צוות).

#### Support Mode
**מטרה:** קבל ותנהל פניות של לקוחות עם מעקב סטטוס ותקשורת דו-כיוונית.
**דוגמאות שימוש:** טיקט תמיכה טכנית, דיווח באג, בקשת שירות, תלונה.
**מה המשתמש בונה:** טופס פנייה עם שדות: נושא, תיאור, קטגוריה, עדיפות, צירוף קובץ.
**הפלט:** לוח Kanban עם עמודות (פתוח → בטיפול → ממתין → נפתר), thread הודעות על כל טיקט, SLA timer.
**מה ייחודי למצב זה:**
- **לוח Kanban** — גרור טיקטים בין עמודות כדי לעדכן סטטוס.
- **Thread הודעות** — שיחה דו-כיוונית בין הסוכן ללקוח על כל טיקט.
- **תגובות מוכנות** — Canned responses שהסוכן מכניס בלחיצה.
- **SLA Timer** — ספירה לאחור שמראה כמה זמן נותר עד שה-SLA נפרץ.
- **מעקב ללא auth** — הלקוח עוקב אחרי הטיקט עם מספר טיקט + אימייל, בלי צורך בהרשמה.
- **הקצאה לסוכנים** — הטיקט מוקצה לאיש צוות ספציפי.

### מה משותף לכל ארבעת המצבים (Core Form Engine)

| רכיב | תיאור |
|-------|--------|
| **Field System** | מערכת שדות גמישה מבוססת JSONB — טקסט, מספר, בחירה, דירוג, תאריך, קובץ, כותרת מקטע |
| **Public Page** | דף ציבורי ללא auth שכל אחד יכול לגשת אליו ולמלא |
| **Submission Storage** | כל התשובות נשמרות ב-JSONB עם metadata (זמן, מקור, IP) |
| **Dashboard** | דשבורד ניהול עם טבלת תשובות, פילטרים, חיפוש |
| **Export** | ייצוא CSV של כל התשובות המסוננות |
| **Branding** | צבעים, לוגו, עיצוב מותאם בדף הציבורי |
| **Notifications** | התראות על תשובות חדשות — in-app ואימייל |
| **Analytics** | סטטיסטיקות בסיסיות — ספירות, מגמות, חלוקות |
| **Auth & Teams** | הרשמה, Workspace, הרשאות (owner/editor/viewer) |
| **Embed** | קוד iframe להטמעה באתר חיצוני |

---

## חלק 3: מבנה בסיס הנתונים

### טבלאות הליבה (Core — נבנות בשלב 1)

```
profiles
├── id (UUID, PK)
├── email (TEXT, UNIQUE)
├── full_name (TEXT)
├── avatar_url (TEXT)
└── created_at (TIMESTAMPTZ)

workspaces
├── id (UUID, PK)
├── owner_id (FK → profiles)
├── name (TEXT)
├── slug (TEXT, UNIQUE)
└── created_at (TIMESTAMPTZ)

workspace_members
├── workspace_id (FK → workspaces)
├── user_id (FK → profiles)
├── role (ENUM: owner, editor, viewer)
└── UNIQUE(workspace_id, user_id)

forms
├── id (UUID, PK)
├── workspace_id (FK → workspaces)
├── created_by (FK → profiles)
├── title (TEXT)
├── description (TEXT)
├── mode (ENUM: standard, waitlist, feedback, support)
├── status (ENUM: draft, active, closed)
├── fields (JSONB) — מערך שדות הטופס
├── settings (JSONB) — הגדרות ספציפיות למצב
├── branding (JSONB) — צבעים, לוגו, עיצוב
├── submission_count (INTEGER, default 0)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

submissions
├── id (UUID, PK)
├── form_id (FK → forms)
├── data (JSONB) — תשובות הטופס
├── submitted_by_email (TEXT)
├── submitted_by_name (TEXT)
├── metadata (JSONB) — מקור, referrer, IP
├── status (TEXT) — סטטוס שמשתנה לפי mode
└── submitted_at (TIMESTAMPTZ)
```

### טבלאות Waitlist Mode (נבנות בשלב 2)

```
waitlist_entries
├── id (UUID, PK)
├── form_id (FK → forms)
├── submission_id (FK → submissions)
├── email (TEXT)
├── name (TEXT)
├── referral_code (TEXT, UNIQUE)
├── referred_by (TEXT, FK → waitlist_entries.referral_code)
├── position (INTEGER)
├── referral_count (INTEGER, default 0)
├── status (ENUM: waiting, invited, joined)
└── created_at (TIMESTAMPTZ)

waitlist_invites
├── id (UUID, PK)
├── form_id (FK → forms)
├── entry_id (FK → waitlist_entries)
├── message (TEXT)
└── invited_at (TIMESTAMPTZ)
```

### טבלאות Feedback Mode (נבנות בשלב 3)

```
feedback_responses
├── id (UUID, PK)
├── form_id (FK → forms)
├── submission_id (FK → submissions)
├── respondent_email (TEXT)
├── respondent_name (TEXT)
├── nps_score (INTEGER, 0-10)
├── category (TEXT) — פילוח לפי מקור/מוצר/צוות
├── sentiment (ENUM: promoter, passive, detractor)
├── flagged (BOOLEAN, default false) — סימון ידני
└── submitted_at (TIMESTAMPTZ)

feedback_alerts
├── id (UUID, PK)
├── form_id (FK → forms)
├── response_id (FK → feedback_responses)
├── alert_type (ENUM: detractor, score_drop, keyword)
├── message (TEXT)
├── read (BOOLEAN, default false)
└── created_at (TIMESTAMPTZ)
```

### טבלאות Support Mode (נבנות בשלב 4)

```
tickets
├── id (UUID, PK)
├── form_id (FK → forms)
├── submission_id (FK → submissions)
├── ticket_number (TEXT, UNIQUE) — TICK-001, TICK-002
├── subject (TEXT)
├── description (TEXT)
├── status (ENUM: open, in_progress, waiting, resolved, closed)
├── priority (ENUM: low, medium, high, urgent)
├── category (TEXT)
├── assigned_to (FK → profiles, nullable)
├── submitted_by_email (TEXT)
├── submitted_by_name (TEXT)
├── first_response_at (TIMESTAMPTZ)
├── resolved_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

ticket_messages
├── id (UUID, PK)
├── ticket_id (FK → tickets)
├── sender_type (ENUM: agent, customer)
├── sender_name (TEXT)
├── sender_email (TEXT)
├── message (TEXT)
├── is_internal (BOOLEAN, default false) — הערה פנימית
└── created_at (TIMESTAMPTZ)

canned_responses
├── id (UUID, PK)
├── workspace_id (FK → workspaces)
├── title (TEXT)
├── content (TEXT)
├── category (TEXT)
└── created_at (TIMESTAMPTZ)

tags
├── id (UUID, PK)
├── workspace_id (FK → workspaces)
├── name (TEXT)
└── color (TEXT, HEX)

ticket_tags
├── ticket_id (FK → tickets)
└── tag_id (FK → tags)
```

### טבלה משותפת — Notifications

```
notifications
├── id (UUID, PK)
├── user_id (FK → profiles)
├── type (TEXT) — new_submission, detractor_alert, ticket_assigned, etc.
├── title (TEXT)
├── message (TEXT)
├── link (TEXT) — URL פנימי לנווט אליו
├── read (BOOLEAN, default false)
└── created_at (TIMESTAMPTZ)
```

### Row Level Security (RLS) — כללים

כל הטבלאות מוגנות ב-RLS. הכללים העיקריים:

- **profiles:** משתמש רואה רק את הפרופיל שלו עצמו.
- **workspaces / workspace_members:** משתמש רואה רק workspaces שהוא חבר בהם.
- **forms:** משתמש רואה רק טפסים ב-workspaces שהוא חבר בהם.
- **submissions:** חברי workspace רואים את כל התשובות. הדף הציבורי כותב תשובות דרך service role.
- **waitlist_entries / feedback_responses / tickets:** אותה לוגיקה כמו submissions — חברי workspace רואים הכל.
- **ticket_messages:** סוכנים רואים הכל כולל הערות פנימיות. לקוחות רואים רק הודעות שאינן internal.

---

## חלק 4: המודל העסקי

### תמחור

| | Free | Pro — $29/חודש | Growth — $59/חודש | Business — $99/חודש |
|---|---|---|---|---|
| **Standard Forms** | 3 | ללא הגבלה | ללא הגבלה | ללא הגבלה |
| **Waitlist Mode** | 1 | 3 | ללא הגבלה | ללא הגבלה |
| **Feedback Mode** | — | 3 סקרים | ללא הגבלה | ללא הגבלה |
| **Support Mode** | — | — | תיבה 1 | ללא הגבלה |
| **תשובות/חודש** | 100 | 5,000 | 25,000 | ללא הגבלה |
| **חברי צוות** | 1 | 3 | 10 | ללא הגבלה |
| **מיתוג** | לוגו FormForge | מותאם אישית | מותאם אישית | White-label |
| **Referral Engine** | — | כן | כן | כן |
| **NPS Analytics** | — | בסיסי | מתקדם | מתקדם + AI |
| **Kanban Board** | — | — | כן | כן |
| **SLA Timer** | — | — | כן | כן |
| **API Access** | — | — | כן | כן |
| **Webhooks** | — | — | כן | כן |
| **A/B Testing** | — | — | כן | כן |
| **SSO** | — | — | — | כן |
| **Workflow Automation** | — | — | — | כן |
| **AI Features** | — | — | — | כן |

### נקודות המרה (Conversion Triggers)

כל tier מוגבל בנקודה שמכריחה שדרוג כשהלקוח מצליח:

- **Free → Pro:** 100 תשובות/חודש נגמרות מהר. ברגע שטופס או waitlist תופסים, הלקוח חייב לשדרג. גם Feedback Mode דורש Pro.
- **Pro → Growth:** 5,000 תשובות ו-3 waitlists מספיקים לשלב מוקדם. כשהלקוח גדל וצריך support mode, API, או webhooks — הוא עובר ל-Growth.
- **Growth → Business:** צוותים גדולים שצריכים SSO, workflow automation, white-label, ואינטגרציות מתקדמות.

### מודל הכנסות

**הנחות בסיסיות:**

| מדד | שנה 1 | שנה 2 | שנה 3 |
|------|--------|--------|--------|
| משתמשים רשומים | 5,000 | 25,000 | 100,000 |
| שיעור המרה ל-Pro | 3% | 4% | 5% |
| שיעור המרה ל-Growth | 0.5% | 1% | 1.5% |
| שיעור המרה ל-Business | — | 0.2% | 0.3% |
| MRR (הכנסה חודשית חוזרת) | $4,600 | $36,500 | $195,000 |
| ARR (הכנסה שנתית חוזרת) | $55,200 | $438,000 | $2,340,000 |

**חישוב MRR שנה 1:**
- 150 לקוחות Pro × $29 = $4,350
- 25 לקוחות Growth × $59 = $1,475
- **סה"כ MRR בסוף שנה 1: ~$5,825**

**חישוב MRR שנה 3:**
- 5,000 Pro × $29 = $145,000
- 1,500 Growth × $59 = $88,500
- 300 Business × $99 = $29,700
- **סה"כ MRR בסוף שנה 3: ~$263,200**

### ערוצי רכישה (Go-to-Market)

**ערוץ ויראלי מובנה:** כל waitlist שנבנה ב-FormForge מציג "Powered by FormForge" (בתוכנית Free). אלפי אנשים רואים את המותג בכל waitlist מצליח. זה ערוץ רכישה בעלות אפס.

**Content Marketing:** מדריכים על "How to launch a product", "Best NPS practices", "Customer support for startups". תוכן שמושך את קהל היעד בדיוק.

**Product Hunt / Indie Hackers:** השקת המוצר בקהילות שבהן קהל היעד חי. waitlist mode הוא הוק מושלם — "build your waitlist in 5 minutes."

**Template Marketplace (שנה 2+):** תבניות מוכנות לטפסים לפי תעשייה. כל תבנית היא SEO landing page שמביאה תנועה אורגנית.

**API Partnerships (שנה 2+):** אינטגרציות עם Zapier, Make, Mailchimp, Slack. כל אינטגרציה פותחת ערוץ הפניות חדש.

### יתרון תחרותי — Moat

**Network Effect דרך Modes:** כל mode שלקוח מפעיל מגביר stickiness. לקוח שמשתמש ב-3 modes חייב להעביר 3 מערכות אם הוא רוצה לעזוב. זה moat אמיתי.

**Data Advantage:** כל הנתונים — leads מה-waitlist, פידבק מלקוחות, טיקטים מתמיכה — נמצאים באותו מקום. עם הזמן, AI יוכל לחבר ביניהם: "הלקוח שנתן NPS 3 גם פתח 5 טיקטים החודש — הוא בסיכון נטישה גבוה." אף מתחרה אחר לא יוכל לעשות את החיבור הזה.

**Bottom-up Adoption:** Free tier נדיב מאפשר לאלפי משתמשים להתחיל. הם מביאים את FormForge לארגון שלהם (bottom-up), מה שמוביל לשדרוג ל-Team/Business.

---

## חלק 5: תוכנית פיתוח — Lovable Prompts

### שלב 1: Core FormForge (שבועות 1-2)

**למה מתחילים פה:** זה הבסיס שכל שאר ה-modes בנויים עליו. בלי form engine עובד, אין מוצר.

#### Prompt 1.1 — Foundation & Auth

```
Create a SaaS app called "FormForge" — a platform for building forms,
waitlists, feedback surveys, and support inboxes.

Set up Supabase with these tables:
- profiles (id UUID PK, email TEXT UNIQUE, full_name TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ)
- workspaces (id UUID PK, owner_id FK→profiles, name TEXT,
  slug TEXT UNIQUE, created_at TIMESTAMPTZ)
- workspace_members (workspace_id FK, user_id FK, role ENUM['owner',
  'editor','viewer'], UNIQUE(workspace_id, user_id))
- forms (id UUID PK, workspace_id FK, created_by FK, title TEXT,
  description TEXT, mode ENUM['standard','waitlist','feedback','support'],
  status ENUM['draft','active','closed'], fields JSONB, settings JSONB,
  branding JSONB, submission_count INTEGER default 0, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ)
- submissions (id UUID PK, form_id FK, data JSONB,
  submitted_by_email TEXT, submitted_by_name TEXT, metadata JSONB,
  status TEXT, submitted_at TIMESTAMPTZ)
- notifications (id UUID PK, user_id FK, type TEXT, title TEXT,
  message TEXT, link TEXT, read BOOLEAN default false,
  created_at TIMESTAMPTZ)

Enable Row Level Security on all tables — users can only access data
within their workspace memberships.

Set up email/password auth. After signup, auto-create a workspace and
set user as owner. Redirect to /dashboard.

Top navbar: "FormForge" logo on left, nav links (Dashboard, Forms,
Submissions), notification bell icon with unread count badge, user
avatar dropdown (Settings, Sign Out).

Use an emerald/green primary color palette with clean white card
backgrounds. Modern, minimal, productive feel.
```

**מה מתקבל:** אפליקציה עובדת עם auth, מבנה בסיס נתונים, ו-shell של הממשק.

#### Prompt 1.2 — Form Builder (Drag & Drop)

```
Build the form builder for FormForge.

/forms page:
- Grid of form cards: title, mode badge (Standard/Waitlist/Feedback/
  Support with distinct colors), status badge, submission count,
  last updated
- "Create Form" button → modal: enter title, description, and select
  mode (Standard, Waitlist, Feedback, Support) with icon and short
  description for each mode

Form builder at /forms/[id]/edit — three-panel layout:

Left sidebar — Field palette (for Standard and Support modes):
Draggable field types grouped by category:
- Basic: Text, Textarea, Number, Email, Phone
- Choice: Select dropdown, Multi-select, Radio, Checkboxes
- Other: Date, File upload, Section header, Paragraph text
For Waitlist mode: only Email and Name fields (auto-configured)
For Feedback mode: auto-include NPS 0-10 scale + optional custom questions

Center canvas:
- Drop zone where fields appear in order
- Drag to reorder fields on canvas
- Click a field to select and show its properties
- Live preview of how the form will look

Right panel — Field properties (when a field is selected):
- Label, placeholder, help text
- Required toggle
- For choice fields: editable options list
- For number: min/max
- For text: min/max length

Top bar: form title (editable inline), mode badge (read-only),
status toggle (Draft/Active), "Preview" button, "Save" button,
"Copy Share Link" button.

All changes save to forms.fields JSONB. Auto-save with "Saved"
indicator.
```

**מה מתקבל:** בונה טפסים מלא עם drag-and-drop, תכונות שדה, ו-live preview.

#### Prompt 1.3 — Public Form Page & Submissions

```
Build the public form page and submission collection for FormForge.

Public page at /f/[form-id]:
- No auth required
- Shows form title and description at top
- Renders each field based on its type: text inputs, textareas,
  number inputs, email/phone with proper input types, date pickers,
  select dropdowns, multi-select checkboxes, radio groups, file
  upload zones (Supabase Storage), section headers as dividers,
  paragraph text as descriptions
- Required fields show asterisk, validated on submit
- On submit: save data JSONB to submissions, increment
  submission_count, show "Thank you" screen with custom message
- If form is "closed": show styled "no longer accepting" message
- Fully mobile-responsive, clean centered layout

Build the /submissions page:
- Dropdown to select which form's submissions to view
- Dynamic table: columns generated from form field labels
- Each row is one submission with field values
- Click row → slide-over detail with label:value pairs
- Search across all values
- Date range filter
- "Export CSV" button with field labels as column headers
- Pagination (25 per page)

Also add a mini analytics section on each form card:
- Total submissions
- For choice fields: response distribution bar chart
- For number fields: average, min, max
```

**מה מתקבל:** דף ציבורי עובד, מערכת submissions מלאה, ו-CSV export. ה-core של FormForge שלם.

#### Prompt 1.4 — Dashboard & Workspace Settings

```
Build the main dashboard and workspace settings for FormForge.

/dashboard:
1. Welcome message with user's name
2. Summary cards: Total Forms (by mode — show icon for each),
   Total Submissions This Month, Submissions Today, Most Active
   Form (name + count)
3. Recent Submissions feed — last 10 across all forms: form name,
   respondent email, time ago. Click to open submission detail.
4. Forms overview — mini cards for each active form showing mode
   icon, title, submission count, and sparkline chart of last 7
   days submissions
5. Quick Actions: "Create Form", "View All Submissions" buttons

/settings page with tabs:
1. Workspace tab: name (editable), slug
2. Members tab: list with name, email, role badge. "Invite Member"
   button → email + role (editor/viewer). Remove button. Only
   owner can manage members.
3. Profile tab: name, email, avatar upload

Also add form-level settings (gear icon in form builder):
- General: title, description, status
- Submission Settings: custom thank-you message, redirect URL,
  limit one per email, close after X submissions
- Sharing: public link with copy, embed iframe code, QR code
- Notifications: toggle email on new submission
- "Duplicate Form" action on forms page
```

**מה מתקבל:** דשבורד, הגדרות workspace, הזמנת חברי צוות, והגדרות טופס.

**בסוף שלב 1:** יש מוצר Standard Form עובד מלא — אפשר כבר להשתמש בו, להציג, ולקבל פידבק. זה ה-foundation שכל שאר ה-modes ייבנו עליו.

---

### שלב 2: Waitlist Mode (שבועות 3-4)

**למה שלב 2:** Waitlist Mode הוא הפיצ'ר הכי "שובה עין" ויש לו מנגנון ויראלי מובנה. הוא יביא את המשתמשים הראשונים ויגרום לאנשים לדבר על המוצר. גם מבחינה טכנית הוא פשוט יחסית — בעיקר שכבת referral ודף נחיתה מעל ה-core שכבר קיים.

#### Prompt 2.1 — Waitlist Data Layer & Landing Page

```
Add Waitlist Mode to FormForge.

Create new Supabase tables:
- waitlist_entries (id UUID PK, form_id FK, submission_id FK,
  email TEXT, name TEXT, referral_code TEXT UNIQUE,
  referred_by TEXT nullable, position INTEGER, referral_count
  INTEGER default 0, status ENUM['waiting','invited','joined'],
  created_at TIMESTAMPTZ)
- waitlist_invites (id UUID PK, form_id FK, entry_id FK,
  message TEXT, invited_at TIMESTAMPTZ)

Enable RLS — workspace members see all entries.

When a form has mode='waitlist', the public page at /f/[form-id]
renders differently:

Landing page layout:
- Hero section with form title (large heading) and description
- Branding applied from form.branding JSONB: logo, primary color,
  background color/gradient
- If settings.show_count enabled: "Join X+ others" counter
- Email input (and name if settings.require_name is true)
- Prominent "Join the Waitlist" CTA button styled with primary color

After signup:
- Generate unique referral_code (8-char alphanumeric)
- Calculate position based on current entry count
- Show confirmation card: "You're #[position] on the waitlist!"
- If settings.enable_referrals: show referral URL (/f/[id]?ref=[code])
  with copy button and share buttons (Twitter, WhatsApp, Email)
- Show referral stats: position, successful referrals count

Handle referral tracking:
- When URL has ?ref=[code], store in the new entry's referred_by
- After signup, increment referrer's referral_count
- Boost referrer's position by settings.referral_boost amount

Handle duplicate emails: show "You're already on the list!" with
their current position and referral link.

If form is closed: "This waitlist is now closed" styled message.

Make it beautiful and mobile-first — this is the viral page.
```

**מה מתקבל:** דף waitlist ציבורי עם referral engine מלא.

#### Prompt 2.2 — Waitlist Admin & Analytics

```
Build the waitlist admin dashboard and management for FormForge.

When viewing a form with mode='waitlist', the form dashboard at
/forms/[id] shows waitlist-specific analytics:

1. Stats cards: Total Signups, Signups Today, Signups This Week,
   Referral Conversion Rate (referred signups / total)
2. Signup Growth chart — area chart showing cumulative signups
   over time with daily new signups overlay
3. Referral Leaderboard — top 10 referrers: name, email,
   referral count, position
4. Source Breakdown — pie chart: Direct vs Referral signups
5. Recent Signups feed — latest entries with name, email,
   position, referred by, time ago

Signup management at /forms/[id]/entries:
- Full data table: Position, Name, Email, Referrals count,
  Referred By, Status badge (waiting/invited/joined), Date
- Sortable columns, search by name/email, filter by status
- Bulk select with checkboxes
- "Invite Selected" → confirm modal → changes status to 'invited'
- "Invite Top N" → enter number, invites top N by position
- Individual actions: view detail, change status, remove
- "Export CSV" and "Export Emails Only" buttons
- Footer: "Showing X of Y total signups"

Also add waitlist-specific settings in the form builder settings:
- Require name (or email only)
- Show position to signups
- Show total count on landing page
- Enable referral system
- Referral boost amount (default 1)
```

**מה מתקבל:** דשבורד waitlist מלא עם אנליטיקס, ניהול נרשמים, והזמנות.

**בסוף שלב 2:** יש מוצר עם Standard Forms + Waitlist Mode. אפשר כבר להשיק ב-Product Hunt ולהתחיל לצבור משתמשים. ה-waitlist mode עצמו יהיה ה-growth engine — כל waitlist שנבנה ב-FormForge מפרסם את המותג.

---

### שלב 3: Feedback Mode (שבועות 5-6)

**למה שלב 3:** אחרי שלקוחות השתמשו ב-waitlist כדי להשיק, הצעד הטבעי הבא הוא לאסוף פידבק מהלקוחות שקיבלו גישה. Feedback Mode הוא upsell טבעי בציר הזמן. מבחינה טכנית הוא מוסיף שכבת אנליטיקס מעל ה-core הקיים.

#### Prompt 3.1 — Feedback Survey Builder & Collection

```
Add Feedback Mode to FormForge.

Create new Supabase tables:
- feedback_responses (id UUID PK, form_id FK, submission_id FK,
  respondent_email TEXT, respondent_name TEXT, nps_score INTEGER,
  category TEXT, sentiment ENUM['promoter','passive','detractor'],
  flagged BOOLEAN default false, submitted_at TIMESTAMPTZ)
- feedback_alerts (id UUID PK, form_id FK, response_id FK,
  alert_type ENUM['detractor','score_drop','keyword'],
  message TEXT, read BOOLEAN default false, created_at TIMESTAMPTZ)

When a form has mode='feedback', the form builder auto-configures:
- Pre-built NPS question: "How likely are you to recommend us?"
  with 0-10 button scale (color gradient red→yellow→green),
  "Not likely" and "Extremely likely" labels
- Pre-built follow-up: "What's the main reason for your score?"
  textarea
- Option to add custom questions below these

The public feedback page at /f/[form-id]:
- Clean, focused layout — one question at a time or all visible
- NPS score renders as a row of 0-10 clickable buttons
- Star ratings where configured
- Submit saves to both submissions table AND feedback_responses
  with auto-calculated sentiment (0-6=detractor, 7-8=passive,
  9-10=promoter)
- "Thank you for your feedback" confirmation

Auto-alert logic:
- When a detractor (0-6) submits, create a feedback_alert and
  a notification for the workspace owner
- The notification title: "⚠️ Detractor Alert: [name] scored [X]"
  with link to the response

Mobile-first — feedback surveys are often filled on phones.
```

**מה מתקבל:** סקר NPS עובד עם איסוף אוטומטי ומערכת התראות.

#### Prompt 3.2 — Feedback Analytics Dashboard

```
Build the feedback analytics dashboard for FormForge.

When viewing a form with mode='feedback', the form dashboard at
/forms/[id] shows feedback-specific analytics:

1. **NPS Score card** — large display of current NPS score
   (-100 to +100) with color (red/yellow/green), and change
   from previous period (arrow up/down with delta)

2. **NPS Breakdown donut chart** — Promoters (green), Passives
   (yellow), Detractors (red) with counts and percentages

3. **NPS Over Time line chart** — NPS score trend by week/month
   over last 6 months using Recharts. Toggle between weekly and
   monthly view.

4. **Response Volume bar chart** — number of responses per
   week/month, stacked by sentiment

5. **At-Risk Clients section** — list of recent detractors:
   name, email, score (red badge), their text comment, date.
   Each row has "Flag for follow-up" and "Mark as resolved"
   buttons. This is the churn-prevention feature.

6. **Recent Responses table** — last 20 responses: name, email,
   score (color-coded), sentiment badge, date. Click to see
   full response detail.

7. **Category breakdown** (if categories configured): NPS score
   per category shown as horizontal bar chart — lets users see
   which product/service/team gets best and worst scores.

Add date range filter (Last 7d, 30d, 90d, All time) that updates
all widgets.

Also add a "Feedback" tab in the main dashboard that shows
aggregated NPS across all feedback forms.
```

**מה מתקבל:** דשבורד NPS מלא עם מעקב מגמות, זיהוי לקוחות בסיכון, ופילוח.

**בסוף שלב 3:** יש מוצר עם Forms + Waitlist + Feedback. שלושה modes שמכסים את מחזור החיים מלפני ההשקה ועד מדידת שביעות רצון. המוצר כבר ייחודי — אין מתחרה שעושה את שלושתם.

---

### שלב 4: Support Mode (שבועות 7-9)

**למה שלב 4 (ואחרון):** Support Mode הוא המורכב ביותר מבחינה טכנית — הוא הפיצ'ר היחיד עם תקשורת דו-כיוונית, Kanban board, SLA timers, וניהול סוכנים. הוא דורש את הבסיס הכי חזק, ולכן הוא אחרון. גם מבחינה עסקית, הוא ה-upsell של ה-Growth tier — הלקוחות שישלמו $59/חודש ומעלה.

#### Prompt 4.1 — Ticket Submission & Public Tracking

```
Add Support Mode to FormForge.

Create new Supabase tables:
- tickets (id UUID PK, form_id FK, submission_id FK,
  ticket_number TEXT UNIQUE, subject TEXT, description TEXT,
  status ENUM['open','in_progress','waiting','resolved','closed'],
  priority ENUM['low','medium','high','urgent'], category TEXT,
  assigned_to FK→profiles nullable, submitted_by_email TEXT,
  submitted_by_name TEXT, first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ)
- ticket_messages (id UUID PK, ticket_id FK,
  sender_type ENUM['agent','customer'], sender_name TEXT,
  sender_email TEXT, message TEXT, is_internal BOOLEAN default false,
  created_at TIMESTAMPTZ)
- canned_responses (id UUID PK, workspace_id FK, title TEXT,
  content TEXT, category TEXT, created_at TIMESTAMPTZ)
- tags (id UUID PK, workspace_id FK, name TEXT, color TEXT)
- ticket_tags (ticket_id FK, tag_id FK)

When a form has mode='support', the public page at /f/[form-id]
shows a support submission form:
- Fields: Name, Email, Subject, Category dropdown (configurable
  in form settings), Priority selector (Low/Medium/High),
  Description textarea, File attachment (Supabase Storage)
- On submit: create ticket with auto-generated number (TICK-001),
  create initial ticket_message, show confirmation with ticket
  number

Ticket tracking at /track/[form-id]:
- Enter ticket number + email to look up
- Shows: subject, status step indicator
  (Open→In Progress→Waiting→Resolved), priority, category
- Message thread: agent messages (left, blue) and customer
  messages (right, gray) chronologically
- "Reply" textarea at bottom (validates email matches ticket)

Both pages mobile-responsive, no auth required.
```

**מה מתקבל:** טופס פתיחת טיקט ומעקב ציבורי — הצד של הלקוח.

#### Prompt 4.2 — Agent Kanban Board & Ticket Management

```
Build the agent ticket management interface for FormForge
Support Mode.

When viewing a form with mode='support', the form dashboard at
/forms/[id] shows a dual-view toggle (Kanban / Table):

Kanban view (default):
- Columns: Open, In Progress, Waiting on Customer, Resolved
- Each card: ticket number, subject (truncated), priority badge
  (color: urgent=red, high=orange, medium=yellow, low=gray),
  assigned agent avatar, category tag, time since created
- Drag tickets between columns to update status
- Unassigned tickets have dashed border
- Click card → opens ticket detail page

Table view:
- Columns: Ticket #, Subject, Requester, Priority, Status,
  Category, Assigned To, Created, Updated
- Sortable, clickable rows
- Bulk actions: assign, change status, change priority

Filters (both views):
- Status, Priority, Assigned to, Category, Search, Date range

Ticket detail at /forms/[id]/tickets/[ticket-id]:
Left panel (70%):
- Header: subject, ticket number, status + priority badges
- Message thread chronologically:
  Customer = left, light gray. Agent = right, blue.
  Internal notes = yellow background, "(Internal)" label
- Reply box: textarea, "Insert Canned Response" searchable
  dropdown, "Send Reply" and "Internal Note" buttons
- First agent reply sets first_response_at

Right sidebar (30%):
- Status dropdown, priority dropdown, category, assigned agent
  dropdown — all save immediately
- Requester info: name, email, ticket count
- Tags: editable chips with autocomplete, create new
- Timeline: created, assigned, first response, status changes
```

**מה מתקבל:** לוח Kanban מלא, ניהול טיקטים, thread הודעות, ו-canned responses.

#### Prompt 4.3 — Support Analytics & SLA

```
Build support analytics and SLA monitoring for FormForge.

Add to the support mode form dashboard:

1. Stats cards: Open Tickets, Unassigned Tickets, Avg First
   Response Time, Avg Resolution Time, Resolved Today

2. Ticket Volume chart — bar chart: new vs resolved per day,
   last 30 days

3. Priority Breakdown — donut of open tickets by priority

4. Agent Workload — horizontal bars showing ticket count per
   agent (open + in progress)

5. SLA Monitor:
   - Tickets open >24h without first response: yellow warning
   - Tickets open >48h without first response: red critical
   - Sorted by urgency, with "Assign & Respond" quick action

6. Category Analysis — bar chart of ticket count per category,
   helps identify product areas with most issues

7. Resolution Metrics — average resolution time trend over
   weeks, broken down by priority

Also build /canned-responses page:
- List: title, category, content preview
- "Create Response" → title, category, content textarea
  (hint: {{customer_name}}, {{ticket_number}} variables)
- Edit and delete, search and filter

Add auto-close logic: tickets with 'resolved' status for 7+
days automatically change to 'closed'.

Add a "Support" tab in the main FormForge dashboard showing
aggregated support metrics across all support forms.
```

**מה מתקבל:** אנליטיקס תמיכה, SLA monitoring, ו-canned responses.

**בסוף שלב 4:** המוצר שלם. ארבעה modes פעילים, דשבורד מאוחד, ומערכת pricing מובנית. FormForge מוכן להשקה מלאה.

---

## חלק 6: מפת דרכים ארוכת טווח

### רבעון 1-2 (חודשים 1-6): בניית ה-Foundation

- שלבים 1-4 כמפורט למעלה
- השקה ב-Product Hunt ו-Indie Hackers
- 100 משתמשים ראשונים ב-Free tier
- 10-20 לקוחות משלמים
- איסוף פידבק ותיקון באגים

### רבעון 3 (חודשים 7-9): אינטגרציות

- **Email:** חיבור ל-Mailchimp, ConvertKit, Resend — שליחת מיילים אוטומטית על submissions, invites, alerts
- **Zapier / Make:** webhook integration שמאפשר חיבור ל-5,000+ אפליקציות
- **Slack:** התראות על submissions, טיקטים, ו-detractors ישר לערוץ Slack
- **Stripe:** תשלומים בטפסים (deposits, booking fees) — פותח use cases חדשים

### רבעון 4 (חודשים 10-12): Template Marketplace

- ספריית תבניות מוכנות לפי תעשייה וסוג:
  - SaaS Waitlist Landing Page
  - Restaurant Feedback Survey
  - Clinic Patient Intake Form
  - IT Support Ticket Form
  - HR Onboarding Checklist
  - Event Registration
- כל תבנית = SEO landing page שמביאה תנועה אורגנית
- משתמשים יכולים לשתף תבניות שהם יצרו (community effect)

### שנה 2: AI Layer

- **AI Form Generator:** "תאר את הטופס שאתה צריך במשפט" → FormForge בונה אותו אוטומטית
- **AI Response Analysis:** ניתוח סנטימנט אוטומטי על תשובות טקסט, זיהוי נושאים חוזרים, סיכום תגובות
- **Smart Routing (Support):** AI שמסווג טיקטים אוטומטית לקטגוריה, עדיפות, וסוכן מתאים
- **Churn Prediction:** חיבור נתוני NPS + תמיכה — "3 טיקטים + NPS 4 = סיכון נטישה 87%"
- **AI Canned Responses:** הצעת תגובה אוטומטית לטיקטים על בסיס טיקטים דומים שנפתרו

### שנה 3: Platform & Enterprise

- **White Label:** לקוחות Enterprise מריצים FormForge תחת הדומיין והמותג שלהם
- **SSO / SAML:** חיבור לארגונים גדולים
- **API-first:** SDK שמאפשר מפתחים אחרים להטמיע את FormForge engine במוצר שלהם — הפיכה ל-infrastructure
- **Custom Domains:** yourforms.yourbrand.com
- **Workflow Builder:** If-this-then-that visual builder — "אם NPS < 5, פתח טיקט תמיכה אוטומטית ושלח התראה למנהל"
- **Multi-language:** תמיכה בשפות מרובות בטפסים (RTL כולל)

---

## חלק 7: ניתוח תחרותי

| מוצר | טפסים | Waitlist | NPS | תמיכה | מחיר מתחיל | חולשה |
|-------|--------|----------|-----|--------|-------------|--------|
| **Typeform** | ✅ | ❌ | ❌ | ❌ | $25/mo | יקר, אין modes נוספים |
| **JotForm** | ✅ | ❌ | ❌ | ❌ | $34/mo | ממשק עמוס, אין modes |
| **Google Forms** | ✅ | ❌ | ❌ | ❌ | Free | מוגבל מאוד, לא מקצועי |
| **Tally** | ✅ | ❌ | ❌ | ❌ | $29/mo | אין workflow, אין modes |
| **Waitlist API** | ❌ | ✅ | ❌ | ❌ | $15/mo | רק waitlists |
| **Delighted** | ❌ | ❌ | ✅ | ❌ | $224/mo | יקר מאוד |
| **Zendesk** | ❌ | ❌ | ❌ | ✅ | $19/agent | מורכב, אין טפסים |
| **FormForge** | ✅ | ✅ | ✅ | ✅ | **Free / $29/mo** | חדש, צריך להוכיח |

**הזדמנות:** אף מוצר לא מכסה יותר מפינה אחת. FormForge הוא היחיד שמאחד את הארבעה. לקוח שהיום משלם $25 (Typeform) + $15 (Waitlist API) + $224 (Delighted) + $19 (Zendesk) = **$283/חודש** יכול לעבור ל-FormForge Growth ב-**$59/חודש** ולקבל הכל במקום אחד.

---

## חלק 8: סיכונים ומענה

| סיכון | הסתברות | השפעה | מענה |
|--------|----------|--------|------|
| Typeform מוסיפים modes דומים | בינונית | גבוהה | להתמקד ב-speed to market ובאינטגרציה בין modes — הם יוסיפו פיצ'רים נפרדים, לא חוויה אחודה |
| לקוחות לא מבינים את ה-4 modes | בינונית | בינונית | onboarding wizard שמכוון לפי use case, לא לפי mode. "מה אתה צריך?" → "לאסוף leads לפני השקה" → Waitlist Mode |
| Support Mode מורכב מדי ל-Lovable | נמוכה | גבוהה | לבנות MVP מינימלי של support (בלי SLA, בלי automation) ולהוסיף מורכבות בהדרגה |
| Free tier יאכל את ההכנסות | נמוכה | בינונית | המגבלה של 100 submissions/חודש מספיק נמוכה. כל שימוש רציני דורש שדרוג |
| מתחרה חדש מעתיק את המודל | נמוכה | בינונית | First mover advantage + data moat (חיבור בין modes) + template marketplace = קשה לשכפל |

---

## חלק 9: מדדי הצלחה (KPIs)

### מדדי מוצר

- **Activation Rate:** % משתמשים שיצרו טופס ראשון תוך 24 שעות מהרשמה (יעד: 40%)
- **Multi-Mode Adoption:** % לקוחות משלמים שמשתמשים ב-2+ modes (יעד: 30% בשנה 1, 50% בשנה 2)
- **Submission Volume:** סה"כ submissions דרך הפלטפורמה/חודש (proxy ל-value delivered)
- **Viral Coefficient (Waitlist):** כמה נרשמים חדשים כל referral מביא בממוצע (יעד: > 1.2)

### מדדי עסקיים

- **MRR (Monthly Recurring Revenue):** יעד שנה 1: $5K+, שנה 2: $30K+, שנה 3: $150K+
- **Churn Rate:** % לקוחות משלמים שמבטלים/חודש (יעד: < 5%)
- **LTV/CAC Ratio:** יחס ערך חיי לקוח לעלות רכישה (יעד: > 3:1)
- **NRR (Net Revenue Retention):** % הכנסה שנשמרת + upsells כולל churns (יעד: > 110%)

### מדדי צמיחה

- **Free Signups/חודש:** כמה אנשים נרשמים (יעד: 500+ בסוף שנה 1)
- **Free-to-Paid Conversion:** % שמשדרגים (יעד: 3-5%)
- **"Powered by" clicks:** כמה אנשים מגיעים דרך הלוגו בדפים ציבוריים (ערוץ ויראלי)

---

## סיכום: למה FormForge הוא ההימור הנכון

1. **שוק ענק** — כל עסק, בכל גודל, בכל תעשייה, אוסף מידע מאנשים. זה שוק horizontal ללא תקרה.

2. **מודל עסקי ברור** — freemium עם נקודות המרה טבעיות. הלקוח גדל → צריך יותר → משדרג.

3. **Moat שגדל עם הזמן** — כל mode שלקוח מפעיל מעלה את ה-switching cost. נתונים משולבים בין modes יוצרים value שאף מתחרה לא יכול לשכפל.

4. **ויראליות מובנית** — Waitlist Mode הוא growth engine. כל waitlist שנבנה = פרסום חינמי.

5. **בנייה בשלבים** — כל שלב הוא מוצר עצמאי שלם. אפשר להשיק אחרי שלב 1 ולהתחיל לאסוף לקוחות עוד לפני שה-modes הנוספים מוכנים.

6. **Alignment עם הכישורים שלך** — JSONB schema, drag-and-drop, role-based auth, real-time dashboards, Supabase + Next.js — זה בדיוק ה-stack וה-patterns שאתה כבר שולט בהם מ-StarManag.

---

*מסמך זה נכתב כתוכנית פעולה מקיפה. כל prompt מותאם ל-Lovable ומיועד להדבקה ישירה. הסדר קריטי — כל שלב בנוי על הקודם.*
