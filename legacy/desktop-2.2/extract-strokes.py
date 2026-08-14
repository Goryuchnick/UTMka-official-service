"""Extract stroke glyphs from PixelIcon.tsx → JSON for use in vanilla JS."""
import re, json, sys

SRC = r'd:/Programmes projects/personal/my-site/my-own-site-pronin-alex/components/ui/PixelIcon.tsx'
OUT = r'd:/Programmes projects/products/UTMka-official-service/frontend/js/stroke-glyphs.js'

src = open(SRC, encoding='utf-8').read()

m = re.search(r'const ICONS:\s*Record<PixelIconName,\s*ReactNode>\s*=\s*\{', src)
if not m:
    sys.exit('ICONS not found')
start = m.end()

depth = 1
in_str = None
i = start
while i < len(src) and depth > 0:
    c = src[i]
    if in_str:
        if c == in_str and src[i-1] != '\\':
            in_str = None
    elif c in ('"', "'", '`'):
        in_str = c
    elif c == '{':
        depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0:
            break
    i += 1

body = src[start:i]
body = re.sub(r'\{/\*.*?\*/\}', '', body, flags=re.DOTALL)
body = re.sub(r'^[ \t]*//.*$', '', body, flags=re.MULTILINE)
body = re.sub(r'/\*[^!].*?\*/', '', body, flags=re.DOTALL)

glyphs = {}
key_re = re.compile(r"""(?P<q>['"]?)(?P<name>[a-z][a-z0-9-]*)(?P=q)\s*:\s*\(""", re.IGNORECASE)
pos = 0
while True:
    km = key_re.search(body, pos)
    if not km:
        break
    name = km.group('name')
    p = km.end()
    pdepth = 1
    j = p
    in_s = None
    while j < len(body) and pdepth > 0:
        ch = body[j]
        if in_s:
            if ch == in_s and body[j-1] != '\\':
                in_s = None
        elif ch in ('"', "'", '`'):
            in_s = ch
        elif ch == '(':
            pdepth += 1
        elif ch == ')':
            pdepth -= 1
            if pdepth == 0:
                break
        j += 1
    if pdepth != 0:
        pos = p
        continue
    inner = body[p:j].strip()
    pos = j + 1
    if not inner.startswith('<'):
        continue

    repl = {
        'strokeWidth': 'stroke-width',
        'strokeLinecap': 'stroke-linecap',
        'strokeLinejoin': 'stroke-linejoin',
        'strokeDasharray': 'stroke-dasharray',
        'strokeMiterlimit': 'stroke-miterlimit',
        'strokeOpacity': 'stroke-opacity',
        'fillRule': 'fill-rule',
        'fillOpacity': 'fill-opacity',
        'clipRule': 'clip-rule',
        'clipPath': 'clip-path',
        'textAnchor': 'text-anchor',
        'shapeRendering': 'shape-rendering',
        'vectorEffect': 'vector-effect',
    }
    out = inner
    for k, v in repl.items():
        out = re.sub(r'\b' + k + r'(?=\s*=)', v, out)
    out = re.sub(r'(\w+)=\{([^}]+)\}', lambda mm: f'{mm.group(1)}="{mm.group(2).strip()}"', out)
    out = re.sub(r'\s+', ' ', out).strip()
    glyphs[name] = out

print(f'extracted: {len(glyphs)} icons')
print('sample:', sorted(glyphs.keys())[:15])

out_js = '/* Auto-generated from PixelIcon.tsx — DO NOT EDIT BY HAND */\n'
out_js += '(function () {\n  "use strict";\n  window.STROKE_GLYPHS = '
out_js += json.dumps(glyphs, ensure_ascii=False, indent=2)
out_js += ';\n})();\n'
open(OUT, 'w', encoding='utf-8').write(out_js)
print('wrote', OUT)
