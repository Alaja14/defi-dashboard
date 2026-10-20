export const english = {
  '資料口徑與計算方式':'Methodology & definitions',
  '所有金額為 USD。鏈占比以全部鏈 TVL 合計為分母；Protocol 占比以對應鏈 TVL 為分母。全球 TVL 使用 DefiLlama 全球歷史 API 最新觀測，可能與鏈資料的抓取時間、加總口徑不同。':'All amounts are in USD. Chain shares use the sum of all chains; protocol shares use the corresponding chain TVL. Global TVL uses the latest official historical observation, whose timing and methodology may differ from chain totals.',
  'Protocol 使用 chain-specific TVL，排除 parent 彙總、已標記 double-counted 項目，以及質押／再質押、橋接、Chain、CEX、Risk Curators、Onchain Capital Allocator 等容易重複歸屬的分類。這是保守分析範圍，不保證與官方篩選完全相同。未加入 staking、pool2、borrowed 等額外 TVL 桶。保留各版本 child Protocol；上游未標記的重複資產可能仍造成差異。':'We use chain-specific protocol TVL and exclude parent aggregates, flagged double counting, staking/restaking, bridges, Chain, CEX, Risk Curators and Onchain Capital Allocators. This conservative scope does not exactly reproduce official filters. Supplemental staking, pool2 and borrowed buckets are excluded. Child versions are retained; unflagged overlapping assets may still cause differences.',
  '圓餅圖的「其餘／未歸屬差額」是鏈 TVL 減去前 10 Protocol，並不代表某個 Protocol。若合計超過分母，停用圓餅圖，不捏造剩餘值。過去 30 天不等於自然月；缺少精確日期或基準為零時，百分比顯示 —。':'Other / unattributed is chain TVL minus the top 10 protocols, not a protocol. The pie is disabled if the sum exceeds its denominator. 1M and 6M are trailing 30-day and 180-day periods, not calendar months. A missing or zero baseline produces no percentage.',
  'Top 10 合計歷史以「本次前十名固定成員」回看；缺少任一成員的日期不計算總和。排名變化與占比變化需有前一日完整快照。當天快照為抓取時點，並非 UTC 收盤值。TVL 變化包含價格因素，不等同淨資金流。':'Top 10 history uses the current top 10 as a fixed cohort. Missing members leave gaps. Rank and share changes require a previous daily snapshot. Today’s snapshot is an observation, not a UTC closing value. TVL changes include price effects and do not represent net inflows.',
  'DefiLlama 資料定義':'DefiLlama definitions','領先':' leaders','24 小時':'1D','7 天':'1W','漲幅':' gainers','跌幅':' losers',
  '暫無符合條件的資料':'No matching data available','鏈上資金觀測站':'ONCHAIN CAPITAL INTELLIGENCE','市場總覽':'Overview','每日更新':'Updated daily',
  '掌握 DeFi 資金版圖，從全局到每一條鏈。':'Follow DeFi capital, from the global market to every chain.','全球市場':'Global markets','全球 DeFi TVL':'Global DeFi TVL','較前一日':'vs. previous day',
  '前 10 大鏈 TVL':'Top 10 chains TVL','全部鏈合計':'All-chain total','24 小時變化':'1D change','過去 7 天變化':'1W change','過去 30 天變化':'1M change','最大區塊鏈':'Largest chain',
  '追蹤':'Tracking','條區塊鏈':'chains','組鏈／Protocol':'chain / protocol pairs','最近更新':'Last updated','（台灣）':'(Taipei)','全球資料日期':'Global observation',
  '全球 TVL 走勢':'Global TVL history','全球 TVL':'Global TVL','本次前 10 大鏈合計':'Current top 10 combined','市場脈動':'MARKET PULSE','資金變化焦點':'Capital movers',
  '百分比請搭配 TVL 基數解讀':'Read percentage changes alongside their TVL base','每日市場洞察':'Daily insights','依據真實資料產生的規則式分析 · 不使用付費 AI':'Rule-based insights grounded in observed data',
  '每日洞察暫時無法載入。':'Daily insights are temporarily unavailable.','個百分點':'pp','名':'positions','TVL 基數':'TVL base',
  '找不到這條鏈或 Protocol，請返回市場總覽。':'Chain or protocol not found. Return to Overview.','Protocol 深度分析':'PROTOCOL ANALYSIS','區塊鏈深度分析':'CHAIN ANALYSIS','於':'on',
  '此頁所有變化與歷史僅代表':'All changes and history on this page refer to','全球排名 #':'Global rank #','個已追蹤 Protocol':'tracked protocols','鏈內資料':'Chain-specific','全部鏈口徑':'All-chain denominator',
  '本鏈 Protocol TVL':'Protocol TVL on this chain','本鏈 TVL':'Chain TVL','鏈內占比':'Chain share','全球市場占比':'Global market share','Protocol 全球 TVL':'Global protocol TVL',
  '排名變化（1D）':'Rank change (1D)','所有鏈總量，僅供參考':'Across all chains · for reference','目前排名 #':'Current rank #','TVL 歷史':'TVL history','前 30 Protocol 合計':'Top 30 protocol total',
  '鏈 TVL 與前 30 差額':'Chain minus top 30','差額可能包含未追蹤項目、分類及抓取時間差異':'Differences may reflect untracked protocols, scope and observation times','Protocol TVL 比較':'Protocol TVL comparison',
  'Protocol 追蹤範圍':'Protocol coverage','這條鏈尚未進入前 10 名追蹤範圍；鏈 TVL 歷史仍持續保存。':'This chain has not entered top 10 protocol tracking. Its chain TVL history is still retained.',
  '已保存但排除於目前統計的 Protocol（':'Archived protocols excluded from current statistics (','資料透明度':'DATA TRANSPARENCY','資料更新狀態':'Data status','每次更新的結果、警告與來源。':'Update results, warnings and sources.',
  '最近更新成功':'Latest update succeeded','最近更新失敗，保留上一版資料':'Update failed · last successful data retained','等待首次更新':'Waiting for the first update','最近嘗試':'Last attempt','最近成功':'Last success','排程':'Schedule',
  '每天台灣時間 08:15（GitHub Actions 可能延遲）':'Daily at 08:15 Taipei (GitHub Actions may be delayed)','資料來源':'Source','驗證警告（':'Validation warnings (','沒有記錄警告。':'No warnings recorded.',
  '數據終端':'DATA TERMINAL','資料狀態':'Data status','鏈上數據，清楚呈現':'Onchain data. Clear perspective.','由 DefiLlama 提供資料':'Data by DefiLlama','UTC 每日快照 · 全程開源':'Daily UTC snapshots · open source','探索資料來源':'Explore source',
  'DeFi 市場情報':'DeFi intelligence','全球流動性觀測':'Global liquidity monitor','資料已同步':'Data synced','資料需要更新':'Update needed','檢視資料狀態':'Check data status',
  '資料已超過 36 小時未更新。':'Data is more than 36 hours old.','本次更新未成功，以下為上次成功資料。':'The latest update failed. Showing the last successful dataset.','查看詳細狀態 →':'View status →',
  '找不到此頁面。請由市場總覽重新開始。':'Page not found. Return to Overview.','／ 讓鏈上資金流向更清晰':'/ A clearer view of onchain capital','數據僅供研究參考':'For research purposes',
  '資料載入中':'Loading data','此範圍尚無可用資料。':'No data available for this range.','資料暫時無法顯示':'Data temporarily unavailable','請確認資料更新狀態，或稍後重新載入。':'Check data status or reload later.','重新載入':'Reload',
  '其餘／未歸屬差額':'Other / unattributed','其他區塊鏈':'Other chains','尚無追蹤的 Protocol 資料。':'No tracked protocol data available.','Protocol 占比分布':'Protocol distribution','區塊鏈資金分布':'Chain distribution',
  '分母：本鏈 TVL · 前 10 Protocol 與差額':'Denominator: chain TVL · top 10 protocols and remainder','分母：全部鏈 TVL · 前 10 大鏈與其他鏈':'Denominator: all-chain TVL · top 10 and others',
  '所選 Protocol 合計超過鏈 TVL，無法呈現有效圓餅占比。請參閱下方資料口徑說明。':'Selected protocols exceed the chain denominator. A valid pie cannot be shown. See methodology below.',
  '總鎖倉價值':'TOTAL VALUE LOCKED','全部區塊鏈':'All chains','Protocol TVL 排名':'Protocol TVL ranking','前 10 大區塊鏈':'Top 10 chains','最多顯示前 30 名 · 使用本鏈 TVL':'Top 30 · chain-specific TVL','依總鎖倉價值排序':'Ranked by total value locked',
  '排名':'Rank','區塊鏈':'Chain','類別':'Category','市場占比':'Market share','過去 30 天':'1M','排名變化':'Rank change','Protocol 排行榜':'Protocol rankings','區塊鏈排行榜':'Chain rankings',
  '保留歷史上曾進入追蹤範圍的 Protocol':'Includes protocols previously tracked','完整追蹤全部區塊鏈 · 點選名稱查看分析':'All chains tracked · select a name to explore','個 Protocol':'protocols','條鏈':'chains',
  '搜尋 Protocol':'Search protocols','搜尋區塊鏈':'Search chains','篩選類別':'Filter category','全部類別':'All categories','前 ':'Top ','全部':'All','持平':'Unchanged','沒有符合搜尋條件的資料。':'No results match your search.',
  '顯示':'Showing','筆':'rows','缺少可信歷史基準以 — 表示':'— indicates an unavailable baseline','UTC 每日資料 · 缺失日期不補零 · 金額為 USD':'Daily UTC data · missing values stay missing · USD',
  '新增比較曲線':'Add comparison series','＋ 新增比較':'+ Add comparison','部分歷史無法載入：':'History unavailable for: ','請選取至少一條比較曲線。':'Select at least one comparison series.',
  '資料尚未就緒':'Data is not ready','尚未建立正式資料，請先執行 ETL。':'No published dataset. Run the ETL first.',
  '漲幅領先':'Top gainers','跌幅觀察':'Top losers','Protocol 單日最大波動':'Largest protocol daily move','市場占比變化':'Market-share shift','前十排名變化':'Top 10 rank change','異常波動觀察（非錯誤判定）':'Unusual movement (not a data error)',
  '過去 7 天':'Trailing 7 days','單日 TVL 變化超過 50%':'daily TVL change exceeds 50%','前 30 Protocol 合計超過鏈 TVL；前 10 也超過時停用圓餅圖':'top 30 protocols exceed chain TVL; pie disabled if top 10 also exceed it',
};
const entries=Object.entries(english).sort((a,b)=>b[0].length-a[0].length);
export function translate(text,language='en'){
 if(language==='zh-TW')return text;
 if(english[text.trim()])return text.replace(text.trim(),english[text.trim()]);
 // Dynamic sentences are composed from translated fragments. Do not rewrite entity names.
 let value=text;for(const [zh,en] of entries)value=value.split(zh).join(en);return value;
}
