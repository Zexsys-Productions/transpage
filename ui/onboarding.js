document.addEventListener('DOMContentLoaded', async () => {
  // Initialize button elements with error handling
  const buttons = {
    welcomeNext: document.getElementById('welcome-next-button'),
    sourceBack: document.getElementById('source-back-button'),
    sourceNext: document.getElementById('source-next-button'),
    targetBack: document.getElementById('target-back-button'),
    complete: document.getElementById('complete-button')
  };

  // Language definitions with their emojis
  const languages = {
    source: [
      { code: 'en', name: 'English', emoji: '🇺🇸' },
      { code: 'ar', name: 'Arabic', emoji: '🇸🇦' },
      { code: 'bg', name: 'Bulgarian', emoji: '🇧🇬' },
      { code: 'bn', name: 'Bengali', emoji: '🇧🇩' },
      { code: 'cs', name: 'Czech', emoji: '🇨🇿' },
      { code: 'da', name: 'Danish', emoji: '🇩🇰' },
      { code: 'de', name: 'German', emoji: '🇩🇪' },
      { code: 'el', name: 'Greek', emoji: '🇬🇷' }
    ],
    target: {
      'en': [
        { code: 'id', name: 'Indonesian', emoji: '🇮🇩' },
        { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
        { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
        { code: 'fr', name: 'French', emoji: '🇫🇷' },
        { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
        { code: 'it', name: 'Italian', emoji: '🇮🇹' },
        { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
        { code: 'nl', name: 'Dutch', emoji: '🇳🇱' },
        { code: 'pl', name: 'Polish', emoji: '🇵🇱' },
        { code: 'pt', name: 'Portuguese', emoji: '🇵🇹' },
        { code: 'ru', name: 'Russian', emoji: '🇷🇺' },
        { code: 'th', name: 'Thai', emoji: '🇹🇭' },
        { code: 'tr', name: 'Turkish', emoji: '🇹🇷' },
        { code: 'vi', name: 'Vietnamese', emoji: '🇻🇳' },
        { code: 'zh', name: 'Chinese', emoji: '🇨🇳' },
        { code: 'zh-Hant', name: 'Chinese (Traditional)', emoji: '🇹🇼' },
        { code: 'fi', name: 'Finnish', emoji: '🇫🇮' },
        { code: 'hr', name: 'Croatian', emoji: '🇭🇷' },
        { code: 'hu', name: 'Hungarian', emoji: '🇭🇺' },
        { code: 'iw', name: 'Hebrew', emoji: '🇮🇱' },
        { code: 'lt', name: 'Lithuanian', emoji: '🇱🇹' },
        { code: 'no', name: 'Norwegian', emoji: '🇳🇴' },
        { code: 'ro', name: 'Romanian', emoji: '🇷🇴' },
        { code: 'sk', name: 'Slovak', emoji: '🇸🇰' },
        { code: 'sl', name: 'Slovenian', emoji: '🇸🇮' },
        { code: 'sv', name: 'Swedish', emoji: '🇸🇪' },
        { code: 'uk', name: 'Ukrainian', emoji: '🇺🇦' }
      ]
    }
  };

  // Add event listeners for navigation with null checks
  if (buttons.welcomeNext) {
    buttons.welcomeNext.addEventListener('click', () => showScreen('source-language-screen'));
  }
  if (buttons.sourceBack) {
    buttons.sourceBack.addEventListener('click', () => showScreen('welcome-screen'));
  }
  if (buttons.sourceNext) {
    buttons.sourceNext.addEventListener('click', () => showScreen('target-language-screen'));
  }
  if (buttons.targetBack) {
    buttons.targetBack.addEventListener('click', () => showScreen('source-language-screen'));
  }
  if (buttons.complete) {
    buttons.complete.addEventListener('click', completeOnboarding);
  }

  let selectedSourceLanguage = null;
  let selectedTargetLanguage = null;

  // Create a language card element
  function createLanguageCard(language, type) {
    const card = document.createElement('div');
    card.className = 'language-card';
    card.setAttribute('data-language', language.code);
    
    const emoji = document.createElement('span');
    emoji.className = 'language-emoji';
    emoji.textContent = language.emoji;
    emoji.style.fontSize = '2em';
    
    const name = document.createElement('span');
    name.className = 'language-name';
    name.textContent = language.name;
    
    card.appendChild(emoji);
    card.appendChild(name);
    
    card.addEventListener('click', () => {
      if (type === 'source') {
        selectSourceLanguage(language.code);
      } else {
        selectTargetLanguage(language.code);
      }
    });
    
    return card;
  }

  // Initialize the language grids
  function initializeLanguageGrids() {
    const sourceGrid = document.getElementById('source-language-grid');
    const targetGrid = document.getElementById('target-language-grid');
    
    if (sourceGrid) {
      // Clear existing content
      sourceGrid.innerHTML = '';
      // Add source language cards
      languages.source.forEach(lang => {
        sourceGrid.appendChild(createLanguageCard(lang, 'source'));
      });
    }
  }

  // Handle source language selection
  function selectSourceLanguage(code) {
    selectedSourceLanguage = code;
    const sourceGrid = document.getElementById('source-language-grid');
    if (!sourceGrid) return;

    const cards = sourceGrid.querySelectorAll('.language-card');
    cards.forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-language') === code);
    });
    
    if (buttons.sourceNext) {
      buttons.sourceNext.disabled = !selectedSourceLanguage;
    }
    
    updateTargetLanguages();
  }

  // Handle target language selection
  function selectTargetLanguage(code) {
    selectedTargetLanguage = code;
    const targetGrid = document.getElementById('target-language-grid');
    if (!targetGrid) return;

    const cards = targetGrid.querySelectorAll('.language-card');
    cards.forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-language') === code);
    });
    
    if (buttons.complete) {
      buttons.complete.disabled = !selectedTargetLanguage;
    }
  }

  // Update target language options based on selected source language
  function updateTargetLanguages() {
    const targetGrid = document.getElementById('target-language-grid');
    if (!targetGrid || !selectedSourceLanguage) return;
    
    targetGrid.innerHTML = '';
    
    const targetLanguages = languages.target[selectedSourceLanguage] || [];
    targetLanguages.forEach(lang => {
      targetGrid.appendChild(createLanguageCard(lang, 'target'));
    });
    
    selectedTargetLanguage = null;
    if (buttons.complete) {
      buttons.complete.disabled = true;
    }
  }

  // Show a specific screen
  function showScreen(screenId) {
    const screens = document.querySelectorAll('.onboarding-screen');
    const dots = document.querySelectorAll('.dot');
    let screenIndex = 0;
    
    screens.forEach((screen, index) => {
      if (screen.id === screenId) {
        screen.classList.add('active');
        screenIndex = index;
      } else {
        screen.classList.remove('active');
      }
    });
    
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === screenIndex);
    });
  }

  // Mark onboarding as completed
  const completeOnboardingProcess = async () => {
    try {
      await chrome.storage.local.set({ onboardingCompleted: true });
      const onboardingOverlay = document.getElementById('onboardingOverlay');
      if (onboardingOverlay) {
        onboardingOverlay.classList.remove('visible');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  async function completeOnboarding() {
    if (!selectedSourceLanguage || !selectedTargetLanguage) {
      return;
    }

    try {
      // Save selected languages to storage
      await chrome.storage.local.set({
        onboardingCompleted: true,
        sourceLanguage: selectedSourceLanguage,
        targetLanguage: selectedTargetLanguage
      });
      
      // Add fade-out animation
      const overlay = document.querySelector('.onboarding-overlay');
      overlay.classList.add('fade-out');
      
      // Wait for fade-out animation to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Complete the process and redirect
      await completeOnboardingProcess();
      window.location.href = 'sidepanel.html';
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  // Check if user has completed onboarding
  const checkOnboardingStatus = async () => {
    try {
      const result = await chrome.storage.local.get(['onboardingCompleted']);
      return result.onboardingCompleted === true;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  // Show onboarding if not completed
  const init = async () => {
    const completed = await checkOnboardingStatus();
    if (!completed) {
      // Show overlay with animation
      const onboardingOverlay = document.getElementById('onboardingOverlay');
      if (onboardingOverlay) {
        setTimeout(() => {
          onboardingOverlay.classList.add('visible');
        }, 100);
      }
    } else {
      // If onboarding is completed, redirect to main sidepanel
      window.location.href = 'sidepanel.html';
    }
  };

  // Initialize onboarding
  init();

  // Initialize language grids
  initializeLanguageGrids();
});
