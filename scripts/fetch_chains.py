from .normalize_data import chain_key, number

def fetch_chains(api):
    raw = api.get('/v2/chains')
    if not isinstance(raw, list) or not raw:
        raise ValueError('Invalid chains response')
    chains = {}
    for row in raw:
        if not isinstance(row, dict) or not row.get('name') or not number(row.get('tvl')):
            raise ValueError('Invalid chain record')
        key = chain_key(row['name'])
        item = {'slug':key,'name':row['name'],'tvl':row['tvl'],'chainId':row.get('chainId')}
        if key in chains and chains[key] != item:
            if item['chainId'] is not None and item['chainId'] == chains[key]['chainId'] and min(item['tvl'],chains[key]['tvl']) == 0:
                if item['tvl'] <= chains[key]['tvl']: continue
            else:
                raise ValueError(f'Conflicting chain identity: {key}')
        chains[key] = item
    return sorted(chains.values(), key=lambda p:(-p['tvl'],p['slug']))
