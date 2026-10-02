# 梅花易數 · 紫微斗數

個人專用算命助手（純前端，無需後端）

## 功能一覽

| 模組 | 說明 |
|------|------|
| 梅花易數 | 時間/數字/字數三種起卦，64卦完整資料庫，體用生剋判定，全程無 Math.random |
| 紫微斗數 | 農曆換算，14主星安星，四化飛星，12宮排布，可點擊展開解讀 |
| 靈魂金句 | 2場景 × 16句（職場+情感），4種語氣，配對卦象吉凶 |
| 每日能量卡 | 28張，4時段，自動 seed，隔日刷新 |
| 習慣錨點 | Streak 追蹤，統計面板，JSON 匯出/清除 |
| 決策回看 | 問事後記錄，7天後複盤 |

## 快捷鍵

| 鍵 | 面板 |
|----|------|
| `T` | 今日能量卡 |
| `D` | 占卦決策 |
| `M` | 紫微命盤 |
| `S` | 使用紀錄 |

## 部署方式

### 方式一：Vercel（推薦，30 秒完成）

**你需要在終端執行的指令：**

```bash
# 1. 進入專案資料夾
cd "/Users/liangzhiwei/Documents/VIbe Coding/算命"

# 2. 安裝 Vercel CLI（如尚未安裝）
npm i -g vercel

# 3. 登入 Vercel（瀏覽器會彈出確認）
vercel login

# 4. 部署（回答提示即可）
vercel

#   ? Set up and deploy?  → Y
#   ? Which scope?       → 選你的帳號
#   ? Link to existing project? → N
#   ? Project name?       → suanming（或自訂）
#   ? Directory?          → ./ （確認）
#   ? Override settings?  → N

# 完成後，Vercel 會給你一個 URL，例如：
# https://suanming.vercel.app
```

**之後每次更新代码只需：**
```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/算命"
vercel --prod
```

### 方式二：GitHub + Vercel（自動部署）

**步驟：**

**你在 GitHub 上：**
1. 前往 [github.com/new](https://github.com/new)
2. Repository name 填 `suanming`（或任意名稱）
3. 不要勾選任何初始化選項，點 **Create repository**

**回到終端執行：**
```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/算命"

# 2. 連接 GitHub remote
git remote add origin https://github.com/你的帳號名/suanming.git

# 3. 推送代碼
git branch -M main
git push -u origin main
```

**在 Vercel 上設定自動部署：**
1. 前往 [vercel.com](https://vercel.com)
2. 點 **Add New...** → **Project**
3. 選擇你剛才創建的 GitHub repo `suanming`
4. Framework Preset 選 **Other**（或 Vite / Next.js 皆可）
5. Build Command 留空，Output Directory 填 `.`
6. 點 **Deploy**

之後你每次 `git push` 到 GitHub，Vercel 就會自動重新部署。

### 方式三：GitHub Pages（免費靜態托管）

```bash
# 在 GitHub repo 設定中啟用 Pages
# Source 選 main branch，/ (root)
# 之後訪問 https://你的帳號.github.io/suanming
```

## 本地運行

直接在瀏覽器打開 `index.html` 即可（支援 Chrome、Safari、Firefox）。

或使用簡單的 HTTP server：
```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/算命"
npx serve .
# 然後打開 http://localhost:3000
```

## 資料儲存

所有資料存在瀏覽器的 `localStorage`，不上傳任何伺服器。
如需備份，點「匯出JSON」按鈕即可下載完整資料。

## 技術棧

- 純 HTML/CSS/JavaScript（ES Module）
- 無需建構工具，無需後端
- Google Fonts: Noto Serif TC
