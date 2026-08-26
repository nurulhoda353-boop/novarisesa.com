# NOVARISE — Daily Work Report

> Living log for the full stack roadmap.  
> **How to use:** প্রতিদিনের কাজ শেষে নতুন তারিখের সেকশন যোগ করো — Done + Tomorrow. পুরনো এন্ট্রি মুছো না।

**Project:** Public website `novarisesa.com` + CMS Control Center + API
**Stack (public site):** Next.js 15 App Router · React 19 · Tailwind v4 · i18n (EN/AR)  
**Stack (backend):** FastAPI · PostgreSQL · SQLAlchemy · Alembic · JWT cookie auth · RBAC
**Stack (CMS):** Next.js (`dashboard/`, port 3001) → `my.novarisesa.com`
**Repo:** https://github.com/nurulhoda353-boop/novarisesa.com  

## Live Operating Protocol (from 2026-08-13)

All future website, dashboard, API, schema, content, build, addition, and removal work follows this live workflow:

1. Keep verification connected to the private production PostgreSQL environment through approved server/backend access. PostgreSQL remains private and is never exposed to the public internet.
2. Before deployment, validate any database migration, content/data change, and production configuration against the live service contract; preserve data and take the existing backup/recovery path into account.
3. Run relevant lint, build, test, and security checks for every affected service.
4. Immediately commit and push the completed change to `main`; Coolify deploys the public site, API, and Dashboard from that branch.
5. After every deploy, verify live health/readiness plus the affected public and dashboard routes. Record material results in this living report.

> **Permanent delivery rule (2026-08-27):** For every completed task, run the relevant local tests first. Only after they pass, commit and push to `main`, allow the production deployment to finish, then verify the affected live routes and health endpoints. Report completion to the user only after those live checks pass.

**Live:** https://novarisesa.com · Coolify: https://coolify.novarisesa.com · Email: info@novarisesa.com

---

## 2026-07-11 (শনিবার)

### Done
- লোকালে প্রজেক্ট রান ও ফুল সাইট বাগ স্ক্যান/ফিক্স (ডেড লিংক, ফর্ম `mailto`, SEO/ডোমেইন)।
- প্রোডাকশন ডোমেইন `novarisesa.com` এ আপডেট (`SITE_URL`, sitemap, robots) — ইমেইল অপরিবর্তিত।
- ফ্রেমওয়ার্ক/আর্কিটেকচার সিদ্ধান্ত ফাইনাল:
  - Public site → **Next.js**
  - CMS dashboard → TanStack Start (পরে)
  - Management software → TanStack Start (পরে)
  - Mobile → Flutter (পরে)
  - Backend → Python FastAPI + PostgreSQL (পরে)
  - Domain Cloudflare · Host Hostinger VPS (KVM 2) · Deploy GitHub → Coolify
- সাবডোমেইন ম্যাপ: `novarisesa.com` · `deshboard.novarisesa.com` · `app.novarisesa.com` · `api.novarisesa.com` · `coolify.novarisesa.com`
- TanStack Start পাবলিক সাইট → **পূর্ণাঙ্গ Next.js 15** মাইগ্রেশন (ডিজাইন/রুট/i18n অক্ষত)।
- সিনিয়র প্রোডাকশন অডিট: build/lint ক্লিন, `next/image`, `next/font`, dead UI/deps ক্লিনআপ, SEO/a11y বেসলাইন।
- GitHub রিপো তৈরি ও **initial push** (`main` → `origin/main`).
- এই লাইভ ডেইলি রিপোর্ট নোড (`docs/DAILY_REPORT.md`) তৈরি।

### Tomorrow (2026-07-12) — planned
1. Coolify এর সাথে **Cloudflare ডোমেইন** কানেক্ট করা।
2. কুলিফাইয়ের জন্য প্রফেশনাল সাবডোমেইন সেটআপ: `coolify.novarisesa.com`।
3. **GitHub → Coolify** দিয়ে পাবলিক সাইট লাইভ পাবলিশ (`novarisesa.com`)।
4. তারপর ম্যাপ/পরামর্শ অনুযায়ী বাকি রোডম্যাপ ফাইনাল করা।

