#!/usr/bin/env python3
"""
Regenerate the "BC" monogram used by the site logo and favicon.

The mark is not a font reference at runtime: the Source Serif 4 outlines for
"B" and "C" (weight 700) are baked into `src/components/Logo.astro` and
`public/favicon.svg` as SVG paths, so it renders identically in browsers, in
favicons (where webfonts are unavailable) and on machines without the font.

Requires fontTools + brotli (only for regeneration):

    python3 -m pip install --target /tmp/pylibs fonttools brotli
    PYTHONPATH=/tmp/pylibs python3 scripts/make-monogram.py

Then rebuild the raster assets (OG card, app icons) with Chrome if needed; see
docs/maintenance.md §6.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

FONT = pathlib.Path(
    'node_modules/@fontsource-variable/source-serif-4/files/'
    'source-serif-4-latin-wght-normal.woff2'
)
WEIGHT = 700
# tile geometry (32×32 viewBox)
PAD = 0.19          # side padding as a fraction of the tile
KERN_OFFSET = 661.0  # x-offset of "C" in font units (advance is 669; pulled in)
BRAND = '#00b1d7'
INK = '#ffffff'


def load_outlines() -> tuple[str, str]:
    try:
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.ttLib import TTFont
        from fontTools.varLib.instancer import instantiateVariableFont
    except ImportError:
        sys.exit('fontTools is required: pip install --target /tmp/pylibs fonttools brotli')

    font = instantiateVariableFont(TTFont(FONT), {'wght': WEIGHT}, inplace=False)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    paths = []
    for char in 'BC':
        glyph = glyphs[cmap[ord(char)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        paths.append(pen.getCommands())
    return paths[0], paths[1]


def group(b_path: str, c_path: str) -> str:
    ink_min, ink_max = 34.7, KERN_OFFSET + 624.6
    ink_w = ink_max - ink_min
    size = 32
    cap = 681.0
    scale = (size * (1 - 2 * PAD)) / ink_w
    tx = (size - ink_w * scale) / 2 - ink_min * scale
    baseline = size / 2 + cap * scale / 2
    return (
        f'<g fill="{INK}" transform="translate({tx:.3f} {baseline:.3f}) '
        f'scale({scale:.6f} {-scale:.6f})">'
        f'<path d="{b_path}"/><path d="{c_path}" transform="translate({KERN_OFFSET:.1f} 0)"/></g>'
    )


def main() -> None:
    b_path, c_path = load_outlines()
    mark = group(b_path, c_path)

    logo = pathlib.Path('src/components/Logo.astro')
    if logo.exists():
        source = logo.read_text()
        updated = re.sub(r'  <g fill="#ffffff"[\s\S]*?</g>\n', f'  {mark}\n', source)
        if updated == source:
            sys.exit('could not find the monogram group in Logo.astro — update the script')
        logo.write_text(updated)
        print('updated', logo)

    favicon = pathlib.Path('public/favicon.svg')
    favicon.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">\n'
        f'  <rect width="32" height="32" rx="7.5" fill="{BRAND}" />\n'
        f'  {mark}\n'
        '</svg>\n'
    )
    print('updated', favicon)
    print('remember to re-render public/og-default.png, icon-512.png and apple-touch-icon.png')


if __name__ == '__main__':
    main()
