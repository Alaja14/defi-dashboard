import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dataUrl} from '../src/data-url.mjs';
test('JSON fetch respects repository subpath',()=>{
  assert.equal(dataUrl('/defi-tvl-dashboard/','latest/chains.json'),'/defi-tvl-dashboard/data/latest/chains.json');
  assert.equal(dataUrl('/','history/global.json'),'/data/history/global.json');
  assert.equal(dataUrl('/repo','/history/global.json'),'/repo/data/history/global.json');
});
test('Hash routing keeps deep routes on the Pages index document',()=>{
  const url=new URL('https://example.github.io/defi-tvl-dashboard/#/chains/ethereum/protocols/aave-v3');
  assert.equal(url.pathname,'/defi-tvl-dashboard/');
  assert.match(readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8'),/<HashRouter>/);
});

test('English is the default translation and Traditional Chinese preserves source text',async()=>{
  const {translate}=await import('../src/translations.mjs');
  assert.equal(translate('資料口徑與計算方式'),'Methodology & definitions');
  assert.equal(translate('資料口徑與計算方式','zh-TW'),'資料口徑與計算方式');
  assert.equal(translate('Ethereum'),'Ethereum');
});
