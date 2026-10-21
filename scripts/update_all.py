"""Publish only validated complete generations. Run with python -m scripts.update_all."""
import argparse
import logging
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path
from .api import API
from .build_data import read, write
from .calculate_metrics import metrics, rank, share
from .fetch_chains import fetch_chains
from .fetch_protocols import fetch_protocols, rank_protocols
from .fetch_history import fetch_chain_history, fetch_protocol_history
from .normalize_data import merge_history, chain_key
from .validate_data import validate
from .generate_insights import generate
from .category_growth import build_categories

log = logging.getLogger('etl')

def run(root=Path('data'), workers=4, refresh=False):
    root = Path(root)
    now = datetime.now(timezone.utc)
    day, yesterday = now.date().isoformat(), (now.date()-timedelta(days=1)).isoformat()
    stage, backup = root.parent/'.data-stage', root.parent/'.data-backup'
    # Recover an interrupted two-rename publication before starting another run.
    if backup.exists() and not root.exists():
        backup.rename(root)
    api = API()
    errors, warnings = [], []
    unavailable = {}
    old_protocols = {(p["chain"],p["slug"]):p for p in read(root/"latest/protocols.json",[])}
    old_missing = {(p["chain"],p["slug"]):p for p in read(root/"metadata/unavailable-protocols.json",[])}
    def mark_unavailable(p,c,reason):
        old = old_protocols.get((c,p),old_missing.get((c,p),{}))
        unavailable[(c,p)] = {"slug":p,"chain":c,"category":old.get("category","Unknown"),"reason":reason}
        warnings.append(f"Protocol unavailable: {p}/{c}; excluded from current totals; historical observations retained")
    try:
        chains, catalog = fetch_chains(api), fetch_protocols(api, include_excluded=True)
        old_chains = read(root/'latest/chains.json', [])
        missing_chains = {chain_key(c['slug']) for c in old_chains} - {c['slug'] for c in chains}
        if missing_chains:
            raise ValueError(f'Chain list shrank; retain previous release, missing: {sorted(missing_chains)}')
        chains = rank(chains)
        chain_by = {c['slug']:c for c in chains}
        tracked = read(root/'metadata/tracked.json', {})
        for c in chains[:10]:
            for p in rank_protocols(catalog,c['slug'])[:30]:
                tracked.setdefault(p['slug'],[])
                if c['slug'] not in tracked[p['slug']]:
                    tracked[p['slug']].append(c['slug'])
        if stage.exists(): shutil.rmtree(stage)
        if root.exists(): shutil.copytree(root,stage)
        else: stage.mkdir()
        chain_histories, protocol_histories = {}, {}
        jobs = {}
        def needs(points):
            return refresh or not points or points[-1]['date'] < yesterday
        with ThreadPoolExecutor(max_workers=max(1,min(workers,8))) as pool:
            for c in chains:
                old = read(root/f'history/chains/{c["slug"]}.json',[])
                chain_histories[c['slug']] = old
                if needs(old):
                    jobs[pool.submit(fetch_chain_history,api,c['name'])] = ('chain',c['slug'])
            jobs[pool.submit(fetch_chain_history,api)] = ('global','global')
            for p, keys in tracked.items():
                if p not in catalog:
                    for c in keys: mark_unavailable(p,c,'protocol_absent')
                    continue
                available_keys = []
                for c in keys:
                    if c not in catalog[p]['chainTvls']:
                        mark_unavailable(p,c,'chain_tvl_absent')
                        continue
                    available_keys.append(c)
                    protocol_histories[(c,p)] = read(root/f'history/protocols/{c}/{p}.json',[])
                if any(needs(protocol_histories[(c,p)]) for c in available_keys):
                    jobs[pool.submit(fetch_protocol_history,api,catalog[p]['apiSlug'],available_keys)] = ('protocol',p)
            done = 0
            for future in as_completed(jobs):
                kind, key = jobs[future]
                try:
                    value = future.result()
                    if kind == 'chain': chain_histories[key] = merge_history(chain_histories[key],value)
                    elif kind == 'global': global_history = value
                    else:
                        for c, points in value.items():
                            protocol_histories[(c,key)] = merge_history(protocol_histories[(c,key)],points)
                except Exception as exc:
                    # A zero-TVL chain with no API history has an empty pre-observation history.
                    if kind == 'chain' and chain_by[key]['tvl'] == 0 and 'Empty' in str(exc):
                        warnings.append(f'{key}: zero current TVL, historical data unavailable')
                    else: errors.append(f'{kind}/{key}: {exc}')
                done += 1
                if done % 20 == 0: log.info('History requests: %s/%s',done,len(jobs))
        if errors: raise ValueError('; '.join(errors))
        total = sum(c['tvl'] for c in chains)
        # Official global history remains independent of the sum of current chain TVLs.
        global_current = global_history[-1]['tvl']
        global_day = global_history[-1]['date']
        previous = read(root/f'snapshots/{yesterday}.json',{})
        prev_chains = {c['slug']:c for c in previous.get('chains',[])}
        for c in chains:
            points = merge_history(chain_histories[c['slug']],[{'date':day,'tvl':c['tvl']}])
            chain_histories[c['slug']] = points
            write(stage/f'history/chains/{c["slug"]}.json', points)
            c.update(metrics(points,day,c['tvl']))
            c['share'] = share(c['tvl'],total)
            prev = prev_chains.get(c['slug'])
            c['rankChange'] = prev['rank']-c['rank'] if prev else None
            c['shareChange1d'] = c['share']-prev['share'] if prev and c['share'] is not None and prev.get('share') is not None else None
            c['historyPath'] = f'history/chains/{c["slug"]}.json'
        rows = []
        for p, keys in tracked.items():
            for c in keys:
                if (c,p) in unavailable: continue
                value = catalog[p]['chainTvls'][c]
                points = merge_history(protocol_histories[(c,p)],[{'date':day,'tvl':value}])
                path = f'history/protocols/{c}/{p}.json'
                write(stage/path,points)
                item = {k:v for k,v in catalog[p].items() if k not in ('chainTvls','apiSlug')}
                item.update({'chain':c,'sourceChain':c,'rank':None,'rankChange':None,'tvl':value,'share':share(value,chain_by[c]['tvl']),'historyPath':path,**metrics(points,day,value)})
                old = next((x for x in previous.get('protocols',[]) if x['chain']==c and x['slug']==p),None)
                item['shareChange1d'] = item['share']-old['share'] if old and old.get('share') is not None and item['share'] is not None else None
                rows.append(item)
        for c in chains:
            subset = rank([p for p in rows if p['chain']==c['slug'] and p.get('eligible',True)])
            for p in subset:
                target = next(r for r in rows if r['chain']==p['chain'] and r['slug']==p['slug'])
                target['rank'] = p['rank']
                old = next((x for x in previous.get('protocols',[]) if x['chain']==p['chain'] and x['slug']==p['slug']),None)
                target['rankChange'] = old['rank']-p['rank'] if old and old.get('rank') is not None else None
            top = subset[:30]
            c['top30Tvl'] = sum(p['tvl'] for p in top)
            c['protocolCount'] = len(subset)
            c['protocolGap'] = c['tvl']-c['top30Tvl']
            if c['protocolGap'] < -0.01:
                warnings.append(f'{c["name"]}：前 30 Protocol 合計超過鏈 TVL；前 10 也超過時停用圓餅圖')
        top_keys = [c['slug'] for c in chains[:10]]
        maps = {c:{p['date']:p['tvl'] for p in chain_histories[c]} for c in top_keys}
        dates = sorted(set.union(*(set(m) for m in maps.values())))
        combined = [{'date':d,'tvl':sum(m[d] for m in maps.values())} for d in dates if all(d in m for m in maps.values())]
        summary = {'version':1,'source':'https://api.llama.fi','updatedAt':now.isoformat(),'snapshotDate':day,'globalAsOf':global_day,'globalTvl':global_current,'totalChainTvl':total,'top10Tvl':sum(c['tvl'] for c in chains[:10]),'chainCount':len(chains),'protocolCount':len(rows),'largestChain':chains[0]['name'],'metrics':metrics(global_history,global_day,global_current),'top10Members':top_keys,'globalChainDifference':global_current-total}
        write(stage/'latest/summary.json',summary)
        write(stage/'latest/chains.json',chains)
        write(stage/'latest/protocols.json',rows)
        write(stage/'latest/insights.json',generate(chains,[p for p in rows if p.get('eligible',True)]))
        write(stage/'history/global.json',global_history)
        write(stage/'history/top10.json',combined)
        write(stage/'metadata/tracked.json',tracked)
        write(stage/f'snapshots/{day}.json',{'date':day,'sampledAt':now.isoformat(),'chains':chains,'protocols':rows})
        write(stage/'metadata/unavailable-protocols.json',list(unavailable.values()))
        build_categories(stage)
        warnings.extend(validate(stage))
        if global_day < yesterday:
            warnings.append(f'全球 API 資料過期：最新日期 {global_day}')
        log.info('Validation warnings: %s',warnings)
        write(stage/'metadata/update-status.json',{'status':'success','attemptedAt':now.isoformat(),'lastSuccess':now.isoformat(),'warnings':warnings,'errors':[],'unavailableProtocols':list(unavailable.values())})
        if backup.exists(): shutil.rmtree(backup)
        if root.exists(): root.rename(backup)
        stage.rename(root)
        if backup.exists(): shutil.rmtree(backup)
        log.info('Published %s chains and %s chain/protocol pairs; %s warnings',len(chains),len(rows),len(warnings))
        return True
    except Exception as exc:
        log.exception('Update failed; previous release preserved')
        if backup.exists() and not (root/'latest/summary.json').exists():
            if root.exists(): shutil.rmtree(root)
            backup.rename(root)
        status = read(root/'metadata/update-status.json',{})
        write(root/'metadata/update-status.json',{'status':'error','attemptedAt':now.isoformat(),'lastSuccess':status.get('lastSuccess'),'errors':errors or [str(exc)],'warnings':warnings})
        return False

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s')
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers',type=int,default=4)
    parser.add_argument('--refresh-history',action='store_true')
    args = parser.parse_args()
    sys.exit(0 if run(workers=args.workers,refresh=args.refresh_history) else 1)
