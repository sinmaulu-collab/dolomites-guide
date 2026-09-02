// Dolomites Pronunciation Interactive App Engine

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentView = 'cards'; // 'cards', 'table', 'flashcards', 'itinerary'
  let currentCategory = 'ALL';
  let currentDay = 'ALL';
  let searchQuery = '';
  let showFavoritesOnly = false;
  let favorites = new Set(JSON.parse(localStorage.getItem('dolomites_favs') || '[]'));
  
  // Speech Synthesis Settings
  let speechSynth = window.speechSynthesis;
  let availableVoices = [];
  let currentSpeechItem = null;
  let currentSpeechMode = 'local'; // 'local' or 'en'
  
  let speechSettings = {
    speed: parseFloat(localStorage.getItem('tts_speed') || '1.0'),
    pitch: 1.0,
    itVoice: null,
    deVoice: null,
    enVoice: null
  };

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryTagsContainer = document.getElementById('categoryTags');
  const dayFiltersContainer = document.getElementById('dayFilters');
  const viewContentArea = document.getElementById('viewContentArea');
  const favOnlyBtn = document.getElementById('favOnlyBtn');
  const totalCountSpan = document.getElementById('totalCountSpan');
  const speedSelectorGroup = document.getElementById('speedSelectorGroup');
  
  // Speech Floating Bar Elements
  const floatingAudioBar = document.getElementById('floatingAudioBar');
  const floatingTitle = document.getElementById('floatingTitle');
  const floatingZh = document.getElementById('floatingZh');
  const floatingPlayBtn = document.getElementById('floatingPlayBtn');
  const floatingStopBtn = document.getElementById('floatingStopBtn');
  const floatingSpeedBtn = document.getElementById('floatingSpeedBtn');
  
  // Modal Elements
  const voiceSettingsBtn = document.getElementById('voiceSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const voiceItSelect = document.getElementById('voiceItSelect');
  const voiceDeSelect = document.getElementById('voiceDeSelect');
  const voiceEnSelect = document.getElementById('voiceEnSelect');
  const ttsSpeedRange = document.getElementById('ttsSpeedRange');
  const ttsSpeedVal = document.getElementById('ttsSpeedVal');
  const testVoiceBtn = document.getElementById('testVoiceBtn');

  // Flashcards state
  let flashcardList = [];
  let currentFlashcardIdx = 0;
  let isFlashcardFlipped = false;

  // Initialize Speech Synthesis Voices
  function loadVoices() {
    if (!speechSynth) return;
    availableVoices = speechSynth.getVoices();
    
    // Auto detect best voices
    const savedIt = localStorage.getItem('voice_it');
    const savedDe = localStorage.getItem('voice_de');
    const savedEn = localStorage.getItem('voice_en');
    
    speechSettings.itVoice = availableVoices.find(v => v.name === savedIt) || 
      availableVoices.find(v => v.lang.startsWith('it')) || 
      availableVoices.find(v => v.lang.includes('IT')) || null;
      
    speechSettings.deVoice = availableVoices.find(v => v.name === savedDe) || 
      availableVoices.find(v => v.lang.startsWith('de')) || 
      availableVoices.find(v => v.lang.includes('DE')) || null;
      
    speechSettings.enVoice = availableVoices.find(v => v.name === savedEn) || 
      availableVoices.find(v => v.lang.startsWith('en-US')) || 
      availableVoices.find(v => v.lang.startsWith('en-GB')) || 
      availableVoices.find(v => v.lang.startsWith('en')) || null;

    populateVoiceSelects();
  }

  if (speechSynth) {
    loadVoices();
    if (speechSynth.onvoiceschanged !== undefined) {
      speechSynth.onvoiceschanged = loadVoices;
    }
  }

  function populateVoiceSelects() {
    if (!voiceItSelect) return;
    
    voiceItSelect.innerHTML = '<option value="">系統自動選擇 (義大利語)</option>';
    voiceDeSelect.innerHTML = '<option value="">系統自動選擇 (德語)</option>';
    voiceEnSelect.innerHTML = '<option value="">系統自動選擇 (英語)</option>';

    availableVoices.forEach(v => {
      const optionIt = new Option(`${v.name} (${v.lang})`, v.name, false, speechSettings.itVoice?.name === v.name);
      const optionDe = new Option(`${v.name} (${v.lang})`, v.name, false, speechSettings.deVoice?.name === v.name);
      const optionEn = new Option(`${v.name} (${v.lang})`, v.name, false, speechSettings.enVoice?.name === v.name);
      
      voiceItSelect.add(optionIt);
      voiceDeSelect.add(optionDe);
      voiceEnSelect.add(optionEn);
    });
  }

  // Update Speed UI everywhere
  function setSpeed(speedVal) {
    speechSettings.speed = parseFloat(speedVal);
    localStorage.setItem('tts_speed', speechSettings.speed);

    // Update buttons UI
    document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speechSettings.speed);
    });

    if (ttsSpeedVal) ttsSpeedVal.textContent = `${speechSettings.speed}x`;
    if (ttsSpeedRange) ttsSpeedRange.value = speechSettings.speed;
    if (floatingSpeedBtn) floatingSpeedBtn.textContent = `⚡ ${speechSettings.speed}x`;
  }

  // Speak Functionality (Local Italian/German or English, NO CHINESE)
  function speakItem(item, mode = 'local', callback = null) {
    if (!speechSynth) {
      alert('您的瀏覽器不支援 Web Speech API 語音朗讀功能。');
      return;
    }

    speechSynth.cancel(); // Stop current speech
    currentSpeechItem = item;
    currentSpeechMode = mode;
    updateFloatingBar(item, mode, true);

    let textToSpeak = '';
    let voiceToUse = null;
    let targetLang = 'it-IT';

    if (mode === 'en') {
      textToSpeak = item.en_speech || item.orig;
      textToSpeak = textToSpeak.replace(/\([^)]*\)/g, '').trim();
      voiceToUse = speechSettings.enVoice;
      targetLang = 'en-US';
    } else {
      // Local Italian / German
      textToSpeak = item.orig.split('/')[0].trim();
      textToSpeak = textToSpeak.replace(/\([^)]*\)/g, '').trim();
      if (item.lang === 'de-DE') {
        voiceToUse = speechSettings.deVoice;
        targetLang = 'de-DE';
      } else {
        voiceToUse = speechSettings.itVoice;
        targetLang = 'it-IT';
      }
    }

    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.rate = speechSettings.speed;
    utter.pitch = speechSettings.pitch;

    if (voiceToUse) utter.voice = voiceToUse;
    utter.lang = targetLang;

    utter.onend = () => {
      updateFloatingBar(null, 'local', false);
      highlightCardPlaying(null);
      if (callback) callback();
    };

    utter.onerror = () => {
      updateFloatingBar(null, 'local', false);
      highlightCardPlaying(null);
    };

    highlightCardPlaying(item.id);
    speechSynth.speak(utter);
  }

  function stopSpeech() {
    if (speechSynth) {
      speechSynth.cancel();
    }
    currentSpeechItem = null;
    updateFloatingBar(null, 'local', false);
    highlightCardPlaying(null);
  }

  function updateFloatingBar(item, mode, isPlaying) {
    if (!item || !isPlaying) {
      floatingAudioBar.classList.add('hidden');
      return;
    }
    const flag = mode === 'en' ? '🇬🇧 英語唸法' : (item.lang === 'de-DE' ? '🇩🇪 當地原音 (德語)' : '🇮🇹 當地原音 (義語)');
    floatingTitle.textContent = `${item.orig} [${flag}]`;
    floatingZh.textContent = item.zh;
    floatingAudioBar.classList.remove('hidden');
  }

  function highlightCardPlaying(id) {
    document.querySelectorAll('.place-card').forEach(card => {
      if (card.dataset.id === id) {
        card.classList.add('playing');
      } else {
        card.classList.remove('playing');
      }
    });
  }

  // Filter Data
  function getFilteredData() {
    return DOLOMITES_DATA.filter(item => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchOrig = item.orig.toLowerCase().includes(q);
        const matchZh = item.zh.toLowerCase().includes(q);
        const matchPhonetic = item.phonetic.toLowerCase().includes(q);
        const matchNote = item.note.toLowerCase().includes(q);
        if (!matchOrig && !matchZh && !matchPhonetic && !matchNote) return false;
      }
      // Category
      if (currentCategory !== 'ALL' && !item.category.includes(currentCategory)) {
        return false;
      }
      // Day
      if (currentDay !== 'ALL' && !item.days.includes(parseInt(currentDay))) {
        return false;
      }
      // Favorites
      if (showFavoritesOnly && !favorites.has(item.id)) {
        return false;
      }
      return true;
    });
  }

  // Render Category & Day Filter Buttons
  function initFilters() {
    // Unique categories
    const categories = ['ALL', ...new Set(DOLOMITES_DATA.map(d => {
      let c = d.category.replace(/^[一二三四五六七八]+[、\.]\s*/, '');
      return c.split('(')[0].trim();
    }))];

    categoryTagsContainer.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `cat-btn ${cat === currentCategory ? 'active' : ''}`;
      btn.textContent = cat === 'ALL' ? '全部地點' : cat;
      btn.onclick = () => {
        currentCategory = cat;
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
      };
      categoryTagsContainer.appendChild(btn);
    });

    // Day filters
    dayFiltersContainer.innerHTML = '';
    const allDayBtn = document.createElement('button');
    allDayBtn.className = `day-btn ${currentDay === 'ALL' ? 'active' : ''}`;
    allDayBtn.textContent = '全行程';
    allDayBtn.onclick = () => {
      currentDay = 'ALL';
      document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
      allDayBtn.classList.add('active');
      renderCurrentView();
    };
    dayFiltersContainer.appendChild(allDayBtn);

    for (let d = 0; d <= 14; d++) {
      const btn = document.createElement('button');
      btn.className = `day-btn ${currentDay === String(d) ? 'active' : ''}`;
      btn.textContent = `Day ${d}`;
      btn.onclick = () => {
        currentDay = String(d);
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
      };
      dayFiltersContainer.appendChild(btn);
    }

    // Speed Selector Buttons
    document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
      btn.onclick = () => setSpeed(btn.dataset.speed);
    });
    setSpeed(speechSettings.speed);
  }

  // Render Views
  function renderCurrentView() {
    const data = getFilteredData();
    totalCountSpan.textContent = `${data.length} 個地點`;

    if (currentView === 'cards') {
      renderCardsView(data);
    } else if (currentView === 'table') {
      renderTableView(data);
    } else if (currentView === 'flashcards') {
      renderFlashcardsView(data);
    } else if (currentView === 'itinerary') {
      renderItineraryView(data);
    }
  }

  // View 1: CARDS GRID VIEW (WITH SEPARATE LOCAL & ENGLISH PLAY BUTTONS)
  function renderCardsView(data) {
    if (data.length === 0) {
      viewContentArea.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">🏔️</div>
          <h3>未找到符合條件的地點</h3>
          <p>請嘗試清除搜尋關鍵字或變更篩選條件。</p>
        </div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'cards-grid';

    data.forEach(item => {
      const isFav = favorites.has(item.id);
      const dayBadges = item.days.map(d => `<span class="day-chip">D${d}</span>`).join(' ');
      const localFlag = item.lang === 'de-DE' ? '🇩🇪 原音' : '🇮🇹 原音';

      const card = document.createElement('div');
      card.className = 'place-card';
      card.dataset.id = item.id;

      card.innerHTML = `
        <div>
          <div class="card-top">
            <span class="card-category-badge">${item.category.split('(')[0].trim()}</span>
            <button class="fav-btn ${isFav ? 'active' : ''}" title="收藏地點">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
          <h3 class="card-orig-title">${item.orig}</h3>
          <div class="card-zh-title">${item.zh}</div>
          <div class="card-phonetic-box">${item.phonetic}</div>
          <div class="card-note">${item.note}</div>
        </div>
        <div class="card-footer">
          <div class="day-badge-list">${dayBadges}</div>
          <div class="audio-btn-group">
            <button class="play-audio-btn local-btn">
              <span>${localFlag}</span>
              <div class="wave-bars">
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
              </div>
            </button>
            <button class="play-audio-btn en-btn">
              <span>🇬🇧 英語</span>
              <div class="wave-bars">
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
              </div>
            </button>
          </div>
        </div>
      `;

      // Event listeners
      card.querySelector('.fav-btn').onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(item.id);
      };

      card.querySelector('.local-btn').onclick = () => {
        speakItem(item, 'local');
      };

      card.querySelector('.en-btn').onclick = () => {
        speakItem(item, 'en');
      };

      grid.appendChild(card);
    });

    viewContentArea.innerHTML = '';
    viewContentArea.appendChild(grid);
  }

  // View 2: DATA TABLE VIEW
  function renderTableView(data) {
    if (data.length === 0) {
      viewContentArea.innerHTML = `<div style="text-align: center; padding: 60px; color: var(--text-muted);">無符合資料</div>`;
      return;
    }

    let html = `
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th style="width: 140px;">語音發音</th>
              <th>原名／外文名稱</th>
              <th>發音指南 (IPA)</th>
              <th>台灣常用中文譯名</th>
              <th>行程備註與類別</th>
              <th>行程天數</th>
              <th style="width: 50px;">收藏</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(item => {
      const isFav = favorites.has(item.id);
      const dayChips = item.days.map(d => `<span class="day-chip">D${d}</span>`).join(' ');
      const localFlag = item.lang === 'de-DE' ? '🇩🇪 原音' : '🇮🇹 原音';

      html += `
        <tr data-id="${item.id}">
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="play-audio-btn" style="padding: 4px 8px; font-size: 0.75rem;" onclick="window.appSpeak('${item.id}', 'local')">
                ${localFlag}
              </button>
              <button class="play-audio-btn en-btn" style="padding: 4px 8px; font-size: 0.75rem;" onclick="window.appSpeak('${item.id}', 'en')">
                🇬🇧 英語
              </button>
            </div>
          </td>
          <td style="font-weight: 700; color: #fff;">${item.orig}</td>
          <td style="font-family: monospace; font-size: 0.88rem; color: #cbd5e1; white-space: pre-line;">${item.phonetic}</td>
          <td style="font-weight: 700; color: var(--text-highlight);">${item.zh}</td>
          <td style="color: var(--text-muted); font-size: 0.88rem;">
            <div style="color: var(--cyan-glacier); font-size: 0.76rem; font-weight:700;">${item.category.split('(')[0].trim()}</div>
            ${item.note}
          </td>
          <td>${dayChips}</td>
          <td>
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="window.appFav('${item.id}')">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    viewContentArea.innerHTML = html;
  }

  // Global helper for table view inline onclick
  window.appSpeak = (id, mode = 'local') => {
    const item = DOLOMITES_DATA.find(d => d.id === id);
    if (item) speakItem(item, mode);
  };

  window.appFav = (id) => {
    toggleFavorite(id);
  };

  // View 3: FLASHCARDS PRACTICE VIEW
  function renderFlashcardsView(data) {
    flashcardList = data;
    currentFlashcardIdx = 0;
    isFlashcardFlipped = false;
    updateFlashcardUI();
  }

  function updateFlashcardUI() {
    if (flashcardList.length === 0) {
      viewContentArea.innerHTML = `<div style="text-align: center; padding: 60px; color: var(--text-muted);">目前篩選無可複習之地點單字卡</div>`;
      return;
    }

    const item = flashcardList[currentFlashcardIdx];
    const isFav = favorites.has(item.id);
    const localFlag = item.lang === 'de-DE' ? '🇩🇪 當地原音 (德語)' : '🇮🇹 當地原音 (義語)';

    viewContentArea.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px; color: var(--text-muted); font-size: 0.9rem;">
        單字卡 ${currentFlashcardIdx + 1} / ${flashcardList.length} (點擊卡片即可翻面)
      </div>
      <div class="flashcard-wrapper">
        <div class="flashcard ${isFlashcardFlipped ? 'flipped' : ''}" id="flashcardEl">
          <div class="flashcard-front">
            <span class="card-category-badge" style="margin-bottom: 20px;">${item.category.split('(')[0].trim()}</span>
            <h2 style="font-size: 2.2rem; color: #fff; margin-bottom: 16px;">${item.orig}</h2>
            <div class="card-phonetic-box" style="font-size: 1rem; width: 100%; max-width: 400px; margin-bottom: 24px;">${item.phonetic}</div>
            <div style="display: flex; gap: 12px;" id="cardBtnContainer">
              <button class="play-audio-btn" style="padding: 10px 20px; font-size: 0.95rem;" id="cardPlayLocalBtn">
                🔊 ${localFlag}
              </button>
              <button class="play-audio-btn en-btn" style="padding: 10px 20px; font-size: 0.95rem;" id="cardPlayEnBtn">
                🇬🇧 英語唸法
              </button>
            </div>
          </div>
          <div class="flashcard-back">
            <h3 style="font-size: 1.8rem; color: var(--text-highlight); margin-bottom: 12px;">${item.zh}</h3>
            <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 20px; line-height: 1.6;">${item.note}</p>
            <div style="font-size: 0.85rem; color: var(--cyan-glacier);">行程天數：${item.days.map(d => `Day ${d}`).join(', ')}</div>
          </div>
        </div>

        <div class="flashcard-controls">
          <button class="btn-card-ctrl" id="prevCardBtn">⬅️ 上一張</button>
          <button class="btn-card-ctrl" id="shuffleCardBtn">🔀 隨機抽卡</button>
          <button class="btn-card-ctrl" id="nextCardBtn">下一張 ➡️</button>
        </div>
      </div>
    `;

    const flashcardEl = document.getElementById('flashcardEl');
    
    flashcardEl.onclick = (e) => {
      if (e.target.closest('#cardBtnContainer')) return;
      isFlashcardFlipped = !isFlashcardFlipped;
      flashcardEl.classList.toggle('flipped', isFlashcardFlipped);
    };

    document.getElementById('cardPlayLocalBtn').onclick = (e) => {
      e.stopPropagation();
      speakItem(item, 'local');
    };

    document.getElementById('cardPlayEnBtn').onclick = (e) => {
      e.stopPropagation();
      speakItem(item, 'en');
    };

    document.getElementById('prevCardBtn').onclick = () => {
      currentFlashcardIdx = (currentFlashcardIdx - 1 + flashcardList.length) % flashcardList.length;
      isFlashcardFlipped = false;
      updateFlashcardUI();
    };

    document.getElementById('nextCardBtn').onclick = () => {
      currentFlashcardIdx = (currentFlashcardIdx + 1) % flashcardList.length;
      isFlashcardFlipped = false;
      updateFlashcardUI();
    };

    document.getElementById('shuffleCardBtn').onclick = () => {
      currentFlashcardIdx = Math.floor(Math.random() * flashcardList.length);
      isFlashcardFlipped = false;
      updateFlashcardUI();
    };
  }

  // View 4: ITINERARY DAY-BY-DAY VIEW
  function renderItineraryView(data) {
    const itineraryArea = document.createElement('div');
    itineraryArea.className = 'itinerary-view';

    for (let day = 0; day <= 14; day++) {
      const dayItems = data.filter(item => item.days.includes(day));
      if (dayItems.length === 0 && currentDay !== 'ALL') continue;

      const dayCard = document.createElement('div');
      dayCard.className = 'day-timeline-card';

      let dayTitle = `Day ${day}`;
      if (day === 0) dayTitle += ' (09/17)：台灣出發 → 香港轉機';
      else if (day === 1) dayTitle += ' (09/18)：抵達米蘭 → 威尼斯 Mestre';
      else if (day === 2) dayTitle += ' (09/19)：威尼斯本島一日漫遊';
      else if (day === 3) dayTitle += ' (09/20)：威尼斯 → Cortina d\'Ampezzo (東多羅米蒂門戶)';
      else if (day === 4) dayTitle += ' (09/21)：Alta Via 1 縱走 D1 (Lago di Braies → Fodara Vedla)';
      else if (day === 5) dayTitle += ' (09/22)：Alta Via 1 縱走 D2 (Fodara Vedla → Rifugio Lavarella)';
      else if (day === 6) dayTitle += ' (09/23)：Alta Via 1 縱走 D3 下山 (Lagazuoi → Cortina)';
      else if (day === 7) dayTitle += ' (09/24)：三峰山 Tre Cime 環線健行';
      else if (day === 8) dayTitle += ' (09/25)：東向西跨區轉移 (Cortina → Santa Cristina)';
      else if (day === 9) dayTitle += ' (09/26)：Seceda 刀背山完整健行日';
      else if (day === 10) dayTitle += ' (09/27)：Sassolungo 環線 或 Val di Funes 經典山谷';
      else if (day === 11) dayTitle += ' (09/28)：西多羅米蒂 → Bolzano → 米蘭';
      else if (day === 12) dayTitle += ' (09/29)：米蘭大教堂與市區巡禮';
      else if (day === 13) dayTitle += ' (09/30)：米蘭出發 → 搭機賦歸';
      else if (day === 14) dayTitle += ' (10/01)：抵達台灣桃園國際機場';

      dayCard.innerHTML = `
        <div class="day-header">
          <div class="day-title">${dayTitle}</div>
          <button class="play-audio-btn" style="padding: 6px 14px; font-size: 0.85rem;" onclick="window.playAllDayItems(${day})">
            ▶️ 當日語音巡禮 (${dayItems.length})
          </button>
        </div>
        <div class="day-places-grid">
          ${dayItems.map(item => {
            const localFlag = item.lang === 'de-DE' ? '🇩🇪 原音' : '🇮🇹 原音';
            return `
            <div class="place-card" style="padding: 14px;" data-id="${item.id}">
              <div style="font-weight: 700; color: #fff;">${item.orig}</div>
              <div style="color: var(--text-highlight); font-weight:700; font-size: 0.92rem;">${item.zh}</div>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">${item.note}</div>
              <div style="display: flex; gap: 6px; margin-top: 10px;">
                <button class="play-audio-btn" style="padding: 4px 8px; font-size: 0.78rem;" onclick="window.appSpeak('${item.id}', 'local')">
                  ${localFlag}
                </button>
                <button class="play-audio-btn en-btn" style="padding: 4px 8px; font-size: 0.78rem;" onclick="window.appSpeak('${item.id}', 'en')">
                  🇬🇧 英語
                </button>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `;

      itineraryArea.appendChild(dayCard);
    }

    viewContentArea.innerHTML = '';
    viewContentArea.appendChild(itineraryArea);
  }

  // Play All Items for a day sequentially
  window.playAllDayItems = (day) => {
    const data = getFilteredData().filter(item => item.days.includes(day));
    if (data.length === 0) return;

    let idx = 0;
    function playNext() {
      if (idx < data.length) {
        speakItem(data[idx], 'local', () => {
          idx++;
          setTimeout(playNext, 500);
        });
      }
    }
    playNext();
  };

  // Toggle Favorite
  function toggleFavorite(id) {
    if (favorites.has(id)) {
      favorites.delete(id);
    } else {
      favorites.add(id);
    }
    localStorage.setItem('dolomites_favs', JSON.stringify([...favorites]));
    renderCurrentView();
  }

  // Event Listeners for Search & Views
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderCurrentView();
  });

  clearSearchBtn.onclick = () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderCurrentView();
  };

  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderCurrentView();
    };
  });

  favOnlyBtn.onclick = () => {
    showFavoritesOnly = !showFavoritesOnly;
    favOnlyBtn.classList.toggle('active', showFavoritesOnly);
    renderCurrentView();
  };

  // Modal Event Handlers
  voiceSettingsBtn.onclick = () => settingsModal.classList.add('active');
  closeModalBtn.onclick = () => settingsModal.classList.remove('active');
  settingsModal.onclick = (e) => { if (e.target === settingsModal) settingsModal.classList.remove('active'); };

  ttsSpeedRange.addEventListener('input', (e) => {
    setSpeed(e.target.value);
  });

  voiceItSelect.addEventListener('change', (e) => {
    speechSettings.itVoice = availableVoices.find(v => v.name === e.target.value) || null;
    localStorage.setItem('voice_it', e.target.value);
  });

  voiceDeSelect.addEventListener('change', (e) => {
    speechSettings.deVoice = availableVoices.find(v => v.name === e.target.value) || null;
    localStorage.setItem('voice_de', e.target.value);
  });

  voiceEnSelect.addEventListener('change', (e) => {
    speechSettings.enVoice = availableVoices.find(v => v.name === e.target.value) || null;
    localStorage.setItem('voice_en', e.target.value);
  });

  testVoiceBtn.onclick = () => {
    speakItem(DOLOMITES_DATA[1], 'local');
  };

  floatingPlayBtn.onclick = () => {
    if (currentSpeechItem) speakItem(currentSpeechItem, currentSpeechMode);
  };

  floatingStopBtn.onclick = () => {
    stopSpeech();
  };

  // Floating speed button toggle cycle: 0.75x -> 1.0x -> 1.25x -> 1.5x -> 0.75x
  if (floatingSpeedBtn) {
    floatingSpeedBtn.onclick = () => {
      const speeds = [0.75, 1.0, 1.25, 1.5];
      const curIdx = speeds.indexOf(speechSettings.speed);
      const nextSpeed = speeds[(curIdx + 1) % speeds.length];
      setSpeed(nextSpeed);
    };
  }

  // Initial setup
  initFilters();
  renderCurrentView();
});
