const TOKEN_KEY = 'todo_auth_token';
const GUEST_MODE_KEY = 'todo_guest_mode';
const GUEST_TODOS_KEY = 'todo_guest_todos_v1';
const DUE_REMINDER_ENABLED_KEY = 'todo_due_reminder_enabled';
const DUE_REMINDER_SEEN_KEY = 'todo_due_reminder_seen_v1';
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_BACKUP_ITEMS = 2000;
const DEFAULT_PROFILE_AVATAR = '/icons/icon-192.svg';
const MAX_TAG_COUNT = 8;
const MAX_TAG_LENGTH = 24;
const MAX_NOTE_LENGTH = 2000;
const BULK_ACTION_LIMIT = 200;
const PRIORITY_LABELS = {
  high: 'Yuksek',
  medium: 'Orta',
  low: 'Dusuk'
};
const RECURRENCE_LABELS = {
  none: 'Tekrarsiz',
  daily: 'Her gun',
  weekly: 'Haftalik',
  monthly: 'Aylik'
};

const state = {
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  todos: [],
  adminData: {
    summary: null,
    users: [],
    todos: [],
    logs: []
  },
  adminLoaded: false,
  adminLoading: false,
  filter: 'all',
  tagFilter: '',
  searchQuery: '',
  priorityFilter: 'all',
  dueFilter: 'all',
  bulkMode: false,
  selectedTodoIds: new Set(),
  reminderEnabled: localStorage.getItem(DUE_REMINDER_ENABLED_KEY) === '1',
  shareStatus: null,
  pendingTaskPhoto: null,
  pendingTaskAttachment: null,
  deferredPrompt: null,
  authMode: 'login',
  sessionMode: 'auth',
  currentView: 'overview',
  taskSubview: 'create',
  adminSubview: 'users'
};

const statusText = document.getElementById('status');

const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const authSwitch = document.getElementById('auth-switch');
const guestBtn = document.getElementById('guest-btn');
const nameField = document.getElementById('name-field');
const authNameInput = document.getElementById('auth-name');

// Takma Ad Alanını Dinamik Olarak Oluştur
const nicknameField = document.createElement('div');
nicknameField.id = 'nickname-field';
nicknameField.className = nameField ? nameField.className : 'auth-field';
nicknameField.hidden = true;
nicknameField.style.marginTop = '10px';

const nicknameLabel = document.createElement('label');
nicknameLabel.textContent = 'Takma Ad (İsteğe bağlı)';
nicknameLabel.style.display = 'block';
nicknameLabel.style.marginBottom = '4px';
nicknameLabel.style.fontSize = '14px';
nicknameLabel.style.color = '#333';

const authNicknameInput = document.createElement('input');
authNicknameInput.type = 'text';
authNicknameInput.id = 'auth-nickname';
authNicknameInput.placeholder = 'Takma adın';
authNicknameInput.style.width = '100%';
authNicknameInput.style.padding = '10px';
authNicknameInput.style.border = '1px solid #ddd';
authNicknameInput.style.borderRadius = '6px';

nicknameField.appendChild(nicknameLabel);
nicknameField.appendChild(authNicknameInput);

if (nameField && nameField.parentNode) {
  nameField.parentNode.insertBefore(nicknameField, nameField.nextSibling);
}

const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const userAvatar = document.getElementById('user-avatar');
const userChip = document.getElementById('user-chip');
const profilePhotoTrigger = document.getElementById('profile-photo-trigger');
const profilePhotoInput = document.getElementById('profile-photo-input');
const removeProfilePhotoBtn = document.getElementById('remove-profile-photo');
const logoutBtn = document.getElementById('logout-btn');

// Profil Düzenle Butonu (Dinamik)
const editProfileBtn = document.createElement('button');
editProfileBtn.id = 'edit-profile-btn';
editProfileBtn.className = logoutBtn ? logoutBtn.className : '';
editProfileBtn.textContent = 'Profili Düzenle';
editProfileBtn.style.marginRight = '10px';
editProfileBtn.hidden = true;
if (logoutBtn && logoutBtn.parentNode) {
  logoutBtn.parentNode.insertBefore(editProfileBtn, logoutBtn);
}

const topBackBtn = document.getElementById('top-back-btn');
const menuTabsWrap = document.getElementById('app-menu-tabs');
const menuTabs = document.querySelectorAll('.menu-tab');
const adminMenuTab = document.getElementById('admin-menu-tab');
const overviewView = document.getElementById('overview-view');
const tasksView = document.getElementById('tasks-view');
const adminView = document.getElementById('admin-view');
const adminUsersSection = document.getElementById('admin-users-section');
const adminTodosSection = document.getElementById('admin-todos-section');
const adminLogsSection = document.getElementById('admin-logs-section');
const adminSubTabs = document.querySelectorAll('.admin-subtab');
const taskCreateView = document.getElementById('task-create-view');
const taskListView = document.getElementById('task-list-view');
const taskSubTabs = document.querySelectorAll('.task-subtab');
const overviewSummary = document.getElementById('overview-summary');
const goTasksBtn = document.getElementById('go-tasks-btn');
const sharePanel = document.getElementById('share-panel');
const shareCodeText = document.getElementById('share-code-text');
const shareMembersText = document.getElementById('share-members-text');
const shareCopyBtn = document.getElementById('share-copy-btn');
const shareJoinInput = document.getElementById('share-join-input');
const shareJoinBtn = document.getElementById('share-join-btn');

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const dueDateInput = document.getElementById('todo-due-date');
const dueTimeInput = document.getElementById('todo-due-time');
const priorityInput = document.getElementById('todo-priority');
const recurrenceInput = document.getElementById('todo-recurrence');
const tagsInput = document.getElementById('todo-tags');
const noteInput = document.getElementById('todo-note');
const photoInput = document.getElementById('todo-photo');
const photoName = document.getElementById('photo-name');
const attachmentInput = document.getElementById('todo-attachment');
const attachmentName = document.getElementById('attachment-name');
const reorderHint = document.getElementById('reorder-hint');
const backupExportBtn = document.getElementById('backup-export-btn');
const backupImportInput = document.getElementById('backup-import-input');
const tagFilterSelect = document.getElementById('tag-filter-select');
const searchInput = document.getElementById('todo-search-input');
const priorityFilterSelect = document.getElementById('priority-filter-select');
const dueFilterSelect = document.getElementById('due-filter-select');
const reminderBtn = document.getElementById('reminder-btn');
const bulkModeBtn = document.getElementById('bulk-mode-btn');
const bulkControls = document.getElementById('bulk-controls');
const bulkSelectAllBtn = document.getElementById('bulk-select-all-btn');
const bulkCompleteBtn = document.getElementById('bulk-complete-btn');
const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
const bulkCancelBtn = document.getElementById('bulk-cancel-btn');
const bulkCount = document.getElementById('bulk-count');
const list = document.getElementById('todo-list');
const summary = document.getElementById('summary');

if (bulkModeBtn) {
  bulkModeBtn.style.display = 'none';
}

const installBtn = document.getElementById('install-btn');
const clearDoneBtn = document.getElementById('clear-done');
const photoPreviewModal = document.getElementById('photo-preview-modal');
const photoPreviewImage = document.getElementById('photo-preview-image');
const photoPreviewClose = document.getElementById('photo-preview-close');
const adminRefreshBtn = document.getElementById('admin-refresh-btn');
const adminStatUsers = document.getElementById('admin-stat-users');
const adminStatTodos = document.getElementById('admin-stat-todos');
const adminStatActive = document.getElementById('admin-stat-active');
const adminStatDone = document.getElementById('admin-stat-done');
const adminUsersBody = document.getElementById('admin-users-body');
const adminTodosBody = document.getElementById('admin-todos-body');
const adminLogsBody = document.getElementById('admin-logs-body');

// --- MENÜ AYIRMA İŞLEMİ BAŞLANGIÇ ---
// Mevcut "Görevler" sekmesini bul
const tasksTab = document.querySelector('.menu-tab[data-view="tasks"]');
let createTab = null;

if (tasksTab && tasksTab.parentNode) {
  // Yeni "Yeni Görev" sekmesini oluştur
  createTab = tasksTab.cloneNode(true);
  createTab.textContent = 'Yeni Görev';
  createTab.dataset.view = 'task-create'; // Özel bir ID veriyoruz
  createTab.classList.remove('is-active');

  // Yeni sekmeyi "Görevler"den önce ekle
  tasksTab.parentNode.insertBefore(createTab, tasksTab);

  // "Görevler" sekmesini gizle, çünkü ana ekranda zaten buton var
  tasksTab.style.display = 'none';

  // Yeni sekmenin tıklama olayını ayarla
  createTab.addEventListener('click', () => {
    openTasksScreen('create');
  });

  // Eski iç sekmeleri (Yeni/Liste butonlarını) gizle
  if (taskSubTabs.length > 0 && taskSubTabs[0].parentElement) {
    taskSubTabs[0].parentElement.style.display = 'none';
  }
}
// --- MENÜ AYIRMA İŞLEMİ BİTİŞ ---

// --- BULK ACTIONS DROPDOWN REFACTOR ---
const bulkActionsTrigger = document.createElement('button');
bulkActionsTrigger.id = 'bulk-actions-trigger';
bulkActionsTrigger.innerHTML = 'İşlemler &#9662;'; // Down arrow
if (bulkCancelBtn) {
  bulkActionsTrigger.className = bulkCancelBtn.className;
}
bulkActionsTrigger.style.marginLeft = 'auto';

const bulkActionsDropdown = document.createElement('div');
bulkActionsDropdown.id = 'bulk-actions-dropdown';
bulkActionsDropdown.hidden = true;

if (bulkControls && bulkSelectAllBtn && bulkCompleteBtn && bulkDeleteBtn && bulkCancelBtn) {
  // Butonları yeni açılır menüye taşı
  bulkActionsDropdown.append(bulkSelectAllBtn, bulkCompleteBtn, bulkDeleteBtn, bulkCancelBtn);

  // Yeni menü elemanlarını ana kontrol barına ekle
  bulkControls.append(bulkActionsTrigger, bulkActionsDropdown);

  bulkActionsTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    bulkActionsDropdown.hidden = !bulkActionsDropdown.hidden;
  });

  document.addEventListener('click', () => {
    if (!bulkActionsDropdown.hidden) {
      bulkActionsDropdown.hidden = true;
    }
  });
}
// --- END REFACTOR ---

const dragState = {
  sourceItem: null,
  moved: false
};

const touchDragState = {
  sourceItem: null,
  moved: false
};

let isPersistingOrder = false;
let reminderIntervalId = null;

// Grafik stillerini ekle
const style = document.createElement('style');
style.textContent = `
  .stats-container {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .stats-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
  }
  .chart-wrap {
    display: flex;
    align-items: flex-end;
    height: 120px;
    gap: 8px;
  }
  .chart-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .chart-bar-bg {
    width: 100%;
    height: 100%;
    background: #f0f0f0;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }
  .chart-bar-fill {
    width: 100%;
    background: #4caf50;
    transition: height 0.3s ease;
    min-height: 0;
  }
  .chart-label {
    font-size: 10px;
    color: #666;
    text-align: center;
  }
  .chart-val {
    font-size: 10px;
    font-weight: bold;
    color: #333;
  }
  .admin-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }
  .admin-modal {
    background: white;
    padding: 24px;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
  }
  .admin-modal h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 12px;
  }
  .admin-modal-info {
    font-size: 14px;
    color: #555;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .admin-modal-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }
  .admin-modal-btn {
    padding: 10px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    background: #f5f5f5;
    color: #333;
    text-align: left;
    transition: background 0.2s;
  }
  .admin-modal-btn:hover {
    background: #e0e0e0;
  }
  .admin-modal-btn.primary {
    background: #e3f2fd;
    color: #1565c0;
  }
  .admin-modal-btn.primary:hover {
    background: #bbdefb;
  }
  .admin-modal-btn.danger {
    background: #ffebee;
    color: #c62828;
  }
  .admin-modal-btn.danger:hover {
    background: #ffcdd2;
  }
  .admin-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    color: #999;
    cursor: pointer;
  }
  .photo-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .photo-popup {
    background: white;
    border-radius: 12px;
    width: 220px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: popIn 0.2s ease-out;
  }
  @keyframes popIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .photo-popup-btn {
    padding: 14px 16px;
    border: none;
    background: white;
    color: #333;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    transition: background 0.2s;
  }
  .photo-popup-btn:last-child {
    border-bottom: none;
    color: #d32f2f;
  }
  .photo-popup-btn:hover {
    background: #f9f9f9;
  }
  .photo-popup-btn.primary {
    color: #2196f3;
    font-weight: 500;
  }
  .todo-photo-icon {
    font-size: 15px;
    margin-right: 8px;
    cursor: pointer;
    vertical-align: middle;
  }
  /* BULK ACTIONS DROPDOWN STYLES */
  .bulk-controls {
    position: relative; /* For dropdown positioning */
  }
  #bulk-actions-trigger {
    margin-left: auto; /* Pushes it to the right */
    padding: 6px 12px;
    font-size: 13px;
  }
  #bulk-actions-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 100;
    padding: 5px;
    min-width: 180px;
  }
  #bulk-actions-dropdown > button {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 9px 12px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 14px;
    color: #333;
  }
  #bulk-actions-dropdown > button:hover { background: #f5f5f5; }
  #bulk-actions-dropdown > button:disabled { color: #b0b0b0; cursor: not-allowed; background: none; }

  /* Tamamlanan gorevler icin stil */
  .todo-item.is-completed {
    opacity: 0.75;
  }
  .todo-item.is-completed .todo-text {
    text-decoration: none !important; /* Uzeri cizili olmasin */
    color: #666;
  }

  /* Paylasim kodundaki cizgiyi duzelt */
  #share-code-text {
    text-decoration: none;
  }
`;
document.head.appendChild(style);