### Notes
- পাবলিক সাইট ফ্রন্টএন্ড প্রোডাকশন-রেডি; ব্যাকএন্ড/CMS এখনো নেই (ফর্মগুলো আপাতত `mailto:`).
- লোকাল ডেভ: `npm run dev` (পোর্ট ৩০০০ ব্যস্ত থাকলে ৩০০১)।

---

## 2026-07-12 (রবিবার)

### Done
- Cloudflare DNS সেটআপ: `coolify` · `@` · `www` → VPS `152.239.127.8` (প্রাথমিকভাবে DNS only)।
- Coolify instance domain: `https://coolify.novarisesa.com` লাইভ।
- GitHub App (`novarisesa-coolify`) কানেক্ট + রিপো ইনস্টল।
- Coolify প্রজেক্ট তৈরি → Nixpacks → পাবলিক সাইট **লাইভ** (`https://novarisesa.com` / `www`)।
- হিরো টাইটেল `Kingdom's` গোল্ড গ্রেডিয়েন্ট `g` ক্লিপিং ফিক্স।
- মোবাইল অফ-ক্যানভাস মেনু রিডিজাইন (বাম থেকে ওপেন, আইকন, অ্যাকটিভ স্টেট, কমপ্যাক্ট ল্যাঙ্গুয়েজ, Get in Touch, RFQ)।
- ফুটার কপিরাইট সংক্ষিপ্ত: `© 2026 NOVARISE. All rights reserved.`
- পরিবর্তন GitHub `main`-এ পুশ (`7d25f67`)।
- ব্যাকএন্ড স্ট্যাক ফাইনাল: **FastAPI + PostgreSQL (+ SQLAlchemy/SQLModel, Alembic, JWT/auth)** — Django নয়।
- পেজ ট্রানজিশন লোডার রিডিজাইন: Greencare-স্টাইল মিনিমাল (লোগো breathe + গোল্ড প্রোগ্রেস বার), থিম ব্যাকগ্রাউন্ড `#F7F1E9`, স্ট্যান্ডার্ড লোগো সাইজ।

### Tomorrow / Next — planned
1. **Backend API স্caffold** — FastAPI প্রজেক্ট স্ট্রাকচার (`api.novarisesa.com` টার্গেট)।
2. **PostgreSQL** সেটআপ (লোকাল + পরে Coolify/VPS)।
3. **SQLModel/SQLAlchemy মডেল** + **Alembic** মাইগ্রেশন বেসলাইন।
4. **JWT auth** বেস (ইউজার/রোল স্কিমা — CMS/অ্যাপের জন্য প্রস্তুত)।
5. প্রথম এন্ডপয়েন্টগুলো ম্যাপ (RFQ / contact / requirements — `mailto` থেকে API-তে যাওয়ার পথ)।

### Notes
- পাবলিক ফ্রন্টএন্ড প্রোডাকশনে লাইভ; ফর্ম এখনো `mailto:` — ব্যাকএন্ড এলে API কানেক্ট হবে।
- Cloudflare Proxy/CDN পরে On করা যাবে (এখন DNS only; SSL স্থিতিশীল রাখতে)।
- `coolify` সাবডোমেইন DNS only-ই রাখবে।
- Next.js `output: "standalone"` + Nixpacks `next start` ওয়ার্নিং আছে — পরে স্টার্ট কমান্ড ক্লিনআপ করা যাবে।

---

## 2026-07-24 (শুক্রবার)

### Done
- Hostinger **Premium Business Email** সেটআপ শুরু ও ডোমেইন ভেরিফিকেশন (Cloudflare TXT)।
- Cloudflare-এ মেইল DNS সম্পূর্ণ:
  - MX: `mx1.hostinger.com` (5), `mx2.hostinger.com` (10)
  - SPF: `v=spf1 include:_spf.mail.hostinger.com ~all`
  - DKIM: `hostingermail-a/b/c._domainkey` → Hostinger CNAME
  - DMARC: `_dmarc` (p=none)
- মেইলবক্স তৈরি ও অ্যাক্টিভ: **`info@novarisesa.com`** (IMAP/POP3/SMTP চালু)।
- Webmail যাচাই: Hostinger Mail ইনবক্স ওপেন।
- মোবাইল **Gmail অ্যাপ** কানেক্ট গাইড (IMAP `imap.hostinger.com:993` / SMTP `smtp.hostinger.com:465`)।

