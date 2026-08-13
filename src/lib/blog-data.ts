const newsEnergy = "/assets/news-energy.jpg";
const newsSafety = "/assets/news-safety.jpg";
const projectPower = "/assets/project-power.jpg";
const projectEquip = "/assets/project-equipment.jpg";
const manpower = "/assets/manpower.jpg";
const projectCivil = "/assets/project-civil.jpg";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: "Insights" | "Case Study" | "Safety" | "Vision 2030" | "Industry";
  date: string;
  publishedOn: string;
  readMins: number;
  author: string;
  authorRole: string;
  image: string;
  paragraphs: string[];
  keyTakeaways: string[];
  pullQuote?: string;
  isFeatured?: boolean;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "novarise-vision-2030-megaprojects",
    title: "Inside Saudi Arabia's Megaproject Decade: How Vision 2030 Is Reshaping Industrial Contracting",
    excerpt: "From NEOM to the Red Sea, the Kingdom's industrial ambition is rewriting the rules of EPC contracting, workforce planning and supply-chain readiness.",
    category: "Vision 2030",
    date: "May 12, 2026",
    publishedOn: "2026-05-12",
    readMins: 9,
    author: "Eng. Faisal Al-Mutairi",
    authorRole: "Chief Executive Officer",
    image: newsEnergy,
    isFeatured: true,
    paragraphs: [
      "Saudi Arabia's megaproject programme is not simply creating more construction volume. It is changing how industrial delivery partners plan people, equipment and materials across multiple years, locations and disciplines.",
      "For contractors, the decisive capability is now orchestration. A project may need civil teams, certified electrical trades, lifting equipment and local procurement to arrive as one coordinated package rather than as disconnected purchase orders.",
      "That shift rewards organisations with verified talent pools, owned or controlled equipment fleets and reliable in-Kingdom supplier networks. Mobilisation speed still matters, but predictable quality and transparent reporting matter just as much.",
      "NOVARISE is building around that reality: integrated contracting support, disciplined HSE systems and delivery teams that can scale without losing site-level control.",
    ],
    keyTakeaways: [
      "Integrated delivery is replacing fragmented subcontracting.",
      "Local supply chains are becoming a strategic project advantage.",
      "Workforce readiness must be planned months—not days—ahead.",
    ],
    pullQuote: "The next decade will be won by delivery partners that can scale capacity without compromising control.",
  },
  {
    slug: "zero-harm-culture-aramco-sites",
    title: "Building a Zero-Harm Culture on Aramco Sites: Lessons from 2.4M Manhours",
    excerpt: "Behind every LTI-free milestone is a system. Here is how NOVARISE engineers safety into daily site operations for tier-one operators.",
    category: "Safety",
    date: "April 28, 2026",
    publishedOn: "2026-04-28",
    readMins: 7,
    author: "Saud Al-Harbi",
    authorRole: "HSE Director",
    image: newsSafety,
    paragraphs: [
      "A zero-harm culture is not produced by posters or milestone celebrations. It is built through hundreds of small decisions made before a worker enters the task area.",
      "Our operating rhythm starts with role-specific induction, verified competency and a toolbox conversation tied to the actual workfront. Supervisors then close the loop through field observations and immediate corrective action.",
      "Leading indicators are treated as operational data. Near misses, permit quality, housekeeping and intervention frequency reveal risk long before an incident appears in a monthly report.",
      "The result is a culture where stopping unsafe work is viewed as professional responsibility, and where every crew member understands that schedule pressure never overrides control measures.",
    ],
    keyTakeaways: ["Competency verification comes before mobilisation.", "Leading indicators expose risk earlier than injury statistics.", "Supervisors make safety culture visible at the workfront."],
    pullQuote: "Safety becomes culture when the safest decision is also the easiest decision to make on site.",
  },
  {
    slug: "case-study-jubail-power-substation",
    title: "Case Study: Delivering a 132kV Substation in Jubail—11 Days Ahead of Schedule",
    excerpt: "How an integrated team of 240 certified workers, owned cranes and parallel commissioning cut critical-path time by fourteen percent.",
    category: "Case Study",
    date: "April 14, 2026",
    publishedOn: "2026-04-14",
    readMins: 6,
    author: "Mohammed Reza",
    authorRole: "Project Director",
    image: projectPower,
    paragraphs: [
      "The Jubail substation programme entered construction with a fixed energisation window and very little tolerance for late handover. Traditional sequential delivery would not protect the milestone.",
      "NOVARISE aligned civil, electrical and lifting teams around a single constraint plan. Equipment foundations, cable routes and steel installation were released in controlled zones so disciplines could advance in parallel.",
      "Daily coordination combined look-ahead planning with materials assurance and permit readiness. Issues were assigned an owner and closure time during the same shift, preventing minor constraints from reaching the critical path.",
      "The project reached mechanical completion eleven days early while maintaining the client's quality and HSE requirements—a result created by coordination rather than last-minute acceleration.",
    ],
    keyTakeaways: ["Zone-based releases enabled safe parallel working.", "Owned lifting capacity protected the installation sequence.", "Daily constraint closure preserved the energisation milestone."],
  },
  {
    slug: "heavy-equipment-rental-trends-2026",
    title: "The 2026 Heavy Equipment Rental Outlook for KSA's Industrial Belt",
    excerpt: "Manlift demand is rising, crawler-crane utilisation is tightening and megaproject contractors need earlier fleet planning.",
    category: "Insights",
    date: "April 2, 2026",
    publishedOn: "2026-04-02",
    readMins: 5,
    author: "Khalid Al-Otaibi",
    authorRole: "Fleet Manager",
    image: projectEquip,
    paragraphs: [
      "Equipment availability across the Kingdom's industrial belt is becoming a planning issue rather than a procurement issue. High-utilisation categories can no longer be sourced reliably at the point of need.",
      "Access equipment, crawler cranes and specialised material-handling units are seeing longer reservation windows as major programmes overlap. Contractors that forecast by workfront are securing better-fit machines and avoiding costly substitutions.",
      "Utilisation alone does not tell the full story. Certification currency, maintenance response, operator competency and transport permits determine whether a machine is truly available to the project.",
      "The practical response is an integrated fleet plan connected to the construction schedule, with contingency capacity identified before peak demand arrives.",
    ],
    keyTakeaways: ["Reserve constrained equipment against the workfront plan.", "Measure readiness—not just physical availability.", "Build transport and operator requirements into fleet forecasting."],
  },
  {
    slug: "certified-manpower-mobilization-72-hours",
    title: "From Request to Site in 72 Hours: Our Manpower Mobilisation Playbook",
    excerpt: "Pre-cleared documentation, an in-house certification pipeline and a ready workforce make rapid deployment repeatable.",
    category: "Insights",
    date: "March 21, 2026",
    publishedOn: "2026-03-21",
    readMins: 8,
    author: "Rashid Khan",
    authorRole: "Manpower Operations Lead",
    image: manpower,
    paragraphs: [
      "Rapid mobilisation starts long before a client sends a requirement. Trade records, documents, medical status and site approvals must already be visible in a structured readiness pipeline.",
      "When a request arrives, our team matches competency, location and approval criteria before contacting candidates. This prevents speed from creating rework during client verification.",
      "Parallel processing is the key: commercial confirmation, travel planning, PPE allocation and site onboarding move together under one mobilisation owner.",
      "The 72-hour target is therefore not a heroic exception. For qualified pools and confirmed site conditions, it is the output of a repeatable operating system.",
    ],
    keyTakeaways: ["Maintain verified talent pools by trade and approval.", "Run documentation, logistics and onboarding in parallel.", "Give every mobilisation one accountable owner."],
  },
  {
    slug: "civil-construction-mega-foundations",
    title: "Engineering Mega-Foundations: Lessons from a 14,000m³ Industrial Pour",
    excerpt: "Continuous-pour logistics, thermal control and rebar coordination—what it takes to deliver a flawless mat foundation at scale.",
    category: "Case Study",
    date: "March 9, 2026",
    publishedOn: "2026-03-09",
    readMins: 7,
    author: "Eng. Anwar Siddiqui",
    authorRole: "Civil Construction Lead",
    image: projectCivil,
    paragraphs: [
      "A 14,000-cubic-metre foundation pour behaves more like a live production system than a conventional concrete activity. Supply continuity, temperature and access must remain controlled for the entire operation.",
      "The team modelled batching capacity, truck cycles, standby routes and pump coverage against the hourly placement curve. Critical spares and backup power were positioned before the first load arrived.",
      "Embedded items and dense reinforcement were jointly inspected by civil, MEP and quality teams. This reduced stoppages and protected the design clearances needed during continuous placement.",
      "Thermal sensors then guided the curing strategy and verified that temperature differentials remained within the engineered limits through the early-age cycle.",
    ],
    keyTakeaways: ["Treat mass concrete as a continuous production operation.", "Design redundancy into batching, pumping and access.", "Coordinate embedded systems before the pour window opens."],
  },
];

