# NOVARISE — Daily Work Report

> Living log for the full stack roadmap.  
> **How to use:** প্রতিদিনের কাজ শেষে নতুন তারিখের সেকশন যোগ করো — Done + Tomorrow. পুরনো এন্ট্রি মুছো না।

**Project:** Public website `novarisesa.com` (+ later CMS / Management / Mobile / API)  
**Stack (public site):** Next.js 15 App Router · React 19 · Tailwind v4 · i18n (EN/AR)  
**Repo:** https://github.com/nurulhoda353-boop/novarisesa.com

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
