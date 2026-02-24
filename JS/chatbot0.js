// ================================================
// MOZAKER CHATBOT — chatbot.js (clean rewrite)
// ================================================

// ── State ────────────────────────────────────────
const state = {
  lang: localStorage.getItem('language') || 'en',
  theme: localStorage.getItem('theme') || 'light',
  user: null,
  chats: [],
  currentChatId: null,
  activeMenu: null,
  historyView: 'chats',
  isLoading: false,
};

// ── Translations ──────────────────────────────────
const i18n = {
  en: {
    brand:'Mozaker', hi:'Hi', there:'There', start:'Where should we start?',
    placeholder:'Ask Any Thing', newChat:'New Chat', chatHistory:'Chat History',
    starred:'Starred Chats', noChats:'No chats yet', noStarred:'No starred chats',
    settings:'Settings', profile:'Profile', language:'العربية', clearHistory:'Clear History',
    clearConfirm:'Clear all chat history?', logout:'Logout', guestUser:'Guest User',
    lightDark:'Light / Dark', loading:'Just A Sec…', loginRequired:'Please log in to start chatting.',
    untitled:'Untitled',
  },
  ar: {
    brand:'مذاكر', hi:'مرحباً', there:'بك', start:'من أين نبدأ؟',
    placeholder:'اسأل عن أي شيء', newChat:'محادثة جديدة', chatHistory:'سجل المحادثات',
    starred:'المحادثات المميزة', noChats:'لا توجد محادثات', noStarred:'لا توجد محادثات مميزة',
    settings:'الإعدادات', profile:'الملف الشخصي', language:'English', clearHistory:'مسح السجل',
    clearConfirm:'هل تريد مسح جميع المحادثات؟', logout:'تسجيل الخروج', guestUser:'مستخدم زائر',
    lightDark:'فاتح / داكن', loading:'لحظة واحدة…', loginRequired:'يرجى تسجيل الدخول للبدء.',
    untitled:'بدون عنوان',
  },
};
const t = key => i18n[state.lang][key] ?? key;

// ── DOM refs ──────────────────────────────────────
const $ = sel => document.querySelector(sel);
const el = {
  aside:        $('aside'),
  toggler:      $('#aside-toggler'),
  themeToggle:  $('#theme'),
  newChatBtn:   $('.new-chat'),
  historyBtn:   $('.chat-history'),
  starredBtn:   $('.starred-chats-btn'),
  settingBtn:   $('.setting'),
  profileBtn:   $('.profile'),
  mediaBtn:     $('.insert-media'),
  chatsPanel:   $('.chats'),
  starredPanel: $('.starred-chats'),
  startText:    $('.start-text'),
  messages:     $('.messages'),
  form:         $('form'),
  textarea:     $('form textarea'),
  h1:           $('h1'),
  nameSpan:     $('#Name'),
};

// ── Apply language ────────────────────────────────
function applyLang() {
  const isAr = state.lang === 'ar';
  document.documentElement.lang = state.lang;
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';

  if (el.h1)       el.h1.textContent = t('brand');
  if (el.nameSpan) {
    el.nameSpan.textContent = t('there');
    if (el.nameSpan.previousSibling) el.nameSpan.previousSibling.textContent = t('hi') + ' ';
  }
  if (el.textarea) el.textarea.placeholder = t('placeholder');
  const h3 = el.startText?.querySelector('h3');
  if (h3) h3.textContent = t('start');

  el.newChatBtn?.setAttribute('title', t('newChat'));
  el.historyBtn?.setAttribute('title', t('chatHistory'));
  el.starredBtn?.setAttribute('title', t('starred'));
  el.settingBtn?.setAttribute('title', t('settings'));
  el.profileBtn?.setAttribute('title', t('profile'));
  $('h2')?.normalize();

  const ch2 = el.chatsPanel?.querySelector('h2');
  if (ch2) ch2.textContent = t('chatHistory');
  const sh2 = el.starredPanel?.querySelector('h2');
  if (sh2) sh2.textContent = t('starred');

  renderHistory();
}

