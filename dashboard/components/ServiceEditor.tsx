"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { Award, BarChart3, BriefcaseBusiness, CheckCircle2, FileText, Globe2, ImageIcon, ImagePlus, Layers3, ListChecks, Save, Search, Upload, X } from "lucide-react";
import { api, SITE_URL } from "@/lib/api";

const SITE_ORIGIN = new URL(SITE_URL).origin;

export type ServiceItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  summary?: string;
  updated_at: string;
  extra: Record<string, unknown>;
};

type Stat = { value: number; suffix?: string; label: string };
type Pair = { title?: string; desc?: string; label?: string; value?: string; num?: string };
type Portfolio = { name: string; client: string; scope: string; year: string; image: string };
type Faq = { q: string; a: string };
type ServiceEditorData = {
  slug: string; title: string; summary: string; number: string; icon: string; sort_order: number;
  hero_media_id: string | null; eyebrow: string; lead: string; intro: string;
  stats: Stat[]; sub_services: Pair[]; capabilities: Pair[]; portfolio: Portfolio[];
  process: Pair[]; certifications: string[]; faqs: Faq[]; meta_title: string; meta_description: string;
};
type Media = { id: string; public_url: string; file_name: string; mime_type: string; alt_text: Record<string, string> };
type EditorResponse = { status: string; updated_at: string; has_draft: boolean; draft_updated_at: string | null; data: ServiceEditorData; preview: { hero_url: string | null } };

const tabs = [
  ["thumbnail", "Thumbnail Card", ImageIcon], ["hero", "Hero + Stats", ImagePlus], ["overview", "Overview", FileText],
  ["services", "Sub-services", Layers3], ["capabilities", "Capabilities", BarChart3], ["portfolio", "Portfolio", BriefcaseBusiness],
  ["process", "Delivery Process", ListChecks], ["certifications", "Certifications", Award], ["faq", "Service FAQ", CheckCircle2], ["seo", "SEO", Search],
] as const;
type Tab = typeof tabs[number][0];

const publicServiceImages: Record<string, string> = {
  civil: "/assets/project-civil.jpg", power: "/assets/project-power.jpg", rental: "/assets/project-equipment.jpg",
  manpower: "/assets/manpower.jpg", it: "/assets/vision-team.jpg", trading: "/assets/industry-oilgas.jpg",
};