function setStatus(message = '', type = '') {
  statusText.textContent = message;
  statusText.classList.remove('error', 'success');
  if (type) {
    statusText.classList.add(type);
  }
}

function saveToken(token) {
  state.token = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

function setSessionMode(mode) {
  state.sessionMode = mode;
  if (mode === 'guest') {
    localStorage.setItem(GUEST_MODE_KEY, '1');
    return;
  }
  localStorage.removeItem(GUEST_MODE_KEY);
}

function isAdminSession() {
  return state.sessionMode === 'auth' && Boolean(state.user?.is_admin);
}

function normalizePriority(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'medium';
}

function normalizeRecurrence(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'daily' || normalized === 'weekly' || normalized === 'monthly') {
    return normalized;
  }
  return 'none';
}

function normalizeDueDate(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const dateText = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return null;
  }

  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateText) {
    return null;
  }

  return dateText;
}

function normalizeDueTime(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const timeText = value.trim();
  if (!timeText) {
    return null;
  }
  if (!/^\d{2}:\d{2}$/.test(timeText)) {
    return null;
  }
  const [hourText, minuteText] = timeText.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeNoteText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const noteText = value.trim();
  if (!noteText) {
    return null;
  }
  return noteText.slice(0, MAX_NOTE_LENGTH);
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags = [];
  const seen = new Set();

  value.forEach((entry) => {
    const tag = String(entry || '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!tag || tag.length > MAX_TAG_LENGTH) {
      return;
    }

    const key = tag.toLowerCase();
    if (seen.has(key) || tags.length >= MAX_TAG_COUNT) {
      return;
    }

    seen.add(key);
    tags.push(tag);
  });

  return tags;
}

function parseTagInputValue(rawValue) {
  const parts = String(rawValue || '').split(',');
  const tags = [];
  const seen = new Set();

  for (const part of parts) {
    const tag = part.trim().replace(/\s+/g, ' ');
    if (!tag) {
      continue;
    }
    if (tag.length > MAX_TAG_LENGTH) {
      return {
        ok: false,
        error: `Etiketler en fazla ${MAX_TAG_LENGTH} karakter olabilir.`
      };
    }

    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(tag);

    if (tags.length > MAX_TAG_COUNT) {
      return {
        ok: false,
        error: `En fazla ${MAX_TAG_COUNT} etiket girebilirsin.`
      };
    }
  }

  return { ok: true, value: tags };
}

function normalizeTodo(todo) {
  return {
    id: todo.id,
    text: String(todo.text || ''),
    completed: Boolean(todo.completed),
    completed_at: todo.completed_at || null,
    image_url: typeof todo.image_url === 'string' ? todo.image_url : null,
    attachment_url: typeof todo.attachment_url === 'string' ? todo.attachment_url : null,
    attachment_name: typeof todo.attachment_name === 'string' ? todo.attachment_name : null,
    attachment_mime: typeof todo.attachment_mime === 'string' ? todo.attachment_mime : null,
    note: normalizeNoteText(typeof todo.note === 'string' ? todo.note : todo.note_text),
    due_date: normalizeDueDate(todo.due_date),
    due_time: normalizeDueTime(todo.due_time),
    priority: normalizePriority(todo.priority),
    tags: normalizeTags(todo.tags),
    recurrence: normalizeRecurrence(todo.recurrence),
    sort_order: Number.isFinite(Number(todo.sort_order)) ? Number(todo.sort_order) : 0,
    created_at: String(todo.created_at || new Date().toISOString())
  };
}

