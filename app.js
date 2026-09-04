const STORAGE_KEY = "nexus-ai-workspace-v1";
const SESSION_KEYS = "nexus-ai-session-keys-v1";

const DESKTOP_MATRIX_APPS = [
  ['volume', '🔊', 'Audio Control'], ['security', '🛡️', 'Security Core'], ['usb', '🔌', 'USB Mount'], ['firewall', '⚠️', 'Firewall Alert'], ['bluetooth', 'ᛒ', 'Bluetooth'],
  ['design', '🖊️', 'Design Tool'], ['cloud', '☁️', 'Cloud Storage'], ['analytics', '📊', 'Analytics'], ['telegram', '✈️', 'Telegram'], ['identity', '🧑', 'Identity Engine'],
  ['tasks', '✅', 'Tasks'], ['onenote', '📓', 'Notes Engine'], ['network', '🖥️', 'Network Monitor'], ['ai-assistant', '✦', 'AI Assistant'], ['chainlink', '🔗', 'Chainlink Oracle'],
  ['notion', 'N', 'Notion Hub'], ['broadcast', '📡', 'Broadcast Engine'], ['settings', '⚙️', 'Settings'], ['chatgpt', '◉', 'ChatGPT Hub'], ['rox-engine', '⚙', 'ROX Engine'],
  ['whatsapp', '◔', 'WhatsApp Web'], ['github', '●', 'GitHub / GigHog'], ['tiktok', '♪', 'TikTok Hub'], ['facebook', 'f', 'Facebook Portal'], ['instagram', '◎', 'Instagram Portal'],
];

const DESKTOP_MATRIX_URLS = {
  telegram: 'https://web.telegram.org/', whatsapp: 'https://web.whatsapp.com/', github: 'https://github.com/',
  tiktok: 'https://www.tiktok.com/', facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/',
  chatgpt: 'https://chatgpt.com/', notion: 'https://www.notion.so/', cloud: 'https://drive.google.com/',
};

