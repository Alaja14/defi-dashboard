import {useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {BarChart, Bar, Cell, CartesianGrid, LineChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {ArrowUpRight, Layers3, AlertCircle} from 'lucide-react';
import {Change, Empty, ErrorState, Loading, Panel} from './components';
import {categoryLabel, money, pct, useData} from './data';
import {tr, useLanguage} from './i18n';
import type {Point} from './types';

type Period='1d'|'1w'|'1m'|'6m';
const daysOf=(p:Period)=>p==='6m'?180:p==='1m'?30:p==='1d'?1:7;
export function PeriodSwitch({value,onChange}:{value:Period;onChange:(p:Period)=>void}){
 return <div className="segmented period-switch" role="group" aria-label={tr('Time range','時間範圍')}>{(['1d','1w','1m','6m'] as Period[]).map(p=><button key={p} aria-pressed={value===p} className={value===p?'active':''} onClick={()=>onChange(p)}>{p.toUpperCase()}</button>)}</div>;
}
type PeriodValue={value:number|null;baseline:number|null;change:number|null;absolute:number|null;observations?:number;covered?:number;total?:number;baselineDate?:string};
type Category={chain:string;chainName:string;category:string;tvl:number;count:number;members:string[];periods:Record<string,PeriodValue>};
type Categories={asOf:string;scope:string;rows:Category[]};
const tooltipStyle={background:'#171c28',border:'1px solid #333b4e',borderRadius:8,color:'#e7eaf3',fontSize:12};
export function CategoryGrowth({chain}:{chain?:string}){
 useLanguage();
 const {data,loading,error}=useData<Categories>('latest/categories.json');
 const [period,setPeriod]=useState<Period>('1w');const [category,setCategory]=useState('');const [sort,setSort]=useState('percent');const [minimum,setMinimum]=useState(0);
 const days=daysOf(period);
 if(loading)return <Loading/>;
 if(error)return <ErrorState text={error}/>;
 const scoped=(data?.rows||[]).filter(r=>!chain||r.chain===chain);
 const filtered=scoped.filter(r=>(!category||r.category===category)&&r.tvl>=minimum);
 const available=filtered.filter(r=>r.periods[String(days)].change!=null).map(r=>({...r,label:chain?categoryLabel(r.category):`${r.chainName} · ${categoryLabel(r.category)}`,metric:r.periods[String(days)]}));
 available.sort((a,b)=>sort==='percent'?b.metric.change!-a.metric.change!:(b.metric.absolute||0)-(a.metric.absolute||0));
 const visible=available.slice(0,chain?30:10);
 return <Panel title={chain?tr('Protocol category growth','Protocol 分類成長'):tr('Chain × category growth leaders','各鏈 × Protocol 分類成長排名')} subtitle={tr('Same tracked cohort at both dates · TVL growth, not trading volume','同一組追蹤項目比較 · TVL 成長，不是交易量成長')} action={<PeriodSwitch value={period} onChange={setPeriod}/>}>
  <div className="analytics-toolbar"><label>{tr('Category','分類')} <select value={category} onChange={e=>setCategory(e.target.value)} aria-label={tr('Growth category','成長分類')}><option value="">{tr('All categories','全部分類')}</option>{[...new Set(scoped.map(r=>r.category))].sort().map(c=><option value={c} key={c}>{categoryLabel(c)}</option>)}</select></label><label>{tr('Rank by','排序依據')} <select value={sort} onChange={e=>setSort(e.target.value)}><option value="percent">{tr('Growth %','成長百分比')}</option><option value="absolute">{tr('Change USD','變化金額 USD')}</option></select></label><label>{tr('Minimum TVL','最低 TVL')} <select value={minimum} onChange={e=>setMinimum(Number(e.target.value))}>{[0,1e6,1e7,1e8].map(n=><option key={n} value={n}>{n?money(n):tr('No minimum','不限')}</option>)}</select></label></div>
  <p className="scope-note">{tr('1W = 7 days · 1M = 30 days · 6M = 180 days. Coverage: eligible protocols retained from top-30 tracking, not the entire category. Missing members invalidate the period.','1W = 7 天、1M = 30 天、6M = 180 天。範圍為前 30 追蹤制度保留的合格 Protocol，並非全市場分類；任何成員缺少基準，該期間即不計算。')}</p>
  {!visible.length?<Empty text={tr('No categories with a complete baseline in this range.','此範圍沒有具備完整歷史基準的分類。')}/>:<><ResponsiveContainer width="100%" height={Math.max(240,visible.length*42)}><BarChart data={visible} layout="vertical" margin={{left:0,right:30,top:10,bottom:5}}><CartesianGrid stroke="#252b39" horizontal={false}/><XAxis type="number" tickFormatter={v=>sort==='percent'?`${v}%`:money(v)} tick={{fill:'#8d99b1',fontSize:10}}/><YAxis dataKey="label" type="category" width={chain?140:175} tick={{fill:'#b6c0d5',fontSize:11}} interval={0}/><ReferenceLine x={0} stroke="#69758f"/><Tooltip contentStyle={tooltipStyle} formatter={(v)=>sort==='percent'?pct(Number(v)):money(Number(v))}/><Bar dataKey={sort==='percent'?'metric.change':'metric.absolute'} name={tr('TVL growth','TVL 成長')} radius={3} maxBarSize={18}>{visible.map(r=><Cell key={r.chain+r.category} fill={r.metric.change!>=0?'#45c9a3':'#ef7d8b'}/>)}</Bar></BarChart></ResponsiveContainer><div className="table-scroll"><table><thead><tr><th>{tr('Chain / category','鏈／分類')}</th><th>{tr('Current TVL','目前 TVL')}</th><th>{tr('Baseline TVL','基準 TVL')}</th><th>{tr('Growth','成長率')}</th><th>{tr('Change USD','變化金額')}</th><th>{tr('Protocols','Protocol 數量')}</th></tr></thead><tbody>{visible.map(r=><tr key={r.chain+r.category}><td><Link to={`/chains/${r.chain}`}>{r.label}</Link></td><td>{money(r.tvl)}</td><td>{money(r.metric.baseline)}</td><td><Change value={r.metric.change}/></td><td>{money(r.metric.absolute)}</td><td>{r.count}</td></tr>)}</tbody></table></div></>}
  <div className="table-footer"><span>{tr('As of','資料日期')} {data?.asOf} UTC</span><span>{filtered.length-available.length} {tr('categories without a valid baseline','個分類缺少有效基準')}</span></div>
 </Panel>;
}
type Feed={coverage?:{reported:number;total:number};status:'ok'|'stale'|'unavailable';asOf?:string;updatedAt?:string;attemptedAt?:string;source:string;mode:'stock'|'flow';calendar?:string;periods?:Record<string,PeriodValue>;historyPath?:string;error?:string};
type MarketData={updatedAt:string;feeds:Record<string,Feed>};
const names:Record<string,[string,string]>={etf:['ETF net inflows','ETF 淨流入'],dex:['DEXs volume','DEX 交易量'],rwa:['RWA AUM','RWA 資產管理規模'],stablecoins:['Stablecoin market cap','穩定幣總市值']};
const title=(key:string)=>tr(...names[key]);
function FeedState({feed}:{feed:Feed|undefined}){
 const stale=feed?.asOf&&Date.now()-new Date(feed.asOf+'T00:00:00Z').getTime()>(feed.calendar==='trading'?5:2)*86400000;
 return <span className={`feed-state ${feed?.status==='ok'&&!stale?'positive':'pending'}`}><i/>{feed?.status==='ok'&&!stale?tr('Live source','來源可用'):feed?.status==='stale'||stale?tr('Last known data','上次有效資料'):tr('Source unavailable','來源暫不可用')}</span>;
}
function MarketHistory({feed,period}:{feed:Feed;period:Period}){
 const {data,loading,error}=useData<Array<{date:string;tvl:number|null}>>(feed.historyPath||null);
 if(loading)return <Loading/>;
 if(error)return <ErrorState text={error}/>;
 if(!data?.length)return <Empty/>;
 const days=daysOf(period);const last=data[data.length-1].date;
 const start=new Date(new Date(last+'T00:00:00Z').getTime()-(feed.mode==='stock'?days:days-1)*86400000).toISOString().slice(0,10);
 const map=new Map(data.map(p=>[p.date,p.tvl]));const chart:Array<{date:string;tvl:number|null}>=[];
 for(let time=new Date(start+'T00:00:00Z').getTime();time<=new Date(last+'T00:00:00Z').getTime();time+=86400000){const day=new Date(time).toISOString().slice(0,10);chart.push({date:day,tvl:map.get(day)??null});}
 const common=<><CartesianGrid stroke="#252b39" vertical={false}/><XAxis dataKey="date" tick={{fill:'#8d99b1',fontSize:10}} minTickGap={45}/><YAxis tickFormatter={money} tick={{fill:'#8d99b1',fontSize:10}} width={75}/><Tooltip contentStyle={tooltipStyle} formatter={v=>money(Number(v))}/></>;
 return <ResponsiveContainer width="100%" height={310}>{feed.mode==='flow'?<BarChart data={chart}>{common}<ReferenceLine y={0} stroke="#66728b"/><Bar dataKey="tvl" name={tr('Daily amount USD','每日金額 USD')} maxBarSize={38}>{chart.map(p=><Cell key={p.date} fill={(p.tvl||0)>=0?'#9a8aff':'#ef7d8b'}/>)}</Bar></BarChart>:<LineChart data={chart}>{common}<Line dataKey="tvl" name={tr('Value USD','金額 USD')} stroke="#48cdb1" strokeWidth={2} dot={chart.length<3} connectNulls={false}/></LineChart>}</ResponsiveContainer>;
}
export function MarketOverview({compact=false}:{compact?:boolean}){
 useLanguage();const {metric}=useParams();const active=metric&&names[metric]?metric:'dex';
 const {data,loading,error}=useData<MarketData>('latest/markets.json');const [period,setPeriod]=useState<Period>('1w');const days=String(daysOf(period));
 if(loading)return <Loading/>;
 if(error)return <ErrorState text={error}/>;
 const feeds=data?.feeds||{},feed=feeds[active],selected=feed?.periods?.[days],reference=feeds.rwaTvl;
 return <><div className="section-title market-section-heading"><div><span className="overline">{tr('BEYOND TVL','TVL 之外的市場')}</span><h2>{tr('Market signals','市場指標')}</h2></div><PeriodSwitch value={period} onChange={setPeriod}/></div><p className="scope-note">{tr('Flows: total over the period vs. the preceding equal period. Stocks: latest value vs. 1 / 7 / 30 / 180 days earlier (1D / 1W / 1M / 6M).','流量：期間累計對比上一等長期間。存量：最新值對比 1／7／30／180 天前（1D／1W／1M／6M）。')}</p><div className="market-cards">{Object.keys(names).map(key=>{
  const f=feeds[key],m=f?.periods?.[days];return <Link to={`/markets/${key}`} className={`market-card ${!compact&&active===key?'selected':''}`} key={key}><div className="market-card-title"><span>{title(key)}</span><ArrowUpRight size={16}/></div><FeedState feed={f}/><strong>{money(m?.value)}</strong>{m?<div><Change value={m.change}/><small>{tr(' vs. baseline',' 對比基準')}</small></div>:<p>{key==='rwa'?tr('AUM source pending · no paid API','AUM 來源待接 · 不使用付費 API'):tr('No verified observation','尚無可驗證觀測')}</p>}<small>{key==='rwa'?tr('Not interchangeable with TVL','不可用 TVL 代替'):key==='etf'?tr('US spot BTC + ETH ETFs · signed net flows','美國現貨 BTC + ETH ETF · 有正負號淨流量'):key==='dex'?tr('Spot DEX trading volume','現貨 DEX 交易量'):tr('USD value across tracked pegs','所有追蹤錨定幣的 USD 市值')}</small>{f?.asOf&&<small>{tr('As of','資料日期')} {f.asOf}</small>}</Link>;
 })}</div>{compact?<div className="analytics-link"><Link to="/markets/dex">{tr('Explore market data and sources','查看市場數據與來源')} →</Link></div>:<Panel title={title(active)} subtitle={active==='etf'?tr('US spot BTC and ETH only · latest fully reported session','僅美國現貨 BTC 與 ETH · 最近完整申報交易日'):tr('Observed data · source and timestamp disclosed','觀測資料 · 公開來源與時間戳記')} action={<FeedState feed={feed}/>}>
  {active==='rwa'?<><div className="notice"><AlertCircle size={16}/>{tr('AUM needs a separately authorized data source. Keeping this section free: no AUM is inferred from TVL.','AUM 需要另行授權資料來源。依照免費方案保留此板塊，不從 TVL 推估 AUM。')}</div><h3>{tr('Separate reference: RWA protocol TVL','獨立參考：RWA Protocol TVL')}</h3><div className="reference-tvl"><Layers3 size={24}/><strong>{money(reference?.periods?.[days]?.value)}</strong><Change value={reference?.periods?.[days]?.change}/></div><p className="scope-note">{tr('Sum of eligible RWA leaf-protocol global TVL reported by DefiLlama. This is not RWA AUM or the entire tokenized asset market. History accumulates from the first observation.','加總 DefiLlama 合格 RWA 子 Protocol 的全球 TVL。此值不是 RWA AUM，也不是全部代幣化資產市值。歷史從首次觀測起累積。')}</p>{reference?.coverage&&<p className="scope-note">{tr('Reported protocol coverage','已申報 Protocol 覆蓋率')}: {reference.coverage.reported} / {reference.coverage.total} · {tr('Unreported values are excluded, not treated as zero.','未申報值排除，並非視為零。')}</p>}{reference?.asOf&&<p className="scope-note">{tr('As of','資料日期')} {reference.asOf}</p>}{reference?.historyPath&&<MarketHistory feed={reference} period={period}/>}<a className="source-link" href={reference?.source||'https://api.llama.fi/protocols'} target="_blank" rel="noreferrer">{tr('RWA TVL reference source','RWA TVL 參考來源')} ↗</a></>:feed?.historyPath?<><div className="market-detail-kpis"><div><small>{feed.mode==='flow'?tr('Period total','期間合計'):tr('Latest value','最新值')}</small><strong>{money(selected?.value)}</strong></div><div><small>{tr('Baseline','比較基準')}</small><strong>{money(selected?.baseline)}</strong></div><div><small>{tr('Absolute change','變化金額')}</small><strong>{money(selected?.absolute)}</strong><Change value={selected?.change}/></div></div>{feed.status==='stale'&&<p className="notice">{tr('The latest fetch failed. These are the last verified observations.','最近擷取失敗，以下為上次驗證成功的資料。')}</p>}<MarketHistory feed={feed} period={period}/>{active==='etf'&&<p className="scope-note">{tr('Trading sessions are summed inside trailing calendar-day windows. Closed days stay blank. Incomplete sessions invalidate their rolling window. Percentages are omitted for negative or zero baselines and sign changes.','以日曆日窗口加總交易日流量，休市日保持空白，期間內任何申報不完整，該期間合計即不顯示。負／零基準或跨正負號不計百分比。')}</p>}</>:<Empty text={tr('The free source could not be verified automatically. Retry on the next daily update; no zeros or estimates are substituted.','免費來源目前無法自動驗證，下次每日更新將重試；不以零或估計值代替。')}/>}
  <div className="market-source"><a href={feed?.source} target="_blank" rel="noreferrer">{tr('View source','查看來源')} ↗</a>{active==='etf'&&<a href="https://farside.co.uk/ethereum-etf-flow-all-data/" target="_blank" rel="noreferrer">Ethereum ETF ↗</a>}<span>{feed?.asOf?`${tr('Observation','觀測日期')}: ${feed.asOf}`:tr('No verified history','尚無驗證歷史')}</span></div>
 </Panel>}</>;
}