function formatDueDate(dateText) {
  const normalized = normalizeDueDate(dateText);
  if (!normalized) {
    return '';
  }
  const date = new Date(`${normalized}T00:00:00`);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatDueDateTime(dateText, timeText) {
  const datePart = formatDueDate(dateText);
  const normalizedTime = normalizeDueTime(timeText);
  if (datePart && normalizedTime) {
    return `${datePart} ${normalizedTime}`;
  }
  return datePart || normalizedTime || '';
}

function getTodayDateText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isTodoOverdue(todo) {
  return Boolean(todo.due_date && !todo.completed && todo.due_date < getTodayDateText());
}

function computeNextDueDate(dateText, recurrence) {
  const dueDate = normalizeDueDate(dateText);
  const rule = normalizeRecurrence(recurrence);
  if (!dueDate || rule === 'none') {
    return null;
  }

  const base = new Date(`${dueDate}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return null;
  }

  if (rule === 'daily') {
    base.setUTCDate(base.getUTCDate() + 1);
    return base.toISOString().slice(0, 10);
  }

  if (rule === 'weekly') {
    base.setUTCDate(base.getUTCDate() + 7);
    return base.toISOString().slice(0, 10);
  }

  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();
  const target = new Date(Date.UTC(year, month + 2, 0));
  const lastDayOfNextMonth = target.getUTCDate();
  const clampedDay = Math.min(day, lastDayOfNextMonth);
  return new Date(Date.UTC(year, month + 1, clampedDay)).toISOString().slice(0, 10);
}

function setGuestTodoCompletion(todoId, completed) {
  const current = state.todos.find((entry) => String(entry.id) === String(todoId));
  if (!current) {
    return false;
  }

  const wasCompleted = Boolean(current.completed);
  current.completed = Boolean(completed);

  if (!wasCompleted && current.completed && current.recurrence !== 'none') {
    state.todos.unshift(
      normalizeTodo({
        id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: current.text,
        completed: false,
        completed_at: null,
        image_url: null,
        attachment_url: null,
        attachment_name: null,
        attachment_mime: null,
        note: current.note,
        due_date: computeNextDueDate(current.due_date, current.recurrence),
        due_time: current.due_time,
        priority: current.priority,
        tags: current.tags,
        recurrence: current.recurrence,
        sort_order: Number(current.sort_order || 0) + 1,
        created_at: new Date().toISOString()
      })
    );
  }

  if (current.completed && !current.completed_at) {
    current.completed_at = new Date().toISOString();
  } else if (!current.completed) {
    current.completed_at = null;
  }

  return true;
}

function resetTodoFormFields() {
  input.value = '';
  dueDateInput.value = '';
  if (dueTimeInput) {
    dueTimeInput.value = '';
  }
  recurrenceInput.value = 'none';
  tagsInput.value = '';
  if (noteInput) {
    noteInput.value = '';
  }
  priorityInput.value = 'medium';
  clearPhotoSelection();
  clearAttachmentSelection();
}

function readGuestTodos() {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_TODOS_KEY) || '[]');
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.map((todo) => normalizeTodo({ ...todo, id: String(todo.id) }));
  } catch (_error) {
    return [];
  }
}

function saveGuestTodos() {
  localStorage.setItem(GUEST_TODOS_KEY, JSON.stringify(state.todos));
}

function clearPhotoSelection() {
  photoInput.value = '';
  state.pendingTaskPhoto = null;
  photoName.textContent = 'Fotograf secilmedi';
}

function clearAttachmentSelection() {
  state.pendingTaskAttachment = null;
  if (attachmentInput) {
    attachmentInput.value = '';
  }
  if (attachmentName) {
    attachmentName.textContent = 'Dosya secilmedi';
  }
}

function clearProfilePhotoInput() {
  profilePhotoInput.value = '';
}

function resetAdminPanelState() {
  state.adminData = { summary: null, users: [], todos: [], logs: [] };
  state.adminLoaded = false;
  state.adminLoading = false;
  setAdminSubview('users');
  renderAdminPanel();
}

function openPhotoPreview(url, altText) {
  photoPreviewImage.src = url;
  photoPreviewImage.alt = altText || 'Fotograf onizleme';
  photoPreviewModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closePhotoPreview() {
  if (photoPreviewModal.hidden) {
    return;
  }

  photoPreviewModal.hidden = true;
  photoPreviewImage.src = '';
  photoPreviewImage.alt = 'Fotograf onizleme';
  document.body.classList.remove('modal-open');
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll('.filter').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.filter === state.filter);
  });
  updateReorderHint();
}

function setTagFilter(value) {
  state.tagFilter = String(value || '')
    .trim()
    .toLowerCase();
  updateReorderHint();
}

function setSearchQuery(value) {
  state.searchQuery = String(value || '')
    .trim()
    .toLowerCase();
  updateReorderHint();
}

function setPriorityFilter(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  state.priorityFilter = normalized === 'high' || normalized === 'medium' || normalized === 'low' ? normalized : 'all';
  updateReorderHint();
}

function setDueFilter(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'overdue' || normalized === 'today' || normalized === 'week' || normalized === 'none') {
    state.dueFilter = normalized;
  } else {
    state.dueFilter = 'all';
  }
  updateReorderHint();
}

function getAvailableTagOptions() {
  const optionsByKey = new Map();

  state.todos.forEach((todo) => {
    if (!Array.isArray(todo.tags)) {
      return;
    }
    todo.tags.forEach((tag) => {
      const cleanTag = String(tag || '').trim();
      if (!cleanTag) {
        return;
      }
      const key = cleanTag.toLowerCase();
      if (!optionsByKey.has(key)) {
        optionsByKey.set(key, cleanTag);
      }
    });
  });

  return Array.from(optionsByKey.entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
    .map(([key, label]) => ({ key, label }));
}

function renderTagFilterOptions() {
  if (!tagFilterSelect) {
    return;
  }

  const options = getAvailableTagOptions();
  const selectedKey = state.tagFilter;
  const selectedExists = !selectedKey || options.some((option) => option.key === selectedKey);

  tagFilterSelect.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'Tum etiketler';
  tagFilterSelect.appendChild(allOption);

  options.forEach((option) => {
    const item = document.createElement('option');
    item.value = option.key;
    item.textContent = option.label;
    tagFilterSelect.appendChild(item);
  });

  if (!selectedExists) {
    state.tagFilter = '';
  }
  tagFilterSelect.value = state.tagFilter;
}

function resetShareState() {
  state.shareStatus = null;
  renderShareStatus();
}

function renderShareStatus() {
  if (!sharePanel || !shareCodeText || !shareMembersText) {
    return;
  }

  if (state.sessionMode !== 'auth' || !state.user) {
    sharePanel.hidden = true;
    shareCodeText.textContent = 'Liste kodu: -';
    shareMembersText.textContent = '0 uye';
    return;
  }

  sharePanel.hidden = false;
  const shareCode = state.shareStatus?.share_code || state.user.share_code || '-';
  shareCodeText.textContent = `Liste kodu: ${shareCode}`;

  const members = Array.isArray(state.shareStatus?.members) ? state.shareStatus.members : [];
  const memberNames = members
    .slice(0, 4)
    .map((member) => member.name)
    .filter(Boolean);
  const memberCount = members.length;
  if (memberCount === 0) {
    shareMembersText.textContent = 'Uye bilgisi yuklenmedi.';
    return;
  }

  const namesText = memberNames.join(', ');
  const extraCount = Math.max(memberCount - memberNames.length, 0);
  shareMembersText.textContent = extraCount > 0 ? `${memberCount} uye: ${namesText} +${extraCount}` : `${memberCount} uye: ${namesText}`;
}

async function loadShareStatus() {
  if (state.sessionMode !== 'auth' || !state.user) {
    resetShareState();
    return;
  }

  try {
    const status = await request('/api/share/status', { auth: true });
    state.shareStatus = status;
    if (state.user) {
      state.user.share_group_id = status.group_id || null;
      state.user.share_code = status.share_code || null;
      state.user.share_owner_user_id = status.owner_user_id || null;
    }
    renderShareStatus();
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message || 'Paylasim bilgisi alinamadi.', 'error');
    renderShareStatus();
  }
}

async function copyCurrentShareCode() {
  const code = String(state.shareStatus?.share_code || state.user?.share_code || '').trim();
  if (!code) {
    setStatus('Kopyalanacak paylasim kodu yok.', 'error');
    return;
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const hiddenInput = document.createElement('input');
      hiddenInput.value = code;
      document.body.appendChild(hiddenInput);
      hiddenInput.select();
      document.execCommand('copy');
      hiddenInput.remove();
    }
    setStatus('Paylasim kodu kopyalandi.', 'success');
  } catch (_error) {
    setStatus('Kod kopyalanamadi.', 'error');
  }
}

async function joinSharedList() {
  if (state.sessionMode !== 'auth' || !state.user) {
    setStatus('Paylasimli liste icin giris yap.', 'error');
    return;
  }

  const rawCode = String(shareJoinInput?.value || '').trim();
  if (!rawCode) {
    setStatus('Paylasim kodu gir.', 'error');
    return;
  }

  try {
    const result = await request('/api/share/join', {
      method: 'POST',
      body: JSON.stringify({ code: rawCode }),
      auth: true
    });

    state.shareStatus = result;
    if (state.user) {
      state.user.share_group_id = result.group_id || null;
      state.user.share_code = result.share_code || null;
      state.user.share_owner_user_id = result.owner_user_id || null;
    }
    if (shareJoinInput) {
      shareJoinInput.value = '';
    }
    setBulkMode(false);
    await loadTodos();
    renderShareStatus();
    setStatus(result.joined ? 'Paylasimli listeye katildin.' : 'Zaten bu listedesin.', 'success');
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message || 'Listeye katilinamadi.', 'error');
  }
}

function resetTaskListControls() {
  setFilter('all');
  setTagFilter('');
  setSearchQuery('');
  setPriorityFilter('all');
  setDueFilter('all');
  setBulkMode(false);

  if (searchInput) {
    searchInput.value = '';
  }
  if (tagFilterSelect) {
    tagFilterSelect.value = '';
  }
  if (priorityFilterSelect) {
    priorityFilterSelect.value = 'all';
  }
  if (dueFilterSelect) {
    dueFilterSelect.value = 'all';
  }
}

function addDaysToDateText(dateText, days) {
  const normalized = normalizeDueDate(dateText);
  if (!normalized) {
    return null;
  }

  const base = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function matchesDueFilter(todo) {
  if (state.dueFilter === 'all') {
    return true;
  }

  const dueDate = normalizeDueDate(todo.due_date);
  const today = getTodayDateText();

  if (state.dueFilter === 'none') {
    return !dueDate;
  }

  if (!dueDate) {
    return false;
  }

  if (state.dueFilter === 'overdue') {
    return !todo.completed && dueDate < today;
  }
  if (state.dueFilter === 'today') {
    return dueDate === today;
  }
  if (state.dueFilter === 'week') {
    const limit = addDaysToDateText(today, 7);
    return Boolean(limit && dueDate >= today && dueDate <= limit);
  }
  return true;
}

function getSelectedTodoIds() {
  return Array.from(state.selectedTodoIds);
}

function pruneSelectedTodoIds() {
  const todoIdSet = new Set(state.todos.map((todo) => String(todo.id)));
  state.selectedTodoIds.forEach((id) => {
    if (!todoIdSet.has(String(id))) {
      state.selectedTodoIds.delete(String(id));
    }
  });
}

function updateBulkControls() {
  if (!bulkModeBtn || !bulkControls || !bulkCount) {
    return;
  }

  pruneSelectedTodoIds();
  const selectedCount = state.selectedTodoIds.size;
  const visibleTodos = getVisibleTodos();

  bulkModeBtn.textContent = state.bulkMode ? 'Secim acik' : 'Coklu secim';
  bulkModeBtn.classList.toggle('is-active', state.bulkMode);
  bulkControls.hidden = !state.bulkMode;
  bulkCount.textContent = `${selectedCount} secili`;

  const visibleCount = visibleTodos.length;
  const visibleSelectedCount = visibleTodos.reduce((count, todo) => {
    return count + (state.selectedTodoIds.has(String(todo.id)) ? 1 : 0);
  }, 0);

  if (bulkSelectAllBtn) {
    bulkSelectAllBtn.disabled = visibleCount === 0;
    bulkSelectAllBtn.textContent = visibleSelectedCount === visibleCount && visibleCount > 0 ? 'Secimi kaldir' : 'Gorunenleri sec';
  }
  if (bulkCompleteBtn) {
    bulkCompleteBtn.disabled = selectedCount === 0;
  }
  if (bulkDeleteBtn) {
    bulkDeleteBtn.disabled = selectedCount === 0;
  }
}

function setBulkMode(enabled) {
  state.bulkMode = Boolean(enabled);
  if (!state.bulkMode) {
    state.selectedTodoIds.clear();
  }
  updateBulkControls();
  updateReorderHint();
}

function toggleTodoSelection(todoId, selected) {
  const key = String(todoId);
  if (selected) {
    state.selectedTodoIds.add(key);
  } else {
    state.selectedTodoIds.delete(key);
  }
  updateBulkControls();
}

function toggleSelectVisibleTodos() {
  const visibleTodos = getVisibleTodos();
  if (visibleTodos.length === 0) {
    return;
  }

  const allSelected = visibleTodos.every((todo) => state.selectedTodoIds.has(String(todo.id)));
  if (allSelected) {
    visibleTodos.forEach((todo) => state.selectedTodoIds.delete(String(todo.id)));
  } else {
    visibleTodos.forEach((todo) => state.selectedTodoIds.add(String(todo.id)));
  }
  updateBulkControls();
  renderTodos();
}

function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function updateReminderButton() {
  if (!reminderBtn) {
    return;
  }

  if (!isNotificationSupported()) {
    reminderBtn.textContent = 'Bildirim yok';
    reminderBtn.disabled = true;
    return;
  }

  reminderBtn.disabled = false;
  if (Notification.permission === 'denied') {
    reminderBtn.textContent = 'Bildirim engelli';
    return;
  }

  if (Notification.permission !== 'granted') {
    reminderBtn.textContent = 'Hatirlatma ac';
    return;
  }

  reminderBtn.textContent = state.reminderEnabled ? 'Hatirlatma acik' : 'Hatirlatma kapali';
}

function setReminderEnabled(enabled) {
  state.reminderEnabled = Boolean(enabled);
  if (state.reminderEnabled) {
    localStorage.setItem(DUE_REMINDER_ENABLED_KEY, '1');
  } else {
    localStorage.removeItem(DUE_REMINDER_ENABLED_KEY);
  }
  updateReminderButton();
}

function readReminderSeenMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(DUE_REMINDER_SEEN_KEY) || '{}');
    if (!raw || typeof raw !== 'object') {
      return {};
    }
    return raw;
  } catch (_error) {
    return {};
  }
}

function saveReminderSeenMap(mapValue) {
  localStorage.setItem(DUE_REMINDER_SEEN_KEY, JSON.stringify(mapValue));
}

function startReminderLoop() {
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }

  if (!state.reminderEnabled || !isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  reminderIntervalId = window.setInterval(() => {
    runDueReminders();
  }, 60 * 1000);
}

function runDueReminders(force = false) {
  if (!state.reminderEnabled || !isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const today = getTodayDateText();
  const seenMap = readReminderSeenMap();
  const dueTodos = state.todos.filter((todo) => !todo.completed && todo.due_date && todo.due_date <= today);

  let changed = false;
  dueTodos.slice(0, 3).forEach((todo) => {
    const key = `${todo.id}:${todo.due_date}`;
    if (!force && seenMap[key] === today) {
      return;
    }

    const overdue = todo.due_date < today;
    const body = overdue
      ? `${todo.text} gorevi gecikti.`
      : `${todo.text} gorevinin son tarihi bugun.`;

    // Browser bildirimleri sadece uygulama acikken tetiklenir.
    // eslint-disable-next-line no-new
    new Notification('Yapilacak Hatirlatmasi', {
      body,
      tag: `todo-reminder-${key}`,
      renotify: false
    });
    seenMap[key] = today;
    changed = true;
  });

  if (changed) {
    saveReminderSeenMap(seenMap);
  }
}

function setAppView(view) {
  const safeView = view === 'tasks' || view === 'admin' ? view : 'overview';
  state.currentView = safeView;
  overviewView.hidden = safeView !== 'overview';
  tasksView.hidden = safeView !== 'tasks';
  adminView.hidden = safeView !== 'admin';
  updateMenuHighlight();
}

function setTaskSubview(view) {
  const safeView = view === 'list' ? 'list' : 'create';
  state.taskSubview = safeView;
  taskCreateView.hidden = safeView !== 'create';
  taskListView.hidden = safeView !== 'list';
  updateMenuHighlight();
}

function updateMenuHighlight() {
  menuTabs.forEach((tab) => {
    if (tab.dataset.view === 'tasks') {
      // "Görevler" sekmesi sadece görevler ekranındaysak VE liste modundaysak aktif olsun
      tab.classList.toggle('is-active', state.currentView === 'tasks' && state.taskSubview === 'list');
    } else {
      tab.classList.toggle('is-active', tab.dataset.view === state.currentView);
    }
  });
  if (createTab) {
    createTab.classList.toggle('is-active', state.currentView === 'tasks' && state.taskSubview === 'create');
  }
}

function setAdminSubview(view) {
  const safeView = view === 'todos' || view === 'logs' ? view : 'users';
  state.adminSubview = safeView;
  adminUsersSection.hidden = safeView !== 'users';
  adminTodosSection.hidden = safeView !== 'todos';
  adminLogsSection.hidden = safeView !== 'logs';
  adminSubTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.adminSubview === safeView);
  });
}

function getTaskSubviewFromPath(pathname) {
  if (pathname === '/tasks/new') {
    return 'create';
  }
  if (pathname === '/tasks/list' || pathname === '/tasks') {
    return 'list';
  }
  return null;
}

function getMainViewFromPath(pathname) {
  if (pathname === '/admin') {
    return 'admin';
  }
  if (getTaskSubviewFromPath(pathname)) {
    return 'tasks';
  }
  return 'overview';
}

function buildTaskPath(subview) {
  return subview === 'create' ? '/tasks/new' : '/tasks/list';
}

function updateAdminMenuVisibility() {
  adminMenuTab.hidden = !isAdminSession();
}

function updateRoute(pathname, replace = false) {
  if (window.location.pathname === pathname) {
    return;
  }

  if (replace) {
    window.history.replaceState({}, '', pathname);
    return;
  }

  window.history.pushState({}, '', pathname);
}

function syncScreenRoute() {
  const pathname = window.location.pathname;
  const mainView = getMainViewFromPath(pathname);
  const taskSubview = getTaskSubviewFromPath(pathname);
  const isTasksScreen = mainView === 'tasks';
  const isAdminScreen = mainView === 'admin';

  if (isAdminScreen && !isAdminSession()) {
    openOverviewScreen(true);
    return;
  }

  if (isTasksScreen) {
    setAppView('tasks');
    setTaskSubview(taskSubview || 'list');
  } else if (isAdminScreen) {
    setAppView('admin');
    setAdminSubview(state.adminSubview);
    loadAdminData();
  } else {
    setAppView('overview');
  }

  menuTabsWrap.hidden = isTasksScreen;
  topBackBtn.hidden = !isTasksScreen;
  document.body.classList.toggle('tasks-screen-open', isTasksScreen && !appSection.hidden);
}

function openTasksScreen(subview = 'list', replace = false) {
  updateRoute(buildTaskPath(subview), replace);
  syncScreenRoute();
}

function openAdminScreen(replace = false) {
  updateRoute('/admin', replace);
  syncScreenRoute();
}

function openOverviewScreen(replace = false) {
  updateRoute('/', replace);
  syncScreenRoute();
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;

  if (options.body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method: options.method || 'GET',
      body: options.body,
      headers
    });
  } catch (_error) {
    throw new Error('Sunucuya baglanilamadi. Uygulama adresini ve sunucunun acik oldugunu kontrol et.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || 'Bir hata olustu.');
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function setAuthMode(mode) {
  state.authMode = mode;

  if (mode === 'register') {
    authTitle.textContent = 'Kayit Ol';
    authSubmit.textContent = 'Kayit Ol';
    authSwitch.textContent = 'Hesabin var mi? Giris yap';
    nameField.hidden = false;
    nicknameField.hidden = false;
    authNameInput.required = true;
    authPasswordInput.setAttribute('autocomplete', 'new-password');
  } else {
    authTitle.textContent = 'Giris Yap';
    authSubmit.textContent = 'Giris Yap';
    authSwitch.textContent = 'Hesabin yok mu? Kayit ol';
    nameField.hidden = true;
    nicknameField.hidden = true;
    authNameInput.required = false;
    authPasswordInput.setAttribute('autocomplete', 'current-password');
  }
}

function showAuth() {
  authSection.hidden = false;
  appSection.hidden = true;
  document.body.classList.remove('tasks-screen-open');
  closePhotoPreview();
  resetShareState();
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
  authEmailInput.focus();
}

function showApp() {
  authSection.hidden = true;
  appSection.hidden = false;
  updateAdminMenuVisibility();
  updateReminderButton();
  startReminderLoop();
  updateBulkControls();
  syncScreenRoute();

  if (state.sessionMode === 'guest') {
    userChip.textContent = 'Misafir modu (bu cihazda kayitli)';
    userAvatar.src = DEFAULT_PROFILE_AVATAR;
    userAvatar.alt = 'Misafir profili';
    userAvatar.style.cursor = 'default';
    userAvatar.title = '';
    profilePhotoTrigger.hidden = true;
    removeProfilePhotoBtn.hidden = true;
    editProfileBtn.hidden = true;
    logoutBtn.textContent = 'Misafirden cikis';
  } else {
    const displayName = state.user.nickname || state.user.name;
    userChip.textContent = `${displayName} (${state.user.email})`;
    userAvatar.src = state.user.profile_image_url || DEFAULT_PROFILE_AVATAR;
    userAvatar.alt = `${displayName} profil fotografi`;
    userAvatar.style.cursor = 'pointer';
    userAvatar.title = 'Profil fotoğrafını değiştirmek için tıkla';
    profilePhotoTrigger.hidden = true;
    removeProfilePhotoBtn.hidden = true;
    editProfileBtn.hidden = false;
    logoutBtn.textContent = 'Cikis';
  }

  installBtn.hidden = state.deferredPrompt === null;
  renderShareStatus();
}

function handleUnauthorized() {
  saveToken(null);
  state.user = null;
  state.todos = [];
  resetAdminPanelState();
  resetTaskListControls();
  setSessionMode('auth');
  renderTodos();
  showAuth();
  setStatus('Oturum suresi dolmus. Tekrar giris yap.', 'error');
}

function getVisibleTodos() {
  let todos = state.todos;

  if (state.filter === 'active') {
    todos = todos.filter((todo) => !todo.completed);
  } else if (state.filter === 'done') {
    todos = todos.filter((todo) => todo.completed);
  }

  if (state.tagFilter) {
    todos = todos.filter((todo) =>
      Array.isArray(todo.tags) && todo.tags.some((tag) => String(tag || '').toLowerCase() === state.tagFilter)
    );
  }

  if (state.priorityFilter !== 'all') {
    todos = todos.filter((todo) => normalizePriority(todo.priority) === state.priorityFilter);
  }

  todos = todos.filter((todo) => matchesDueFilter(todo));

  if (state.searchQuery) {
    todos = todos.filter((todo) => {
      const text = String(todo.text || '').toLowerCase();
      if (text.includes(state.searchQuery)) {
        return true;
      }
      const noteText = String(todo.note || '').toLowerCase();
      if (noteText.includes(state.searchQuery)) {
        return true;
      }
      return Array.isArray(todo.tags)
        ? todo.tags.some((tag) => String(tag || '').toLowerCase().includes(state.searchQuery))
        : false;
    });
  }

  // If no filter is active, `todos` is still a reference to `state.todos`.
  // We need to create a copy before sorting to not mutate state.
  const result = todos === state.todos ? [...todos] : todos;

  // "All" view'da tamamlananlari sona at
  if (state.filter === 'all') {
    result.sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return 0; // Ayni durumdaki gorevlerin sirasini koru
    });
  }

  return result;
}

function isReorderEnabled() {
  return (
    state.filter === 'all' &&
    !state.tagFilter &&
    !state.searchQuery &&
    state.priorityFilter === 'all' &&
    state.dueFilter === 'all' &&
    !state.bulkMode &&
    state.todos.length > 1
  );
}

function updateReorderHint() {
  if (!reorderHint) {
    return;
  }

  if (isReorderEnabled()) {
    reorderHint.textContent = 'Gorevleri tutup surukleyerek siralayabilirsin.';
    reorderHint.classList.remove('is-disabled');
    return;
  }

  if (state.bulkMode) {
    reorderHint.textContent = 'Coklu secimde siralama kapali.';
  } else if (state.filter !== 'all') {
    reorderHint.textContent = 'Siralama icin Tum filtresine gec.';
  } else if (state.tagFilter) {
    reorderHint.textContent = 'Siralama icin etiket filtresini temizle.';
  } else if (state.searchQuery || state.priorityFilter !== 'all' || state.dueFilter !== 'all') {
    reorderHint.textContent = 'Siralama icin arama ve gelismis filtreleri temizle.';
  } else {
    reorderHint.textContent = 'Siralamak icin en az 2 gorev gerekli.';
  }
  reorderHint.classList.add('is-disabled');
}

function getCurrentOrderIds() {
  return state.todos.map((todo) => String(todo.id));
}

function getDomOrderIds() {
  return Array.from(list.querySelectorAll('.todo-item[data-todo-id]')).map((item) => item.dataset.todoId);
}

function applyTodoOrder(orderIds) {
  const byId = new Map(state.todos.map((todo) => [String(todo.id), todo]));
  const nextTodos = [];

  orderIds.forEach((id) => {
    const todo = byId.get(String(id));
    if (todo) {
      nextTodos.push(todo);
      byId.delete(String(id));
    }
  });

  byId.forEach((todo) => nextTodos.push(todo));
  state.todos = nextTodos;
}

async function persistTodoOrder() {
  if (!isReorderEnabled() || isPersistingOrder) {
    return;
  }

  const orderIds = getDomOrderIds();
  if (orderIds.length !== state.todos.length) {
    return;
  }

  const currentOrder = getCurrentOrderIds();
  if (orderIds.every((id, index) => id === currentOrder[index])) {
    return;
  }

  const previousTodos = state.todos.slice();
  applyTodoOrder(orderIds);
  renderTodos();

  if (state.sessionMode === 'guest') {
    saveGuestTodos();
    setStatus('Gorev sirasi guncellendi.', 'success');
    return;
  }

  isPersistingOrder = true;
  try {
    const payload = orderIds.map((id) => Number(id));
    const response = await request('/api/todos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ ids: payload }),
      auth: true
    });
    state.todos = response.map(normalizeTodo);
    renderTodos();
    setStatus('Gorev sirasi guncellendi.', 'success');
  } catch (error) {
    state.todos = previousTodos;
    renderTodos();
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message, 'error');
  } finally {
    isPersistingOrder = false;
  }
}

function renderStats() {
  let statsContainer = document.getElementById('stats-container');
  if (!statsContainer) {
    statsContainer = document.createElement('div');
    statsContainer.id = 'stats-container';
    statsContainer.className = 'stats-container';
    
    const title = document.createElement('div');
    title.className = 'stats-title';
    title.textContent = 'Son 7 Gün Tamamlananlar';
    statsContainer.appendChild(title);

    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    statsContainer.appendChild(chartWrap);

    if (overviewSummary && overviewSummary.parentNode === overviewView) {
      overviewView.insertBefore(statsContainer, overviewSummary.nextSibling);
    } else {
      overviewView.appendChild(statsContainer);
    }
  }

  const chartWrap = statsContainer.querySelector('.chart-wrap');
  chartWrap.innerHTML = '';

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push({
      dateStr: `${year}-${month}-${day}`,
      label: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
      count: 0
    });
  }

  state.todos.forEach(todo => {
    if (todo.completed && todo.completed_at) {
      const datePart = todo.completed_at.slice(0, 10);
      const dayObj = days.find(d => d.dateStr === datePart);
      if (dayObj) {
        dayObj.count++;
      }
    }
  });

  const maxCount = Math.max(...days.map(d => d.count), 1);

  days.forEach(day => {
    const heightPercent = (day.count / maxCount) * 100;
    const col = document.createElement('div');
    col.className = 'chart-col';
    col.innerHTML = `
      <div class="chart-val">${day.count > 0 ? day.count : ''}</div>
      <div class="chart-bar-bg"><div class="chart-bar-fill" style="height: ${heightPercent}%"></div></div>
      <div class="chart-label">${day.label}</div>
    `;
    chartWrap.appendChild(col);
  });
}

function updateSummary() {
  const doneCount = state.todos.filter((todo) => todo.completed).length;
  const activeCount = state.todos.length - doneCount;
  const summaryText = `${state.todos.length} gorev | ${activeCount} aktif | ${doneCount} tamamlandi`;
  summary.textContent = summaryText;
  overviewSummary.textContent = summaryText;
}

function openAdminUserModal(user) {
  const existing = document.getElementById('admin-user-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'admin-user-modal-overlay';
  overlay.className = 'admin-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'admin-modal';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'admin-modal-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => overlay.remove();

  const title = document.createElement('h3');
  title.textContent = user.name;

  const info = document.createElement('div');
  info.className = 'admin-modal-info';
  info.innerHTML = `
    <div><strong>Email:</strong> ${user.email}</div>
    <div><strong>Rol:</strong> ${user.is_admin ? 'Yönetici' : 'Kullanıcı'}</div>
    <div><strong>Takma Ad:</strong> ${user.nickname || '-'}</div>
    <div><strong>Kayıt:</strong> ${new Date(user.created_at).toLocaleDateString('tr-TR')}</div>
    <div><strong>Görevler:</strong> ${user.todo_count} toplam, ${user.completed_count} tamamlanan</div>
  `;

  const actions = document.createElement('div');
  actions.className = 'admin-modal-actions';

  const isCurrentUser = Number(user.id) === Number(state.user?.id);

  const toggleRoleBtn = document.createElement('button');
  toggleRoleBtn.className = 'admin-modal-btn primary';
  toggleRoleBtn.textContent = user.is_admin ? 'Yöneticiliği Kaldır' : 'Yönetici Yap';
  toggleRoleBtn.disabled = isCurrentUser;
  toggleRoleBtn.onclick = async () => {
    const targetRole = !user.is_admin;
    const actionName = targetRole ? 'Yönetici yapmak' : 'Yöneticiliği kaldırmak';
    if (!confirm(`Bu kullanıcı için ${actionName} istediğine emin misin?`)) return;
    
    try {
      await request(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ is_admin: targetRole }),
        auth: true
      });
      overlay.remove();
      await loadAdminData(true);
      setStatus('Kullanıcı rolü güncellendi.', 'success');
    } catch (error) {
      setStatus(error.message || 'İşlem başarısız.', 'error');
    }
  };

  const resetPassBtn = document.createElement('button');
  resetPassBtn.className = 'admin-modal-btn';
  resetPassBtn.textContent = 'Şifre Sıfırla';
  resetPassBtn.onclick = async () => {
    const newPassword = window.prompt('Yeni şifre (min 6 karakter):');
    if (newPassword === null) return;
    if (newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalı.');
      return;
    }
    try {
      await request(`/api/admin/users/${user.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
        auth: true
      });
      alert('Şifre güncellendi.');
    } catch (error) {
      alert(error.message || 'Hata oluştu.');
    }
  };

  const clearTodosBtn = document.createElement('button');
  clearTodosBtn.className = 'admin-modal-btn danger';
  clearTodosBtn.textContent = 'Görevleri Temizle';
  clearTodosBtn.disabled = Number(user.todo_count) === 0;
  clearTodosBtn.onclick = async () => {
    if (!confirm(`${user.name} kullanıcısının tüm görevleri silinsin mi?`)) return;
    try {
      await request(`/api/admin/users/${user.id}/todos`, { method: 'DELETE', auth: true });
      overlay.remove();
      await loadAdminData(true);
      setStatus('Görevler temizlendi.', 'success');
    } catch (error) {
      setStatus(error.message || 'Hata oluştu.', 'error');
    }
  };

  const deleteUserBtn = document.createElement('button');
  deleteUserBtn.className = 'admin-modal-btn danger';
  deleteUserBtn.textContent = 'Kullanıcıyı Sil';
  deleteUserBtn.disabled = isCurrentUser;
  deleteUserBtn.onclick = async () => {
    if (!confirm(`${user.name} kullanıcısı ve verileri silinsin mi?`)) return;
    try {
      await request(`/api/admin/users/${user.id}`, { method: 'DELETE', auth: true });
      overlay.remove();
      await loadAdminData(true);
      setStatus('Kullanıcı silindi.', 'success');
    } catch (error) {
      setStatus(error.message || 'Hata oluştu.', 'error');
    }
  };

  actions.append(toggleRoleBtn, resetPassBtn, clearTodosBtn, deleteUserBtn);
  modal.append(closeBtn, title, info, actions);
  overlay.appendChild(modal);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function openProfileEditModal() {
  const existing = document.getElementById('profile-edit-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'profile-edit-modal-overlay';
  overlay.className = 'admin-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'admin-modal';

  const title = document.createElement('h3');
  title.textContent = 'Profili Düzenle';

  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Ad Soyad:';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = state.user.name;
  nameInput.className = 'auth-input'; // Mevcut input stilini kullan
  nameInput.style.width = '100%';
  nameInput.style.padding = '8px';
  nameInput.style.marginBottom = '10px';
  nameInput.style.border = '1px solid #ccc';
  nameInput.style.borderRadius = '4px';

  const nicknameLabel = document.createElement('label');
  nicknameLabel.textContent = 'Takma Ad:';
  const nicknameInput = document.createElement('input');
  nicknameInput.type = 'text';
  nicknameInput.value = state.user.nickname || '';
  nicknameInput.placeholder = 'Takma adın (isteğe bağlı)';
  nicknameInput.style.width = '100%';
  nicknameInput.style.padding = '8px';
  nicknameInput.style.marginBottom = '10px';
  nicknameInput.style.border = '1px solid #ccc';
  nicknameInput.style.borderRadius = '4px';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'admin-modal-btn primary';
  saveBtn.textContent = 'Kaydet';
  saveBtn.onclick = async () => {
    try {
      const result = await request('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: nameInput.value,
          nickname: nicknameInput.value
        }),
        auth: true
      });
      state.user = result.user;
      showApp();
      overlay.remove();
      setStatus('Profil güncellendi.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'admin-modal-btn';
  cancelBtn.textContent = 'İptal';
  cancelBtn.onclick = () => overlay.remove();

  modal.append(title, nameLabel, nameInput, nicknameLabel, nicknameInput, saveBtn, cancelBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function openPhotoSelection(onSelect, onRemove, cameraFacing = 'user') {
  const existing = document.getElementById('photo-popup-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'photo-popup-overlay';
  overlay.className = 'photo-popup-overlay';

  const popup = document.createElement('div');
  popup.className = 'photo-popup';

  const cameraBtn = document.createElement('button');
  cameraBtn.className = 'photo-popup-btn primary';
  cameraBtn.textContent = 'Fotoğraf Çek';
  cameraBtn.onclick = () => {
    onSelect(cameraFacing);
    overlay.remove();
  };

  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'photo-popup-btn';
  uploadBtn.textContent = 'Galeriden Seç';
  uploadBtn.onclick = () => {
    onSelect(null);
    overlay.remove();
  };

  const removeBtn = document.createElement('button');
  if (onRemove) {
    removeBtn.className = 'photo-popup-btn';
    removeBtn.textContent = 'Fotoğrafı Kaldır';
    removeBtn.style.color = '#d32f2f';
    removeBtn.onclick = () => {
      onRemove();
      overlay.remove();
    };
  }

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'photo-popup-btn';
  cancelBtn.textContent = 'Vazgeç';
  cancelBtn.onclick = () => overlay.remove();

  popup.append(cameraBtn, uploadBtn, ...(onRemove ? [removeBtn] : []), cancelBtn);
  overlay.appendChild(popup);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function renderAdminPanel() {
  const summaryData = state.adminData.summary;
  adminStatUsers.textContent = summaryData ? String(summaryData.users || 0) : '0';
  adminStatTodos.textContent = summaryData ? String(summaryData.todos || 0) : '0';
  adminStatActive.textContent = summaryData ? String(summaryData.active_todos || 0) : '0';
  adminStatDone.textContent = summaryData ? String(summaryData.completed_todos || 0) : '0';

  adminUsersBody.innerHTML = '';
  if (state.adminData.users.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = state.adminLoading ? 'Kullanicilar yukleniyor...' : 'Gosterilecek kullanici yok.';
    row.appendChild(cell);
    adminUsersBody.appendChild(row);
  } else {
    state.adminData.users.forEach((user) => {
      const row = document.createElement('tr');
      row.style.cursor = 'pointer';
      row.title = 'İşlemleri yönetmek için tıklayın';

      row.addEventListener('click', () => openAdminUserModal(user));

      const nameCell = document.createElement('td');
      nameCell.textContent = user.nickname ? `${user.name} (${user.nickname})` : user.name;

      const emailCell = document.createElement('td');
      emailCell.textContent = user.email;

      const roleCell = document.createElement('td');
      const rolePill = document.createElement('span');
      rolePill.className = `role-pill${user.is_admin ? ' admin' : ''}`;
      rolePill.textContent = user.is_admin ? 'Admin' : 'Kullanici';
      roleCell.appendChild(rolePill);

      const countCell = document.createElement('td');
      countCell.textContent = `${user.todo_count} / ${user.completed_count}`;

      const actionCell = document.createElement('td');
      actionCell.textContent = 'Detay >';
      actionCell.style.color = '#666';
      actionCell.style.fontSize = '12px';

      row.append(nameCell, emailCell, roleCell, countCell, actionCell);
      adminUsersBody.appendChild(row);
    });
  }

  adminTodosBody.innerHTML = '';
  if (state.adminData.todos.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = state.adminLoading ? 'Gorevler yukleniyor...' : 'Gosterilecek gorev yok.';
    row.appendChild(cell);
    adminTodosBody.appendChild(row);
  } else {
    state.adminData.todos.forEach((todo) => {
      const row = document.createElement('tr');

      const userCell = document.createElement('td');
      userCell.textContent = `${todo.user.name} (${todo.user.email})`;

      const textCell = document.createElement('td');
      textCell.textContent = todo.text;

      const statusCell = document.createElement('td');
      const statusPill = document.createElement('span');
      statusPill.className = `status-pill${todo.completed ? ' done' : ''}`;
      statusPill.textContent = todo.completed ? 'Tamamlandi' : 'Aktif';
      statusCell.appendChild(statusPill);

      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'admin-delete-btn';
      deleteBtn.dataset.adminTodoDelete = String(todo.id);
      deleteBtn.textContent = 'Sil';
      actionCell.appendChild(deleteBtn);

      row.append(userCell, textCell, statusCell, actionCell);
      adminTodosBody.appendChild(row);
    });
  }

  adminLogsBody.innerHTML = '';
  if (state.adminData.logs.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = state.adminLoading ? 'Gecmis yukleniyor...' : 'Gosterilecek kayit yok.';
    row.appendChild(cell);
    adminLogsBody.appendChild(row);
  } else {
    state.adminData.logs.forEach((logItem) => {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      const dateText = logItem.created_at ? new Date(logItem.created_at).toLocaleString('tr-TR') : '-';
      dateCell.textContent = dateText;

      const actorCell = document.createElement('td');
      actorCell.textContent = `${logItem.actor?.name || 'Admin'} (${logItem.actor?.email || '-'})`;

      const actionCell = document.createElement('td');
      actionCell.textContent = String(logItem.action_type || '-');

      const detailCell = document.createElement('td');
      const detailText =
        logItem.details && typeof logItem.details === 'object'
          ? Object.entries(logItem.details)
              .slice(0, 4)
              .map(([key, value]) => `${key}: ${String(value)}`)
              .join(' | ')
          : '-';
      detailCell.textContent = detailText || '-';

      row.append(dateCell, actorCell, actionCell, detailCell);
      adminLogsBody.appendChild(row);
    });
  }
}

async function loadAdminData(force = false) {
  if (!isAdminSession()) {
    return;
  }
  if (state.adminLoading) {
    return;
  }
  if (state.adminLoaded && !force) {
    return;
  }

  state.adminLoading = true;
  renderAdminPanel();
  try {
    const [summaryData, usersData, todosData, logsData] = await Promise.all([
      request('/api/admin/summary', { auth: true }),
      request('/api/admin/users?limit=120', { auth: true }),
      request('/api/admin/todos?limit=220', { auth: true }),
      request('/api/admin/logs?limit=240', { auth: true })
    ]);

    state.adminData = {
      summary: summaryData,
      users: Array.isArray(usersData) ? usersData : [],
      todos: Array.isArray(todosData) ? todosData : [],
      logs: Array.isArray(logsData) ? logsData : []
    };
    state.adminLoaded = true;
    renderAdminPanel();
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    if (error.status === 403) {
      resetAdminPanelState();
      openOverviewScreen(true);
      setStatus('Yonetim paneli icin yetkin yok.', 'error');
      return;
    }
    setStatus(error.message || 'Yonetim verileri alinamadi.', 'error');
  } finally {
    state.adminLoading = false;
    renderAdminPanel();
  }
}

async function openTodoDetailModal(todoId) {
  let todo = state.todos.find((t) => String(t.id) === String(todoId));
  if (!todo) return;

  // Auth modunda ise detaylari sunucudan cek (cunku listede detaylar yok)
  if (state.sessionMode === 'auth') {
    try {
      const fullTodo = await request(`/api/todos/${todoId}`, { auth: true });
      todo = normalizeTodo(fullTodo);
    } catch (error) {
      setStatus('Gorev detaylari alinamadi.', 'error');
      return;
    }
  }

  const existing = document.getElementById('todo-detail-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'todo-detail-modal-overlay';
  overlay.className = 'admin-modal-overlay'; // Mevcut modal stilini kullanalim

  const modal = document.createElement('div');
  modal.className = 'admin-modal';

  const renderView = () => {
    modal.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'admin-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => overlay.remove();

    const title = document.createElement('h3');
    title.textContent = 'Gorev Detayi';

    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '12px';

    // Gorev Metni
    const textEl = document.createElement('div');
    textEl.style.fontSize = '16px';
    textEl.style.fontWeight = '500';
    textEl.style.lineHeight = '1.5';
    textEl.textContent = todo.text;
    content.appendChild(textEl);

    // Meta Bilgiler (Oncelik, Tarih, Tekrar)
    const metaInfo = document.createElement('div');
    metaInfo.style.display = 'flex';
    metaInfo.style.flexWrap = 'wrap';
    metaInfo.style.gap = '8px';
    metaInfo.style.alignItems = 'center';

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `todo-priority priority-${todo.priority}`;
    priorityBadge.textContent = `Oncelik: ${PRIORITY_LABELS[todo.priority] || 'Orta'}`;
    metaInfo.appendChild(priorityBadge);

    if (todo.due_date) {
      const dueBadge = document.createElement('span');
      dueBadge.className = 'todo-due';
      if (isTodoOverdue(todo)) dueBadge.classList.add('is-overdue');
      dueBadge.textContent = `Son tarih: ${formatDueDateTime(todo.due_date, todo.due_time)}`;
      metaInfo.appendChild(dueBadge);
    } else if (todo.due_time) {
      const dueBadge = document.createElement('span');
      dueBadge.className = 'todo-due';
      dueBadge.textContent = `Saat: ${todo.due_time}`;
      metaInfo.appendChild(dueBadge);
    }

    if (todo.recurrence && todo.recurrence !== 'none') {
      const recBadge = document.createElement('span');
      recBadge.className = 'todo-recurrence';
      recBadge.textContent = `Tekrar: ${RECURRENCE_LABELS[todo.recurrence]}`;
      metaInfo.appendChild(recBadge);
    }
    content.appendChild(metaInfo);

    // Etiketler
    if (todo.tags && todo.tags.length > 0) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'todo-tags';
      todo.tags.forEach((tag) => {
        const t = document.createElement('span');
        t.className = 'todo-tag';
        t.textContent = `#${tag}`;
        tagsDiv.appendChild(t);
      });
      content.appendChild(tagsDiv);
    }

    // Fotograf
    if (todo.image_url) {
      const imgDiv = document.createElement('div');
      imgDiv.style.marginTop = '10px';
      const img = document.createElement('img');
      img.src = todo.image_url;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      img.style.cursor = 'pointer';
      img.onclick = () => openPhotoPreview(todo.image_url, todo.text);
      imgDiv.appendChild(img);
      content.appendChild(imgDiv);
    }

    if (todo.attachment_url) {
      const attachmentLink = document.createElement('a');
      attachmentLink.href = todo.attachment_url;
      attachmentLink.target = '_blank';
      attachmentLink.rel = 'noopener noreferrer';
      attachmentLink.textContent = `Dosya: ${todo.attachment_name || 'Ek dosyayi ac'}`;
      attachmentLink.style.fontSize = '14px';
      attachmentLink.style.color = '#0f766e';
      attachmentLink.style.textDecoration = 'underline';
      attachmentLink.style.textUnderlineOffset = '3px';
      content.appendChild(attachmentLink);
    }

    if (todo.note) {
      const noteBox = document.createElement('div');
      noteBox.style.fontSize = '13px';
      noteBox.style.lineHeight = '1.5';
      noteBox.style.color = '#334155';
      noteBox.style.background = '#f8fafc';
      noteBox.style.border = '1px solid #e2e8f0';
      noteBox.style.borderRadius = '8px';
      noteBox.style.padding = '10px';
      noteBox.textContent = `Not: ${todo.note}`;
      content.appendChild(noteBox);
    }

    // Olusturulma Tarihi
    const dateInfo = document.createElement('div');
    dateInfo.style.fontSize = '12px';
    dateInfo.style.color = '#888';
    dateInfo.style.marginTop = '8px';
    dateInfo.textContent = `Olusturulma: ${new Date(todo.created_at).toLocaleString('tr-TR')}`;
    content.appendChild(dateInfo);

    // Butonlar Grubu
    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.flexDirection = 'column';
    actionsDiv.style.gap = '8px';
    actionsDiv.style.marginTop = '12px';

    // Duzenle Butonu
    const editBtn = document.createElement('button');
    editBtn.className = 'admin-modal-btn primary';
    editBtn.textContent = 'Düzenle';
    editBtn.onclick = renderEdit;
    actionsDiv.appendChild(editBtn);

    // Tekrari Durdur Butonu (Eger tekrarliysa)
    if (todo.recurrence && todo.recurrence !== 'none') {
      const stopRecBtn = document.createElement('button');
      stopRecBtn.className = 'admin-modal-btn';
      stopRecBtn.textContent = 'Tekrarı Durdur';
      stopRecBtn.onclick = async () => {
        if (!confirm('Bu görevin tekrar özelliği kaldırılacak. Emin misin?')) return;
        
        if (state.sessionMode === 'guest') {
          const t = state.todos.find((x) => String(x.id) === String(todo.id));
          if (t) {
            t.recurrence = 'none';
            saveGuestTodos();
            renderTodos();
            overlay.remove();
            setStatus('Görevin tekrarı kaldırıldı.', 'success');
          }
          return;
        }

        try {
          await request(`/api/todos/${todo.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ recurrence: 'none' }),
            auth: true
          });
          overlay.remove();
          await loadTodos();
          setStatus('Görevin tekrarı kaldırıldı.', 'success');
        } catch (error) {
          setStatus(error.message || 'İşlem başarısız.', 'error');
        }
      };
      actionsDiv.appendChild(stopRecBtn);
    }

    content.appendChild(actionsDiv);
    modal.append(closeBtn, title, content);
  };

  const renderEdit = () => {
    modal.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = 'Görevi Düzenle';

    const formStack = document.createElement('div');
    formStack.style.display = 'flex';
    formStack.style.flexDirection = 'column';
    formStack.style.gap = '12px';

    // Text
    const labelText = document.createElement('label');
    labelText.textContent = 'Görev Adı';
    labelText.style.fontSize = '12px';
    labelText.style.fontWeight = 'bold';
    const inpText = document.createElement('input');
    inpText.type = 'text';
    inpText.value = todo.text;
    inpText.className = 'auth-input';
    inpText.style.width = '100%';
    inpText.style.padding = '8px';
    inpText.style.border = '1px solid #ccc';
    inpText.style.borderRadius = '4px';
    
    // Priority
    const labelPriority = document.createElement('label');
    labelPriority.textContent = 'Öncelik';
    labelPriority.style.fontSize = '12px';
    labelPriority.style.fontWeight = 'bold';
    const selPriority = document.createElement('select');
    selPriority.style.width = '100%';
    selPriority.style.padding = '8px';
    selPriority.style.border = '1px solid #ccc';
    selPriority.style.borderRadius = '4px';
    Object.entries(PRIORITY_LABELS).forEach(([key, label]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = label;
        if (key === todo.priority) opt.selected = true;
        selPriority.appendChild(opt);
    });

    // Due Date
    const labelDate = document.createElement('label');
    labelDate.textContent = 'Son Tarih';
    labelDate.style.fontSize = '12px';
    labelDate.style.fontWeight = 'bold';
    const inpDate = document.createElement('input');
    inpDate.type = 'date';
    inpDate.style.width = '100%';
    inpDate.style.padding = '8px';
    inpDate.style.border = '1px solid #ccc';
    inpDate.style.borderRadius = '4px';
    if (todo.due_date) inpDate.value = todo.due_date;

    // Due Time
    const labelTime = document.createElement('label');
    labelTime.textContent = 'Saat';
    labelTime.style.fontSize = '12px';
    labelTime.style.fontWeight = 'bold';
    const inpTime = document.createElement('input');
    inpTime.type = 'time';
    inpTime.style.width = '100%';
    inpTime.style.padding = '8px';
    inpTime.style.border = '1px solid #ccc';
    inpTime.style.borderRadius = '4px';
    if (todo.due_time) inpTime.value = todo.due_time;

    // Tags
    const labelTags = document.createElement('label');
    labelTags.textContent = 'Etiketler (virgülle ayır)';
    labelTags.style.fontSize = '12px';
    labelTags.style.fontWeight = 'bold';
    const inpTags = document.createElement('input');
    inpTags.type = 'text';
    inpTags.style.width = '100%';
    inpTags.style.padding = '8px';
    inpTags.style.border = '1px solid #ccc';
    inpTags.style.borderRadius = '4px';
    if (todo.tags && todo.tags.length) inpTags.value = todo.tags.join(', ');

    // Note
    const labelNote = document.createElement('label');
    labelNote.textContent = 'Not';
    labelNote.style.fontSize = '12px';
    labelNote.style.fontWeight = 'bold';
    const inpNote = document.createElement('textarea');
    inpNote.style.width = '100%';
    inpNote.style.padding = '8px';
    inpNote.style.border = '1px solid #ccc';
    inpNote.style.borderRadius = '4px';
    inpNote.style.minHeight = '84px';
    inpNote.maxLength = MAX_NOTE_LENGTH;
    inpNote.value = todo.note || '';

    // Recurrence
    const labelRec = document.createElement('label');
    labelRec.textContent = 'Tekrar';
    labelRec.style.fontSize = '12px';
    labelRec.style.fontWeight = 'bold';
    const selRec = document.createElement('select');
    selRec.style.width = '100%';
    selRec.style.padding = '8px';
    selRec.style.border = '1px solid #ccc';
    selRec.style.borderRadius = '4px';
    Object.entries(RECURRENCE_LABELS).forEach(([key, label]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = label;
        if (key === todo.recurrence) opt.selected = true;
        selRec.appendChild(opt);
    });

    formStack.append(
        labelText, inpText, 
        labelPriority, selPriority, 
        labelDate, inpDate, 
        labelTime, inpTime,
        labelTags, inpTags, 
        labelNote, inpNote,
        labelRec, selRec
    );

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
    btnRow.style.marginTop = '10px';

    const btnSave = document.createElement('button');
    btnSave.textContent = 'Kaydet';
    btnSave.className = 'admin-modal-btn primary';
    btnSave.style.flex = '1';
    
    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Vazgeç';
    btnCancel.className = 'admin-modal-btn';
    btnCancel.style.flex = '1';

    btnCancel.onclick = renderView;

	    btnSave.onclick = async () => {
	        const valText = inpText.value.trim();
	        if (!valText) {
	            alert('Görev adı boş olamaz.');
	            return;
	        }

	        const normalizedTime = inpTime.value ? normalizeDueTime(inpTime.value) : null;
	        if (inpTime.value && !normalizedTime) {
	            alert('Saat formatı geçersiz.');
	            return;
	        }
	        
	        const tagsRes = parseTagInputValue(inpTags.value);
	        if (!tagsRes.ok) {
	            alert(tagsRes.error);
	            return;
        }

	        const updates = {
	            text: valText,
	            priority: selPriority.value,
	            due_date: inpDate.value || null,
	            due_time: normalizedTime,
	            tags: tagsRes.value,
	            note: normalizeNoteText(inpNote.value) || null,
	            recurrence: selRec.value
	        };

        if (state.sessionMode === 'guest') {
            const t = state.todos.find(x => String(x.id) === String(todo.id));
            if (t) {
                Object.assign(t, updates);
                saveGuestTodos();
                renderTodos();
                // Update local todo object for view mode
                Object.assign(todo, updates);
                renderView();
                setStatus('Görev güncellendi.', 'success');
            }
        } else {
            try {
                const updatedTodo = await request(`/api/todos/${todo.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(updates),
                    auth: true
                });
                // Update local todo object for view mode
                Object.assign(todo, normalizeTodo(updatedTodo));
                await loadTodos(); // Refresh list in background
                renderView();
                setStatus('Görev güncellendi.', 'success');
            } catch (err) {
                alert(err.message || 'Güncelleme başarısız.');
            }
        }
    };

    btnRow.append(btnCancel, btnSave);
    modal.append(title, formStack, btnRow);
  };

  renderView();

  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function createTodoElement(todo) {
  const item = document.createElement('li');
  item.className = `todo-item${todo.completed ? ' is-completed' : ''}`;
  if (state.bulkMode) {
    item.classList.add('bulk-mode');
  }
  item.dataset.todoId = String(todo.id);
  const reorderEnabled = isReorderEnabled();
  item.draggable = reorderEnabled;

  const selectCheckbox = document.createElement('input');
  selectCheckbox.type = 'checkbox';
  selectCheckbox.className = 'bulk-checkbox';
  selectCheckbox.hidden = !state.bulkMode;
  selectCheckbox.checked = state.selectedTodoIds.has(String(todo.id));
  selectCheckbox.setAttribute('aria-label', `${todo.text} sec`);
  selectCheckbox.addEventListener('change', () => {
    toggleTodoSelection(todo.id, selectCheckbox.checked);
  });

  const dragHandle = document.createElement('button');
  dragHandle.className = 'drag-handle';
  dragHandle.type = 'button';
  dragHandle.textContent = '↕';
  dragHandle.disabled = !reorderEnabled;
  dragHandle.setAttribute('aria-label', `${todo.text} gorevini surukle`);

  item.addEventListener('dragstart', (event) => {
    const dragTarget =
      event.target instanceof Element ? event.target.closest('.drag-handle') : null;
    if (!reorderEnabled || !dragTarget) {
      event.preventDefault();
      return;
    }

    dragState.sourceItem = item;
    dragState.moved = false;
    item.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.dataset.todoId || '');
  });

  item.addEventListener('dragover', (event) => {
    if (!dragState.sourceItem || dragState.sourceItem === item) {
      return;
    }

    event.preventDefault();
    const rect = item.getBoundingClientRect();
    const shouldInsertBefore = event.clientY < rect.top + rect.height / 2;
    const referenceNode = shouldInsertBefore ? item : item.nextSibling;
    if (referenceNode !== dragState.sourceItem) {
      list.insertBefore(dragState.sourceItem, referenceNode);
      dragState.moved = true;
    }
  });

  item.addEventListener('drop', (event) => {
    if (dragState.sourceItem) {
      event.preventDefault();
    }
  });

  item.addEventListener('dragend', () => {
    const moved = dragState.moved;
    if (dragState.sourceItem) {
      dragState.sourceItem.classList.remove('dragging');
    }
    dragState.sourceItem = null;
    dragState.moved = false;
    if (moved) {
      persistTodoOrder();
    }
  });

  const finishTouchDrag = () => {
    if (!touchDragState.sourceItem) {
      return;
    }

    const moved = touchDragState.moved;
    touchDragState.sourceItem.classList.remove('dragging');
    touchDragState.sourceItem = null;
    touchDragState.moved = false;
    if (moved) {
      persistTodoOrder();
    }
  };

  dragHandle.addEventListener(
    'touchstart',
    (event) => {
      if (!reorderEnabled || event.touches.length !== 1) {
        return;
      }
      touchDragState.sourceItem = item;
      touchDragState.moved = false;
      item.classList.add('dragging');
    },
    { passive: true }
  );

  dragHandle.addEventListener(
    'touchmove',
    (event) => {
      if (!touchDragState.sourceItem || event.touches.length !== 1) {
        return;
      }

      event.preventDefault();
      const touch = event.touches[0];
      const pointed = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetItem = pointed && pointed.closest('.todo-item');
      if (!targetItem || targetItem === touchDragState.sourceItem || !list.contains(targetItem)) {
        return;
      }

      const rect = targetItem.getBoundingClientRect();
      const shouldInsertBefore = touch.clientY < rect.top + rect.height / 2;
      const referenceNode = shouldInsertBefore ? targetItem : targetItem.nextSibling;
      if (referenceNode !== touchDragState.sourceItem) {
        list.insertBefore(touchDragState.sourceItem, referenceNode);
        touchDragState.moved = true;
      }
    },
    { passive: false }
  );

  dragHandle.addEventListener('touchend', finishTouchDrag);
  dragHandle.addEventListener('touchcancel', finishTouchDrag);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `${todo.text} tamamlandi`);
  checkbox.addEventListener('change', async () => {
    if (state.sessionMode === 'guest') {
      if (setGuestTodoCompletion(todo.id, checkbox.checked)) {
        saveGuestTodos();
        renderTodos();
      }
      return;
    }

    try {
      await request(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: checkbox.checked }),
        auth: true
      });
      await loadTodos();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      if (error.status === 401) {
        handleUnauthorized();
        return;
      }
      setStatus(error.message, 'error');
    }
  });

  const main = document.createElement('div');
  main.className = 'todo-main';

  const meta = document.createElement('div');
  meta.className = 'todo-meta';

  if (todo.image_url) {
    const photoIcon = document.createElement('span');
    photoIcon.className = 'todo-photo-icon';
    photoIcon.textContent = '📷';
    photoIcon.title = 'Fotoğrafı görüntüle';
    photoIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      openPhotoPreview(todo.image_url, `${todo.text} fotoğrafı`);
    });
    meta.appendChild(photoIcon);
  }

  if (todo.attachment_url) {
    const attachmentIcon = document.createElement('span');
    attachmentIcon.className = 'todo-photo-icon';
    attachmentIcon.textContent = '📎';
    attachmentIcon.title = todo.attachment_name ? `Ek dosya: ${todo.attachment_name}` : 'Ek dosya';
    attachmentIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(todo.attachment_url, '_blank', 'noopener,noreferrer');
    });
    meta.appendChild(attachmentIcon);
  }

  if (todo.recurrence && todo.recurrence !== 'none') {
    const recIcon = document.createElement('span');
    recIcon.className = 'todo-photo-icon';
    recIcon.textContent = '🔄';
    recIcon.title = `Tekrarli gorev: ${RECURRENCE_LABELS[todo.recurrence]}`;
    recIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      openTodoDetailModal(todo.id);
    });
    meta.appendChild(recIcon);
  }

  if (todo.note) {
    const noteIcon = document.createElement('span');
    noteIcon.className = 'todo-photo-icon';
    noteIcon.textContent = '📝';
    noteIcon.title = 'Not var';
    noteIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      openTodoDetailModal(todo.id);
    });
    meta.appendChild(noteIcon);
  }

  if (todo.due_time && !todo.due_date) {
    const timeIcon = document.createElement('span');
    timeIcon.className = 'todo-photo-icon';
    timeIcon.textContent = '🕒';
    timeIcon.title = `Saat: ${todo.due_time}`;
    timeIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      openTodoDetailModal(todo.id);
    });
    meta.appendChild(timeIcon);
  }

  // Detaylar (oncelik, tarih, etiket) artik listede gosterilmiyor.
  // Sadece fotograf ikonu varsa gosteriyoruz.
  if (meta.children.length > 0) {
    main.appendChild(meta);
  }

  const text = document.createElement('p');
  text.className = 'todo-text';
  text.textContent = todo.text;
  text.style.cursor = 'pointer';
  text.title = 'Detaylar icin tikla';
  text.addEventListener('click', () => openTodoDetailModal(todo.id));
  main.appendChild(text);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Sil';
  deleteBtn.addEventListener('click', async () => {
    if (state.sessionMode === 'guest') {
      state.todos = state.todos.filter((entry) => String(entry.id) !== String(todo.id));
      state.selectedTodoIds.delete(String(todo.id));
      saveGuestTodos();
      renderTodos();
      return;
    }

    try {
      await request(`/api/todos/${todo.id}`, { method: 'DELETE', auth: true });
      await loadTodos();
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
        return;
      }
      setStatus(error.message, 'error');
    }
  });

  item.append(selectCheckbox, dragHandle, checkbox, main, deleteBtn);
  return item;
}

