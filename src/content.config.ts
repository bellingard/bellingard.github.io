import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const openSource = defineCollection({
  loader: glob({ base: "./src/content/open-source", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    role: z.string(),
    years: z.string(),
    url: z.url().optional(),
    highlight: z.string().optional(),
    order: z.number().default(0),
  }),
});

const publications = defineCollection({
  loader: glob({ base: "./src/content/publications", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    authors: z.string(),
    venue: z.string(),
    year: z.number(),
    url: z.url().optional(),
    pdf: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const impact = defineCollection({
  loader: glob({ base: "./src/content/impact", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    role: z.string().optional(),
    url: z.url().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { openSource, publications, impact };