// ── Apply theme ───────────────────────────────────
let vantaEffect = null;

// applyTheme only handles CSS — never touches Vanta directly.
// This way it's safe to call at any time regardless of whether Vanta has loaded.
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
  // If Vanta is already running, update its background colour immediately.
  // If not, initVanta() will pick up state.theme when it eventually loads.
  if (vantaEffect) {
    vantaEffect.destroy();
    vantaEffect = null;
    startVanta();
  }
}

// startVanta reads state.theme so it always uses the current colour.
function startVanta() {
  const bg = state.theme === 'light' ? 0xebebeb : 0x151718 ;
  vantaEffect = VANTA.RINGS({
    el: 'body', mouseControls: true, touchControls: true,
    gyroControls: false, minHeight: 200, minWidth: 200,
    backgroundColor: bg, color: 0x748463
  });
}

// initVanta is called once on boot. Retries until the CDN script is ready.
function initVanta() {
  if (typeof VANTA === 'undefined' || typeof THREE === 'undefined') {
    setTimeout(initVanta, 200);
    return;
  }
  startVanta();
}

// ── Sidebar ───────────────────────────────────────
function initSidebar() {
  const wide = window.innerWidth >= 1024;
  if (wide) {
    el.aside?.classList.remove('hidden');
  }
  if (!wide && el.toggler) {
    el.toggler.addEventListener('click', () => {
      const open = !el.toggler.classList.contains('hide');
      if (open) {
        el.toggler.classList.add('hide');
        el.aside.style.transform = 'translateX(-100%)';
        el.aside.style.opacity = '0';
        setTimeout(() => { el.aside.classList.remove('flex'); el.aside.classList.add('hidden'); }, 300);
      } else {
        el.toggler.classList.remove('hide');
        el.aside.classList.remove('hidden');
        el.aside.classList.add('flex');
        setTimeout(() => { el.aside.style.transform = 'translateX(0)'; el.aside.style.opacity = '1'; }, 10);
      }
    });
  }
}

// ── Menu system ───────────────────────────────────
// Each menu is one <div data-menu="name"> appended once to <body>.
// We toggle the .hidden class — CSS does the rest (position:fixed, bg, border, etc.)
// Content is refreshed via innerHTML each open. Listeners live on the container (delegation).

function closeMenus() {
  document.querySelectorAll('[data-menu]').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active-btn'));
  el.mediaBtn?.classList.remove('active-btn');
  state.activeMenu = null;
}

function openMenu(name, trigger) {
  if (state.activeMenu === name) { closeMenus(); return; }
  closeMenus();
  state.activeMenu = name;
  const menu = document.querySelector('[data-menu="' + name + '"]');
  if (!menu) return;
  menu.classList.remove('hidden');
  trigger.classList.add('active-btn');
  // Position: CSS sets inset-inline-start. JS sets top.
  requestAnimationFrame(() => {
    const r = trigger.getBoundingClientRect();
    let top = r.top;
    const maxTop = window.innerHeight - menu.offsetHeight - 10;
    if (top > maxTop) top = maxTop;
    if (top < 10) top = 10;
    menu.style.top = top + 'px';
  });
}

function makeMenu(name) {
  const div = document.createElement('div');
  div.setAttribute('data-menu', name);
  div.classList.add('hidden');
  document.body.appendChild(div);
  return div;
}