### Tomorrow / Next — planned
1. **Backend API স্caffold** — FastAPI প্রজেক্ট স্ট্রাকচার (`api.novarisesa.com` টার্গেট)।
2. **PostgreSQL** সেটআপ (লোকাল + পরে Coolify/VPS)।
3. **SQLModel/SQLAlchemy মডেল** + **Alembic** মাইগ্রেশন বেসলাইন।
4. **JWT auth** বেস (ইউজার/রোল স্কিমা — CMS/অ্যাপের জন্য প্রস্তুত)।
5. সাইট ফর্ম/`mailto:` থেকে `info@novarisesa.com` / API পাথে মাইগ্রেশন প্ল্যান।

### Notes
- বিজনেস মেইল লাইভ; পাবলিক সাইট ফর্ম এখনো `mailto:` হতে পারে — পরে আপডেট।
- Cloudflare/Hostinger API টোকেন চ্যাটে ব্যবহৃত হলে revoke করা উচিত।
- পরবর্তী বড় মাইলস্টোন: FastAPI + PostgreSQL ব্যাকএন্ড।

---

## 2026-07-28 (মঙ্গলবার)

### Done
- ব্যাকএন্ড ঘাটতি বন্ধ: **RBAC permission enforcement** (`require_permission`) সব CMS রাউটে।
- Media upload/storage API + `/media` static serve + CMS Media library UI।
- Navigation, categories/tags CRUD API + dashboard UI; public `site-content`-এ navigation।
- Users invite / role change / enable-disable; seeded `editor` role।
- Workspace search (⌘K), inbox notification badge, guided content editor (EN/AR locale)।
- `backend/.env.example` media settings; docs (`BACKEND_DATABASE.md`, এই রিপোর্ট) আপডেট।

### Tomorrow (2026-07-29) — planned
1. Postgres + bootstrap দিয়ে লোকাল API/CMS এন্ড-টু-এন্ড যাচাই।
2. Coolify-তে media volume / production `MEDIA_PUBLIC_BASE_URL` সেট।
3. Optional: S3 media backend ও richer content editor।

### Notes
- লোকাল রান: `backend/.env` কপি করে Postgres URL সেট → `alembic upgrade head` → `python -m app.bootstrap` → uvicorn; dashboard `npm run dev` (3001)।
- Production-এ admin পাসওয়ার্ড `INITIAL_ADMIN_*` দিয়ে বুটস্ট্র্যাপের পর ঘোরানো উচিত।

---

## 2026-08-03 (সোমবার)

### Done
- CMS dashboard-এর **Site content** পেজের UI/UX first pass সম্পন্ন।
- Site content editor-কে **Mini website editor** experience-এ রিডিজাইন:
  - বামে Website map / page-by-page navigation।
  - মাঝখানে public site-এর mini preview/feed feel।
  - প্রতিটি section card-কে পুরনো Facebook post edit করার মতো সহজ mental model।
  - ডানে composer-style edit panel, যেখানে selected section-এর text ও image change করা যায়।
  - Image replace/default/media select workflow আগের API রেখেই friendly করা হয়েছে।
