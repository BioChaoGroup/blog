/**
 * rehype-base-path
 *
 * Content authors write root-relative links (`/projects/stclfr/`). The site is
 * deployed under a base path (`/blog`), so every internal href/src has to be
 * prefixed at build time. Handles anchors and images; leaves external URLs,
 * protocol-relative URLs, hashes and mailto/tel links untouched.
 */
export default function rehypeBasePath(options = {}) {
  const raw = options.base || '/';
  const base = raw === '/' ? '' : raw.replace(/\/+$/, '');
  if (!base) return () => {};

  const fix = (url) => {
    if (typeof url !== 'string' || !url.startsWith('/')) return url;
    if (url.startsWith('//')) return url;
    if (url === base || url.startsWith(`${base}/`)) return url;
    return `${base}${url}`;
  };

  return (tree) => {
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'element') {
        const props = (node.properties ||= {});
        if (node.tagName === 'a' && props.href) props.href = fix(props.href);
        if (node.tagName === 'img' && props.src) props.src = fix(props.src);
        if (node.tagName === 'video' && props.src) props.src = fix(props.src);
        if (node.tagName === 'source' && props.src) props.src = fix(props.src);
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}