function renderTodos() {
  list.innerHTML = '';
  renderTagFilterOptions();
  updateReorderHint();
  updateBulkControls();
  const visibleTodos = getVisibleTodos();

  if (visibleTodos.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'todo-item';
    empty.textContent =
      state.searchQuery || state.tagFilter || state.priorityFilter !== 'all' || state.dueFilter !== 'all'
        ? 'Filtreye uyan gorev yok.'
        : 'Gorev yok. Ilk gorevini ekleyebilirsin.';
    list.appendChild(empty);
    updateSummary();
    return;
  }

  visibleTodos.forEach((todo) => {
    list.appendChild(createTodoElement(todo));
  });

  updateSummary();
  renderStats();
}

async function completeSelectedTodos() {
  const selectedIds = getSelectedTodoIds();
  if (selectedIds.length === 0) {
    setStatus('Tamamlamak icin secili gorev yok.', 'error');
    return;
  }

  if (selectedIds.length > BULK_ACTION_LIMIT) {
    setStatus(`Tek seferde en fazla ${BULK_ACTION_LIMIT} gorev guncelleyebilirsin.`, 'error');
    return;
  }

  if (state.sessionMode === 'guest') {
    selectedIds.forEach((todoId) => {
      setGuestTodoCompletion(todoId, true);
    });
    saveGuestTodos();
    state.selectedTodoIds.clear();
    renderTodos();
    setStatus('Secilen gorevler tamamlandi.', 'success');
    return;
  }

  try {
    await Promise.all(
      selectedIds.map((todoId) =>
        request(`/api/todos/${todoId}`, {
          method: 'PATCH',
          body: JSON.stringify({ completed: true }),
          auth: true
        })
      )
    );
    state.selectedTodoIds.clear();
    await loadTodos();
    setStatus('Secilen gorevler tamamlandi.', 'success');
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message || 'Toplu tamamlama basarisiz.', 'error');
  }
}

