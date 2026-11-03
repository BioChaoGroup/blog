/**
 * rehype-figures
 *
 * Turns a paragraph that contains a single image into a <figure> with the alt
 * text as <figcaption>, and makes every image lazy + async-decoded. This lets
 * authors write plain Markdown (`![Caption sentence](/images/x.svg)`) while the
 * article layout gets real, screen-reader-friendly figure captions.
 */
const isWhitespaceText = (node) => node.type === 'text' && /^\s*$/.test(node.value);

export default function rehypeFigures() {
  return (tree) => {
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'element' && node.tagName === 'img') {
        const props = (node.properties ||= {});
        if (props.loading === undefined) props.loading = 'lazy';
        if (props.decoding === undefined) props.decoding = 'async';
      }

      if (Array.isArray(node.children)) {
        for (let i = 0; i < node.children.length; i += 1) {
          const child = node.children[i];
          if (child?.type === 'element' && child.tagName === 'p') {
            const meaningful = (child.children || []).filter((c) => !isWhitespaceText(c));
            const onlyImage =
              meaningful.length === 1 &&
              meaningful[0].type === 'element' &&
              meaningful[0].tagName === 'img';
            if (onlyImage) {
              const img = meaningful[0];
              const alt = (img.properties && (img.properties.alt || img.properties.title)) || '';
              const figure = {
                type: 'element',
                tagName: 'figure',
                properties: {},
                children: [img],
              };
              if (alt) {
                figure.children.push({
                  type: 'element',
                  tagName: 'figcaption',
                  properties: {},
                  children: [{ type: 'text', value: alt }],
                });
              }
              node.children[i] = figure;
              continue;
            }
          }
          walk(child);
        }
      }
    };
    walk(tree);
  };
}
