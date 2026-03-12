import type { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { querySections, fetchPageBlocks, blocksToHtml } from "./notion";

export type Section = {
  id: string;
  title: string;
  content: string;
  subheading?: string;
  subcontent?: string;
  tags: string[];
  link?: string;
  media?: string;
  embedUrl?: string;
  embedType?: string;
  visibility: string;
  date?: string;
  bodyContent?: string;
};

type SectionWithFlags = Section & {
  isPublished: boolean;
  visibility: string;
};

const fallbackSections: Section[] = [
  {
    id: "sample-section",
    title: "Selected Case Study",
    content:
      "A short description of your project. Replace this with Notion content.",
    subheading: "What I focused on",
    subcontent:
      "A supporting subsection that can highlight scope, outcomes, or the design approach.",
    tags: ["Research", "UI Systems"],
    link: "https://example.com",
    media: "",
    visibility: "Selected works"
  }
];

function extractPlainText(richText?: { plain_text: string }[]) {
  return richText?.map((item) => item.plain_text).join("") ?? "";
}

function extractUrl(property?: { url?: string | null }) {
  return property?.url ?? "";
}

function extractFiles(property?: {
  files?: { type: "file" | "external"; name: string; file?: { url: string }; external?: { url: string } }[];
}) {
  const first = property?.files?.[0];
  if (!first) return "";
  if (first.type === "file") {
    return first.file?.url ?? "";
  }
  return first.external?.url ?? "";
}

function mapNotionSections(response: QueryDatabaseResponse): Section[] {
  return response.results
    .map((page): SectionWithFlags => {
    const properties = "properties" in page ? page.properties : {};
    const titleProp =
      "Name" in properties && properties.Name.type === "title"
        ? properties.Name
        : undefined;
    const contentProp =
      "Content" in properties && properties.Content.type === "rich_text"
        ? properties.Content
        : undefined;
    const subheadingProp =
      "Subheading" in properties && properties.Subheading.type === "rich_text"
        ? properties.Subheading
        : undefined;
    const subcontentProp =
      "Subcontent" in properties && properties.Subcontent.type === "rich_text"
        ? properties.Subcontent
        : undefined;

    const tagsProp =
      "Tags" in properties && properties.Tags.type === "multi_select"
        ? properties.Tags
        : undefined;
    const visibilityProp =
      "Visibility" in properties && properties.Visibility.type === "select"
        ? properties.Visibility
        : undefined;
    const publishedProp =
      "Published" in properties && properties.Published.type === "checkbox"
        ? properties.Published
        : undefined;
    const linkProp =
      "Link" in properties && properties.Link.type === "url"
        ? properties.Link
        : undefined;
    const mediaProp =
      "Media" in properties && properties.Media.type === "files"
        ? properties.Media
        : undefined;
    const dateProp =
      "Date" in properties && properties.Date.type === "date"
        ? properties.Date
        : undefined;
    const embedUrlProp =
      "Embed URL" in properties && properties["Embed URL"].type === "url"
        ? properties["Embed URL"]
        : undefined;
    const embedTypeProp =
      "Embed Type" in properties && properties["Embed Type"].type === "select"
        ? properties["Embed Type"]
        : undefined;

    const title = extractPlainText(titleProp?.title) || "Untitled Section";
    const content =
      extractPlainText(contentProp?.rich_text) ||
      "Add a Content property in Notion to populate this section.";
    const subheading = extractPlainText(subheadingProp?.rich_text);
    const subcontent = extractPlainText(subcontentProp?.rich_text);
    const tags =
      tagsProp?.multi_select?.map((tag) => tag.name) ?? [];
    const visibility = visibilityProp?.select?.name ?? "Public";
    const isPublished = publishedProp?.checkbox ?? true;
    const link = extractUrl(linkProp);
    const media = extractFiles(mediaProp);
    const embedUrl = extractUrl(embedUrlProp);
    const embedType = embedTypeProp?.select?.name;

    return {
      id: page.id,
      title,
      content,
      subheading: subheading || undefined,
      subcontent: subcontent || undefined,
      tags,
      link: link || undefined,
      media: media || undefined,
      embedUrl: embedUrl || undefined,
      embedType: embedType || undefined,
      date: dateProp?.date?.start || undefined,
      isPublished,
      visibility
    };
  })
    .filter((section) => section.isPublished && section.visibility !== "Hidden")
    .map(({ isPublished, ...section }) => section);
}

export async function getSections(): Promise<Section[]> {
  const databaseId = import.meta.env.NOTION_DATABASE_ID;
  const token = import.meta.env.NOTION_TOKEN;

  if (!databaseId || !token) {
    return fallbackSections;
  }

  try {
    const response = await querySections(databaseId);
    const sections = mapNotionSections(response);

    const sectionsWithBody = await Promise.all(
      sections.map(async (section) => {
        try {
          const blocks = await fetchPageBlocks(section.id);
          const bodyHtml = blocksToHtml(blocks);
          return { ...section, bodyContent: bodyHtml || undefined };
        } catch {
          return section;
        }
      })
    );

    return sectionsWithBody;
  } catch (error) {
    console.warn("Notion fetch failed, falling back to local sections.", error);
    return fallbackSections;
  }
}

export function sortSectionsByDate(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