// Settings menu
function initSettingsMenu() {
  if (!el.settingBtn) return;
  const menu = makeMenu('settings');

  // Delegated listener — attached once, never duplicated
  menu.addEventListener('click', async e => {
    const row = e.target.closest('[data-action]');
    if (!row) return;
    if (row.dataset.action === 'lang') {
      state.lang = state.lang === 'en' ? 'ar' : 'en';
      localStorage.setItem('language', state.lang);
      closeMenus();
      applyLang();
    } else if (row.dataset.action === 'clear') {
      if (!confirm(t('clearConfirm'))) return;
      closeMenus();
      const tok = getToken();
      if (tok) {
        const api = new ChatAPI(); api.setToken(tok);
        for (const c of state.chats) { try { await api.deleteChat(c.id); } catch(_){} }
      }
      state.chats = []; state.currentChatId = null;
      el.messages && (el.messages.innerHTML = '');
      el.startText?.classList.remove('hidden');
      renderHistory();
    }
  });

  el.settingBtn.addEventListener('click', e => {
    e.stopPropagation();
    menu.innerHTML =
      '<div class="menu-header">'  + t('settings') + '</div>' +
      '<div class="menu-separator"></div>' +
      '<div class="setting-item" data-action="lang"><span>🌐</span><span>' + t('language') + '</span></div>' +
      '<div class="menu-separator"></div>' +
      '<div class="setting-item" data-action="clear"><span>🗑️</span><span>' + t('clearHistory') + '</span></div>';
    openMenu('settings', el.settingBtn);
  });
}

// Profile menu
function initProfileMenu() {
  if (!el.profileBtn) return;
  const menu = makeMenu('profile');

  menu.addEventListener('click', e => {
    if (e.target.closest('[data-action="logout"]')) {
      localStorage.clear();
      window.location.href = 'signin.html';
    }
  });

  el.profileBtn.addEventListener('click', e => {
    e.stopPropagation();
    const name  = state.user?.name  || t('guestUser');
    const email = state.user?.email || 'guest@mozaker.com';
    menu.innerHTML =
      '<div class="menu-header">' + t('profile') + '</div>' +
      '<div class="profile-item"><span>👤</span><div>' +
        '<div>' + name + '</div>' +
        '<div class="text-xs opacity-60">' + email + '</div>' +
      '</div></div>' +
      '<div class="menu-separator"></div>' +
      '<div class="profile-item" data-action="logout"><span>🚪</span><span>' + t('logout') + '</span></div>';
    openMenu('profile', el.profileBtn);
  });
}

// Close on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('[data-menu]') &&
      !e.target.closest('.menu-btn') &&
      !e.target.closest('.insert-media') &&
      !e.target.closest('.chat-history') &&
      !e.target.closest('.starred-chats-btn')) {
    closeMenus();
  }
});

// Reposition on resize
window.addEventListener('resize', () => {
  if (state.activeMenu) {
    const menu = document.querySelector('[data-menu="' + state.activeMenu + '"]');
    const triggers = { settings: el.settingBtn, profile: el.profileBtn, media: el.mediaBtn };
    const trg = triggers[state.activeMenu];
    if (menu && trg && !menu.classList.contains('hidden')) {
      const r = trg.getBoundingClientRect();
      let top = r.top;
      const max = window.innerHeight - menu.offsetHeight - 10;
      menu.style.top = Math.max(10, Math.min(top, max)) + 'px';
    }
  }
  if (window.innerWidth >= 1024) {
    el.aside?.classList.remove('hidden');
    el.toggler?.classList.remove('hide');
    if (el.aside) {
      el.aside.style.transform = 'translateX(0)';  
      el.aside.style.opacity = '1';
    }
  } else {
    el.aside?.classList.add('hidden');
    el.toggler?.classList.add('hide');
    if (el.aside) {
      el.aside.style.transform = 'translateX(-100%)';
      el.aside.style.opacity = '0';
    }
  }
});

// ── History view ──────────────────────────────────
function switchView(view) {
  state.historyView = view;
  el.historyBtn?.classList.toggle('active-btn', view === 'chats');
  el.starredBtn?.classList.toggle('active-btn', view === 'starred');

  const hide = view === 'chats' ? el.starredPanel : el.chatsPanel;
  const show = view === 'chats' ? el.chatsPanel   : el.starredPanel;
  hide?.classList.add('hidden');
  show?.classList.remove('hidden');

  renderHistory();
}

el.historyBtn?.addEventListener('click', () => switchView('chats'));
el.starredBtn?.addEventListener('click', () => switchView('starred'));

