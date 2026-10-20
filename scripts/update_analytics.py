"""Independent free market adapters. Per-source failure preserves its last good data."""
import hashlib
import logging
import math
import re
import time
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
import requests
from .api import API
from .build_data import read, write
from .category_growth import build_categories
from .calculate_metrics import change
from .fetch_protocols import fetch_protocols
from .normalize_data import number, merge_history

PERIODS = (1,7,30,180)
SOURCES = {
    'dex': 'https://api.llama.fi/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume',
    'stablecoins':'https://stablecoins.llama.fi/stablecoincharts/all',
    'etf':'https://farside.co.uk/bitcoin-etf-flow-all-data/',
    'rwa':'https://api-docs.defillama.com/',
    'rwaTvl':'https://api.llama.fi/protocols',
}


def daily_points(rows, today=None, signed=False, nullable=False):
    today = today or datetime.now(timezone.utc).date()
    by_day = {}
    for day, value in rows:
        if not (nullable and value is None) and (not isinstance(value,(float,int)) or isinstance(value,bool) or not math.isfinite(value) or (not signed and value<0)):
            raise ValueError('Invalid market series value')
        parsed = date.fromisoformat(day)
        if parsed > today: raise ValueError('Future market date')
        if day in by_day and by_day[day] != value: raise ValueError('Conflicting market date')
        by_day[day] = value
    if not by_day: raise ValueError('Empty market history')
    return [{'date':d,'tvl':by_day[d]} for d in sorted(by_day)]


def window_metrics(points, mode, days, calendar='daily'):
    values = {p['date']:p['tvl'] for p in points}
    end = date.fromisoformat(points[-1]['date'])
    if mode == 'stock':
        current = points[-1]['tvl']
        base_day=(end-timedelta(days=days)).isoformat()
        base = values.get(base_day)
        if points[-1].get('cohort'):
            earlier=next((p for p in points if p['date']==base_day),{})
            if earlier.get('cohort') != points[-1]['cohort']: base=None
        return {'value':current,'baseline':base,'change':change(current,base),'absolute':current-base if base is not None else None,'observations':1}
    def total(offset):
        finish = end-timedelta(days=offset)
        start = finish-timedelta(days=days-1)
        selected = [p for p in points if start.isoformat()<=p['date']<=finish.isoformat()]
        if calendar == 'trading':
            # No synthetic weekend/holiday zeros. Require full source history to cover the window.
            if points[0]['date'] > start.isoformat(): return None,len(selected)
        elif len(selected) != days: return None,len(selected)
        return (sum(p['tvl'] for p in selected) if selected and all(p['tvl'] is not None for p in selected) else None),sum(p['tvl'] is not None for p in selected)
    current,count = total(0)
    base,_ = total(days)
    # Net flows may be negative. Percentage growth through zero or a negative base is undefined.
    return {'value':current,'baseline':base,'change':change(current,base) if current is not None and current >= 0 else None,'absolute':current-base if current is not None and base is not None else None,'observations':count}


class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.row=None; self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr': self.row=[]
        elif tag in ('td','th') and self.row is not None: self.cell=[]
    def handle_data(self,data):
        if self.cell is not None: self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ('td','th') and self.cell is not None:
            self.row.append(' '.join(''.join(self.cell).split())); self.cell=None
        elif tag=='tr' and self.row is not None:
            self.rows.append(self.row); self.row=None


def parse_etf(html):
    parser=Tables();parser.feed(html);dated=[]
    for row in parser.rows:
        if row and re.fullmatch(r'\d{2} [A-Za-z]{3} \d{4}',row[0]):
            dated.append((datetime.strptime(row[0],'%d %b %Y').date().isoformat(),row[1:]))
    first_report={}
    missing={'','-','—','N/A'}
    for day,cells in sorted(dated):
        for i,cell in enumerate(cells[:-1]):
            if cell not in missing: first_report.setdefault(i,day)
    rows=[]
    for day,cells in dated:
        # Before launch, a fund's dash is not a missing report. After launch it is.
        incomplete=not cells or cells[-1] in missing or any(v in missing and day>=first_report.get(i,day) for i,v in enumerate(cells[:-1]))
        value=None if incomplete else float(cells[-1].replace(',','').replace('(','-').replace(')',''))*1_000_000
        rows.append((day,value))
    result=daily_points(rows,signed=True,nullable=True)
    if not any(p['tvl'] is not None for p in result): raise ValueError('ETF source has no complete observations')
    return result


def fetch_html(url):
    for attempt in range(3):
        try:
            response=requests.get(url,timeout=(15,45),headers={'User-Agent':'DeFiTVLMonitor/1.1 (public data research)'})
            response.raise_for_status()
            return response.text
        except requests.RequestException:
            if attempt==2: raise
            time.sleep(2**attempt)


