"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "bn" | "ar";
export type Theme = "light" | "dark";

type Dict = Record<string, string>;

const EN: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.records": "Muqeem Records",
  "nav.entry": "Entry Muqeem",
  "nav.archive": "Archive",
  "nav.import": "Import / Export",
  "nav.search": "Search or jump to…",
  "brand.title": "Muqeem Control",
  "common.signout": "Sign out",
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.save": "Save",
  "common.view": "View",
  "common.edit": "Edit",
  "common.download": "Download PDF",
  "common.print": "Print",
  "common.archive": "Archive",
  "common.restore": "Restore",
  "common.delete": "Delete forever",
  "common.all": "All",
  "common.records": "records",
  "common.none": "No data yet",
  "dash.eyebrow": "Overview",
  "dash.title": "Dashboard",
  "dash.welcome": "Welcome back",
  "dash.new": "New entry",
  "dash.total": "Total residents",
  "dash.valid": "Valid status",
  "dash.notvalid": "Other status",
  "dash.month": "Added this month",
  "dash.week": "Added last 7 days",
  "dash.employers": "Employers",
  "dash.archived": "In archive",
  "dash.monthly": "Entries per month",
  "dash.nationality": "By nationality",
  "dash.occupation": "By occupation",
  "dash.status": "By status",
  "dash.recent": "Latest entries",
  "dash.viewall": "View all",
  "list.eyebrow": "Muqeem Control",
  "list.title": "Muqeem Records",
  "list.search": "Search name, iqama, passport or employer",
  "list.nationality": "Nationality",
  "list.occupation": "Occupation",
  "list.status": "Status",
  "list.employer": "Employer",
  "list.gender": "Gender",
  "list.clear": "Clear filters",
  "list.selected": "selected",
  "list.pdfzip": "PDFs (ZIP)",
  "list.printbatch": "Print batch",
  "list.csv": "CSV",
  "list.xlsx": "Excel",
  "list.active": "Active",
  "list.archived": "Archived",
  "list.empty": "No Muqeem records yet",
  "list.emptyHint": "Use Entry Muqeem to add the first resident report.",
  "list.noMatch": "No matching records",
  "list.noMatchHint": "Try a different search or clear the filters.",
  "col.iqama": "Iqama No.",
  "col.name": "Name",
  "col.nationality": "Nationality",
  "col.occupation": "Occupation",
  "col.expiry": "Iqama Expiry",
  "col.status": "Status",
  "col.employer": "Employer",
  "detail.back": "All records",
  "detail.qr": "QR verification",
  "detail.history": "Change history",
  "detail.historyEmpty": "No history yet",
  "detail.archivedBanner": "This record is archived and hidden from the main list.",
  "import.title": "Import & export",
  "import.eyebrow": "Bulk tools",
  "import.template": "Download blank template",
  "import.pick": "Choose an Excel (.xlsx) or CSV file",
  "import.hint": "First row must hold the column names from the template. Dates use Hijri text like 1448-05-25. Rows already in the system (same iqama + version) are skipped.",
  "import.run": "Import rows",
  "import.done": "Import finished",
  "import.exportAll": "Export everything",
  "import.adminOnly": "Importing needs the Muqeem admin permission.",
  "palette.placeholder": "Type a name, iqama number, or a page…",
  "palette.pages": "Pages",
  "palette.records": "Records",
  "palette.empty": "Nothing found",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "verify.title": "Report verification",
  "verify.ok": "Authentic NOVARISE Muqeem report",
  "verify.bad": "This report could not be verified",
  "verify.archived": "This record has been archived and is no longer current.",
};

