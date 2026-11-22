/**
 * Fallback for the implicit `children` slot. The venue detail lives in the
 * `@modal` slot, so a hard load of `/[lang]/venue/[slug]` has no matching
 * `children` page and renders nothing here.
 */
export default function ChildrenDefault() {
  return null;
}
