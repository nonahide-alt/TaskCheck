/**
 * できたよチェック！キッズチェックリスト - メインJavaScript
 */

// --- クラウドデータベース設定 ---
// ※無料のクラウドデータベース（JSONBin.ioなど）を利用する場合、以下を設定してください。
// 例: https://api.jsonbin.io/v3/b/YOUR_BIN_ID
const CLOUD_API_URL = 'https://api.jsonbin.io/v3/b/6aa66a23ffd5d1605300e31b';
const CLOUD_API_KEY = '$2a$10$pHiI/cUhdkhsgou8Q9BhoOT3vaJq9WpZd3c7rMnAZaz9lMLcT.5uK'; // 例: $2a$10$YOUR_API_KEY_HERE

// --- 初期デフォルトデータ ---
const DEFAULT_GROUPS = [
  { id: 'group_school', name: '🎒 がっこうのじゅんび', color: '#ff7675' },
  { id: 'group_study', name: '🎹 べんきょう・ならいごと', color: '#74b9ff' },
  { id: 'group_home', name: '🏠 いえのなかのこと', color: '#55efc4' }
];

const DEFAULT_ITEMS = [
  {
    id: 'item_1',
    groupId: 'group_school',
    title: '上靴（うわぐつ）',
    duration: '金曜持帰/月曜持参',
    comment: '洗って乾かした上靴を白袋に入れてリュックの横に入れるよ。'
  },
  {
    id: 'item_2',
    groupId: 'group_school',
    title: 'ぐんぐんノート',
    duration: '約10分',
    comment: '今日やったページをおうちの人に見せてサインをもらってからリュックに入れる。'
  },
  {
    id: 'item_3',
    groupId: 'group_study',
    title: '読み書きのチェック',
    duration: '約15分',
    comment: '国語の教科書を大きな声で音読！音読カードに記入する。'
  },
  {
    id: 'item_4',
    groupId: 'group_study',
    title: 'ピアノの練習',
    duration: '約20分（夕方）',
    comment: '今週習った曲を楽譜を見ながら3回通してしっかり弾こう。'
  }
];

// --- アプリ状態管理 ---
class AppState {
  constructor() {
    this.groups = DEFAULT_GROUPS;
    this.items = DEFAULT_ITEMS;
    this.logs = {};

    this.selectedDate = this.formatDate(new Date());
    const now = new Date();
    this.calYear = now.getFullYear();
    this.calMonth = now.getMonth();
    this.activeGroupFilter = 'all';
  }

  async loadData() {
    if (CLOUD_API_URL && CLOUD_API_KEY) {
      try {
        const res = await fetch(CLOUD_API_URL, {
          headers: { 'X-Master-Key': CLOUD_API_KEY }
        });
        if (res.ok) {
          const data = await res.json();
          const record = data.record || data;
          if (record.groups) this.groups = record.groups;
          if (record.items) this.items = record.items;
          if (record.logs) this.logs = record.logs;
          return;
        }
      } catch (err) {
        console.error("Cloud DB load error:", err);
      }
    }
    // Fallback to localStorage if cloud is not set or failed
    this.groups = JSON.parse(localStorage.getItem('taskcheck_groups')) || DEFAULT_GROUPS;
    this.items = JSON.parse(localStorage.getItem('taskcheck_items')) || DEFAULT_ITEMS;
    this.logs = JSON.parse(localStorage.getItem('taskcheck_logs')) || {};
  }

