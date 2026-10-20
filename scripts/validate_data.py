import json
from datetime import date, datetime, timezone
from pathlib import Path
from .normalize_data import number
from .calculate_metrics import metrics, share

def validate_history(points, signed=False):
    days = []
    for p in points:
        parsed = date.fromisoformat(p['date'])
        if parsed.isoformat() != p['date'] or parsed > datetime.now(timezone.utc).date():
            raise ValueError('Invalid or future date')
        if not ((signed and (p['tvl'] is None or (isinstance(p['tvl'],(int,float)) and not isinstance(p['tvl'],bool) and __import__('math').isfinite(p['tvl'])))) or number(p['tvl'])):
            raise ValueError('Invalid TVL')
        days.append(p['date'])
    if days != sorted(set(days)):
        raise ValueError('Duplicate or unsorted history')

def validate(root):
    root = Path(root)
    chains = json.loads((root/'latest/chains.json').read_text())
    protocols = json.loads((root/'latest/protocols.json').read_text())
    summary = json.loads((root/'latest/summary.json').read_text())
    if not chains or not protocols or len({c['slug'] for c in chains}) != len(chains):
        raise ValueError('Empty or duplicate records')
    timestamp = datetime.fromisoformat(summary['updatedAt'])
    if timestamp.tzinfo is None or timestamp.date().isoformat() != summary['snapshotDate']:
        raise ValueError('Invalid update timestamp')
    if not number(summary['globalTvl']) or not number(summary['top10Tvl']):
        raise ValueError('Invalid summary TVL')
    if abs(sum(c['tvl'] for c in chains[:10])-summary['top10Tvl']) > 0.01:
        raise ValueError('Top 10 denominator mismatch')
    if abs(sum(c['tvl'] for c in chains)-summary['totalChainTvl']) > 0.01:
        raise ValueError('Chain denominator mismatch')
    if len({(p['chain'],p['slug']) for p in protocols}) != len(protocols):
        raise ValueError('Duplicate protocol/chain')
    warnings = []
    chain_map = {c['slug']:c for c in chains}
    for i,c in enumerate(chains):
        if c['rank'] != i+1 or (i and chains[i-1]['tvl'] < c['tvl']):
            raise ValueError('Invalid chain ranking')
    for row in chains + protocols:
        if not number(row['tvl']):
            raise ValueError('Invalid TVL')
        if 'chain' in row and row.get('sourceChain') != row['chain']:
            raise ValueError('Protocol chain attribution mismatch')
        points = json.loads((root/row['historyPath']).read_text())
        point = next((p for p in points if p['date'] == summary['snapshotDate']),None)
        if point is None or point['tvl'] != row['tvl']:
            raise ValueError('Latest/history mismatch')
        expected = metrics(points,summary['snapshotDate'],row['tvl'])
        if any(row.get(k) != v for k,v in expected.items()):
            raise ValueError('Historical baseline mismatch')
        denominator = chain_map[row['chain']]['tvl'] if 'chain' in row else summary['totalChainTvl']
        if row['share'] != share(row['tvl'],denominator):
            raise ValueError('Market share denominator mismatch')
        for days in (1,7,30,180):
            value = row.get(f'change{days}d')
            if value is not None and (not isinstance(value,(int,float)) or not __import__('math').isfinite(value)):
                raise ValueError('Invalid change')
        if abs(row.get('change1d') or 0) > 50:
            warnings.append(f'{row["slug"]}：單日 TVL 變化超過 50%')
    for file in (root/'history').rglob('*.json'):
        validate_history(json.loads(file.read_text()), signed=file.relative_to(root).as_posix()=='history/markets/etf.json')
    return warnings

if __name__ == '__main__':
    print(json.dumps({'warnings':validate('data')}, ensure_ascii=False))