async function deleteSelectedTodos() {
  const selectedIds = getSelectedTodoIds();
  if (selectedIds.length === 0) {
    setStatus('Silmek icin secili gorev yok.', 'error');
    return;
  }

  if (selectedIds.length > BULK_ACTION_LIMIT) {
    setStatus(`Tek seferde en fazla ${BULK_ACTION_LIMIT} gorev silebilirsin.`, 'error');
    return;
  }

  const shouldDelete = window.confirm(`${selectedIds.length} gorev kalici olarak silinsin mi?`);
  if (!shouldDelete) {
    return;
  }

  if (state.sessionMode === 'guest') {
    const selectedSet = new Set(selectedIds.map((id) => String(id)));
    state.todos = state.todos.filter((todo) => !selectedSet.has(String(todo.id)));
    state.selectedTodoIds.clear();
    saveGuestTodos();
    renderTodos();
    setStatus('Secilen gorevler silindi.', 'success');
    return;
  }

  try {
    await Promise.all(
      selectedIds.map((todoId) =>
        request(`/api/todos/${todoId}`, {
          method: 'DELETE',
          auth: true
        })
      )
    );
    state.selectedTodoIds.clear();
    await loadTodos();
    setStatus('Secilen gorevler silindi.', 'success');
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message || 'Toplu silme basarisiz.', 'error');
  }
}

