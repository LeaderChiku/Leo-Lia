// ==========================================================================
// Leo & Lia — Aesthetic Minimal AI Client-Side Application
// ==========================================================================

// Global Application State
const state = {
  activeCharacter: null,  // 'leo' | 'lia'
  pendingCharacter: null, // character selected but name modal not completed yet
  history: [],            // [{ role: 'user'|'model', text: '...' }]
  theme: 'dark',          // 'dark' | 'light'
  userProfile: {
    name: ''              // user's nickname
  },
  typingTimeoutId: null,  // tracks active typing timeout to prevent duplicates/stuck states
  activeAbortController: null, // aborts pending requests on view changes
};

// Comprehensive development environment check (localhost, loopbacks, file protocol, local network IPs)
const isDevelopmentEnvironment = (() => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (protocol === 'file:') return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '') return true;
  if (hostname.endsWith('.local')) return true;

  // Class A private network: 10.0.0.0 - 10.255.255.255
  if (hostname.startsWith('10.')) return true;

  // Class C private network: 192.168.0.0 - 192.168.255.255
  if (hostname.startsWith('192.168.')) return true;

  // Class B private network: 172.16.0.0 - 172.31.255.255
  if (hostname.startsWith('172.')) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const secondPart = parseInt(parts[1], 10);
      if (!isNaN(secondPart) && secondPart >= 16 && secondPart <= 31) {
        return true;
      }
    }
  }

  return false;
})();


// Language Detection Helper
function detectUserLanguage() {
  const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  
  if (lang.startsWith('ko')) {
    return 'Korean';
  } else if (lang.startsWith('ja')) {
    return 'Japanese';
  } else if (lang.startsWith('hi') || lang === 'en-in') {
    return 'Hinglish (a warm, casual mix of Hindi and English in Roman/Latin script)';
  } else if (lang.startsWith('es')) {
    return 'Spanish';
  } else if (lang.startsWith('fr')) {
    return 'French';
  }
  return 'English';
}

// Get Formatted Client Local Time
function getClientLocalTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
  return `${hours}:${minutesStr} ${ampm} (Local Time)`;
}

