from datetime import date, timedelta

def change(current, baseline):
    if baseline is None or baseline <= 0:
        return None
    return (current / baseline - 1) * 100

def share(value, total):
    return value / total * 100 if total and total > 0 else None

def metrics(points, day, current):
    values = {p['date']:p['tvl'] for p in points}
    result = {}
    for offset in (1,7,30,180):
        baseline = values.get((date.fromisoformat(day)-timedelta(days=offset)).isoformat())
        result[f'change{offset}d'] = change(current, baseline)
        result[f'absolute{offset}d'] = current-baseline if baseline is not None else None
    return result

def rank(rows):
    return [dict(row,rank=i+1) for i,row in enumerate(sorted(rows,key=lambda p:(-p['tvl'],p['slug'])))]
