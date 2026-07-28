# NOVARISE — Daily Work Report

> Living log for the full stack roadmap.  
> **How to use:** প্রতিদিনের কাজ শেষে নতুন তারিখের সেকশন যোগ করো — Done + Tomorrow. পুরনো এন্ট্রি মুছো না।

**Project:** Public website `novarisesa.com` + CMS Control Center + API
**Stack (public site):** Next.js 15 App Router · React 19 · Tailwind v4 · i18n (EN/AR)  
**Stack (backend):** FastAPI · PostgreSQL · SQLAlchemy · Alembic · JWT cookie auth · RBAC
**Stack (CMS):** Next.js (`dashboard/`, port 3001) → `my.novarisesa.com`
**Repo:** https://github.com/nurulhoda353-boop/novarisesa.com  
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
