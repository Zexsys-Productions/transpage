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
    }
});

function isAllCaps(text) {
    return text.length > 1 && text === text.toUpperCase() && /[A-Z]/.test(text);
}

function startsWithCapital(text) {
    return text.length > 1 && /^[A-Z]/.test(text) && !/^[A-Z]+$/.test(text);
}

function shouldPreserveWord(word) {
    if (word.trim().length <= 1) return false;
    
    const trimmedWord = word.trim();
    if (trimmedWord.includes('.')) return true;
    if (trimmedWord.includes('@')) return true;
    if (trimmedWord.includes('#')) return true;
    if (/\d/.test(trimmedWord)) return true;
    
    return isAllCaps(trimmedWord) || startsWithCapital(trimmedWord);
}

function processTextForTranslation(text) {
    const words = text.split(/(\s+)/);
    const processedWords = words.map(word => {
        if (shouldPreserveWord(word)) {
            return { text: word, translate: false };
        }
        return { text: word, translate: true };
    });
    return processedWords;
}

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
                    if (!node.parentElement ||
                        node.parentElement.tagName === 'SCRIPT' ||
                        node.parentElement.tagName === 'STYLE' ||
                        node.parentElement.tagName === 'NOSCRIPT') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
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
                
                const processedWords = processTextForTranslation(text);
                let translatedText = '';
                let translationBatch = '';
                let preservedSpaces = [];
                
                for (let i = 0; i < processedWords.length; i++) {
                    const { text: wordText, translate } = processedWords[i];
                    
                    if (/^\s+$/.test(wordText)) {
                        if (translationBatch) {
                            const translated = await translator.translate(translationBatch.trim());
                            translatedText += translated;
                            translationBatch = '';
                        }
                        translatedText += wordText;
                        continue;
                    }
                    
                    if (translate) {
                        translationBatch += wordText + ' ';
                    } else {
                        if (translationBatch) {
                            const translated = await translator.translate(translationBatch.trim());
                            translatedText += translated + ' ';
                            translationBatch = '';
                        }
                        translatedText += wordText + ' ';
                    }
                }
                
                if (translationBatch) {
                    const translated = await translator.translate(translationBatch.trim());
                    translatedText += translated;
                }
                
                translatedText = translatedText.trim();
                console.log('Translated to:', translatedText.substring(0, 50) + (translatedText.length > 50 ? '...' : ''));
                
                const span = document.createElement('span');
                span.textContent = translatedText;
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