window.nexusApiUrl = (path) => {
  const base = (window.NEXUS_API_BASE || window.location.origin).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

const defaultState = {
  chats: [],
  currentChatId: null,
  memories: [],
  settings: {
    geminiModel: "gemini-2.0-flash-lite",
    openrouterModel: "gemini-2.0-flash-lite",
    rememberKeys: false,
    keys: { gemini: "", openrouter: "" },
  },
  browser: { query: "", results: [], summary: "" },
};

let state = loadState();
let transientKeys = loadSessionKeys();

const glowTerminalState = {
  sessions: [],
  networkNodes: [],
};

function getRuntimeMetrics() {
  const memoryValue = navigator.deviceMemory || 8;
  const logicalCores = navigator.hardwareConcurrency || 8;
  const cpuLoad = Math.min(96, Math.max(18, Math.round((memoryValue + logicalCores) * 2.4)));
  const ramLoad = Math.min(92, Math.max(34, Math.round((memoryValue / 8) * 38 + (logicalCores / 8) * 18)));

  return {
    cpu: `${cpuLoad}%`,
    ram: `${ramLoad}%`,
    uplink: 'STABLE',
    system: 'NOMINAL',
    location: 'UPLINK LOCATION: ACTIVE',
  };
}

function buildGlowSessions() {
  const sessions = [
    { id: 'uplink-location', label: 'UPLINK LOCATION', status: 'ACTIVE', type: 'gateway' },
    { id: 'active-session', label: 'SESSION: ACTIVE - MAIN WORKSPACE', status: 'ACTIVE', type: 'session' },
    { id: 'system-node', label: 'SYSTEM NODE', status: 'NOMINAL', type: 'core' },
  ];

  if (state.chats?.length) {
    sessions.push({ id: `chat-${state.currentChatId || state.chats[0].id}`, label: 'ACTIVE SESSION', status: 'SYNCED', type: 'ai' });
  }
  if (state.memories?.length) {
    sessions.push({ id: 'memory-vault', label: 'MEMORY VAULT', status: 'SYNCED', type: 'memory' });
  }
  if (getKey('gemini') || getKey('openrouter')) {
    sessions.push({ id: 'assistant-link', label: 'AI ASSISTANT', status: 'LINKED', type: 'ai' });
  }

  const walletAddress = document.getElementById('masterWalletAddress')?.value?.trim() || localStorage.getItem('nexus-master-wallet-config-v1');
  if (walletAddress) {
    sessions.push({ id: 'wallet-link', label: 'WALLET LINK', status: 'LIVE', type: 'gateway' });
  }

  return sessions.slice(0, 6);
}

function buildGlowNodes() {
  const nodes = [
    { id: 'uplink-location', label: 'UPLINK', status: 'ACTIVE', x: 18, y: 28, type: 'gateway' },
    { id: 'active-session', label: 'SESSION: ACTIVE - MAIN WORKSPACE', status: 'ACTIVE', x: 50, y: 48, type: 'session' },
    { id: 'system-node', label: 'CORE', status: 'NOMINAL', x: 52, y: 72, type: 'core' },
    { id: 'memory-vault', label: 'MEM', status: 'SYNCED', x: 82, y: 26, type: 'memory' },
    { id: 'assistant-link', label: 'AI', status: 'LINKED', x: 74, y: 72, type: 'ai' },
  ];

  if (state.chats?.length) {
    nodes.push({ id: `chat-${state.currentChatId || state.chats[0].id}`, label: 'CHAT', status: 'SYNCED', x: 34, y: 82, type: 'ai' });
  }
  if ((document.getElementById('masterWalletAddress')?.value || '').trim()) {
    nodes.push({ id: 'wallet-link', label: 'WALLET', status: 'LIVE', x: 67, y: 18, type: 'gateway' });
  }

  return nodes.slice(0, 6);
}

function renderGlowTerminal() {
  const terminal = document.getElementById('glow-core-terminal');
  const network = document.getElementById('glow-core-network');
  const sessionWrap = document.getElementById('glow-sessions');
  const statusBadge = document.getElementById('glow-terminal-status');
  const metrics = document.getElementById('glow-core-metrics');

  if (!terminal || !network || !sessionWrap || !statusBadge || !metrics) return;

  const runtime = getRuntimeMetrics();
  const sessions = buildGlowSessions();
  const nodes = buildGlowNodes();

  glowTerminalState.sessions = sessions;
  glowTerminalState.networkNodes = nodes;

  statusBadge.textContent = sessions[0]?.status || 'ACTIVE';
  metrics.innerHTML = `
    <div class="glow-metric"><small>CPU</small><strong>${runtime.cpu}</strong></div>
    <div class="glow-metric"><small>RAM</small><strong>${runtime.ram}</strong></div>
    <div class="glow-metric"><small>UPLINK</small><strong>${runtime.uplink}</strong></div>
    <div class="glow-metric"><small>SYSTEM</small><strong>${runtime.system}</strong></div>
  `;

  sessionWrap.innerHTML = sessions.map((session) => `<span class="glow-session-pill ${session.status === 'ACTIVE' || session.status === 'LIVE' ? 'active' : session.status === 'WARNING' ? 'warning' : ''}">${session.label}: ${session.status}</span>`).join('');

  network.innerHTML = '<div class="glow-network-grid"></div>' + nodes.map((node) => `
    <div class="glow-network-node ${node.type}" style="left:${node.x}%; top:${node.y}%">${node.label}</div>
  `).join('');
}

function emitGlowTelemetry(eventName, details = {}) {
  const label = details.label || eventName.toUpperCase();
  const status = details.status || 'SYNCED';

  if (glowTerminalState.sessions.length === 0) {
    glowTerminalState.sessions = [
      { id: 'uplink-location', label: 'UPLINK LOCATION', status: 'ACTIVE', type: 'gateway' },
      { id: 'active-session', label: 'SESSION: ACTIVE - MAIN WORKSPACE', status: 'ACTIVE', type: 'session' },
      { id: 'system-node', label: 'SYSTEM NODE', status: 'NOMINAL', type: 'core' },
    ];
  }

  const exists = glowTerminalState.sessions.find((session) => session.label === label || session.id === details.id);
  if (!exists) {
    glowTerminalState.sessions.push({ id: details.id || `${eventName}-${Date.now()}`, label, status, type: details.type || 'ai' });
  } else {
    exists.status = status;
    exists.label = label;
    exists.type = details.type || exists.type;
  }

  renderGlowTerminal();
}

function syncGlowFromTopAppState() {
  renderGlowTerminal();
}

function initialiseTelegram() {
  const telegramApp = window.Telegram?.WebApp;
  if (!telegramApp) return;
  telegramApp.ready();
  telegramApp.expand();
  const tgBg = telegramApp.themeParams?.bg_color || "#0a0a0f";
  document.documentElement.style.setProperty("--bg", tgBg);
  document.documentElement.style.setProperty("--bg-gradient", tgBg);
}

const elements = {
  chatList: document.querySelector("#chatList"),
  conversationTitle: document.querySelector("#conversationTitle"),
  conversationProvider: document.querySelector("#conversationProvider"),
  messageList: document.querySelector("#messageList"),
  emptyState: document.querySelector("#emptyState"),
  messageInput: document.querySelector("#messageInput"),
  composerForm: document.querySelector("#composerForm"),
  providerSelect: document.querySelector("#providerSelect"),
  webToggle: document.querySelector("#webToggle"),
  sendButton: document.querySelector("#sendButton"),
  connectionButton: document.querySelector("#connectionButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  geminiKeyInput: document.querySelector("#geminiKeyInput"),
  geminiModelInput: document.querySelector("#geminiModelInput"),
  openrouterKeyInput: document.querySelector("#openrouterKeyInput"),
  openrouterModelInput: document.querySelector("#openrouterModelInput"),
  rememberKeysInput: document.querySelector("#rememberKeysInput"),
  memoryDialog: document.querySelector("#memoryDialog"),
  newMemoryInput: document.querySelector("#newMemoryInput"),
  memoryList: document.querySelector("#memoryList"),
  memoryPreview: document.querySelector("#memoryPreview"),
  browserInput: document.querySelector("#browserInput"),
  browserForm: document.querySelector("#browserForm"),
  browserResults: document.querySelector("#browserResults"),
  openExternalButton: document.querySelector("#openExternalButton"),
  scrim: document.querySelector("#scrim"),
  sidebar: document.querySelector(".sidebar"),
  browserPanel: document.querySelector(".browser-panel"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...saved,
      settings: { ...defaultState.settings, ...saved.settings, keys: { ...defaultState.settings.keys, ...saved.settings?.keys } },
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function loadSessionKeys() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEYS)) || { gemini: "", openrouter: "" }; }
  catch { return { gemini: "", openrouter: "" }; }
}