  async saveDataToCloud() {
    if (CLOUD_API_URL && CLOUD_API_KEY) {
      try {
        await fetch(CLOUD_API_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': CLOUD_API_KEY
          },
          body: JSON.stringify({
            groups: this.groups,
            items: this.items,
            logs: this.logs
          })
        });
      } catch (err) {
        console.error("Cloud DB save error:", err);
      }
    }
  }

  saveGroups() {
    localStorage.setItem('taskcheck_groups', JSON.stringify(this.groups));
    this.saveDataToCloud();
  }

  saveItems() {
    localStorage.setItem('taskcheck_items', JSON.stringify(this.items));
    this.saveDataToCloud();
  }

  saveLogs() {
    localStorage.setItem('taskcheck_logs', JSON.stringify(this.logs));
    this.saveDataToCloud();
  }

  formatDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getFormattedDateDisplay(dateStr) {
    const parts = dateStr.split('-');
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 (${days[dateObj.getDay()]})`;
  }

  isItemChecked(dateStr, itemId) {
    return !!(this.logs[dateStr] && this.logs[dateStr][itemId]);
  }

  toggleCheck(dateStr, itemId) {
    if (!this.logs[dateStr]) {
      this.logs[dateStr] = {};
    }
    const current = !!this.logs[dateStr][itemId];
    this.logs[dateStr][itemId] = !current;
    this.saveLogs();
    return !current;
  }

  isItemActiveOnDate(item, dateStr) {
    const parts = dateStr.split('-');
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = dateObj.getDay();

    if (item.scheduleType === 'specific_date') {
      return item.specificDate === dateStr;
    } else {
      if (item.weeklyDays && Array.isArray(item.weeklyDays)) {
        return item.weeklyDays.includes(dayOfWeek.toString());
      }
      return true;
    }
  }

  getDateProgress(dateStr) {
    const activeItems = this.items.filter(item => this.isItemActiveOnDate(item, dateStr));
    if (activeItems.length === 0) return { total: 0, checked: 0, percent: 0 };

    const dateLog = this.logs[dateStr] || {};
    let checked = 0;
    activeItems.forEach(item => {
      if (dateLog[item.id]) checked++;
    });
    const total = activeItems.length;
    const percent = Math.round((checked / total) * 100);
    return { total, checked, percent };
  }
}

const state = new AppState();

// --- DOM 要素 ---
const elements = {
  downloadDataBtn: document.getElementById('download-data-btn'),
  importDataBtn: document.getElementById('import-data-btn'),
  importFileInput: document.getElementById('import-file-input'),
  datePickerInput: document.getElementById('date-picker-input'),
  currentDateDisplay: document.getElementById('current-date-display'),
  prevDateBtn: document.getElementById('prev-date-btn'),
  nextDateBtn: document.getElementById('next-date-btn'),
  todayBtn: document.getElementById('today-btn'),

  toggleCalendarBtn: document.getElementById('toggle-calendar-btn'),
  calendarSection: document.getElementById('calendar-section'),
  closeCalendarBtn: document.getElementById('close-calendar-btn'),
  calPrevMonth: document.getElementById('cal-prev-month'),
  calNextMonth: document.getElementById('cal-next-month'),
  calMonthYear: document.getElementById('cal-month-year'),
  calendarGrid: document.getElementById('calendar-grid'),

  progressBarFill: document.getElementById('progress-bar-fill'),
  progressPercent: document.getElementById('progress-percent'),
  progressMessage: document.getElementById('progress-message'),

  groupFilterTabs: document.getElementById('group-filter-tabs'),
  groupsContainer: document.getElementById('groups-container'),

  openManageBtn: document.getElementById('open-manage-btn'),
  manageModal: document.getElementById('manage-modal'),
  closeManageModalBtn: document.getElementById('close-manage-modal-btn'),
  closeManageBtnFooter: document.getElementById('close-manage-btn-footer'),
  manageItemsList: document.getElementById('manage-items-list'),
  manageGroupsList: document.getElementById('manage-groups-list'),
  addNewItemBtn: document.getElementById('add-new-item-btn'),
  addGroupForm: document.getElementById('add-group-form'),
  editGroupIdInput: document.getElementById('edit-group-id'),
  addGroupSubmitBtn: document.getElementById('add-group-submit-btn'),
  cancelEditGroupBtn: document.getElementById('cancel-edit-group-btn'),

  itemModal: document.getElementById('item-modal'),
  itemModalTitle: document.getElementById('item-modal-title'),
  closeItemModalBtn: document.getElementById('close-item-modal-btn'),
  cancelItemBtn: document.getElementById('cancel-item-btn'),
  itemForm: document.getElementById('item-form'),
  itemIdInput: document.getElementById('item-id'),
  itemTitleInput: document.getElementById('item-title'),
  itemGroupSelect: document.getElementById('item-group'),
  scheduleTypeRadios: document.getElementsByName('schedule-type'),
  weeklyScheduleGroup: document.getElementById('weekly-schedule-group'),
  specificDateGroup: document.getElementById('specific-date-group'),
  weeklyDayCheckboxes: document.getElementsByName('weekly-day'),
  itemSpecificDateInput: document.getElementById('item-specific-date'),
  itemDurationInput: document.getElementById('item-duration'),
  itemCommentInput: document.getElementById('item-comment'),

  confettiCanvas: document.getElementById('confetti-canvas')
};

// --- 初期化 ---
async function initApp() {
  const token = localStorage.getItem('taskcheck_auth');
  if (token === 'yugo_5963') {
    document.getElementById('login-overlay').classList.add('hidden');
    await loadApp();
  } else {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('login-id').value;
      const pass = document.getElementById('login-pass').value;
      if (id === 'yugo' && pass === '5963') {
        localStorage.setItem('taskcheck_auth', 'yugo_5963');
        document.getElementById('login-overlay').classList.add('hidden');
        await loadApp();
      } else {
        document.getElementById('login-error-msg').classList.remove('hidden');
      }
    });
  }
}

async function loadApp() {
  document.getElementById('loading-overlay').classList.remove('hidden');
  await state.loadData();
  document.getElementById('loading-overlay').classList.add('hidden');

  setupEventListeners();
  updateDateDisplay();
  renderGroupFilterTabs();
  renderChecklist();
  renderProgress();
  renderCalendar();
}

// --- 日付操作 ---
function updateDateDisplay() {
  elements.datePickerInput.value = state.selectedDate;
  elements.currentDateDisplay.textContent = state.getFormattedDateDisplay(state.selectedDate);
}

function changeSelectedDate(newDateStr) {
  state.selectedDate = newDateStr;
  updateDateDisplay();
  renderChecklist();
  renderProgress();
  renderCalendar();
}

function addDaysToDate(dateStr, days) {
  const parts = dateStr.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return state.formatDate(d);
}

// --- イベントリスナー設定 ---
function setupEventListeners() {
  // データダウンロード
  if (elements.downloadDataBtn) {
    elements.downloadDataBtn.addEventListener('click', () => {
      const dataObj = {
        groups: state.groups,
        items: state.items,
        logs: state.logs
      };
      const jsonStr = JSON.stringify(dataObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `taskcheck_data_${state.formatDate(new Date()).replace(/-/g, '')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // データ読み込み（インポート）
  if (elements.importDataBtn && elements.importFileInput) {
    elements.importDataBtn.addEventListener('click', () => {
      elements.importFileInput.click();
    });

    elements.importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.groups && !data.items && !data.logs) {
            alert('このファイルはチェックリストのデータではないようです。');
            return;
          }
          if (!confirm('現在のデータを読み込んだファイルの内容で上書きします。よろしいですか？')) {
            return;
          }
          if (data.groups) state.groups = data.groups;
          if (data.items) state.items = data.items;
          if (data.logs) state.logs = data.logs;

          state.saveGroups();
          state.saveItems();
          state.saveLogs();

          renderGroupFilterTabs();
          renderChecklist();
          renderProgress();
          renderCalendar();
          alert('データを読み込みました！');
        } catch (err) {
          alert('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // 日付ナビ
  elements.prevDateBtn.addEventListener('click', () => {
    changeSelectedDate(addDaysToDate(state.selectedDate, -1));
  });

  elements.nextDateBtn.addEventListener('click', () => {
    changeSelectedDate(addDaysToDate(state.selectedDate, 1));
  });

  elements.todayBtn.addEventListener('click', () => {
    changeSelectedDate(state.formatDate(new Date()));
  });

  elements.datePickerInput.addEventListener('change', (e) => {
    if (e.target.value) {
      changeSelectedDate(e.target.value);
    }
  });

  // カレンダー表示トグル
  elements.toggleCalendarBtn.addEventListener('click', () => {
    elements.calendarSection.classList.toggle('hidden');
    if (!elements.calendarSection.classList.contains('hidden')) {
      renderCalendar();
    }
  });

  elements.closeCalendarBtn.addEventListener('click', () => {
    elements.calendarSection.classList.add('hidden');
  });

  elements.calPrevMonth.addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth < 0) {
      state.calMonth = 11;
      state.calYear--;
    }
    renderCalendar();
  });

  elements.calNextMonth.addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth > 11) {
      state.calMonth = 0;
      state.calYear++;
    }
    renderCalendar();
  });

  // 管理モーダル
  elements.openManageBtn.addEventListener('click', () => {
    openManageModal();
  });

  elements.closeManageModalBtn.addEventListener('click', () => {
    elements.manageModal.classList.add('hidden');
  });

  elements.closeManageBtnFooter.addEventListener('click', () => {
    elements.manageModal.classList.add('hidden');
  });

  // 管理タブ切り替え
  document.querySelectorAll('.manage-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.manage-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.manage-panel').forEach(p => p.classList.add('hidden'));

      e.target.classList.add('active');
      const targetId = e.target.getAttribute('data-target');
      document.getElementById(targetId).classList.remove('hidden');
    });
  });

  // アイテムモーダル
  elements.addNewItemBtn.addEventListener('click', () => {
    openItemModal();
  });

  elements.closeItemModalBtn.addEventListener('click', () => {
    elements.itemModal.classList.add('hidden');
  });

  elements.cancelItemBtn.addEventListener('click', () => {
    elements.itemModal.classList.add('hidden');
  });

  elements.itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveItemForm();
  });

  Array.from(elements.scheduleTypeRadios).forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'weekly') {
        elements.weeklyScheduleGroup.classList.remove('hidden');
        elements.specificDateGroup.classList.add('hidden');
      } else {
        elements.weeklyScheduleGroup.classList.add('hidden');
        elements.specificDateGroup.classList.remove('hidden');
      }
    });
  });

  // グループ追加・編集フォーム
  elements.addGroupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-group-name');
    const colorInput = document.getElementById('new-group-color');
    const name = nameInput.value.trim();
    if (!name) return;

    const editId = elements.editGroupIdInput.value;
    if (editId) {
      const group = state.groups.find(g => g.id === editId);
      if (group) {
        group.name = name;
        group.color = colorInput.value || '#74b9ff';
      }
    } else {
      const newGroup = {
        id: 'group_' + Date.now(),
        name: name,
        color: colorInput.value || '#74b9ff'
      };
      state.groups.push(newGroup);
    }
    
    state.saveGroups();
    resetGroupForm();
    renderGroupFilterTabs();
    renderManageGroups();
    renderChecklist();
  });

  if (elements.cancelEditGroupBtn) {
    elements.cancelEditGroupBtn.addEventListener('click', () => {
      resetGroupForm();
    });
  }

  function resetGroupForm() {
    elements.editGroupIdInput.value = '';
    document.getElementById('new-group-name').value = '';
    document.getElementById('new-group-color').value = '#74b9ff';
    elements.addGroupSubmitBtn.textContent = '追加';
    elements.cancelEditGroupBtn.classList.add('hidden');
  }
}

