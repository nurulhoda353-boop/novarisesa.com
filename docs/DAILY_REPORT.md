# NOVARISE — Daily Work Report

> Living log for the full stack roadmap.  
> **How to use:** প্রতিদিনের কাজ শেষে নতুন তারিখের সেকশন যোগ করো — Done + Tomorrow. পুরনো এন্ট্রি মুছো না।

**Project:** Public website `novarisesa.com` (+ later CMS / Management / Mobile / API)  
**Stack (public site):** Next.js 15 App Router · React 19 · Tailwind v4 · i18n (EN/AR)  
**Stack (backend — next):** FastAPI · PostgreSQL · SQLAlchemy/SQLModel · Alembic · JWT/auth  
**Repo:** https://github.com/nurulhoda353-boop/novarisesa.com  
**Live:** https://novarisesa.com · Coolify: https://coolify.novarisesa.com

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