async function loadTodos() {
  if (state.sessionMode === 'guest') {
    state.todos = readGuestTodos();
    pruneSelectedTodoIds();
    renderTodos();
    runDueReminders();
    return;
  }

  if (!state.user) {
    return;
  }

  try {
    const response = await request('/api/todos', { auth: true });
    state.todos = response.map(normalizeTodo);
    pruneSelectedTodoIds();
    renderTodos();
    runDueReminders();
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message, 'error');
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Dosya okunamadi.'));
    reader.readAsDataURL(file);
  });
}

function parseBooleanLike(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true' || lowered === '1') {
      return true;
    }
    if (lowered === 'false' || lowered === '0') {
      return false;
    }
  }
  return false;
}

function normalizeBackupItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    throw new Error('Yedek dosyasinda items dizisi yok.');
  }

  if (rawItems.length > MAX_BACKUP_ITEMS) {
    throw new Error(`Bu yedekte ${MAX_BACKUP_ITEMS} ustu gorev var.`);
  }

  return rawItems.map((entry, index) => {
    const text = String(entry?.text || '').trim();
    if (!text || text.length > 200) {
      throw new Error(`${index + 1}. gorev metni gecersiz.`);
    }

    let tagValues;
    if (Array.isArray(entry?.tags)) {
      tagValues = normalizeTags(entry.tags);
    } else {
      const parsedTags = parseTagInputValue(String(entry?.tags || ''));
      if (!parsedTags.ok) {
        throw new Error(`${index + 1}. gorev etiketi gecersiz.`);
      }
      tagValues = parsedTags.value;
    }

    const dueTime = entry?.due_time === undefined ? null : normalizeDueTime(String(entry?.due_time || ''));
    if (entry?.due_time && !dueTime) {
      throw new Error(`${index + 1}. gorev saati gecersiz.`);
    }

    const noteText = entry?.note === undefined ? null : normalizeNoteText(String(entry?.note || ''));
    if (entry?.note && !noteText) {
      throw new Error(`${index + 1}. gorev notu gecersiz.`);
    }

    return normalizeTodo({
      text,
      completed: parseBooleanLike(entry?.completed),
      completed_at: entry?.completed_at || null,
      image_url: typeof entry?.image_url === 'string' ? entry.image_url : null,
      attachment_url: typeof entry?.attachment_url === 'string' ? entry.attachment_url : null,
      attachment_name: typeof entry?.attachment_name === 'string' ? entry.attachment_name : null,
      attachment_mime: typeof entry?.attachment_mime === 'string' ? entry.attachment_mime : null,
      note: noteText,
      due_date: entry?.due_date ?? null,
      due_time: dueTime,
      priority: entry?.priority ?? 'medium',
      tags: tagValues,
      recurrence: entry?.recurrence ?? 'none',
      sort_order: Number(entry?.sort_order || 0),
      created_at: entry?.created_at || new Date().toISOString()
    });
  });
}