const BN: Dict = {
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.records": "মুকিম রেকর্ড",
  "nav.entry": "নতুন এন্ট্রি",
  "nav.archive": "আর্কাইভ",
  "nav.import": "ইমপোর্ট / এক্সপোর্ট",
  "nav.search": "খুঁজুন বা যান…",
  "brand.title": "মুকিম কন্ট্রোল",
  "common.signout": "সাইন আউট",
  "common.loading": "লোড হচ্ছে…",
  "common.cancel": "বাতিল",
  "common.close": "বন্ধ",
  "common.save": "সংরক্ষণ",
  "common.view": "দেখুন",
  "common.edit": "সম্পাদনা",
  "common.download": "PDF ডাউনলোড",
  "common.print": "প্রিন্ট",
  "common.archive": "আর্কাইভ",
  "common.restore": "ফিরিয়ে আনুন",
  "common.delete": "চিরতরে মুছুন",
  "common.all": "সব",
  "common.records": "রেকর্ড",
  "common.none": "এখনো কোনো তথ্য নেই",
  "dash.eyebrow": "সংক্ষিপ্ত চিত্র",
  "dash.title": "ড্যাশবোর্ড",
  "dash.welcome": "স্বাগতম",
  "dash.new": "নতুন এন্ট্রি",
  "dash.total": "মোট বাসিন্দা",
  "dash.valid": "বৈধ স্ট্যাটাস",
  "dash.notvalid": "অন্যান্য স্ট্যাটাস",
  "dash.month": "এই মাসে যোগ হয়েছে",
  "dash.week": "গত ৭ দিনে যোগ হয়েছে",
  "dash.employers": "নিয়োগকর্তা",
  "dash.archived": "আর্কাইভে",
  "dash.monthly": "মাসওয়ারি এন্ট্রি",
  "dash.nationality": "জাতীয়তা অনুযায়ী",
  "dash.occupation": "পেশা অনুযায়ী",
  "dash.status": "স্ট্যাটাস অনুযায়ী",
  "dash.recent": "সাম্প্রতিক এন্ট্রি",
  "dash.viewall": "সব দেখুন",
  "list.eyebrow": "মুকিম কন্ট্রোল",
  "list.title": "মুকিম রেকর্ড",
  "list.search": "নাম, ইকামা, পাসপোর্ট বা নিয়োগকর্তা খুঁজুন",
  "list.nationality": "জাতীয়তা",
  "list.occupation": "পেশা",
  "list.status": "স্ট্যাটাস",
  "list.employer": "নিয়োগকর্তা",
  "list.gender": "লিঙ্গ",
  "list.clear": "ফিল্টার মুছুন",
  "list.selected": "টি বাছাই করা",
  "list.pdfzip": "PDF (ZIP)",
  "list.printbatch": "ব্যাচ প্রিন্ট",
  "list.csv": "CSV",
  "list.xlsx": "Excel",
  "list.active": "সক্রিয়",
  "list.archived": "আর্কাইভড",
  "list.empty": "এখনো কোনো মুকিম রেকর্ড নেই",
  "list.emptyHint": "প্রথম রিপোর্ট যোগ করতে 'নতুন এন্ট্রি' ব্যবহার করুন।",
  "list.noMatch": "কোনো মিল পাওয়া যায়নি",
  "list.noMatchHint": "অন্যভাবে খুঁজুন অথবা ফিল্টার মুছুন।",
  "col.iqama": "ইকামা নং",
  "col.name": "নাম",
  "col.nationality": "জাতীয়তা",
  "col.occupation": "পেশা",
  "col.expiry": "ইকামার মেয়াদ",
  "col.status": "স্ট্যাটাস",
  "col.employer": "নিয়োগকর্তা",
  "detail.back": "সব রেকর্ড",
  "detail.qr": "QR যাচাই",
  "detail.history": "পরিবর্তনের ইতিহাস",
  "detail.historyEmpty": "এখনো কোনো ইতিহাস নেই",
  "detail.archivedBanner": "এই রেকর্ডটি আর্কাইভ করা, মূল তালিকায় দেখা যাবে না।",
  "import.title": "ইমপোর্ট ও এক্সপোর্ট",
  "import.eyebrow": "বাল্ক টুলস",
  "import.template": "খালি টেমপ্লেট নামান",
  "import.pick": "Excel (.xlsx) বা CSV ফাইল বাছুন",
  "import.hint": "প্রথম সারিতে টেমপ্লেটের কলামের নাম থাকতে হবে। তারিখ হিজরি লেখা, যেমন 1448-05-25। যে সারি আগে থেকেই আছে (একই ইকামা ও ভার্সন) তা বাদ যাবে।",
  "import.run": "সারি ইমপোর্ট করুন",
  "import.done": "ইমপোর্ট শেষ",
  "import.exportAll": "সবকিছু এক্সপোর্ট",
  "import.adminOnly": "ইমপোর্ট করতে মুকিম অ্যাডমিন অনুমতি লাগে।",
  "palette.placeholder": "নাম, ইকামা নম্বর বা পেজের নাম লিখুন…",
  "palette.pages": "পেজ",
  "palette.records": "রেকর্ড",
  "palette.empty": "কিছু পাওয়া যায়নি",
  "theme.light": "লাইট",
  "theme.dark": "ডার্ক",
  "verify.title": "রিপোর্ট যাচাই",
  "verify.ok": "NOVARISE মুকিম রিপোর্টটি খাঁটি",
  "verify.bad": "এই রিপোর্ট যাচাই করা যায়নি",
  "verify.archived": "এই রেকর্ড আর্কাইভ করা হয়েছে, এটি আর হালনাগাদ নয়।",
};