- Dashboard lint এবং production build pass।
- GitHub `main` branch-এ push করা হয়েছে: `90deea8 feat: redesign site content editor experience`।
- **Live-iframe preview editor** বানানো হয়েছে: dashboard-এর `/site-content`-এ পাবলিক সাইট সরাসরি iframe-এ embed (CSP `frame-ancestors`, `PreviewBridge`, postMessage bridge), সেকশনে ক্লিক করলে পাশে real fields-সহ edit panel খোলে — আগের JSON-flatten heuristic কার্ড বাদ দিয়ে।
- লোকাল ডেভ এনভায়রনমেন্ট পুরোপুরি সেটআপ: লোকাল Postgres (`novarise` role/db), backend migration + bootstrap, admin user তৈরি (`admin@novarisesa.com`), backend (`:8000`) + public site (`:3000`) + dashboard (`:3001`) — তিনটাই একসাথে চালিয়ে যাচাই করা হয়েছে।
- ইউজারের অনুরোধে **পুরো ইনলাইন "Pen mode" WYSIWYG এডিটর** বানানো হয়েছে (Illustrator/Webflow-স্টাইল): পেন আইকনে ক্লিক করলে সাইটের যেকোনো টেক্সটে সরাসরি ক্লিক করে টাইপ করা যায়, ইমেজে ক্লিক করলে popover-এ upload/paste URL/remove অপশন আসে — সাইড প্যানেল/ড্রপডাউন ছাড়াই।
- **সব ১০টা পাবলিক পেজ** (Home, About, Services, Capabilities, Careers, Requirements, Contact, RFQ, Insights/Blog, Projects) pen-mode এ instrument করা হয়েছে — হেডার/ফুটার/CTA সহ প্রতিটা হেডিং, প্যারাগ্রাফ, বাটন, ফর্ম লেবেল এখন সরাসরি ক্লিক-করে-এডিট।
- Hero, Numbers, HSE, Vision2030, About stats, CompanyProfile, Services Trust — এই ৭ জায়গার আগে হার্ডকোড করা সংখ্যাগুলো (workforce count, turnover, KPI % ইত্যাদি) translation JSON-এ এনে pen-mode এ editable করা হয়েছে।
- একটা bug ফিক্স করা হয়েছে: Hero সেকশনে `data-cms-field` framer-motion এনিমেটেড এলিমেন্টের উপর সরাসরি বসানো থাকায় pen mode চালু হলে পুরো সেকশন ফিকে/অদৃশ্য হয়ে যাচ্ছিল — plain inner span-এ সরিয়ে ও edit mode-এ entrance animation skip করে ঠিক করা হয়েছে।
- **সচেতনভাবে বাদ রাখা হয়েছে**: Services/Projects/Requirements/Insights-এর প্রতিটা কালেকশন-আইটেম (individual service card, project card, job posting, blog post) — এগুলো আলাদা ডাটাবেস টেবিল থেকে আসে, pen-mode দিয়ে এডিটেবল না করে আগের dedicated collection editor-এই রাখা হয়েছে যাতে ভুলভাবে ডেটা নষ্ট না হয়।
- পুরনো side-panel/page-rail editor **মুছে ফেলা হয়নি** — pen mode বন্ধ থাকলে এখনো কাজ করে, fallback হিসেবে থাকছে।
- **Site content পেজ মিনিমাল রিডিজাইন** (ইউজারের রেফারেন্স স্ক্রিনশট অনুযায়ী): পুরনো ৩-কলাম লে-আউট (page rail + section dropdown panel) সম্পূর্ণ সরিয়ে শুধু ফুল-উইথ লাইভ প্রিভিউ রাখা হয়েছে; পেন আইকন + Save & publish এখন ড্যাশবোর্ডের persistent টপবারে (নতুন `topbarActions` স্লট প্যাটার্নে), আলাদা পেজ-লেভেল টুলবার বাদ। ভাষা টগলও বাদ — এডিটর লোকেল এখন সাইটের নিজস্ব EN/AR সুইচ থেকে postMessage দিয়ে auto-sync হয়।
- কয়েকটা বাস্তব বাগ ফিক্স হয়েছে রিয়েল-ব্রাউজার টেস্টিং দিয়ে: framer-motion + contentEditable কনফ্লিক্ট (Reveal/SectionReveal/StaggerGroup/Header/EventsSection জুড়ে), CSS specificity override দিয়ে Hero background ভাঙা, stale DB schema দিয়ে raw translation key দেখানো, নতুন topbar-actions effect-এ unstabilized callback দিয়ে infinite re-render loop, এবং পুরনো `PreviewBridge` (section-click-to-panel ফ্লো) সাইটের নেভিগেশন ক্লিক silently ব্লক করছিল — সেটা সম্পূর্ণ মুছে ফেলা হয়েছে।
- **প্রোডাকশনে লাইভ ডিপ্লয় সম্পন্ন**: Coolify API দিয়ে যাচাই করা হয়েছে যে `novarisesa` প্রজেক্টে তিনটা অ্যাপই (public site, `novarise-api`, `novarise-control-center`) আগে থেকেই লাইভ ছিল এবং একটা প্রাইভেট Postgres (`novarise-postgres`, daily backup সহ) কানেক্টেড। আজকের সব কাজ (commit `11aec18`) GitHub `main`-এ push করে Coolify দিয়ে তিনটা অ্যাপ redeploy করা হয়েছে — সব `finished` + `healthy`।
- Production env vars যাচাই: `NEXT_PUBLIC_API_URL` (site + dashboard) সঠিকভাবে সেট করা আছে; `NEXT_PUBLIC_DASHBOARD_ORIGIN` (site) ও `NEXT_PUBLIC_SITE_URL` (dashboard) কোথাও এক্সপ্লিসিটলি সেট নেই কিন্তু কোডে যে fallback ডিফল্ট আছে (`https://my.novarisesa.com` / `https://novarisesa.com`) সেটাই প্রোডাকশনের আসল ভ্যালুর সাথে মিলে যায়, তাই কাজ করছে — যাচাই করা হয়েছে `novarisesa.com`-এর response header-এ সঠিক `Content-Security-Policy: frame-ancestors 'self' https://my.novarisesa.com` এসেছে।
- Production `site_settings` টেবিল সম্পূর্ণ খালি পাওয়া গেছে (`/public/site-content` দিয়ে চেক করা) — মানে CMS দিয়ে এখনো কিছু সেভ করা হয়নি, তাই লোকালে যে stale-schema বাগ পাওয়া গিয়েছিল (পুরনো flat-string ডেটা নতুন nested schema-কে override করা) সেটার ঝুঁকি প্রোডাকশনে নেই।
- Backend deploy কমান্ড (`alembic upgrade head && python -m app.bootstrap && uvicorn ...`) নিশ্চিত করে migration + bootstrap প্রতি ডিপ্লয়ে চলে; `bootstrap()` idempotent (admin already থাকলে password ওভাররাইট করে না), তাই বারবার redeploy করা নিরাপদ।
- Production health check তিনটাই পাস: `novarisesa.com/api/health`, `api.novarisesa.com/api/v1/health`, `my.novarisesa.com/api/health` — সব `{"status":"ok"}`।