function buildBackupPayloadFromState() {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    item_count: state.todos.length,
    items: state.todos.map((todo) => ({
      text: todo.text,
      completed: todo.completed,
      completed_at: todo.completed_at,
      image_url: todo.image_url,
      attachment_url: todo.attachment_url,
      attachment_name: todo.attachment_name,
      attachment_mime: todo.attachment_mime,
      note: todo.note,
      due_date: todo.due_date,
      due_time: todo.due_time,
      priority: todo.priority,
      tags: todo.tags,
      recurrence: todo.recurrence,
      created_at: todo.created_at
    }))
  };
}

function downloadJsonFile(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Dosya okunamadi.'));
    reader.readAsText(file);
  });
}

async function exportBackup() {
  if (state.sessionMode === 'auth') {
    const payload = await request('/api/todos/backup/export', { auth: true });
    const datePart = new Date().toISOString().slice(0, 10);
    downloadJsonFile(`todo-yedek-${datePart}.json`, payload);
    setStatus('Yedek dosyasi indirildi.', 'success');
    return;
  }

  const payload = buildBackupPayloadFromState();
  const datePart = new Date().toISOString().slice(0, 10);
  downloadJsonFile(`todo-yedek-misafir-${datePart}.json`, payload);
  setStatus('Misafir yedegi indirildi.', 'success');
}

function importBackupInGuest(items, mode) {
  const normalizedItems = items.map((todo) =>
    normalizeTodo({
      ...todo,
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    })
  );

  if (mode === 'replace') {
    state.todos = normalizedItems;
  } else {
    state.todos = [...normalizedItems, ...state.todos];
  }

  saveGuestTodos();
  renderTodos();
}

async function importBackup(items, mode) {
  if (state.sessionMode === 'auth') {
    const result = await request('/api/todos/backup/import', {
      method: 'POST',
      body: JSON.stringify({
        mode,
        backup: {
          version: 1,
          items: items.map((todo) => ({
            text: todo.text,
            completed: todo.completed,
            completed_at: todo.completed_at,
            note: todo.note,
            due_date: todo.due_date,
            due_time: todo.due_time,
            priority: todo.priority,
            tags: todo.tags,
            recurrence: todo.recurrence
          }))
        }
      }),
      auth: true
    });
    state.todos = result.todos.map(normalizeTodo);
    renderTodos();
    setStatus('Yedek ice aktarildi. Fotograf ve dosya ekleri yedekte tutulmaz.', 'success');
    return;
  }

  importBackupInGuest(items, mode);
  setStatus('Misafir yedegi ice aktarildi.', 'success');
}

authSwitch.addEventListener('click', () => {
  setStatus('');
  if (state.authMode === 'login') {
    setAuthMode('register');
    return;
  }
  setAuthMode('login');
});

menuTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.dataset.view === 'tasks') {
      openTasksScreen('list');
      return;
    }
    if (tab.dataset.view === 'admin') {
      openAdminScreen();
      return;
    }
    openOverviewScreen();
  });
});

goTasksBtn.addEventListener('click', () => {
  openTasksScreen('list');
});

shareCopyBtn.addEventListener('click', async () => {
  await copyCurrentShareCode();
});

shareJoinBtn.addEventListener('click', async () => {
  await joinSharedList();
});

shareJoinInput.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') {
    return;
  }
  event.preventDefault();
  await joinSharedList();
});

taskSubTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    openTasksScreen(tab.dataset.taskSubview === 'create' ? 'create' : 'list');
  });
});

adminSubTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.adminSubview;
    if (view === 'todos' || view === 'logs') {
      setAdminSubview(view);
      return;
    }
    setAdminSubview('users');
  });
});

adminRefreshBtn.addEventListener('click', async () => {
  await loadAdminData(true);
});

adminUsersBody.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const clearUserId = target.dataset.adminUserClearTodos;
  const deleteUserId = target.dataset.adminUserDelete;
  const toggleRoleId = target.dataset.adminUserToggleRole;
  const resetPasswordId = target.dataset.adminUserResetPassword;

  if (!clearUserId && !deleteUserId && !toggleRoleId && !resetPasswordId) {
    return;
  }

  if (toggleRoleId) {
    const targetRole = target.dataset.targetRole === '1';
    const actionName = targetRole ? 'Yönetici yapmak' : 'Yöneticiliği kaldırmak';

    const shouldChange = window.confirm(`Bu kullanıcı için ${actionName} istediğine emin misin?`);
    if (!shouldChange) return;

    try {
      await request(`/api/admin/users/${toggleRoleId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ is_admin: targetRole }),
        auth: true
      });
      state.adminLoaded = false;
      await loadAdminData(true);
      setStatus('Kullanıcı rolü güncellendi.', 'success');
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
        return;
      }
      setStatus(error.message || 'Rol güncellenemedi.', 'error');
    }
    return;
  }

  if (resetPasswordId) {
    const newPassword = window.prompt('Bu kullanıcı için yeni şifreyi girin (en az 6 karakter):');
    if (newPassword === null) return; // İptal edildi
    
    if (newPassword.length < 6) {
      setStatus('Şifre en az 6 karakter olmalı.', 'error');
      return;
    }

    try {
      await request(`/api/admin/users/${resetPasswordId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
        auth: true
      });
      setStatus('Kullanıcı şifresi başarıyla sıfırlandı.', 'success');
    } catch (error) {
      setStatus(error.message || 'Şifre sıfırlanamadı.', 'error');
    }
    return;
  }

  const userId = clearUserId || deleteUserId;
  const selectedUser = state.adminData.users.find((user) => String(user.id) === String(userId));
  const userName = selectedUser?.name || 'Bu kullanici';

  if (clearUserId) {
    const shouldClear = window.confirm(`${userName} kullanicisinin tum gorevleri silinsin mi?`);
    if (!shouldClear) {
      return;
    }

    try {
      await request(`/api/admin/users/${clearUserId}/todos`, {
        method: 'DELETE',
        auth: true
      });
      state.adminLoaded = false;
      await Promise.all([loadAdminData(true), loadTodos()]);
      setStatus('Kullanici gorevleri temizlendi.', 'success');
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
        return;
      }
      if (error.status === 403) {
        resetAdminPanelState();
        openOverviewScreen(true);
        setStatus('Yonetim paneli icin yetkin yok.', 'error');
        return;
      }
      setStatus(error.message || 'Kullanici gorevleri temizlenemedi.', 'error');
    }
    return;
  }

  const shouldDelete = window.confirm(
    `${userName} kullanicisi ve tum gorevleri kalici olarak silinsin mi?`
  );
  if (!shouldDelete) {
    return;
  }

  try {
    await request(`/api/admin/users/${deleteUserId}`, {
      method: 'DELETE',
      auth: true
    });
    state.adminLoaded = false;
    await Promise.all([loadAdminData(true), loadTodos()]);
    setStatus('Kullanici silindi.', 'success');
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    if (error.status === 403) {
      resetAdminPanelState();
      openOverviewScreen(true);
      setStatus('Yonetim paneli icin yetkin yok.', 'error');
      return;
    }
    setStatus(error.message || 'Kullanici silinemedi.', 'error');
  }
});

adminTodosBody.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const todoId = target.dataset.adminTodoDelete;
  if (!todoId) {
    return;
  }

  const shouldDelete = window.confirm('Bu gorevi admin olarak silmek istiyor musun?');
  if (!shouldDelete) {
    return;
  }

  try {
    await request(`/api/admin/todos/${todoId}`, {
      method: 'DELETE',
      auth: true
    });
    state.adminLoaded = false;
    await Promise.all([loadAdminData(true), loadTodos()]);
    setStatus('Gorev admin panelinden silindi.', 'success');
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    if (error.status === 403) {
      resetAdminPanelState();
      openOverviewScreen(true);
      setStatus('Yonetim paneli icin yetkin yok.', 'error');
      return;
    }
    setStatus(error.message || 'Gorev silinemedi.', 'error');
  }
});

topBackBtn.addEventListener('click', () => {
  openOverviewScreen();
});

window.addEventListener('popstate', () => {
  if (!appSection.hidden) {
    syncScreenRoute();
  }
});

photoPreviewClose.addEventListener('click', () => {
  closePhotoPreview();
});

photoPreviewModal.addEventListener('click', (event) => {
  if (event.target === photoPreviewModal) {
    closePhotoPreview();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePhotoPreview();
  }
});

