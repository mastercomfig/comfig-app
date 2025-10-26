// 1. Import utilities from `astro:content`
// 2. Import loader(s)
import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// 3. Define your collection(s)
const tc2News = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/posts/tc2" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    draft: z.boolean().optional(),
    update: z.string().optional(),
  }),
});
const tc2Patches = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/posts/tc2Patches" }),
  schema: z.object({
    date: z.date(),
    draft: z.boolean().optional(),
    num: z.number().optional(),
  }),
});

// 4. Export a single `collections` object to register your collection(s)
export const collections = { tc2News, tc2Patches };
