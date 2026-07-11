"use client";

import Image from "next/image";
import { Link } from "@/components/nav/AppLink";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight, ChevronDown, Building2, Zap, Truck, HardHat, Cpu, Package, Users, Briefcase } from "lucide-react";
const logoColor = "/assets/logo-navy-full.png";
const logoWhite = "/assets/logo-white-full.png";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";


type NavChild = { key: string; hash: string; icon: typeof Building2; labelKey?: string; descKey?: string };
type NavItem = { key: string; hash: string; children?: NavChild[] };

const nav: NavItem[] = [
  { key: "home", hash: "/" },
  { key: "about", hash: "/about" },
  { key: "projects", hash: "/projects" },
  {
    key: "services",
    hash: "/services",
    children: [
      { key: "civil", hash: "/services/civil", icon: Building2 },
      { key: "power", hash: "/services/power", icon: Zap },
      { key: "rental", hash: "/services/rental", icon: Truck },
      { key: "manpower", hash: "/services/manpower", icon: HardHat },
      { key: "it", hash: "/services/it", icon: Cpu },
      { key: "trading", hash: "/services/trading", icon: Package },
    ],
  },
  {
    key: "requirements",
    hash: "/requirements",
    children: [
      { key: "urgent", hash: "/requirements", icon: Users, labelKey: "nav.requirementsAll", descKey: "nav.requirementsDesc" },
      { key: "careers", hash: "/careers", icon: Briefcase, labelKey: "nav.careers", descKey: "nav.careersDesc" },
    ],
  },
  { key: "blog", hash: "/blog" },
  { key: "contact", hash: "/contact" },
];

