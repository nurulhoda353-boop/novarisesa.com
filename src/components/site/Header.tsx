"use client";

import Image from "next/image";
import { Link } from "@/components/nav/AppLink";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Building2,
  Zap,
  Truck,
  HardHat,
  Cpu,
  Package,
  Users,
  Briefcase,
  Home,
  UserRound,
  FolderKanban,
  Settings2,
  FileText,
  CalendarDays,
  Mail,
  Phone,
  type LucideIcon,
} from "lucide-react";
const logoColor = "/assets/logo-navy-full.png";
const logoWhite = "/assets/logo-white-full.png";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";


type NavChild = { key: string; hash: string; icon: LucideIcon; labelKey?: string; descKey?: string };
type NavItem = { key: string; hash: string; icon: LucideIcon; children?: NavChild[] };

const nav: NavItem[] = [
  { key: "home", hash: "/", icon: Home },
  { key: "about", hash: "/about", icon: UserRound },
  { key: "projects", hash: "/projects", icon: FolderKanban },
  {
    key: "services",
    hash: "/services",
    icon: Settings2,
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
    icon: FileText,
    children: [
      { key: "urgent", hash: "/requirements", icon: Users, labelKey: "nav.requirementsAll", descKey: "nav.requirementsDesc" },
      { key: "careers", hash: "/careers", icon: Briefcase, labelKey: "nav.careers", descKey: "nav.careersDesc" },
    ],
  },
  { key: "blog", hash: "/blog", icon: CalendarDays },
  { key: "contact", hash: "/contact", icon: Mail },
];

const drawerEase = [0.32, 0.72, 0, 1] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const isRtl = i18n.dir() === "rtl";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);

  const closeMenu = () => {
    setOpen(false);
    setOpenSub(null);
  };

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-expand section that contains the active route
  useEffect(() => {
    if (!open) return;
    const activeParent = nav.find(
      (item) => item.children?.some((c) => isActivePath(pathname, c.hash)),
    );
    if (activeParent) setOpenSub(activeParent.key);
  }, [open, pathname]);

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

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${scrolled ? "text-navy hover:bg-navy/5" : "text-white hover:bg-white/10"}`}
                aria-label="Open menu"
                aria-expanded={open}
              >
                <span className="sr-only">Open menu</span>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[5px] block h-px w-[18px] bg-current rounded-full" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[4px] block h-px w-[14px] bg-current rounded-full" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile off-canvas */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className="absolute inset-0 bg-navy-deep/60 backdrop-blur-[8px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={t("nav.navigate")}
              className="absolute left-0 top-0 h-full w-[min(100vw-1.25rem,22rem)] dark-premium text-white flex flex-col overflow-hidden shadow-[12px_0_40px_rgba(0,0,0,0.4)]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: drawerEase }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent"
              />
              <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-gold/10 blur-[80px]" />

              {/* Header: logo + lang + close */}
              <div className="relative flex items-center justify-between gap-2 px-4 h-14 border-b border-white/[0.08]">
                <Link to="/" onClick={closeMenu} className="relative block h-7 w-[7rem] shrink-0" aria-label="NOVARISE — Home">
                  <Image src={logoWhite} alt="NOVARISE" fill sizes="112px" className="object-contain object-left" />
                </Link>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher variant="light" compact />
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="h-8 w-8 rounded-full border border-white/12 bg-white/[0.06] flex items-center justify-center text-white/75 hover:bg-gold hover:text-gold-foreground hover:border-gold transition-all duration-300"
                    aria-label="Close menu"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Nav links */}
              <nav className="relative flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                <ul className="flex flex-col gap-1">
                  {nav.map((item, i) => {
                    const Icon = item.icon;
                    const active = isActivePath(pathname, item.hash);
                    const hasChildren = Boolean(item.children?.length);
                    const expanded = openSub === item.key;

                    return (
                      <motion.li
                        key={item.key}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.06 + i * 0.03, ease: drawerEase }}
                      >
                        {hasChildren ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setOpenSub(expanded ? null : item.key)}
                              aria-expanded={expanded}
                              className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                                active || expanded
                                  ? "border border-gold/45 bg-gold/10 text-gold"
                                  : "border border-transparent text-white/88 hover:bg-white/[0.05] hover:text-white"
                              }`}
                            >
                              <Icon className={`h-4 w-4 shrink-0 ${active || expanded ? "text-gold" : "text-white/55"}`} />
                              <span className="flex-1 text-start">{t(`nav.${item.key}`)}</span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
                                  expanded ? "rotate-180 text-gold" : "text-white/35"
                                }`}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {expanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.28, ease: drawerEase }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-1 ms-3 ps-3 border-s border-white/10 space-y-0.5 pb-1">
                                    {item.children!.map((c) => {
                                      const childActive = isActivePath(pathname, c.hash);
                                      return (
                                        <Link
                                          key={c.key}
                                          to={c.hash}
                                          onClick={closeMenu}
                                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                                            childActive
                                              ? "bg-gold/10 text-gold"
                                              : "text-white/70 hover:bg-white/[0.05] hover:text-gold"
                                          }`}
                                        >
                                          <c.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                          <span>{c.labelKey ? t(c.labelKey) : t(`services.${c.key}.label`)}</span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        ) : (
                          <Link
                            to={item.hash}
                            onClick={closeMenu}
                            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                              active
                                ? "border border-gold/45 bg-gold/10 text-gold"
                                : "border border-transparent text-white/88 hover:bg-white/[0.05] hover:text-white"
                            }`}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-gold" : "text-white/55"}`} />
                            <span className="flex-1 text-start">{t(`nav.${item.key}`)}</span>
                            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${active ? "text-gold" : "text-white/25 group-hover:text-white/50"} ${isRtl ? "rotate-180" : ""}`} />
                          </Link>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>

                {/* Get in touch */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.28, ease: drawerEase }}
                  className="mt-5 mx-0.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold mb-3">
                    {t("footer.getInTouch", "Get in touch")}
                  </div>
                  <a
                    href="mailto:ceo@novarisebd.com"
                    className="flex items-center gap-2.5 text-[12px] text-white/80 hover:text-gold transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 text-gold/80" />
                    <span className="truncate">ceo@novarisebd.com</span>
                  </a>
                  <a
                    href="tel:+966554429574"
                    className="mt-2.5 flex items-center gap-2.5 text-[12px] text-white/80 hover:text-gold transition-colors"
                    dir="ltr"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-gold/80" />
                    <span>+966 55 442 9574</span>
                  </a>
                </motion.div>
              </nav>

              {/* CTA + copyright */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.32, ease: drawerEase }}
                className="relative px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 space-y-3"
              >
                <Link
                  to="/rfq"
                  onClick={closeMenu}
                  className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3.5 text-[13px] font-semibold text-gold-foreground shadow-gold overflow-hidden"
                >
                  <span className="relative z-10">{t("nav.requestRfq")}</span>
                  <ArrowUpRight className="relative z-10 h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
                  <span className="absolute inset-0 -translate-x-full bg-white/25 skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
                <p className="text-center text-[10px] text-white/40 tracking-wider">
                  {t("footer.copyright", { year: 2026 })}
                </p>
              </motion.div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
