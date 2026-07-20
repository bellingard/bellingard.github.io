import site from "../data/site.json";
import overrides from "../data/overrides.json";
import profile from "../data/linkedin/profile.json";
import positions from "../data/linkedin/positions.json";
import skills from "../data/linkedin/skills.json";
import languages from "../data/linkedin/languages.json";
import education from "../data/linkedin/education.json";
import certifications from "../data/linkedin/certifications.json";

export type SocialLink = {
  label: string;
  href: string;
  rel?: string;
  description?: string;
};

export type Position = {
  company: string;
  title: string;
  description: string;
  location: string;
  startedOn: string;
  finishedOn: string | null;
};

export type Education = {
  school: string;
  degree: string;
  field: string;
  startedOn: string;
  finishedOn: string | null;
};

export type Certification = {
  name: string;
  authority: string;
  startedOn: string;
  finishedOn: string | null;
  url: string;
};

export type Profile = {
  name: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  location: string;
  photo: string;
  photoAlt: string;
  tagline: string;
  about: string[];
  social: SocialLink[];
  sameAs: string[];
  positions: Position[];
  education: Education[];
  certifications: Certification[];
  skills: string[];
  languages: { name: string; proficiency: string }[];
};

function applyPositionOverrides(list: Position[]): Position[] {
  const map = overrides.positionOverrides as Record<string, Partial<Position>>;
  return list.map((pos) => {
    const key = `${pos.company}::${pos.title}`;
    return map[key] ? { ...pos, ...map[key] } : pos;
  });
}

function orderedSkills(raw: { name: string }[]): string[] {
  const hide = new Set<string>(overrides.hideSkills ?? []);
  const names = raw.map((s) => s.name).filter((n) => n && !hide.has(n));
  const featured: string[] = overrides.featuredSkillOrder ?? [];
  const rest = names.filter((n) => !featured.includes(n));
  return [...featured.filter((n) => names.includes(n)), ...rest];
}

function filterEducation(list: Education[]): Education[] {
  const hide = new Set<string>(overrides.hideEducation ?? []);
  if (hide.size === 0) return list;
  return list.filter((item) => !hide.has(item.school));
}

/** Rough sort key for LinkedIn date strings like "Sep 2022" or "1998". */
function dateSortKey(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  const year = value.match(/\d{4}/);
  return year ? Number(year[0]) * 100 : 0;
}

export function getProfile(): Profile {
  const name =
    site.name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    "Fabrice Bellingard";

  const educationList = filterEducation([...(education as Education[])]).sort(
    (a, b) => dateSortKey(b.finishedOn || b.startedOn) - dateSortKey(a.finishedOn || a.startedOn),
  );

  const certificationList = [...(certifications as Certification[])].sort(
    (a, b) => dateSortKey(b.startedOn) - dateSortKey(a.startedOn),
  );

  return {
    name,
    firstName: profile.firstName,
    lastName: profile.lastName,
    headline: profile.headline,
    summary: profile.summary,
    location: profile.location,
    photo: site.photo,
    photoAlt: site.photoAlt,
    tagline: site.tagline,
    about: site.about,
    social: site.social as SocialLink[],
    sameAs: site.sameAs,
    positions: applyPositionOverrides(positions as Position[]),
    education: educationList,
    certifications: certificationList,
    skills: orderedSkills(skills),
    languages: languages as { name: string; proficiency: string }[],
  };
}
