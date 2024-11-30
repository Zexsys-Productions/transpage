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

    if (request.action === 'startLearnMode') {
        handleLearnMode(request.sourceLanguage, request.targetLanguage, request.selectedDifficulty)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'startSentenceMode') {
        handleSentenceMode(request.sourceLanguage, request.targetLanguage)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function handleLearnMode(sourceLanguage, targetLanguage, selectedDifficulty) {
    console.log('Looking for words...', { sourceLanguage, targetLanguage, selectedDifficulty });

    if (!('translation' in window)) {
        console.error('Translation API not available in window');
        throw new Error('Translation API is not available. Make sure you have Chrome 121 or later.');
    }

    try {
        window.transpageWordCount = window.transpageWordCount || 0;

        // Initialize prompt service
        const promptAvailability = await window.promptService.checkAvailability();
        if (!promptAvailability.available) {
            throw new Error('AI service is not available for word selection');
        }

        console.log('Creating translator...');
        const translator = await window.translation.createTranslator({
            sourceLanguage,
            targetLanguage,
        });

        // Step 1: Get all paragraph elements
        const paragraphs = document.getElementsByTagName('p');
        const textList = Array.from(paragraphs).map(p => p.textContent);
        console.log(`Found ${textList.length} paragraphs to process`);

        // Step 2: Process each paragraph
        for (let i = 0; i < textList.length; i++) {
            const paragraph = paragraphs[i];
            const text = textList[i];

            try {
                // Skip empty paragraphs or those with very short text
                if (!text || text.trim().length < 10) {
                    console.log('Skipping short text:', text);
                    continue;
                }

                // Clean and log the text content
                const cleanText = text.replace(/[""'']/g, '"').trim();
                console.log('Processing paragraph:', {
                    original: text,
                    cleaned: cleanText,
                    length: cleanText.length
                });

                // Step 3: Ask prompt API for beneficial words
                const prompt = `Analyze this text and select one word that would be beneficial to learn.

Rules:
- Choose a common word from the text
- Avoid basic words (the, and, is)
- Avoid proper nouns and technical terms
- Only select a ${selectedDifficulty} difficulty word

Text: "${cleanText}"

Respond in this EXACT format:
"The word is {selected_word}"

If no suitable word of ${selectedDifficulty} difficulty is found, respond with:
"The word is NONE"`;

                console.log('Sending prompt to AI service:', {
                    promptLength: prompt.length,
                    textLength: cleanText.length
                });

                const wordResult = await window.promptService.prompt(prompt);
                console.log('Raw AI response:', wordResult);

                if (!wordResult || !wordResult.success) {
                    console.error('=== AI Service Error ===');
                    console.error('Error details:', {
                        error: typeof wordResult?.error === 'object' ? 
                            JSON.stringify(wordResult.error, null, 2) : 
                            wordResult?.error,
                        details: wordResult?.details,
                        success: wordResult?.success,
                        response: wordResult?.response
                    });
                    continue;
                }

                // Extract word from the response format
                const responseMatch = wordResult.response?.match(/The word is (\w+)/i);
                if (!responseMatch || responseMatch[1] === 'NONE') {
                    console.log('No suitable word found in paragraph');
                    continue;
                }

                const wordToTranslate = responseMatch[1].trim();
                console.log('Word selected by AI:', {
                    word: wordToTranslate,
                    length: wordToTranslate.length,
                    isInText: cleanText.toLowerCase().includes(wordToTranslate.toLowerCase())
                });

                // Validate the word exists in text
                if (!cleanText.toLowerCase().includes(wordToTranslate.toLowerCase())) {
                    console.log('Word not found in text:', {
                        word: wordToTranslate,
                        foundInText: false
                    });
                    continue;
                }

                // For verification, check if the word matches the requested difficulty
                const difficultyPrompt = `Rate the difficulty of this word: "${wordToTranslate}"

Respond in this EXACT format:
"The difficulty is {level}"

Where {level} must be exactly one of: easy, medium, hard`;

                const difficultyResult = await window.promptService.prompt(difficultyPrompt);
                let difficulty = 'medium';  // default fallback

                if (difficultyResult?.success) {
                    const difficultyMatch = difficultyResult.response?.match(/The difficulty is (\w+)/i);
                    if (difficultyMatch) {
                        difficulty = difficultyMatch[1].toLowerCase();
                        // Skip if difficulty doesn't match selected difficulty
                        if (difficulty !== selectedDifficulty.toLowerCase()) {
                            console.log('Skipping word due to difficulty mismatch:', {
                                word: wordToTranslate,
                                actualDifficulty: difficulty,
                                requestedDifficulty: selectedDifficulty
                            });
                            continue;
                        }
                    }
                }

                // Step 4: Translate the entire paragraph for context
                const translatedParagraph = await translator.translate(cleanText);
                console.log('Translated paragraph:', translatedParagraph);

                // Step 5: Ask AI to find the correct translation in context
                const contextPrompt = `${translatedParagraph}
Can you give the word that closely resembles "${wordToTranslate}" when translated to Indonesian?
Only answer with the word and that word MUST be in the excerpt above.`;

                const contextResult = await window.promptService.prompt(contextPrompt);
                console.log('Context translation result:', contextResult);

                if (!contextResult || !contextResult.success) {
                    console.error('Failed to get contextual translation');
                    continue;
                }

                // Use the context-aware translation
                let translatedWord = contextResult.response.trim();
                
                // Convert to lowercase if it's not a proper noun
                // We'll consider it a proper noun if it's capitalized in the translated paragraph
                const wordInParagraph = translatedParagraph.match(new RegExp(`\\b${translatedWord}\\b`, 'i'))?.[0];
                if (wordInParagraph && wordInParagraph[0] !== wordInParagraph[0].toUpperCase()) {
                    translatedWord = translatedWord.toLowerCase();
                }

                console.log('Translation result:', {
                    original: wordToTranslate,
                    translated: translatedWord,
                    fromContext: true
                });

                // Verify the translated word exists in the translated paragraph
                if (!translatedParagraph.toLowerCase().includes(translatedWord.toLowerCase())) {
                    console.log('Context translation not found in paragraph:', {
                        translation: translatedWord,
                        paragraph: translatedParagraph
                    });
                    continue;
                }

                // Split the text around the original word
                const regex = new RegExp(`\\b${wordToTranslate}\\b`);
                const parts = text.split(regex);
                
                if (parts.length > 1) {
                    // Create wrapper to preserve original paragraph structure
                    const wrapper = document.createElement(paragraph.tagName || 'div');
                    
                    // Copy all original styles and classes
                    wrapper.className = paragraph.className;
                    wrapper.style.cssText = window.getComputedStyle(paragraph).cssText;
                    
                    // Create the translated word span
                    const translatedSpan = document.createElement('span');
                    translatedSpan.textContent = translatedWord;
                    translatedSpan.dataset.originalWord = wordToTranslate;
                    translatedSpan.dataset.translatedText = translatedWord;
                    translatedSpan.dataset.difficulty = difficulty;
                    translatedSpan.className = `transpage-word transpage-word-${difficulty}`;
                    
                    // Add number indicator
                    window.transpageWordCount++;
                    const numberDiv = document.createElement('div');
                    numberDiv.className = 'transpage-word-number';
                    numberDiv.textContent = window.transpageWordCount;
                    translatedSpan.appendChild(numberDiv);

                    // Add click handler for the translated word
                    translatedSpan.addEventListener('click', async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        console.log('Translated word clicked:', {
                            translatedWord,
                            originalWord: wordToTranslate,
                            difficulty
                        });
                        
                        try {
                            const response = await chrome.runtime.sendMessage({
                                action: 'openWordCard',
                                data: {
                                    translatedWord: translatedWord,
                                    originalWord: wordToTranslate,
                                    context: text,
                                    difficulty: difficulty
                                }
                            });
                            console.log('Response from sidepanel:', response);
                            
                            if (!response || !response.success) {
                                console.error('Failed to open word card:', response);
                            }
                        } catch (error) {
                            console.error('Error sending openWordCard message:', error);
                        }
                    });

                    // Reconstruct the paragraph with the translated word in place
                    wrapper.appendChild(document.createTextNode(parts[0]));
                    wrapper.appendChild(translatedSpan);
                    wrapper.appendChild(document.createTextNode(parts[1]));

                    // Copy over all attributes to preserve everything
                    Array.from(paragraph.attributes).forEach(attr => {
                        if (attr.name !== 'style' && attr.name !== 'class') {
                            wrapper.setAttribute(attr.name, attr.value);
                        }
                    });

                    // Replace the original paragraph
                    paragraph.parentNode.replaceChild(wrapper, paragraph);

                    // Step 10: Send word to sidepanel
                    chrome.runtime.sendMessage({
                        action: 'newTranslatedWord',
                        data: {
                            translatedWord: translatedWord,
                            originalWord: wordToTranslate,
                            context: text,
                            difficulty: difficulty
                        }
                    }).catch(error => {
                        console.error('Error sending word to sidepanel:', error);
                    });
                }

            } catch (error) {
                console.error('Error processing paragraph:', error);
                continue; // Skip this paragraph and continue with the next
            }
        }

        return { success: true, count: window.transpageWordCount };

    } catch (error) {
        console.error('Learn mode error:', error);
        throw error;
    }
}

