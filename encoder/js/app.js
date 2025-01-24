// Constants
const MAX_INPUT_LENGTH = 10000;
const MAX_HISTORY = 10;
const SHORTCUTS = {
  ENCODE: { key: 'Enter', ctrl: true },
  DECODE: { key: 'b', ctrl: true },
  COPY: { key: 'c', ctrl: true, shift: true },
  CLEAR: { key: 'k', ctrl: true }
};

// DOM Elements
const inputText = document.getElementById('inputText');
const output = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');
const toast = document.getElementById('toast');

// State Management
let history = [];
let historyIndex = -1;
let isProcessing = false;

// Validation Functions
const isValidInput = (text) => {
  return text && text.trim().length > 0 && text.length < MAX_INPUT_LENGTH;
};

const isValidBase64URL = (text) => {
  return /^[-A-Za-z0-9_]*$/.test(text);
};

// History Management
const addToHistory = (text) => {
  if (!history.includes(text)) {
    history.unshift(text);
    if (history.length > MAX_HISTORY) history.pop();
  }
  historyIndex = -1;
};

// UI Feedback
const showToast = (message = 'Copied to clipboard!') => {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
};

const setLoading = (isLoading) => {
isProcessing = isLoading;
document.querySelectorAll('button').forEach(btn => btn.disabled = isLoading);
output.closest('.result-wrapper').classList.toggle('loading', isLoading);
};

const showOutput = (message, type = 'encoded') => {
output.innerHTML = `<p class="${type}">${message}</p>`;
copyBtn.style.display = type === 'error' ? 'none' : 'flex';
output.closest('.result-wrapper').classList.toggle('loading', false);
};

// Core Functions
const encodeBase64URL = async () => {
  const input = inputText.value.trim();
  
  if (!isValidInput(input)) {
    showOutput(`Please enter valid text (1-${MAX_INPUT_LENGTH} characters).`, true);
    return;
  }

  try {
    setLoading(true);
    const encoded = btoa(unescape(encodeURIComponent(input)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    addToHistory(input);
    showOutput(`Encoded: ${encoded}`);
  } catch (error) {
    showOutput(`Encoding failed: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
};

const decodeBase64URL = async () => {
  const input = inputText.value.trim();
  
  if (!isValidInput(input)) {
    showOutput('Please enter valid Base64URL text.', true);
    return;
  }

  if (!isValidBase64URL(input)) {
    showOutput('Invalid Base64URL format. Use only A-Z, a-z, 0-9, -, and _', true);
    return;
  }

  try {
    setLoading(true);
    const padded = input
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(input.length + (4 - input.length % 4) % 4, '=');
    const decoded = decodeURIComponent(escape(atob(padded)));
    addToHistory(input);
    showOutput(`Decoded: ${decoded}`);
  } catch (error) {
    showOutput(`Decoding failed: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
};

const copyOutput = async () => {
  if (isProcessing) return;
  
  try {
    setLoading(true);
    const text = output.textContent.replace('Encoded: ', '').replace('Decoded: ', '');
    await navigator.clipboard.writeText(text);
    showToast();
  } catch (error) {
    showToast('Failed to copy text');
    console.error('Copy failed:', error);
  } finally {
    setLoading(false);
  }
};

const clearAll = () => {
  if (isProcessing) return;
  inputText.value = '';
  output.innerHTML = '';
  copyBtn.style.display = 'none';
  inputText.focus();
};

// Event Listeners
document.addEventListener('keydown', (e) => {
  if (isProcessing) return;

  // Command shortcuts
  if (e.ctrlKey || e.metaKey) {
    if (e.key === SHORTCUTS.ENCODE.key) {
      e.preventDefault();
      encodeBase64URL();
    } else if (e.key === SHORTCUTS.DECODE.key) {
      e.preventDefault();
      decodeBase64URL();
    } else if (e.key === SHORTCUTS.CLEAR.key) {
      e.preventDefault();
      clearAll();
    } else if (e.shiftKey && e.key === SHORTCUTS.COPY.key && copyBtn.style.display !== 'none') {
      e.preventDefault();
      copyOutput();
    }
  }

  // History navigation
  if (document.activeElement === inputText) {
    if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      inputText.value = history[historyIndex];
    } else if (e.key === 'ArrowDown' && historyIndex > -1) {
      e.preventDefault();
      historyIndex = Math.max(-1, historyIndex - 1);
      inputText.value = historyIndex === -1 ? '' : history[historyIndex];
    }
  }
});

// Initialize
inputText.focus();