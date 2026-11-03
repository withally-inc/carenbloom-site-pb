// Text helpers for content that arrives from the API.

/** API text is rendered as received, except em and en dashes, which become a comma
 *  and a space (COPY-DECISIONS 2). The one dash helper of the site. */
export function cleanDashes(text: unknown): string {
  if (typeof text !== 'string') return ''
  return text
    .replace(/\s*[\u2013\u2014]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*/, '')
    .trim()
}