// ── Render history ────────────────────────────────
function renderHistory() {
  // All chats list
  const allList = el.chatsPanel?.querySelector('.chats-list') || el.chatsPanel;
  if (allList) {
    if (!state.chats.length) {
      allList.innerHTML = '<span class="no-chats text-sm">' + t('noChats') + '</span>';
    } else {
      allList.innerHTML = state.chats.map((c, i) => chatItemHTML(c, i, c.isStarred)).join('');
      allList.querySelectorAll('.history-item').forEach(item =>
        item.addEventListener('click', e => {
          if (e.target.closest('.star-btn')) return;
          loadChat(parseInt(item.dataset.index));
        })
      );
      allList.querySelectorAll('.star-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); toggleStar(btn.dataset.id); })
      );
    }
  }

  // Starred list
  const starred = state.chats.filter(c => c.isStarred);
  const starList = el.starredPanel?.querySelector('.chats-list') || el.starredPanel;
  if (starList) {
    if (!starred.length) {
      starList.innerHTML = '<span class="no-chats-text text-sm">' + t('noStarred') + '</span>';
    } else {
      starList.innerHTML = starred.map(c => {
        const idx = state.chats.findIndex(x => x.id === c.id);
        return chatItemHTML(c, idx, true);
      }).join('');
      starList.querySelectorAll('.history-item').forEach(item =>
        item.addEventListener('click', e => {
          if (e.target.closest('.star-btn')) return;
          loadChat(parseInt(item.dataset.index));
        })
      );
      starList.querySelectorAll('.star-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); toggleStar(btn.dataset.id); })
      );
    }
  }
}

function chatItemHTML(conv, index, starred) {
  const active = state.currentChatId === conv.id ? 'active-item' : '';
  const date   = new Date(conv.timestamp).toLocaleDateString();
  const title  = conv.title || t('untitled');
  return (
    '<div class="history-item ' + active + '" data-index="' + index + '" style="cursor:pointer;padding:.5rem;border-radius:6px;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:.5rem;">' +
      '<div style="flex:1;min-width:0;">' +
        '<div class="font-medium truncate text-sm">' + title + '</div>' +
        '<div class="text-xs opacity-60">' + date + '</div>' +
      '</div>' +
      '<button class="star-btn" data-id="' + conv.id + '" style="background:none;border:none;cursor:pointer;padding:4px;font-size:1rem;flex-shrink:0;color:' + (starred ? '#f59e0b' : 'currentColor') + ';opacity:' + (starred ? '1' : '.35') + ';">' + (starred ? '★' : '☆') + '</button>' +
    '</div>'
  );
}

async function toggleStar(chatId) {
  const chat = state.chats.find(c => String(c.id) === String(chatId));
  if (!chat) return;
  chat.isStarred = !chat.isStarred;
  renderHistory();
  const tok = getToken();
  if (tok) {
    try { const api = new ChatAPI(); api.setToken(tok); await api.toggleStar(chatId); }
    catch(e) { console.error(e); chat.isStarred = !chat.isStarred; renderHistory(); }
  }
}

// ── Load a saved conversation ─────────────────────
async function loadChat(index) {
  const conv = state.chats[index];
  if (!conv) return;
  state.currentChatId = conv.id;
  el.startText?.classList.add('hidden');
  el.messages && (el.messages.innerHTML = '');
  closeMenus();

  const tok = getToken();
  if (!tok) return;
  try {
    const api = new ChatAPI(); api.setToken(tok);
    const data = await api.getChat(conv.id);
    (data.chat?.messages || []).forEach(msg => {
      if (msg.role === 'user') {
        const d = msgEl('<img src="https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&accessoriesType=Prescription02&hairColor=BrownDark&facialHairType=BeardLight&facialHairColor=BrownDark&clotheType=CollarSweater&clotheColor=Gray01&eyeType=Default&eyebrowType=Default&mouthType=Twinkle&skinColor=Light" alt="User"/><p class="message-text"></p>', 'user');
        d.querySelector('.message-text').textContent = msg.text;
        el.messages.appendChild(d);
      } else {
        const d = msgEl('<img src="images/favicon.ico" alt="Mozaker"/><div class="message-text prose-content"></div>', 'bot');
        d.querySelector('.message-text').innerHTML = parseMarkdown(msg.text);
        el.messages.appendChild(d);
      }
    });
    el.messages.scrollTop = el.messages.scrollHeight;
  } catch(e) { console.error(e); }
  renderHistory();
}

