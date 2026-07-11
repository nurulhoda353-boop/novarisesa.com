import {
  Building2,
  Zap,
  Truck,
  HardHat,
  Cpu,
  Package,
  type LucideIcon,
  Hammer,
  Layers,
  Wrench,
  Construction,
  Ruler,
  Waypoints,
  Cable,
  PlugZap,
  Gauge,
  ShieldCheck,
  Activity,
  Truck as Crane,
  Forklift,
  Fuel,
  Flame,
  Wind,
  Boxes,
  Users,
  HardHat as Helmet,
  Server,
  Network,
  Radio,
  MonitorCog,
  Cloud,
  Lock,
  Anvil,
  Drill,
  ShieldAlert,
  Pipette,
  Droplets,
  ScrollText,
} from "lucide-react";

const imgCivil = "/assets/project-civil.jpg";
const imgPower = "/assets/project-power.jpg";
const imgRental = "/assets/project-equipment.jpg";
const imgManpower = "/assets/manpower.jpg";
const imgIT = "/assets/vision-team.jpg";
const imgTrading = "/assets/industry-oilgas.jpg";
const imgCapabilities = "/assets/capabilities-hero.jpg";
const imgHero = "/assets/hero-industrial.jpg";
const imgHse = "/assets/hse-safety.jpg";
const imgVision = "/assets/vision-skyline.jpg";

export type SubService = { icon: LucideIcon; title: string; desc: string };
export type CapabilityRow = { label: string; value: string };
export type Project = { name: string; client: string; scope: string; year: string; image: string };
export type ProcessStep = { num: string; title: string; desc: string };
export type Faq = { q: string; a: string };
export type Stat = { value: number; suffix?: string; label: string };

export type ServicePage = {
  slug: string;
  num: string;
  title: string;
  eyebrow: string;
  tagline: string;
  lead: string;
  intro: string;
  icon: LucideIcon;
  heroImage: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  // Sections
  stats: Stat[];
  subServices: SubService[];
  capabilities: { heading: string; rows: CapabilityRow[] };
  projects: Project[];
  process: ProcessStep[];
  certifications: string[];
  faqs: Faq[];
};

