/** Media stored in the private `media` bucket is served through a public proxy route. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `/api/public/media/${path}`;
}
