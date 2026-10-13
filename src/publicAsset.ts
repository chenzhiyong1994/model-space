/** Resolve bundled assets under both a local root and a hosted project subpath. */
export function publicAsset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}
