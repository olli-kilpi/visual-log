import { Client } from "@notionhq/client";

const notionToken = import.meta.env.NOTION_TOKEN;

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

export async function queryContent(databaseId: string) {
  if (!notion) {
    throw new Error("Notion token is missing.");
  }

  return notion.databases.query({
    database_id: databaseId
  });
}

export async function fetchPageBlocks(pageId: string) {
  if (!notion) {
    throw new Error("Notion token is missing.");
  }

  const response = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });

  return response.results;
}

function richTextToHtml(richText: any[]): string {
  if (!richText?.length) return "";

  return richText
    .map((item) => {
      let text: string = item.plain_text ?? "";
      text = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      if (item.annotations?.bold) text = `<strong>${text}</strong>`;
      if (item.annotations?.italic) text = `<em>${text}</em>`;
      if (item.annotations?.code) text = `<code>${text}</code>`;
      if (item.annotations?.strikethrough) text = `<s>${text}</s>`;
      if (item.href)
        text = `<a href="${item.href}" target="_blank" rel="noreferrer">${text}</a>`;

      return text;
    })
    .join("");
}

export function blocksToHtml(blocks: any[]): string {
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;

  for (const block of blocks) {
    if (!("type" in block)) continue;
    const type = block.type as string;

    if (type !== "bulleted_list_item" && type !== "numbered_list_item") {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
    }

    switch (type) {
      case "paragraph": {
        const text = richTextToHtml(block.paragraph.rich_text);
        if (text) html.push(`<p>${text}</p>`);
        break;
      }
      case "heading_2": {
        const text = richTextToHtml(block.heading_2.rich_text);
        if (text) html.push(`<h2>${text}</h2>`);
        break;
      }
      case "heading_3": {
        const text = richTextToHtml(block.heading_3.rich_text);
        if (text) html.push(`<h3>${text}</h3>`);
        break;
      }
      case "bulleted_list_item": {
        if (listType !== "ul") {
          if (listType) html.push(`</${listType}>`);
          html.push("<ul>");
          listType = "ul";
        }
        html.push(`<li>${richTextToHtml(block.bulleted_list_item.rich_text)}</li>`);
        break;
      }
      case "numbered_list_item": {
        if (listType !== "ol") {
          if (listType) html.push(`</${listType}>`);
          html.push("<ol>");
          listType = "ol";
        }
        html.push(`<li>${richTextToHtml(block.numbered_list_item.rich_text)}</li>`);
        break;
      }
      case "image": {
        const url =
          block.image.type === "file"
            ? block.image.file?.url
            : block.image.external?.url;
        const caption = block.image.caption?.length
          ? richTextToHtml(block.image.caption)
          : "";
        if (url) {
          html.push(
            `<figure><img src="${url}" alt="${caption || ""}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`
          );
        }
        break;
      }
      case "divider":
        html.push("<hr />");
        break;
      case "quote": {
        const text = richTextToHtml(block.quote.rich_text);
        if (text) html.push(`<blockquote>${text}</blockquote>`);
        break;
      }
    }
  }

  if (listType) html.push(`</${listType}>`);

  return html.join("\n");
}