// Select DOM Elements
const elements = {
  body: document.body,
  bgGradientOverlay: document.getElementById('bgGradientOverlay'),
  
  // Views
  landingView: document.getElementById('landingView'),
  chatView: document.getElementById('chatView'),
  
  // Character Buttons
  selectLeoBtn: document.getElementById('selectLeoBtn'),
  selectLiaBtn: document.getElementById('selectLiaBtn'),
  
  // Chat Header Controls
  backToLandingBtn: document.getElementById('backToLandingBtn'),
  partnerNameDisplay: document.getElementById('partnerNameDisplay'),
  headerPartnerAvatar: document.getElementById('headerPartnerAvatar'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  
  // Chat Stream
  chatFlowContainer: document.getElementById('chatFlowContainer'),
  chatMessagesWrapper: document.getElementById('chatMessagesWrapper'),
  typingIndicator: document.getElementById('typingIndicator'),
  
  // Chat Input
  chatInputText: document.getElementById('chatInputText'),
  sendMessageBtn: document.getElementById('sendMessageBtn'),
  
  // Name Entry Modal
  nameModalOverlay: document.getElementById('nameModalOverlay'),
  nicknameInput: document.getElementById('nicknameInput'),
  nameContinueBtn: document.getElementById('nameContinueBtn')
};

// ==========================================================================
// Theme Management (Supports Leo/Lia x Dark/Light)
// ==========================================================================

function initTheme() {
  // 1. Detect saved theme or system preference
  const savedTheme = localStorage.getItem('leo-lia-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    state.theme = savedTheme;
  } else {
    // Media Query default
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    state.theme = prefersLight ? 'light' : 'dark';
  }
  
  // 2. Load User Nickname from LocalStorage
  const savedNickname = localStorage.getItem('leo-lia-nickname');
  if (savedNickname) {
    state.userProfile.name = savedNickname;
    elements.nicknameInput.value = savedNickname;
    elements.nameContinueBtn.disabled = false;
  }

  applyTheme();
}

function applyTheme() {
  // Remove all theme classes
  elements.body.classList.remove(
    'theme-leo-dark', 'theme-leo-light',
    'theme-lia-dark', 'theme-lia-light'
  );
  
  const char = state.activeCharacter || 'leo'; // Fallback to Leo colors on landing
  const themeClass = `theme-${char}-${state.theme}`;
  elements.body.classList.add(themeClass);
  
  // Cache preference
  localStorage.setItem('leo-lia-theme', state.theme);
}

function toggleDarkLight() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

// ==========================================================================
// View Routing & Transitions
// ==========================================================================

function selectCharacter(character) {
  state.pendingCharacter = character;
  
  // Update theme class temporarily based on pending character to tint the name modal glow
  elements.body.classList.remove(
    'theme-leo-dark', 'theme-leo-light',
    'theme-lia-dark', 'theme-lia-light'
  );
  elements.body.classList.add(`theme-${character}-${state.theme}`);

  // Reveal the cinematic name modal
  elements.nameModalOverlay.classList.remove('hidden');
  
  // Focus the nickname input
  setTimeout(() => {
    elements.nicknameInput.focus();
  }, 300);
}

function handleNameSubmit() {
  const name = elements.nicknameInput.value.trim();
  if (!name) return;
  
  state.userProfile.name = name;
  localStorage.setItem('leo-lia-nickname', name);
  
  if (state.pendingCharacter) {
    navigateToChat(state.pendingCharacter);
  }
}

function navigateToChat(character) {
  cancelActiveRequests();

  state.activeCharacter = character;
  state.history = [];
  
  // 1. Update Display & Dynamic Theme
  elements.partnerNameDisplay.textContent = character.charAt(0).toUpperCase() + character.slice(1);
  elements.headerPartnerAvatar.src = `${character}.png`;
  elements.headerPartnerAvatar.alt = character.charAt(0).toUpperCase() + character.slice(1);
  applyTheme();
  
  // 2. Render welcome message / triggers
  elements.chatMessagesWrapper.innerHTML = '';
  
  // 3. Slide Views and Hide Modals
  elements.landingView.classList.add('hidden');
  elements.nameModalOverlay.classList.add('hidden');
  elements.chatView.classList.remove('hidden');
  
  // 4. Focus input
  setTimeout(() => {
    elements.chatInputText.focus();
  }, 500);
  
  // 5. Trigger first language-specific hello reply from bot
  triggerInitialGreeting();
}

function navigateToLanding() {
  cancelActiveRequests();

  state.activeCharacter = null;
  state.pendingCharacter = null;
  
  // Reset theme class back to default Leo for landing page neutrality
  applyTheme();
  
  elements.chatView.classList.add('hidden');
  elements.nameModalOverlay.classList.add('hidden');
  elements.landingView.classList.remove('hidden');
}

// Enable/Disable chat input and update placeholder depending on typing state
function setChatInputState(enabled, characterName = '') {
  elements.chatInputText.disabled = !enabled;
  elements.sendMessageBtn.disabled = !enabled || elements.chatInputText.value.trim().length === 0;
  
  if (enabled) {
    elements.chatInputText.placeholder = "say something...";
  } else if (characterName) {
    const nameFormatted = characterName.charAt(0).toUpperCase() + characterName.slice(1);
    elements.chatInputText.placeholder = `${nameFormatted} is typing...`;
  }
}

// Render clean, non-technical companion immersive errors inside peer bubble
function renderImmersiveError(characterName) {
  // Guard against rendering consecutive error bubbles to prevent spam
  if (elements.chatMessagesWrapper) {
    const lastRow = elements.chatMessagesWrapper.lastElementChild;
    if (lastRow && lastRow.classList.contains('peer')) {
      const lastBubble = lastRow.querySelector('.message-bubble');
      if (lastBubble) {
        const text = lastBubble.textContent;
        if (text.includes('connection got weird') || text.includes('disappeared for a second')) {
          // Already showing an error bubble at the bottom. Do not duplicate.
          return;
        }
      }
    }
  }

  const nameFormatted = characterName.charAt(0).toUpperCase() + characterName.slice(1);
  const msg = Math.random() > 0.5 
    ? `connection got weird for a moment...` 
    : `${nameFormatted} disappeared for a second 😭`;
  
  renderMessage('model', msg);
}

// ==========================================================================
// Chat Logic & Realism delay
// ==========================================================================

// Render a single message bubble into the flow
function renderMessage(role, text) {
  const row = document.createElement('div');
  row.className = `message-row ${role === 'model' ? 'peer' : 'self'}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  
  row.appendChild(bubble);
  elements.chatMessagesWrapper.appendChild(row);
  
  // Auto Scroll
  scrollToBottom();
}

function scrollToBottom() {
  elements.chatFlowContainer.scrollTop = elements.chatFlowContainer.scrollHeight;
}

// Central clean-up pass to maintain a mathematically clean single-state chat flow at all times.
// Removes orphan typing states, stale pending fetch operations, and duplicate fallback bubbles.
function cancelActiveRequests() {
  // 1. Clear any active setTimeout timing simulation
  if (state.typingTimeoutId) {
    clearTimeout(state.typingTimeoutId);
    state.typingTimeoutId = null;
  }

  // 2. Abort any active pending HTTP requests
  if (state.activeAbortController) {
    state.activeAbortController.abort();
    state.activeAbortController = null;
  }

  // 3. Hide primary typing indicator
  hideTypingIndicator();

  // 4. Reset input element state back to default enabled
  setChatInputState(true);

  // 5. Defensive DOM Pruning: Scan and remove any duplicate consecutive error bubbles
  if (elements.chatMessagesWrapper) {
    const rows = Array.from(elements.chatMessagesWrapper.querySelectorAll('.message-row'));
    let consecutiveErrorCount = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const bubble = row.querySelector('.message-bubble');
      if (bubble && row.classList.contains('peer')) {
        const text = bubble.textContent;
        const isError = text.includes('connection got weird') || text.includes('disappeared for a second');
        if (isError) {
          consecutiveErrorCount++;
          if (consecutiveErrorCount > 1) {
            row.remove();
          }
        } else {
          consecutiveErrorCount = 0;
        }
      } else {
        consecutiveErrorCount = 0;
      }
    }
  }
}

function showTypingIndicator() {
  elements.typingIndicator.classList.remove('hidden');
  scrollToBottom();
}

function hideTypingIndicator() {
  elements.typingIndicator.classList.add('hidden');
}

// Generate organic, imperfect, and human-like timing delay based on length, emotional weight, and random micro-pauses.
function calculateTextDelay(text) {
  const len = text.length;
  
  // 1. Base timing using a dynamic human-like typing range (20ms to 40ms per character) plus randomized start jitter
  let delay = 600 + Math.random() * 500 + (len * (20 + Math.random() * 20));
  
  // 2. Emotional Weight Analysis
  const lowercaseText = text.toLowerCase();
  
  // Thoughtful/Emotional cues: ellipses, soft punctuation, emotional words
  const emotionalKeywords = [
    'think', 'feel', 'understand', 'sorry', 'sad', 'happy', 'love', 'lonely', 'miss',
    'comfort', 'warm', 'care', 'promise', 'wish', 'dream', 'always', 'night', 'heart'
  ];
  const emotionalEmojis = ['🥺', '😭', '✨', '💜', '🤍', '🫂', '❤️', '💕', '💌'];
  
  let emotionalWeight = 1.0;
  
  // Check emotional words
  let emotionalWordCount = 0;
  emotionalKeywords.forEach(word => {
    if (lowercaseText.includes(word)) emotionalWordCount++;
  });
  
  // Check emotional emojis
  let emotionalEmojiCount = 0;
  emotionalEmojis.forEach(emoji => {
    if (text.includes(emoji)) emotionalEmojiCount++;
  });
  
  // Count ellipses
  const ellipsisCount = (lowercaseText.match(/\.\.\./g) || []).length;
  
  // Adjust weight based on depth markers
  if (emotionalWordCount > 0 || emotionalEmojiCount > 0 || ellipsisCount > 0) {
    // Increase delay for thoughtful, deep, or emotional replies
    emotionalWeight += (emotionalWordCount * 0.08) + (emotionalEmojiCount * 0.12) + (ellipsisCount * 0.15);
  }
  
  // Playful/Fast cues: laughters, casual slang, rapid emojis
  const playfulKeywords = ['lol', 'haha', 'hehe', 'pfft', 'lmao', 'xd', 'yeah', 'yo', 'hey', 'bro', 'dude'];
  const playfulEmojis = ['😂', '💀', '🤣', '😜', '😎', '👀'];
  
  let playfulWeight = 1.0;
  let playfulWordCount = 0;
  playfulKeywords.forEach(word => {
    if (lowercaseText.includes(word)) playfulWordCount++;
  });
  
  let playfulEmojiCount = 0;
  playfulEmojis.forEach(emoji => {
    if (text.includes(emoji)) playfulEmojiCount++;
  });
  
  if (playfulWordCount > 0 || playfulEmojiCount > 0) {
    // Decrease delay slightly for fast/playful texting
    playfulWeight -= (playfulWordCount * 0.05) + (playfulEmojiCount * 0.08);
    // Cap minimum playful reduction
    playfulWeight = Math.max(0.75, playfulWeight);
  }
  
  // Apply weights
  delay = delay * emotionalWeight * playfulWeight;
  
  // 3. Occasional Organic Micro-Pauses (simulating hesitating, thinking, or looking at the input)
  // Applied ~35% of the time, adds an additional 400ms to 1200ms
  if (Math.random() < 0.35) {
    const microPause = 400 + Math.random() * 800;
    delay += microPause;
  }
  
  // 4. Bound the delay organically (minimum 1.0s, maximum 9.5s)
  return Math.min(Math.max(delay, 1000), 9500);
}


// Auto-greeting trigger
async function triggerInitialGreeting() {
  cancelActiveRequests();

  showTypingIndicator();
  setChatInputState(false, state.activeCharacter || 'leo');
  
  const detectedLang = detectUserLanguage();
  const promptText = `(System: The user has just opened the chat room. Automatically reply with a warm, casual greeting matching your core personality in their browser language. My detected language is: ${detectedLang}. Keep it short, casual, and highly welcoming, e.g., asking how my day was or how I am doing. Do not say "How can I help you?". Just act like a friend saying hello. User's nickname is: ${state.userProfile.name || 'none'})`;
  
  state.activeAbortController = new AbortController();

  try {
    const startTime = Date.now();
    const reply = await sendChatRequest(promptText, true); // true indicates a hidden system greeting trigger
    
    const elapsed = Date.now() - startTime;
    const targetDelay = calculateTextDelay(reply);
    
    // Hold greeting to simulate realistic reading/typing delay
    const waitTime = Math.max(0, targetDelay - elapsed);
    
    state.typingTimeoutId = setTimeout(() => {
      hideTypingIndicator();
      setChatInputState(true);
      renderMessage('model', reply);
      
      // Save greeting to history so the model knows what it said
      state.history.push({ role: 'model', text: reply });
      state.typingTimeoutId = null;
    }, waitTime);
    
  } catch (error) {
    if (error.name === 'AbortError') return;
    cancelActiveRequests();
    console.error('Failed to trigger greeting:', error);
    renderImmersiveError(state.activeCharacter || 'leo');
  }
}

// Core server request sender
async function sendChatRequest(messageText, isHiddenGreeting = false) {
  // Construct user profile label for backend
  const userVibeLabel = state.userProfile.name ? `User's name is ${state.userProfile.name}` : 'general';

  // Create message payload
  // If it's the hidden greeting, we only pass that single instruction.
  // Otherwise, we pass the accumulated chat history + the new user message.
  let messagePayload = [];
  if (isHiddenGreeting) {
    messagePayload = [{ role: 'user', text: messageText }];
  } else {
    messagePayload = [...state.history, { role: 'user', text: messageText }];
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      character: state.activeCharacter,
      messages: messagePayload,
      localTime: getClientLocalTime(),
      userVibe: userVibeLabel
    }),
    signal: state.activeAbortController ? state.activeAbortController.signal : null
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (data.error === 'API_KEY_MISSING') {
      throw new Error('API_KEY_MISSING');
    }
    throw new Error(data.message || 'API request failed.');
  }

  return data.reply;
}

