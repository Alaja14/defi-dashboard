# 驗證紀錄

2026-10-20，在本機以 Node.js（bundled runtime）、npm 10.9.3、Python 3.12 執行。

| 檢查 | 結果 |
| --- | --- |
| npm install | 成功 |
| npm ci（lockfile 重現） | 成功，audit 0 vulnerabilities |
| python -m pytest -q | 40 passed |
| npm test | 3 passed |
| npm run typecheck | 成功 |
| npm run build | 成功，已拆分圖表 chunk |
| VITE_BASE_PATH=/defi-tvl-dashboard/ npm run build | 成功 |
| python -m scripts.validate_data | 成功，市場大幅變化保留 warning |
| 真實 API 首次 backfill | 成功 |
| 真實 API 增量與同日重跑 | 成功，UTC 日期不重複 |
| API／Protocol 部分失敗與發布 rename 失敗 | 離線測試確認保留舊版 |
| 1440px 桌面／390px 手機 | 實際瀏覽器檢查通過 |
| 搜尋 Ethereum、鏈頁導航 | 通過 |
| 排行榜前 20、TVL 排序 | 通過（20 筆資料 + 1 列標題） |
| Aave V3 on Ethereum | 本鏈 TVL 與全球 TVL 分開顯示 |
| Protocol 30D 切換 | 通過 |
| production subpath 深層網址與重新整理 | 通過 |
| GitHub Actions 實際遠端執行 | 未執行：無 Git remote／GitHub 設定 |
| GitHub Pages 正式部署 | 未執行：需使用者設定 Repository 與 Pages |

正式資料：418 條正規化鏈、363 組已保存的鏈／Protocol，299 組符合目前分析分類；Tron 29 個，其餘前十鏈各 30 個。共 792 個 JSON，約 25.8 MB（十進位）。額外封存項目與舊別名歷史保留；不提交原始 API cache。

上游分類、重複資產及抓取時點造成部分 Protocol 加總超過官方鏈分母。此差異未被偽造修正；記錄 warning，前十合計超過分母時不顯示圓餅圖。保守排除分類不宣稱完全重現官方總量。全球 API 的資料日期與本機抓取時間分開顯示。

所有 fixtures 僅供測試，正式 JSON 來自 DefiLlama。完整資料口徑與上線步驟見 README.md。

新增功能驗證（2026-10-20）：

- 英文預設、繁中即時切換、重新整理保留語言：通過。
- ETF、DEX、Stablecoins 真實資料擷取：成功；RWA AUM 依需求保留來源待接，另列 RWA TVL 與 116/184 覆蓋率。
- 市場 1D／7D／1W／30D：瀏覽器確認金額更新，7D 與 1W 一致。
- Ethereum 分類成長、首頁 chain × category 排名：已載入真實資料與長條圖。
- 390px 手機首頁：document scrollWidth = 390，無整頁水平溢位。
- 新增 8 項 Python 測試涵蓋固定成員加權分類成長、缺失基準、淨流量正負值、ETF 申報缺值、USD 穩定幣口徑與來源失敗保留舊資料。
- 新增前端英文預設與繁中翻譯測試。

市場 JSON 含 Farside ETF 資料；核心 TVL、DEX、Stablecoins、RWA TVL 參考來自 DefiLlama。來源待接的 AUM 無虛構數值。

時間選項更新：全站圖表統一為 1D／1W／1M／6M（1／7／30／180 天），新增 180 天流量與存量比較測試；以 /defi-dashboard/ 子路徑建置成功。