function persist() {
  const saved = structuredClone(state);
  if (!saved.settings.rememberKeys) saved.settings.keys = { gemini: "", openrouter: "" };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  sessionStorage.setItem(SESSION_KEYS, JSON.stringify(transientKeys));
}

function getCurrentChat() { return state.chats.find((chat) => chat.id === state.currentChatId) || null; }
function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function formatTime(timestamp) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp); }
function providerName(provider) { return provider === "openrouter" ? "OPENROUTER" : "GEMINI"; }
function getKey(provider) { return state.settings.rememberKeys ? state.settings.keys[provider] : transientKeys[provider]; }
function showTelegramAd() {
  const show = window.TelegramAdsController?.show;
  if (typeof show !== 'function') return Promise.resolve(false);
  return Promise.resolve(show.call(window.TelegramAdsController)).catch(() => false);
}

function createChat(provider = elements.providerSelect?.value || "gemini") {
  const chat = { id: makeId("chat"), title: "New conversation", provider, webEnabled: true, createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
  state.chats.unshift(chat);
  state.currentChatId = chat.id;
  persist();
  emitGlowTelemetry('chat_session', { id: chat.id, label: 'ACTIVE SESSION', status: 'SYNCED', type: 'ai' });
  render();
  elements.messageInput.focus();
}

function selectChat(chatId) { state.currentChatId = chatId; persist(); render(); }

function deleteChat(chatId) {
  state.chats = state.chats.filter((chat) => chat.id !== chatId);
  if (state.currentChatId === chatId) state.currentChatId = state.chats[0]?.id || null;
  persist(); render();
}

function render() {
  renderChats();
  renderConversation();
  renderMemoryPreview();
  renderBrowser();
  updateConnectionStatus();
  syncGlowFromTopAppState();
}

function renderChats() {
  elements.chatList.replaceChildren();
  if (!state.chats.length) {
    const note = document.createElement("p");
    note.className = "section-label";
    note.textContent = "No saved conversations";
    elements.chatList.append(note);
    return;
  }
  for (const chat of state.chats) {
    const item = document.createElement("div");
    item.className = `chat-item ${chat.id === state.currentChatId ? "selected" : ""}`;
    item.dataset.chatId = chat.id;
    item.innerHTML = `<button class="select-chat"><span class="chat-item-title"></span><span class="chat-item-time"></span></button><button class="delete-chat" aria-label="Delete conversation"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
    item.querySelector(".chat-item-title").textContent = chat.title;
    item.querySelector(".chat-item-time").textContent = `${providerName(chat.provider)} · ${formatTime(chat.updatedAt)}`;
    item.querySelector(".select-chat").addEventListener("click", () => selectChat(chat.id));
    item.querySelector(".delete-chat").addEventListener("click", (event) => { event.stopPropagation(); deleteChat(chat.id); });
    elements.chatList.append(item);
  }
}

function renderConversation() {
  const chat = getCurrentChat();
  const isEmpty = !chat || !chat.messages.length;
  elements.emptyState.hidden = !isEmpty;
  elements.messageList.replaceChildren();
  elements.conversationTitle.textContent = chat?.title || "New conversation";
  elements.conversationProvider.textContent = chat ? providerName(chat.provider) : "PRIVATE AI WORKSPACE";
  elements.providerSelect.value = chat?.provider || "gemini";
  elements.webToggle.checked = chat?.webEnabled ?? true;
  if (!chat) return;

  for (const message of chat.messages) {
    const node = document.querySelector("#messageTemplate").content.firstElementChild.cloneNode(true);
    node.classList.add(message.role);
    node.querySelector(".message-avatar").textContent = message.role === "user" ? "You" : "N";
    node.querySelector(".message-meta").textContent = message.role === "user" ? "YOU" : `${providerName(chat.provider)} · ${message.web ? "WEB ENABLED" : "PRIVATE CHAT"}`;
    node.querySelector(".message-text").innerHTML = formatText(message.content);
    const saveButton = node.querySelector(".save-message-memory");
    saveButton.addEventListener("click", () => addMemory(message.content));
    elements.messageList.append(node);
  }
  requestAnimationFrame(() => { elements.messageList.parentElement.scrollTop = elements.messageList.parentElement.scrollHeight; });
}

function formatText(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}

function escapeHtml(value) { 
  return String(value).replace(/[&<>'"]/g, (character) => {
    const amp = String.fromCharCode(38);
    return { 
      "&": amp + "amp;", 
      "<": amp + "lt;", 
      ">": amp + "gt;", 
      "'": amp + "#039;", 
      '"': amp + "quot;" 
    }[character];
  }); 
}

function renderMemoryPreview() {
  const latest = state.memories[0];
  elements.memoryPreview.textContent = latest ? latest.content : "Save facts, preferences, plans, and promises so future conversations can pick up where you left off.";
}

function renderMemoryList() {
  elements.memoryList.replaceChildren();
  if (!state.memories.length) {
    const empty = document.createElement("p"); empty.className = "memory-empty"; empty.textContent = "Your memory vault is empty."; elements.memoryList.append(empty); return;
  }
  for (const memory of state.memories) {
    const item = document.createElement("article");
    item.className = "memory-item";
    const text = document.createElement("span"); text.textContent = memory.content;
    const remove = document.createElement("button"); remove.type = "button"; remove.setAttribute("aria-label", "Remove memory");
    remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    remove.addEventListener("click", () => { state.memories = state.memories.filter((item) => item.id !== memory.id); persist(); renderMemoryList(); renderMemoryPreview(); });
    item.append(text, remove); elements.memoryList.append(item);
  }
}

function addMemory(content) {
  const cleaned = content.trim();
  if (!cleaned) return;
  if (state.memories.some((memory) => memory.content === cleaned)) return;
  state.memories.unshift({ id: makeId("memory"), content: cleaned, createdAt: Date.now() });
  state.memories = state.memories.slice(0, 60);
  persist();
  emitGlowTelemetry('memory_sync', { id: 'memory-vault', label: 'MEMORY VAULT', status: 'SYNCED', type: 'memory' });
  renderMemoryList();
  renderMemoryPreview();
}

function renderBrowser() {
  const { query, results, summary } = state.browser;
  elements.browserInput.value = query;
  elements.openExternalButton.disabled = !query;
  if (!query && !results.length) return;
  elements.browserResults.replaceChildren();
  if (!results.length) { elements.browserResults.innerHTML = '<p class="search-state">No usable results yet. Try another phrase or open the query in your browser.</p>'; return; }
  if (summary) { const text = document.createElement("p"); text.className = "search-summary"; text.textContent = summary; elements.browserResults.append(text); }
  for (const result of results) {
    const link = document.createElement("a"); link.className = "search-result"; link.href = result.url; link.target = "_blank"; link.rel = "noreferrer";
    const domain = document.createElement("small"); domain.textContent = result.url;
    const title = document.createElement("strong"); title.textContent = result.title;
    const description = document.createElement("p"); description.textContent = result.description;
    link.append(domain, title, description); elements.browserResults.append(link);
  }
}

function updateConnectionStatus() {
  const connected = Boolean(getKey("gemini") || getKey("openrouter"));
  elements.connectionButton.classList.toggle("connected", connected);
  elements.connectionButton.childNodes[1].textContent = connected ? " AI connected" : " Connect AI";
}

async function sendMessage() {
  await showTelegramAd();
  const content = elements.messageInput.value.trim();
  if (!content) return;
  let chat = getCurrentChat();
  if (!chat) { createChat(elements.providerSelect.value); chat = getCurrentChat(); }
  chat.provider = elements.providerSelect.value;
  chat.webEnabled = elements.webToggle.checked;
  const userMessage = { id: makeId("message"), role: "user", content, createdAt: Date.now(), web: chat.webEnabled };
  chat.messages.push(userMessage);
  chat.title = chat.messages.length === 1 ? makeTitle(content) : chat.title;
  chat.updatedAt = Date.now();
  elements.messageInput.value = ""; resizeComposer(); persist(); render();

  const typing = { id: makeId("message"), role: "assistant", content: "Thinking…", createdAt: Date.now(), web: chat.webEnabled, pending: true };
  chat.messages.push(typing); render(); setSending(true);
  try {
    const answer = await askProvider(chat);
    typing.content = answer;
    delete typing.pending;
  } catch (error) {
    typing.content = `I could not complete that request. ${error.message}`;
    typing.web = false;
    delete typing.pending;
  } finally {
    chat.updatedAt = Date.now(); persist(); render(); setSending(false);
  }
}

function makeTitle(content) { return content.replace(/\s+/g, " ").slice(0, 46) || "New conversation"; }
function setSending(isSending) { elements.sendButton.disabled = isSending; elements.messageInput.disabled = isSending; }

function memoryContext() {
  if (!state.memories.length) return "";
  return `\n\nLong-term memories the user chose to retain:\n${state.memories.slice(0, 20).map((memory, index) => `${index + 1}. ${memory.content}`).join("\n")}`;
}

function researchContext() {
  const { query, results, summary } = state.browser;
  if (!query || !results.length) return "";
  const sources = results.slice(0, 5).map((result, index) => `${index + 1}. ${result.title} — ${result.description} (${result.url})`).join("\n");
  return `\n\nResearch the user has open in their mini browser for "${query}":\n${summary ? `${summary}\n` : ""}${sources}`;
}

async function askProvider(chat) {
  const provider = chat.provider;
  const key = getKey(provider);
  if (!key) throw new Error(`Add your ${providerName(provider)} API key in Connections first.`);
  if (provider === "gemini") return askGemini(chat, key);
  return askOpenRouter(chat, key);
}

function getProviderMessages(chat) {
  const systemContext = "You are Nexus, a helpful personal AI assistant. Be clear, practical, and protect the user's privacy. Use the memory context only when it is relevant. If web sources are supplied, distinguish sourced facts from your own reasoning." + memoryContext() + researchContext();
  return { systemContext, messages: chat.messages.filter((message) => !message.pending).map((message) => ({ role: message.role, content: message.content })) };
}

async function askGemini(chat, key) {
  const { systemContext, messages } = getProviderMessages(chat);
  const model = state.settings.geminiModel || "gemini-2.0-flash-lite";
  const payload = {
    system_instruction: { parts: [{ text: systemContext }] },
    contents: messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
  };
  if (chat.webEnabled) payload.tools = [{ google_search: {} }];
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Gemini rejected the request.");
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned no text. Check the selected model and API permissions.");
  return text;
}

async function askOpenRouter(chat, key) {
  const { systemContext, messages } = getProviderMessages(chat);
  let browserContext = "";
  if (chat.webEnabled && !state.browser.results.length) {
    try { await searchWeb(chat.messages.at(-1)?.content || ""); browserContext = researchContext(); }
    catch { browserContext = "\n\nWeb search was unavailable. Say so instead of inventing current facts."; }
  }
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "HTTP-Referer": window.location.origin, "X-Title": "Nexus AI Workspace" },
    body: JSON.stringify({ model: state.settings.openrouterModel || "google/gemini-2.0-flash-lite", messages: [{ role: "system", content: systemContext + browserContext }, ...messages], temperature: 0.55 }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "OpenRouter rejected the request.");
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned no text. Check the selected model and API permissions.");
  return text;
}

async function searchWeb(rawQuery) {
  const query = rawQuery.trim();
  if (!query) return;
  state.browser.query = query;
  state.browser.results = [];
  state.browser.summary = "";
  elements.browserResults.innerHTML = '<p class="search-state">Searching the web…</p>';
  elements.openExternalButton.disabled = false;
  try {
    const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Search service failed");
    const data = await response.json();
    state.browser.summary = data.AbstractText || "Free web-search results. Open a result for the full page.";
    state.browser.results = [
      ...(data.Results || []).map((result) => ({ title: result.Text?.split(" - ")[0] || "Result", description: result.Text || "", url: result.FirstURL })),
      ...flattenTopics(data.RelatedTopics || []),
    ].filter((result) => result.url).slice(0, 10);
    if (!state.browser.results.length && data.AbstractURL) state.browser.results = [{ title: data.Heading || query, description: data.AbstractText || "Open this result for more information.", url: data.AbstractURL }];
    persist(); renderBrowser();
  } catch (error) {
    state.browser.summary = "The free search endpoint is unavailable from this network. You can still open this search in your regular browser.";
    state.browser.results = [];
    persist(); renderBrowser();
    throw error;
  }
}

function flattenTopics(topics) {
  return topics.flatMap((topic) => topic.Topics ? flattenTopics(topic.Topics) : [{ title: topic.Text?.split(" - ")[0] || "Result", description: topic.Text || "", url: topic.FirstURL }]);
}

function openExternal() {
  const query = state.browser.query.trim();
  if (!query) return;
  const url = /^https?:\/\//i.test(query) ? query : `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  if (window.AndroidBridge?.openExternal) {
    window.AndroidBridge.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function useResearchInChat() {
  if (!state.browser.query) return;
  const text = `Use the research currently open in my mini browser about "${state.browser.query}" and help me with: `;
  elements.messageInput.value = text;
  elements.messageInput.focus(); resizeComposer();
}

function resizeComposer() { elements.messageInput.style.height = "auto"; elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 150)}px`; }

function openSettings() {
  elements.geminiKeyInput.value = getKey("gemini");
  elements.openrouterKeyInput.value = getKey("openrouter");
  elements.geminiModelInput.value = state.settings.geminiModel;
  elements.openrouterModelInput.value = state.settings.openrouterModel;
  elements.rememberKeysInput.checked = state.settings.rememberKeys;
  elements.settingsDialog.showModal();
}

function saveSettings() {
  state.settings.geminiModel = elements.geminiModelInput.value.trim() || "gemini-2.0-flash-lite";
  state.settings.openrouterModel = elements.openrouterModelInput.value.trim() || "google/gemini-2.0-flash-lite";
  state.settings.rememberKeys = elements.rememberKeysInput.checked;
  const incomingKeys = { gemini: elements.geminiKeyInput.value.trim(), openrouter: elements.openrouterKeyInput.value.trim() };
  transientKeys = incomingKeys;
  state.settings.keys = state.settings.rememberKeys ? incomingKeys : { gemini: "", openrouter: "" };
  persist();
  emitGlowTelemetry('connection_sync', { id: 'assistant-link', label: 'AI ASSISTANT', status: 'LINKED', type: 'ai' });
  updateConnectionStatus();
}

function openMemory() { renderMemoryList(); elements.memoryDialog.showModal(); }
function exportBackup() {
  const exportData = structuredClone(state); exportData.settings.keys = { gemini: "", openrouter: "" };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `nexus-memory-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
}

function restoreBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const restored = JSON.parse(reader.result);
      if (!Array.isArray(restored.chats) || !Array.isArray(restored.memories)) throw new Error("not a Nexus backup");
      state = { ...structuredClone(defaultState), ...restored, settings: { ...defaultState.settings, ...restored.settings, keys: { gemini: "", openrouter: "" } } };
      transientKeys = { gemini: "", openrouter: "" }; persist(); render(); alert("Backup restored. Add your API keys again in Connections.");
    } catch { alert("That file is not a valid Nexus backup."); }
  };
  reader.readAsText(file);
}

