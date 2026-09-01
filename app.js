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
  let isPlayingAutoBilingual = false;
  
  let speechSettings = {
    speed: parseFloat(localStorage.getItem('tts_speed') || '1.0'),
    pitch: 1.0,
    autoBilingual: localStorage.getItem('tts_auto_bilingual') !== 'false',
    itVoice: null,
    deVoice: null,
    zhVoice: null
  };

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryTagsContainer = document.getElementById('categoryTags');
  const dayFiltersContainer = document.getElementById('dayFilters');
  const viewContentArea = document.getElementById('viewContentArea');
  const favOnlyBtn = document.getElementById('favOnlyBtn');
  const totalCountSpan = document.getElementById('totalCountSpan');
  
  // Speech Floating Bar Elements
  const floatingAudioBar = document.getElementById('floatingAudioBar');
  const floatingTitle = document.getElementById('floatingTitle');
  const floatingZh = document.getElementById('floatingZh');
  const floatingPlayBtn = document.getElementById('floatingPlayBtn');
  const floatingStopBtn = document.getElementById('floatingStopBtn');
  
  // Modal Elements
  const voiceSettingsBtn = document.getElementById('voiceSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const voiceItSelect = document.getElementById('voiceItSelect');
  const voiceDeSelect = document.getElementById('voiceDeSelect');
  const voiceZhSelect = document.getElementById('voiceZhSelect');
  const ttsSpeedRange = document.getElementById('ttsSpeedRange');
  const ttsSpeedVal = document.getElementById('ttsSpeedVal');
  const autoBilingualToggle = document.getElementById('autoBilingualToggle');
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
    const savedZh = localStorage.getItem('voice_zh');
    
    speechSettings.itVoice = availableVoices.find(v => v.name === savedIt) || 
      availableVoices.find(v => v.lang.startsWith('it')) || 
      availableVoices.find(v => v.lang.includes('IT')) || null;
      
    speechSettings.deVoice = availableVoices.find(v => v.name === savedDe) || 
      availableVoices.find(v => v.lang.startsWith('de')) || 
      availableVoices.find(v => v.lang.includes('DE')) || null;
      
    speechSettings.zhVoice = availableVoices.find(v => v.name === savedZh) || 
      availableVoices.find(v => v.lang === 'zh-TW') || 
      availableVoices.find(v => v.lang.startsWith('zh')) || null;

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
    voiceZhSelect.innerHTML = '<option value="">系統自動選擇 (中文)</option>';

    availableVoices.forEach(v => {
      const optionIt = new Option(`${v.name} (${v.lang})`, v.name, false, speechSettings.itVoice?.name === v.name);
      const optionDe = new Option(`${v.name} (${v.lang})`, v.name, false, speechSettings.deVoice?.name === v.name);
      const optionZh = new Option(`${v.name} (${v.lang})`, v.name, false, speechSettings.zhVoice?.name === v.name);
      
      voiceItSelect.add(optionIt);
      voiceDeSelect.add(optionDe);
      voiceZhSelect.add(optionZh);
    });
  }

  // Speak Functionality
  function speakItem(item, callback = null) {
    if (!speechSynth) {
      alert('您的瀏覽器不支援 Web Speech API 語音朗讀功能。');
      return;
    }

    speechSynth.cancel(); // Stop current speech
    currentSpeechItem = item;
    updateFloatingBar(item, true);

    // Text to pronounce: Clean original name
    let cleanText = item.orig.split('/')[0].trim();
    cleanText = cleanText.replace(/\([^)]*\)/g, '').trim();

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = speechSettings.speed;
    utter.pitch = speechSettings.pitch;

    // Set Voice/Lang
    if (item.lang === 'de-DE' && speechSettings.deVoice) {
      utter.voice = speechSettings.deVoice;
      utter.lang = 'de-DE';
    } else if (speechSettings.itVoice) {
      utter.voice = speechSettings.itVoice;
      utter.lang = 'it-IT';
    } else {
      utter.lang = item.lang || 'it-IT';
    }

    utter.onend = () => {
      if (speechSettings.autoBilingual && item.zh) {
        speakChineseName(item.zh, callback);
      } else {
        updateFloatingBar(null, false);
        highlightCardPlaying(null);
        if (callback) callback();
      }
    };

    utter.onerror = () => {
      updateFloatingBar(null, false);
      highlightCardPlaying(null);
    };

    highlightCardPlaying(item.id);
    speechSynth.speak(utter);
  }

  function speakChineseName(zhText, callback) {
    const cleanZh = zhText.split('/')[0].trim().replace(/\([^)]*\)/g, '');
    const utterZh = new SpeechSynthesisUtterance(cleanZh);
    utterZh.rate = speechSettings.speed;
    if (speechSettings.zhVoice) {
      utterZh.voice = speechSettings.zhVoice;
    }
    utterZh.lang = 'zh-TW';

    utterZh.onend = () => {
      updateFloatingBar(null, false);
      highlightCardPlaying(null);
      if (callback) callback();
    };

    speechSynth.speak(utterZh);
  }

  function stopSpeech() {
    if (speechSynth) {
      speechSynth.cancel();
    }
    currentSpeechItem = null;
    updateFloatingBar(null, false);
    highlightCardPlaying(null);
  }

  function updateFloatingBar(item, isPlaying) {
    if (!item || !isPlaying) {
      floatingAudioBar.classList.add('hidden');
      return;
    }
    floatingTitle.textContent = item.orig;
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

  // View 1: CARDS GRID VIEW
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
          <button class="play-audio-btn">
            <span>🔊 朗讀</span>
            <div class="wave-bars">
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
            </div>
          </button>
        </div>
      `;

      // Event listeners
      card.querySelector('.fav-btn').onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(item.id);
      };

      card.querySelector('.play-audio-btn').onclick = () => {
        speakItem(item);
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
              <th style="width: 50px;">語音</th>
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

      html += `
        <tr data-id="${item.id}">
          <td>
            <button class="play-audio-btn" style="padding: 6px 10px; font-size: 0.8rem;" onclick="window.appSpeak('${item.id}')">
              🔊
            </button>
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
  window.appSpeak = (id) => {
    const item = DOLOMITES_DATA.find(d => d.id === id);
    if (item) speakItem(item);
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
            <button class="play-audio-btn" style="padding: 10px 24px; font-size: 1rem;" id="cardPlayBtn">
              🔊 播放朗讀
            </button>
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
    const cardPlayBtn = document.getElementById('cardPlayBtn');
    
    flashcardEl.onclick = (e) => {
      if (e.target.closest('#cardPlayBtn')) return;
      isFlashcardFlipped = !isFlashcardFlipped;
      flashcardEl.classList.toggle('flipped', isFlashcardFlipped);
    };

    cardPlayBtn.onclick = (e) => {
      e.stopPropagation();
      speakItem(item);
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
          ${dayItems.map(item => `
            <div class="place-card" style="padding: 14px;" data-id="${item.id}">
              <div style="font-weight: 700; color: #fff;">${item.orig}</div>
              <div style="color: var(--text-highlight); font-weight:700; font-size: 0.92rem;">${item.zh}</div>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">${item.note}</div>
              <button class="play-audio-btn" style="margin-top: 8px; padding: 4px 10px; font-size: 0.8rem;" onclick="window.appSpeak('${item.id}')">
                🔊 朗讀
              </button>
            </div>
          `).join('')}
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
        speakItem(data[idx], () => {
          idx++;
          setTimeout(playNext, 600);
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
    speechSettings.speed = parseFloat(e.target.value);
    ttsSpeedVal.textContent = `${speechSettings.speed}x`;
    localStorage.setItem('tts_speed', speechSettings.speed);
  });

  voiceItSelect.addEventListener('change', (e) => {
    speechSettings.itVoice = availableVoices.find(v => v.name === e.target.value) || null;
    localStorage.setItem('voice_it', e.target.value);
  });

  voiceDeSelect.addEventListener('change', (e) => {
    speechSettings.deVoice = availableVoices.find(v => v.name === e.target.value) || null;
    localStorage.setItem('voice_de', e.target.value);
  });

  voiceZhSelect.addEventListener('change', (e) => {
    speechSettings.zhVoice = availableVoices.find(v => v.name === e.target.value) || null;
    localStorage.setItem('voice_zh', e.target.value);
  });

  autoBilingualToggle.addEventListener('change', (e) => {
    speechSettings.autoBilingual = e.target.checked;
    localStorage.setItem('tts_auto_bilingual', e.target.checked);
  });

  testVoiceBtn.onclick = () => {
    speakItem(DOLOMITES_DATA[0]);
  };

  floatingPlayBtn.onclick = () => {
    if (currentSpeechItem) speakItem(currentSpeechItem);
  };

  floatingStopBtn.onclick = () => {
    stopSpeech();
  };

  // Initial setup
  initFilters();
  renderCurrentView();
});
