import {useSyncExternalStore} from 'react';
import {translate} from './translations.mjs';
export type Language='en'|'zh-TW';
const KEY='defi-monitor-language';
let language:Language='en';
try { if(localStorage.getItem(KEY)==='zh-TW')language='zh-TW'; } catch { /* private storage */ }
const listeners=new Set<()=>void>();
export const getLanguage=()=>language;
export const t=(text:string)=>translate(text,language);
export const tr=(en:string,zh:string)=>language==='en'?en:zh;
export function setLanguage(value:Language){
 language=value;try{localStorage.setItem(KEY,value);}catch{/* storage is optional */}
 document.documentElement.lang=value;document.title=value==='en'?'DeFi TVL Monitor · Onchain Intelligence':'DeFi TVL Monitor · 鏈上資金觀測站';
 listeners.forEach(fn=>fn());
}
export function useLanguage(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},getLanguage,()=> 'en' as Language);}
export function LanguageSwitch(){const active=useLanguage();return <div className="language-switch" role="group" aria-label="Language / 語言"><button type="button" lang="en" aria-pressed={active==='en'} onClick={()=>setLanguage('en')}>EN</button><button type="button" lang="zh-TW" aria-pressed={active==='zh-TW'} onClick={()=>setLanguage('zh-TW')}>繁中</button></div>;}
