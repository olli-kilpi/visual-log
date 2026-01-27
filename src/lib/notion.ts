import { Client } from "@notionhq/client";

const notionToken = import.meta.env.NOTION_TOKEN;

// The Notion client stays server-side in Astro (no token leaks to the browser).
export const notion = notionToken ? new Client({ auth: notionToken }) : null;

export async function querySections(databaseId: string) {
  if (!notion) {
    throw new Error("Notion token is missing.");
  }

  return notion.databases.query({
    database_id: databaseId,
    sorts: [{ property: "Order", direction: "ascending" }]
  });
}
