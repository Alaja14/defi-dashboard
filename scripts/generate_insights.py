def generate(chains, protocols):
    insights = []
    for field, label in [('change1d','24 小時'),('change7d','過去 7 天')]:
        rows = sorted([c for c in chains if c.get(field) is not None],key=lambda c:c[field])
        if rows:
            for c, title in [(rows[-1],f'{label}漲幅領先'),(rows[0],f'{label}跌幅觀察')]:
                if (title.endswith('漲幅領先') and c[field] <= 0) or (title.endswith('跌幅觀察') and c[field] >= 0):
                    continue
                insights.append({'title':title,'name':c['name'],'value':c[field],'tvl':c['tvl'],'kind':'percent','url':f'/chains/{c["slug"]}'})
    valid = [p for p in protocols if p.get('change1d') is not None]
    if valid:
        p = max(valid,key=lambda p:abs(p['change1d']))
        insights.append({'title':'Protocol 單日最大波動','name':p['name']+' · '+p['chain'],'value':p['change1d'],'tvl':p['tvl'],'kind':'percent','url':f'/chains/{p["chain"]}/protocols/{p["slug"]}'})
    for c in sorted(chains,key=lambda c:abs(c.get('shareChange1d') or 0),reverse=True)[:1]:
        if c.get('shareChange1d') is not None:
            insights.append({'title':'市場占比變化','name':c['name'],'value':c['shareChange1d'],'tvl':c['tvl'],'kind':'pp','url':f'/chains/{c["slug"]}'})
    for c in chains[:10]:
        if c.get('rankChange'):
            insights.append({'title':'前十排名變化','name':c['name'],'value':c['rankChange'],'tvl':c['tvl'],'kind':'rank','url':f'/chains/{c["slug"]}'})
    for c in chains:
        if abs(c.get('change1d') or 0)>50:
            insights.append({'title':'異常波動觀察（非錯誤判定）','name':c['name'],'value':c['change1d'],'tvl':c['tvl'],'kind':'percent','url':f'/chains/{c["slug"]}'})
    return insights