### Tomorrow / Next — planned
1. ব্রাউজারে সরাসরি লগইন করে `my.novarisesa.com/site-content`-এ পেন মোড + Save & publish শেষবারের মতো ক্লিক-থ্রু যাচাই করা (curl দিয়ে client-side JS/postMessage behavior verify করা যায় না — এটা রিয়েল ব্রাউজার টেস্টেই ধরা পড়ে, লোকাল সেশনে যেমন হয়েছিল)।
2. Phase 2 (ভবিষ্যতের কাজ): পুরনো side-panel/rail UI ইতিমধ্যে সরানো হয়েছে (আজকের মিনিমাল রিডিজাইনে), তাই এই আইটেমটা সম্পন্ন।
3. `INITIAL_ADMIN_PASSWORD`/Coolify-স্টোরড টোকেনগুলো (Coolify, Cloudflare, GitHub) নিরাপদ জায়গায় সংরক্ষণ ও প্রয়োজনে rotate করার কথা বিবেচনা করা যেতে পারে (লোকাল প্লেইনটেক্সট ফাইলে আছে, gitignored — repo-তে leak হয়নি, যাচাই করা হয়েছে)।

### Notes
- আজকের কাজ শুধু UI/UX না — dashboard আর পাবলিক সাইটের মধ্যে real-time editing architecture (postMessage bridge) সম্পূর্ণ তৈরি হয়েছে, backend contract অপরিবর্তিত (শুধু existing `/cms/settings`, `/cms/media` reuse করা হয়েছে)।
- লোকাল টেস্ট লগইন: `admin@novarisesa.com` / `ChangeMeNow!123` (`backend/.env`-এ সেট)। প্রোডাকশন admin আলাদা (`nurulhoda353@gmail.com`, Coolify env-এ সেট)।
- সাইট, API, ড্যাশবোর্ড, ডাটাবেস — সবকিছু এখন প্রোডাকশনে লাইভ এবং আজকের সব কাজসহ আপডেটেড।

---

## 2026-08-07 (শুক্রবার)

