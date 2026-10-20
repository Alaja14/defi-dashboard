export function dataUrl(base, path) {
  return `${base.endsWith('/') ? base : base + '/'}data/${path.replace(/^\/+/, '')}`;
}
