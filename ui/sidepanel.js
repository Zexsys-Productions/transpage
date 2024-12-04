// Initialize translatedWords array globally
let translatedWords = [];
let translatedSentences = []; // New array for sentences
let collectedWords = [];  // Array to collect words during learning mode
let currentMode = 'words'; // 'words' or 'sentences' // New variable to track current mode

console.log('Transpage sidepanel loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  
  // Settings menu elements
  const settingsButton = document.getElementById('settingsButton');
  const settingsElement = document.getElementById('settings');
  const settingsOverlay = settingsElement?.querySelector('.settings-overlay');
  const closeButton = settingsElement?.querySelector('.settings-close');
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const restartOnboardingBtn = document.getElementById('restartOnboardingBtn');

  // Translation UI elements
  const translationInput = document.getElementById('translationInput');
  const translationOutput = document.getElementById('translationOutput');
  const translateButton = document.getElementById('translateButton');

  // Other elements
  const difficultyOptions = document.querySelectorAll('.difficulty-option');
  difficultyOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      difficultyOptions.forEach(opt => opt.classList.remove('selected'));
      // Add selected class to clicked option
      option.classList.add('selected');
    });
  });

  const startButton = document.getElementById('start-learning');
  const statusDiv = document.getElementById('status');
  const progressDiv = document.getElementById('progress');

  // Settings menu functionality
  if (settingsButton && settingsElement && closeButton && settingsOverlay) {
    console.log('Setting up settings menu');
    
    function openSettings() {
      settingsElement.classList.add('visible');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeSettings() {
      settingsElement.classList.remove('visible');
      document.body.style.overflow = ''; // Restore scrolling
    }

    settingsButton.addEventListener('click', openSettings);
    closeButton.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);

    // Close settings when clicking outside
    document.addEventListener('click', (event) => {
      if (!settingsElement.contains(event.target) && 
          !settingsButton.contains(event.target) && 
          settingsElement.classList.contains('visible')) {
        closeSettings();
      }
    });
  } else {
    console.error('Settings elements not found:', {
      settingsButton,
      settingsElement,
      closeButton,
      settingsOverlay
    });
  }

  // Translation functionality
  if (translateButton) {
    translateButton.addEventListener('click', async () => {
      const text = translationInput.value.trim();
      if (!text) {
        translationOutput.value = 'Please enter text to translate';
        return;
      }

      translateButton.disabled = true;
      try {
        const result = await window.translationService.translate(
          text,
          sourceLanguageSelect.value,
          targetLanguageSelect.value
        );

        if (result.success) {
          translationOutput.value = result.translatedText;
        } else {
          translationOutput.value = 'Translation error: ' + result.error;
        }
      } catch (error) {
        translationOutput.value = 'Translation failed: ' + error.message;
      } finally {
        translateButton.disabled = false;
      }
    });
  }

  // AI Model Status Check
  const aiStatusText = document.getElementById('aiStatusText');
  const aiStatusIcon = document.getElementById('aiStatusIcon');
  const checkAiButton = document.getElementById('checkAiButton');
  const promptInput = document.getElementById('promptInput');
  const sendPromptButton = document.getElementById('sendPrompt');
  const promptResponse = document.getElementById('promptResponse');

  async function updateAiModelStatus() {
    if (!aiStatusText || !aiStatusIcon || !checkAiButton) {
      console.error('AI status elements not found');
      return;
    }
    
    checkAiButton.disabled = true;
    
    try {
      const { available, status, provider } = await window.promptService.checkAvailability();
      
      // Update status display
      aiStatusText.textContent = status;
      aiStatusIcon.className = 'status-icon ' + (available ? 'success' : 'error');
      
      // Update token usage if session exists
      if (window.promptService.session) {
        updateTokenUsage();
      }
    } catch (error) {
      aiStatusText.textContent = 'Error checking AI availability';
      aiStatusIcon.className = 'status-icon error';
    } finally {
      checkAiButton.disabled = false;
    }
  }

  function updateTokenUsage() {
    const tokenProgressBar = document.getElementById('tokenProgressBar');
    const tokensUsedElement = document.getElementById('tokensUsed');
    const maxTokensElement = document.getElementById('maxTokens');
    
    if (!tokenProgressBar || !tokensUsedElement || !maxTokensElement) {
      console.error('Token usage elements not found');
      return;
    }
    
    if (window.promptService.session) {
      const { tokensSoFar, maxTokens } = window.promptService.session;
      const tokensLeft = maxTokens - tokensSoFar;
      
      // Update the progress bar
      const percentage = (tokensSoFar / maxTokens) * 100;
      tokenProgressBar.style.width = `${percentage}%`;
      
      // Update the numbers
      tokensUsedElement.textContent = tokensSoFar.toLocaleString();
      maxTokensElement.textContent = maxTokens.toLocaleString();
      
      // Change color based on usage
      if (percentage > 90) {
        tokenProgressBar.style.backgroundColor = '#dc2626'; // red
      } else if (percentage > 75) {
        tokenProgressBar.style.backgroundColor = '#f59e0b'; // amber
      } else {
        tokenProgressBar.style.backgroundColor = '#1a73e8'; // blue
      }
    }
  }

  // Only add event listener if button exists
  if (checkAiButton) {
    checkAiButton.addEventListener('click', updateAiModelStatus);
    // Initial check
    updateAiModelStatus();
  }

  // Handle prompt test
  if (sendPromptButton && promptInput && promptResponse) {
    sendPromptButton.addEventListener('click', async () => {
      const text = promptInput.value.trim();
      if (!text) return;

      // Show loading state
      sendPromptButton.disabled = true;
      promptResponse.className = 'prompt-response visible';
      promptResponse.textContent = '';

      try {
        const { success, response, error } = await window.promptService.prompt(text, {
          streaming: true,
          onChunk: (chunk) => {
            promptResponse.textContent += chunk;
          }
        });
        
        if (!success) {
          promptResponse.textContent = 'Error: ' + error;
        }
      } catch (error) {
        promptResponse.textContent = 'Error: ' + error.message;
      } finally {
        sendPromptButton.disabled = false;
      }
    });

    // Enable/disable send button based on input
    promptInput.addEventListener('input', () => {
      sendPromptButton.disabled = !promptInput.value.trim();
    });

    // Handle Enter key (Shift+Enter for new line)
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendPromptButton.disabled) {
          sendPromptButton.click();
        }
      }
    });
  }

  let isLearningMode = false;

  // Card handling functions
  function closeCard(card, immediate = false) {
    const input = card.querySelector('.dotted-input');
    const feedback = card.querySelector('.word-card-feedback');
    
    if (immediate) {
      card.classList.remove('open');
      input.disabled = true;
      input.blur();
      feedback.className = 'word-card-feedback';
    } else {
      card.style.transition = 'all 0.3s ease';
      card.classList.remove('open');
      
      // Wait for animation to complete before disabling input
      setTimeout(() => {
        input.disabled = true;
        input.blur();
        feedback.className = 'word-card-feedback';
      }, 300);
    }
  }
  
  function openCard(card) {
    // Close any other open cards first
    document.querySelectorAll('.word-card.open').forEach(openCard => {
      if (openCard !== card) {
        closeCard(openCard, true);
      }
    });
    
    card.style.transition = 'all 0.3s ease';
    card.classList.add('open');
    
    // Enable input after animation starts
    setTimeout(() => {
      const input = card.querySelector('.dotted-input');
      input.disabled = false;
      input.focus();
      
      const feedback = card.querySelector('.word-card-feedback');
      feedback.className = 'word-card-feedback';
    }, 50);
    
    // Scroll the card into view
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Sidepanel received message:', request);

    if (request.action === 'openWordCard') {
      console.log('Opening word card with data:', request.data);
      try {
        // Find the word card with matching translated word
        const cards = document.querySelectorAll('.word-card');
        let foundCard = null;
        
        cards.forEach(card => {
          const wordSpan = card.querySelector('.word');
          if (wordSpan && wordSpan.textContent === request.data.translatedWord) {
            foundCard = card;
          }
        });
        
        if (foundCard) {
          // Open the found card
          openCard(foundCard);
          sendResponse({ success: true });
        } else {
          console.error('Word card not found for:', request.data.translatedWord);
          sendResponse({ success: false, error: 'Word card not found' });
        }
      } catch (error) {
        console.error('Error opening word card:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    if (request.action === 'newTranslatedWord') {
      console.log('Adding new translated word:', request.data);
      try {
        addWordToList(request.data);
        console.log('Word added successfully');
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error adding word:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    if (request.action === 'addSentenceCard') {
      console.log('Adding sentence card:', request.data);
      translatedSentences.push(request.data);
      if (currentMode === 'sentences') {
        createSentenceCard(request.data);
      }
      sendResponse({ success: true });
      return true;
    }
  });

  function openWordCard(data) {
    if (!data) {
      throw new Error('No data provided to open word card');
    }

    console.log('Opening word card with:', data);
    const wordCard = document.getElementById('word-card');
    if (!wordCard) {
      console.error('Word card element not found');
      throw new Error('Word card element not found in the DOM');
    }

    try {
      // Update word card content
      const originalWord = document.getElementById('original-word');
      const translatedWord = document.getElementById('translated-word');
      const context = document.getElementById('word-context');
      const difficulty = document.getElementById('word-difficulty');

      if (!originalWord || !translatedWord || !context || !difficulty) {
        throw new Error('One or more word card elements not found');
      }

      originalWord.textContent = data.originalWord || '';
      translatedWord.textContent = data.translatedWord || '';
      context.textContent = data.context || '';
      difficulty.textContent = data.difficulty || 'medium';

      // Show the card
      wordCard.style.display = 'block';

      // Add close button event listener
      const closeButton = wordCard.querySelector('.close-button');
      if (closeButton) {
        closeButton.onclick = () => {
          console.log('Closing word card');
          wordCard.style.display = 'none';
        };
      }
    } catch (error) {
      console.error('Error opening word card:', error);
      throw error;
    }
  }

  function addWordToList(data) {
    // Add word to collected words
    collectedWords.push({
      originalWord: data.originalWord,
      translatedWord: data.translatedWord
    });
    // Create word card for the new word
    createWordCards([{
      originalWord: data.originalWord,
      translatedWord: data.translatedWord
    }]);
  }

  async function startLearningMode() {
    isLearningMode = true;
    console.log('Learn mode button clicked');
    
    try {
      // Clear previous words and sentences
      translatedWords = [];
      translatedSentences = [];
      collectedWords = [];
      const wordsContainer = document.getElementById('words-container');
      if (wordsContainer) {
        wordsContainer.innerHTML = '';
      }

      // Get selected difficulty (only needed for word mode)
      const selectedDifficulty = document.querySelector('.difficulty-option.selected')?.dataset.difficulty;
      console.log('Selected difficulty:', selectedDifficulty);

      const statusMessage = currentMode === 'words' 
        ? 'Looking for words to learn, this might take a while...'
        : 'Processing sentences, this might take a while...';
      showStatus(statusMessage, 'success');
      showLoadingBar();
      startButton.disabled = true;

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);

      const sourceLanguage = sourceLanguageSelect.value;
      const targetLanguage = targetLanguageSelect.value;
      
      // Send appropriate action based on current mode
      const action = currentMode === 'words' ? 'startLearnMode' : 'startSentenceMode';
      const message = {
        action,
        sourceLanguage,
        targetLanguage
      };

      // Only include difficulty for word mode
      if (currentMode === 'words') {
        message.selectedDifficulty = selectedDifficulty;
      }

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, message, resolve);
      });

      console.log('Response from content script:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Unknown error occurred');
      }

      hideLoadingBar();
      showStatus('Ready to learn!', 'success');
      startButton.disabled = false;
      startButton.textContent = 'Reset';

    } catch (error) {
      console.error('Error starting learning mode:', error);
      hideLoadingBar();
      showStatus(`Error: ${error.message}`, 'error');
      startButton.disabled = false;
    }
  }

  function initializeLearningMode() {
    if (!startButton) {
      console.error('Start learning button not found');
      return;
    }

    const popup = document.querySelector('.confirmation-popup');
    const overlay = document.querySelector('.popup-overlay');
    const confirmButton = popup.querySelector('.confirm-button');
    const cancelButton = popup.querySelector('.cancel-button');

    startButton.addEventListener('click', async () => {
      if (!isLearningMode) {
        await startLearningMode();
      } else {
        showConfirmationPopup();
      }
    });

    confirmButton.addEventListener('click', () => {
      hideConfirmationPopup();
      refreshAndRestart();
    });

    cancelButton.addEventListener('click', hideConfirmationPopup);
    overlay.addEventListener('click', hideConfirmationPopup);
  }

  function showConfirmationPopup() {
    document.querySelector('.confirmation-popup').classList.add('visible');
    document.querySelector('.popup-overlay').classList.add('visible');
  }

  function hideConfirmationPopup() {
    document.querySelector('.confirmation-popup').classList.remove('visible');
    document.querySelector('.popup-overlay').classList.remove('visible');
  }

  async function refreshAndRestart() {
    // Destroy the AI session before refreshing
    await window.promptService.destroy();
    
    // Send message to content script to refresh the page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, { action: 'refreshPage' }, () => {
        // Wait for the page to be completely loaded before starting learn mode
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === activeTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            // Small delay to ensure DOM is fully ready
            setTimeout(() => {
              startLearningMode();
            }, 500);
          }
        });
      });
    });
  }

  async function createWordCards(words) {
    const wordsContainer = document.getElementById('words-container');
    if (!wordsContainer) return;

    if (!Array.isArray(words)) {
      console.error('createWordCards received invalid words:', words);
      return;
    }

    // Add new words to translatedWords array
    translatedWords = translatedWords.concat(words);

    // Create cards for new words
    for (const [index, word] of words.entries()) {
      const card = document.createElement('div');
      card.className = 'word-card';
      
      // Create the basic structure first
      card.innerHTML = `
        <div class="word-card-number">${translatedWords.length - words.length + index + 1}</div>
        <div class="word-card-header">
          <div class="word-container" data-original-length="${word.originalWord.length}">
            <span class="word">${word.translatedWord}</span>
            <img src="../assets/arrow_right_alt.svg" class="arrow-icon" alt="arrow">
            <input type="text" class="dotted-input" placeholder="" disabled>
          </div>
        </div>
        <div class="word-card-content">
          <div class="word-card-buttons">
            <div class="buttons-left">
              <button class="word-card-button report-button">
                <img src="../assets/bug_report.svg" alt="Report">Report
              </button>
            </div>
            <div class="buttons-right">
              <button class="word-card-button skip-button">
                <img src="../assets/skip_next.svg" alt="Skip">Skip
              </button>
              <button class="word-card-button hint-button">
                <img src="../assets/fluorescent.svg" alt="Hint">Hint
              </button>
              <button class="word-card-button check-button">
                <img src="../assets/check.svg" alt="Check">Check
              </button>
            </div>
          </div>
          <div class="word-card-feedback-container">
            <div class="word-card-feedback"></div>
            <div class="word-card-ai-feedback">
              <img src="../assets/smart_toy.svg" class="ai-icon" alt="AI">
              <span>AI Similarity Score: <span class="ai-score">...</span></span>
            </div>
            <div class="word-card-hint">
              <span class="part-of-speech">loading...</span>
              <span class="hint-text">Loading hint...</span>
            </div>
          </div>
        </div>
      `;

      // Add card to container
      wordsContainer.appendChild(card);

      // Get elements for this card
      const wordContainer = card.querySelector('.word-container');
      const wordSpan = wordContainer.querySelector('.word');
      const hintContainer = card.querySelector('.word-card-hint');
      const header = card.querySelector('.word-card-header');
      
      // Set the original word length for the dotted line
      if (wordContainer) {
        wordContainer.style.setProperty('--original-length', word.originalWord.length);
      }

      // Add header click handler
      if (header) {
        header.addEventListener('click', (event) => {
          const input = card.querySelector('.dotted-input');
          // If clicking input or already open card, return
          if (event.target === input || card.classList.contains('open')) {
            return;
          }

          // Toggle card state
          if (!card.classList.contains('open')) {
            openCard(card);
          }

          // Scroll to word in content
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'scrollToWord',
              word: word.translatedWord
            });
          });
        });
      }

      // Get enhanced hint and update the hint section
      try {
        const enhancedHint = await getEnhancedHint(word.originalWord, sourceLanguageSelect.value);
        if (hintContainer) {
          const partOfSpeech = hintContainer.querySelector('.part-of-speech');
          const hintText = hintContainer.querySelector('.hint-text');
          if (partOfSpeech) partOfSpeech.textContent = enhancedHint.partOfSpeech;
          if (hintText) hintText.textContent = enhancedHint.hint;
        }
      } catch (error) {
        console.error('Error getting hint:', error);
        if (hintContainer) {
          const hintText = hintContainer.querySelector('.hint-text');
          if (hintText) hintText.textContent = 'Hint not available';
        }
      }

      // Function to check if word is too long
      const checkWordLength = () => {
        if (!wordContainer || !wordSpan) return;
        const containerWidth = wordContainer.offsetWidth - 48; // Subtract padding
        const wordWidth = wordSpan.offsetWidth;
        const estimatedInputWidth = word.originalWord.length * 12; // Rough estimate of input width
        
        if (wordWidth > containerWidth * 0.4 || (wordWidth + estimatedInputWidth) > containerWidth) {
          wordContainer.classList.add('stacked');
        } else {
          wordContainer.classList.remove('stacked');
        }
      };

      // Check word length on load and window resize
      checkWordLength();
      window.addEventListener('resize', checkWordLength);

      // Add event listeners for this card
      const checkButton = card.querySelector('.check-button');
      const skipButton = card.querySelector('.skip-button');
      const hintButton = card.querySelector('.hint-button');
      const input = card.querySelector('.dotted-input');

      if (checkButton && input) {
        checkButton.addEventListener('click', () => {
          checkAnswer(card, word);
        });
      }

      if (skipButton) {
        skipButton.addEventListener('click', () => {
          showFeedback(card, 'Skipped - Answer: ' + word.originalWord, false);
          input.value = word.originalWord;
          input.disabled = true;
        });
      }

      if (hintButton) {
        hintButton.addEventListener('click', () => {
          const hintSection = card.querySelector('.word-card-hint');
          if (hintSection) {
            hintSection.classList.toggle('visible');
            hintButton.classList.toggle('active');
          }
        });
      }
    }
  }

  async function getEnhancedHint(word, sourceLanguage) {
    try {
      const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/' + sourceLanguage + '/' + encodeURIComponent(word));
      if (!response.ok) throw new Error('Failed to fetch hint');
      
      const data = await response.json();
      if (!data || !data[0]) throw new Error('No data found');
      
      const entry = data[0];
      const meanings = entry.meanings[0] || {};
      const partOfSpeech = meanings.partOfSpeech || 'unknown';
      const definition = meanings.definitions?.[0]?.definition || '';
      
      return {
        partOfSpeech,
        hint: definition
      };
    } catch (error) {
      console.error('Error getting enhanced hint:', error);
      return {
        partOfSpeech: 'unknown',
        hint: 'No additional hint available'
      };
    }
  }

  async function checkAnswer(wordCard, word) {
    const input = wordCard.querySelector('.dotted-input');
    const userAnswer = input.value.trim();
    const correctAnswer = word.originalWord;
    
    try {
        const aiFeedback = wordCard.querySelector('.word-card-ai-feedback');
        const aiScore = aiFeedback.querySelector('.ai-score');
        
        aiFeedback.className = 'word-card-ai-feedback visible';
        aiScore.textContent = '...';

        const { success, score } = await window.promptService.checkSimilarity(userAnswer, correctAnswer);
        
        if (success) {
            const isCorrect = score >= 70; // Using AI score threshold
            showFeedback(wordCard, isCorrect ? 'Correct!' : `Incorrect. The correct translation is: ${correctAnswer}`, isCorrect);
            
            aiScore.textContent = score + '%';
            aiFeedback.classList.add(score >= 70 ? 'high-score' : 'low-score');

            // Add correct/incorrect class and close card after delay
            setTimeout(() => {
                wordCard.classList.remove('open');
                wordCard.classList.add(isCorrect ? 'correct' : 'incorrect');
            }, 2000);
        } else {
            showFeedback(wordCard, 'Error checking answer. Please try again.', false);
            aiFeedback.style.display = 'none';
        }
    } catch (error) {
        console.error('AI similarity check failed:', error);
        showFeedback(wordCard, 'Error checking answer. Please try again.', false);
    }
  }

  function showFeedback(wordCard, message, isCorrect) {
    const feedback = wordCard.querySelector('.word-card-feedback');
    feedback.className = `word-card-feedback visible ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.textContent = message;
    
    // Disable the input and check button while showing feedback
    const input = wordCard.querySelector('.dotted-input');
    const checkButton = wordCard.querySelector('.check-button');
    input.disabled = true;
    checkButton.disabled = true;
  }

  // Status and progress handling functions
  function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
  }

  function hideStatus() {
    const statusElement = document.getElementById('status');
    statusElement.style.display = 'none';
  }

  function showLoadingBar() {
    const loadingBar = document.getElementById('loading-bar-container');
    loadingBar.style.display = 'block';
  }

  function hideLoadingBar() {
    const loadingBar = document.getElementById('loading-bar-container');
    loadingBar.style.display = 'none';
  }

  function showProgress() {
    const progressElement = document.getElementById('progress');
    progressElement.style.display = 'block';
  }

  function hideProgress() {
    const progressElement = document.getElementById('progress');
    progressElement.style.display = 'none';
  }

  function initializeModeSwitch() {
    const leftArrow = document.querySelector('.left-arrow');
    const rightArrow = document.querySelector('.right-arrow');
    const modeSlider = document.querySelector('.mode-slider');
    let currentMode = 0; // 0 for Words, 1 for Sentences

    function updateArrowStates() {
      leftArrow.classList.toggle('disabled', currentMode === 0);
      rightArrow.classList.toggle('disabled', currentMode === 1);
    }

    function switchMode(direction) {
      const newMode = currentMode + direction;
      if (newMode >= 0 && newMode < 2) {
        currentMode = newMode;
        modeSlider.style.transform = `translateX(-${currentMode * 120}px)`; // Updated to match new width
        updateArrowStates();
      }
    }

    leftArrow.addEventListener('click', () => switchMode(-1));
    rightArrow.addEventListener('click', () => switchMode(1));

    // Initialize arrow states
    updateArrowStates();
  }

  // Mode switching functionality
  const modeContainer = document.querySelector('.mode-container');
  const leftArrow = document.querySelector('.left-arrow');
  const rightArrow = document.querySelector('.right-arrow');
  const wordsContainer = document.getElementById('words-container');

  function switchMode(direction) {
    const slider = document.querySelector('.mode-slider');
    if (direction === 'next' && currentMode === 'words') {
      slider.style.transform = 'translateX(-50%)';
      currentMode = 'sentences';
      clearContainer();
      displaySentenceCards();
    } else if (direction === 'prev' && currentMode === 'sentences') {
      slider.style.transform = 'translateX(0)';
      currentMode = 'words';
      clearContainer();
      createWordCards(translatedWords);
    }
  }

  function clearContainer() {
    const wordsContainer = document.getElementById('words-container');
    if (wordsContainer) {
      wordsContainer.innerHTML = '';
    }
  }

  leftArrow.addEventListener('click', () => switchMode('prev'));
  rightArrow.addEventListener('click', () => switchMode('next'));

  // Sentence card creation
  function createSentenceCard(sentence) {
    const card = document.createElement('div');
    card.className = 'word-card sentence-card'; // Reusing word-card styles with sentence-specific modifications
    
    // Add number overlay
    const numberOverlay = document.createElement('div');
    numberOverlay.className = 'word-card-number';
    numberOverlay.textContent = sentence.sentenceNumber;
    card.appendChild(numberOverlay);

    card.innerHTML += `
      <div class="word-card-header">
        <div class="sentence-container">
          <div class="sentence translated">${sentence.translatedText}</div>
          <img src="../assets/arrow_right_alt.svg" class="arrow-icon" alt="arrow">
          <textarea class="sentence-input" placeholder="Type the English translation..." disabled></textarea>
        </div>
      </div>
      <div class="word-card-content">
        <div class="word-card-buttons">
          <div class="buttons-left">
            <button class="word-card-button report-button">
              <img src="../assets/bug_report.svg" alt="Report">Report
            </button>
          </div>
          <div class="buttons-right">
            <button class="word-card-button check-button">
              <img src="../assets/check.svg" alt="Check">Check
            </button>
          </div>
        </div>
        <div class="word-card-feedback-container">
          <div class="word-card-feedback"></div>
          <div class="word-card-ai-feedback">
            <img src="../assets/smart_toy.svg" class="ai-icon" alt="AI">
            <span>AI Similarity Score: <span class="ai-score">...</span></span>
          </div>
        </div>
      </div>
    `;

    wordsContainer.appendChild(card);

    // Add click handler for header
    const header = card.querySelector('.word-card-header');
    const input = card.querySelector('.sentence-input');
    const feedback = card.querySelector('.word-card-feedback');
    const checkButton = card.querySelector('.check-button');

    header.addEventListener('click', (event) => {
      // Send message to content script to scroll to the translated word
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'scrollToWord',
          word: sentence.translatedText
        });
      });

      // If clicking input or already open card, return
      if (event.target === input || card.classList.contains('open')) {
        return;
      }

      // Toggle card state
      if (!card.classList.contains('open')) {
        openSentenceCard(card);
      }
    });

    // Add check button handler
    checkButton.addEventListener('click', () => {
      checkSentenceAnswer(card, sentence);
    });
  }

  function openSentenceCard(card) {
    // Close any other open cards first
    document.querySelectorAll('.sentence-card.open').forEach(openCard => {
      if (openCard !== card) {
        closeSentenceCard(openCard, true);
      }
    });
    
    card.classList.add('open');
    
    // Enable input after animation starts
    setTimeout(() => {
      const input = card.querySelector('.sentence-input');
      input.disabled = false;
      input.focus();
      
      const feedback = card.querySelector('.word-card-feedback');
      feedback.className = 'word-card-feedback';
    }, 50);
    
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function closeSentenceCard(card, immediate = false) {
    const input = card.querySelector('.sentence-input');
    const feedback = card.querySelector('.word-card-feedback');
    
    if (immediate) {
      card.classList.remove('open');
      input.disabled = true;
      input.blur();
      feedback.className = 'word-card-feedback';
    } else {
      card.style.transition = 'all 0.3s ease';
      card.classList.remove('open');
      
      setTimeout(() => {
        input.disabled = true;
        input.blur();
        feedback.className = 'word-card-feedback';
      }, 300);
    }
  }

  async function checkSentenceAnswer(card, sentence) {
    const input = card.querySelector('.sentence-input');
    const userAnswer = input.value.trim();
    const correctAnswer = sentence.originalText;
    
    try {
        const aiFeedback = card.querySelector('.word-card-ai-feedback');
        const aiScore = aiFeedback.querySelector('.ai-score');
        
        aiFeedback.className = 'word-card-ai-feedback visible';
        aiScore.textContent = '...';

        const { success, score } = await window.promptService.checkSimilarity(userAnswer, correctAnswer);
        
        if (success) {
            const isCorrect = score >= 70; // Using AI score threshold
            
            // Format the feedback message for better readability
            const feedbackMessage = isCorrect 
                ? 'Correct!' 
                : `Incorrect.\n\nCorrect translation:\n${correctAnswer}`;
            
            showSentenceFeedback(card, feedbackMessage, isCorrect);
            
            aiScore.textContent = score + '%';
            aiFeedback.classList.add(score >= 70 ? 'high-score' : 'low-score');

            // Add correct/incorrect class and close card after longer delay for sentences
            setTimeout(() => {
                card.classList.remove('open');
                card.classList.add(isCorrect ? 'correct' : 'incorrect');
            }, 3000); // Increased delay to give more time to read
        } else {
            showSentenceFeedback(card, 'Error checking answer. Please try again.', false);
            aiFeedback.style.display = 'none';
        }
    } catch (error) {
        console.error('AI similarity check failed:', error);
        showSentenceFeedback(card, 'Error checking answer. Please try again.', false);
    }
  }

  function showSentenceFeedback(card, message, type) {
    const feedback = card.querySelector('.word-card-feedback');
    const className = type === true ? 'correct' : 
                     type === false ? 'incorrect' : '';
    
    feedback.className = `word-card-feedback visible ${className}`;
    feedback.textContent = message;
  }

  function displaySentenceCards() {
    translatedSentences.forEach(sentence => createSentenceCard(sentence));
  }

  initializeModeSwitch();

  initializeLearningMode();

  // Add restart onboarding functionality
  if (restartOnboardingBtn) {
    restartOnboardingBtn.addEventListener('click', async () => {
      try {
        // Reset the onboarding status
        await chrome.storage.local.set({ onboardingCompleted: false });
        // Redirect to onboarding page
        window.location.href = 'onboarding.html';
      } catch (error) {
        console.error('Error restarting onboarding:', error);
      }
    });
  }
});
