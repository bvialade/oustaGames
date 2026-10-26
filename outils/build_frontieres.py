"""Génère frontieres/data.js pour le jeu Passe-frontières.

Données :
- frontières terrestres : world-countries (ODbL), champ « borders » ;
- contours des pays : Natural Earth 1:50m (domaine public), 1:10m pour les micro-États.

Utilisation (depuis la racine du dépôt) :
    pip install shapely
    mkdir -p /tmp/ne && cd /tmp/ne
    curl -LO https://raw.githubusercontent.com/mledoze/countries/master/countries.json
    curl -Lo ne50.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
    curl -Lo ne10.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
    cd - && python3 outils/build_frontieres.py /tmp/ne

Les listes de parties sont tirées avec une graine fixe : relancer le script redonne les mêmes
parties, donc les numéros partagés restent valables tant que les données ne changent pas.
"""
import json
import math
import random
import sys
from collections import deque
from pathlib import Path

from shapely.geometry import box, shape, MultiPolygon, Polygon
from shapely.ops import unary_union

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ne')
ROOT = Path(__file__).resolve().parent.parent

# Pays jouables : la même liste que le quiz de géographie.
text = (ROOT / 'geo/countries.js').read_text()
PLAYABLE = json.loads(text[text.index('['):text.rindex(']') + 1])
IDS = {c['id'].upper() for c in PLAYABLE}

wc = {c['cca3']: c for c in json.load(open(SRC / 'countries.json'))}

# Frontières qui n'existent que par un territoire d'outre-mer ou une enclave invisible sur la carte.
DROP = {('ESP', 'MAR'), ('ESP', 'GIB')}
borders = {}
for cid in IDS:
    nb = {b for b in wc[cid]['borders'] if b in IDS and (cid, b) not in DROP and (b, cid) not in DROP}
    borders[cid] = nb
for a in IDS:  # symétrise
    for b in borders[a]:
        borders[b].add(a)

# ---- Carte : projection de Miller, largeur du monde = 3600 unités (0,1 degré).
W = 3600


def project(lon, lat):
    lat = max(min(lat, 84), -60)
    x = (lon + 180) * W / 360
    y = 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))
    return x, -y * W / (2 * math.pi)


Y0 = project(0, 84)[1]


def proj_geom(g):
    def ring(coords):
        return [(x, y - Y0) for x, y in (project(*c[:2]) for c in coords)]
    polys = g.geoms if hasattr(g, 'geoms') else [g]
    polys = [p for p in polys if isinstance(p, Polygon)]
    out = [Polygon(ring(p.exterior.coords), [ring(i.coords) for i in p.interiors]) for p in polys]
    return unary_union([p if p.is_valid else p.buffer(0) for p in out])


def path(g, tol):
    """Chemin SVG en coordonnées relatives entières (unité = 0,1 degré à l'équateur)."""
    g = g.simplify(tol, preserve_topology=True)
    parts = []
    polys = g.geoms if hasattr(g, 'geoms') else [g]
    for p in polys:
        if p.is_empty or p.area < tol * tol:
            continue
        for r in [p.exterior, *p.interiors]:
            pts = [(round(x), round(y)) for x, y in r.coords[:-1]]
            ded = [pts[0]]
            for q in pts[1:]:
                if q != ded[-1]:
                    ded.append(q)
            if len(ded) < 3:
                continue
            s = f'M{ded[0][0]} {ded[0][1]}'
            px, py = ded[0]
            rel = []
            for x, y in ded[1:]:
                rel.append(f'{x - px} {y - py}'.replace(' -', '-'))
                px, py = x, y
            parts.append(s + 'l' + ' '.join(rel).replace(' -', '-') + 'z')
    return ''.join(parts)


def feats(name):
    d = json.load(open(SRC / name))
    out = {}
    for f in d['features']:
        p = f['properties']
        out.setdefault(p['ADM0_A3'], []).append(f)
    return out


ne50, ne10 = feats('ne50.geojson'), feats('ne10.geojson')
# Territoires rattachés pour la carte au pays reconnu par l'ONU.
MERGE = {'SOL': 'SOM', 'CYN': 'CYP', 'SDS': 'SSD', 'KAS': 'IND'}
# On garde seulement la partie européenne de ces pays (pas la Guyane, les Antilles…).
CLIP = {'FRA': box(-10, 35, 20, 55), 'NLD': box(0, 50, 10, 55), 'NOR': box(0, 55, 35, 72)}
MICRO = {'VAT', 'MCO', 'SMR', 'LIE', 'AND', 'MLT', 'SGP', 'BHR'}