### Done
- পাবলিক সাইট **Site content (Pen mode)** — ইউজার সন্তুষ্ট; স্ট্যাটিক পেজ কপি/ইমেজ এডিটিং প্রোডাকশন-রেডি।
- **ডেইলি ম্যানেজমেন্ট মডিউল** প্রোডাকশন রেডিনেস অডিট সম্পন্ন (Services, Projects, Requirements, Events, Blog, FAQ, Contact) — কোডবেস + API + ড্যাশবোর্ড + পাবলিক ইন্টিগ্রেশন ফুল স্ক্যান।
- বর্তমান স্কোর: **সামগ্রিক ~74%** · **নন-কোডার এডমিন ফ্রেন্ডলিনেস ~69%** · **পাবলিক কন্টেন্ট ফ্লো ~88%**।
- মডিউল স্ট্যাটাস: Requirements ✅ (~90%) · Services/Projects ⚠️ প্রায় (~82–84%) · Blog ⚠️ আংশিক (~78%) · Events/FAQ/Contact Inbox ❌ গ্যাপ (~45–72%)।

### Tomorrow (2026-08-08) — planned

**লক্ষ্য:** ডেইলি ম্যানেজমেন্ট মডিউলগুলো নন-কোডার এডমিনের জন্য প্রোডাকশন-রেডি করা (~90%+ স্কোর)।

#### 🔴 P1 — ব্লকার (আগে করতে হবে)

1. **FAQ — dedicated admin মডিউল**
   - Backend: `faq_items` (বা সমতুল্য) টেবিল + CRUD API + EN/AR translation।
   - Dashboard: `/content/faq` — list, add, edit, reorder, publish/archive।
   - Public: site-wide FAQ (`Home`, `Services`, `Contact`, `RFQ`) CMS থেকে লোড; pen-mode/i18n JSON fallback রাখা।
   - Project FAQ-ও একই প্যাটার্নে এডিটেবল করা (বা Projects মোডালে Q&A সেকশন)।

2. **Contact Inbox — সম্পূর্ণ ওয়ার্কফ্লো**
   - `GET /cms/inbox/{inbox}/{id}` detail endpoint।
   - Inbox list-এ ক্লিক করলে **detail modal** — full `message`, `subject`, সব ফিল্ড।
   - `internal_notes` UI (API আছে, UI নেই)।
   - Summary logic ঠিক করা — `message` সবসময় দেখা যাবে (`cms.py` subject-priority ফিক্স)।
   - RFQ ও Applications inbox-এও একই detail pattern।

#### 🟠 P2 — গুরুত্বপূর্ণ

3. **Events**
   - Dashboard "View live" লিংক `/careers` → `/blog#events` ফিক্স।
   - (ঐচ্ছিক) `/events/[slug]` detail page বা blog-এর events সেকশনে আরও context।
   - Event registration CTA পরিষ্কার করা (contact vs dedicated form)।

4. **Blog (Insights)**
   - Sidebar-এ **Taxonomy** (`/taxonomy`) যোগ — categories & tags।
   - Post editor-এ hardcoded category dropdown → taxonomy API-তে connect (`category_id`)।
   - Homepage `News.tsx` CMS posts-এর সাথে wire করা।
   - Category filter + (ঐচ্ছিক) pagination / load more।

#### 🟡 P3 — এডমিন UX polish

5. **Services & Projects**
   - Lucide icon name dropdown → **visual icon picker** (বা slug থেকে auto-map, এডমিনে লুকানো)।
   - Slug / sort order / SEO meta — **Advanced** সেকশনে লুকানো; title থেকে auto-slug।
   - Projects: `started_on` / `completed_on` date fields UI।
   - Services overview-এ CMS `icon` field ব্যবহার (static map fallback)।

6. **Requirements**
   - `opens_at` / `closes_at` date fields UI (মডেলে আছে, ফর্মে নেই)।

7. **Rich text (ঐচ্ছিক — সময় থাকলে)**
   - Blog post body + Service intro-তে WYSIWYG বা উন্নত paragraph editor।
   - না হলে বর্তমান paragraph-list UX-এ helper text যোগ।

#### 🟢 P4 — SEO & ছোট ফিক্স

8. **Detail page SEO**
   - `app/services/[slug]`, `app/projects/[slug]`, `app/blog/[slug]` — CMS `meta_title` / `meta_description` ব্যবহার।

9. **Contact info এক জায়গা থেকে**
   - `ContactInfo.tsx`, `FAQ.tsx`-এ hardcoded phone/email → CMS settings বা i18n single source।

10. **Settings page**
    - Raw JSON editor **super-admin only** বা লুকানো; সাধারণ এডমিন শুধু Pen mode + collection forms দেখবে।

