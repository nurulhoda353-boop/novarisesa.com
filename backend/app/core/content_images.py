DEFAULT_CONTENT_IMAGES: dict[str, dict[str, str]] = {
    "services": {
        "civil": "/assets/project-civil.jpg",
        "power": "/assets/project-power.jpg",
        "rental": "/assets/project-equipment.jpg",
        "manpower": "/assets/manpower.jpg",
        "it": "/assets/vision-team.jpg",
        "trading": "/assets/industry-oilgas.jpg",
    },
    "projects": {
        slug: f"/assets/projects/{slug}.jpg"
        for slug in (
            "neom",
            "red-sea-global",
            "amaala",
            "jafurah",
            "afif",
            "red-sea-aluminium",
            "durma-pp12",
            "taiba-1",
            "rumah-1",
            "qassim-1",
            "nairiyah-1",
            "yanbu-3",
        )
    },
    "posts": {
        "novarise-vision-2030-megaprojects": "/assets/news-energy.jpg",
        "zero-harm-culture-aramco-sites": "/assets/news-safety.jpg",
        "case-study-jubail-power-substation": "/assets/project-power.jpg",
        "heavy-equipment-rental-trends-2026": "/assets/project-equipment.jpg",
        "certified-manpower-mobilization-72-hours": "/assets/manpower.jpg",
        "civil-construction-mega-foundations": "/assets/project-civil.jpg",
    },
    "events": {
        "aramco-iktva-forum-2026": "/assets/vision-skyline.jpg",
        "future-projects-and-industrial-delivery-forum": "/assets/hero-industrial.jpg",
        "zero-harm-leadership-masterclass": "/assets/hse-safety.jpg",
        "vision-2030-industrial-localization-webinar": "/assets/news-supply-chain.jpg",
        "sabic-vendor-excellence-forum": "/assets/project-equipment.jpg",
        "saudi-construction-tech-summit-2026": "/assets/vision-team.jpg",
    },
}


def default_content_image(resource: str, slug: str) -> str | None:
    return DEFAULT_CONTENT_IMAGES.get(resource, {}).get(slug)
