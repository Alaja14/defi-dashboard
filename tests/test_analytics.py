from datetime import date, timedelta
import pytest
from scripts import update_analytics as market
from scripts.build_data import write, read
from scripts.category_growth import build_categories


def series(values):
    return [{'date':(date(2026,1,1)+timedelta(days=i)).isoformat(),'tvl':v} for i,v in enumerate(values)]


def test_flow_windows_compare_equal_totals_and_reject_gaps():
    points=series([10]*7+[20]*7)
    result=market.window_metrics(points,'flow',7)
    assert (result['value'],result['baseline'],result['change'])==(140,70,100)
    assert market.window_metrics(points[:-2]+points[-1:],'flow',7)['value'] is None


def test_stock_exact_baseline_and_same_cohort():
    points=series([100,200,300])
    assert market.window_metrics(points,'stock',1)['change']==50
    assert market.window_metrics([points[0],points[2]],'stock',1)['baseline'] is None
    points[-1]['cohort']='new'
    points[-2]['cohort']='old'
    assert market.window_metrics(points,'stock',1)['change'] is None


def test_net_flow_negative_and_incomplete_sessions():
    assert market.window_metrics(series([-10,20]),'flow',1,'trading')['change'] is None
    assert market.window_metrics(series([10,-20]),'flow',1,'trading')['change'] is None
    points=series([1]*14);points[10]['tvl']=None
    assert market.window_metrics(points,'flow',7,'trading')['value'] is None
    # An absent closed day is not a fabricated zero observation.
    assert market.window_metrics(series([1]*12)+[series([1]*14)[-1]],'flow',7,'trading')['observations']==6


def test_etf_parse_units_sign_and_prelaunch_vs_missing():
    html='<table>'+''.join('<tr>'+''.join(f'<td>{v}</td>' for v in row)+'</tr>' for row in [
        ['01 Jan 2026','10','-','10'],
        ['02 Jan 2026','(5)','1','(4)'],
        ['03 Jan 2026','2','-','2'],
    ])+'</table>'
    assert [p['tvl'] for p in market.parse_etf(html)]==[10_000_000,-4_000_000,None]


def test_market_dates_reject_conflicts_future_and_unsigned_negatives():
    for rows in [[('2026-01-01',1),('2026-01-01',2)],[('2026-01-03',1)],[('2026-01-01',-1)]]:
        with pytest.raises(ValueError): market.daily_points(rows,today=date(2026,1,2))
    assert market.daily_points([('2026-01-01',-1)],today=date(2026,1,2),signed=True)[0]['tvl']==-1


def test_stablecoins_use_usd_all_pegs(monkeypatch):
    monkeypatch.setattr(market.API,'get',lambda *a,**k:[{'date':'1767225600','totalCirculatingUSD':{'USD':100,'EUR':120},'totalCirculating':{'USD':9999}}])
    assert market.fetch_stablecoins()[0]['tvl']==220


def test_category_growth_weights_baselines_and_requires_every_member(tmp_path):
    write(tmp_path/'latest/summary.json',{'snapshotDate':'2026-01-08','updatedAt':'now'})
    write(tmp_path/'latest/chains.json',[{'slug':'ethereum','name':'Ethereum'}])
    members=[{'chain':'ethereum','slug':slug,'category':'Dexes','tvl':value,'historyPath':f'history/{slug}.json'} for slug,value in [('a',200),('b',990)]]
    write(tmp_path/'latest/protocols.json',members+[dict(members[0],slug='archived',eligible=False,tvl=999999)])
    write(tmp_path/'history/a.json',[{'date':'2026-01-01','tvl':100}])
    write(tmp_path/'history/b.json',[{'date':'2026-01-01','tvl':900}])
    row=build_categories(tmp_path)['rows'][0]
    assert row['category']=='Dexs' and row['count']==2
    assert row['periods']['7']['change']==pytest.approx(19)
    write(tmp_path/'history/b.json',[])
    row=build_categories(tmp_path)['rows'][0]
    assert row['periods']['7']['change'] is None
    assert row['periods']['7']['covered']==1


def test_feed_failure_keeps_previous_history_and_values(tmp_path,monkeypatch):
    monkeypatch.setattr(market,'build_categories',lambda root:None)
    def fail(*args): raise ValueError('offline')
    for name in ('fetch_dex','fetch_stablecoins','fetch_etf','fetch_rwa_tvl'): monkeypatch.setattr(market,name,fail)
    old={'historyPath':'history/markets/dex.json','periods':{'7':{'value':123}},'asOf':'2026-01-01'}
    write(tmp_path/'latest/markets.json',{'feeds':{'dex':old}})
    write(tmp_path/old['historyPath'],series([123]))
    result=market.run(tmp_path)['feeds']
    assert result['dex']['status']=='stale' and result['dex']['periods']==old['periods']
    assert read(tmp_path/old['historyPath'])==series([123])
    assert result['rwa']['status']=='unavailable'
    assert result['etf']['status']=='unavailable'


def test_six_month_windows_use_180_days():
    points=series([10]*180+[20]*180)
    result=market.window_metrics(points,'flow',180)
    assert (result['value'],result['baseline'],result['change'])==(3600,1800,100)
    result=market.window_metrics(points,'stock',180)
    assert (result['value'],result['baseline'],result['change'])==(20,10,100)
    assert market.window_metrics(points[-100:],'flow',180)['value'] is None
    from scripts.calculate_metrics import metrics
    assert metrics(points,points[-1]['date'],20)['change180d']==100