// Send user-typed message
async function handleUserSendMessage() {
  const text = elements.chatInputText.value.trim();
  if (!text) return;
  
  cancelActiveRequests();

  // 1. Clear Input and Disable State
  elements.chatInputText.value = '';
  elements.chatInputText.style.height = 'auto'; // Reset text area height
  setChatInputState(false, state.activeCharacter || 'leo');
  
  // 2. Render User Message
  renderMessage('user', text);
  state.history.push({ role: 'user', text: text });
  
  // 3. Show typing indicator
  showTypingIndicator();
  
  state.activeAbortController = new AbortController();
  const startTime = Date.now();
  
  try {
    const reply = await sendChatRequest(text);
    
    // Calculate typing pacing
    const elapsed = Date.now() - startTime;
    const targetDelay = calculateTextDelay(reply);
    const waitTime = Math.max(0, targetDelay - elapsed);
    
    state.typingTimeoutId = setTimeout(() => {
      hideTypingIndicator();
      setChatInputState(true);
      renderMessage('model', reply);
      state.history.push({ role: 'model', text: reply });
      state.typingTimeoutId = null;
    }, waitTime);
    
  } catch (error) {
    if (error.name === 'AbortError') return;
    cancelActiveRequests();
    console.error('Chat error:', error);
    renderImmersiveError(state.activeCharacter || 'leo');
  }
}

