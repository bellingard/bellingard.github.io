#!/usr/bin/env node
/**
 * Import a LinkedIn data export (ZIP or extracted folder) into src/data/linkedin/.
 *
 * Usage:
 *   npm run linkedin:import
 *   npm run linkedin:import -- ./exports/Complete_LinkedInDataExport.zip
 *   npm run linkedin:import -- ./exports/linkedin-export/
 *
 * With no argument, looks in ~/Downloads for exactly one *LinkedIn*.zip file.
 *
 * Request your archive: LinkedIn → Settings → Data privacy → Get a copy of your data
 * (select Profile, Positions, Education, Skills, Certifications, Languages, Publications, …)
 */
import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "src", "data", "linkedin");
const DOWNLOADS_DIR = join(homedir(), "Downloads");
const LINKEDIN_ZIP_RE = /LinkedIn/i;

const FILE_MAP = {
  "Profile.csv": "profile.json",
  "Positions.csv": "positions.json",
  "Education.csv": "education.json",
  "Skills.csv": "skills.json",
  "Certifications.csv": "certifications.json",
  "Languages.csv": "languages.json",
  "Publications.csv": "publications.json",
  "Projects.csv": "projects.json",
  "Honors.csv": "honors.json",
  "Volunteering.csv": "volunteer.json",
};

function usage(message) {
  if (message) console.error(message);
  console.error(`Usage: npm run linkedin:import [-- <export.zip|export-dir>]`);
  console.error(`With no argument, uses the single *LinkedIn*.zip file in ~/Downloads if found.`);
  process.exit(1);
}

/** Resolve export path from CLI arg, or from a unique ~/Downloads/*LinkedIn*.zip. */
function resolveInputPath(cliArg) {
  if (cliArg) return resolve(process.cwd(), cliArg);

  if (!existsSync(DOWNLOADS_DIR)) {
    usage(`No argument given and Downloads folder not found: ${DOWNLOADS_DIR}`);
  }

  const matches = readdirSync(DOWNLOADS_DIR).filter(
    (name) => name.toLowerCase().endsWith(".zip") && LINKEDIN_ZIP_RE.test(name),
  );

  if (matches.length === 0) {
    usage(`No argument given and no *LinkedIn*.zip found in ${DOWNLOADS_DIR}`);
  }

  if (matches.length > 1) {
    console.error(`No argument given, but found ${matches.length} *LinkedIn*.zip files in ${DOWNLOADS_DIR}:`);
    for (const name of matches) console.error(`  - ${name}`);
    usage("Pass the ZIP path explicitly, or keep only one matching file in Downloads.");
  }

  const autoPath = join(DOWNLOADS_DIR, matches[0]);
  console.log(`No argument given — using ${autoPath}`);
  return autoPath;
}

/** Minimal CSV parser that handles quoted multiline fields (LinkedIn style). */
async function parseCsv(filePath) {
  const rows = [];
  let headers = null;
  let current = "";
  let inQuotes = false;

  const rl = createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });

  for await (const line of rl) {
    current += (current ? "\n" : "") + line;
    let quoteCount = 0;
    for (const ch of current) {
      if (ch === '"') quoteCount++;
    }
    // Odd number of quotes means we're still inside a quoted field spanning lines
    inQuotes = quoteCount % 2 === 1;
    if (inQuotes) continue;

    const fields = splitCsvLine(current);
    current = "";
    if (!headers) {
      headers = fields.map((h) => h.trim());
      continue;
    }
    if (fields.every((f) => f.trim() === "")) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (fields[idx] ?? "").trim();
    });
    rows.push(obj);
  }

  return rows;
}

function splitCsvLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

function findCsvFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) findCsvFiles(full, acc);
    else if (name.name.endsWith(".csv") && FILE_MAP[name.name]) acc.push(full);
  }
  return acc;
}

function normalizeProfile(rows) {
  const row = rows[0] ?? {};
  return {
    firstName: row["First Name"] || row.firstName || "",
    lastName: row["Last Name"] || row.lastName || "",
    headline: row["Headline"] || row.headline || "",
    summary: row["Summary"] || row.summary || "",
    location: row["Geo Location"] || row["Location"] || row.location || "",
    industry: row["Industry"] || row.industry || "",
  };
}