// ── New chat button ───────────────────────────────
el.newChatBtn?.addEventListener('click', () => {
  state.currentChatId = null;
  el.messages && (el.messages.innerHTML = '');
  el.startText?.classList.remove('hidden');
  closeMenus();
});

// ── Auth ──────────────────────────────────────────
function getToken() { return localStorage.getItem('authToken'); }

async function init() {
  applyLang();
  // Theme CSS applied at boot (line below), Vanta started separately via initVanta()

  const tok  = getToken();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!tok || !user) {
    state.user = { name: t('guestUser'), email: 'guest@mozaker.com' };
    localStorage.setItem('user', JSON.stringify(state.user));
    document.body.style.display = 'block';
    return;
  }

  try {
    const res  = await fetch('http://localhost:5000/api/auth/me', { headers:{'Authorization':'Bearer '+tok}, credentials:'include' });
    const data = await res.json();
    if (data.success) {
      state.user = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      await loadHistory();
    } else throw new Error();
  } catch {
    state.user = user;
  }
  document.body.style.display = 'block';
}

async function loadHistory() {
  try {
    const tok = getToken(); if (!tok) return;
    const api = new ChatAPI(); api.setToken(tok);
    const data = await api.getAllChats();
    state.chats = (data.chats || []).map(c => ({ 
      ...c,
      isStarred: !!(c.isStarred ?? c.starred ?? c.is_starred ?? false),
    }));
    renderHistory();
  } catch(e) { console.error(e); }
}

// ── Theme toggle ──────────────────────────────────
el.themeToggle?.addEventListener('change', () =>
  applyTheme(state.theme === 'light' ? 'dark' : 'light')
);

// ── Chat submit ───────────────────────────────────
function msgEl(html, ...cls) {
  const d = document.createElement('div');
  d.classList.add('message', ...cls);
  d.innerHTML = html;
  return d;
}

el.form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (state.isLoading) return;
  const text = el.textarea.value.trim();
  if (!text) return;

  state.isLoading = true;
  el.textarea.value = '';
  el.textarea.disabled = true;
  el.startText?.classList.add('hidden');

  // User bubble
  const uDiv = msgEl('<img src="https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&accessoriesType=Prescription02&hairColor=BrownDark&facialHairType=BeardLight&facialHairColor=BrownDark&clotheType=CollarSweater&clotheColor=Gray01&eyeType=Default&eyebrowType=Default&mouthType=Twinkle&skinColor=Light" alt="User"/><p class="message-text"></p>', 'user');
  uDiv.querySelector('.message-text').textContent = text;
  el.messages.appendChild(uDiv);
  el.messages.scrollTop = el.messages.scrollHeight;

  // Bot bubble
  const bDiv = msgEl('<img src="images/favicon.ico" alt="Mozaker"/><div class="message-text prose-content"></div>', 'bot', 'loading');
  const bText = bDiv.querySelector('.message-text');
  bText.textContent = t('loading');
  el.messages.appendChild(bDiv);
  el.messages.scrollTop = el.messages.scrollHeight;

  try {
    const tok = getToken();
    if (!tok) { bDiv.classList.remove('loading'); bText.textContent = '⚠️ ' + t('loginRequired'); return; }

    const api = new ChatAPI(); api.setToken(tok);

    if (!state.currentChatId) {
      const created = await api.createChat(text);
      state.currentChatId = created.chatId;
      state.chats.unshift({ id:state.currentChatId, title:text.slice(0,60), timestamp:new Date().toISOString(), isStarred:false, messages:[] });
      renderHistory();
    }

    const result = await api.sendMessage(state.currentChatId, text);
    bDiv.classList.remove('loading');
    typewriter(bText, result.response, () => {
      const c = state.chats.find(x => x.id === state.currentChatId);
      if (c) c.timestamp = new Date().toISOString();
      renderHistory();
    });
  } catch(err) {
    bDiv.classList.remove('loading');
    bText.textContent = '⚠️ ' + (err.message || 'Something went wrong.');
    console.error(err);
  } finally {
    state.isLoading = false;
    el.textarea.disabled = false;
    el.textarea.focus();
  }
});

