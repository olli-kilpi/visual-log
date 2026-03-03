import type { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { queryContent } from "./notion";

// Fallback values mirror what is currently hardcoded in Hero and Footer.
// These are used when Notion is unavailable or NOTION_CONTENT_DATABASE_ID is not set.
const fallbackContent: Record<string, string> = {
  // Hero
  "hero.role": "UI/UX Designer • Frontend Developer",
  "hero.title": "Olli Kilpi",
  "hero.body":
    "I design and build thoughtful digital experiences with a focus on simplicity, accessibility, and modern web technologies. Currently exploring the intersection of design systems and interactive storytelling.",

  // Footer
  "footer.heading": "Section Heading",
  "footer.subheading": "Subheading to explain what the H1 means",
  "footer.bio":
    "Hi, I'm a versatile UX/UI designer with technical skills and experience in designing large digital consumer services. Olli's core expertise is solid visual and interaction design.",
  "footer.currently":
    "I'm a Lead designer at Futurice. It's a IT consultancy where we help our customer to define and build the future together.",
  "footer.currently.extra":
    "Over the past eight years, I have worked on long-term projects in Finland's largest companies.",
  "footer.past": "I have worked as Motion designer before I joined futurice.",
  "footer.education": "Lahti - Institute of Design\nB.A. Industrial Design\n2007 – 2012"
};

function mapContentRows(response: QueryDatabaseResponse): Record<string, string> {
  const result: Record<string, string> = {};

  for (const page of response.results) {
    const properties = "properties" in page ? page.properties : {};

    const keyProp =
      "Key" in properties && properties.Key.type === "title" ? properties.Key : undefined;
    const valueProp =
      "Value" in properties && properties.Value.type === "rich_text"
        ? properties.Value
        : undefined;

    if (!keyProp) continue;

    const key = keyProp.title.map((t) => t.plain_text).join("").trim();
    const value = valueProp?.rich_text.map((t) => t.plain_text).join("") ?? "";

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

// Returns a key→value map of all content rows from Notion.
// Uses NOTION_CONTENT_DATABASE_ID if set, otherwise falls back to NOTION_DATABASE_ID
// so both the visual log and site copy can live in the same connected database.
// Any key missing from Notion automatically falls back to the hardcoded defaults above.
export async function getContent(): Promise<Record<string, string>> {
  const databaseId =
    import.meta.env.NOTION_CONTENT_DATABASE_ID ?? import.meta.env.NOTION_DATABASE_ID;
  const token = import.meta.env.NOTION_TOKEN;

  if (!databaseId || !token) {
    return fallbackContent;
  }

  try {
    const response = await queryContent(databaseId);
    const notionContent = mapContentRows(response);
    // Merge: Notion values override fallbacks, but missing keys still get a value
    return { ...fallbackContent, ...notionContent };
  } catch (error) {
    console.warn("Notion content fetch failed, falling back to defaults.", error);
    return fallbackContent;
  }
}