#### ✅ শেষে — যাচাই ও ডিপ্লয়

11. লোকাল এন্ড-টু-এন্ড টেস্ট: প্রতিটা মডিউলে create → publish → পাবলিক সাইটে verify।
12. নন-কোডার চোখে রিভিউ — কোথাও JSON/slug/icon name দেখা যায় কিনা।
13. `main` push → Coolify redeploy (site + API + dashboard) → production smoke test।

### Notes
- পাবলিক সাইট স্ট্যাটিক কন্টেন্ট Pen mode দিয়ে এডিট — আজকের অডিটে এটা **বাদ** (ইউজার সন্তুষ্ট)।
- আগামীকালের ফোকাস শুধু **collection management** + **inbox** + **এডমিন UX gaps**।
- P1+P2 শেষ হলে স্কোর ~85–90%; P3+P4 সহ ~92%+ achievable ইনশাআল্লাহ।
- রেফারেন্স ফাইল: `dashboard/components/Dashboard.tsx`, `backend/app/api/routes/cms.py`, `backend/app/models.py`, `src/lib/cms-content.tsx`।

---

## 2026-08-08 (শনিবার)

### Done
- **P1 — Contact Inbox সম্পূর্ণ ওয়ার্কফ্লো**
  - `GET /cms/inbox/{inbox}/{id}` detail endpoint (contact, RFQ, applications)।
  - Summary logic ফিক্স — contact-এ `message` আগে, তারপর `subject`।
  - Dashboard inbox: ক্লিক করলে detail modal, full message/scope, status + internal notes save।
- **P1 — FAQ dedicated admin**
  - Backend: `faq_items` + `faq_item_translations` মডেল + Alembic migration (`20260808_0001`)।
  - CMS CRUD: `/content/faq` — question/answer, EN/AR, sort order, publish/archive।
  - Public: `collections.faq` → site-wide `FAQ.tsx` (i18n fallback রাখা)।
- **P1 — Project FAQ**
  - Projects modal-এ Questions & answers সেকশন।
  - Project detail page CMS `body.faqs` থেকে লোড।
- **P2 — Blog**
  - Sidebar-এ **Categories & tags** (`/taxonomy`) যোগ।
  - Post editor → taxonomy API (`category_id`) connect।
  - Homepage `News.tsx` CMS posts থেকে লোড।
  - `BlogGrid` dynamic categories + load more pagination।
- **P2 — Events** "View live" লিংক `/blog#events` ফিক্স।
- **P3 — Admin UX polish**
  - Services icon **visual picker** (grid)।
  - Slug / SEO meta → **Advanced options** collapsible সেকশনে লুকানো।
  - Projects: `started_on` / `completed_on` date fields।
  - Requirements: `opens_at` / `closes_at` datetime fields।
  - Services overview CMS `icon` field ব্যবহার।
- **P4 — SEO & cleanup**
  - Detail page CMS meta: services, projects, blog posts (`cms-detail-metadata.ts`)।
  - Contact phone/email → `site.ts` constants (FAQ + ContactInfo)।
  - Settings JSON editor শুধু **owner** role-এর জন্য।
- Backend tests **14/14 passed** · public site + dashboard **build pass**।
- **Production deploy:** commit `90e8f67` → GitHub `main` push → Coolify auto-redeploy।
- Production health: `api.novarisesa.com`, `my.novarisesa.com`, `novarisesa.com` — সব `ok`।
- Production API `collections.faq` key live (migration `20260808_0001` applied on deploy)।

### Tomorrow / Next — planned
1. Browser smoke test: FAQ admin, inbox detail, blog categories, News section।
2. Production-এ প্রথম FAQ items + blog categories seed করা (dashboard থেকে)।
3. Optional: Rich text editor (WYSIWYG) ভবিষ্যত sprint-এ।

### Notes
- Commit: `90e8f67 feat: complete CMS production readiness for daily management modules`
- প্রোডাকশন রেডিনেস: **~90–92%** ✅

---

## Template (পরের দিন কপি করে ব্যবহার করো)

```markdown
## YYYY-MM-DD (বার)

### Done
- 

### Tomorrow (YYYY-MM-DD) — planned
1. 

### Notes
- 
```
