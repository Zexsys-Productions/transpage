console.log('Transpage content script loaded');

console.log('Checking Translation API availability...');
console.log('translation in window:', 'translation' in window);
console.log('createTranslator in translation:', window.translation && 'createTranslator' in window.translation);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    if (request.action === 'translate') {
        handleTranslation(request.sourceLanguage, request.targetLanguage)
            .then(result => {
                console.log('Translation completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Translation failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'learnMode') {
        handleLearnMode(request.sourceLanguage, request.targetLanguage)
            .then(result => {
                console.log('Learn mode completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Learn mode failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

async function handleTranslation(sourceLanguage, targetLanguage) {
    console.log('Starting translation...', { sourceLanguage, targetLanguage });

    if (!('translation' in window)) {
        console.error('Translation API not available in window');
        throw new Error('Translation API is not available. Make sure you have Chrome 121 or later.');
    }

    try {
        console.log('Checking translation capability...');
        const canTranslate = await window.translation.canTranslate({
            sourceLanguage,
            targetLanguage,
        });
        console.log('Can translate result:', canTranslate);

        if (canTranslate === 'no') {
            throw new Error('Translation not supported for these languages');
        }

        console.log('Creating translator...');
        const translator = await window.translation.createTranslator({
            sourceLanguage,
            targetLanguage,
        });

        console.log('Testing translation...');
        const testResult = await translator.translate('Hello, world!');
        console.log('Test translation result:', testResult);

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip if no parent element
                    if (!node.parentElement) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // List of elements to exclude (including all header types)
                    const excludeTags = [
                        'SCRIPT', 'STYLE', 'NOSCRIPT', 'HEADER', 'FOOTER', 'NAV', 'BUTTON',
                        'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TITLE'
                    ];
                    
                    // Check if current element or any parent is in exclude list
                    let parent = node.parentElement;
                    while (parent) {
                        if (excludeTags.includes(parent.tagName)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        parent = parent.parentElement;
                    }

                    // Only target paragraph elements
                    return node.parentElement.tagName === 'P' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let count = 0;
        let node;
        const textNodes = [];
        
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text && text.length > 1) {
                textNodes.push(node);
            }
        }

        console.log(`Found ${textNodes.length} text nodes to translate`);

        for (const node of textNodes) {
            const text = node.textContent.trim();
            try {
                console.log('Translating:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
                const translated = await translator.translate(text);
                console.log('Translated to:', translated.substring(0, 50) + (translated.length > 50 ? '...' : ''));
                
                const span = document.createElement('span');
                const textNode = document.createTextNode(translated);
                span.appendChild(textNode);
                span.title = text;
                span.style.cursor = 'help';
                span.style.backgroundColor = '#f8f9fa';
                span.style.borderBottom = '1px dotted #666';
                node.parentNode.replaceChild(span, node);
                count++;
            } catch (error) {
                console.error('Translation error for text:', text.substring(0, 50), error);
            }
        }

        return { success: true, count };
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

async function handleLearnMode(sourceLanguage, targetLanguage) {
    console.log('Starting learn mode...', { sourceLanguage, targetLanguage });

    if (!('translation' in window)) {
        console.error('Translation API not available in window');
        throw new Error('Translation API is not available. Make sure you have Chrome 121 or later.');
    }

    try {
        // Add tooltip styles if they don't exist
        if (!document.getElementById('transpage-tooltip-styles')) {
            const styles = document.createElement('style');
            styles.id = 'transpage-tooltip-styles';
            styles.textContent = `
                @font-face {
                    font-family: 'FineprintPro';
                    src: url('chrome-extension://${chrome.runtime.id}/fonts/FineprintProRegular.OTF');
                    font-weight: normal;
                    font-style: normal;
                }
                .transpage-word {
                    cursor: pointer;
                    background-color: inherit;
                    color: #000000 !important;
                    border: 2px solid #333333;
                    border-radius: 4px;
                    position: relative;
                    display: inline-block;
                    padding: 0 4px;
                    font-family: 'FineprintPro', sans-serif !important;
                    /* Create stacking context */
                    isolation: isolate;
                    z-index: 1;
                }
                .transpage-word::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    background-color: #FFF9C4;
                    opacity: 0.7;
                    pointer-events: none;
                    border-radius: 2px;
                    z-index: -1;
                }
                .transpage-word-number {
                    position: absolute;
                    left: -10px;
                    top: -10px;
                    width: 20px;
                    height: 20px;
                    background-color: #333333;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-family: sans-serif;
                    z-index: 2;
                    pointer-events: none;
                }
                .transpage-tooltip {
                    visibility: hidden;
                    position: fixed;
                    z-index: 2147483647;
                    pointer-events: none;
                    padding: 8px 12px;
                    background-color: var(--tooltip-bg, #2c3e50);
                    color: var(--tooltip-color, white);
                    border-radius: 6px;
                    font-size: 14px;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .transpage-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 5px;
                    border-style: solid;
                    border-color: var(--tooltip-bg, #2c3e50) transparent transparent transparent;
                }
                .transpage-word:hover .transpage-tooltip {
                    visibility: visible;
                    opacity: 1;
                }
                .transpage-tooltip-original {
                    font-weight: bold;
                    color: var(--tooltip-highlight, #3498db);
                }
                .transpage-tooltip-type {
                    font-size: 12px;
                    color: var(--tooltip-secondary, #95a5a6);
                    margin-top: 2px;
                }
            `;
            document.head.appendChild(styles);

            // Add tooltip element to body if it doesn't exist
            if (!document.getElementById('transpage-floating-tooltip')) {
                const tooltip = document.createElement('div');
                tooltip.id = 'transpage-floating-tooltip';
                tooltip.className = 'transpage-tooltip';
                document.body.appendChild(tooltip);
            }

            // Add event listeners for tooltip functionality
            document.addEventListener('mouseover', function(event) {
                if (event.target.classList.contains('transpage-word')) {
                    const tooltip = document.getElementById('transpage-floating-tooltip');
                    
                    tooltip.innerHTML = `
                        <div class="transpage-tooltip-original">???</div>
                        <div class="transpage-tooltip-type">Click to guess the word</div>
                    `;
                    
                    // Position tooltip above the word
                    const rect = event.target.getBoundingClientRect();
                    const tooltipHeight = tooltip.offsetHeight;
                    tooltip.style.left = rect.left + (rect.width / 2) + 'px';
                    tooltip.style.top = (rect.top - tooltipHeight - 10) + 'px';
                    tooltip.style.transform = 'translateX(-50%)';
                    tooltip.style.visibility = 'visible';
                    tooltip.style.opacity = '1';
                }
            });

            document.addEventListener('mouseout', function(event) {
                if (event.target.classList.contains('transpage-word')) {
                    const tooltip = document.getElementById('transpage-floating-tooltip');
                    tooltip.style.visibility = 'hidden';
                    tooltip.style.opacity = '0';
                }
            });

            // Add click handler for quiz functionality
            document.addEventListener('click', function(event) {
                if (event.target.classList.contains('transpage-word')) {
                    console.log('Word clicked:', event.target);
                    const originalWord = event.target.dataset.originalWord;
                    const translatedWord = event.target.dataset.translatedText;
                    
                    console.log('Sending showQuiz message:', { originalWord, translatedWord });
                    // Send message to show quiz in sidepanel
                    chrome.runtime.sendMessage({
                        action: 'showQuiz',
                        data: {
                            originalWord,
                            translatedWord
                        }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error sending message:', chrome.runtime.lastError);
                        } else {
                            console.log('Message sent successfully:', response);
                        }
                    });
                }
            });

            // Listen for messages from background script
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'checkGuess') {
                    console.log('Checking guess:', request.guess, 'against:', request.originalWord);
                    const isCorrect = request.guess.toLowerCase().trim() === request.originalWord.toLowerCase().trim();
                    console.log('Is correct?', isCorrect);
                    sendResponse({ isCorrect });
                    return true;
                }
            });
        }

        // Add a counter for translated words
        window.transpageWordCount = window.transpageWordCount || 0;

        console.log('Creating translator...');
        const translator = await window.translation.createTranslator({
            sourceLanguage,
            targetLanguage,
        });

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip if no parent element
                    if (!node.parentElement) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // List of elements to exclude (including all header types)
                    const excludeTags = [
                        'SCRIPT', 'STYLE', 'NOSCRIPT', 'HEADER', 'FOOTER', 'NAV', 'BUTTON',
                        'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TITLE'
                    ];
                    
                    // Check if current element or any parent is in exclude list
                    let parent = node.parentElement;
                    while (parent) {
                        if (excludeTags.includes(parent.tagName)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        parent = parent.parentElement;
                    }

                    // Only target paragraph elements
                    return node.parentElement.tagName === 'P' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let count = 0;
        let node;
        const textNodes = [];
        
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text && text.length > 1) {
                textNodes.push(node);
            }
        }

        console.log(`Found ${textNodes.length} paragraphs to process`);

        // Counter for sentences to skip
        let sentencesToSkip = Math.floor(Math.random() * 3) + 1; // Skip 1-3 sentences initially
        
        for (const node of textNodes) {
            try {
                // Skip if node is no longer in the document
                if (!node.parentElement || !document.contains(node.parentElement)) {
                    console.log('Skipping node - parent no longer in document');
                    continue;
                }

                // Split text into sentences using common sentence endings
                const sentences = node.textContent.split(/([.!?]+\s+)/);
                const translatedSentences = [];
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i];
                    
                    // If this is a sentence separator (punctuation + whitespace), just add it
                    if (/^[.!?]+\s+$/.test(sentence)) {
                        translatedSentences.push(sentence);
                        continue;
                    }

                    // If we're still skipping sentences
                    if (sentencesToSkip > 0) {
                        translatedSentences.push(sentence);
                        sentencesToSkip--;
                        continue;
                    }

                    // Time to translate a word in this sentence
                    const words = sentence.split(/\b/);
                    const eligibleWords = words.filter(word => /^[a-zA-Z]{4,}$/.test(word));
                    
                    if (eligibleWords.length > 0) {
                        // Pick a random word to translate
                        const wordToTranslate = eligibleWords[Math.floor(Math.random() * eligibleWords.length)];
                        let translatedSentence = sentence;

                        try {
                            const translated = await translator.translate(wordToTranslate);
                            const span = document.createElement('span');
                            const textNode = document.createTextNode(translated);
                            span.appendChild(textNode);
                            span.dataset.originalWord = wordToTranslate;
                            span.dataset.translatedText = translated;  // Store the plain translated text
                            span.className = 'transpage-word';  
                            // Add number to words in the main content
                            window.transpageWordCount++;
                            const numberDiv = document.createElement('div');
                            numberDiv.className = 'transpage-word-number';
                            numberDiv.textContent = window.transpageWordCount;
                            span.appendChild(numberDiv);

                            translatedSentence = sentence.replace(wordToTranslate, span.outerHTML);
                            count++;
                        } catch (error) {
                            console.error('Translation error for word:', wordToTranslate, error);
                        }

                        translatedSentences.push(translatedSentence);
                        // Reset counter - skip 2-4 sentences before next translation
                        sentencesToSkip = Math.floor(Math.random() * 3) + 2;
                    } else {
                        translatedSentences.push(sentence);
                        // If no eligible words, count this as a skipped sentence
                        sentencesToSkip--;
                    }
                }
                
                // Create a temporary container
                const container = document.createElement('div');
                container.innerHTML = translatedSentences.join('');
                
                // Replace the text content safely
                while (container.firstChild) {
                    node.parentElement.insertBefore(container.firstChild, node);
                }
                node.parentElement.removeChild(node);
                
            } catch (error) {
                console.error('Error processing node:', error);
                continue;
            }
        }

        return { success: true, count };
    } catch (error) {
        console.error('Learn mode error:', error);
        throw error;
    }
}
