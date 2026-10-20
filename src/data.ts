import {getLanguage, t} from './i18n';
import { useEffect, useState } from 'react';
import { dataUrl } from './data-url.mjs';
const cache = new Map<string, unknown>();
export function useData<T>(path:string|null) {
  const [state,setState] = useState<{data:T|null;error:string|null;loading:boolean}>({data:null,error:null,loading:!!path});
  useEffect(()=>{
    if (!path) {setState({data:null,error:null,loading:false});return;}
    if(cache.has(path)){setState({data:cache.get(path) as T,error:null,loading:false});return;}
    const controller = new AbortController();
    setState({data:null,error:null,loading:true});
    fetch(dataUrl(import.meta.env.BASE_URL,path),{signal:controller.signal}).then(async r=>{
      if(!r.ok) throw new Error(`資料尚未就緒（HTTP ${r.status}）`);
      const content = r.headers.get('content-type') || '';
      if(!content.includes('json')) throw new Error('尚未建立正式資料，請先執行 ETL。');
      return r.json() as Promise<T>;
    }).then(data=>{cache.set(path,data);setState({data,error:null,loading:false});}).catch(e=>{
      if(e.name!=='AbortError') setState({data:null,error:e.message,loading:false});
    });
    return ()=>controller.abort();
  },[path]);
  return state;
}
export const money=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
export const pct=(n:number|null|undefined)=>n==null?'—':`${n>0?'+':''}${n.toFixed(2)}%`;
export const colors=['#9a8aff','#48cdb1','#62a6f9','#f4c477','#dd83bb','#70d4df','#bdcc7d','#ea947c','#7e9dd8','#b4a0cf','#444b61'];

const categoryLabels:Record<string,string> = {'AI Agents':'AI 代理','Algo-Stables':'演算法穩定幣','Anchor BTC':'錨定 BTC','Basis Trading':'基差交易','CDP':'抵押債倉','CDP Manager':'債倉管理','CeDeFi':'混合式金融','Chain':'鏈資產','Collateral Markets':'抵押品市場','Cross Chain Bridge':'跨鏈橋','Decentralized BTC':'去中心化 BTC','Derivatives':'衍生品','Dexs':'去中心化交易所','Dexes':'去中心化交易所','Dual-Token Stablecoin':'雙代幣穩定幣','Farm':'流動性挖礦','Indexes':'指數','Interest Rate Derivatives':'利率衍生品','Launchpad':'發行平台','Lending':'借貸','Leveraged Farming':'槓桿挖礦','Liquidity Manager':'流動性管理','NFT Lending':'NFT 借貸','NFT Marketplace':'NFT 市場','OTC Marketplace':'場外交易市場','Onchain Capital Allocator':'鏈上資本配置','Options':'選擇權','Options Vault':'選擇權金庫','Payments':'支付','Prediction Market':'預測市場','Privacy':'隱私','RWA':'真實世界資產','Restaked BTC':'再質押 BTC','Restaking':'再質押','Risk Curators':'風險策展','Stablecoin Issuer':'穩定幣發行','Staking Pool':'質押池','Token Locker':'代幣鎖倉','Uncollateralized Lending':'無抵押借貸','Yield':'收益','Yield Aggregator':'收益聚合'};
export const categoryLabel=(value:string|undefined)=>value ? (getLanguage()==='en'?value:categoryLabels[value] || value) : (getLanguage()==='en'?'Uncategorized':'未分類');
