import { createClient } from "@sanity/client";

export function hasSanityWriteConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
    process.env.NEXT_PUBLIC_SANITY_DATASET &&
    process.env.SANITY_API_WRITE_TOKEN,
  );
}

export function getSanityAdminClient() {
  if (!hasSanityWriteConfig()) return null;
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    apiVersion: "2025-01-01",
    useCdn: false,
    token: process.env.SANITY_API_WRITE_TOKEN!,
  });
}