// --- 進捗状況レンダリング ---
function renderProgress() {
  const { total, checked, percent } = state.getDateProgress(state.selectedDate);
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBarFill.style.width = `${percent}%`;

  let msg = 'きょうも元気にスタートしよう！';
  if (total === 0) {
    msg = 'チェック項目がありません。設定から追加しよう！';
  } else if (percent === 100) {
    msg = '🎉 すごい！今日のチェック項目をぜんぶ達成したよ！ばっちり！';
  } else if (percent >= 50) {
    msg = '👍 あと半分！その調子でがんばろう！';
  } else if (checked > 0) {
    msg = '✨ いいね！できたものからチェックしていこう！';
  }

  elements.progressMessage.textContent = msg;
}

// --- グループフィルタータブレンダリング ---
function renderGroupFilterTabs() {
  elements.groupFilterTabs.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `tab-btn ${state.activeGroupFilter === 'all' ? 'active' : ''}`;
  allBtn.textContent = 'すべて表示';
  allBtn.addEventListener('click', () => {
    state.activeGroupFilter = 'all';
    renderGroupFilterTabs();
    renderChecklist();
  });
  elements.groupFilterTabs.appendChild(allBtn);

  state.groups.forEach(group => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${state.activeGroupFilter === group.id ? 'active' : ''}`;
    btn.textContent = group.name;
    btn.addEventListener('click', () => {
      state.activeGroupFilter = group.id;
      renderGroupFilterTabs();
      renderChecklist();
    });
    elements.groupFilterTabs.appendChild(btn);
  });
}

// --- メインチェックリストレンダリング ---
function renderChecklist() {
  elements.groupsContainer.innerHTML = '';

  let filteredGroups = state.groups;
  if (state.activeGroupFilter !== 'all') {
    filteredGroups = state.groups.filter(g => g.id === state.activeGroupFilter);
  }

  if (filteredGroups.length === 0) {
    elements.groupsContainer.innerHTML = '<div class="empty-msg">グループがありません</div>';
    return;
  }

  let totalItemsCount = 0;

  filteredGroups.forEach(group => {
    const groupItems = state.items.filter(item => item.groupId === group.id && state.isItemActiveOnDate(item, state.selectedDate));
    totalItemsCount += groupItems.length;

    if (state.activeGroupFilter === 'all' && groupItems.length === 0) {
      return; // 空のグループはすべて表示時には省略
    }

    const groupCard = document.createElement('div');
    groupCard.className = 'group-card';
    groupCard.style.borderLeftColor = group.color || '#4e54c8';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';
    groupHeader.innerHTML = `
      <div class="group-title-wrapper">
        <span class="group-title" style="color: ${group.color || '#2d3436'}">${group.name}</span>
        <span class="group-count">${groupItems.length}項目</span>
      </div>
    `;

    const itemsList = document.createElement('div');
    itemsList.className = 'items-list';

    if (groupItems.length === 0) {
      itemsList.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">このグループにはまだ項目がありません。</p>';
    } else {
      groupItems.forEach(item => {
        const isChecked = state.isItemChecked(state.selectedDate, item.id);
        const itemCard = document.createElement('div');
        itemCard.className = `item-card ${isChecked ? 'completed' : ''}`;

        const mainRow = document.createElement('div');
        mainRow.className = 'item-main-row';

        const checkbox = document.createElement('div');
        checkbox.className = 'custom-checkbox';
        checkbox.innerHTML = '<span class="check-icon">✓</span>';
        checkbox.addEventListener('click', () => {
          const nowChecked = state.toggleCheck(state.selectedDate, item.id);
          renderChecklist();
          renderProgress();
          renderCalendar();
          if (nowChecked) {
            triggerConfetti();
          }
        });

        const content = document.createElement('div');
        content.className = 'item-content';

        const titleRow = document.createElement('div');
        titleRow.className = 'item-title-row';
        titleRow.innerHTML = `<span class="item-title">${escapeHtml(item.title)}</span>`;

        if (item.duration) {
          const durationTag = document.createElement('span');
          durationTag.className = 'duration-tag';
          durationTag.innerHTML = `⏱️ ${escapeHtml(item.duration)}`;
          titleRow.appendChild(durationTag);
        }

        content.appendChild(titleRow);

        if (item.comment) {
          const commentBox = document.createElement('div');
          commentBox.className = 'item-comment-box';
          commentBox.innerHTML = `<span class="comment-label">💡やりかた:</span> ${escapeHtml(item.comment)}`;
          content.appendChild(commentBox);
        }

        mainRow.appendChild(checkbox);
        mainRow.appendChild(content);
        itemCard.appendChild(mainRow);
        itemsList.appendChild(itemCard);
      });
    }

    groupCard.appendChild(groupHeader);
    groupCard.appendChild(itemsList);
    elements.groupsContainer.appendChild(groupCard);
  });

  if (totalItemsCount === 0 && state.items.length === 0) {
    elements.groupsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; background: white; border-radius: 20px;">
        <h3>チェック項目が登録されていません</h3>
        <p style="margin: 10px 0; color: #636e72;">右上ボタン「⚙️ チェック項目をへんしゅう」から項目を追加してください。</p>
      </div>
    `;
  }
}