// ==========================================================================
// Event Listeners & Bootstrapping
// ==========================================================================

function setupEventListeners() {
  // Character Selection Clicks -> Opens cinematic name entry modal
  elements.selectLeoBtn.addEventListener('click', () => selectCharacter('leo'));
  elements.selectLiaBtn.addEventListener('click', () => selectCharacter('lia'));
  
  // Hover color canvas transitions (optional high-fidelity effects)
  elements.selectLeoBtn.addEventListener('mouseenter', () => {
    elements.bgGradientOverlay.style.background = 'radial-gradient(circle 60vw at 25% -20vw, rgba(111, 156, 180, 0.25) 0%, rgba(0,0,0,0) 100%)';
  });
  elements.selectLiaBtn.addEventListener('mouseenter', () => {
    elements.bgGradientOverlay.style.background = 'radial-gradient(circle 60vw at 75% -20vw, rgba(181, 131, 150, 0.25) 0%, rgba(0,0,0,0) 100%)';
  });
  
  // Return neutral background gradient on mouse leave
  const resetBgHover = () => {
    if (!state.activeCharacter) {
      elements.bgGradientOverlay.style.background = 'radial-gradient(circle 60vw at 50% -20vw, rgba(111, 156, 180, 0.15) 0%, rgba(0,0,0,0) 100%)';
    }
  };
  elements.selectLeoBtn.addEventListener('mouseleave', resetBgHover);
  elements.selectLiaBtn.addEventListener('mouseleave', resetBgHover);
  
  // Header Controls
  elements.backToLandingBtn.addEventListener('click', navigateToLanding);
  elements.themeToggleBtn.addEventListener('click', toggleDarkLight);
  
  // Cinematic Name Modal Controls
  elements.nicknameInput.addEventListener('input', () => {
    const val = elements.nicknameInput.value.trim();
    elements.nameContinueBtn.disabled = val.length === 0;
  });
  
  elements.nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSubmit();
    }
  });
  
  elements.nameContinueBtn.addEventListener('click', handleNameSubmit);
  
  // Chat Input Auto-Grow & Send Handlers
  elements.chatInputText.addEventListener('input', () => {
    const text = elements.chatInputText.value;
    elements.sendMessageBtn.disabled = text.trim().length === 0;
    
    // Auto grow height
    elements.chatInputText.style.height = 'auto';
    elements.chatInputText.style.height = (elements.chatInputText.scrollHeight - 6) + 'px';
  });
  
  elements.chatInputText.addEventListener('keydown', (e) => {
    // Send on Enter, Newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserSendMessage();
    }
  });
  
  elements.sendMessageBtn.addEventListener('click', handleUserSendMessage);
}

