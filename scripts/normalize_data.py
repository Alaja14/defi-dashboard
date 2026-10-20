import math
import re
from datetime import datetime, timezone

def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0

def slug(value):
    result = re.sub(r'[^a-z0-9]+', '-', str(value).lower()).strip('-')
    if not result:
        raise ValueError('Empty identity')
    return result

def chain_key(value):
    aliases = {'binance': 'bsc', 'binance-smart-chain': 'bsc', 'bnb-chain': 'bsc', 'polygon-pos':'polygon', 'op-bnb':'opbnb', 'xdai':'gnosis', 'optimism':'op-mainnet'}
    return aliases.get(slug(value), slug(value))

def history(rows, value_key='tvl'):
    if not isinstance(rows, list) or not rows:
        raise ValueError('Empty history')
    points = {}
    for row in rows:
        if not isinstance(row, dict) or not number(row.get(value_key)):
            raise ValueError('Invalid history value')
        timestamp = int(row['date'])
        day = datetime.fromtimestamp(timestamp, timezone.utc).date().isoformat()
        # Latest timestamp wins when the API supplies multiple observations in one UTC day.
        if day not in points or timestamp >= points[day][0]:
            points[day] = (timestamp, row[value_key])
    return [{'date':day,'tvl':points[day][1]} for day in sorted(points)]

def merge_history(old, new):
    points = {p['date']:p for p in old}
    points.update({p['date']:p for p in new})
    return [points[day] for day in sorted(points)]