geoms, background = {}, []
for code, fs in ne50.items():
    target = MERGE.get(code, code)
    src = ne10.get(code, fs) if target in MICRO else fs
    g = unary_union([shape(f['geometry']) for f in src])
    if target in CLIP:
        g = g.intersection(CLIP[target])
    if g.is_empty or code == 'ATA':
        continue
    if target in IDS:
        geoms[target] = unary_union([geoms[target], g]) if target in geoms else g
    else:
        background.append(g)
for code in IDS - set(geoms):
    if code in ne10:
        geoms[code] = unary_union([shape(f['geometry']) for f in ne10[code]])
missing = IDS - set(geoms)
print('Sans contour :', missing)

label = {}
for code, fs in {**ne10, **ne50}.items():
    p = fs[0]['properties']
    if code in IDS:
        label[code] = project(p['LABEL_X'], p['LABEL_Y'])

countries = {}
for c in PLAYABLE:
    cid = c['id'].upper()
    g = proj_geom(geoms[cid])
    minx, miny, maxx, maxy = g.bounds
    small = max(maxx - minx, maxy - miny) < 12
    # Cadre utilisé pour zoomer : sans les petites îles lointaines ni les morceaux de l'autre côté
    # de la ligne de changement de date (Tchoukotka, Aléoutiennes).
    parts = list(g.geoms) if hasattr(g, 'geoms') else [g]
    big = max(q.area for q in parts)
    keep = [q for q in parts if q.area >= big / 100 and not (cid == 'RUS' and q.bounds[0] < 200)
            and not (cid == 'USA' and q.bounds[0] > 1800)]
    minx, miny, maxx, maxy = unary_union(keep).bounds
    lx, ly = label.get(cid, (g.centroid.x, g.centroid.y + Y0))
    countries[cid.lower()] = {
        'n': c['n'],
        'a2': wc[cid]['cca2'],
        'r': c['r'],
        'b': sorted(x.lower() for x in borders[cid]),
        'l': [round(lx), round(ly - Y0)],
        'bb': [round(minx), round(miny), round(maxx), round(maxy)],
        'p': path(g, 0.6),
        **({'dot': 1} if small else {}),
    }

bg = proj_geom(unary_union(background))
background_path = path(bg, 0.8)

# ---- Parties : paires de pays reliées par la terre, par zone.
EXTRA = {'europe': {'tur', 'geo', 'arm', 'aze'}, 'asie': {'rus'}}
LIMITS = {'monde': (2, 7), 'europe': (2, 6), 'afrique': (2, 6), 'asie': (2, 6), 'ameriques': (2, 6)}


def members(region):
    return {k for k, v in countries.items() if region == 'monde' or v['r'] == region or k in EXTRA.get(region, ())}


def bfs(start, allowed):
    dist = {start: 0}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in countries[u]['b']:
            if v in allowed and v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist


puzzles = {}
for region, (lo, hi) in LIMITS.items():
    allowed = members(region)
    pairs = []
    for a in sorted(allowed):
        d = bfs(a, allowed)
        for b, n in d.items():
            if a < b and lo <= n - 1 <= hi:
                pairs.append((a, b))
    rng = random.Random('passe-frontieres-' + region)
    rng.shuffle(pairs)
    # Ordre aléatoire de départ/arrivée, et pas deux fois de suite le même pays.
    out = []
    for a, b in pairs:
        if rng.random() < .5:
            a, b = b, a
        out.append(a + b)
    for i in range(1, len(out)):
        if set([out[i][:3], out[i][3:]]) & set([out[i - 1][:3], out[i - 1][3:]]):
            j = next((j for j in range(i + 1, len(out)) if not set([out[j][:3], out[j][3:]]) & set([out[i - 1][:3], out[i - 1][3:]])), None)
            if j:
                out[i], out[j] = out[j], out[i]
    puzzles[region] = out[:1500]
    print(region, len(allowed), 'pays,', len(pairs), 'paires')

data = {
    'w': W, 'h': round(project(0, -60)[1] - Y0),
    'regions': {r: sorted(members(r)) for r in LIMITS},
    'c': countries, 'bg': background_path, 'puzzles': puzzles,
}
js = ('// Généré par outils/build_frontieres.py — ne pas modifier à la main.\n'
      '// Frontières : world-countries (ODbL). Contours : Natural Earth (domaine public).\n'
      'const DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
(ROOT / 'frontieres').mkdir(exist_ok=True)
(ROOT / 'frontieres/data.js').write_text(js)
print('data.js :', len(js) // 1024, 'Ko')
