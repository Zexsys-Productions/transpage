console.log('Transpage sidepanel loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  
  // Settings menu elements
  const settingsButton = document.querySelector('.settings-button');
  const settingsMenu = document.querySelector('.settings-menu');
  const closeSettingsButton = document.querySelector('.close-settings');
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  const targetLanguageSelect = document.getElementById('targetLanguage');

  // Other elements
  const startButton = document.getElementById('start-learning');
  const statusDiv = document.getElementById('status');
  const progressDiv = document.getElementById('progress');

  // Settings menu functionality
  if (settingsButton && settingsMenu && closeSettingsButton) {
    console.log('Setting up settings menu');
    
    settingsButton.addEventListener('click', () => {
      console.log('Settings button clicked');
      settingsMenu.classList.toggle('open');
    });

    closeSettingsButton.addEventListener('click', () => {
      console.log('Close button clicked');
      settingsMenu.classList.remove('open');
    });

    // Close settings menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!settingsMenu.contains(event.target) && 
          !settingsButton.contains(event.target) && 
          settingsMenu.classList.contains('open')) {
        settingsMenu.classList.remove('open');
      }
    });
  } else {
    console.error('Settings elements not found:', {
      settingsButton,
      settingsMenu,
      closeSettingsButton
    });
  }

  let isLearningMode = false;
  let translatedWords = [];

  // Listen for new translated words
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Sidepanel received message:', request);
    if (request.action === 'newTranslatedWord') {
      const word = {
        translated: request.data.translatedWord,
        original: request.data.originalWord
      };
      translatedWords.push(word);
      createWordCards([word]); // Add just the new word
    } else if (request.action === 'openWordCard') {
      console.log('Opening word card:', request.data);
      openWordCard(request.data.translatedWord);
    }
  });

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

  async function startLearningMode() {
    isLearningMode = true;
    console.log('Learn mode button clicked');
    
    try {
      // Clear previous words
      translatedWords = [];
      const wordsContainer = document.getElementById('words-container');
      if (wordsContainer) {
        wordsContainer.innerHTML = '';
      }

      showStatus('Starting learn mode...', 'success');
      showProgress();
      startButton.disabled = true;

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);

      const sourceLanguage = sourceLanguageSelect.value;
      const targetLanguage = targetLanguageSelect.value;
      
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'learnMode',
          sourceLanguage,
          targetLanguage
        }, (response) => {
          console.log('Learn mode response received:', response);
          resolve(response);
        });
      });

      console.log('Learn mode response:', response);
      
      if (response && response.error) {
        showStatus('Error: ' + response.error, 'error');
        return;
      }

      if (response && response.success) {
        showStatus('Learning mode started! Words will appear as you hover over them.', 'success');
      } else {
        showStatus('Failed to start learning mode. Please try refreshing.', 'error');
      }
    } catch (error) {
      console.error('Learn mode error:', error);
      showStatus('Error: ' + error.message + '\n\nPlease try refreshing the page.', 'error');
    } finally {
      hideProgress();
      startButton.disabled = false;
    }
  }

  function showConfirmationPopup() {
    document.querySelector('.confirmation-popup').classList.add('visible');
    document.querySelector('.popup-overlay').classList.add('visible');
  }

  function hideConfirmationPopup() {
    document.querySelector('.confirmation-popup').classList.remove('visible');
    document.querySelector('.popup-overlay').classList.remove('visible');
  }

  function refreshAndRestart() {
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

  function createWordCards(words) {
    const wordsContainer = document.getElementById('words-container');
    if (!wordsContainer) return;

    // Don't clear existing cards, just append new ones
    words.forEach((word, index) => {
      const card = document.createElement('div');
      card.className = 'word-card';
      
      // Add number overlay
      const numberOverlay = document.createElement('div');
      numberOverlay.className = 'word-card-number';
      numberOverlay.textContent = translatedWords.length; // Use the total length for numbering
      card.appendChild(numberOverlay);

      card.innerHTML += `
        <div class="word-card-header">
          <div class="word-container" data-original-length="${word.original.length}">
            <span class="word">${word.translated}</span>
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
          </div>
        </div>
      `;

      // Add click handler for header
      const header = card.querySelector('.word-card-header');
      const icon = card.querySelector('.arrow-icon');
      const input = card.querySelector('.dotted-input');
      const feedback = card.querySelector('.word-card-feedback');
      
      header.addEventListener('click', () => {
        const wasOpen = card.classList.contains('open');
        
        // Close all other cards first
        document.querySelectorAll('.word-card.open').forEach(openCard => {
          if (openCard !== card) {
            openCard.classList.remove('open');
            const otherFeedback = openCard.querySelector('.word-card-feedback');
            if (otherFeedback) {
              otherFeedback.className = 'word-card-feedback';
              otherFeedback.textContent = '';
            }
            const otherInput = openCard.querySelector('.dotted-input');
            otherInput.value = '';
            otherInput.disabled = true;
          }
        });

        // Toggle current card
        if (!wasOpen) {
          card.classList.add('open');
          input.disabled = false;
          setTimeout(() => input.focus(), 300);
        } else {
          card.classList.remove('open');
          input.disabled = true;
          feedback.className = 'word-card-feedback';
          feedback.textContent = '';
          input.value = '';
        }
      });

      // Add button handlers
      const feedbackContainer = card.querySelector('.word-card-feedback-container');
      
      // Check button
      card.querySelector('.check-button').addEventListener('click', () => {
        checkAnswer(card, word);
      });

      // Hint button
      card.querySelector('.hint-button').addEventListener('click', () => {
        const hint = word.original.charAt(0) + '_'.repeat(word.original.length - 1);
        feedback.className = 'word-card-feedback visible';
        feedback.textContent = `Hint: ${hint}`;
      });

      // Skip button
      card.querySelector('.skip-button').addEventListener('click', () => {
        feedback.className = 'word-card-feedback visible';
        feedback.textContent = `The word was: ${word.original}`;
        
        setTimeout(() => {
          feedback.className = 'word-card-feedback';
          setTimeout(() => {
            card.classList.remove('open');
            input.disabled = true;
          }, 300);
        }, 1500);
      });

      // Report button
      card.querySelector('.report-button').addEventListener('click', () => {
        feedback.className = 'word-card-feedback visible';
        feedback.textContent = 'Word reported. Thank you for your feedback!';
        
        setTimeout(() => {
          feedback.className = 'word-card-feedback';
        }, 2000);
      });

      // Add card to container
      wordsContainer.appendChild(card);

      // Set the original word length for the dotted line
      const wordContainer = card.querySelector('.word-container');
      wordContainer.style.setProperty('--original-length', word.original.length);
    });
  }

  function checkAnswer(wordCard, word) {
    const userAnswer = wordCard.querySelector('.dotted-input').value.trim().toLowerCase();
    const correctAnswer = word.original.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;
    
    showFeedback(wordCard, isCorrect ? 'Correct!' : `Incorrect. The answer is: ${correctAnswer}`, isCorrect);
    
    // Add correct/incorrect class and close card after delay
    setTimeout(() => {
      wordCard.classList.remove('open');
      wordCard.classList.add(isCorrect ? 'correct' : 'incorrect');
    }, 2000); // 2 second delay
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

  function openWordCard(translatedWord) {
    const cards = document.querySelectorAll('.word-card');
    cards.forEach(card => {
      const wordSpan = card.querySelector('.word');
      if (wordSpan.textContent === translatedWord) {
        // Close other cards first
        cards.forEach(otherCard => {
          if (otherCard !== card && otherCard.classList.contains('open')) {
            otherCard.classList.remove('open');
            const feedback = otherCard.querySelector('.word-card-feedback');
            if (feedback) feedback.style.display = 'none';
            const otherInput = otherCard.querySelector('.dotted-input');
            otherInput.value = '';
            otherInput.disabled = true;
          }
        });

        // Open this card
        card.classList.add('open');
        // Scroll the card into view
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus the input
        setTimeout(() => {
          const input = card.querySelector('.dotted-input');
          input.disabled = false;
          input.focus();
        }, 300);
      }
    });
  }

  // Status and progress functions
  function showStatus(message, type) {
    console.log('Status update:', message, type);
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = 'status ' + type;
    if (type === 'error') {
      statusDiv.style.whiteSpace = 'pre-line';
    }
  }

  function hideStatus() {
    if (!statusDiv) return;
    statusDiv.style.display = 'none';
  }

  function showProgress() {
    if (!progressDiv) return;
    progressDiv.style.display = 'block';
  }

  function hideProgress() {
    if (!progressDiv) return;
    progressDiv.style.display = 'none';
  }

  // Handle difficulty selection
  const difficultyPicker = document.querySelector('.difficulty-picker');
  let selectedDifficulty = 'easy';

  difficultyPicker.addEventListener('click', (e) => {
    const button = e.target.closest('.difficulty-option');
    if (!button) return;

    // Update selected state
    document.querySelectorAll('.difficulty-option').forEach(btn => {
      btn.classList.remove('selected');
    });
    button.classList.add('selected');
    
    // Store selected difficulty
    selectedDifficulty = button.dataset.difficulty;
  });

  initializeLearningMode();
});