const servicePortfolioFallbacks: Record<string, Portfolio[]> = {
  civil: [
    { name: "Refinery Tank Farm Foundations", client: "EPC for Saudi Aramco", scope: "12,000 m³ structural concrete + piling", year: "2024", image: "/assets/project-civil.jpg" },
    { name: "Petrochemical Process Building", client: "SABIC affiliate", scope: "Steel structure erection, 4,200 T", year: "2023", image: "/assets/capabilities-hero.jpg" },
    { name: "Industrial Warehouse Complex", client: "Private developer, Jubail", scope: "32,000 m² PEB + civil", year: "2023", image: "/assets/vision-skyline.jpg" },
  ],
  power: [
    { name: "132/13.8 kV GIS Substation", client: "SEC contractor", scope: "Installation, T&C and handover", year: "2024", image: "/assets/project-power.jpg" },
    { name: "Refinery Captive Power Upgrade", client: "Aramco affiliate", scope: "MV switchgear + 14 km cable", year: "2023", image: "/assets/capabilities-hero.jpg" },
    { name: "Industrial Park Distribution", client: "Marafiq", scope: "Underground HV network + 8 RMUs", year: "2023", image: "/assets/hero-industrial.jpg" },
  ],
  rental: [
    { name: "Refinery Turnaround Lift Plan", client: "Aramco contractor", scope: "4× 250T cranes + 60-day support", year: "2024", image: "/assets/project-equipment.jpg" },
    { name: "Mega-mall Steel Erection", client: "Riyadh developer", scope: "Crawler crane + manlift fleet", year: "2023", image: "/assets/capabilities-hero.jpg" },
    { name: "Industrial Camp Power", client: "EPC contractor", scope: "8× 1000 kVA gensets, 18 months", year: "2023", image: "/assets/vision-skyline.jpg" },
  ],
  manpower: [
    { name: "Refinery Major Turnaround", client: "Aramco affiliate", scope: "420 trades for 45-day shutdown", year: "2024", image: "/assets/manpower.jpg" },
    { name: "Petrochemical Plant Expansion", client: "SABIC affiliate", scope: "180 welders + supervisors", year: "2023", image: "/assets/hse-safety.jpg" },
    { name: "Power Plant Maintenance", client: "IPP operator", scope: "120 multi-discipline crews", year: "2023", image: "/assets/project-power.jpg" },
  ],
  it: [
    { name: "Refinery LAN Upgrade", client: "Aramco operator", scope: "Plant-wide fibre + access switching", year: "2024", image: "/assets/vision-team.jpg" },
    { name: "Remote Camp Connectivity", client: "EPC contractor", scope: "VSAT + Wi-Fi for 1,200 occupants", year: "2023", image: "/assets/manpower.jpg" },
    { name: "Plant SCADA Field Support", client: "Petrochemical operator", scope: "Resident engineers, 24-month contract", year: "2023", image: "/assets/capabilities-hero.jpg" },
  ],
  trading: [
    { name: "Steel Supply for Process Plant", client: "EPC contractor", scope: "4,200 T structural steel + plates", year: "2024", image: "/assets/industry-oilgas.jpg" },
    { name: "PPE Annual Supply Contract", client: "Refinery operator", scope: "Site-wide FR clothing + safety", year: "2023", image: "/assets/hse-safety.jpg" },
    { name: "MEP Supply for Industrial Park", client: "Developer, Jubail", scope: "Cables, panels, lighting", year: "2023", image: "/assets/capabilities-hero.jpg" },
  ],
};
const fixed = <T,>(rows: T[], count: number, create: () => T) => Array.from({ length: count }, (_, i) => rows[i] ?? create());
const normalise = (data: ServiceEditorData): ServiceEditorData => ({
  ...data,
  stats: fixed(data.stats ?? [], 4, () => ({ value: 0, suffix: "", label: "" })),
  sub_services: fixed(data.sub_services ?? [], 6, () => ({ title: "", desc: "" })),
  capabilities: fixed(data.capabilities ?? [], 6, () => ({ label: "", value: "" })),
  portfolio: fixed(data.portfolio ?? [], 3, () => ({ name: "", client: "", scope: "", year: "", image: "" })),
  process: fixed(data.process ?? [], 4, () => ({ num: "", title: "", desc: "" })),
  certifications: fixed(data.certifications ?? [], 5, () => ""),
  faqs: (data.faqs?.length ? data.faqs : fixed([], 3, () => ({ q: "", a: "" }))),
});