const AR: Dict = {
  "nav.dashboard": "لوحة التحكم",
  "nav.records": "سجلات مقيم",
  "nav.entry": "إدخال مقيم",
  "nav.archive": "الأرشيف",
  "nav.import": "استيراد / تصدير",
  "nav.search": "ابحث أو انتقل إلى…",
  "brand.title": "إدارة مقيم",
  "common.signout": "تسجيل الخروج",
  "common.loading": "جارٍ التحميل…",
  "common.cancel": "إلغاء",
  "common.close": "إغلاق",
  "common.save": "حفظ",
  "common.view": "عرض",
  "common.edit": "تعديل",
  "common.download": "تنزيل PDF",
  "common.print": "طباعة",
  "common.archive": "أرشفة",
  "common.restore": "استعادة",
  "common.delete": "حذف نهائي",
  "common.all": "الكل",
  "common.records": "سجلات",
  "common.none": "لا توجد بيانات بعد",
  "dash.eyebrow": "نظرة عامة",
  "dash.title": "لوحة التحكم",
  "dash.welcome": "مرحبًا بعودتك",
  "dash.new": "إدخال جديد",
  "dash.total": "إجمالي المقيمين",
  "dash.valid": "الحالة سارية",
  "dash.notvalid": "حالات أخرى",
  "dash.month": "أضيفت هذا الشهر",
  "dash.week": "أضيفت آخر 7 أيام",
  "dash.employers": "أصحاب العمل",
  "dash.archived": "في الأرشيف",
  "dash.monthly": "الإدخالات شهريًا",
  "dash.nationality": "حسب الجنسية",
  "dash.occupation": "حسب المهنة",
  "dash.status": "حسب الحالة",
  "dash.recent": "أحدث الإدخالات",
  "dash.viewall": "عرض الكل",
  "list.eyebrow": "إدارة مقيم",
  "list.title": "سجلات مقيم",
  "list.search": "ابحث بالاسم أو الإقامة أو الجواز أو صاحب العمل",
  "list.nationality": "الجنسية",
  "list.occupation": "المهنة",
  "list.status": "الحالة",
  "list.employer": "صاحب العمل",
  "list.gender": "الجنس",
  "list.clear": "مسح التصفية",
  "list.selected": "محدد",
  "list.pdfzip": "ملفات PDF (ZIP)",
  "list.printbatch": "طباعة دفعة",
  "list.csv": "CSV",
  "list.xlsx": "Excel",
  "list.active": "نشط",
  "list.archived": "مؤرشف",
  "list.empty": "لا توجد سجلات مقيم بعد",
  "list.emptyHint": "استخدم إدخال مقيم لإضافة أول تقرير.",
  "list.noMatch": "لا توجد نتائج مطابقة",
  "list.noMatchHint": "جرّب بحثًا آخر أو امسح التصفية.",
  "col.iqama": "رقم الإقامة",
  "col.name": "الاسم",
  "col.nationality": "الجنسية",
  "col.occupation": "المهنة",
  "col.expiry": "انتهاء الإقامة",
  "col.status": "الحالة",
  "col.employer": "صاحب العمل",
  "detail.back": "كل السجلات",
  "detail.qr": "رمز QR للتحقق",
  "detail.history": "سجل التغييرات",
  "detail.historyEmpty": "لا يوجد سجل بعد",
  "detail.archivedBanner": "هذا السجل مؤرشف ومخفي من القائمة الرئيسية.",
  "import.title": "استيراد وتصدير",
  "import.eyebrow": "أدوات جماعية",
  "import.template": "تنزيل قالب فارغ",
  "import.pick": "اختر ملف Excel (.xlsx) أو CSV",
  "import.hint": "يجب أن يحتوي الصف الأول على أسماء الأعمدة من القالب. التواريخ هجرية مثل 1448-05-25. الصفوف الموجودة (نفس الإقامة والإصدار) تُتجاوز.",
  "import.run": "استيراد الصفوف",
  "import.done": "اكتمل الاستيراد",
  "import.exportAll": "تصدير كل شيء",
  "import.adminOnly": "الاستيراد يتطلب صلاحية مدير مقيم.",
  "palette.placeholder": "اكتب اسمًا أو رقم إقامة أو صفحة…",
  "palette.pages": "الصفحات",
  "palette.records": "السجلات",
  "palette.empty": "لا شيء",
  "theme.light": "فاتح",
  "theme.dark": "داكن",
  "verify.title": "التحقق من التقرير",
  "verify.ok": "تقرير مقيم أصلي من نوفارايز",
  "verify.bad": "تعذر التحقق من هذا التقرير",
  "verify.archived": "تم أرشفة هذا السجل ولم يعد حاليًا.",
};

const DICTS: Record<Lang, Dict> = { en: EN, bn: BN, ar: AR };

interface PrefsValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: string) => string;
}

const PrefsContext = createContext<PrefsValue | null>(null);

export function usePrefs(): PrefsValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs outside provider");
  return value;
}

function readStored<T extends string>(key: string, allowed: readonly T[]): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : null;
  } catch {
    return null;
  }
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");

  // Read the saved choice once on the client; the inline script in the layout already painted the right theme.
  useEffect(() => {
    const savedLang = readStored("muqeem-lang", ["en", "bn", "ar"] as const);
    const savedTheme =
      readStored("muqeem-theme", ["light", "dark"] as const) ??
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (savedLang) setLangState(savedLang);
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem("muqeem-lang", next);
    } catch {
      /* private mode: the choice just will not persist */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("muqeem-theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<PrefsValue>(
    () => ({ lang, setLang, theme, toggleTheme, t: (key) => DICTS[lang][key] ?? EN[key] ?? key }),
    [lang, setLang, theme, toggleTheme],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
