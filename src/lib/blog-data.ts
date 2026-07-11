const newsEnergy = "/assets/news-energy.jpg";
const newsSafety = "/assets/news-safety.jpg";
const newsSupply = "/assets/news-supply-chain.jpg";
const projectCivil = "/assets/project-civil.jpg";
const projectPower = "/assets/project-power.jpg";
const projectEquip = "/assets/project-equipment.jpg";
const manpower = "/assets/manpower.jpg";
const hseImg = "/assets/hse-safety.jpg";
const industryOil = "/assets/industry-oilgas.jpg";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: "Insights" | "Case Study" | "Safety" | "Vision 2030" | "Industry";
  date: string;
  readMins: number;
  author: string;
  authorRole: string;
  image: string;
};

export const featuredPost: BlogPost = {
  slug: "novarise-vision-2030-megaprojects",
  title: "Inside Saudi Arabia's Megaproject Decade: How Vision 2030 is Reshaping Industrial Contracting",
  excerpt:
    "From NEOM to the Red Sea Project, the Kingdom's industrial ambition is rewriting the rules of EPC contracting. We unpack what this means for manpower, equipment, and supply chains over the next five years.",
  category: "Vision 2030",
  date: "May 12, 2026",
  readMins: 9,
  author: "Eng. Faisal Al-Mutairi",
  authorRole: "Chief Executive Officer",
  image: newsEnergy,
};

export const posts: BlogPost[] = [
  {
    slug: "zero-harm-culture-aramco-sites",
    title: "Building a Zero-Harm Culture on Aramco Sites: Lessons from 2.4M Manhours",
    excerpt:
      "Behind every LTI-free milestone is a system. Here's how NOVARISE engineers safety into daily site operations for tier-1 operators.",
    category: "Safety",
    date: "Apr 28, 2026",
    readMins: 7,
    author: "Saud Al-Harbi",
    authorRole: "HSE Director",
    image: hseImg,
  },
  {
    slug: "case-study-jubail-power-substation",
    title: "Case Study: Delivering a 132kV Substation in Jubail — 11 Days Ahead of Schedule",
    excerpt:
      "How an integrated team of 240 certified workers, owned cranes, and a parallel commissioning approach cut critical-path time by 14%.",
    category: "Case Study",
    date: "Apr 14, 2026",
    readMins: 6,
    author: "Mohammed Reza",
    authorRole: "Project Director",
    image: projectPower,
  },
  {
    slug: "heavy-equipment-rental-trends-2026",
    title: "The 2026 Heavy Equipment Rental Outlook for KSA's Industrial Belt",
    excerpt:
      "Manlift demand up 38%. Crawler crane utilization at 91%. A data-driven look at what megaproject contractors should plan for.",
    category: "Insights",
    date: "Apr 02, 2026",
    readMins: 5,
    author: "Khalid Al-Otaibi",
    authorRole: "Fleet Manager",
    image: projectEquip,
  },
  {
    slug: "certified-manpower-mobilization-72-hours",
    title: "From Request to Site in 72 Hours: Our Manpower Mobilization Playbook",
    excerpt:
      "Pre-cleared visas, in-house certification pipeline, and a 2,500-strong workforce — the operational stack behind rapid deployment.",
    category: "Insights",
    date: "Mar 21, 2026",
    readMins: 8,
    author: "Rashid Khan",
    authorRole: "Manpower Operations Lead",
    image: manpower,
  },
  {
    slug: "civil-construction-mega-foundations",
    title: "Engineering Mega-Foundations: Lessons from a 14,000m³ Industrial Pour",
    excerpt:
      "Continuous pour logistics, thermal control, and rebar coordination — what it takes to deliver a flawless mat foundation at scale.",
    category: "Case Study",
    date: "Mar 09, 2026",
    readMins: 7,
    author: "Eng. Anwar Siddiqui",
    authorRole: "Civil Construction Lead",
    image: projectCivil,
  },
  {
    slug: "oil-gas-shutdown-readiness",
    title: "Shutdown & Turnaround Readiness: A Tier-1 Vendor's Perspective",
    excerpt:
      "Mobilizing 600+ skilled workers for a 21-day turnaround window — how preparation, not heroics, defines success.",
    category: "Industry",
    date: "Feb 24, 2026",
    readMins: 6,
    author: "Eng. Faisal Al-Mutairi",
    authorRole: "Chief Executive Officer",
    image: industryOil,
  },
  {
    slug: "supply-chain-localization-vision-2030",
    title: "Supply Chain Localization: Sourcing Steel & Cement Inside the Kingdom",
    excerpt:
      "How in-Kingdom procurement is becoming a competitive moat — and what NOVARISE's trading division is doing to lead it.",
    category: "Vision 2030",
    date: "Feb 10, 2026",
    readMins: 5,
    author: "Ahmed Al-Saleh",
    authorRole: "Head of Trading",
    image: newsSupply,
  },
  {
    slug: "psm-process-safety-management",
    title: "Why Process Safety Management is the New Differentiator for KSA Contractors",
    excerpt:
      "Beyond LTIR: how PSM maturity is becoming a hard prequalification criterion for Aramco and SABIC vendors.",
    category: "Safety",
    date: "Jan 28, 2026",
    readMins: 6,
    author: "Saud Al-Harbi",
    authorRole: "HSE Director",
    image: newsSafety,
  },
];

export type EventItem = {
  title: string;
  type: "Conference" | "Exhibition" | "Site Visit" | "Webinar";
  date: string;
  dateShort: { day: string; month: string };
  location: string;
  description: string;
  status: "Upcoming" | "Past";
};

export const events: EventItem[] = [
  {
    title: "Saudi Construction Tech Summit 2026",
    type: "Conference",
    date: "June 18 – 20, 2026",
    dateShort: { day: "18", month: "JUN" },
    location: "Riyadh International Convention Center",
    description:
      "NOVARISE leadership will keynote on integrated megaproject delivery. Visit Booth A-42 for capability demos.",
    status: "Upcoming",
  },
  {
    title: "SABIC Vendor Excellence Forum",
    type: "Exhibition",
    date: "July 09, 2026",
    dateShort: { day: "09", month: "JUL" },
    location: "Jubail Industrial City",
    description:
      "Showcasing our manpower & equipment capabilities to SABIC procurement and project leadership teams.",
    status: "Upcoming",
  },
  {
    title: "Vision 2030 Industrial Localization Webinar",
    type: "Webinar",
    date: "August 05, 2026",
    dateShort: { day: "05", month: "AUG" },
    location: "Online — Live + On-demand",
    description:
      "A 45-minute panel discussion on in-Kingdom sourcing strategy, hosted by our Head of Trading.",
    status: "Upcoming",
  },
  {
    title: "Aramco IKTVA Forum 2026",
    type: "Exhibition",
    date: "September 22 – 24, 2026",
    dateShort: { day: "22", month: "SEP" },
    location: "Dhahran Expo",
    description:
      "Meet our team at the Kingdom's flagship localization forum. Pre-book a meeting with our BD leadership.",
    status: "Upcoming",
  },
];
