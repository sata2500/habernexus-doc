import render from "dom-serializer";
import { parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "u",
  "ul",
  "img",
]);

const DROP_WITH_CONTENT_TAGS = new Set([
  "base",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "style",
  "svg",
  "template",
  "textarea",
  "video",
]);

const GLOBAL_ATTRIBUTES = new Set(["class", "dir", "id", "lang", "title"]);
const LINK_ATTRIBUTES = new Set(["href", "target", "rel"]);
const IMAGE_ATTRIBUTES = new Set(["alt", "height", "src", "title", "width"]);

function isSafeUrl(value: string, allowMailto = false) {
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");

  if (normalized.startsWith("/") && !normalized.startsWith("//")) return true;
  if (normalized.startsWith("#")) return true;

  try {
    const url = new URL(normalized);
    const protocols = allowMailto ? ["http:", "https:", "mailto:"] : ["http:", "https:"];
    return protocols.includes(url.protocol.toLowerCase());
  } catch {
    return false;
  }
}

function sanitizeElement(element: Element): ChildNode[] {
  const tagName = element.name.toLowerCase();

  if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
    return [];
  }

  const children = element.children.flatMap(sanitizeNode);

  if (!ALLOWED_TAGS.has(tagName)) {
    return children;
  }

  const sanitizedAttributes: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(element.attribs)) {
    const name = rawName.toLowerCase();
    const value = rawValue.trim();

    if (name.startsWith("on") || name === "style" || name === "srcset") {
      continue;
    }

    const isAllowedAttribute = GLOBAL_ATTRIBUTES.has(name)
      || (tagName === "a" && LINK_ATTRIBUTES.has(name))
      || (tagName === "img" && IMAGE_ATTRIBUTES.has(name));

    if (!isAllowedAttribute) continue;

    if ((name === "href" && !isSafeUrl(value, true)) || (name === "src" && !isSafeUrl(value))) {
      continue;
    }

    if ((name === "width" || name === "height") && !/^\d{1,4}$/.test(value)) {
      continue;
    }

    sanitizedAttributes[name] = value;
  }

  if (tagName === "a") {
    if (!sanitizedAttributes.href) {
      return children;
    }

    if (sanitizedAttributes.target === "_blank") {
      sanitizedAttributes.rel = "noopener noreferrer";
    } else {
      delete sanitizedAttributes.target;
    }
  }

  if (tagName === "img" && !sanitizedAttributes.src) {
    return [];
  }

  element.name = tagName;
  element.attribs = sanitizedAttributes;
  element.children = children;

  return [element];
}

function sanitizeNode(node: ChildNode): ChildNode[] {
  if (node.type === "text") return [node];
  if (node.type === "tag" || node.type === "script" || node.type === "style") {
    return sanitizeElement(node as Element);
  }

  return [];
}

/**
 * Sanitizes rich text before it is rendered with dangerouslySetInnerHTML.
 * This function deliberately uses a small allow-list and removes event handlers,
 * inline styles, executable elements and unsafe URL protocols.
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== "string" || input.length === 0) return "";

  const document = parseDocument(input, { decodeEntities: true });
  const cleanNodes = document.children.flatMap(sanitizeNode);

  return render(cleanNodes, {
    decodeEntities: false,
    encodeEntities: true,
  });
}
