function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceMeta(html, attribute, key, value) {
  const escaped = escapeHtml(value);

  const regex = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${key}["'])[^>]*>`,
    "i"
  );

  return html.replace(regex, (tag) =>
    tag.replace(
      /\bcontent\s*=\s*(["']).*?\1/i,
      `content="${escaped}"`
    )
  );
}

function getGuestName(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async (request) => {
  const url = new URL(request.url);
  const slug = decodeURIComponent(url.pathname)
    .split("/")
    .filter(Boolean)
    .at(-1);

  if (!slug || slug === "index.html") return;

  // Skip files and asset folders.
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/img/") ||
    url.pathname.startsWith("/audio/") ||
    url.pathname.startsWith("/kit/") ||
    /\.[a-z0-9]+$/i.test(slug)
  ) {
    return;
  }

  const guestName = getGuestName(slug);
  if (!guestName) return;

  const response = await fetch(new URL("/index.html", url.origin));
  if (!response.ok) return;

  const htmlType = response.headers.get("content-type") || "";
  if (!htmlType.includes("text/html")) return response;

  let html = await response.text();

  const title = `សិរីសួស្តីអាពាហ៍ពិពាហ៍ · ${guestName}`;
  const description =
    `សូមគោរពអញ្ជើញ ${guestName} · You are warmly invited to our wedding.`;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );

  html = replaceMeta(html, "property", "og:title", title);
  html = replaceMeta(html, "name", "twitter:title", title);
  html = replaceMeta(html, "property", "og:description", description);
  html = replaceMeta(html, "name", "twitter:description", description);
  html = replaceMeta(
    html,
    "property",
    "og:url",
    url.origin + url.pathname
  );

  return new Response(html, {
    status: response.status,
    headers: response.headers,
  });
};