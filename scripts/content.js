console.log('Transpage content script loaded');

console.log('Checking Translation API availability...');
console.log('translation in window:', 'translation' in window);
console.log('createTranslator in translation:', window.translation && 'createTranslator' in window.translation);

// Initialize styles and tooltip
injectStyles(chrome.runtime.id);
setupTooltip();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    if (request.action === 'refreshPage') {
        sendResponse();
        window.location.reload();
        return true;
    }

    if (request.action === 'scrollToWord') {
        scrollToWord(request.word);
        sendResponse();
        return true;
    }

    if (request.action === 'learnMode') {
        handleLearnMode(request.sourceLanguage, request.targetLanguage)
            .then(result => {
                console.log('Learn mode completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Learn mode error:', error);
                sendResponse({ error: error.message });
            });
        return true;
    }
});

async function handleLearnMode(sourceLanguage, targetLanguage) {
    console.log('Starting learn mode...', { sourceLanguage, targetLanguage });

    if (!('translation' in window)) {
        console.error('Translation API not available in window');
        throw new Error('Translation API is not available. Make sure you have Chrome 121 or later.');
    }

    try {
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
                    if (!node.parentElement) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const excludeTags = [
                        'SCRIPT', 'STYLE', 'NOSCRIPT', 'HEADER', 'FOOTER', 'NAV', 'BUTTON',
                        'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TITLE'
                    ];
                    
                    let parent = node.parentElement;
                    while (parent) {
                        if (excludeTags.includes(parent.tagName)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        parent = parent.parentElement;
                    }

                    return node.parentElement.tagName === 'P' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let count = 0;
        let node;
        const textNodes = [];
        const translatedElements = new Map();
        
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text && text.length > 1) {
                textNodes.push(node);
            }
        }

        console.log(`Found ${textNodes.length} paragraphs to process`);

        let sentencesToSkip = Math.floor(Math.random() * 3) + 1; // Skip 1-3 sentences initially
        
        for (const node of textNodes) {
            try {
                if (!node.parentElement || !document.contains(node.parentElement)) {
                    console.log('Skipping node - parent no longer in document');
                    continue;
                }

                const sentences = node.textContent.split(/([.!?]+\s+)/);
                const translatedSentences = [];
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i];
                    
                    if (/^[.!?]+\s+$/.test(sentence)) {
                        translatedSentences.push(sentence);
                        continue;
                    }

                    if (sentencesToSkip > 0) {
                        translatedSentences.push(sentence);
                        sentencesToSkip--;
                        continue;
                    }

                    const words = sentence.split(/\b/);
                    const eligibleWords = words.filter(word => /^[a-zA-Z]{4,}$/.test(word));
                    
                    if (eligibleWords.length > 0) {
                        const wordToTranslate = eligibleWords[Math.floor(Math.random() * eligibleWords.length)];
                        let translatedSentence = sentence;

                        try {
                            const translated = await translator.translate(wordToTranslate);
                            const span = document.createElement('span');
                            span.textContent = translated;
                            span.dataset.originalWord = wordToTranslate;
                            span.dataset.translatedText = translated;
                            span.className = 'transpage-word';
                            
                            window.transpageWordCount++;
                            const numberDiv = document.createElement('div');
                            numberDiv.className = 'transpage-word-number';
                            numberDiv.textContent = window.transpageWordCount;
                            span.appendChild(numberDiv);

                            const placeholder = `###TRANSPAGE_WORD_${window.transpageWordCount}###`;
                            translatedSentence = sentence.replace(wordToTranslate, placeholder);

                            chrome.runtime.sendMessage({
                              action: 'newTranslatedWord',
                              data: {
                                translatedWord: translated,
                                originalWord: wordToTranslate
                              }
                            }).catch(error => {
                              console.error('Error sending word to sidepanel:', error);
                            });

                            translatedElements.set(placeholder, span);
                            count++;

                            sentencesToSkip = Math.floor(Math.random() * 3) + 2;
                        } catch (error) {
                            console.error('Translation error for word:', wordToTranslate, error);
                        }

                        translatedSentences.push(translatedSentence);
                    } else {
                        translatedSentences.push(sentence);
                        sentencesToSkip--;
                    }
                }
                
                const container = document.createElement('div');
                container.innerHTML = translatedSentences.join('');
                
                const replacePlaceholders = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent;
                        const placeholders = Array.from(translatedElements.keys());
                        let hasPlaceholder = false;
                        
                        for (const placeholder of placeholders) {
                            if (text.includes(placeholder)) {
                                hasPlaceholder = true;
                                const parts = text.split(placeholder);
                                const fragment = document.createDocumentFragment();
                                
                                parts.forEach((part, index) => {
                                    if (part) fragment.appendChild(document.createTextNode(part));
                                    if (index < parts.length - 1) {
                                        const span = translatedElements.get(placeholder).cloneNode(true);
                                        span.addEventListener('click', () => {
                                            chrome.runtime.sendMessage({
                                                action: 'openWordCard',
                                                data: {
                                                    translatedWord: span.dataset.translatedText,
                                                    originalWord: span.dataset.originalWord
                                                }
                                            });
                                        });
                                        fragment.appendChild(span);
                                    }
                                });
                                
                                node.parentNode.replaceChild(fragment, node);
                                break;
                            }
                        }
                        return hasPlaceholder;
                    }
                    return false;
                };

                const processNode = (node) => {
                    const childNodes = Array.from(node.childNodes);
                    for (const child of childNodes) {
                        if (child.nodeType === Node.TEXT_NODE) {
                            if (replacePlaceholders(child)) continue;
                        } else {
                            processNode(child);
                        }
                    }
                };

                processNode(container);
                
                while (container.firstChild) {
                    node.parentElement.insertBefore(container.firstChild, node);
                }
                node.parentElement.removeChild(node);

            } catch (error) {
                console.error('Error processing node:', error);
            }
        }

        return { success: true, count };

    } catch (error) {
        console.error('Learn mode error:', error);
        throw error;
    }
}
