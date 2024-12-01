document.addEventListener('DOMContentLoaded', async () => {
  // Initialize button elements with error handling
  const buttons = {
    welcomeNext: document.getElementById('welcome-next-button'),
    sourceBack: document.getElementById('source-back-button'),
    sourceNext: document.getElementById('source-next-button'),
    targetBack: document.getElementById('target-back-button'),
    complete: document.getElementById('complete-button')
  };

  // Language definitions with their flags
  const languages = {
    source: [
      { code: 'en', name: 'English', flag: '../assets/flags/us.png' },
      { code: 'ar', name: 'Arabic', flag: '../assets/flags/sa.png' },
      { code: 'bg', name: 'Bulgarian', flag: '../assets/flags/bg.png' },
      { code: 'bn', name: 'Bengali', flag: '../assets/flags/bd.png' },
      { code: 'cs', name: 'Czech', flag: '../assets/flags/cz.png' },
      { code: 'da', name: 'Danish', flag: '../assets/flags/dk.png' },
      { code: 'de', name: 'German', flag: '../assets/flags/de.png' },
      { code: 'el', name: 'Greek', flag: '../assets/flags/gr.png' }
    ],
    target: {
      'en': [
        { code: 'id', name: 'Indonesian', flag: '../assets/flags/id.png' },
        { code: 'es', name: 'Spanish', flag: '../assets/flags/es.png' },
        { code: 'ja', name: 'Japanese', flag: '../assets/flags/jp.png' },
        { code: 'fr', name: 'French', flag: '../assets/flags/fr.png' },
        { code: 'hi', name: 'Hindi', flag: '../assets/flags/in.png' },
        { code: 'it', name: 'Italian', flag: '../assets/flags/it.png' },
        { code: 'ko', name: 'Korean', flag: '../assets/flags/kr.png' },
        { code: 'nl', name: 'Dutch', flag: '../assets/flags/nl.png' },
        { code: 'pl', name: 'Polish', flag: '../assets/flags/pl.png' },
        { code: 'pt', name: 'Portuguese', flag: '../assets/flags/pt.png' },
        { code: 'ru', name: 'Russian', flag: '../assets/flags/ru.png' },
        { code: 'th', name: 'Thai', flag: '../assets/flags/th.png' },
        { code: 'tr', name: 'Turkish', flag: '../assets/flags/tr.png' },
        { code: 'vi', name: 'Vietnamese', flag: '../assets/flags/vn.png' },
        { code: 'zh', name: 'Chinese', flag: '../assets/flags/cn.png' },
        { code: 'zh-Hant', name: 'Chinese (Traditional)', flag: '../assets/flags/tw.png' },
        { code: 'fi', name: 'Finnish', flag: '../assets/flags/fi.png' },
        { code: 'hr', name: 'Croatian', flag: '../assets/flags/hr.png' },
        { code: 'hu', name: 'Hungarian', flag: '../assets/flags/hu.png' },
        { code: 'iw', name: 'Hebrew', flag: '../assets/flags/il.png' },
        { code: 'lt', name: 'Lithuanian', flag: '../assets/flags/lt.png' },
        { code: 'no', name: 'Norwegian', flag: '../assets/flags/no.png' },
        { code: 'ro', name: 'Romanian', flag: '../assets/flags/ro.png' },
        { code: 'sk', name: 'Slovak', flag: '../assets/flags/sk.png' },
        { code: 'sl', name: 'Slovenian', flag: '../assets/flags/si.png' },
        { code: 'sv', name: 'Swedish', flag: '../assets/flags/se.png' },
        { code: 'uk', name: 'Ukrainian', flag: '../assets/flags/ua.png' }
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
    
    const flag = document.createElement('img');
    flag.className = 'language-flag';
    flag.src = language.flag;
    flag.alt = `${language.name} flag`;
    flag.draggable = false;
    
    const name = document.createElement('span');
    name.className = 'language-name';
    name.textContent = language.name;
    
    card.appendChild(flag);
    card.appendChild(name);
    
    // Add click handler to the entire card
    const handleClick = () => {
      if (type === 'source') {
        selectSourceLanguage(language.code);
      } else {
        selectTargetLanguage(language.code);
      }
    };

    card.addEventListener('click', handleClick);
    card.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleClick();
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