// --- カレンダーレンダリング ---
function renderCalendar() {
  const year = state.calYear;
  const month = state.calMonth;

  elements.calMonthYear.textContent = `${year}年 ${month + 1}月`;
  elements.calendarGrid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay(); // 0(日) - 6(土)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // 前月の日付埋め
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = dayNum;
    elements.calendarGrid.appendChild(cell);
  }

  // 当月の日付
  const todayStr = state.formatDate(new Date());

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';

    if (cellDateStr === todayStr) {
      cell.classList.add('is-today');
    }
    if (cellDateStr === state.selectedDate) {
      cell.classList.add('selected');
    }

    const dayText = document.createElement('span');
    dayText.textContent = d;
    cell.appendChild(dayText);

    // その日の達成状況計算
    const { total, checked, percent } = state.getDateProgress(cellDateStr);
    if (total > 0 && checked > 0) {
      const badge = document.createElement('span');
      badge.className = `cal-badge ${percent === 100 ? 'full' : 'partial'}`;
      badge.textContent = percent === 100 ? '★全達成' : `${checked}/${total}`;
      cell.appendChild(badge);
    }

    cell.addEventListener('click', () => {
      changeSelectedDate(cellDateStr);
    });

    elements.calendarGrid.appendChild(cell);
  }

  // 翌月の日付埋め（7の倍数になるまで）
  const totalCells = firstDay + daysInMonth;
  const nextDays = (7 - (totalCells % 7)) % 7;
  for (let j = 1; j <= nextDays; j++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = j;
    elements.calendarGrid.appendChild(cell);
  }
}