guestBtn.addEventListener('click', async () => {
  saveToken(null);
  state.user = null;
  resetAdminPanelState();
  resetShareState();
  setSessionMode('guest');
  openOverviewScreen(true);
  resetTaskListControls();
  resetTodoFormFields();
  clearProfilePhotoInput();
  showApp();
  setStatus('Misafir moduna gecildi. Veriler bu cihazda tutulur.', 'success');
  await loadTodos();
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  const payload = { email, password };
  if (state.authMode === 'register') {
    payload.name = authNameInput.value.trim();
    payload.nickname = authNicknameInput.value.trim();
  }

  const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

  try {
    const result = await request(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    saveToken(result.token);
    resetAdminPanelState();
    state.user = result.user;
    setSessionMode('auth');
    openOverviewScreen(true);
    authForm.reset();
    setAuthMode('login');
    resetTaskListControls();
    resetTodoFormFields();
    clearProfilePhotoInput();
    showApp();
    setStatus('Oturum acildi. Senkron hazir.', 'success');
    await loadTodos();
    await loadShareStatus();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  if (state.sessionMode === 'guest') {
    setSessionMode('auth');
    openOverviewScreen(true);
    state.todos = [];
    resetAdminPanelState();
    resetTaskListControls();
    resetTodoFormFields();
    clearProfilePhotoInput();
    renderTodos();
    showAuth();
    setStatus('Misafir modundan cikildi.', 'success');
    return;
  }

  saveToken(null);
  state.user = null;
  resetShareState();
  openOverviewScreen(true);
  state.todos = [];
  resetAdminPanelState();
  resetTaskListControls();
  resetTodoFormFields();
  clearProfilePhotoInput();
  renderTodos();
  showAuth();
  setStatus('Cikis yapildi.', 'success');
});

userAvatar.addEventListener('click', () => {
  if (state.sessionMode === 'auth') {
    openPhotoSelection((captureMode) => {
      if (captureMode) {
        profilePhotoInput.setAttribute('capture', captureMode);
      } else {
        profilePhotoInput.removeAttribute('capture');
      }
      profilePhotoInput.click();
    }, state.user.profile_image_url ? async () => {
      try {
        const result = await request('/api/auth/profile-photo', {
          method: 'DELETE',
          auth: true
        });
        state.user = result.user;
        showApp();
        setStatus('Profil fotografi silindi.', 'success');
      } catch (error) {
        if (error.status === 401) {
          handleUnauthorized();
          return;
        }
        setStatus(error.message, 'error');
      }
    } : null, 'user'); // Profil icin on kamera
  }
});

profilePhotoInput.addEventListener('change', async () => {
  const file = profilePhotoInput.files && profilePhotoInput.files[0];
  if (!file) {
    return;
  }
  if (state.sessionMode !== 'auth' || !state.user) {
    clearProfilePhotoInput();
    setStatus('Misafir modunda profil fotografi kullanilamaz.', 'error');
    return;
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    clearProfilePhotoInput();
    setStatus('Profil fotografi en fazla 5MB olabilir.', 'error');
    return;
  }

  try {
    const body = new FormData();
    body.append('photo', file);
    const result = await request('/api/auth/profile-photo', { method: 'PATCH', body, auth: true });
    state.user = result.user;
    showApp();
    setStatus('Profil fotografi guncellendi.', 'success');
  } catch (error) {
    if (error.status === 401) { handleUnauthorized(); return; }
    setStatus(error.message, 'error');
  } finally {
    clearProfilePhotoInput();
  }
  // Inputu temizle ki ayni dosya tekrar secilebilsin (iptal durumunda vs)
  profilePhotoInput.value = '';
});

removeProfilePhotoBtn.addEventListener('click', async () => {
  if (state.sessionMode !== 'auth' || !state.user) {
    return;
  }

  try {
    const result = await request('/api/auth/profile-photo', {
      method: 'DELETE',
      auth: true
    });
    state.user = result.user;
    showApp();
    setStatus('Profil fotografi silindi.', 'success');
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message, 'error');
  }
});

editProfileBtn.addEventListener('click', () => {
  openProfileEditModal();
});

let isProgrammaticClick = false;
photoInput.addEventListener('click', (e) => {
  if (isProgrammaticClick) {
    isProgrammaticClick = false;
    return;
  }
  e.preventDefault();
  const hasFile = photoInput.files && photoInput.files.length > 0;
  openPhotoSelection((captureMode) => {
    if (captureMode) {
      photoInput.setAttribute('capture', captureMode);
    } else {
      photoInput.removeAttribute('capture');
    }
    isProgrammaticClick = true;
    photoInput.click();
  }, hasFile ? () => {
    clearPhotoSelection();
  } : null, 'environment'); // Gorev icin arka kamera
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files && photoInput.files[0];
  if (file) {
    state.pendingTaskPhoto = file;
    photoName.textContent = file.name;
  } else {
    clearPhotoSelection();
  }
});

if (attachmentInput) {
  attachmentInput.addEventListener('change', () => {
    const file = attachmentInput.files && attachmentInput.files[0];
    if (file) {
      state.pendingTaskAttachment = file;
      if (attachmentName) {
        attachmentName.textContent = file.name;
      }
      return;
    }
    clearAttachmentSelection();
  });
}

backupExportBtn.addEventListener('click', async () => {
  try {
    await exportBackup();
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message || 'Yedek disa aktarilamadi.', 'error');
  }
});

backupImportInput.addEventListener('change', async () => {
  const file = backupImportInput.files && backupImportInput.files[0];
  if (!file) {
    return;
  }

  try {
    const rawText = await readTextFile(file);
    const parsed = JSON.parse(rawText);
    const rawItems = Array.isArray(parsed) ? parsed : parsed?.items;
    const normalizedItems = normalizeBackupItems(rawItems);
    const replace = window.confirm(
      'Tamam: mevcut gorevleri silip yedegi yukle. Iptal: mevcut gorevlerin ustune ekle.'
    );
    const mode = replace ? 'replace' : 'append';
    await importBackup(normalizedItems, mode);
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message || 'Yedek ice aktarilamadi.', 'error');
  } finally {
    backupImportInput.value = '';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  const dueDate = dueDateInput.value ? normalizeDueDate(dueDateInput.value) : null;
  const dueTimeRaw = dueTimeInput ? dueTimeInput.value : '';
  const dueTime = dueTimeRaw ? normalizeDueTime(dueTimeRaw) : null;
  const rawNoteValue = noteInput ? noteInput.value : '';
  const note = normalizeNoteText(rawNoteValue);
  const priority = normalizePriority(priorityInput.value);
  const recurrence = normalizeRecurrence(recurrenceInput.value);
  const tagsResult = parseTagInputValue(tagsInput.value);
  const file = state.pendingTaskPhoto || (photoInput.files && photoInput.files[0] ? photoInput.files[0] : null);
  const attachmentFile =
    state.pendingTaskAttachment || (attachmentInput && attachmentInput.files && attachmentInput.files[0] ? attachmentInput.files[0] : null);

  if (!text) {
    return;
  }
  if (!tagsResult.ok) {
    setStatus(tagsResult.error, 'error');
    return;
  }
  if (dueDateInput.value && !dueDate) {
    setStatus('Son tarih gecersiz.', 'error');
    return;
  }
  if (dueTimeRaw && !dueTime) {
    setStatus('Saat gecersiz.', 'error');
    return;
  }
  if (rawNoteValue.trim().length > MAX_NOTE_LENGTH) {
    setStatus(`Not en fazla ${MAX_NOTE_LENGTH} karakter olabilir.`, 'error');
    return;
  }

  if (file && file.size > MAX_PHOTO_SIZE_BYTES) {
    setStatus('Fotograf en fazla 5MB olabilir.', 'error');
    return;
  }
  if (attachmentFile && attachmentFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
    setStatus('Ek dosya en fazla 15MB olabilir.', 'error');
    return;
  }

  if (state.sessionMode === 'guest') {
    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await fileToDataUrl(file);
      }
      let attachmentUrl = null;
      if (attachmentFile) {
        attachmentUrl = await fileToDataUrl(attachmentFile);
      }

      state.todos.unshift({
        id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        completed: false,
        completed_at: null,
        image_url: imageUrl,
        attachment_url: attachmentUrl,
        attachment_name: attachmentFile ? attachmentFile.name : null,
        attachment_mime: attachmentFile ? attachmentFile.type || null : null,
        note,
        due_date: dueDate,
        due_time: dueTime,
        priority,
        tags: tagsResult.value,
        recurrence,
        sort_order: 0,
        created_at: new Date().toISOString()
      });

      saveGuestTodos();
      resetTodoFormFields();
      renderTodos();
      setStatus('Gorev eklendi (misafir modu).', 'success');
    } catch (error) {
      setStatus(error.message || 'Fotograf eklenemedi.', 'error');
    }
    return;
  }

  try {
    let body;
    if (file || attachmentFile) {
      body = new FormData();
      body.append('text', text);
      body.append('priority', priority);
      body.append('recurrence', recurrence);
      body.append('tags', JSON.stringify(tagsResult.value));
      if (dueDate) {
        body.append('due_date', dueDate);
      }
      if (dueTime) {
        body.append('due_time', dueTime);
      }
      if (note) {
        body.append('note', note);
      }
      if (file) {
        body.append('photo', file, 'task-photo.jpg');
      }
      if (attachmentFile) {
        body.append('attachment', attachmentFile, attachmentFile.name || 'ek-dosya');
      }
    } else {
      body = JSON.stringify({
        text,
        priority,
        recurrence,
        tags: tagsResult.value,
        due_date: dueDate,
        due_time: dueTime,
        note
      });
    }

    await request('/api/todos', {
      method: 'POST',
      body,
      auth: true
    });

    resetTodoFormFields();
    await loadTodos();
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message, 'error');
  }
});

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    setFilter(button.dataset.filter);
    renderTodos();
  });
});

tagFilterSelect.addEventListener('change', () => {
  setTagFilter(tagFilterSelect.value);
  renderTodos();
});

searchInput.addEventListener('input', () => {
  setSearchQuery(searchInput.value);
  renderTodos();
});

priorityFilterSelect.addEventListener('change', () => {
  setPriorityFilter(priorityFilterSelect.value);
  renderTodos();
});

dueFilterSelect.addEventListener('change', () => {
  setDueFilter(dueFilterSelect.value);
  renderTodos();
});

bulkModeBtn.addEventListener('click', () => {
  setBulkMode(!state.bulkMode);
  renderTodos();
});

bulkSelectAllBtn.addEventListener('click', () => {
  toggleSelectVisibleTodos();
});

bulkCompleteBtn.addEventListener('click', async () => {
  await completeSelectedTodos();
});

bulkDeleteBtn.addEventListener('click', async () => {
  await deleteSelectedTodos();
});

bulkCancelBtn.addEventListener('click', () => {
  setBulkMode(false);
  renderTodos();
});

reminderBtn.addEventListener('click', async () => {
  if (!isNotificationSupported()) {
    setStatus('Bu tarayici bildirim desteklemiyor.', 'error');
    return;
  }

  if (Notification.permission === 'denied') {
    setStatus('Bildirimler tarayicida engelli. Ayarlardan izin ver.', 'error');
    return;
  }

  if (Notification.permission !== 'granted') {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('Bildirim izni verilmedi.', 'error');
        updateReminderButton();
        return;
      }
      setReminderEnabled(true);
      startReminderLoop();
      runDueReminders(true);
      setStatus('Hatirlatmalar acildi.', 'success');
      return;
    } catch (_error) {
      setStatus('Bildirim izni alinamadi.', 'error');
      return;
    }
  }

  setReminderEnabled(!state.reminderEnabled);
  startReminderLoop();
  if (state.reminderEnabled) {
    runDueReminders(true);
    setStatus('Hatirlatmalar acildi.', 'success');
  } else {
    setStatus('Hatirlatmalar kapatildi.', 'success');
  }
});

document.addEventListener('visibilitychange', () => {
  updateReminderButton();
  if (document.visibilityState === 'visible') {
    runDueReminders();
  }
});

clearDoneBtn.addEventListener('click', async () => {
  const doneTodos = state.todos.filter((todo) => todo.completed);
  if (doneTodos.length === 0) {
    setStatus('Temizlenecek tamamlanan gorev yok.', 'error');
    return;
  }

  if (state.sessionMode === 'guest') {
    state.todos = state.todos.filter((todo) => !todo.completed);
    saveGuestTodos();
    renderTodos();
    setStatus('Tamamlanan gorevler temizlendi.', 'success');
    return;
  }

  try {
    await Promise.all(
      doneTodos.map((todo) =>
        request(`/api/todos/${todo.id}`, {
          method: 'DELETE',
          auth: true
        })
      )
    );
    setStatus('Tamamlanan gorevler temizlendi.', 'success');
    await loadTodos();
  } catch (error) {
    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    setStatus(error.message, 'error');
  }
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredPrompt = event;
  if (!appSection.hidden) {
    installBtn.hidden = false;
  }
});

installBtn.addEventListener('click', async () => {
  if (!state.deferredPrompt) {
    return;
  }

  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      setStatus('Cevrimdisi destek etkinlestirilemedi.', 'error');
    });
  });
}

async function bootstrap() {
  setAuthMode('login');
  syncScreenRoute();
  resetTaskListControls();
  updateReminderButton();
  resetTodoFormFields();
  clearProfilePhotoInput();

  if (state.token) {
    try {
      const result = await request('/api/auth/me', { auth: true });
      resetAdminPanelState();
      state.user = result.user;
      setSessionMode('auth');
      showApp();
      setStatus('Hos geldin, senkron acik.', 'success');
      await loadTodos();
      await loadShareStatus();
      return;
    } catch (_error) {
      saveToken(null);
      state.user = null;
    }
  }

  if (localStorage.getItem(GUEST_MODE_KEY) === '1') {
    setSessionMode('guest');
    showApp();
    setStatus('Misafir moduna hos geldin.', 'success');
    await loadTodos();
    return;
  }

  showAuth();
  renderTodos();
}

bootstrap();