export const servicePages: ServicePage[] = [
  // ───────── 01 CIVIL ─────────
  {
    slug: "civil",
    num: "01",
    title: "Civil Construction",
    eyebrow: "Civil & Structural",
    tagline: "Industrial civil works, engineered to megaproject standards.",
    lead: "Foundations, structural concrete, industrial buildings and site infrastructure for the Kingdom's most demanding sites.",
    intro:
      "From greenfield refinery plots to brownfield expansions inside live SABIC plants, our civil teams deliver concrete, rebar, structural steel and site works to QA/QC standards pre-cleared by Saudi Aramco, SABIC, Ma'aden and the major EPC contractors operating across the Kingdom.",
    icon: Building2,
    heroImage: imgCivil,
    metaTitle: "Civil Construction in Saudi Arabia — NOVARISE",
    metaDescription:
      "Industrial civil construction services in Saudi Arabia — foundations, structural concrete, steel erection and site works for refineries, petrochemical plants and megaprojects.",
    stats: [
      { value: 12, suffix: "M+", label: "Safe Man-hours" },
      { value: 45, suffix: "+", label: "Civil Projects" },
      { value: 8, suffix: "+", label: "Active Sites" },
      { value: 250, suffix: "K m³", label: "Concrete Poured" },
    ],
    subServices: [
      { icon: Anvil, title: "Heavy Foundations & Piling", desc: "Pile caps, raft foundations and deep foundations for industrial loads." },
      { icon: Layers, title: "Structural Concrete", desc: "Formwork, rebar fixing and high-grade concrete pours to ACI / ASTM specs." },
      { icon: Construction, title: "Steel Structure Erection", desc: "Pre-engineered buildings, pipe racks and process structures." },
      { icon: Hammer, title: "Industrial Buildings", desc: "Warehouses, workshops, control rooms and substation buildings." },
      { icon: Ruler, title: "Roads, Paving & Grading", desc: "Site preparation, asphalt, kerbing and internal plant roads." },
      { icon: Waypoints, title: "Drainage & Underground Utilities", desc: "Storm drainage, sewerage and underground service corridors." },
    ],
    capabilities: {
      heading: "Civil delivery capability",
      rows: [
        { label: "Concrete capacity / day", value: "Up to 1,200 m³" },
        { label: "Owned formwork systems", value: "PERI / Doka equivalent" },
        { label: "Tower cranes deployable", value: "6 (50T–80T)" },
        { label: "QA/QC standards", value: "ACI, ASTM, SAES-Q-001" },
        { label: "Concurrent active sites", value: "Up to 12" },
        { label: "Mobilization window", value: "14–21 days" },
      ],
    },
    projects: [
      { name: "Refinery Tank Farm Foundations", client: "EPC for Saudi Aramco", scope: "12,000 m³ structural concrete + piling", year: "2024", image: imgCivil },
      { name: "Petrochemical Process Building", client: "SABIC affiliate", scope: "Steel structure erection, 4,200 T", year: "2023", image: imgCapabilities },
      { name: "Industrial Warehouse Complex", client: "Private developer, Jubail", scope: "32,000 m² PEB + civil", year: "2023", image: imgVision },
    ],
    process: [
      { num: "01", title: "Inquiry & Site Survey", desc: "BOQ review, joint site walk-down and constraint mapping with the client engineering team." },
      { num: "02", title: "Method Statement & Approvals", desc: "MS, ITP and HSE plan submission for client / EPC approval before mobilization." },
      { num: "03", title: "Mobilization", desc: "Crews, equipment and site facilities mobilized to schedule with full QA/QC documentation." },
      { num: "04", title: "Execution & Handover", desc: "Daily progress reporting, third-party inspection and snag-free handover with as-built documentation." },
    ],
    certifications: ["ISO 9001:2015", "ISO 45001 (OHS)", "Saudi Aramco SAES-Q-001", "SABIC SES Civil", "Royal Commission (RCJY)"],
    faqs: [
      { q: "Can NOVARISE work inside live operating plants?", a: "Yes. Our crews are trained on permit-to-work systems used by Aramco, SABIC and Ma'aden, including hot-work, confined-space and isolation procedures required for brownfield work." },
      { q: "What is your typical mobilization timeline for civil works?", a: "Standard mobilization is 14–21 days for medium-size scopes. Emergency or shutdown support can be mobilized within 96 hours from existing fleet and crews." },
      { q: "Do you self-perform or sub-contract concrete works?", a: "Concrete, rebar, formwork and structural steel erection are self-performed by our owned crews. Specialty scopes such as post-tensioning are delivered with audited specialist partners." },
      { q: "Which QA/QC standards do you work to?", a: "ACI 318, ASTM, BS EN, plus client-specific standards including SAES-Q-001 (Aramco), SABIC SES and Royal Commission specifications for Jubail and Yanbu." },
    ],
  },

  // ───────── 02 POWER ─────────
  {
    slug: "power",
    num: "02",
    title: "Power Plants",
    eyebrow: "Power & Electrical",
    tagline: "Power generation & electrical infrastructure, end to end.",
    lead: "EPC support, substations, switchyards and plant maintenance — built to keep the Kingdom's grid running.",
    intro:
      "We support utility-scale and captive power projects with installation, testing and commissioning of substations, transformers and switchyards. Our electrical crews handle MV/HV cable laying, terminations and ongoing plant maintenance under live operating conditions across SEC, Marafiq and IPP assets.",
    icon: Zap,
    heroImage: imgPower,
    metaTitle: "Power Plant & Electrical Contracting in Saudi Arabia — NOVARISE",
    metaDescription:
      "Substations, switchyards, MV/HV cabling and plant maintenance for utility and captive power projects across Saudi Arabia. SEC, Marafiq and IPP-grade delivery.",
    stats: [
      { value: 18, suffix: "+", label: "Substations Delivered" },
      { value: 320, suffix: " km", label: "MV/HV Cable Laid" },
      { value: 6, suffix: "+", label: "IPP Clients" },
      { value: 99.9, suffix: "%", label: "Uptime Record" },
    ],
    subServices: [
      { icon: PlugZap, title: "Substations & Switchyards", desc: "Installation, testing and commissioning up to 380 kV." },
      { icon: Cable, title: "MV / HV Cable Works", desc: "Cable laying, jointing and terminations to IEC standards." },
      { icon: Activity, title: "Transformer Installation", desc: "Power transformers, dry-type and oil-filled, with on-site testing." },
      { icon: Gauge, title: "Testing & Commissioning", desc: "Protection relay, partial discharge and SAT/FAT support." },
      { icon: Wrench, title: "Plant Maintenance", desc: "Planned and emergency maintenance under live operations." },
      { icon: ShieldCheck, title: "EPC Sub-contracting", desc: "Specialist support to global EPCs on power and utility scopes." },
    ],
    capabilities: {
      heading: "Power delivery capability",
      rows: [
        { label: "Voltage levels handled", value: "Up to 380 kV" },
        { label: "Certified electrical crews", value: "180+" },
        { label: "Test & commissioning teams", value: "6 mobile units" },
        { label: "Standards", value: "IEC, IEEE, SEC TCS" },
        { label: "Shutdown response", value: "<96 hours" },
        { label: "Partner OEMs", value: "ABB, Siemens, Schneider" },
      ],
    },
    projects: [
      { name: "132/13.8 kV GIS Substation", client: "SEC contractor", scope: "Installation, T&C and handover", year: "2024", image: imgPower },
      { name: "Refinery Captive Power Upgrade", client: "Aramco affiliate", scope: "MV switchgear + 14 km cable", year: "2023", image: imgCapabilities },
      { name: "Industrial Park Distribution", client: "Marafiq", scope: "Underground HV network + 8 RMUs", year: "2023", image: imgHero },
    ],
    process: [
      { num: "01", title: "Scope & Single-line Review", desc: "Engineering review of SLDs, cable schedules and protection coordination." },
      { num: "02", title: "Method & Safety Plan", desc: "LOTO, energization sequence and HSE plan agreed with operations." },
      { num: "03", title: "Installation", desc: "Equipment install, cabling and pre-commissioning with daily QA records." },
      { num: "04", title: "Testing & Energization", desc: "Protection testing, SAT and witnessed energization with as-built handover." },
    ],
    certifications: ["ISO 9001:2015", "ISO 45001", "SEC Contractor Classification", "Marafiq Approved Vendor", "IEC / IEEE Compliance"],
    faqs: [
      { q: "What voltage levels are you certified to work on?", a: "Our electrical division handles up to 380 kV transmission, including substation construction, GIS commissioning and cable jointing under SEC and IEC standards." },
      { q: "Do you provide testing and commissioning teams independently?", a: "Yes. We supply dedicated T&C teams with calibrated instruments for protection relay testing, primary injection, partial discharge and SAT support — either bundled with construction or as a standalone service." },
      { q: "Can you support live shutdown work?", a: "Yes. We routinely support refinery, IPP and Marafiq shutdowns with rapid mobilization, full LOTO compliance and 24/7 supervision." },
    ],
  },

  // ───────── 03 RENTAL ─────────
  {
    slug: "rental",
    num: "03",
    title: "Heavy Equipment Rental",
    eyebrow: "Equipment & Fleet",
    tagline: "Owned fleet — rented bare or with certified operators.",
    lead: "Cranes up to 250T, manlifts, telehandlers, generators, compressors and welding machines — maintained in-house, dispatched on demand.",
    intro:
      "No third-party rental delays. Our owned fleet is maintained by in-house mechanics, third-party load-tested annually, and supplied with certified operators where the scope requires. We commit to mobilization timelines you can plan around — even during peak shutdown season.",
    icon: Truck,
    heroImage: imgRental,
    metaTitle: "Heavy Equipment Rental in Saudi Arabia — Cranes, Manlifts, Generators",
    metaDescription:
      "Owned fleet of cranes up to 250T, manlifts, telehandlers, generators and compressors — bare or with certified operators. Reliable mobilization across Saudi Arabia.",
    stats: [
      { value: 180, suffix: "+", label: "Owned Units" },
      { value: 250, suffix: "T", label: "Max Crane Capacity" },
      { value: 95, suffix: "%", label: "Fleet Availability" },
      { value: 24, suffix: "/7", label: "Dispatch Support" },
    ],
    subServices: [
      { icon: Crane, title: "Mobile & Crawler Cranes", desc: "All-terrain and crawler cranes from 25T up to 250T capacity." },
      { icon: Construction, title: "Manlifts & Telehandlers", desc: "Articulated booms, scissor lifts and telehandlers up to 45 m." },
      { icon: Forklift, title: "Forklifts & Material Handlers", desc: "Diesel and electric forklifts for plant and warehouse handling." },
      { icon: Fuel, title: "Generators & Compressors", desc: "Diesel gensets 50–1500 kVA and air compressors with full PMS." },
      { icon: Drill, title: "Welding & Cutting Machines", desc: "Welding plants, plasma cutters and rectifiers with consumables." },
      { icon: Users, title: "Operator-Bundled Options", desc: "Certified operators, banksmen and riggers bundled on request." },
    ],
    capabilities: {
      heading: "Fleet & dispatch capability",
      rows: [
        { label: "Owned fleet size", value: "180+ units" },
        { label: "Mobile cranes", value: "25T – 250T" },
        { label: "Maintenance", value: "In-house workshops" },
        { label: "Load testing", value: "Annual third-party" },
        { label: "Dispatch", value: "24/7 from Riyadh & Dammam" },
        { label: "Operator certifications", value: "Aramco / TUV / OSHA" },
      ],
    },
    projects: [
      { name: "Refinery Turnaround Lift Plan", client: "Aramco contractor", scope: "4× 250T cranes + 60-day support", year: "2024", image: imgRental },
      { name: "Mega-mall Steel Erection", client: "Riyadh developer", scope: "Crawler crane + manlift fleet", year: "2023", image: imgCapabilities },
      { name: "Industrial Camp Power", client: "EPC contractor", scope: "8× 1000 kVA gensets, 18 months", year: "2023", image: imgVision },
    ],
    process: [
      { num: "01", title: "Lift / Power Plan Review", desc: "Joint review of lift plans, power load schedules or rental scope with client engineers." },
      { num: "02", title: "Equipment Reservation", desc: "Equipment held against project schedule with documented availability commitment." },
      { num: "03", title: "Mobilization & Inspection", desc: "Pre-dispatch inspection, third-party certificates and on-site handover to client." },
      { num: "04", title: "On-call Support", desc: "24/7 mechanical support, planned PMS and rapid replacement on breakdown." },
    ],
    certifications: ["Third-party Load Tested (Annual)", "Aramco-certified Operators", "ISO 45001 HSE", "OSHA Trained Riggers", "OEM-authorized Workshops"],
    faqs: [
      { q: "Can you provide certified operators with the equipment?", a: "Yes. Aramco, TUV and OSHA-certified crane operators, riggers and banksmen are available bundled with the equipment or independently." },
      { q: "How quickly can equipment be dispatched?", a: "From our Riyadh and Dammam yards, standard equipment can be on-site within 24–72 hours. Specialized cranes are scheduled per the client's lift plan." },
      { q: "What happens if a unit breaks down on site?", a: "We provide 24/7 mechanical support and guarantee like-for-like replacement within agreed SLAs to minimize downtime." },
    ],
  },

  // ───────── 04 MANPOWER ─────────
  {
    slug: "manpower",
    num: "04",
    title: "Manpower Supply",
    eyebrow: "Workforce & Trades",
    tagline: "2,500+ certified workforce on standby — Aramco-grade trades.",
    lead: "Welders, pipe-fitters, riggers, scaffolders, electricians, instrumentation technicians — multi-disciplinary crews ready in days.",
    intro:
      "Every trade we supply is third-party certified where the scope requires. Aramco-certified scaffolders, 6G/TIG/MIG welders, riggers and supervisors are pre-screened, medically fit and visa-compliant — ready to mobilize within 14–21 days, or under 96 hours for shutdown emergencies.",
    icon: HardHat,
    heroImage: imgManpower,
    metaTitle: "Certified Manpower Supply in Saudi Arabia — Welders, Riggers, Scaffolders",
    metaDescription:
      "Aramco-grade certified manpower supply across Saudi Arabia — welders, pipe-fitters, riggers, scaffolders, electricians and supervisors. 2,500+ workforce on standby.",
    stats: [
      { value: 2500, suffix: "+", label: "Workforce Pool" },
      { value: 96, suffix: " hrs", label: "Emergency Mobilization" },
      { value: 18, suffix: "+", label: "Trade Disciplines" },
      { value: 100, suffix: "%", label: "Visa-compliant" },
    ],
    subServices: [
      { icon: Flame, title: "Welders (6G, TIG, MIG)", desc: "ASME IX certified welders for pipeline, structural and pressure work." },
      { icon: Pipette, title: "Pipe-fitters & Rigger Crews", desc: "Process piping, hydrotest and rigging crews for shutdowns." },
      { icon: Helmet, title: "Aramco-certified Scaffolders", desc: "Tube & coupler and system scaffold teams for refineries and plants." },
      { icon: PlugZap, title: "Electrical & Instrumentation", desc: "Cable pulling, terminations, loop checks and calibration techs." },
      { icon: Wind, title: "HVAC & Mechanical Fitters", desc: "Ductwork, equipment install and rotating-equipment overhaul." },
      { icon: Users, title: "Civil Labor & Supervisors", desc: "Helpers, foremen and site supervisors for civil and finishing scopes." },
    ],
    capabilities: {
      heading: "Workforce & mobilization capability",
      rows: [
        { label: "Total workforce pool", value: "2,500+" },
        { label: "Standard mobilization", value: "14–21 days" },
        { label: "Emergency mobilization", value: "<96 hours" },
        { label: "Welder certifications", value: "ASME IX (6G/TIG/MIG)" },
        { label: "Scaffold certifications", value: "Aramco SAES-A / SABIC" },
        { label: "Camps & transport", value: "Self-managed" },
      ],
    },
    projects: [
      { name: "Refinery Major Turnaround", client: "Aramco affiliate", scope: "420 trades for 45-day shutdown", year: "2024", image: imgManpower },
      { name: "Petrochemical Plant Expansion", client: "SABIC affiliate", scope: "180 welders + supervisors", year: "2023", image: imgHse },
      { name: "Power Plant Maintenance", client: "IPP operator", scope: "120 multi-discipline crews", year: "2023", image: imgPower },
    ],
    process: [
      { num: "01", title: "Manpower Requisition", desc: "Trade-by-trade requisition reviewed against availability and certification matrix." },
      { num: "02", title: "Pre-screening & Testing", desc: "Document verification, medical clearance and trade tests where required." },
      { num: "03", title: "Mobilization", desc: "Visa, transport and accommodation handled — workforce on site within agreed window." },
      { num: "04", title: "On-site Supervision", desc: "Site supervisors, timekeeping, payroll and replacement management included." },
    ],
    certifications: ["ASME IX Welder Qualifications", "Aramco SAES-A Scaffolding", "SABIC Approved Trades", "ISO 45001 HSE", "OSHA 30 Supervisors"],
    faqs: [
      { q: "How fast can you mobilize manpower for a shutdown?", a: "Emergency mobilization within 96 hours from our standby pool. Standard mobilization for new scopes is 14–21 days including documentation and transport." },
      { q: "Are workers third-party certified for Aramco / SABIC sites?", a: "Yes. Welders are ASME IX certified, scaffolders are Aramco SAES-A trained, and electrical / instrumentation techs hold OEM and client-specific certifications." },
      { q: "Do you handle accommodation and transport?", a: "Yes. We operate self-managed camps and transport across Riyadh, Jubail, Yanbu and Dammam regions, included in the supply rate." },
      { q: "What is your replacement policy for unsuitable workers?", a: "Free replacement within 7 days if a worker fails to meet the agreed scope, with documented performance review." },
    ],
  },

  // ───────── 05 IT ─────────
  {
    slug: "it",
    num: "05",
    title: "IT Solutions",
    eyebrow: "Industrial IT & Automation",
    tagline: "Industrial IT, automation and site connectivity.",
    lead: "Networking, SCADA support, hardware procurement and digital infrastructure for industrial environments.",
    intro:
      "From remote site connectivity to automation hardware on plant floors, our IT vertical supports the digital backbone of modern industrial operations — networking, SCADA integration support, server & endpoint procurement, and on-site technical staffing across Saudi Arabia.",
    icon: Cpu,
    heroImage: imgIT,
    metaTitle: "Industrial IT, Automation & Networking — NOVARISE Saudi Arabia",
    metaDescription:
      "Industrial IT services in Saudi Arabia — site networking, SCADA support, server procurement and on-site IT staffing for plants, camps and remote project locations.",
    stats: [
      { value: 60, suffix: "+", label: "Sites Connected" },
      { value: 24, suffix: "/7", label: "NOC Support" },
      { value: 12, suffix: "+", label: "OEM Partners" },
      { value: 99.5, suffix: "%", label: "Network Uptime" },
    ],
    subServices: [
      { icon: Network, title: "Industrial Networking", desc: "LAN, WAN, fibre backbone and ruggedized switching for plants." },
      { icon: MonitorCog, title: "SCADA & Automation Support", desc: "Integration support and field services for SCADA / DCS systems." },
      { icon: Radio, title: "Remote Site Connectivity", desc: "Microwave, VSAT and 4G/5G failover for remote operations." },
      { icon: Server, title: "Servers & Endpoint Hardware", desc: "Procurement, racking, OS install and asset management." },
      { icon: Lock, title: "Cybersecurity Hardening", desc: "OT segmentation, firewall config and endpoint protection rollout." },
      { icon: Cloud, title: "On-site IT Staffing", desc: "Resident IT engineers and helpdesk for camp / plant operations." },
    ],
    capabilities: {
      heading: "Digital infrastructure capability",
      rows: [
        { label: "OEM partnerships", value: "Cisco, HPE, Dell, Fortinet" },
        { label: "Field engineers", value: "40+ certified" },
        { label: "Coverage", value: "Riyadh, EP, WP" },
        { label: "Standards", value: "ISA-95, IEC 62443" },
        { label: "Response SLA", value: "4-hour on-site" },
        { label: "NOC", value: "24/7 monitoring" },
      ],
    },
    projects: [
      { name: "Refinery LAN Upgrade", client: "Aramco operator", scope: "Plant-wide fibre + access switching", year: "2024", image: imgIT },
      { name: "Remote Camp Connectivity", client: "EPC contractor", scope: "VSAT + Wi-Fi for 1,200 occupants", year: "2023", image: imgManpower },
      { name: "Plant SCADA Field Support", client: "Petrochemical operator", scope: "Resident engineers, 24-month contract", year: "2023", image: imgCapabilities },
    ],
    process: [
      { num: "01", title: "Discovery & Site Audit", desc: "Network audit, asset inventory and gap analysis against ISA-95 / IEC 62443." },
      { num: "02", title: "Design & BoM", desc: "Topology, hardware BoM and migration plan agreed with the client OT/IT team." },
      { num: "03", title: "Deployment", desc: "Cabling, install, configuration and cutover during planned maintenance windows." },
      { num: "04", title: "Operate & Support", desc: "24/7 NOC monitoring, on-site engineers and SLA-backed support." },
    ],
    certifications: ["ISO 27001 (planned)", "Cisco / Fortinet / HPE Partners", "IEC 62443 Awareness", "ITIL Service Management", "Vendor SLA Backed"],
    faqs: [
      { q: "Do you support OT (operational technology) environments, not just IT?", a: "Yes. Our field engineers work across both IT and OT — including SCADA, DCS and PLC ecosystems — with awareness training on IEC 62443 and ISA-95 segmentation principles." },
      { q: "Can you provide resident engineers on long-term contracts?", a: "Yes. We place resident IT and SCADA engineers on 6, 12 and 24-month contracts at plant and camp sites across the Kingdom." },
      { q: "What is your typical response SLA for on-site issues?", a: "Standard SLA is 4-hour on-site response in Riyadh and Eastern Province, with 24/7 remote NOC support included." },
    ],
  },

  // ───────── 06 TRADING ─────────
  {
    slug: "trading",
    num: "06",
    title: "Materials Trading",
    eyebrow: "Procurement & Supply",
    tagline: "Steel, cement, safety and MEP — sourced reliably.",
    lead: "A trading arm built around the materials our contracting teams already know how to specify, source and inspect.",
    intro:
      "We trade structural steel, cement, aggregates, PPE, electrical and MEP materials directly to EPCs, sub-contractors and plant operators. Our procurement leverages long-standing supplier relationships across the GCC, Turkey, India and East Asia, with QA inspection and on-time logistics built in.",
    icon: Package,
    heroImage: imgTrading,
    metaTitle: "Industrial Materials Trading in Saudi Arabia — Steel, Cement, MEP & PPE",
    metaDescription:
      "Reliable supply of structural steel, cement, MEP materials, PPE and consumables for EPC and industrial projects in Saudi Arabia. Vetted vendors, on-time logistics.",
    stats: [
      { value: 120, suffix: "+", label: "Vetted Suppliers" },
      { value: 6, suffix: "", label: "Source Markets" },
      { value: 15, suffix: "+", label: "Material Categories" },
      { value: 98, suffix: "%", label: "On-time Delivery" },
    ],
    subServices: [
      { icon: Boxes, title: "Structural Steel Sections", desc: "Beams, channels, plates, hollow sections to ASTM / EN standards." },
      { icon: Layers, title: "Cement & Aggregates", desc: "OPC, SRC and aggregates supplied to project specs and schedules." },
      { icon: ShieldAlert, title: "PPE & Safety Equipment", desc: "Hard hats, harnesses, FR clothing and certified gas detectors." },
      { icon: Cable, title: "MEP & Electrical Supplies", desc: "Cables, conduits, lighting, switchgear and panel components." },
      { icon: Droplets, title: "Pipes, Fittings & Valves", desc: "CS / SS pipe, butt-weld fittings and industrial valves." },
      { icon: ScrollText, title: "Logistics & Inspection", desc: "Third-party inspection, freight forwarding and on-site delivery." },
    ],
    capabilities: {
      heading: "Procurement & supply capability",
      rows: [
        { label: "Source markets", value: "GCC, TR, IN, CN, KR, EU" },
        { label: "Vetted suppliers", value: "120+" },
        { label: "Inspection", value: "TPI / Bureau Veritas" },
        { label: "Logistics", value: "Sea, road, last-mile" },
        { label: "Standards", value: "ASTM, EN, BS, JIS" },
        { label: "Lead time", value: "Stock + 4–10 weeks" },
      ],
    },
    projects: [
      { name: "Steel Supply for Process Plant", client: "EPC contractor", scope: "4,200 T structural steel + plates", year: "2024", image: imgTrading },
      { name: "PPE Annual Supply Contract", client: "Refinery operator", scope: "Site-wide FR clothing + safety", year: "2023", image: imgHse },
      { name: "MEP Supply for Industrial Park", client: "Developer, Jubail", scope: "Cables, panels, lighting", year: "2023", image: imgCapabilities },
    ],
    process: [
      { num: "01", title: "RFQ & Specification Review", desc: "Joint review of MTOs and specifications with the client procurement team." },
      { num: "02", title: "Sourcing & Vendor Selection", desc: "Vendor selection from approved list with QA history and lead-time guarantee." },
      { num: "03", title: "Inspection & Logistics", desc: "Third-party inspection at source, freight forwarding and customs clearance." },
      { num: "04", title: "Delivery & Documentation", desc: "On-site delivery with MTCs, COCs and full documentation handed to QA/QC." },
    ],
    certifications: ["ISO 9001:2015", "Bureau Veritas / SGS Inspection", "Saudi SASO Compliance", "Approved EPC Vendor List", "Manufacturer Authorizations"],
    faqs: [
      { q: "Can you supply against EPC and end-client approved vendor lists?", a: "Yes. We work with manufacturer authorizations and approved vendor lists for Aramco, SABIC and the major EPCs operating in the Kingdom." },
      { q: "Do you arrange third-party inspection at source?", a: "Yes. TPI through Bureau Veritas, SGS or client-nominated agencies is arranged at the manufacturer before shipment." },
      { q: "What documentation comes with delivered materials?", a: "Mill Test Certificates (MTCs), Certificates of Conformance (COCs), packing lists and inspection reports — all handed to the client QA/QC team on delivery." },
    ],
  },
];

export const getServiceBySlug = (slug: string) =>
  servicePages.find((s) => s.slug === slug);

export const getRelatedServices = (slug: string) =>
  servicePages.filter((s) => s.slug !== slug).slice(0, 3);