export const featuredPost = blogPosts[0];
export const posts = blogPosts.slice(1);

export type EventStatus = "Upcoming" | "Past";

export type EventAgendaItem = { time: string; title: string; description: string };

export type EventItem = {
  slug: string;
  title: string;
  type: "Conference" | "Exhibition" | "Site Visit" | "Webinar";
  startsOn: string;
  endsOn: string;
  date: string;
  dateShort: { day: string; month: string };
  time: string;
  location: string;
  venue: string;
  description: string;
  image: string;
  status: EventStatus;
  isFeatured?: boolean;
  overview: string[];
  agenda: EventAgendaItem[];
  takeaways: string[];
};

export const events: EventItem[] = [
  {
    slug: "aramco-iktva-forum-2026",
    title: "Aramco IKTVA Forum 2026",
    type: "Exhibition",
    startsOn: "2026-09-22",
    endsOn: "2026-09-24",
    date: "September 22–24, 2026",
    dateShort: { day: "22", month: "SEP" },
    time: "9:00 AM–6:00 PM",
    location: "Dhahran, Saudi Arabia",
    venue: "Dhahran Expo",
    description: "Meet NOVARISE at the Kingdom's flagship localisation forum and explore integrated Saudi supply-chain and contracting capability.",
    image: "/assets/vision-skyline.jpg",
    status: "Upcoming",
    isFeatured: true,
    overview: [
      "The IKTVA Forum brings operators, manufacturers and delivery partners together around the future of in-Kingdom value creation.",
      "NOVARISE will present a practical model connecting local procurement, certified manpower and industrial contracting into one accountable delivery chain.",
    ],
    agenda: [
      { time: "10:00 AM", title: "Localisation briefing", description: "A concise view of our Saudi supplier and workforce development roadmap." },
      { time: "1:00 PM", title: "Capability demonstrations", description: "Meet discipline leads and review live delivery case studies." },
      { time: "4:00 PM", title: "Leadership meetings", description: "Pre-booked discussions for EPC, procurement and project teams." },
    ],
    takeaways: ["Meet NOVARISE leadership", "Review local delivery capabilities", "Discuss live project requirements"],
  },
  {
    slug: "future-projects-and-industrial-delivery-forum",
    title: "Future Projects & Industrial Delivery Forum",
    type: "Conference",
    startsOn: "2026-10-19",
    endsOn: "2026-10-20",
    date: "October 19–20, 2026",
    dateShort: { day: "19", month: "OCT" },
    time: "8:30 AM–5:30 PM",
    location: "Riyadh, Saudi Arabia",
    venue: "King Abdullah Financial District Conference Centre",
    description: "A two-day leadership forum on scaling delivery capacity across Saudi Arabia's next wave of industrial and infrastructure programmes.",
    image: "/assets/hero-industrial.jpg",
    status: "Upcoming",
    overview: [
      "Project leaders are entering a delivery cycle defined by concurrent programmes and shared resource constraints. The forum focuses on the operating models needed to manage that complexity.",
      "NOVARISE will contribute field evidence on mobilisation readiness, equipment planning and multi-discipline coordination across industrial workfronts.",
    ],
    agenda: [
      { time: "9:30 AM", title: "Capacity at scale", description: "Panel discussion on people, plant and supply-chain constraints." },
      { time: "12:30 PM", title: "Delivery case study", description: "How integrated planning protects critical milestones." },
      { time: "3:30 PM", title: "Executive roundtable", description: "An invitation-only discussion for project and procurement leaders." },
    ],
    takeaways: ["Practical capacity-planning frameworks", "Peer insight from major programmes", "Direct access to delivery specialists"],
  },
  {
    slug: "zero-harm-leadership-masterclass",
    title: "Zero-Harm Leadership Masterclass",
    type: "Webinar",
    startsOn: "2026-11-12",
    endsOn: "2026-11-12",
    date: "November 12, 2026",
    dateShort: { day: "12", month: "NOV" },
    time: "2:00–3:15 PM AST",
    location: "Online · Live + On-demand",
    venue: "Microsoft Teams Live",
    description: "A practical masterclass for supervisors and project leaders on turning HSE expectations into consistent workfront behaviour.",
    image: "/assets/hse-safety.jpg",
    status: "Upcoming",
    overview: [
      "Safety performance changes when leaders translate policy into observable routines. This session focuses on the daily conversations and controls that shape behaviour at the workfront.",
      "Participants will leave with a compact leadership framework that can be applied immediately across construction, shutdown and maintenance teams.",
    ],
    agenda: [
      { time: "2:00 PM", title: "Leading indicators", description: "What supervisors should see, ask and record every shift." },
      { time: "2:25 PM", title: "Intervention culture", description: "Making stop-work responsibility practical and trusted." },
      { time: "2:55 PM", title: "Live Q&A", description: "Questions with NOVARISE HSE leadership." },
    ],
    takeaways: ["A repeatable field-leadership routine", "Better leading-indicator conversations", "Live access to NOVARISE HSE specialists"],
  },
  {
    slug: "vision-2030-industrial-localization-webinar",
    title: "Vision 2030 Industrial Localisation Webinar",
    type: "Webinar",
    startsOn: "2026-08-05",
    endsOn: "2026-08-05",
    date: "August 5, 2026",
    dateShort: { day: "05", month: "AUG" },
    time: "3:00–3:45 PM AST",
    location: "Online",
    venue: "Live broadcast",
    description: "A leadership panel on building resilient in-Kingdom sourcing strategies for fast-moving industrial programmes.",
    image: "/assets/news-supply-chain.jpg",
    status: "Past",
    overview: ["This focused webinar explored how localisation targets can strengthen delivery rather than become a compliance exercise.", "The panel connected supplier development, demand visibility and quality assurance into a practical sourcing roadmap."],
    agenda: [
      { time: "3:00 PM", title: "Market context", description: "The localisation opportunity across Saudi industrial programmes." },
      { time: "3:15 PM", title: "Delivery playbook", description: "How to qualify and scale local suppliers responsibly." },
      { time: "3:35 PM", title: "Audience Q&A", description: "Questions from procurement and project leaders." },
    ],
    takeaways: ["Localisation as delivery resilience", "Supplier qualification priorities", "Demand visibility across the project lifecycle"],
  },
  {
    slug: "sabic-vendor-excellence-forum",
    title: "SABIC Vendor Excellence Forum",
    type: "Exhibition",
    startsOn: "2026-07-09",
    endsOn: "2026-07-09",
    date: "July 9, 2026",
    dateShort: { day: "09", month: "JUL" },
    time: "9:00 AM–4:30 PM",
    location: "Jubail Industrial City",
    venue: "Jubail Industrial Convention Hall",
    description: "NOVARISE showcased integrated manpower, equipment and contracting capabilities to procurement and project leadership teams.",
    image: "/assets/project-equipment.jpg",
    status: "Past",
    overview: ["The forum created direct dialogue between SABIC stakeholders and delivery partners supporting the Kingdom's industrial base.", "Our team demonstrated how one coordinated service model reduces interfaces between workforce, equipment and site execution."],
    agenda: [
      { time: "10:00 AM", title: "Capability showcase", description: "Integrated service demonstrations and project examples." },
      { time: "12:00 PM", title: "Procurement exchange", description: "Discussion of vendor-readiness and localisation priorities." },
      { time: "2:30 PM", title: "Technical meetings", description: "Discipline-level conversations with NOVARISE specialists." },
    ],
    takeaways: ["Stronger client-vendor alignment", "Clearer prequalification pathways", "New collaboration opportunities"],
  },
  {
    slug: "saudi-construction-tech-summit-2026",
    title: "Saudi Construction Tech Summit 2026",
    type: "Conference",
    startsOn: "2026-06-18",
    endsOn: "2026-06-20",
    date: "June 18–20, 2026",
    dateShort: { day: "18", month: "JUN" },
    time: "9:00 AM–6:00 PM",
    location: "Riyadh, Saudi Arabia",
    venue: "Riyadh International Convention Center",
    description: "NOVARISE shared an integrated megaproject-delivery model and hosted capability demonstrations at Booth A-42.",
    image: "/assets/vision-team.jpg",
    status: "Past",
    overview: ["The summit connected construction technology with the operating disciplines needed to deliver complex programmes at scale.", "NOVARISE presented lessons from field mobilisation, equipment coordination and digital workfront reporting."],
    agenda: [
      { time: "10:30 AM", title: "Leadership keynote", description: "Integrated capacity for the megaproject decade." },
      { time: "1:00 PM", title: "Booth demonstrations", description: "Capability, fleet and mobilisation workflows." },
      { time: "4:00 PM", title: "Project clinics", description: "Focused sessions with attending EPC teams." },
    ],
    takeaways: ["Connected planning across delivery disciplines", "Technology grounded in field operations", "New EPC and supplier relationships"],
  },
];

export function eventStatus(event: Pick<EventItem, "endsOn">, now = new Date()): EventStatus {
  const end = new Date(`${event.endsOn}T23:59:59`);
  return end.getTime() < now.getTime() ? "Past" : "Upcoming";
}

export function selectEventPreview(items: EventItem[], limit = 3, now = new Date()): EventItem[] {
  const normalized = items.map((event) => ({ ...event, status: eventStatus(event, now) }));
  const upcoming = normalized
    .filter((event) => event.status === "Upcoming")
    .sort((a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime());
  const past = normalized
    .filter((event) => event.status === "Past")
    .sort((a, b) => new Date(b.endsOn).getTime() - new Date(a.endsOn).getTime());
  return [...upcoming, ...past].slice(0, limit);
}
