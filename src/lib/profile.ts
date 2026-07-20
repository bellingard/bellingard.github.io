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

export type ExperienceRole = Position;

export type ExperienceGroup = {
  company: string;
  description: string;
  location: string;
  startedOn: string;
  finishedOn: string | null;
  roles: ExperienceRole[];
};

export type ExperienceEntry =
  | ({ kind: "role" } & ExperienceRole)
  | ({ kind: "group" } & ExperienceGroup);

type PositionGroupOverride = {
  company: string;
  description?: string;
  location?: string;
  startedOn?: string;
  finishedOn?: string | null;
  roles: string[];
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
  positions: ExperienceEntry[];
  education: Education[];
  certifications: Certification[];
  skills: string[];
  languages: { name: string; proficiency: string }[];
};

function positionKey(pos: Position): string {
  return `${pos.company}::${pos.title}`;
}

function applyPositionOverrides(list: Position[]): Position[] {
  const map = overrides.positionOverrides as Record<string, Partial<Position>>;
  return list.map((pos) => {
    const key = positionKey(pos);
    return map[key] ? { ...pos, ...map[key] } : pos;
  });
}

function spanFromRoles(roles: ExperienceRole[]): {
  startedOn: string;
  finishedOn: string | null;
} {
  let earliest = roles[0]?.startedOn ?? "";
  let latest: string | null = roles[0]?.finishedOn ?? null;
  let earliestKey = dateSortKey(earliest);
  let latestKey = latest == null ? Number.POSITIVE_INFINITY : dateSortKey(latest);

  for (const role of roles.slice(1)) {
    const startKey = dateSortKey(role.startedOn);
    if (startKey < earliestKey) {
      earliest = role.startedOn;
      earliestKey = startKey;
    }
    if (role.finishedOn == null) {
      latest = null;
      latestKey = Number.POSITIVE_INFINITY;
    } else if (latest != null) {
      const endKey = dateSortKey(role.finishedOn);
      if (endKey > latestKey) {
        latest = role.finishedOn;
        latestKey = endKey;
      }
    }
  }

  return { startedOn: earliest, finishedOn: latest };
}

function applyPositionGroups(list: Position[]): ExperienceEntry[] {
  const groups = (overrides.positionGroups ?? []) as PositionGroupOverride[];
  if (groups.length === 0) {
    return list.map((pos) => ({ kind: "role" as const, ...pos }));
  }

  const byKey = new Map(list.map((pos) => [positionKey(pos), pos]));
  const keyToGroup = new Map<string, ExperienceEntry & { kind: "group" }>();

  for (const def of groups) {
    const roles = def.roles
      .map((key) => byKey.get(key))
      .filter((pos): pos is Position => Boolean(pos));
    if (roles.length === 0) continue;

    const span = spanFromRoles(roles);
    const entry: ExperienceEntry & { kind: "group" } = {
      kind: "group",
      company: def.company,
      description: def.description ?? "",
      location: def.location ?? "",
      startedOn: def.startedOn ?? span.startedOn,
      finishedOn: def.finishedOn !== undefined ? def.finishedOn : span.finishedOn,
      roles,
    };

    for (const role of roles) {
      keyToGroup.set(positionKey(role), entry);
    }
  }

  const emittedGroups = new Set<ExperienceEntry>();
  const result: ExperienceEntry[] = [];

  for (const pos of list) {
    const key = positionKey(pos);
    const group = keyToGroup.get(key);
    if (group) {
      if (!emittedGroups.has(group)) {
        emittedGroups.add(group);
        result.push(group);
      }
      continue;
    }
    result.push({ kind: "role", ...pos });
  }

  return result;
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
    positions: applyPositionGroups(applyPositionOverrides(positions as Position[])),
    education: educationList,
    certifications: certificationList,
    skills: orderedSkills(skills),
    languages: languages as { name: string; proficiency: string }[],
  };
}
