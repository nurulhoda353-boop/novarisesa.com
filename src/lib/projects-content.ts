// Extended bilingual content for project detail pages.
// Kept out of locale JSON to avoid bloat — rendered via i18n.language.

type Lang = "en" | "ar";
type LangText<T> = Record<Lang, T>;

export type ProjectContent = {
  long: LangText<string[]>;        // paragraphs
  highlights: LangText<string[]>;  // 4 bullets
};

export const projectContent: Record<string, ProjectContent> = {
  neom: {
    long: {
      en: [
        "NEOM is the boldest urban-development bet in modern history — a USD 500B+ greenfield region rising on Saudi Arabia's north-west coast. The masterplan spans The Line, Oxagon, Trojena and Sindalah, each demanding world-class contracting capacity and continuous mobilization of skilled labour at unprecedented scale.",
        "NOVARISE supports NEOM consortium contractors with multi-trade manpower, equipment and on-site supervision — from civil works and MEP to power, water and finishing trades — operating under NEOM's strict HSE, security and quality regimes.",
      ],
      ar: [
        "نيوم هو أجرأ رهان تنموي حضري في التاريخ الحديث — منطقة جديدة تتجاوز قيمتها 500 مليار دولار تنهض على الساحل الشمالي الغربي للمملكة العربية السعودية. تشمل الخطة الرئيسية ذا لاين وأوكساجون وتروجينا وسندالة، ويتطلب كل منها قدرة مقاولات عالمية وتعبئة مستمرة للعمالة الماهرة على نطاق غير مسبوق.",
        "تدعم نوفارايز مقاولي تحالف نيوم بعمالة متعددة التخصصات ومعدات وإشراف ميداني — من الأعمال المدنية والكهروميكانيكية إلى الطاقة والمياه والتشطيبات — بموجب أنظمة الصحة والسلامة والأمن والجودة الصارمة في نيوم.",
      ],
    },
    highlights: {
      en: ["Multi-trade workforce mobilization", "Civil, MEP & finishing crews", "24/7 site supervision", "Full HSE & security compliance"],
      ar: ["تعبئة عمالة متعددة التخصصات", "طواقم مدنية وكهروميكانيكية وتشطيبات", "إشراف ميداني على مدار الساعة", "التزام كامل بالسلامة والأمن"],
    },
  },
  jafurah: {
    long: {
      en: [
        "Jafurah is Saudi Aramco's flagship unconventional gas play — the Kingdom's largest shale gas field with an estimated 229 trillion cubic feet of raw gas reserves and a USD 100B development envelope. First gas was achieved in 2025, with phased capacity expansion targeting two billion standard cubic feet per day.",
        "Our scope covers permit-ready piping crews, mechanical fitters, welders (6G/GTAW), HSE officers and skilled operators for shutdown, turnaround and continuous operations across processing units, gas-treatment trains and pipeline corridors.",
      ],
      ar: [
        "حقل الجافورة هو المشروع الرئيسي لأرامكو السعودية للغاز غير التقليدي — أكبر حقل غاز صخري في المملكة باحتياطيات مقدرة بـ 229 تريليون قدم مكعب وغلاف تطوير قدره 100 مليار دولار. تم تحقيق أول غاز في 2025، مع توسعة طاقة مرحلية تستهدف ملياري قدم مكعب قياسي يوميًا.",
        "يشمل نطاقنا طواقم الأنابيب وفنيي التركيب الميكانيكي واللحامين (6G/GTAW) ومسؤولي السلامة والمشغلين المهرة لأعمال الإغلاق والإصلاح الشامل والعمليات المستمرة عبر وحدات المعالجة وقطارات معالجة الغاز وممرات الأنابيب.",
      ],
    },
    highlights: {
      en: ["6G/GTAW certified welders", "Permit receivers & fire watch", "Turnaround surge crews", "ARAMCO HSE-compliant"],
      ar: ["لحامون معتمدون 6G/GTAW", "مستلمو التصاريح ومراقبو الحريق", "طواقم زيادة لأعمال الإصلاح", "متوافقون مع سلامة أرامكو"],
    },
  },
  afif: {
    long: {
      en: [
        "Afif Solar PV is a 4.2 GW utility-scale renewable program under Saudi Arabia's PIF — comprising Afif 1 (1.8–2.4 GW) and Afif 2 (2.4 GW) deploying advanced single-axis tracking technology. At full output the project will power 1.5 million+ homes and deliver one of the lowest LCOEs in the region.",
        "NOVARISE supplies module installers, DC/AC electricians, tracker assembly teams, riggers and quality inspectors — scaling crews to thousands during peak installation windows while maintaining strict torque, polarity and HSE controls.",
      ],
      ar: [
        "مشروع عفيف للطاقة الشمسية الكهروضوئية بقدرة 4.2 جيجاواط هو برنامج طاقة متجددة على نطاق المرافق ضمن صندوق الاستثمارات العامة السعودي — يشمل عفيف 1 (1.8-2.4 جيجاواط) وعفيف 2 (2.4 جيجاواط) بنشر تقنية التتبع أحادي المحور المتقدمة. سيوفر المشروع الطاقة لأكثر من 1.5 مليون منزل.",
        "توفر نوفارايز فنيي تركيب الألواح والكهربائيين والمتسلقين ومفتشي الجودة — مع توسيع الطواقم لتصل إلى الآلاف خلال نوافذ التركيب الذروية مع الحفاظ على ضوابط صارمة للعزم والقطبية والسلامة.",
      ],
    },
    highlights: {
      en: ["Module & tracker installers", "DC/AC commissioning electricians", "Surge crews up to 2,000+", "Vision 2030 renewables"],
      ar: ["فنيو تركيب الألواح والمتتبعات", "كهربائيو التشغيل والتجهيز", "طواقم زيادة تصل إلى 2000+", "متجددات رؤية 2030"],
    },
  },
  redSeaAluminium: {
    long: {
      en: [
        "Red Sea Aluminium is a fully integrated downstream aluminium complex anchored in Yanbu, positioned by the Public Investment Fund as a strategic pillar of Saudi industrial diversification. Operations target high-value downstream products for automotive, packaging and construction sectors from 2026 onward.",
        "Our delivery scope covers smelter potline labour, rolling-mill operators, casting-house technicians, HVAC and instrumentation crews, plus rigorous safety stewards for a 24/7 hot-metal environment.",
      ],
      ar: [
        "مجمع البحر الأحمر للألمنيوم هو مجمع ألمنيوم متكامل لمعالجة المنتجات النهائية يقع في ينبع، يضعه صندوق الاستثمارات العامة كركيزة استراتيجية للتنويع الصناعي السعودي. تستهدف العمليات منتجات نهائية عالية القيمة لقطاعات السيارات والتعبئة والتغليف والبناء بدءًا من عام 2026.",
        "يغطي نطاق التسليم لدينا عمالة خط إنتاج المصاهر ومشغلي مطاحن الدرفلة وفنيي بيت الصب وطواقم التكييف والأدوات، بالإضافة إلى مشرفي السلامة الصارمين لبيئة المعدن الساخن على مدار 24/7.",
      ],
    },
    highlights: {
      en: ["Potline & casting operators", "Hot-metal HSE stewardship", "Rolling-mill technicians", "PIF strategic delivery"],
      ar: ["مشغلو خط الإنتاج والصب", "إشراف سلامة المعدن الساخن", "فنيو مطاحن الدرفلة", "تسليم استراتيجي PIF"],
    },
  },
  durma: {
    long: {
      en: [
        "Durma PP12 is the 1,863 MW combined-cycle expansion of Riyadh's flagship Power Plant 12, central to Saudi Electricity Company's drive to diversify generation sources and strengthen grid reliability through the Vision 2030 horizon.",
        "We supply mechanical erection crews, GTG/STG technicians, BoP electricians and commissioning specialists with documented experience on Siemens and GE heavy-frame turbines.",
      ],
      ar: [
        "محطة الدرمة PP12 هي توسعة الدورة المركبة بقدرة 1863 ميجاواط لمحطة الكهرباء الرئيسية رقم 12 في الرياض، وهي محورية في مساعي الشركة السعودية للكهرباء لتنويع مصادر التوليد وتعزيز موثوقية الشبكة.",
        "نوفر طواقم التركيب الميكانيكي وفنيي توربينات الغاز والبخار وكهربائيي توازن المحطة ومتخصصي التشغيل والتجهيز ذوي الخبرة الموثقة على توربينات سيمنز و GE.",
      ],
    },
    highlights: {
      en: ["GTG/STG erection teams", "BoP & switchyard crews", "Commissioning specialists", "SEC Vision 2030 partner"],
      ar: ["طواقم تركيب توربينات GTG/STG", "طواقم BoP والمحطات الفرعية", "متخصصو التشغيل والتجهيز", "شريك رؤية 2030 لـ SEC"],
    },
  },
  taiba1: {
    long: {
      en: [
        "Taiba 1 IPP is an 1,800 MW combined-cycle gas turbine project in Madinah developed by the ACWA Power and SEC consortium under a 25-year PPA — a cornerstone of the Kingdom's decarbonization roadmap.",
        "NOVARISE provides multi-disciplinary construction manpower, scaffolding teams and certified safety personnel through the full EPC lifecycle.",
      ],
      ar: [
        "محطة طيبة 1 المستقلة لإنتاج الكهرباء هي مشروع توربينات غاز ذات دورة مركبة بقدرة 1800 ميجاواط في المدينة المنورة طورها تحالف أكوا باور والشركة السعودية للكهرباء بموجب اتفاقية شراء طاقة لمدة 25 عامًا.",
        "توفر نوفارايز عمالة بناء متعددة التخصصات وطواقم سقالات وأفراد سلامة معتمدين خلال دورة حياة EPC الكاملة.",
      ],
    },
    highlights: {
      en: ["EPC multi-discipline labour", "Scaffolding & insulation teams", "QA/QC inspectors", "25-year PPA project"],
      ar: ["عمالة EPC متعددة التخصصات", "طواقم السقالات والعزل", "مفتشو ضمان الجودة", "مشروع اتفاقية لمدة 25 عامًا"],
    },
  },
  rumah1: {
    long: {
      en: [
        "Rumah 1 is a USD 2B, 1,800 MW CCGT plant under construction in Riyadh Province by Remal Energy (ACWA Power · SEC · KEPCO), scheduled for completion around 2028.",
        "We mobilize civil-mechanical-electrical crews, formwork carpenters, structural fitters and instrumentation technicians under the project's tight schedule milestones.",
      ],
      ar: [
        "مشروع الرماح 1 هو محطة CCGT بقدرة 1800 ميجاواط واستثمار 2 مليار دولار قيد الإنشاء في منطقة الرياض من قبل رمال للطاقة (أكوا · SEC · KEPCO)، ومن المقرر اكتماله حوالي 2028.",
        "نحن نعبئ طواقم مدنية وميكانيكية وكهربائية ونجاري قوالب وفنيي تركيب هيكلي وفنيي أدوات وفقًا لمعالم الجدول الزمني الضيقة للمشروع.",
      ],
    },
    highlights: {
      en: ["CME multi-discipline crews", "Tight schedule mobilization", "Formwork & rebar teams", "ACWA · SEC · KEPCO delivery"],
      ar: ["طواقم CME متعددة التخصصات", "تعبئة وفق جدول ضيق", "طواقم القوالب والحديد", "تسليم ACWA · SEC · KEPCO"],
    },
  },
  qassim1: {
    long: {
      en: [
        "Qassim 1 IPP is an 1,800 MW combined-cycle gas turbine project developed by ACWA Power in Al-Qassim, contributing to Saudi Arabia's baseload diversification.",
        "Our role includes erection, alignment and pre-commissioning labour packages with full traceability and ITP-driven QA.",
      ],
      ar: [
        "محطة القصيم 1 المستقلة لإنتاج الكهرباء هي مشروع توربينات غاز بدورة مركبة بقدرة 1800 ميجاواط طورته أكوا باور في القصيم، مساهمًا في تنويع الحمل الأساسي للمملكة العربية السعودية.",
        "يشمل دورنا حزم عمالة التركيب والمحاذاة وما قبل التشغيل والتجهيز مع التتبع الكامل وضمان الجودة وفق ITP.",
      ],
    },
    highlights: {
      en: ["Erection & alignment crews", "Pre-commissioning labour", "ITP-driven QA", "ACWA Power scope"],
      ar: ["طواقم التركيب والمحاذاة", "عمالة ما قبل التشغيل", "ضمان جودة وفق ITP", "نطاق أكوا باور"],
    },
  },
  nairiyah1: {
    long: {
      en: [
        "Nairiyah 1 IPP is an 1,800 MW CCGT project in the Eastern Province developed by ACWA Power — supporting the Kingdom's eastern grid demand.",
        "We deliver structural steel erectors, pipe-fitters, mechanical millwrights and certified scaffolders to the EPC contractor under stringent HSE protocols.",
      ],
      ar: [
        "محطة النعيرية 1 المستقلة هي مشروع CCGT بقدرة 1800 ميجاواط في المنطقة الشرقية طورته أكوا باور — لدعم الطلب على الشبكة الشرقية في المملكة.",
        "نقدم منشئي الهياكل الفولاذية وفنيي الأنابيب والميكانيكيين ومركبي السقالات المعتمدين لمقاول EPC وفق بروتوكولات صحة وسلامة صارمة.",
      ],
    },
    highlights: {
      en: ["Structural steel erectors", "Pipe-fitters & millwrights", "Certified scaffolders", "Eastern Province grid"],
      ar: ["منشئو الهياكل الفولاذية", "فنيو الأنابيب والميكانيكيون", "مركبو سقالات معتمدون", "شبكة المنطقة الشرقية"],
    },
  },
  yanbu3: {
    long: {
      en: [
        "Yanbu-3 is an operational oil-fired power generation and large-scale desalination complex on the Red Sea, run by the Saline Water Conversion Corporation — a critical piece of Western Region water and power security.",
        "NOVARISE supports operations and maintenance with shutdown crews, plant operators, mechanical fitters and instrumentation technicians on a continuous rotation.",
      ],
      ar: [
        "ينبع 3 هو مجمع تشغيلي لتوليد الطاقة بالوقود وتحلية المياه على نطاق واسع على البحر الأحمر، تديره المؤسسة العامة لتحلية المياه المالحة — جزء حاسم من أمن المياه والطاقة في المنطقة الغربية.",
        "تدعم نوفارايز عمليات التشغيل والصيانة بطواقم الإغلاق ومشغلي المحطات والميكانيكيين وفنيي الأدوات على دوران مستمر.",
      ],
    },
    highlights: {
      en: ["Shutdown & turnaround crews", "Plant operators (O&M)", "Mechanical & I&C fitters", "SWCC operational support"],
      ar: ["طواقم الإغلاق والإصلاح", "مشغلو المحطات (O&M)", "فنيو الميكانيكا والتحكم", "دعم تشغيلي لـ SWCC"],
    },
  },
  amaala: {
    long: {
      en: [
        "AMAALA is Saudi Arabia's ultra-luxury wellness giga-destination on the north-western Red Sea coast, developed by Red Sea Global under PIF. Spanning 4,200 km² inside the Prince Mohammed bin Salman Nature Reserve, its three communities — Triple Bay, Coastal Development and The Island — deliver 25+ luxury hotels, a marina, yacht club and a dedicated international airport.",
        "NOVARISE supports EPC contractors across AMAALA with multi-trade manpower — civil, MEP, finishing, marine works and hospitality fit-out crews — operating under Red Sea Global's strict environmental, HSE and security regime.",
      ],
      ar: [
        "أمالا هي وجهة المملكة العملاقة الفاخرة للعافية على الساحل الشمالي الغربي للبحر الأحمر، تطورها البحر الأحمر العالمية تحت مظلة صندوق الاستثمارات العامة. تمتد على 4,200 كم² داخل محمية الأمير محمد بن سلمان الملكية، وتقدم مجتمعاتها الثلاث — الخليج الثلاثي والتطوير الساحلي والجزيرة — أكثر من 25 فندقًا فاخرًا ومارينا ونادي يخوت ومطارًا دوليًا مخصصًا.",
        "تدعم نوفارايز مقاولي EPC عبر أمالا بعمالة متعددة التخصصات — أعمال مدنية وكهروميكانيكية وتشطيبات وأعمال بحرية وطواقم تجهيز ضيافة — تعمل وفق النظام البيئي والسلامة والأمن الصارم للبحر الأحمر العالمية.",
      ],
    },
    highlights: {
      en: ["Marine & coastal works crews", "Hospitality fit-out teams", "MEP & finishing trades", "Environmental compliance"],
      ar: ["طواقم الأعمال البحرية والساحلية", "فرق تجهيز الضيافة", "أعمال كهروميكانيكية وتشطيبات", "التزام بيئي كامل"],
    },
  },
  redSeaGlobal: {
    long: {
      en: [
        "The Red Sea Destination is Red Sea Global's flagship regenerative-tourism giga-project — 50 luxury resorts across 90+ pristine islands and 200 km of Red Sea coastline, entirely powered by renewable energy and operating off-grid. Phase One resorts opened from 2023 with full build-out targeted by 2030.",
        "NOVARISE deploys marine construction crews, over-water villa erectors, MEP technicians and hospitality finishing teams — all inducted into Red Sea Global's marine-life protection and zero-carbon operating standards.",
      ],
      ar: [
        "وجهة البحر الأحمر هي المشروع العملاق الرائد للبحر الأحمر العالمية للسياحة التجديدية — 50 منتجعًا فاخرًا عبر أكثر من 90 جزيرة بكر و200 كم من ساحل البحر الأحمر، تعمل بالكامل على الطاقة المتجددة وخارج الشبكة. افتتحت منتجعات المرحلة الأولى من 2023 مع اكتمال البناء بحلول 2030.",
        "تنشر نوفارايز طواقم البناء البحري ومنشئي الفلل المائية وفنيي الأعمال الكهروميكانيكية وفرق تشطيبات الضيافة — جميعهم مؤهلون وفق معايير حماية الحياة البحرية وصفر انبعاثات كربونية.",
      ],
    },
    highlights: {
      en: ["Over-water villa erectors", "Marine construction crews", "Renewable-power electricians", "Zero-carbon compliance"],
      ar: ["منشئو الفلل المائية", "طواقم البناء البحري", "كهربائيو الطاقة المتجددة", "التزام صفر كربوني"],
    },
  },
};