function normalizePositions(rows) {
  return rows.map((row) => ({
    company: row["Company Name"] || row.company || "",
    title: row["Title"] || row.title || "",
    description: row["Description"] || row.description || "",
    location: row["Location"] || row.location || "",
    startedOn: joinDate(row["Started On"] || row.startedOn),
    finishedOn: joinDate(row["Finished On"] || row.finishedOn) || null,
  }));
}

function normalizeEducation(rows) {
  return rows.map((row) => ({
    school: row["School Name"] || row.school || "",
    degree: row["Degree Name"] || row.degree || "",
    field: row["Notes"] || row["Field Of Study"] || row.field || "",
    startedOn: joinDate(row["Start Date"] || row.startedOn),
    finishedOn: joinDate(row["End Date"] || row.finishedOn) || null,
  }));
}

function normalizeSkills(rows) {
  return rows.map((row) => ({
    name: row["Name"] || row.name || "",
  })).filter((s) => s.name);
}

function normalizeCertifications(rows) {
  return rows.map((row) => ({
    name: row["Name"] || row.name || "",
    authority: row["Authority"] || row.authority || "",
    startedOn: joinDate(row["Started On"] || row.startedOn),
    finishedOn: joinDate(row["Finished On"] || row.finishedOn) || null,
    url: row["Url"] || row.url || "",
  }));
}

function normalizeLanguages(rows) {
  return rows.map((row) => ({
    name: row["Name"] || row.name || "",
    proficiency: row["Proficiency"] || row.proficiency || "",
  }));
}

function normalizePublications(rows) {
  return rows.map((row) => ({
    title: row["Name"] || row.title || "",
    publisher: row["Publisher"] || row.publisher || "",
    date: joinDate(row["Published On"] || row.date),
    description: row["Description"] || row.description || "",
    url: row["Url"] || row.url || "",
  }));
}

function joinDate(value) {
  if (!value) return "";
  // LinkedIn often uses "Mon YYYY" or "YYYY"
  return String(value).trim();
}

const NORMALIZERS = {
  "profile.json": (rows) => normalizeProfile(rows),
  "positions.json": (rows) => normalizePositions(rows),
  "education.json": (rows) => normalizeEducation(rows),
  "skills.json": (rows) => normalizeSkills(rows),
  "certifications.json": (rows) => normalizeCertifications(rows),
  "languages.json": (rows) => normalizeLanguages(rows),
  "publications.json": (rows) => normalizePublications(rows),
  "projects.json": (rows) => rows,
  "honors.json": (rows) => rows,
  "volunteer.json": (rows) => rows,
};

async function main() {
  const abs = resolveInputPath(process.argv[2]);
  if (!existsSync(abs)) {
    console.error(`Path not found: ${abs}`);
    process.exit(1);
  }

  let workDir = abs;
  let cleanup = null;

  if (extname(abs).toLowerCase() === ".zip") {
    cleanup = mkdtempSync(join(tmpdir(), "linkedin-export-"));
    execFileSync("unzip", ["-q", "-o", abs, "-d", cleanup]);
    workDir = cleanup;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const csvFiles = findCsvFiles(workDir);
  if (csvFiles.length === 0) {
    console.error("No known LinkedIn CSV files found in the export.");
    if (cleanup) rmSync(cleanup, { recursive: true, force: true });
    process.exit(1);
  }

  const imported = [];
  for (const csvPath of csvFiles) {
    const outName = FILE_MAP[basename(csvPath)];
    const rows = await parseCsv(csvPath);
    const normalize = NORMALIZERS[outName] ?? ((r) => r);
    const data = normalize(rows);
    const outPath = join(OUT_DIR, outName);
    writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
    imported.push(outName);
    console.log(`Wrote ${outName} (${Array.isArray(data) ? data.length : 1} entr${Array.isArray(data) && data.length === 1 ? "y" : Array.isArray(data) ? "ies" : "y"})`);
  }

  writeFileSync(
    join(OUT_DIR, "_meta.json"),
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        source: basename(abs),
        files: imported,
      },
      null,
      2,
    ) + "\n",
  );

  if (cleanup) rmSync(cleanup, { recursive: true, force: true });
  console.log(`\nDone. LinkedIn data is in src/data/linkedin/`);
  console.log(`Review overlays in src/data/overrides.json and content collections if needed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
