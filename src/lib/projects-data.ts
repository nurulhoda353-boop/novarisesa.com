const neom = "/assets/projects/neom.jpg";
const jafurah = "/assets/projects/jafurah.jpg";
const afif = "/assets/projects/afif.jpg";
const redSea = "/assets/projects/red-sea-aluminium.jpg";
const durma = "/assets/projects/durma-pp12.jpg";
const taiba = "/assets/projects/taiba-1.jpg";
const rumah = "/assets/projects/rumah-1.jpg";
const qassim = "/assets/projects/qassim-1.jpg";
const nairiyah = "/assets/projects/nairiyah-1.jpg";
const yanbu = "/assets/projects/yanbu-3.jpg";
const amaala = "/assets/projects/amaala.jpg";
const redSeaGlobal = "/assets/projects/red-sea-global.jpg";

export type Project = {
  key: string;
  slug: string;
  img: string;
  rank: number;
  featured?: boolean;
};

// Lower rank = higher priority. `featured` projects render large on the gallery.
export const projects: Project[] = [
  { key: "neom",             slug: "neom",              img: neom,         rank: 1,  featured: true },
  { key: "redSeaGlobal",     slug: "red-sea-global",    img: redSeaGlobal, rank: 2,  featured: true },
  { key: "amaala",           slug: "amaala",            img: amaala,       rank: 3,  featured: true },
  { key: "jafurah",          slug: "jafurah",           img: jafurah,      rank: 4,  featured: true },
  { key: "afif",             slug: "afif",              img: afif,         rank: 5,  featured: true },
  { key: "redSeaAluminium",  slug: "red-sea-aluminium", img: redSea,       rank: 6,  featured: true },
  { key: "durma",            slug: "durma-pp12",        img: durma,        rank: 7 },
  { key: "taiba1",           slug: "taiba-1",           img: taiba,        rank: 8 },
  { key: "rumah1",           slug: "rumah-1",           img: rumah,        rank: 9 },
  { key: "qassim1",          slug: "qassim-1",          img: qassim,       rank: 10 },
  { key: "nairiyah1",        slug: "nairiyah-1",        img: nairiyah,     rank: 11 },
  { key: "yanbu3",           slug: "yanbu-3",           img: yanbu,        rank: 12 },
];

export const featuredProjects = projects.filter((p) => p.featured).sort((a, b) => a.rank - b.rank);
export const allProjects = [...projects].sort((a, b) => a.rank - b.rank);
export const getProjectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
