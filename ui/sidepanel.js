console.log('Transpage sidepanel loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  const learnModeButton = document.getElementById('translateWords');
  const statusDiv = document.getElementById('status');
  const progressDiv = document.getElementById('progress');
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  const targetLanguageSelect = document.getElementById('targetLanguage');

  learnModeButton.addEventListener('click', async () => {
    console.log('Learn mode button clicked');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);
      
      showStatus('Starting learn mode...', 'success');
      showProgress();
      learnModeButton.disabled = true;

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log('Content script injected');
      } catch (error) {
        console.log('Content script already exists:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'learnMode',
        sourceLanguage: sourceLanguageSelect.value,
        targetLanguage: targetLanguageSelect.value
      });

      if (response.success) {
        showStatus('Learn mode activated! Click on translated words to learn them.', 'success');
      } else {
        showStatus('Error: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Learn mode error:', error);
      showStatus('Error: ' + error.message + '\n\nPlease try refreshing the page.', 'error');
    } finally {
      hideProgress();
      learnModeButton.disabled = false;
    }
  });

  function showStatus(message, type) {
    console.log('Status update:', message, type);
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = 'status ' + type;
    if (type === 'error') {
      statusDiv.style.whiteSpace = 'pre-line';
    }
  }

  function showProgress() {
    progressDiv.style.display = 'block';
  }

  function hideProgress() {
    progressDiv.style.display = 'none';
  }

  // Store translated words
  let translatedWords = [];

  // Listen for new translated words and card open requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Sidepanel received message:', request);
    if (request.action === 'newTranslatedWord') {
      addWordCard(request.data.translatedWord, request.data.originalWord);
    } else if (request.action === 'openWordCard') {
      openWordCard(request.data.translatedWord);
    }
  });

  function addWordCard(translatedWord, originalWord) {
    // Check if word already exists
    if (translatedWords.some(w => w.translated === translatedWord)) {
      return;
    }

    // Add to tracking array
    translatedWords.push({
      translated: translatedWord,
      original: originalWord,
      blocked: false
    });

    const wordsContainer = document.getElementById('words-container');
    const card = document.createElement('div');
    card.className = 'word-card';
    
    // Add number overlay
    const numberOverlay = document.createElement('div');
    numberOverlay.className = 'word-card-number';
    numberOverlay.textContent = translatedWords.length;
    card.appendChild(numberOverlay);

    card.innerHTML += `
      <div class="word-card-header">
        <div class="word-container" data-original-length="${originalWord.length}">
          <span class="word">${translatedWord}</span>
          <img src="../assets/arrow_right_alt.svg" class="arrow-icon" alt="arrow">
          <input type="text" class="dotted-input" placeholder="" disabled>
        </div>
      </div>
      <div class="word-card-content">
        <div class="word-card-buttons">
          <div class="buttons-left">
            <button class="word-card-button report-button">Report</button>
          </div>
          <div class="buttons-right">
            <button class="word-card-button skip-button">Skip</button>
            <button class="word-card-button hint-button">Hint</button>
            <button class="word-card-button check-button">Check</button>
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
      const guess = input.value.trim().toLowerCase();
      const isCorrect = guess === originalWord.toLowerCase();
      
      feedback.className = `word-card-feedback visible ${isCorrect ? 'correct' : 'incorrect'}`;
      feedback.textContent = isCorrect ? 'Correct!' : 'Try again!';
      
      if (isCorrect) {
        setTimeout(() => {
          feedback.className = 'word-card-feedback';
          setTimeout(() => {
            card.classList.remove('open');
            input.disabled = true;
          }, 300);
        }, 1500);
      } else {
        input.value = '';
        input.focus();
      }
    });

    // Hint button
    card.querySelector('.hint-button').addEventListener('click', () => {
      const hint = originalWord.charAt(0) + '_'.repeat(originalWord.length - 1);
      feedback.className = 'word-card-feedback visible';
      feedback.textContent = `Hint: ${hint}`;
    });

    // Skip button
    card.querySelector('.skip-button').addEventListener('click', () => {
      feedback.className = 'word-card-feedback visible';
      feedback.textContent = `The word was: ${originalWord}`;
      
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
    wordContainer.style.setProperty('--original-length', originalWord.length);
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
});
