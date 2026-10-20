import {t, useLanguage, LanguageSwitch} from './i18n';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownUp, ChevronRight, Search, TriangleAlert, Activity } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import type { Point, Row } from './types';
import { categoryLabel, colors, money, pct, useData } from './data';
export function Change({ value }: {
    value: number | null | undefined;
}) { return <span className={value == null ? 'muted' : value >= 0 ? 'positive' : 'negative'}>{pct(value)}</span>; }
export function Panel({ title, subtitle, children, action }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) { return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>; }
export function Loading() { return <div className="skeleton-grid" aria-label={t("資料載入中")} role="status">{[1, 2, 3, 4].map(x => <div className="skeleton" key={x}/>)}</div>; }
export function Empty({ text = t('此範圍尚無可用資料。') }: {
    text?: string;
}) { return <div className="empty"><Activity size={25}/><p>{t(text)}</p></div>; }
export function ErrorState({ text }: {
    text: string;
}) { return <div className="error" role="alert"><TriangleAlert size={22}/><div><h2>{t("資料暫時無法顯示")}</h2><p>{t(text)}</p><p>{t("請確認資料更新狀態，或稍後重新載入。")}</p><button onClick={() => window.location.reload()}>{t("重新載入")}</button></div></div>; }
export function Kpi({ title, value, detail, change }: {
    title: string;
    value: string;
    detail?: string;
    change?: number | null;
}) { return <div className="kpi"><span className="eyebrow">{title}</span><strong>{value}</strong><div>{change !== undefined && <Change value={change}/>} {detail && <span className="muted">{detail}</span>}</div></div>; }
const tooltipStyle = { background: '#171c28', border: '1px solid #333b4e', borderRadius: 8, color: '#e7eaf3', fontSize: 12 };
export function Distribution({ rows, total, protocol = false }: {
    rows: Row[];
    total: number;
    protocol?: boolean;
}) {
    const top = rows.slice(0, 10);
    const sum = top.reduce((s, r) => s + r.tvl, 0);
    const mismatch = sum > total + 0.01;
    const pie = [...top.map(r => ({ name: r.name, tvl: r.tvl })), ...(total > sum ? [{ name: protocol ? t('其餘／未歸屬差額') : t('其他區塊鏈'), tvl: total - sum }] : [])];
    if (!rows.length)
        return <Empty text={t("尚無追蹤的 Protocol 資料。")}/>;
    return <div className="distribution-grid"><Panel title={protocol ? t('Protocol 占比分布') : t('區塊鏈資金分布')} subtitle={protocol ? t('分母：本鏈 TVL · 前 10 Protocol 與差額') : t('分母：全部鏈 TVL · 前 10 大鏈與其他鏈')} action={<span className="tag">USD</span>}>
    {mismatch ? <Empty text={t("所選 Protocol 合計超過鏈 TVL，無法呈現有效圓餅占比。請參閱下方資料口徑說明。")}/> : <div className="donut-wrap"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pie} dataKey="tvl" nameKey="name" innerRadius={78} outerRadius={104} paddingAngle={2} stroke="none">{pie.map((p, i) => <Cell key={p.name} fill={colors[i % colors.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${money(Number(v))} · ${total > 0 ? (Number(v) / total * 100).toFixed(2) : '—'}%`, 'TVL']}/></PieChart></ResponsiveContainer><div className="donut-center"><span>{t("總鎖倉價值")}</span><strong>{money(total)}</strong><small>{protocol ? t('本鏈 TVL') : t('全部區塊鏈')}</small></div></div>}
    <div className="chart-legend">{pie.map((p, i) => <div key={p.name}><i style={{ background: colors[i % colors.length] }}/><span>{p.name}</span><b>{total > 0 ? (p.tvl / total * 100).toFixed(1) : '—'}%</b></div>)}</div>
  </Panel><Panel title={protocol ? t('Protocol TVL 排名') : t('前 10 大區塊鏈')} subtitle={protocol ? t('最多顯示前 30 名 · 使用本鏈 TVL') : t('依總鎖倉價值排序')} action={<span className="tag">TVL</span>}><ResponsiveContainer width="100%" height={protocol ? Math.max(300, rows.slice(0, 30).length * 29) : 400}><BarChart data={rows.slice(0, protocol ? 30 : 10)} layout="vertical" margin={{ left: 2, right: 35, top: 8, bottom: 8 }}><CartesianGrid stroke="#242a37" horizontal={false}/><XAxis type="number" tickFormatter={money} tick={{ fill: '#7d879b', fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis dataKey="name" type="category" width={110} tick={{ fill: '#bdc4d4', fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={tooltipStyle} formatter={(v) => [`${money(Number(v))} · ${total > 0 ? (Number(v) / total * 100).toFixed(2) : '—'}%`, 'TVL']}/><Bar dataKey="tvl" radius={[0, 4, 4, 0]} maxBarSize={15}>{rows.slice(0, protocol ? 30 : 10).map((r, i) => <Cell key={r.slug} fill={colors[i % colors.length]}/>)}</Bar></BarChart></ResponsiveContainer></Panel></div>;
}
export function Ranking({ rows, chain }: {
    rows: Row[];
    chain?: string;
}) {
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(chain ? 30 : 10);
    const [category, setCategory] = useState('');
    const [sort, setSort] = useState<{
        key: keyof Row;
        desc: boolean;
    }>({ key: 'tvl', desc: true });
    const filtered = useMemo(() => rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) && (!category || r.category === category)).sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        if (x == null)
            return y == null ? 0 : 1;
        if (y == null)
            return -1;
        return (typeof x === 'string' ? x.localeCompare(String(y)) : Number(x) - Number(y)) * (sort.desc ? -1 : 1);
    }).slice(0, limit || undefined), [rows, search, limit, category, sort]);
    const columns: [
        keyof Row,
        string
    ][] = [['rank', t('排名')], ['name', chain ? 'Protocol' : t('區塊鏈')], ...(chain ? [['category', t('類別')] as [
                keyof Row,
                string
            ]] : []), ['tvl', 'TVL'], ['share', chain ? t('鏈內占比') : t('市場占比')], ['change1d', '1D'], ['change7d', '1W'], ['change30d', '1M'], ['change180d', '6M'], ...(!chain ? [['rankChange', t('排名變化')] as [
                keyof Row,
                string
            ]] : [])];
    return <Panel title={chain ? t('Protocol 排行榜') : t('區塊鏈排行榜')} subtitle={chain ? t('保留歷史上曾進入追蹤範圍的 Protocol') : t('完整追蹤全部區塊鏈 · 點選名稱查看分析')} action={<span className="tag">{rows.length} {chain ? t('個 Protocol') : t('條鏈')}</span>}><div className="table-toolbar"><label className="search"><Search size={15}/><input aria-label={chain ? t('搜尋 Protocol') : t('搜尋區塊鏈')} placeholder={chain ? t('搜尋 Protocol…') : t('搜尋區塊鏈…')} value={search} onChange={e => setSearch(e.target.value)}/></label><div className="toolbar-right">{chain && <select aria-label={t("篩選類別")} value={category} onChange={e => setCategory(e.target.value)}><option value="">{t("全部類別")}</option>{[...new Set(rows.map(r => r.category))].sort().map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select>}<div className="segmented">{(chain ? [30, 0] : [10, 20, 0]).map(n => <button key={n} className={limit === n ? 'active' : ''} onClick={() => setLimit(n)}>{n ? t(`前 ${n}`) : t('全部')}</button>)}</div></div></div><div className="table-scroll"><table><thead><tr>{columns.map(([key, title]) => <th key={key} aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}><button onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : true })}>{title}<ArrowDownUp size={11}/></button></th>)}</tr></thead><tbody>{filtered.map((r, i) => <tr key={r.slug}><td className="muted">{String(r.rank).padStart(2, '0')}</td><td><Link className="entity" to={chain ? `/chains/${chain}/protocols/${r.slug}` : `/chains/${r.slug}`}><span className="coin" style={{ color: colors[i % colors.length], background: colors[i % colors.length] + '19' }}>{r.name.slice(0, 1)}</span>{r.name}<ChevronRight size={13}/></Link></td>{chain && <td><span className="category">{categoryLabel(r.category)}</span></td>}<td className="strong">{money(r.tvl)}</td><td><div className="share-cell"><span>{r.share == null ? '—' : `${r.share.toFixed(2)}%`}</span><div><i style={{ width: `${Math.min(r.share || 0, 100)}%` }}/></div></div></td><td><Change value={r.change1d}/></td><td><Change value={r.change7d}/></td><td><Change value={r.change30d}/></td><td><Change value={r.change180d}/></td>{!chain && <td className={r.rankChange && r.rankChange > 0 ? 'positive' : r.rankChange && r.rankChange < 0 ? 'negative' : 'muted'}>{r.rankChange == null ? '—' : r.rankChange === 0 ? t('持平') : `${r.rankChange > 0 ? '↑' : '↓'} ${Math.abs(r.rankChange)}`}</td>}</tr>)}</tbody></table></div>{!filtered.length && <Empty text={t("沒有符合搜尋條件的資料。")}/>}<div className="table-footer">{t("顯示 ")}{filtered.length} / {rows.length}{t(" 筆")}<span>{t("缺少可信歷史基準以 — 表示")}</span></div></Panel>;
}
export type Series = {
    id: string;
    name: string;
    path: string;
};
function HistoryLoader({ series, onLoad }: {
    series: Series;
    onLoad: (id: string, points: Point[] | null, error: string | null) => void;
}) {
    const { data, error } = useData<Point[]>(series.path);
    // Each selection owns its loader; errors are visible and missing values remain null.
    useEffect(() => { onLoad(series.id, data, error); }, [data, error, series.id, onLoad]);
    return null;
}
import { useCallback } from 'react';
export function HistoryChart({ title, options, initial }: {
    title: string;
    options: Series[];
    initial: string[];
}) {
    const [selected, setSelected] = useState(initial);
    const [range, setRange] = useState(30);
    const [loaded, setLoaded] = useState<Record<string, Point[]>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const onLoad = useCallback((id: string, points: Point[] | null, error: string | null) => { if (points)
        setLoaded(old => ({ ...old, [id]: points })); if (error)
        setErrors(old => ({ ...old, [id]: error })); }, []);
    const active = options.filter(s => selected.includes(s.id));
    const chart = useMemo(() => {
        const values = new Map<string, Record<string, string | number | null>>();
        active.forEach(s => (loaded[s.id] || []).forEach(p => { if (!values.has(p.date))
            values.set(p.date, { date: p.date }); values.get(p.date)![s.id] = p.tvl; }));
        const observed = [...values.keys()].sort();
        const dates: string[] = [];
        if (observed.length) {
            for (let t = new Date(observed[0] + 'T00:00:00Z').getTime(), end = new Date(observed[observed.length - 1] + 'T00:00:00Z').getTime(); t <= end; t += 86400000) {
                const d = new Date(t).toISOString().slice(0, 10);
                dates.push(d);
                if (!values.has(d))
                    values.set(d, { date: d });
            }
        }
        const last = dates.at(-1);
        const cutoff = last && range ? new Date(new Date(last + 'T00:00:00Z').getTime() - range * 86400000).toISOString().slice(0, 10) : '';
        return dates.filter(d => d >= cutoff).map(d => { const row = values.get(d)!; active.forEach(s => { if (row[s.id] === undefined)
            row[s.id] = null; }); return row; });
    }, [active, loaded, range]);
    return <Panel title={title} subtitle={t("UTC 每日資料 · 缺失日期不補零 · 金額為 USD")} action={<div className="segmented ranges">{[[1, '1D'], [7, '1W'], [30, '1M'], [180, '6M']].map(([n, label]) => <button key={n} className={range === n ? 'active' : ''} onClick={() => setRange(Number(n))}>{label}</button>)}</div>}><div className="series-controls">{active.map((s, i) => <button key={s.id} onClick={() => setSelected(old => old.filter(k => k !== s.id))}><i style={{ background: colors[i % colors.length] }}/>{s.name}<span>×</span></button>)}<select aria-label={t("新增比較曲線")} value="" onChange={e => setSelected(old => [...old, e.target.value])}><option value="" disabled>{t("＋ 新增比較")}</option>{options.filter(s => !selected.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>{active.map(s => <HistoryLoader key={s.id} series={s} onLoad={onLoad}/>)}{active.some(s => errors[s.id]) && <p className="notice">{t("部分歷史無法載入：")}{active.filter(s => errors[s.id]).map(s => s.name).join('、')}</p>}{!selected.length ? <Empty text={t("請選取至少一條比較曲線。")}/> : active.some(s => !loaded[s.id] && !errors[s.id]) ? <Loading /> : !chart.length ? <Empty /> : <ResponsiveContainer width="100%" height={310}><LineChart data={chart} margin={{ top: 20, right: 20, left: 12, bottom: 0 }}><CartesianGrid stroke="#242a37" vertical={false}/><XAxis dataKey="date" tick={{ fill: '#7d879b', fontSize: 11 }} minTickGap={60} axisLine={false} tickLine={false} tickFormatter={s => s.slice(2)}/><YAxis tickFormatter={money} tick={{ fill: '#7d879b', fontSize: 11 }} width={62} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltipStyle} formatter={v => money(Number(v))}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }}/>{active.map((s, i) => <Line key={s.id} name={s.name} type="linear" dataKey={s.id} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer>}</Panel>;
}
