import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
import pytest
from scripts.calculate_metrics import change, share, metrics, rank
from scripts.normalize_data import history, merge_history, number
from scripts.fetch_chains import fetch_chains
from scripts.fetch_protocols import fetch_protocols, rank_protocols
from scripts.fetch_history import fetch_protocol_history
from scripts.validate_data import validate_history, validate
from scripts.build_data import read, write
from scripts import update_all

@pytest.fixture
def fixture():
    return json.loads((Path(__file__).parent/'fixtures/api.json').read_text())

class MockAPI:
    def __init__(self, value): self.value = value
    def get(self, *args, **kwargs): return self.value

def test_percentage(): assert change(120,100) == pytest.approx(20)
@pytest.mark.parametrize('base',[0,None])
def test_zero_missing(base): assert change(10,base) is None

def test_exact_day_no_interpolation():
    m=metrics([{'date':'2024-01-01','tvl':100}], '2024-01-03',120)
    assert m['change1d'] is None and m['absolute1d'] is None
    assert metrics([{'date':'2024-01-01','tvl':100}],'2024-01-08',120)['change7d']==pytest.approx(20)

def test_month_30_days():
    assert metrics([{'date':'2024-01-31','tvl':100}],'2024-03-01',200)['change30d']==100

def test_rank_share():
    assert [p['slug'] for p in rank([{'slug':'b','tvl':1},{'slug':'a','tvl':2}])]==['a','b']
    assert share(25,100)==25
    assert share(25,0) is None

def test_chain_aliases(fixture):
    rows=fetch_chains(MockAPI(fixture['chains']))
    assert len(rows)==2 and rows[1]['slug']=='bsc' and rows[1]['tvl']==30

def test_protocol_ranking_and_exclusions(fixture):
    rows=fetch_protocols(MockAPI(fixture['protocols']))
    assert set(rows)=={'aave-v3','dex'}
    assert [p['slug'] for p in rank_protocols(rows,'ethereum')]==['aave-v3','dex']
    assert rank_protocols(rows,'bsc')[0]['tvl']==20
    assert 'ethereum-borrowed' not in rows['aave-v3']['chainTvls']

def test_chain_specific_history(fixture):
    rows=fetch_protocol_history(MockAPI(fixture['detail']),'aave-v3',['ethereum','bsc'])
    assert rows['ethereum'][-1]['tvl']==80
    assert rows['bsc'][-1]['tvl']==20
    with pytest.raises(ValueError): fetch_protocol_history(MockAPI(fixture['detail']),'aave-v3',['solana'])

def test_idempotent_snapshot():
    rows=[{'date':'2024-01-01','tvl':10}]
    assert merge_history(rows,rows)==rows
    assert merge_history(rows,[{'date':'2024-01-01','tvl':11}])==[{'date':'2024-01-01','tvl':11}]

def test_history_daily_latest():
    assert history([{'date':1704067201,'tvl':2},{'date':1704067200,'tvl':1}])==[{'date':'2024-01-01','tvl':2}]

@pytest.mark.parametrize('value',[None,[],{},[{'name':'broken'}]])
def test_bad_chain_response(value):
    with pytest.raises((ValueError,TypeError)): fetch_chains(MockAPI(value))

@pytest.mark.parametrize('value',[None,[],{},[{'slug':'broken'}]])
def test_bad_protocol_response(value):
    with pytest.raises(ValueError): fetch_protocols(MockAPI(value))

@pytest.mark.parametrize('value',[-1,float('nan'),float('inf'),None,True,'2'])
def test_invalid_tvl(value): assert not number(value)

def test_validate_duplicate_date():
    with pytest.raises(ValueError): validate_history([{'date':'2024-01-01','tvl':1}]*2)
    with pytest.raises(ValueError): validate_history([{'date':'2024-99-01','tvl':1}])

