/** Serialize data for an inline JSON-LD script, escaping `<` to avoid tag injection. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
