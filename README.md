# 🇮🇹 多洛米蒂 (Dolomites) 行程地點發音與中義德英對照指南

> 🏔️ 專為義大利多洛米蒂（Dolomites）自助旅行與健行設計的互動式網頁發音隨行卡！收錄 72 個行程重點地點、國際音標（IPA）、台灣常用中文譯名及語音朗讀。

![Dolomites Banner](hero_bg.jpg)

## 🌐 線上展示 (GitHub Pages)
部署至 GitHub Pages 後即可透過以下網址在手機與電腦上免費存取：
`https://<your-username>.github.io/<your-repository-name>/`

---

## ✨ 核心特色與功能

### 1. 🔊 多國語音真人朗讀 (Web Speech API Engine)
* **智慧語言識別**：自動針對義大利語地名（如 *Cortina, Seceda, Rifugio Lagazuoi*）、德語地名（如 *Villnöß, Seekofelhütte*）與中文譯名載入最適人聲。
* **自動雙語連讀**：點擊即可連續播放「外文原名發音 ➔ 台灣中文譯名」。
* **朗讀速度控制**：支援 0.5x ~ 1.5x 語速調節、選擇指定聲線與測試播放。

### 2. 🎛️ 四大檢視與練習模式
* 🎴 **發音卡片 (Grid Cards)**：玻璃擬物高顏值卡片，附音標、動態音波動畫、行程註記與天數標籤。
* 📊 **對照表格 (Data Table)**：適合快速閱讀與整批搜尋的清晰資料表格。
* 🗂️ **單字練習卡 (Flashcards)**：可點擊 3D 翻轉的單字卡，支援隨機抽卡與自主記憶測試。
* 🗺️ **行程天數巡禮 (Itinerary Timeline)**：按 Day 0 至 Day 14 行程排序，支援「當日語音巡禮」全自動播放。

### 3. 🔍 智慧搜尋與篩選
* **即時模糊搜尋**：支援地名、中文譯名、關鍵字或音標（如 *Seceda, 三峰山, 纜車*）。
* **8 大分類**：主要城市、經典山峰、高山山口、高山湖泊、高山山屋、著名景點、交通樞紐、飯店餐廳。
* **❤️ 收藏功能**：可將重點地點加入愛心收藏，自動儲存於瀏覽器。

---

## 🚀 部署至 GitHub Pages 教學 (How to Deploy)

您可以透過 **命令列 (Git Command Line)** 或 **GitHub 網頁介面** 將本專案上傳至 GitHub：

### 方法 A：使用 Git 命令列上傳 (推薦)

1. 在 GitHub 上建立一個新的公開儲存庫 (Public Repository)，例如命名為 `dolomites-guide`。
2. 開啟終端機 (Terminal)，在專案目錄下執行以下指令：

```bash
# 1. 檢查檔案並進行第一次 Commit
git add .
git commit -m "Initial commit: Dolomites interactive guide web app"

# 2. 重新命名預設分支為 main
git branch -M main

# 3. 連結您的 GitHub 遠端儲存庫 (請替換 <YOUR_USERNAME> 與 <REPO_NAME>)
git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git

# 4. 推送至 GitHub
git push -u origin main
```

---

### 方法 B：使用 GitHub 網頁直接上傳 (無需安裝 Git)

1. 前往 [GitHub.com](https://github.com) 並登入帳號。
2. 點擊右上角的 **`+`** ➔ **`New repository`**。
3. 輸入儲存庫名稱（如 `dolomites-guide`），設為 **Public**，點擊 **Create repository**。
4. 在新建立的頁面中點擊 **"uploading an existing file"**。
5. 將本資料夾內的所有檔案拖曳上傳：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data.js`
   - `hero_bg.jpg`
   - `README.md`
6. 點擊 **Commit changes** 提交檔案。

---

## ⚙️ 開啟 GitHub Pages 免費網頁服務

檔案上傳完成後，只需 30 秒即可啟用免費網頁：

1. 進入 GitHub 儲存庫頁面，點擊上方的 **`Settings`** (設定)。
2. 在左側選單點擊 **`Pages`**。
3. 在 **Build and deployment** ➔ **Source** 選擇 `Deploy from a branch`。
4. 下方的 **Branch** 選擇 `main` / `root` (`/`)，然後點擊 **`Save`**。
5. 等待 1~2 分鐘，重新整理頁面後，頂部會顯示綠色勾勾與您的專案網址：
   👉 `https://<YOUR_USERNAME>.github.io/<REPO_NAME>/`

現在您可以把這個網址分享給同行隊友，或存入手機書籤，在多洛米蒂行程中隨時隨地開啟使用！ 🏔️✨
