from .normalize_data import chain_key, number, slug

# These categories are excluded from DefiLlama's default chain denominator.
EXCLUDED = {'Liquid Staking', 'Liquid Restaking', 'Restaking', 'Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Chain', 'CEX', 'Staking Pool', 'Risk Curators', 'Onchain Capital Allocator'}

def fetch_protocols(api, include_excluded=False):
    raw = api.get('/protocols')
    if not isinstance(raw, list) or not raw or not all(isinstance(p,dict) and p.get('slug') for p in raw):
        raise ValueError('Invalid protocols response')
    parents = {p.get('parentProtocol') for p in raw if p.get('parentProtocol')}
    result = {}
    for p in raw:
        if p.get('id') in parents or str(p.get('id','')).startswith('parent#'):
            continue
        excluded = p.get('category') in EXCLUDED or bool(p.get('doublecounted')) or bool(p.get('isParentProtocol'))
        if excluded and not include_excluded:
            continue
        if not isinstance(p.get('chainTvls'),dict):
            continue
        values = {}
        for name, value in p['chainTvls'].items():
            # Supplemental TVL buckets are never interpreted as chains.
            if name.lower() in {'staking','pool2','borrowed','vesting','offers'} or any(name.lower().endswith('-'+s) for s in ['staking','pool2','borrowed','vesting','offers']):
                continue
            if number(value):
                key = chain_key(name)
                if key in values and values[key] != value:
                    raise ValueError(f'Conflicting chain TVL: {p["slug"]}/{name}')
                values[key] = value
        key = slug(p['slug'])
        item = {'eligible':not excluded,'slug':key,'apiSlug':p['slug'],'name':p.get('name',p['slug']), 'category':p.get('category') or '未分類','parent':p.get('parentProtocol'),'globalTvl':p.get('tvl') if number(p.get('tvl')) else None,'chainTvls':values}
        if key in result and result[key] != item:
            raise ValueError(f'Duplicate protocol: {key}')
        result[key] = item
    if not result:
        raise ValueError('No eligible protocols')
    return result

def rank_protocols(protocols, chain):
    rows = [dict(p, tvl=p['chainTvls'][chain], chain=chain) for p in protocols.values() if chain in p['chainTvls'] and p.get('eligible',True)]
    return sorted(rows, key=lambda p:(-p['tvl'],p['slug']))