export const projectFaq: Record<"en" | "ar", { q: string; a: string }[]> = {
  en: [
    {
      q: "How quickly can NOVARISE mobilize crews to this project?",
      a: "Standard mobilization runs 7–21 days for KSA-resident workforce and 30–60 days for fresh overseas deployments, depending on visa class and trade certifications required.",
    },
    {
      q: "Which trades and certifications do you typically supply?",
      a: "We deliver welders (6G/GTAW), pipe-fitters, riggers, scaffolders, civil/MEP crews, plant operators, HSE officers and supervisors — all with Aramco/SEC-aligned certifications and medical fitness records.",
    },
    {
      q: "How do you ensure HSE and quality compliance on site?",
      a: "Every deployed worker completes pre-mobilization HSE induction, carries third-party certifications (OSHA, IOSH, NEBOSH where applicable) and operates under our documented ITP, method statements and toolbox-talk regime.",
    },
    {
      q: "Can you scale crew size during peak construction windows?",
      a: "Yes — our regional pipeline supports surge mobilization to thousands of workers within weeks. We pre-screen and bench-qualify pools for known megaprojects so peak ramps stay schedule-compliant.",
    },
    {
      q: "How is invoicing, payroll and accommodation handled?",
      a: "We manage the full employer-of-record stack: salaries, GOSI, medical insurance, iqama, accommodation and transport — invoiced to the contractor on agreed milestones with full audit trails.",
    },
  ],
  ar: [
    {
      q: "ما مدى سرعة تعبئة نوفارايز للطواقم لهذا المشروع؟",
      a: "التعبئة القياسية تستغرق 7-21 يومًا للعمالة المقيمة في المملكة و30-60 يومًا للنشرات الجديدة من الخارج، حسب فئة التأشيرة وشهادات المهنة المطلوبة.",
    },
    {
      q: "ما المهن والشهادات التي توفرونها عادةً؟",
      a: "نوفر لحامين (6G/GTAW) وفنيي أنابيب ورافعين ومركبي سقالات وطواقم مدنية وكهروميكانيكية ومشغلي محطات ومسؤولي سلامة ومشرفين — جميعهم بشهادات متوافقة مع أرامكو/SEC وسجلات لياقة طبية.",
    },
    {
      q: "كيف تضمنون التزام السلامة والجودة في الموقع؟",
      a: "كل عامل منشور يكمل تأهيل السلامة قبل التعبئة، ويحمل شهادات من أطراف ثالثة (OSHA، IOSH، NEBOSH حسب الاقتضاء)، ويعمل وفق ITP الموثق وبيانات الطرق ونظام محادثات الأدوات.",
    },
    {
      q: "هل يمكنكم توسيع حجم الطاقم خلال نوافذ البناء الذروية؟",
      a: "نعم — يدعم خط أنابيبنا الإقليمي تعبئة الذروة إلى آلاف العمال خلال أسابيع. نقوم بالفحص المسبق وتأهيل المخزونات لمشاريع الميجا المعروفة.",
    },
    {
      q: "كيف يتم التعامل مع الفواتير والرواتب والإقامة؟",
      a: "نحن ندير حزمة صاحب العمل المسجل بالكامل: الرواتب، GOSI، التأمين الطبي، الإقامة، السكن والنقل — مفوترة للمقاول وفق المعالم المتفق عليها مع مسارات تدقيق كاملة.",
    },
  ],
};
