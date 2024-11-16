console.log('Transpage background service worker started');

// Store the current quiz state
let currentQuizState = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle quiz functionality
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    if (request.action === 'showQuiz') {
        console.log('Showing quiz with data:', request.data);
        // Store the quiz state
        currentQuizState = {
            translatedWord: request.data.translatedWord,
            originalWord: request.data.originalWord
        };

        // Enable and update the sidepanel
        chrome.sidePanel.setOptions({
            enabled: true,
            path: 'ui/sidepanel.html'
        }).then(() => {
            console.log('Sidepanel enabled, sending startQuiz message');
            // Wait a short moment to ensure the panel is ready
            setTimeout(() => {
                // Notify the sidepanel about the new quiz
                chrome.runtime.sendMessage({
                    action: 'startQuiz',
                    data: currentQuizState
                }).catch(error => {
                    console.error('Error sending startQuiz message:', error);
                });
            }, 100);
        }).catch(error => {
            console.error('Error setting sidepanel options:', error);
        });

        // Send response to content script
        sendResponse({ success: true });
    } else if (request.action === 'getQuizState') {
        console.log('Returning quiz state:', currentQuizState);
        sendResponse(currentQuizState);
    } else if (request.action === 'checkGuess') {
        // Forward the guess check to the content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'checkGuess',
                guess: request.guess,
                originalWord: request.originalWord
            }, sendResponse);
        });
        return true; // Keep the message channel open for the async response
    }
});
