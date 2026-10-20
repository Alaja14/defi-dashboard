"""Category changes use the same eligible tracked cohort at both endpoints."""
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from .build_data import read, write
from .calculate_metrics import change


def build_categories(root):
    root = Path(root)
    summary = read(root/'latest/summary.json')
    if not summary:
        raise ValueError('Run the core ETL before category aggregation')
    today = date.fromisoformat(summary['snapshotDate'])
    chains = {c['slug']:c['name'] for c in read(root/'latest/chains.json',[])}
    groups = defaultdict(list)
    for p in read(root/'latest/protocols.json',[]):
        if p.get('eligible',True):
            groups[(p['chain'], 'Dexs' if p['category'] == 'Dexes' else p['category'])].append(p)
    rows = []
    for (chain, category), members in groups.items():
        maps = [{p['date']:p['tvl'] for p in read(root/m['historyPath'],[])} for m in members]
        current = sum(p['tvl'] for p in members)
        periods = {}
        for days in (1,7,30,180):
            baseline_day = (today-timedelta(days=days)).isoformat()
            values = [m.get(baseline_day) for m in maps]
            coverage = sum(v is not None for v in values)
            baseline = sum(values) if coverage == len(members) else None
            periods[str(days)] = {'baselineDate':baseline_day,'baseline':baseline,'value':current,'change':change(current,baseline),'absolute':current-baseline if baseline is not None else None,'covered':coverage,'total':len(members)}
        rows.append({'chain':chain,'chainName':chains.get(chain,chain),'category':category,'tvl':current,'count':len(members),'members':sorted(p['slug'] for p in members),'periods':periods})
    payload = {'asOf':summary['snapshotDate'],'updatedAt':summary['updatedAt'],'scope':'eligible-tracked-protocols-fixed-cohort','rows':rows}
    write(root/'latest/categories.json',payload)
    return payload