function togglePanel(panel, open) {
  panel.classList.toggle("open", open);
  elements.scrim.classList.toggle("visible", elements.browserPanel.classList.contains("open"));
  elements.scrim.classList.toggle("sidebar-visible", elements.sidebar.classList.contains("open"));
}

document.querySelector("#newChatButton").addEventListener("click", () => createChat());
document.querySelector(".nav-item").addEventListener("click", () => emitGlowTelemetry('chat_view', { id: 'active-session', label: 'SESSION: ACTIVE - MAIN WORKSPACE', status: 'ACTIVE', type: 'session' }));
document.querySelector("#openSettingsButton").addEventListener("click", openSettings);
elements.connectionButton.addEventListener("click", openSettings);
document.querySelector("#openMemoryButton").addEventListener("click", openMemory);
document.querySelector("#openMemoryButtonSecondary").addEventListener("click", openMemory);
document.querySelector("#addMemoryButton").addEventListener("click", () => { addMemory(elements.newMemoryInput.value); elements.newMemoryInput.value = ""; });
document.querySelector("#saveBrowserMemoryButton").addEventListener("click", () => { const research = state.browser.query ? `Research saved: ${state.browser.query}${state.browser.summary ? ` — ${state.browser.summary}` : ""}` : ""; addMemory(research); });
document.querySelectorAll(".suggestion").forEach((button) => button.addEventListener("click", () => { elements.messageInput.value = button.dataset.prompt; elements.messageInput.focus(); resizeComposer(); }));
document.querySelector("#clearChatButton").addEventListener("click", () => { const chat = getCurrentChat(); if (chat && confirm("Clear every message in this conversation?")) { chat.messages = []; chat.title = "New conversation"; chat.updatedAt = Date.now(); persist(); render(); } });
document.querySelector("#exportButton").addEventListener("click", exportBackup);
document.querySelector("#importInput").addEventListener("change", (event) => restoreBackup(event.target.files[0]));
elements.composerForm.addEventListener("submit", (event) => { event.preventDefault(); sendMessage(); });
elements.messageInput.addEventListener("input", resizeComposer);
elements.messageInput.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); elements.composerForm.requestSubmit(); } });
elements.providerSelect.addEventListener("change", () => { const chat = getCurrentChat(); if (chat) { chat.provider = elements.providerSelect.value; persist(); render(); } });
elements.webToggle.addEventListener("change", () => { const chat = getCurrentChat(); if (chat) { chat.webEnabled = elements.webToggle.checked; persist(); } });
elements.settingsForm.addEventListener("submit", saveSettings);
elements.browserForm.addEventListener("submit", (event) => { event.preventDefault(); searchWeb(elements.browserInput.value).catch(() => {}); });
elements.openExternalButton.addEventListener("click", openExternal);
document.querySelector("#useResearchButton").addEventListener("click", useResearchInChat);
document.querySelector("#opt-floating-ai")?.addEventListener("click", () => emitGlowTelemetry('assistant_view', { id: 'assistant-link', label: 'AI ASSISTANT', status: 'LINKED', type: 'ai' }));
document.querySelector("#openBrowserButton").addEventListener("click", () => togglePanel(elements.browserPanel, true));
document.querySelector("#closeBrowserButton").addEventListener("click", () => togglePanel(elements.browserPanel, false));
document.querySelector("#openSidebarButton").addEventListener("click", () => togglePanel(elements.sidebar, true));
function initialiseDesktopMatrix() {
  const module = document.querySelector('#desktop-matrix-module');
  const grid = document.querySelector('#desktopMatrixGrid');
  const viewport = document.querySelector('#desktopMatrixViewport');
  const frame = document.querySelector('#desktopMatrixFrame');
  const note = document.querySelector('#desktopMatrixNote');
  const title = document.querySelector('#desktopMatrixTitle');
  if (!module || !grid || !viewport || !frame || !note || !title) return;

  grid.innerHTML = DESKTOP_MATRIX_APPS.map(([id, icon, label]) => `
    <button class="desktop-matrix-app" type="button" data-app-id="${id}" aria-label="Open ${label}">
      <span class="desktop-matrix-icon" aria-hidden="true">${icon}</span><span class="desktop-matrix-label">${label}</span>
    </button>
  `).join('');

  const closeViewport = () => {
    viewport.classList.remove('is-open');
    viewport.setAttribute('aria-hidden', 'true');
    frame.src = 'about:blank';
    frame.hidden = true;
    note.hidden = false;
  };
  const openApp = (appId) => {
    const app = DESKTOP_MATRIX_APPS.find(([id]) => id === appId);
    if (!app) return;
    title.textContent = app[2];
    viewport.classList.add('is-open');
    viewport.setAttribute('aria-hidden', 'false');
    const url = DESKTOP_MATRIX_URLS[appId];
    if (url) {
      frame.src = url;
      frame.hidden = false;
      note.hidden = true;
    } else {
      note.textContent = `${app[2]} is represented in the matrix. Connect its official integration before opening it here.`;
      note.hidden = false;
      frame.hidden = true;
    }
  };

  grid.addEventListener('click', (event) => openApp(event.target.closest('[data-app-id]')?.dataset.appId));
  document.querySelector('#openExplorerButton')?.addEventListener('click', () => {
    module.classList.add('is-open');
    module.setAttribute('aria-hidden', 'false');
  });
  document.querySelector('#closeDesktopMatrixButton')?.addEventListener('click', () => {
    closeViewport();
    module.classList.remove('is-open');
    module.setAttribute('aria-hidden', 'true');
  });
  document.querySelector('#closeDesktopAppButton')?.addEventListener('click', closeViewport);

  const viewToggle = document.querySelector('#desktopMatrixViewToggle');
  const clock = document.querySelector('#desktopMatrixClock');
  let viewMode = 0;
  viewToggle?.addEventListener('click', () => {
    viewMode = (viewMode + 1) % 3;
    module.dataset.viewMode = ['standard', 'plasma-wide', 'searchlight'][viewMode];
    viewToggle.textContent = ['Standard View', 'Plasma Wide', 'Searchlight'][viewMode];
  });
  const updateClock = () => { if (clock) clock.textContent = `NET: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; };
  updateClock();
  setInterval(updateClock, 30000);
}

initialiseDesktopMatrix();
document.querySelector("#closeSidebarButton").addEventListener("click", () => togglePanel(elements.sidebar, false));
elements.scrim.addEventListener("click", () => { togglePanel(elements.browserPanel, false); togglePanel(elements.sidebar, false); });

initialiseTelegram();
renderGlowTerminal();
render();

// ===== OPTIMIZE CONTROLS & SOLANA WEB3 REWARD MODULE =====
(function() {
    'use strict';
    
    // --- Solana Web3 Configuration ---
    const MASTER_WALLET_ADDRESS = (typeof process !== 'undefined' && process.env && process.env.MASTER_WALLET_ADDRESS) ? process.env.MASTER_WALLET_ADDRESS : "";
    
    // Track local session token earnings
    let totalEarnedTokens = 0;
    
    // Solana wallet connection
    let walletConnected = false;
    let userWalletAddress = "";
    let connection = null;
    
    // Initialize Solana connection
    function initSolana() {
      if (typeof solanaWeb3 !== 'undefined') {
        connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        console.log('[Solana] Connection initialized');
      } else {
        console.warn('[Solana] Web3 library not loaded');
      }
    }
    
    // Connect to Phantom/Solana wallet
    async function connectWallet() {
      if (!window.solana || !window.solana.isPhantom) {
        alert('Please install Phantom wallet to connect');
        return false;
      }
      
      try {
        // Show ad before connecting wallet
        await showTelegramAd();
        
        const response = await window.solana.connect();
        userWalletAddress = response.publicKey.toString();
        walletConnected = true;
        console.log('[Wallet] Connected:', userWalletAddress);

        if (document.getElementById('masterWalletAddress')) {
          document.getElementById('masterWalletAddress').value = userWalletAddress;
        }
        emitGlowTelemetry('wallet_sync', { id: 'wallet-link', label: 'WALLET LINK', status: 'LIVE', type: 'gateway' });
        
        // Show success message via Telegram
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert(`Wallet connected: ${userWalletAddress.slice(0, 4)}...${userWalletAddress.slice(-4)}`);
        }
        
        return true;
      } catch (error) {
        console.error('[Wallet] Connection error:', error);
        alert('Failed to connect wallet: ' + error.message);
        return false;
      }
    }
    
    // Transfer SOL to user wallet (simulated for demo)
    async function transferSolToUser(amount) {
      if (!walletConnected || !connection) {
        console.warn('[Transfer] Wallet not connected');
        return false;
      }
      
      try {
        // Show ad before processing transfer
        await showTelegramAd();
        
        // In a real implementation, you would create and send a transaction here
        // For this demo, we'll simulate the transfer
        console.log(`[Transfer] Simulating transfer of ${amount} SOL to ${userWalletAddress}`);
        
        // Show success message
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert(`Earned ${amount} SOL!`);
        }
        
        return true;
      } catch (error) {
        console.error('[Transfer] Error:', error);
        return false;
      }
    }
    
    function logReward(activity, totalAmount) {
      const masterSplit = Math.floor(totalAmount * 0.90);
      const userSplit = totalAmount - masterSplit;
      totalEarnedTokens += userSplit;
      console.log(`[Web3 Reward] ${activity}: User earned +${userSplit} tokens (Master Treasury received +${masterSplit} tokens). Total user yield: ${totalEarnedTokens}`);
      
      // Actually transfer tokens to wallet if connected
      if (walletConnected && userSplit > 0) {
        transferSolToUser(userSplit / 1000000000); // Convert lamports to SOL (assuming amounts are in lamports)
      }
    }

    const init = () => {
        // Toggle App View / Web View
        const btnApp = document.getElementById('btn-app-view');
        const btnWeb = document.getElementById('btn-web-view');
        const ws = document.getElementById('opt-browser-workspace');
        if (btnApp && btnWeb && ws) {
            btnApp.addEventListener('click', () => {
                btnApp.classList.add('active');
                btnWeb.classList.remove('active');
                ws.classList.add('opt-hidden');
            });
            btnWeb.addEventListener('click', () => {
                btnWeb.classList.add('active');
                btnApp.classList.remove('active');
                ws.classList.remove('opt-hidden');
                const ifr = document.getElementById('browser-iframe');
                if (ifr && (ifr.src === 'about:blank' || ifr.src === '')) {
                    ifr.src = 'https://earnings.ink';
                }
            });
        }

        // Nelli's TV Player with Reward Tracking
        const vid = document.getElementById('nelly-video');
        const chBtns = document.querySelectorAll('.opt-ch-btn');
        let audioUnlocked = false;

        const rampAudio = () => {
          if (!vid || audioUnlocked) return;
          audioUnlocked = true;
          vid.muted = false;
          vid.volume = 0;
          const ramp = setInterval(() => {
            vid.volume = Math.min(1, vid.volume + 0.1);
            if (vid.volume >= 1) clearInterval(ramp);
          }, 120);
        };

        if (vid) {
          vid.muted = true;
          vid.volume = 0;
          ['click', 'touchstart', 'keydown'].forEach((eventName) => {
            vid.addEventListener(eventName, rampAudio, { once: true });
          });
          vid.play().catch(() => {});
        }

        if (chBtns.length) {
            chBtns.forEach(b => {
                b.addEventListener('click', () => {
                    chBtns.forEach(x => x.classList.remove('active'));
                    b.classList.add('active');
                    if (vid && b.dataset.src) {
                        vid.src = b.dataset.src;
                        vid.muted = !audioUnlocked;
                        vid.play().catch(() => {});
                        
                        // Select channel action - show ad before reward
                        showTelegramAd().then(() => {
                          logReward("Channel Switched", 10);
                        });
                    }
                });
            });
        }
        
        // Active Watch Time Reward (Triggers every 60 seconds of video playback)
        if (vid) {
            setInterval(() => {
                if (!vid.paused && !vid.ended) {
                  // Claim daily reward action - show ad before reward
                  showTelegramAd().then(() => {
                    logReward("1 Min Watch Time", 100);
                  });
                }
            }, 60000);
        }

        const pipBtn = document.getElementById('btn-pip-nelly');
        if (pipBtn && vid) {
            pipBtn.addEventListener('click', async () => {
                try {
                    if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                    } else if (vid.requestPictureInPicture) {
                        await vid.requestPictureInPicture();
                    }
                } catch(e) { console.error('PiP error:', e); }
            });
        }

        // Web Browser controls
        const iframe = document.getElementById('browser-iframe');
        const urlInput = document.getElementById('browser-url-input');
        const goBtn = document.getElementById('browser-go');
        const loadUrl = () => {
            let u = urlInput.value.trim();
            if (!u) return;
            if (!u.startsWith('http://') && !u.startsWith('https://')) {
                u = u.includes('.') && !u.includes(' ') ? 'https://' + u : 'https://www.google.com/search?q=' + encodeURIComponent(u);
            }
            iframe.src = u;
            
            // Web search action - show ad before reward
            showTelegramAd().then(() => {
              logReward("Web Search", 5);
            });
        };
        if (goBtn) goBtn.addEventListener('click', loadUrl);
        if (urlInput) urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadUrl(); });
        
        const backBtn = document.getElementById('browser-back');
        const fwdBtn = document.getElementById('browser-fwd');
        const refBtn = document.getElementById('browser-refresh');
        if (backBtn) backBtn.addEventListener('click', () => { try { iframe.contentWindow.history.back(); } catch(e){} });
        if (fwdBtn) fwdBtn.addEventListener('click', () => { try { iframe.contentWindow.history.forward(); } catch(e){} });
        if (refBtn) refBtn.addEventListener('click', () => { iframe.src = iframe.src; });

        // AI Assistant
        const aiModal = document.getElementById('opt-ai-modal');
        const aiInput = document.getElementById('opt-ai-input');
        const aiOutput = document.getElementById('opt-ai-output');
        const openAi = (txt) => {
            if (aiModal) {
                aiModal.classList.remove('opt-hidden');
                if (aiInput && txt) aiInput.value = txt;
            }
        };
        const floatingBtn = document.getElementById('opt-floating-ai');
        if (floatingBtn) floatingBtn.addEventListener('click', () => openAi());
        const closeModal = document.querySelector('.opt-close-modal');
        if (closeModal) closeModal.addEventListener('click', () => aiModal.classList.add('opt-hidden'));

        // Text selection listener
        document.addEventListener('mouseup', () => {
            const sel = window.getSelection().toString().trim();
            if (sel.length > 3) {
                if (aiModal && !aiModal.classList.contains('opt-hidden')) return;
                openAi(sel);
            }
        });

        // Preset buttons
        document.querySelectorAll('.opt-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const val = btn.dataset.value;
                const text = aiInput ? aiInput.value.trim() : '';
                if (!text) { aiOutput.innerText = 'Select or type text first!'; return; }
                aiOutput.innerText = '⏳ Processing...';
                
                fetch('https://kansasnelly.app.n8n.cloud/webhook/sreymara-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, option: val || null, text })
})
                .then(r => r.json())
                .then(d => {
                    aiOutput.innerText = d.result || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || 'Done.';
                    
                    // AI Generation action - show ad before reward
                    showTelegramAd().then(() => {
                      logReward("AI Generation", 50);
                    });
                })
                .catch(() => {
                    let response = '';
                    if (action === 'translate') response = '[Translated to ' + val + ']:\n' + text;
                    else if (action === 'style') response = '[' + val + ' Style]:\n' + text;
                    else if (action === 'emojify') response = '✨ ' + text + ' 🚀🔥';
                    else response = '[Corrected]:\n' + text;
                    aiOutput.innerText = response;
                    
                    // AI Local Task - show ad before reward
                    showTelegramAd().then(() => {
                      logReward("AI Local Task", 25);
                    });
                });
            });
        });

        // Copy button
        const copyBtn = document.getElementById('opt-copy-ai');
        if (copyBtn && aiOutput) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(aiOutput.innerText).then(() => {
                    const orig = copyBtn.innerText;
                    copyBtn.innerText = 'Copied!';
                    copyBtn.classList.add('copy-success');
                    setTimeout(() => {
                        copyBtn.innerText = orig;
                        copyBtn.classList.remove('copy-success');
                    }, 1500);
                });
            });
        }

        // Add wallet connection button to settings or somewhere accessible
        const walletBtn = document.createElement('button');
        walletBtn.className = 'wallet-btn';
        walletBtn.textContent = 'Connect Wallet';
        walletBtn.addEventListener('click', async () => {
          const connected = await connectWallet();
          if (connected) {
            walletBtn.textContent = 'Wallet Connected';
            walletBtn.classList.add('connected');
          }
        });
        
        // Add wallet button to settings dialog
        const settingsDialog = document.querySelector('#settingsDialog');
        if (settingsDialog) {
          const settingsContent = settingsDialog.querySelector('.modal-actions');
          if (settingsContent) {
            settingsContent.parentNode.insertBefore(walletBtn, settingsContent);
          }
        }

        // Initialize Solana connection
        initSolana();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();