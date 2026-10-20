# DeFi TVL Monitor

繁體中文 DeFi 分析平台，使用 DefiLlama 真實資料，追蹤所有區塊鏈 TVL、前十大鏈、每鏈前 30 Protocol 與歷史變化。無登入、付費 API、資料庫或常駐後端。

## 快速開始

需要 **Node.js 22+、npm、Python 3.12**。

```bash
npm install
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.update_all
npm run dev
```

開啟終端顯示的本機網址。若 Repository 已包含成功的 `data/`，可直接 `npm ci && npm run dev`，不必重新 backfill。未有正式資料時，網站顯示資料尚未就緒，不使用假資料。

```bash
npm test
npm run typecheck
npm run build
python -m pytest -q
python -m scripts.validate_data
```

## 架構與檔案

React 19 / TypeScript / Vite / Tailwind CSS 4 / Recharts / React Router / Lucide；Python 3.12 / requests / pytest；GitHub Actions / GitHub Pages。

```text
src/
  main.tsx                 市場總覽、鏈頁、Protocol 頁、資料狀態
  components.tsx           圖表、搜尋／排序表格、載入／錯誤狀態
  data.ts, data-url.mjs     延遲載入 JSON、base path 與格式化
  styles.css               響應式金融終端深色介面
scripts/
  api.py                   timeout、重試、短期磁碟快取
  fetch_chains.py           鏈資料與別名處理
  fetch_protocols.py        Protocol 篩選、鏈別 TVL、排名
  fetch_history.py          全球／鏈／Protocol 歷史 backfill
  normalize_data.py         UTC 日期、合法數值、去重與合併
  calculate_metrics.py      1D／7D／30D、絕對變化、占比、排名
  validate_data.py          資料發布前驗證
  build_data.py             精簡 JSON 讀寫
  update_all.py             完整更新交易與失敗回復
  generate_insights.py       不需 LLM 的規則式分析
 data/
  latest/                  summary、chains、protocols、insights
  history/chains/          每鏈一檔（所有鏈）
  history/protocols/       每鏈／Protocol 一檔
  history/global.json     官方全球歷史
  history/top10.json      本次前十名固定成員合計歷史
  snapshots/              每 UTC 日期一份快照
  metadata/               update-status、tracked 追蹤名單
 tests/                    API fixtures 與離線測試
 .github/workflows/       ci.yml、update-data.yml、deploy.yml
```

瀏覽器唯讀 `data/`，不直接呼叫外部 API。Vite 本機中介層提供 JSON；build 時複製到 `dist/data/`。首頁載入摘要、鏈排名、洞察與所選曲線。Protocol 歷史僅在進入頁面或加入比較時載入。路由使用 HashRouter：`/#/chains/ethereum/protocols/aave-v3`，深層重新整理不需要伺服器 rewrite。

## 真實資料與口徑

