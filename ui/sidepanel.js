console.log('Transpage sidepanel loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  const translateButton = document.getElementById('translatePage');
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
});
