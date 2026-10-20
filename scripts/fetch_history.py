from .api import segment
from .normalize_data import history, chain_key

def fetch_chain_history(api, name=None):
    return history(api.get('/v2/historicalChainTvl' + ('/' + segment(name) if name else ''), ttl=86400))

def fetch_protocol_history(api, api_slug, chains):
    raw = api.get('/protocol/' + segment(api_slug), ttl=86400)
    if not isinstance(raw,dict) or not isinstance(raw.get('chainTvls'),dict):
        raise ValueError(f'Invalid protocol detail: {api_slug}')
    result = {}
    for name, entry in raw['chainTvls'].items():
        key = chain_key(name)
        if key in chains and isinstance(entry,dict) and entry.get('tvl'):
            result[key] = history(entry['tvl'], 'totalLiquidityUSD')
    missing = set(chains) - result.keys()
    if missing:
        raise ValueError(f'Missing chain-specific history: {api_slug}: {sorted(missing)}')
    return result