def test_transactional_pipeline(tmp_path,monkeypatch,fixture):
    monkeypatch.chdir(tmp_path)
    today=datetime.now(timezone.utc).date()
    base=[{'date':(today-timedelta(days=d)).isoformat(),'tvl':100} for d in (30,7,1)]
    monkeypatch.setattr(update_all,'fetch_chains',lambda api:fetch_chains(MockAPI(fixture['chains'])))
    monkeypatch.setattr(update_all,'fetch_protocols',lambda api,**kwargs:fetch_protocols(MockAPI(fixture['protocols'])))
    monkeypatch.setattr(update_all,'fetch_chain_history',lambda api,name=None:base)
    monkeypatch.setattr(update_all,'fetch_protocol_history',lambda api,slug,chains:{c:base for c in chains})
    assert update_all.run()
    validate('data')
    latest=read('data/latest/protocols.json')
    assert next(p for p in latest if p['chain']=='bsc')['tvl']==20
    assert update_all.run()
    assert len(list(Path('data/snapshots').glob('*.json')))==1
    assert len(read('data/history/chains/ethereum.json'))==4
    before=Path('data/latest/summary.json').read_bytes()
    history_before=Path('data/history/chains/ethereum.json').read_bytes()
    def fail(*args,**kwargs): raise RuntimeError('API is unavailable')
    monkeypatch.setattr(update_all,'fetch_protocol_history',fail)
    assert not update_all.run(refresh=True)
    assert Path('data/latest/summary.json').read_bytes()==before
    assert Path('data/history/chains/ethereum.json').read_bytes()==history_before
    assert read('data/metadata/update-status.json')['status']=='error'

def test_api_retry(tmp_path,monkeypatch):
    from scripts.api import API
    import requests
    count=[]
    def fail(*a,**kw):
        count.append(1)
        raise requests.Timeout('timeout')
    monkeypatch.setattr('scripts.api.requests.get',fail)
    monkeypatch.setattr('scripts.api.time.sleep',lambda _:None)
    with pytest.raises(requests.Timeout): API(tmp_path,attempts=3).get('/v2/chains')
    assert len(count)==3

def test_insights_never_label_positive_as_loser():
    from scripts.generate_insights import generate
    rows=[{'slug':'a','name':'A','tvl':100,'change1d':10,'change7d':5}]
    assert all('跌幅' not in i['title'] for i in generate(rows,[]))

def test_missing_baseline_validation(tmp_path,monkeypatch,fixture):
    monkeypatch.chdir(tmp_path)
    today=datetime.now(timezone.utc).date().isoformat()
    monkeypatch.setattr(update_all,'fetch_chains',lambda api:fetch_chains(MockAPI(fixture['chains'])))
    monkeypatch.setattr(update_all,'fetch_protocols',lambda api,**kw:fetch_protocols(MockAPI(fixture['protocols'])))
    monkeypatch.setattr(update_all,'fetch_chain_history',lambda *a:[{'date':today,'tvl':100}])
    monkeypatch.setattr(update_all,'fetch_protocol_history',lambda api,slug,chains:{c:[{'date':today,'tvl':100}] for c in chains})
    assert update_all.run()
    rows=read('data/latest/chains.json')
    assert rows[0]['change1d'] is None
    rows[0]['change1d']=0
    write('data/latest/chains.json',rows)
    with pytest.raises(ValueError,match='baseline'): validate('data')

def test_publication_rename_failure_rolls_back(tmp_path,monkeypatch,fixture):
    monkeypatch.chdir(tmp_path)
    today=datetime.now(timezone.utc).date().isoformat()
    monkeypatch.setattr(update_all,'fetch_chains',lambda api:fetch_chains(MockAPI(fixture['chains'])))
    monkeypatch.setattr(update_all,'fetch_protocols',lambda api,**kw:fetch_protocols(MockAPI(fixture['protocols'])))
    monkeypatch.setattr(update_all,'fetch_chain_history',lambda *a:[{'date':today,'tvl':100}])
    monkeypatch.setattr(update_all,'fetch_protocol_history',lambda api,slug,chains:{c:[{'date':today,'tvl':100}] for c in chains})
    assert update_all.run()
    before=Path('data/latest/chains.json').read_bytes()
    original=Path.rename
    def rename(self,target):
        if self.name=='.data-stage': raise OSError('Simulated rename failure')
        return original(self,target)
    monkeypatch.setattr(Path,'rename',rename)
    assert not update_all.run()
    assert Path('data/latest/chains.json').read_bytes()==before
    assert read('data/metadata/update-status.json')['status']=='error'
