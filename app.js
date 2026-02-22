/* Kuronai Voice Assistant + Smart Reply Engine */
import { saveChat } from "./firebase.js";

const qs = (s) => document.querySelector(s);
let recognition = null;

// ---------- DOM ----------
const messagesEl = qs("#messages");
const form = qs("#chatForm");
const input = qs("#messageInput");
const voiceToggle = qs("#voiceToggle");
const clearBtn = qs("#clearBtn");
const memoryList = qs("#memoryList");

window.__TTS_ENABLED = false;

// ---------- CLEAR CHAT ----------
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    messagesEl.innerHTML = "";
    localStorage.removeItem("Jaat_history_v1");
    typeReply("Chat cleared! How can I help you?");
  });
}

// ---------- Memory ----------
const STORAGE_KEY = "Jaat_history_v1";
const MAX_HISTORY = 5;

const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

const saveHistory = (arr) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-MAX_HISTORY)));

const pushHistory = (txt) => {
  const arr = loadHistory();
  arr.push({ text: txt });
  saveHistory(arr);
  renderMemory();
};

const renderMemory = () => {
  const arr = loadHistory().slice(-MAX_HISTORY).reverse();
  if (!memoryList) return;
  memoryList.innerHTML = arr
    .map((i) => `<div class="memory-item">${escapeHtml(i.text)}</div>`)
    .join("");
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
}

// ---------- Message Rendering ----------
function appendMsg(text, cls = "bot") {
  const el = document.createElement("div");
  el.className = `msg ${cls}`;
  el.innerHTML = `<div class="msg-text">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function typeReply(text) {
  const el = document.createElement("div");
  el.className = `msg bot`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += text[i];
    el.innerText = out;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    await new Promise((r) => setTimeout(r, 12));
  }
  el.innerText = text;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ---------------------------------------------------------
//                  WIKIPEDIA API
// ---------------------------------------------------------
async function fetchWikipedia(query) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.extract) return data.extract;

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------
//                  SMART REPLIES + APIS
// ---------------------------------------------------------
const jokes = [
  "Why did the developer go broke? Because they used up all their cache 😂",
  "Why do programmers prefer dark mode? Because light attracts bugs 🤣",
  "Why was the computer cold? It forgot to close its Windows 🥶",
  "Why don’t programmers like nature? Too many bugs 🐞",
  "Why was the JavaScript developer sad? Because they didn’t Node how to Express themselves 😭",
];

let lastJokeIndex = -1;

async function replyEngine(text) {
  const t = text.toLowerCase();

  // ----- SMALL TALK -----
if (/your name|who are you/.test(t)) 
    return "I'm Kuronai, your smart mini-assistant 😎";

if (/who made you|your creator|created you/.test(t)) 
    return "I was created by Tanishq and Rajat";

if (/how are you/.test(t)) 
    return "I'm running perfectly — thanks for asking! 😊";

if (/bye|goodbye|see you/.test(t)) 
    return "Goodbye! Have a great day ✨";

if (/what can you do|help me|your ability|features/.test(t)) 
    return "I can chat, tell jokes, solve math, search Wikipedia, and more! 🚀";

  // greetings
  if (/hello|hi|hey/.test(t)) return "Hi! How can I help you today?";
  if (/\btime\b/.test(t)) return new Date().toLocaleTimeString();
  if (/\bdate\b/.test(t)) return new Date().toLocaleDateString();

  // jokes
  if (/\bjoke\b/.test(t) || /\banother\b/.test(t)) {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * jokes.length);
    } while (newIndex === lastJokeIndex);

    lastJokeIndex = newIndex;
    return jokes[newIndex];
  }

  // ---------- MATH API ----------
  if (/^[0-9+\-*/().\s]+$/.test(t)) {
    try {
      const res = await fetch(
        `https://api.mathjs.org/v4/?expr=${encodeURIComponent(text)}`
      );
      const result = await res.text();
      return `Result: ${result}`;
    } catch (err) {
      console.error("Math API error:", err);
    }
  }

  // ---------- WIKIPEDIA API ----------
  if (t.startsWith("who is") || t.startsWith("what is") || t.startsWith("define")) {
    try {
      const query = text.replace(/who is|what is|define/gi, "").trim();

      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
      );

      const data = await res.json();

      if (data.extract) return data.extract;
    } catch (e) {
      console.error("Wikipedia error:", e);
    }
  }

  return "Interesting! I don't know that yet, but I'm learning 😊";
}

// ---------------------------------------------------------
//                  TTS
// ---------------------------------------------------------
function speakText(text) {
  if (!("speechSynthesis" in window)) return;

  if (recognition && window.__TTS_ENABLED) {
    try {
      recognition.stop();
    } catch {}
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1;

  utter.onend = () => {
    if (window.__TTS_ENABLED && recognition) {
      try {
        recognition.start();
      } catch {}
    }
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ---------------------------------------------------------
//                  SPEECH TO TEXT
// ---------------------------------------------------------
if (voiceToggle) {
  voiceToggle.addEventListener("click", () => {
    if (!window.__TTS_ENABLED) {
      const SR =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR();
      recognition.lang = "en-US";

      recognition.onresult = (ev) => {
        const spoken = ev.results[0][0].transcript;
        input.value = spoken;
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      };

      recognition.start();
      window.__TTS_ENABLED = true;
      voiceToggle.style.opacity = 1;
    } else {
      window.__TTS_ENABLED = false;
      recognition.stop();
      voiceToggle.style.opacity = 0.6;
    }
  });
}

// ---------------------------------------------------------
//                  FORM SUBMIT
// ---------------------------------------------------------
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const txt = input.value.trim();
    if (!txt) return;

    appendMsg(txt, "user");
    pushHistory(txt);
    input.value = "";

    const reply = await replyEngine(txt);

    await typeReply(reply);
    saveChat(txt, reply, "Anonymous");

    if (window.__TTS_ENABLED) speakText(reply);
  });
}

// ---------------------------------------------------------
//                  INIT
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderMemory();

  if (messagesEl.children.length === 0) {
    typeReply("Heyy! I'm Kuronai, your smart mini-assistant. How can I help you?");
  }
});