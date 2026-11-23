/**
 * Caller follow-up texts: default templates, placeholders and rendering.
 * Shared by the Retell webhook (sending) and Call settings (live preview).
 *
 * Placeholders: {first_name} {name} {business} {when} {issue} {address}
 * {link} {phone}. A line whose placeholder has no value is left out, so a
 * template can mention the time or the link on their own lines. {first_name}
 * falls back to "there".
 */

export const TEMPLATE_MAX = 480;

export const PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "first_name", label: "Caller's first name" },
  { key: "name", label: "Caller's full name" },
  { key: "business", label: "Your business name" },
  { key: "when", label: "Booked time window" },
  { key: "issue", label: "The problem they described" },
  { key: "address", label: "Service address" },
  { key: "link", label: "Your follow-up link" },
  { key: "phone", label: "The number they called" },
];

export const DEFAULT_BOOKED_TEMPLATE = [
  "Hi {first_name}, thanks for calling {business}. Your visit is booked.",
  "Time: {when}",
  "We'll call before the technician heads over.",
].join("\n");

export const DEFAULT_FOLLOWUP_TEMPLATE = [
  "Hi {first_name}, thanks for calling {business}. We'll call you back shortly.",
  "Book online any time: {link}",
].join("\n");

export const STOP_LINE = "Reply STOP to opt out.";

export type TemplateValues = Partial<Record<(typeof PLACEHOLDERS)[number]["key"], string>>;

/** Plain GSM characters, so a text isn't split into many short segments. */
export function gsm(s: string) {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[^\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅåÄÖÑÜ§¿äöñüà]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Fills a template. Lines with an empty placeholder are dropped, every line
 * is trimmed, and "Reply STOP to opt out." is added if the template doesn't
 * already mention STOP (US carriers expect it).
 */
export function renderTemplate(template: string, values: TemplateValues) {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(values)) v[k] = gsm(val ?? "");
  if (!v.first_name) v.first_name = (v.name || "").split(/\s+/)[0] || "there";

  const lines = template
    .split(/\r?\n/)
    .map((line) => {
      const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (keys.some((k) => !v[k])) return null;
      return line.replace(/\{(\w+)\}/g, (_, k: string) => v[k]).replace(/[ \t]+/g, " ").trim();
    })
    .filter((l): l is string => Boolean(l));

  let body = gsm(lines.join("\n"));
  if (body && !/\bSTOP\b/i.test(body)) body = `${body}\n${STOP_LINE}`;
  return body.length > TEMPLATE_MAX + STOP_LINE.length + 1
    ? `${body.slice(0, TEMPLATE_MAX - 3).trimEnd()}...`
    : body;
}

/** SMS segments a text will use (GSM-7: 160, or 153 each when split). */
export const segments = (text: string) =>
  text.length <= 160 ? 1 : Math.ceil(text.length / 153);

/**
 * US numbers to E.164: "(512) 555-0100" -> "+15125550100". Returns "" when
 * the input isn't a plausible phone number.
 */
export function toE164(input: string) {
  const s = input.trim();
  const d = s.replace(/\D/g, "");
  if (s.startsWith("+")) return /^[1-9]\d{7,14}$/.test(d) ? `+${d}` : "";
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return "";
}

/** Sample values for the settings preview. */
export const PREVIEW_VALUES: TemplateValues = {
  name: "Linda Morales",
  when: "Today 12-5",
  issue: "AC blowing warm air",
  address: "1904 Oak Hollow Dr, Round Rock 78664",
  phone: "(737) 555-0199",
};