// ==========================================================================
// Standalone Immersive Controls (Browser Interception & Protection)
// ==========================================================================

function setupImmersiveControls() {
  // Suspend DevTools, right-click, and History API blocks on localhost / development
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.protocol === 'file:';
  
  if (isDevelopment) {
    console.log("Leo & Lia: Development mode detected. Keyboard, navigation, and Inspect Element limits are suspended.");
    return;
  }

  // 1. Disable Right Click Context Menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // 2. Prevent accidental browser back/forward navigation using History API
  history.pushState(null, null, window.location.href);
  
  window.addEventListener('popstate', () => {
    history.pushState(null, null, window.location.href);
  });

  // 3. Block Developer Tools inspect shortcuts, keyboard navigation, and save page hotkeys
  window.addEventListener('keydown', (e) => {
    // 3a. Block F12
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }

    // 3b. Block Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.code === 'KeyI' || e.code === 'KeyJ' || e.code === 'KeyC')) {
      e.preventDefault();
      return;
    }

    // 3c. Block Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.code === 'KeyU')) {
      e.preventDefault();
      return;
    }

    // 3d. Block Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
      e.preventDefault();
      return;
    }

    // 3e. Block Alt + Left Arrow / Right Arrow accidental page navigation
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      return;
    }

    // 3f. Block Backspace from acting as a browser back button (only when not editing text)
    if (e.key === 'Backspace') {
      const activeEl = document.activeElement;
      if (activeEl) {
        const isEditable = activeEl.tagName === 'INPUT' || 
                           activeEl.tagName === 'TEXTAREA' || 
                           activeEl.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
        }
      }
    }
  });
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  if (isDevelopmentEnvironment) {
    console.log("[Leo & Lia] Dev mode detected — browser protections disabled.");
  } else {
    setupImmersiveControls();
  }
});
