console.log('Transpage sidepanel loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  const translateButton = document.getElementById('translatePage');
  const learnModeButton = document.getElementById('translateWords');
  const statusDiv = document.getElementById('status');
  const progressDiv = document.getElementById('progress');
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  const targetLanguageSelect = document.getElementById('targetLanguage');

  translateButton.addEventListener('click', async () => {
    console.log('Translate button clicked');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);
      
      showStatus('Starting translation...', 'success');
      showProgress();
      translateButton.disabled = true;

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

      console.log('Sending message to content script...');
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'translate',
        sourceLanguage: sourceLanguageSelect.value,
        targetLanguage: targetLanguageSelect.value
      });

      console.log('Translation response:', response);
      hideProgress();
      translateButton.disabled = false;
      
      if (response.success) {
        showStatus(`Translation completed! Translated ${response.count} text segments.`, 'success');
      } else {
        showStatus('Error: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Error in sidepanel script:', error);
      showStatus('Error: ' + error.message, 'error');
      hideProgress();
      translateButton.disabled = false;
    }
  });

  learnModeButton.addEventListener('click', async () => {
    console.log('Learn mode button clicked');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);
      
      showStatus('Starting learn mode...', 'success');
      showProgress();
      learnModeButton.disabled = true;
      translateButton.disabled = true;

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
        showStatus('Learn mode activated! Hover over words to learn them.', 'success');
      } else {
        showStatus('Error: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Learn mode error:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      hideProgress();
      learnModeButton.disabled = false;
      translateButton.disabled = false;
    }
  });

  function showStatus(message, type) {
    console.log('Status update:', message, type);
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = 'status ' + type;
  }

  function showProgress() {
    progressDiv.style.display = 'block';
  }

  function hideProgress() {
    progressDiv.style.display = 'none';
  }

  // Quiz functionality
  let currentQuizWord = null;
  let originalQuizWord = null;

  // Listen for quiz messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Sidepanel received message:', request);
    if (request.action === 'startQuiz') {
      console.log('Starting quiz with:', request.data);
      showQuiz(request.data.translatedWord, request.data.originalWord);
    }
  });

  // Check for existing quiz state when panel is opened
  console.log('Checking for existing quiz state...');
  chrome.runtime.sendMessage({ action: 'getQuizState' }, (quizState) => {
    console.log('Received quiz state:', quizState);
    if (quizState) {
      showQuiz(quizState.translatedWord, quizState.originalWord);
    }
  });

  function showQuiz(translatedWord, originalWord) {
    console.log('Showing quiz for word:', { translatedWord, originalWord });
    currentQuizWord = translatedWord;
    originalQuizWord = originalWord;

    const quizContainer = document.getElementById('quiz-container');
    const translatedWordDiv = document.getElementById('translated-word');
    const guessInput = document.getElementById('guess-input');
    const submitButton = document.getElementById('submit-guess');
    const giveUpButton = document.getElementById('give-up');
    const quizFeedback = document.getElementById('quiz-feedback');

    // Reset and show quiz UI
    translatedWordDiv.textContent = translatedWord;
    guessInput.value = '';
    guessInput.disabled = false;
    submitButton.disabled = false;
    giveUpButton.disabled = false;
    quizFeedback.style.display = 'none';
    quizFeedback.className = 'quiz-feedback';
    quizContainer.style.display = 'block';
    guessInput.focus();

    // Define all handlers first
    const handleEnter = (event) => {
      if (event.key === 'Enter') {
        handleSubmit();
      }
    };

    // Handle submit button
    const handleSubmit = () => {
      const guess = guessInput.value.trim();
      if (!guess) return;

      // Send the guess to background script for validation
      chrome.runtime.sendMessage({
        action: 'checkGuess',
        guess: guess,
        originalWord: originalWord
      }, (response) => {
        console.log('Guess check response:', response);
        quizFeedback.style.display = 'block';

        if (response && response.isCorrect) {
          quizFeedback.textContent = 'Correct! ';
          quizFeedback.className = 'quiz-feedback correct';
          guessInput.disabled = true;
          submitButton.disabled = true;
          giveUpButton.disabled = true;

          // Hide quiz after delay
          setTimeout(() => {
            quizContainer.style.display = 'none';
          }, 2000);
        } else {
          quizFeedback.textContent = 'Try again!';
          quizFeedback.className = 'quiz-feedback incorrect';
          guessInput.value = '';
          guessInput.focus();
        }
      });
    };

    // Handle give up button
    const handleGiveUp = () => {
      quizFeedback.textContent = `The word was: ${originalWord}`;
      quizFeedback.className = 'quiz-feedback revealed';
      quizFeedback.style.display = 'block';
      guessInput.disabled = true;
      submitButton.disabled = true;
      giveUpButton.disabled = true;

      // Hide quiz after delay
      setTimeout(() => {
        quizContainer.style.display = 'none';
      }, 3000);
    };

    // Remove old event listeners if they exist
    submitButton.removeEventListener('click', handleSubmit);
    giveUpButton.removeEventListener('click', handleGiveUp);
    guessInput.removeEventListener('keypress', handleEnter);

    // Add new event listeners
    submitButton.addEventListener('click', handleSubmit);
    giveUpButton.addEventListener('click', handleGiveUp);
    guessInput.addEventListener('keypress', handleEnter);
  }
});