export function Header() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 z-50 transition-all duration-500 ${
          scrolled ? "top-4" : "top-8"
        }`}
      >
        <div className="container-wide">
          <div
            className={`relative mx-auto flex items-center justify-between gap-4 rounded-2xl pl-3 pr-3 h-14 lg:h-[68px] border transition-all duration-500 ${
              scrolled
                ? "border-navy/10 bg-white/75 shadow-elegant backdrop-blur-2xl backdrop-saturate-150"
                : "border-white/15 bg-transparent"
            }`}
          >

            {/* gold top hairline */}
            <span aria-hidden className={`pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500 ${scrolled ? "via-gold/60" : "via-gold/40"}`} />

            {/* Logo */}
            <Link to="/" className="relative flex items-center gap-2.5 pl-1 pr-3 group" aria-label="NOVARISE — Home">
              <div className="relative h-8 lg:h-9 w-[130px] lg:w-[170px] transition-transform duration-500 group-hover:scale-[1.03]">
                <Image
                  src={logoWhite}
                  alt="NOVARISE Trading and Contracting Company"
                  fill
                  priority
                  sizes="170px"
                  className={`object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-opacity duration-500 ${scrolled ? "opacity-0" : "opacity-100"}`}
                />
                <Image
                  src={logoColor}
                  alt=""
                  aria-hidden
                  fill
                  sizes="170px"
                  className={`object-contain object-left transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-0"}`}
                />
              </div>
            </Link>

            {/* Center nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {nav.map((item) => {
                const linkCls = `group relative inline-flex items-center gap-1 px-3.5 py-2 text-[15px] font-medium tracking-[0.005em] transition-colors rounded-full ${
                  scrolled ? "text-navy/75 hover:text-navy" : "text-white/85 hover:text-white"
                }`;

                const underline = (
                  <span className="pointer-events-none absolute left-3.5 right-3.5 bottom-1 h-px origin-center scale-x-0 bg-gold transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                );


                if (item.children) {
                  return (
                    <div key={item.key} className="relative group/menu">
                      <Link to={item.hash} className={linkCls}>
                        {t(`nav.${item.key}`)}
                        <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-300 group-hover/menu:rotate-180" />
                        {underline}
                      </Link>
                      <div className="invisible opacity-0 translate-y-2 group-hover/menu:visible group-hover/menu:opacity-100 group-hover/menu:translate-y-0 transition-all duration-300 absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[600px] z-50">
                        <div className="relative rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-elegant overflow-hidden">
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                          <div className="grid grid-cols-2 gap-1 p-2">
                            {item.children.map((c) => (
                              <Link
                                key={c.key}
                                to={c.hash}
                                className="group/item flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-muted/60 transition-colors"
                              >
                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold group-hover/item:bg-gold group-hover/item:text-gold-foreground transition-colors">
                                  <c.icon className="h-4 w-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-semibold text-navy truncate">{c.labelKey ? t(c.labelKey) : t(`services.${c.key}.label`)}</span>
                                  <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">{c.descKey ? t(c.descKey) : t(`services.${c.key}.desc`)}</span>
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link key={item.key} to={item.hash} className={linkCls}>
                    {t(`nav.${item.key}`)}
                    {underline}
                  </Link>
                );
              })}
            </nav>

            {/* Right cluster */}
            <div className="hidden lg:flex items-center gap-2">
              <LanguageSwitcher variant={scrolled ? "dark" : "light"} compact />
              <Link
                to="/rfq"
                className="group relative inline-flex items-center gap-1 rounded-lg bg-gold pl-3 pr-2.5 h-8 text-[12px] font-semibold text-gold-foreground shadow-gold overflow-hidden transition-all hover:scale-[1.03]"
              >
                <span className="relative z-10">{t("nav.requestRfq")}</span>
                <ArrowUpRight className="relative z-10 h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
                <span className="absolute inset-0 -translate-x-full bg-white/25 skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
            </div>

            {/* Mobile */}
            <div className="lg:hidden flex items-center gap-1.5">
              <LanguageSwitcher variant={scrolled ? "dark" : "light"} compact />
              <button
                onClick={() => setOpen(true)}
                className={`relative h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${scrolled ? "text-navy hover:bg-navy/5" : "text-white hover:bg-white/10"}`}
                aria-label="Open menu"
              >
                <span className="sr-only">Open menu</span>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[4px] block h-px w-4 bg-current" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[3px] block h-px w-3 bg-current" />
              </button>
            </div>


          </div>
        </div>
      </header>

      {/* Mobile off-canvas — premium left drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-navy-deep/60 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute left-0 top-0 h-full w-[86%] max-w-[360px] dark-premium text-white flex flex-col shadow-2xl overflow-hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* gold right edge accent */}
              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
              <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-gold/12 blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-navy/40 blur-[100px]" />

              {/* Header */}
              <div className="relative flex items-center justify-between px-5 h-16 border-b border-white/8">
                <span className="relative block h-7 w-32">
                  <Image src={logoWhite} alt="NOVARISE" fill sizes="128px" className="object-contain object-left" />
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-full border border-white/15 bg-white/5 flex items-center justify-center hover:bg-gold hover:text-gold-foreground hover:border-gold transition-all"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Lang */}
              <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
                <span className="text-[9px] uppercase tracking-[0.32em] text-gold/70">{t("nav.navigate")}</span>
                <LanguageSwitcher variant="light" />
              </div>

              {/* Nav */}
              <nav className="relative flex-1 overflow-y-auto px-3 pb-4">
                <ul className="flex flex-col">
                  {nav.map((item, i) => (
                    <motion.li
                      key={item.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {item.children ? (
                        <>
                          <button
                            onClick={() => setOpenSub(openSub === item.key ? null : item.key)}
                            className="group w-full flex items-center justify-between px-3 py-3 rounded-lg text-[15px] font-medium text-white/90 hover:bg-white/5 hover:text-gold transition-colors"
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-gold/50 tabular-nums w-5">0{i + 1}</span>
                              {t(`nav.${item.key}`)}
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${openSub === item.key ? "rotate-180 text-gold" : "text-white/35"}`} />
                          </button>
                          <AnimatePresence initial={false}>
                            {openSub === item.key && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="ml-8 my-1 pl-3 border-l border-white/10 space-y-0.5">
                                  {item.children.map((c) => (
                                    <Link
                                      key={c.key}
                                      to={c.hash}
                                      onClick={() => setOpen(false)}
                                      className="group/sub flex items-center gap-2.5 rounded-md px-2.5 py-2 text-white/75 hover:bg-white/5 hover:text-gold transition-colors"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-gold group-hover/sub:bg-gold/15 transition-colors">
                                        <c.icon className="h-3.5 w-3.5" />
                                      </span>
                                      <span className="text-[13px] font-medium">{c.labelKey ? t(c.labelKey) : t(`services.${c.key}.label`)}</span>
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <Link
                          to={item.hash}
                          onClick={() => setOpen(false)}
                          className="group flex items-center justify-between px-3 py-3 rounded-lg text-[15px] font-medium text-white/90 hover:bg-white/5 hover:text-gold transition-colors"
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-gold/50 tabular-nums w-5">0{i + 1}</span>
                            {t(`nav.${item.key}`)}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-white/25 group-hover:text-gold group-hover:rotate-45 transition-all duration-400" />
                        </Link>
                      )}
                    </motion.li>
                  ))}
                </ul>

                {/* Quick contact */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                  className="mt-6 mx-3 p-4 rounded-xl border border-white/8 bg-white/[0.03]"
                >
                  <div className="text-[9px] uppercase tracking-[0.3em] text-gold/70 mb-2">{t("footer.getInTouch", "Get in touch")}</div>
                  <a href="mailto:ceo@novarisebd.com" className="block text-[12px] text-white/80 hover:text-gold transition-colors truncate">ceo@novarisebd.com</a>
                  <a href="tel:+966554429574" className="block text-[12px] text-white/80 hover:text-gold transition-colors mt-1">+966 55 442 9574</a>
                </motion.div>
              </nav>

              {/* CTA footer */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.5 }}
                className="relative px-5 pb-6 pt-3 border-t border-white/8"
              >
                <Link
                  to="/rfq"
                  onClick={() => setOpen(false)}
                  className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-[13px] font-semibold text-gold-foreground shadow-gold overflow-hidden"
                >
                  <span className="relative z-10">{t("nav.requestRfq")}</span>
                  <ArrowUpRight className="relative z-10 h-4 w-4 transition-transform group-hover:rotate-45" />
                  <span className="absolute inset-0 -translate-x-full bg-white/25 skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
                <p className="mt-3 text-center text-[10px] text-white/40 tracking-wider">© 2026 NOVARISE</p>
              </motion.div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