async function handleSentenceMode(sourceLanguage, targetLanguage) {
    console.log('Starting sentence mode...', { sourceLanguage, targetLanguage });

    if (!('translation' in window)) {
        console.error('Translation API not available in window');
        throw new Error('Translation API is not available. Make sure you have Chrome 121 or later.');
    }

    try {
        window.transpageSentenceCount = window.transpageSentenceCount || 0;

        console.log('Creating translator...');
        const translator = await window.translation.createTranslator({
            sourceLanguage,
            targetLanguage,
        });

        // Get all paragraph elements
        const paragraphs = document.getElementsByTagName('p');
        console.log(`Found ${paragraphs.length} paragraphs to process`);

        // Process each paragraph
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            const text = paragraph.textContent.trim();

            // Skip empty or very short paragraphs
            if (!text || text.length < 10) {
                console.log('Skipping short text:', text);
                continue;
            }

            try {
                // Translate the paragraph
                const translationResult = await translator.translate(text);
                console.log('Translation result:', translationResult);

                // Send the sentence pair to the sidepanel
                chrome.runtime.sendMessage({
                    action: 'addSentenceCard',
                    data: {
                        originalText: text,
                        translatedText: translationResult,
                        sentenceNumber: ++window.transpageSentenceCount
                    }
                });

            } catch (error) {
                console.error('Translation error:', error);
                continue;
            }
        }

    } catch (error) {
        console.error('Sentence mode error:', error);
        throw error;
    }
}