來源：[DefiLlama Public API](https://api.llama.fi)、[官方資料定義](https://docs.llama.fi/analysts/data-definitions)。已實際檢查以下端點格式：

- `/v2/chains`：陣列，使用 `name`、`tvl`、`chainId`。
- `/protocols`：陣列，使用 `slug`、`chainTvls`、`parentProtocol`、分類與排重旗標。
- `/v2/historicalChainTvl` 與 `/v2/historicalChainTvl/{chain}`：`date` UNIX 秒、`tvl`。
- `/protocol/{slug}`：使用 `chainTvls[chain].tvl[].totalLiquidityUSD`，絕不以全球 `tvl[]` 取代鏈歷史。

金額為 USD；日期為 UTC。每日快照代表抓取時點，當日重跑覆寫同一日期，**並非收盤值**。API 單日有多個點時取最後時間點。網站最近更新顯示台灣時間；全球 API 資料日期另行顯示，不能將抓取時間誤認為上游資料時間。

- 全球 TVL：全球歷史 API 最新有效值。其 1D／7D／30D 以該點日期計算。
- 全鏈 TVL：`/v2/chains` 的正規化全部鏈加總，為鏈占比分母；不以 Top 10 取代。
- Top 10 TVL：本次排名前十鏈合計。其歷史採本次成員回看，只有所有成員同日有資料才加總，並非每日輪動指數。
- Protocol TVL：`/protocols` 的對應 `chainTvls`，歷史為同鏈 detail 欄位。
- Top 30 Protocol TVL 與鏈 TVL 分開保存。鏈內占比分母永遠是鏈 TVL。
- 1D／7D／30D 百分比為 `(current / exact_baseline - 1) * 100`。零、缺失基準傳回 `null`；不插值、不以最近日期冒充。絕對差額有零基準時仍可計算。
- 30D 指過去 30 天，不是自然月。市占變化以百分點保存，排名變化正值代表上升；首次執行沒有前一日快照時為 `null`。
- TVL 變化包括資產價格波動，不代表淨流入。

### 排重與差異

保留 child Protocol（例如各版本），排除 parent 彙總、`doublecounted` 旗標及 Liquid Staking、Liquid Restaking、Restaking、Bridge、Canonical Bridge、Cross Chain Bridge、Chain、CEX、Staking Pool、Risk Curators、Onchain Capital Allocator 類別。這是保守分析範圍，並非宣稱完全複製官方排除清單。公共 API 不一定提供全部 double-counting 資訊；原先追蹤但改列排除的項目仍保存歷史，鏈頁的封存清單可開啟詳細頁。不混入 borrowed、staking、pool2、vesting、offers 桶。未標記的 receipt-token 重複計數、API 時點差、分類規則變更與未追蹤項目仍可能造成不一致；不聲稱重建官方完整總量。

API 實測：BSC 與 Binance 可同時出現在鏈清單且 chainId=56，其中 Binance 為零；Protocol 使用 Binance。只有相同 chainId 且其中一方零值時才合併此別名；衝突非零值中止發布。也處理 Op_Bnb / opBNB、xDai / Gnosis、Optimism / OP Mainnet 等已知名稱。其餘衝突須人工檢查，不盲目加總。

圓餅圖的剩餘是「鏈 TVL − 前十 Protocol TVL」，標為「其餘／未歸屬差額」。若前十合計超過鏈 TVL，顯示無法對齊訊息而不繪製誤導性圓餅圖。`protocolGap` 記錄鏈與前 30 的差額，`globalChainDifference` 記錄官方全球值與鏈加總差異。詳細異常見資料狀態頁。

## ETL、增量與故障恢復

```bash
python -m scripts.update_all                     # 預設 4 並行
python -m scripts.update_all --workers 2          # 遇到 rate limit 時降低並行
python -m scripts.update_all --refresh-history    # 定期修復上游修訂的完整歷史
```

第一次下載所有鏈與當前前十鏈各前 30 Protocol 的歷史；往後使用每日 listing 值增量寫入，歷史已到昨日者不重新抓 Protocol detail。若停更產生缺口或新追蹤項目則 backfill。`--refresh-history` 可定期補上上游歷史修訂（歷史 API 的本機快取效期 24 小時）。曾追蹤項目持續更新，即使離開前十／前三十也不刪歷史。全部鏈持續保存。

網路 timeout 為連線 15 秒、讀取 90 秒；最多 4 次嘗試、2/4/8 秒指數退避，最多 8 workers。HTTP 錯誤、429、無效 JSON 與空資料會重試。`.cache/api/` 保存上游回應以便失敗後恢復，不提交 Git；listing 快取一小時，歷史快取一天。需要立即強制抓新回應時可移除這個**本機快取目錄**。

所有輸出先寫入 `.data-stage/`，完整驗證後才切換到 `data/`；任何必要鏈或 Protocol 失敗都不發布半套資料，只更新 `metadata/update-status.json`，成功請求快取保留。先前資料／快照不變。若程序在目錄切換時中斷，下一次會從 `.data-backup/` 恢復；網站服務的是部署時的靜態 artifact，不會讀到半套本機目錄。不要同時在同一 checkout 手動啟動兩個 ETL；Actions 以 concurrency 排隊。

嚴格完整性策略：上游移除既有鏈、tracked Protocol 或其對應鏈欄位時，阻止新版發布並記錄錯誤，不能默認缺失等於零。須檢查上游是否改名／退休後，更新正規化映射或追蹤政策。零 TVL 且 API 沒有歷史的鏈只從已觀測日期開始保存，不偽造之前的零值。

### 驗證與測試

測試涵蓋百分比、零分母、缺失與精確日期、30D、鏈及 Protocol 排名、占比、去重、非法 API、NaN/Infinity/負值、鏈別 TVL、parent/child 與分類排除、重試、同日重跑、部分失敗保留舊版，以及 GitHub Pages base path / hash 路由。Fixtures 只供測試，正式網站不引用。

大幅變化（1D 絕對百分比 > 50%）是 warning 而不是拒絕資料的理由；可能是真實事件。數值、日期、重複鍵及歸屬錯誤才拒絕發布。所有警告寫入 metadata，命令輸出保留執行摘要／錯誤。

## GitHub Actions 與正式部署

1. 建立 GitHub Repository，把專案推送至 **main**（工作流程目前明確使用 main）。
2. Repository → **Settings → Pages → Build and deployment → Source：GitHub Actions**。
3. Settings → Actions → General：允許工作流程，Workflow permissions 選 Read and write permissions；組織政策也須允許 `contents: write`、`pages: write`、`id-token: write`。
4. 第一次執行 Actions → **Update DeFi data → Run workflow**；若已提交真實資料，也可先執行 **Deploy GitHub Pages**。
5. 部署完成後，在 Actions 的 `github-pages` environment 取得正式 URL。

```bash
git add .
git commit -m "Build DeFi TVL Monitor"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

不需要任何 DefiLlama API key 或自訂部署 token。更新工作流程每天 `15 0 * * *` UTC（台灣 08:15）執行，支援手動觸發，具備 `contents: write`。避免空 commit，更新排程互斥；推送前 rebase，遇到真正衝突就失敗，不強制覆蓋。`GITHUB_TOKEN` 產生的 push 不會再觸發其他 push 工作流程，因此更新後**明確呼叫 reusable deploy workflow**。失敗更新也會發布最新狀態頁、保留舊資料，並讓 workflow 顯示失敗。

部署使用官方 `configure-pages`、`upload-pages-artifact` 與 `deploy-pages`。Node 22 + `npm ci` + tests + TypeScript + Vite build。`configure-pages` 的 base_path 自動設定 Vite base；支援 repository subpath、使用者根站與 Pages 自訂網域。

```bash
VITE_BASE_PATH=/defi-dashboard/ npm run build
VITE_BASE_PATH=/defi-dashboard/ npm run preview
# 開啟 /defi-dashboard/#/chains/ethereum
```

請不要移除網址的 `#` 後再重新整理 `/chains/...`；純靜態 Pages 不支援那種無 rewrite 的路由。Hash 路由的深層 URL 可正常直接開啟／重新整理。

排程不保證精準時間，GitHub 繁忙時可能延遲。排程只在 default branch 生效，公開 Repository 長時間沒有活動可能被 GitHub 停用（通常 60 天）；可手動重新啟用。網站超過 36 小時未成功更新會提示過期。首次 backfill 需要較多 API 請求，job 上限 90 分鐘。

## 每日洞察與擴充

`scripts/generate_insights.py` 根據資料產出 24H／7D 鏈漲跌、Protocol 最大波動、占比位移、前十排名變化與異常波動。每則顯示 TVL 基數，避免只看極端百分比。`data/latest/insights.json` 不含任何臆測因果。

未來若加入 LLM，只在 ETL／Actions 後端透過 GitHub Secrets 讀取 key，將結構化指標轉成文字；不能把 key 放進 `VITE_*`、前端 bundle 或 JSON。生成內容必須逐項引用有效指標，失敗保留規則式分析。

## 故障排除與限制

- **首頁沒有資料**：執行 ETL，檢查 `data/metadata/update-status.json`；不能用 fixture 取代正式資料。
- **API 429／timeout**：降低 workers，稍後重跑。成功請求可由本機快取恢復。
- **API 歷史缺失**：保持空值、不前填、不補零。排名／占比的歷史變化需從快照累積。
- **Pages 404／JSON 404**：確認 Pages Source、base path 與 hash URL，確認 artifact 有 `data/`。
- **Push 403**：檢查 Actions 寫入權限、組織政策、main branch protection。受保護分支需要允許 bot 寫入或另行設計資料 PR 流程。
- **更新成功但沒自動部署**：查看 reusable deploy job；勿依賴 bot commit 的 push 事件。
- **某鏈無 Protocol**：未曾進入前十名的鏈僅追蹤鏈歷史；頁面會明示。
- **圖表有斷點**：資料缺失是刻意顯示，不能解讀為零 TVL。
- **分類無法完全對齊**：參考上面的排重規則與狀態頁；官方資料可能修訂，定期完整刷新。
- **目前無 live remote**：如果本機沒有 Git remote／登入憑證，無法代替你在 GitHub 建 repo、開啟 Pages 或驗證正式 URL；本機 build 成功並不等於部署已成功。

歷史按鏈／Protocol 拆檔，JSON 精簡序列化。快照每日一份、歷史每日一點，避免提交龐大的原始 API response。可用 `du -sh data` 與 `find data -name '*.json' | wc -l` 查看實際大小。長期可將快照按年份壓縮歸檔、歷史按年份拆分，並搭配 manifest 分段載入；現版保留完整未壓縮 JSON，需監控 Git Repository 與 Pages artifact 體積。前端歷史僅按需載入，圖表套件已獨立拆成 chunk；未來可進一步按頁面延遲載入。

後續可加上資料版本校驗、歷史成員每日輪動指數、單位／類別切換、完整 E2E CI，以及受保護分支的資料 PR 自動合併流程。

## Bilingual market analytics (2026-10-20)

The interface starts in English. The EN / 繁中 switch updates the interface immediately and remembers the selection in local storage.

Homepage market cards link to dedicated ETF, DEX, RWA and stablecoin views. Market and category controls support 1D, 1W, 1M and 6M, corresponding to trailing 1, 7, 30 and 180 days. Month labels use fixed day windows, not calendar months.

- ETF net flows: [Farside BTC](https://farside.co.uk/bitcoin-etf-flow-all-data/) plus [Farside ETH](https://farside.co.uk/ethereum-etf-flow-all-data/), US spot ETFs only. Signed USD totals; source millions converted to USD. Closed days remain blank. Incomplete sessions invalidate windows containing them; the latest incomplete sessions are not used as the observation endpoint. Percent change is unavailable for zero/negative baselines or negative current flows.
- DEX volume: DefiLlama `/overview/dexs`, daily spot volume excluding the current incomplete UTC day. Flow cards sum the selected period and compare with the preceding equal-length period.
- Stablecoins: `stablecoins.llama.fi/stablecoincharts/all`, sum of `totalCirculatingUSD` across pegs. Latest market cap is compared with an exact 1/7/30/180-day baseline.
- RWA AUM: deliberately pending a separately authorized source, per the free-data decision. A separate RWA protocol TVL reference is shown with reported/eligible coverage; missing values are excluded. It is neither AUM nor the full tokenized asset market. History accumulates from the first observation; growth is unavailable when baseline history or an identical reported cohort is missing.

Chain category bars and homepage chain × category rankings aggregate the same eligible tracked protocols at both dates, then compute `(current sum / baseline sum - 1) × 100`. They do not average protocol percentages. Coverage is the retained top-30 tracking sample, not every protocol in the category or every chain. Any missing member baseline invalidates that category-period. Filters support category, minimum TVL, and percentage/absolute change sorting.

Refresh after the core ETL with:

```bash
python -m scripts.update_analytics
python -m scripts.validate_data
```

The daily data workflow runs both steps. Market sources fail independently: a failed refresh preserves that feed's last successful history and marks it stale. RWA AUM stays unavailable until a real AUM adapter is provided. Market timestamps are separate from the core TVL snapshot. Generated market files live in `data/history/markets/` and `data/latest/markets.json`; category results live in `data/latest/categories.json`.