// --- 管理画面モーダル処理 ---
function openManageModal() {
  renderManageItems();
  renderManageGroups();
  elements.manageModal.classList.remove('hidden');
}

function renderManageItems() {
  elements.manageItemsList.innerHTML = '';

  if (state.items.length === 0) {
    elements.manageItemsList.innerHTML = '<p style="padding:10px; color:#636e72;">項目がありません。</p>';
    return;
  }

  state.items.forEach(item => {
    const group = state.groups.find(g => g.id === item.groupId);
    const row = document.createElement('div');
    row.className = 'manage-item-row';
    row.innerHTML = `
      <div class="manage-item-info">
        <span class="manage-item-name">${escapeHtml(item.title)}</span>
        <span class="manage-item-group">${group ? escapeHtml(group.name) : 'グループなし'} ${item.duration ? '・ ' + escapeHtml(item.duration) : ''}</span>
      </div>
      <div class="manage-item-actions">
        <button class="btn btn-sub edit-btn">編集</button>
        <button class="btn btn-sub del-btn" style="color:#ff7675;">削除</button>
      </div>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => {
      openItemModal(item);
    });

    row.querySelector('.del-btn').addEventListener('click', () => {
      if (confirm(`「${item.title}」を削除してもよろしいですか？`)) {
        state.items = state.items.filter(i => i.id !== item.id);
        state.saveItems();
        renderManageItems();
        renderChecklist();
        renderProgress();
      }
    });

    elements.manageItemsList.appendChild(row);
  });
}

function renderManageGroups() {
  elements.manageGroupsList.innerHTML = '';

  state.groups.forEach(group => {
    const row = document.createElement('div');
    row.className = 'manage-item-row';
    row.innerHTML = `
      <div class="manage-item-info" style="flex-direction:row; align-items:center; gap:8px;">
        <span style="width:16px; height:16px; border-radius:50%; background:${group.color}; display:inline-block;"></span>
        <span class="manage-item-name">${escapeHtml(group.name)}</span>
      </div>
      <div class="manage-item-actions">
        <button class="btn btn-sub edit-group-btn">編集</button>
        <button class="btn btn-sub del-btn" style="color:#ff7675;">削除</button>
      </div>
    `;

    row.querySelector('.edit-group-btn').addEventListener('click', () => {
      elements.editGroupIdInput.value = group.id;
      document.getElementById('new-group-name').value = group.name;
      document.getElementById('new-group-color').value = group.color;
      elements.addGroupSubmitBtn.textContent = '更新';
      elements.cancelEditGroupBtn.classList.remove('hidden');
    });

    row.querySelector('.del-btn').addEventListener('click', () => {
      const itemsInGroup = state.items.filter(i => i.groupId === group.id);
      if (itemsInGroup.length > 0) {
        alert('このグループにはまだ項目が含まれています。先に項目を削除または移動してください。');
        return;
      }
      if (confirm(`グループ「${group.name}」を削除しますか？`)) {
        state.groups = state.groups.filter(g => g.id !== group.id);
        state.saveGroups();
        renderManageGroups();
        renderGroupFilterTabs();
        renderChecklist();
      }
    });

    elements.manageGroupsList.appendChild(row);
  });
}

// --- アイテム追加・編集モーダル ---
function openItemModal(itemToEdit = null) {
  if (state.groups.length === 0) {
    alert('グループが一つもありません。先に「グループの作成・変更」タブでグループを作成してください。');
    return;
  }

  // グループ選択肢の更新
  elements.itemGroupSelect.innerHTML = '';
  state.groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    elements.itemGroupSelect.appendChild(opt);
  });

  if (itemToEdit) {
    elements.itemModalTitle.textContent = '項目の編集';
    elements.itemIdInput.value = itemToEdit.id;
    elements.itemTitleInput.value = itemToEdit.title;
    elements.itemGroupSelect.value = itemToEdit.groupId;
    elements.itemDurationInput.value = itemToEdit.duration || '';
    elements.itemCommentInput.value = itemToEdit.comment || '';

    const sType = itemToEdit.scheduleType || 'weekly';
    Array.from(elements.scheduleTypeRadios).forEach(r => {
      r.checked = (r.value === sType);
    });

    if (sType === 'specific_date') {
      elements.itemSpecificDateInput.value = itemToEdit.specificDate || '';
      elements.weeklyScheduleGroup.classList.add('hidden');
      elements.specificDateGroup.classList.remove('hidden');
    } else {
      const days = itemToEdit.weeklyDays || ['0', '1', '2', '3', '4', '5', '6'];
      Array.from(elements.weeklyDayCheckboxes).forEach(cb => {
        cb.checked = days.includes(cb.value);
      });
      elements.weeklyScheduleGroup.classList.remove('hidden');
      elements.specificDateGroup.classList.add('hidden');
    }
  } else {
    elements.itemModalTitle.textContent = '新しい項目の追加';
    elements.itemIdInput.value = '';
    elements.itemTitleInput.value = '';
    elements.itemDurationInput.value = '';
    elements.itemCommentInput.value = '';
    if (state.groups.length > 0) {
      elements.itemGroupSelect.value = state.groups[0].id;
    }

    Array.from(elements.scheduleTypeRadios).forEach(r => {
      r.checked = (r.value === 'weekly');
    });
    Array.from(elements.weeklyDayCheckboxes).forEach(cb => {
      cb.checked = true;
    });
    elements.itemSpecificDateInput.value = '';
    elements.weeklyScheduleGroup.classList.remove('hidden');
    elements.specificDateGroup.classList.add('hidden');
  }

  elements.itemModal.classList.remove('hidden');
}

function saveItemForm() {
  const id = elements.itemIdInput.value;
  const title = elements.itemTitleInput.value.trim();
  const groupId = elements.itemGroupSelect.value;
  const duration = elements.itemDurationInput.value.trim();
  const comment = elements.itemCommentInput.value.trim();

  if (!title || !groupId) return;

  const scheduleType = Array.from(elements.scheduleTypeRadios).find(r => r.checked).value;
  const weeklyDays = Array.from(elements.weeklyDayCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
  const specificDate = elements.itemSpecificDateInput.value;

  if (scheduleType === 'weekly' && weeklyDays.length === 0) {
    alert('表示する曜日を少なくとも1つ選択してください。');
    return;
  }
  if (scheduleType === 'specific_date' && !specificDate) {
    alert('特定の日付を選択してください。');
    return;
  }

  if (id) {
    // 編集
    const item = state.items.find(i => i.id === id);
    if (item) {
      item.title = title;
      item.groupId = groupId;
      item.duration = duration;
      item.comment = comment;
      item.scheduleType = scheduleType;
      item.weeklyDays = weeklyDays;
      item.specificDate = specificDate;
    }
  } else {
    // 新規
    const newItem = {
      id: 'item_' + Date.now(),
      groupId,
      title,
      duration,
      comment,
      scheduleType,
      weeklyDays,
      specificDate
    };
    state.items.push(newItem);
  }

  state.saveItems();
  elements.itemModal.classList.add('hidden');
  renderChecklist();
  renderProgress();
  renderManageItems();
}

// --- コンフェッティ（紙吹雪）アニメーション ---
function triggerConfetti() {
  const canvas = elements.confettiCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ff7675', '#74b9ff', '#55efc4', '#fdcb6e', '#a29bfe'];

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 14,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      if (p.alpha > 0) {
        active = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // 重力
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    if (active) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  animate();
}

// --- ユーティリティ ---
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// 起動
document.addEventListener('DOMContentLoaded', initApp);