def fetch_etf():
    btc=parse_etf(fetch_html(SOURCES['etf']))
    eth=parse_etf(fetch_html('https://farside.co.uk/ethereum-etf-flow-all-data/'))
    b={p['date']:p['tvl'] for p in btc};e={p['date']:p['tvl'] for p in eth}
    # Preserve incomplete sessions as null, so rolling windows cannot silently omit them.
    start=max(min(b),min(e))
    keys=sorted(d for d in set(b)|set(e) if d>=start)
    rows=[(d,b[d]+e[d] if b.get(d) is not None and e.get(d) is not None else None) for d in keys]
    while rows and rows[-1][1] is None: rows.pop()
    return daily_points(rows,signed=True,nullable=True)


def fetch_dex():
    raw=API().get('/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume',ttl=3600)
    # Exclude the still-open UTC day; aggregate actual daily volume, not a TVL proxy.
    today=datetime.now(timezone.utc).date()
    return daily_points([(datetime.fromtimestamp(int(t),timezone.utc).date().isoformat(),v) for t,v in raw['totalDataChart'] if datetime.fromtimestamp(int(t),timezone.utc).date()<today])


def fetch_stablecoins():
    raw=API(base_url='https://stablecoins.llama.fi').get('/stablecoincharts/all',ttl=3600)
    rows=[]
    for p in raw:
        values=p.get('totalCirculatingUSD')
        if not isinstance(values,dict) or not values or not all(number(v) for v in values.values()): raise ValueError('Invalid USD stablecoin market cap')
        rows.append((datetime.fromtimestamp(int(p['date']),timezone.utc).date().isoformat(),sum(values.values())))
    return daily_points(rows)


def fetch_rwa_tvl(root):
    catalog=fetch_protocols(API())
    rwa=[p for p in catalog.values() if p['category']=='RWA']
    reported=[p for p in rwa if number(p['globalTvl'])]
    if not reported: raise ValueError('No reported RWA protocol TVL')
    cohort=hashlib.sha256(','.join(sorted(p['slug'] for p in reported)).encode()).hexdigest()
    today=datetime.now(timezone.utc).date().isoformat()
    points=merge_history(read(root/'history/markets/rwaTvl.json',[]),[{'date':today,'tvl':sum(p['globalTvl'] for p in reported),'cohort':cohort}])
    return {'points':points,'coverage':{'reported':len(reported),'total':len(rwa)},'scope':'reported-rwa-protocol-tvl-subset'}


def run(root=Path('data')):
    root=Path(root);now=datetime.now(timezone.utc).isoformat()
    build_categories(root)
    previous=read(root/'latest/markets.json',{'feeds':{}})['feeds']
    feeds={}
    for key,mode,calendar,fetch in [('dex','flow','daily',fetch_dex),('stablecoins','stock','daily',fetch_stablecoins),('etf','flow','trading',fetch_etf),('rwaTvl','stock','daily',lambda:fetch_rwa_tvl(root))]:
        try:
            result=fetch()
            extra={k:v for k,v in result.items() if k!='points'} if isinstance(result,dict) else {}
            points=result['points'] if isinstance(result,dict) else result
            path=f'history/markets/{key}.json'
            # Validate and calculate before replacing a feed's persisted history.
            periods={str(d):window_metrics(points,mode,d,calendar) for d in PERIODS}
            feed={**extra,'status':'ok','asOf':points[-1]['date'],'updatedAt':now,'source':SOURCES[key],'mode':mode,'calendar':calendar,'periods':periods,'historyPath':path}
            temporary=root/(path+'.tmp');write(temporary,points);temporary.replace(root/path)
            feeds[key]=feed
        except Exception as exc:
            logging.warning('%s unavailable: %s',key,exc)
            old=previous.get(key,{})
            feeds[key]={**old,'status':'stale' if old.get('historyPath') else 'unavailable','source':SOURCES[key],'mode':mode,'calendar':calendar,'error':'source_unavailable','attemptedAt':now,'diagnostic':str(exc)}
    feeds['rwa']={'status':'unavailable','source':SOURCES['rwa'],'mode':'stock','error':'licensed_aum_source_required','attemptedAt':now}
    payload={'version':1,'updatedAt':now,'feeds':feeds}
    temporary=root/'latest/markets.json.tmp';write(temporary,payload);temporary.replace(root/'latest/markets.json')
    return payload

if __name__=='__main__':
    logging.basicConfig(level=logging.INFO)
    result=run()
    print({k:v['status'] for k,v in result['feeds'].items()})
