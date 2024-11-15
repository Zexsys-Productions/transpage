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
                const translated = await translator.translate(text);
                console.log('Translated to:', translated.substring(0, 50) + (translated.length > 50 ? '...' : ''));
                
                const span = document.createElement('span');
                span.textContent = translated;
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
