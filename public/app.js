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
  }
};

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
  state.activeCharacter = null;
  state.pendingCharacter = null;
  
  // Reset theme class back to default Leo for landing page neutrality
  applyTheme();
  
  elements.chatView.classList.add('hidden');
  elements.nameModalOverlay.classList.add('hidden');
  elements.landingView.classList.remove('hidden');
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

function showTypingIndicator() {
  elements.typingIndicator.classList.remove('hidden');
  scrollToBottom();
}

function hideTypingIndicator() {
  elements.typingIndicator.classList.add('hidden');
}

// Generate human-like timing delay based on text length
function calculateTextDelay(text) {
  const len = text.length;
  // Standard math settings:
  // Short replies (<40 char): 1-2 sec
  // Medium replies (40-150 char): 2.5-4 sec
  // Long replies (>150 char): 5-8 sec
  let delay = 2000;
  
  if (len < 40) {
    delay = 1000 + Math.random() * 1000;
  } else if (len >= 40 && len < 150) {
    delay = 2500 + Math.random() * 1500;
  } else {
    delay = 5000 + Math.random() * 3000;
  }
  
  // Safety cap at 9 seconds
  return Math.min(delay, 9000);
}

// Auto-greeting trigger
async function triggerInitialGreeting() {
  showTypingIndicator();
  
  const detectedLang = detectUserLanguage();
  const promptText = `(System: The user has just opened the chat room. Automatically reply with a warm, casual greeting matching your core personality in their browser language. My detected language is: ${detectedLang}. Keep it short, casual, and highly welcoming, e.g., asking how my day was or how I am doing. Do not say "How can I help you?". Just act like a friend saying hello. User's nickname is: ${state.userProfile.name || 'none'})`;
  
  try {
    const startTime = Date.now();
    const reply = await sendChatRequest(promptText, true); // true indicates a hidden system greeting trigger
    
    const elapsed = Date.now() - startTime;
    const targetDelay = calculateTextDelay(reply);
    
    // Hold greeting to simulate realistic reading/typing delay
    const waitTime = Math.max(0, targetDelay - elapsed);
    
    setTimeout(() => {
      hideTypingIndicator();
      renderMessage('model', reply);
      
      // Save greeting to history so the model knows what it said
      state.history.push({ role: 'model', text: reply });
    }, waitTime);
    
  } catch (error) {
    hideTypingIndicator();
    console.error('Failed to trigger greeting:', error);
    renderMessage('model', state.activeCharacter === 'leo' 
      ? 'yo, sorry, my mind went blank for a second. what\'s up?' 
      : 'hey, sorry about that! my mind drifted. how are you doing?');
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
    })
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
  
  // 1. Clear Input
  elements.chatInputText.value = '';
  elements.chatInputText.style.height = 'auto'; // Reset text area height
  elements.sendMessageBtn.disabled = true;
  
  // 2. Render User Message
  renderMessage('user', text);
  state.history.push({ role: 'user', text: text });
  
  // 3. Show typing indicator
  showTypingIndicator();
  
  const startTime = Date.now();
  
  try {
    const reply = await sendChatRequest(text);
    
    // Calculate typing pacing
    const elapsed = Date.now() - startTime;
    const targetDelay = calculateTextDelay(reply);
    const waitTime = Math.max(0, targetDelay - elapsed);
    
    setTimeout(() => {
      hideTypingIndicator();
      renderMessage('model', reply);
      state.history.push({ role: 'model', text: reply });
    }, waitTime);
    
  } catch (error) {
    hideTypingIndicator();
    console.error('Chat error:', error);
    
    if (error.message === 'API_KEY_MISSING') {
      renderSystemError(
        'api-key-error',
        'Gemini API key is not configured on the server. Please add your GEMINI_API_KEY to the server `.env` file.'
      );
    } else {
      renderSystemError(
        'network-error',
        'Sorry, my thoughts got a bit tangled up. Can you say that again?'
      );
    }
  }
}

// Render an inline warning or instruction message inside the chat stream
function renderSystemError(id, text) {
  const row = document.createElement('div');
  row.className = 'message-row peer';
  row.id = id;
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble system-warning';
  bubble.style.backgroundColor = 'rgba(230, 57, 70, 0.1)';
  bubble.style.borderColor = 'rgba(230, 57, 70, 0.2)';
  bubble.style.color = 'var(--text-primary)';
  bubble.style.border = '1px dashed rgba(230, 57, 70, 0.3)';
  bubble.textContent = text;
  
  row.appendChild(bubble);
  elements.chatMessagesWrapper.appendChild(row);
  scrollToBottom();
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
  setupImmersiveControls();
});