// ── Typewriter ────────────────────────────────────
function typewriter(container, text, done) {
  let i = 0;
  const cursor = Object.assign(document.createElement('span'), { className:'typing-cursor' });
  container.innerHTML = '';
  (function tick() {
    if (i < text.length) {
      i = Math.min(i + 8, text.length);
      container.innerHTML = '';
      container.appendChild(document.createTextNode(text.slice(0, i)));
      container.appendChild(cursor);
      el.messages.scrollTop = el.messages.scrollHeight;
      setTimeout(tick, 16);
    } else {
      container.innerHTML = parseMarkdown(text);
      el.messages.scrollTop = el.messages.scrollHeight;
      done?.();
    }
  })();
}

// ── Markdown ──────────────────────────────────────
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function inlineMd(s) {
  return esc(s)
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/__(.+?)__/g,'<strong>$1</strong>')
    .replace(/_(.+?)_/g,'<em>$1</em>')
    .replace(/~~(.+?)~~/g,'<del>$1</del>')
    .replace(/`([^`]+)`/g,'<code class="md-inline-code">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g,'<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function parseMarkdown(raw) {
  if (!raw) return '';
  const lines = raw.split('\n');
  const out = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // fenced code
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim() || 'plaintext'; const code = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; } i++;
      out.push('<div class="md-code-block"><div class="md-code-header"><span class="md-code-lang">'+lang+'</span><button class="md-copy-btn" onclick="copyCode(this)">Copy</button></div><pre><code>'+esc(code.join('\n'))+'</code></pre></div>');
      continue;
    }
    // table
    if (/^\|/.test(line)) {
      const rows = []; while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const isSep = r => /^\|[\s\-:|]+\|$/.test(r.trim());
      const parseRow = r => r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      if (rows.length >= 2) {
        const heads = parseRow(rows[0]);
        let body = rows.slice(1); if (isSep(body[0])) body = body.slice(1);
        let html = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
        heads.forEach(h => html += '<th>'+inlineMd(h)+'</th>');
        html += '</tr></thead><tbody>';
        body.forEach(r => { if(isSep(r)) return; html += '<tr>'; parseRow(r).forEach(c => html += '<td>'+inlineMd(c)+'</td>'); html += '</tr>'; });
        out.push(html + '</tbody></table></div>');
      }
      continue;
    }
    // headings
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) { const l=hm[1].length; out.push('<h'+l+' class="md-h'+l+'">'+inlineMd(hm[2])+'</h'+l+'>'); i++; continue; }
    // blockquote
    if (/^>\s?/.test(line)) {
      const ql = []; while (i < lines.length && /^>\s?/.test(lines[i])) { ql.push(lines[i].replace(/^>\s?/,'')); i++; }
      out.push('<blockquote class="md-blockquote">'+ql.map(inlineMd).join('<br>')+'</blockquote>');
      continue;
    }
    // hr
    if (/^(---|___|\*\*\*)$/.test(line.trim())) { out.push('<hr class="md-hr">'); i++; continue; }
    // unordered list
    if (/^\s*[-*+]\s/.test(line)) {
      const items = []; while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) { items.push('<li class="md-li">'+inlineMd(lines[i].replace(/^\s*[-*+]\s/,''))+'</li>'); i++; }
      out.push('<ul class="md-ul">'+items.join('')+'</ul>'); continue;
    }
    // ordered list
    if (/^\s*\d+\.\s/.test(line)) {
      const items = []; while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) { items.push('<li class="md-li">'+inlineMd(lines[i].replace(/^\s*\d+\.\s/,''))+'</li>'); i++; }
      out.push('<ol class="md-ol">'+items.join('')+'</ol>'); continue;
    }
    // blank line
    if (!line.trim()) { i++; continue; }
    // paragraph
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+\.\s|\||---|___|\*\*\*)/.test(lines[i])) { para.push(inlineMd(lines[i])); i++; }
    if (para.length) out.push('<p class="md-p">'+para.join('<br>')+'</p>');
  }
  return out.join('\n');
}

function copyCode(btn) {
  const code = btn.closest('.md-code-block').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(() => { btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy',2000); });
}

// ── Inject styles ─────────────────────────────────
function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    .prose-content{line-height:1.75;font-size:.95rem;max-width:100%;overflow-x:auto;word-break:break-word}
    .md-h1{font-size:1.6rem;font-weight:700;margin:.9rem 0 .5rem;border-bottom:2px solid rgba(116,132,99,.35);padding-bottom:.3rem}
    .md-h2{font-size:1.3rem;font-weight:700;margin:.8rem 0 .4rem;border-bottom:1px solid rgba(116,132,99,.2);padding-bottom:.2rem}
    .md-h3{font-size:1.1rem;font-weight:600;margin:.7rem 0 .3rem}
    .md-h4,.md-h5,.md-h6{font-size:1rem;font-weight:600;margin:.5rem 0 .2rem}
    .md-p{margin:.4rem 0}
    .md-ul,.md-ol{margin:.5rem 0 .5rem 1.5rem;padding:0}
    .md-ul{list-style:disc}.md-ol{list-style:decimal}.md-li{margin:.2rem 0}
    .md-blockquote{border-inline-start:4px solid #748463;margin:.6rem 0;padding:.4rem 1rem;font-style:italic;background:rgba(116,132,99,.07);border-radius:0 8px 8px 0}
    .md-hr{border:none;border-top:2px solid rgba(116,132,99,.25);margin:1rem 0}
    .md-inline-code{background:rgba(116,132,99,.15);color:#748463;padding:.1rem .4rem;border-radius:4px;font-family:monospace;font-size:.87em}
    html.dark .md-inline-code{background:rgba(116,132,99,.25);color:#a0b890}
    .md-link{color:hsl(215,100%,45%);text-decoration:underline}
    .md-code-block{margin:.75rem 0;border-radius:10px;overflow:hidden;border:1px solid rgba(116,132,99,.2);background:#1a1e1b}
    .md-code-header{display:flex;justify-content:space-between;align-items:center;padding:.4rem 1rem;background:#0f1210;border-bottom:1px solid rgba(255,255,255,.06)}
    .md-code-lang{font-size:.72rem;color:#748463;font-family:monospace;text-transform:uppercase;letter-spacing:.07em}
    .md-copy-btn{background:rgba(116,132,99,.2);color:#a0b090;border:none;padding:.2rem .6rem;border-radius:5px;font-size:.72rem;cursor:pointer}
    .md-copy-btn:hover{background:rgba(116,132,99,.4)!important}
    .md-code-block pre{margin:0;padding:1rem;overflow-x:auto}
    .md-code-block code{font-family:monospace;font-size:.87rem;color:#d4e0c8;line-height:1.65;white-space:pre}
    .md-table-wrapper{overflow-x:auto;margin:.75rem 0;border-radius:10px;border:1px solid rgba(116,132,99,.22)}
    .md-table{width:100%;border-collapse:collapse;font-size:.9rem}
    .md-table th{background:rgba(116,132,99,.15);padding:.5rem 1rem;font-weight:600;border-bottom:2px solid rgba(116,132,99,.25);text-align:start}
    .md-table td{padding:.5rem 1rem;border-bottom:1px solid rgba(116,132,99,.1)}
    .md-table tr:last-child td{border-bottom:none}
    .md-table tr:hover td{background:rgba(116,132,99,.05)}
    .typing-cursor{display:inline-block;width:2px;height:1em;background:currentColor;margin-inline-start:2px;vertical-align:text-bottom;animation:blink .65s steps(1) infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  `;
  document.head.appendChild(s);
}

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  injectStyles();
  initSidebar();
  initSettingsMenu();
  initProfileMenu();
  if (typeof setupFileUploadMenu === "function") setupFileUploadMenu();
  switchView('chats');
  init();
  initVanta();
});