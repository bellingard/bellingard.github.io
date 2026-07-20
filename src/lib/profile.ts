import site from "../data/site.json";
import overrides from "../data/overrides.json";
import profile from "../data/linkedin/profile.json";
import positions from "../data/linkedin/positions.json";
import skills from "../data/linkedin/skills.json";
import languages from "../data/linkedin/languages.json";

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

export function getProfile(): Profile {
  const name =
    site.name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    "Fabrice Bellingard";

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
    skills: orderedSkills(skills),
    languages: languages as { name: string; proficiency: string }[],
  };
}
