// Initialize translatedWords array globally
let translatedWords = [];
let collectedWords = [];  // Array to collect words during learning mode

import { promptService } from '../scripts/promptService.js';
import { translationService } from '../scripts/translationService.js';

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

  // Translation UI elements
  const translationInput = document.getElementById('translationInput');
  const translationOutput = document.getElementById('translationOutput');
  const translateButton = document.getElementById('translateButton');

  // Other elements
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
        const result = await translationService.translate(
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
      const { available, status, provider } = await promptService.checkAvailability();
      
      // Update status display
      aiStatusText.textContent = status;
      aiStatusIcon.className = 'status-icon ' + (available ? 'success' : 'error');
      
      // Update token usage if session exists
      if (promptService.session) {
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
    
    if (promptService.session) {
      const { tokensSoFar, maxTokens } = promptService.session;
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
        const { success, response, error } = await promptService.prompt(text, {
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

  // Listen for new translated words
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Sidepanel received message:', message);
    
    if (message.action === 'newTranslatedWord' && isLearningMode) {
      // Add word to collected words
      collectedWords.push({
        originalWord: message.data.originalWord,
        translatedWord: message.data.translatedWord
      });
      // Create word card for the new word
      createWordCards([{
        originalWord: message.data.originalWord,
        translatedWord: message.data.translatedWord
      }]);
    } else if (message.action === 'openWordCard') {
      console.log('Opening word card:', message.data);
      openWordCard(message.data.translatedWord);
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
      collectedWords = [];  // Reset collected words
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
      
      if (response && response.success) {
        showStatus('Learning mode started! Click highlighted words to learn them.', 'success');
        // Words will be added through the message listener as they come in
      } else {
        showStatus('Failed to start learning mode. Please try refreshing the page.', 'error');
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

  async function refreshAndRestart() {
    // Destroy the AI session before refreshing
    await promptService.destroy();
    
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

    if (!Array.isArray(words)) {
      console.error('createWordCards received invalid words:', words);
      return;
    }

    // Add new words to translatedWords array
    translatedWords = translatedWords.concat(words);

    // Create cards for new words
    words.forEach((word, index) => {
      const card = document.createElement('div');
      card.className = 'word-card';
      
      // Add number overlay
      const numberOverlay = document.createElement('div');
      numberOverlay.className = 'word-card-number';
      numberOverlay.textContent = translatedWords.length - words.length + index + 1; // Calculate correct number
      card.appendChild(numberOverlay);

      card.innerHTML += `
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
          </div>
        </div>
      `;

      // Add card to container
      wordsContainer.appendChild(card);

      // Get elements once and reuse them
      const wordContainer = card.querySelector('.word-container');
      const wordSpan = wordContainer.querySelector('.word');
      
      // Set the original word length for the dotted line
      wordContainer.style.setProperty('--original-length', word.originalWord.length);
      
      // Function to check if word is too long
      const checkWordLength = () => {
        const containerWidth = wordContainer.offsetWidth - 48; // Subtract padding
        const wordWidth = wordSpan.offsetWidth;
        const estimatedInputWidth = word.originalWord.length * 12; // Rough estimate of input width
        
        // If word is longer than 40% of container or total width would exceed container
        if (wordWidth > containerWidth * 0.4 || (wordWidth + 60 + estimatedInputWidth) > containerWidth) {
          wordContainer.classList.add('vertical');
        } else {
          wordContainer.classList.remove('vertical');
        }
      };

      // Check on creation and window resize
      setTimeout(checkWordLength, 0); // Check after DOM paint
      window.addEventListener('resize', checkWordLength);

      // Add click handler for header
      const header = card.querySelector('.word-card-header');
      const icon = card.querySelector('.arrow-icon');
      const input = card.querySelector('.dotted-input');
      const feedback = card.querySelector('.word-card-feedback');
      
      const closeCard = (card, immediate = false) => {
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
      };
      
      const openCard = (card) => {
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
      };
      
      header.addEventListener('click', (event) => {
        // If clicking on the input, don't toggle the card
        if (event.target === input) {
          return;
        }

        // Close any other open cards
        document.querySelectorAll('.word-card.open').forEach(openCard => {
          if (openCard !== card) {
            closeCard(openCard, true);
          }
        });

        // Toggle card state
        if (!card.classList.contains('open')) {
          openCard(card);
        }
      });

      // Add click handler to document to close cards when clicking outside
      document.addEventListener('click', (event) => {
        if (!card.contains(event.target) && card.classList.contains('open')) {
          closeCard(card);
        }
      });

      // Function to show feedback with animation
      const showFeedbackWithAnimation = (feedback, message, type = '') => {
        // Reset the feedback state
        feedback.className = 'word-card-feedback';
        feedback.style.transition = 'none';
        feedback.offsetHeight; // Force reflow
        feedback.style.transition = 'all 0.3s ease';
        
        // Set the message and show feedback
        feedback.textContent = message;
        feedback.className = `word-card-feedback visible ${type}`;
      };

      // Function to hide feedback with animation
      const hideFeedbackWithAnimation = (feedback) => {
        feedback.className = 'word-card-feedback';
      };

      // Add button handlers
      const feedbackContainer = card.querySelector('.word-card-feedback-container');
      
      // Check button
      card.querySelector('.check-button').addEventListener('click', () => {
        checkAnswer(card, word);
      });

      // Hint button
      card.querySelector('.hint-button').addEventListener('click', () => {
        const hint = word.originalWord.charAt(0) + '_'.repeat(word.originalWord.length - 1);
        showFeedbackWithAnimation(feedback, `Hint: ${hint}`);
      });

      // Skip button
      card.querySelector('.skip-button').addEventListener('click', () => {
        showFeedbackWithAnimation(feedback, `The word was: ${word.originalWord}`);
        
        setTimeout(() => {
          hideFeedbackWithAnimation(feedback);
          setTimeout(() => {
            closeCard(card);
          }, 300);
        }, 1500);
      });

      // Report button
      card.querySelector('.report-button').addEventListener('click', () => {
        showFeedbackWithAnimation(feedback, 'Word reported. Thank you for your feedback!');
        
        setTimeout(() => {
          hideFeedbackWithAnimation(feedback);
        }, 2000);
      });
    });
  }

  async function checkAnswer(wordCard, word) {
    const userAnswer = wordCard.querySelector('.dotted-input').value.trim().toLowerCase();
    const correctAnswer = word.originalWord.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;
    
    // Show regular feedback
    showFeedback(wordCard, isCorrect ? 'Correct!' : `Incorrect. The answer is: ${correctAnswer}`, isCorrect);
    
    // Show AI feedback
    try {
      const aiFeedback = wordCard.querySelector('.word-card-ai-feedback');
      const aiScore = aiFeedback.querySelector('.ai-score');
      
      aiFeedback.className = 'word-card-ai-feedback visible';
      aiScore.textContent = '...';

      const { success, score } = await promptService.checkSimilarity(userAnswer, correctAnswer);
      
      if (success) {
        aiScore.textContent = score + '%';
        aiFeedback.classList.add(score >= 70 ? 'high-score' : 'low-score');
      } else {
        aiFeedback.style.display = 'none';
      }
    } catch (error) {
      console.error('AI similarity check failed:', error);
    }
    
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
            closeCard(otherCard, true);
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
          
          const feedback = card.querySelector('.word-card-feedback');
          feedback.className = 'word-card-feedback';
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