export function ServiceEditor({ item, canPublish, onClose, onPublished }: { item: ServiceItem; canPublish: boolean; onClose: () => void; onPublished: () => void }) {
  const staticHero = publicAsset(publicServiceImages[item.slug] ?? "");
  const [tab, setTab] = useState<Tab>("thumbnail");
  const [form, setForm] = useState<ServiceEditorData | null>(null);
  const [hero, setHero] = useState<string | null>((item.extra.thumbnail_url as string) ?? (staticHero || null));
  const [media, setMedia] = useState<Media[]>([]);
  const [picker, setPicker] = useState<"hero" | number | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const body = document.body.style.overflow, html = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = body; document.documentElement.style.overflow = html; };
  }, []);
  useEffect(() => {
    let stale = false;
    Promise.all([api<EditorResponse>(`/cms/services/${item.id}/editor`), api<{ items: Media[] }>("/cms/media?limit=100")])
      .then(([editor, assets]) => {
        if (stale) return;
        const fallbackPortfolio = servicePortfolioFallbacks[item.slug] ?? [];
        const source = editor.data.portfolio?.some((entry) => entry.name || entry.image) ? editor.data.portfolio : fallbackPortfolio;
        setForm(normalise({ ...editor.data, portfolio: source })); setHero((current) => editor.preview.hero_url || current || staticHero || null);
        setMedia(assets.items.filter((asset) => asset.mime_type.startsWith("image/")));
        setNotice(editor.has_draft ? "Draft restored. It is not yet visible on the public website." : "Everything published is live on the public site.");
      }).catch((error) => !stale && setNotice(error instanceof Error ? error.message : "Could not load service editor."));
    return () => { stale = true; };
  }, [item.id, item.slug, staticHero]);
  if (typeof document === "undefined") return null;
  const update = <K extends keyof ServiceEditorData>(key: K, value: ServiceEditorData[K]) => { setForm((current) => current ? { ...current, [key]: value } : current); setDirty(true); };
  const patchRow = <K extends "sub_services" | "capabilities" | "process">(key: K, index: number, next: Pair) => update(key, form ? form[key].map((row, i) => i === index ? next : row) : [] as ServiceEditorData[K]);
  const choose = (asset: Media) => {
    if (!form || picker === null) return;
    if (picker === "hero") { update("hero_media_id", asset.id); setHero(asset.public_url); }
    else update("portfolio", form.portfolio.map((row, i) => i === picker ? { ...row, image: asset.public_url } : row));
    setPicker(null);
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file || picker === null) return;
    const body = new FormData(); body.append("file", file); body.append("folder", "services"); body.append("alt_en", form?.title ?? "Service image");
    try { const asset = await api<Media>("/cms/media", { method: "POST", body }); setMedia((rows) => [asset, ...rows]); choose(asset); setNotice("Image uploaded and selected. Save draft or publish when ready."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not upload image."); }
    finally { event.target.value = ""; }
  };
  const save = async (mode: "draft" | "publish") => {
    if (!form) return; setSaving(mode); setNotice("");
    try { await api(mode === "draft" ? `/cms/services/${item.id}/draft` : `/cms/services/${item.id}/publish`, { method: mode === "draft" ? "PUT" : "POST", body: JSON.stringify(form) }); setDirty(false); setNotice(mode === "draft" ? "Draft saved safely. It is not public yet." : "Published successfully. The public service page now reflects these changes."); if (mode === "publish") onPublished(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not save service changes."); }
    finally { setSaving(null); }
  };
  const close = () => { if (!dirty || window.confirm("You have unsaved changes. Close the editor anyway?")) onClose(); };
  return createPortal(<div className="modal-backdrop project-editor-backdrop" onMouseDown={close}>
    <section className="project-editor service-editor" onMouseDown={(event) => event.stopPropagation()}>
      <header className="project-editor-head"><div><p className="eyebrow">Service editor</p><h2>{form?.title || item.title}</h2><span className={`badge badge-${item.status}`}>{item.status}</span>{dirty && <em>Unsaved changes</em>}</div><div className="project-editor-actions"><a href={`${SITE_ORIGIN}/services/${form?.slug || item.slug}`} target="_blank" rel="noreferrer" className="editor-live-link"><Globe2 size={15} /> View live</a><button className="editor-draft-button" onClick={() => void save("draft")} disabled={!form || !!saving}><Save size={16} /> Save draft</button>{canPublish && <button className="primary-button compact" onClick={() => void save("publish")} disabled={!form || !!saving}>{saving === "publish" ? "Publishing…" : "Publish"}</button>}<button className="editor-close" onClick={close}><X size={19} /></button></div></header>
      <nav className="project-editor-tabs service-editor-tabs">{tabs.map(([id, label, Icon], i) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{i + 1}</span><Icon size={16} />{label}</button>)}</nav>
      {!form ? <div className="project-editor-loading"><div className="skeleton"><i /><i /></div></div> : <div className="project-editor-content"><div className="project-editor-form service-editor-form">
        {tab === "thumbnail" && <><Section title="Public service card" copy="This is the card visitors see first on the Services page. It links directly to this service detail page." /><label>Service title<input value={form.title} onChange={(e) => update("title", e.target.value)} /></label><label>Card description<textarea rows={5} value={form.summary} onChange={(e) => update("summary", e.target.value)} /></label><div className="editor-two-cols"><label>Public URL<input value={form.slug} onChange={(e) => update("slug", slugify(e.target.value))} /></label><label>Display order<input type="number" min="0" value={form.sort_order} onChange={(e) => update("sort_order", Number(e.target.value))} /></label></div></>}
        {tab === "hero" && <><Section title="Hero, service identity and statistics" copy="This one image is used in the public service card and the full-width detail hero." /><ImageField image={hero} title="Service hero image" copy="Current public service image. Use a landscape image at least 2100 × 900 px." onPick={() => setPicker("hero")} /><div className="editor-two-cols"><label>Service number<input value={form.number} onChange={(e) => update("number", e.target.value)} placeholder="01" /></label><label>Icon name<input value={form.icon} onChange={(e) => update("icon", e.target.value)} placeholder="BriefcaseBusiness" /></label></div><label>Hero eyebrow<input value={form.eyebrow} onChange={(e) => update("eyebrow", e.target.value)} /></label><label>Hero lead<textarea rows={4} value={form.lead} onChange={(e) => update("lead", e.target.value)} /></label><FixedRows title="Hero statistics" copy="Exactly four live capability statistics in the hero panel.">{form.stats.map((row, i) => <div className="editor-three-cols" key={i}><label>Value<input type="number" value={row.value} onChange={(e) => update("stats", form.stats.map((r, n) => n === i ? { ...r, value: Number(e.target.value) } : r))} /></label><label>Suffix<input value={row.suffix ?? ""} onChange={(e) => update("stats", form.stats.map((r, n) => n === i ? { ...r, suffix: e.target.value } : r))} /></label><label>Label<input value={row.label} onChange={(e) => update("stats", form.stats.map((r, n) => n === i ? { ...r, label: e.target.value } : r))} /></label></div>)}</FixedRows></>}
        {tab === "overview" && <><Section title="Service overview" copy="The overview combines the headline service promise, longer introduction and the common template checklist." /><label>Overview headline<textarea rows={4} value={form.lead} onChange={(e) => update("lead", e.target.value)} /></label><label>Overview introduction<textarea rows={8} value={form.intro} onChange={(e) => update("intro", e.target.value)} /></label><p className="service-editor-note">The short checklist beside this section is a common Service-page template item, so it is not duplicated inside each service editor.</p></>}
        {tab === "services" && <FixedRows title="Sub-services" copy="Exactly six scope cards on the public detail page.">{form.sub_services.map((row, i) => <div className="editor-two-cols" key={i}><label>Scope {i + 1} title<input value={row.title ?? ""} onChange={(e) => patchRow("sub_services", i, { ...row, title: e.target.value })} /></label><label>Scope {i + 1} description<input value={row.desc ?? ""} onChange={(e) => patchRow("sub_services", i, { ...row, desc: e.target.value })} /></label></div>)}</FixedRows>}
        {tab === "capabilities" && <FixedRows title="Capability snapshot" copy="Exactly six label/value rows in the dark capability table.">{form.capabilities.map((row, i) => <div className="editor-two-cols" key={i}><label>Capability {i + 1}<input value={row.label ?? ""} onChange={(e) => patchRow("capabilities", i, { ...row, label: e.target.value })} /></label><label>Value<input value={row.value ?? ""} onChange={(e) => patchRow("capabilities", i, { ...row, value: e.target.value })} /></label></div>)}</FixedRows>}
        {tab === "portfolio" && <FixedRows title="Relevant projects / portfolio" copy="Exactly three delivered-work cards connected to this service.">{form.portfolio.map((row, i) => <div className="service-portfolio-row" key={i}><ImageField image={publicAsset(row.image || hero || "")} title={`Portfolio image ${i + 1}`} copy="Shown on this delivered-work card." onPick={() => setPicker(i)} compact /><div className="editor-two-cols"><label>Project name<input value={row.name} onChange={(e) => update("portfolio", form.portfolio.map((r, n) => n === i ? { ...r, name: e.target.value } : r))} /></label><label>Client<input value={row.client} onChange={(e) => update("portfolio", form.portfolio.map((r, n) => n === i ? { ...r, client: e.target.value } : r))} /></label><label>Scope<input value={row.scope} onChange={(e) => update("portfolio", form.portfolio.map((r, n) => n === i ? { ...r, scope: e.target.value } : r))} /></label><label>Year<input value={row.year} onChange={(e) => update("portfolio", form.portfolio.map((r, n) => n === i ? { ...r, year: e.target.value } : r))} /></label></div></div>)}</FixedRows>}
        {tab === "process" && <FixedRows title="Delivery process" copy="Exactly four steps show how clients engage this service.">{form.process.map((row, i) => <div className="editor-three-cols" key={i}><label>Step<input value={row.num ?? ""} onChange={(e) => patchRow("process", i, { ...row, num: e.target.value })} /></label><label>Title<input value={row.title ?? ""} onChange={(e) => patchRow("process", i, { ...row, title: e.target.value })} /></label><label>Description<input value={row.desc ?? ""} onChange={(e) => patchRow("process", i, { ...row, desc: e.target.value })} /></label></div>)}</FixedRows>}
        {tab === "certifications" && <FixedRows title="Certifications and standards" copy="Exactly five credentials shown in the public certification grid.">{form.certifications.map((entry, i) => <label key={i}>Certification {i + 1}<input value={entry} onChange={(e) => update("certifications", form.certifications.map((v, n) => n === i ? e.target.value : v))} /></label>)}</FixedRows>}
        {tab === "faq" && <FixedRows title="Service-specific FAQ" copy="These questions are unique to this service, unlike the common project FAQ.">{form.faqs.map((faq, i) => <div className="service-faq-row" key={i}><label>Question {i + 1}<input value={faq.q} onChange={(e) => update("faqs", form.faqs.map((v, n) => n === i ? { ...v, q: e.target.value } : v))} /></label><label>Answer<textarea rows={4} value={faq.a} onChange={(e) => update("faqs", form.faqs.map((v, n) => n === i ? { ...v, a: e.target.value } : v))} /></label></div>)}</FixedRows>}
        {tab === "seo" && <><Section title="Search and social sharing" copy="These fields help search engines understand this specific service." /><label>SEO page title<input value={form.meta_title} placeholder={form.title} onChange={(e) => update("meta_title", e.target.value)} /></label><label>Meta description<textarea rows={5} value={form.meta_description} placeholder={form.summary} onChange={(e) => update("meta_description", e.target.value)} /></label><div className="seo-preview"><span>Google preview</span><strong>{form.meta_title || form.title} | NOVARISE</strong><em>{SITE_ORIGIN}/services/{form.slug}</em><p>{form.meta_description || form.summary}</p></div></>}
      </div><aside className="project-editor-preview"><span>Live block preview · Desktop proportions</span><ServicePreview tab={tab} form={form} hero={hero} /></aside></div>}
      <footer className="project-editor-foot"><p>{notice || (canPublish ? "Your changes are only public after Publish." : "Save your work as a draft for an Admin to publish.")}</p><div><button onClick={close}>Close</button><button className="editor-draft-button" onClick={() => void save("draft")} disabled={!form || !!saving}>Save draft</button>{canPublish && <button className="primary-button compact" onClick={() => void save("publish")} disabled={!form || !!saving}>Publish</button>}</div></footer>
      {picker !== null && <MediaPicker current={publicAsset(picker === "hero" ? hero ?? "" : form?.portfolio[picker]?.image ?? "")} media={media} onClose={() => setPicker(null)} onChoose={choose} onUpload={upload} />}
    </section>
  </div>, document.body);
}

function Section({ title, copy }: { title: string; copy: string }) { return <div className="editor-section"><h3>{title}</h3><p>{copy}</p></div>; }
function FixedRows({ title, copy, children }: { title: string; copy: string; children: ReactNode }) { return <section className="fixed-public-fields service-fixed-fields"><div><h4>{title}</h4><p>{copy}</p></div>{children}</section>; }
function ImageField({ image, title, copy, onPick, compact }: { image: string | null; title: string; copy: string; onPick: () => void; compact?: boolean }) { return <div className={`editor-image-field hero${compact ? " compact" : ""}`}><div>{image ? <img src={image} alt="Current service" /> : <ImageIcon size={30} />}<span>{title}</span></div><p>{copy}</p><div><button type="button" onClick={onPick}>{image ? "Replace image" : "Choose image"}</button></div></div>; }
function MediaPicker({ current, media, onClose, onChoose, onUpload }: { current: string | null; media: Media[]; onClose: () => void; onChoose: (asset: Media) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void }) { return <div className="media-picker-backdrop" onMouseDown={onClose}><div className="media-picker hero" onMouseDown={(e) => e.stopPropagation()}><div><p className="eyebrow">Choose image</p><h3>Service image</h3></div><label className="primary-button compact upload-button"><Upload size={15} /> Upload new<input type="file" accept="image/*" hidden onChange={onUpload} /></label><button className="media-picker-close" onClick={onClose}><X size={17} /></button><div className="media-picker-grid">{current && <button className="media-option current" onClick={onClose}><img src={current} alt="Current selection" /><span>Current selection</span></button>}{media.map((asset) => <button className="media-option" key={asset.id} onClick={() => onChoose(asset)}><img src={asset.public_url} alt={asset.file_name} /><span>{asset.file_name}</span></button>)}</div></div></div>; }
function ServicePreview({ tab, form, hero }: { tab: Tab; form: ServiceEditorData; hero: string | null }) { const rows = tab === "services" ? form.sub_services : tab === "capabilities" ? form.capabilities : tab === "process" ? form.process : []; return <div className="service-preview"><div className="service-preview-hero">{hero && <img src={publicAsset(hero)} alt="" />}<div><span>{form.eyebrow || "Service"}</span><h2>{form.title || "Service title"}</h2><p>{form.lead || form.summary}</p></div></div>{tab === "thumbnail" && <div className="service-preview-card"><h3>{form.title}</h3><p>{form.summary}</p></div>}{tab === "hero" && <div className="service-preview-stats">{form.stats.map((s, i) => <div key={i}><b>{s.value}{s.suffix}</b><span>{s.label}</span></div>)}</div>}{tab === "overview" && <div className="service-preview-copy"><h3>{form.lead}</h3><p>{form.intro}</p></div>}{rows.length > 0 && <div className="service-preview-rows">{rows.map((row, i) => <div key={i}><strong>{row.title || row.label || row.num || `Item ${i + 1}`}</strong><span>{row.desc || row.value || "Service content"}</span></div>)}</div>}{tab === "portfolio" && <div className="service-preview-portfolio">{form.portfolio.map((p, i) => <div key={i}>{p.image && <img src={publicAsset(p.image)} alt="" />}<b>{p.name || "Delivered project"}</b><span>{p.client}</span></div>)}</div>}{tab === "certifications" && <div className="service-preview-rows">{form.certifications.map((c, i) => <div key={i}><strong>{c || `Certification ${i + 1}`}</strong></div>)}</div>}{tab === "faq" && <div className="service-preview-rows">{form.faqs.map((f, i) => <div key={i}><strong>{f.q || `Question ${i + 1}`}</strong><span>{f.a}</span></div>)}</div>}{tab === "seo" && <div className="seo-preview"><span>Google preview</span><strong>{form.meta_title || form.title} | NOVARISE</strong><em>novarisesa.com/services/{form.slug}</em><p>{form.meta_description || form.summary}</p></div>}</div>; }
function publicAsset(value: string) { return value.startsWith("/") ? `${SITE_ORIGIN}${value}` : value; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
