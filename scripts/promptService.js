class PromptService {
    constructor() {
        this.session = null;
        this.usingFallback = false;
        console.log('PromptService initialized');
    }

    async checkAvailability() {
        console.log('Checking AI availability...');
        try {
            // Try Chrome AI Origin Trial first
            console.log('Checking Chrome AI...', { chrome: 'chrome' in window, aiOriginTrial: 'chrome' in window && 'aiOriginTrial' in chrome });
            if ('chrome' in window && 'aiOriginTrial' in chrome) {
                const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
                console.log('Chrome AI capabilities:', capabilities);
                
                switch(capabilities.available) {
                    case 'readily':
                        return { available: true, status: 'Chrome AI Model is ready to use', provider: 'chrome' };
                    case 'after-download':
                        return { available: true, status: 'Chrome AI Model needs to be downloaded first', provider: 'chrome' };
                    case 'no':
                        throw new Error('Chrome AI Model is not available on this device');
                    default:
                        throw new Error('Unknown status');
                }
            } else {
                throw new Error('Chrome AI API not available');
            }
        } catch (error) {
            console.log('Falling back to alternative AI API...', error);
            // Try fallback AI API
            try {
                console.log('Checking alternative AI...', { ai: 'ai' in window, languageModel: 'ai' in window && 'languageModel' in window.ai });
                if ('ai' in window && 'languageModel' in window.ai) {
                    return { available: true, status: 'Alternative AI Model is available', provider: 'fallback' };
                } else {
                    return { available: false, status: 'No AI models are available', provider: null };
                }
            } catch (fallbackError) {
                console.error('Failed to check alternative AI API:', fallbackError);
                return { available: false, status: 'Error checking availability: No AI models are available', provider: null };
            }
        }
    }

    async initialize() {
        console.log('Initializing AI...');
        try {
            // Try Chrome AI Origin Trial first
            if ('chrome' in window && 'aiOriginTrial' in chrome) {
                console.log('Trying to initialize Chrome AI...');
                const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
                
                if (capabilities.available === 'no') {
                    throw new Error('Chrome AI API is not available on this device');
                }

                this.session = await chrome.aiOriginTrial.languageModel.create({
                    systemPrompt: 'You are a helpful language learning assistant.'
                });
                this.usingFallback = false;
                console.log('Chrome AI initialized successfully');
                return true;
            } else {
                throw new Error('Chrome AI API not available');
            }
        } catch (error) {
            console.log('Falling back to alternative AI API...', error);
            // Try fallback AI API
            try {
                if ('ai' in window && 'languageModel' in window.ai) {
                    console.log('Trying to initialize alternative AI...');
                    this.session = await window.ai.languageModel.create();
                    this.usingFallback = true;
                    console.log('Alternative AI initialized successfully');
                    return true;
                } else {
                    throw new Error('No AI models are available');
                }
            } catch (fallbackError) {
                console.error('Failed to initialize alternative AI API:', fallbackError);
                return false;
            }
        }
    }

    async prompt(text, { streaming = false, onChunk = null } = {}) {
        console.log('Prompting AI...', { text, streaming, usingFallback: this.usingFallback });
        if (!this.session) {
            console.log('No session, initializing...');
            const initialized = await this.initialize();
            if (!initialized) {
                console.error('Failed to initialize AI');
                return { success: false, error: 'Failed to initialize any AI model' };
            }
        }

        try {
            // Check if this is a similarity check prompt
            const isSimilarityCheck = text.includes('Compare these two texts and rate their similarity');
            
            if (this.usingFallback) {
                // Using alternative AI API
                console.log('Using fallback API for prompt');
                if (!isSimilarityCheck) {
                    // For regular prompts, add a prefix to ensure proper response format
                    text = `Respond to this request as a helpful assistant. Do not use any special format or scoring system in your response: ${text}`;
                }
                
                if (streaming && onChunk) {
                    let fullResponse = '';
                    const response = await this.session.prompt(text, { stream: true });
                    for await (const chunk of response) {
                        console.log('Received chunk:', chunk);
                        fullResponse += chunk;
                        onChunk(chunk);
                    }
                    console.log('Full response:', fullResponse);
                    return { success: true, response: fullResponse };
                } else {
                    const response = await this.session.prompt(text);
                    console.log('Full response:', response);
                    return { success: true, response };
                }
            } else {
                // Using Chrome AI Origin Trial
                console.log('Using Chrome AI for prompt');
                if (streaming && onChunk) {
                    let fullResponse = '';
                    let previousChunk = '';
                    const response = await this.session.promptStreaming(text);
                    for await (const chunk of response) {
                        console.log('Received raw chunk:', chunk);
                        // Extract only the new content from the chunk
                        const newContent = chunk.startsWith(previousChunk) 
                            ? chunk.slice(previousChunk.length) 
                            : chunk;
                        console.log('New content:', newContent);
                        fullResponse += newContent;
                        onChunk(newContent);
                        previousChunk = chunk;
                    }
                    console.log('Full response:', fullResponse);
                    return { success: true, response: fullResponse };
                } else {
                    const response = await this.session.prompt(text);
                    console.log('Full response:', response);
                    return { success: true, response };
                }
            }
        } catch (error) {
            console.error('Failed to generate response:', error);
            return { success: false, error: error.message };
        }
    }

    async checkSimilarity(text1, text2) {
        console.log('Checking similarity between texts...', { text1, text2 });
        if (!this.session) {
            console.log('No session, initializing...');
            const initialized = await this.initialize();
            if (!initialized) {
                console.error('Failed to initialize AI');
                return { success: false, error: 'Failed to initialize any AI model' };
            }
        }

        const prompt = `Compare these two texts and rate their similarity from 0 to 100, where 100 means identical meaning and 0 means completely different:
Text 1: "${text1}"
Text 2: "${text2}"
Consider:
- Spelling Similarity
- Letter arrangement
- Common typos
- Phonetic Similarity
- Similar Grammar

Construct your answer in the following format and no other text: "Similarity: {score}%"`;

        try {
            console.log('Prompting AI for similarity check...');
            const result = await this.prompt(prompt);
            if (!result.success) {
                throw new Error(result.error);
            }

            console.log('Raw similarity response:', result.response);
            const match = result.response.match(/Similarity:\s*(\d+)%?/i);
            
            if (!match) {
                console.error('Could not extract similarity score from response:', result.response);
                return { success: false, error: 'Invalid response format' };
            }

            const similarity = parseInt(match[1], 10);
            if (isNaN(similarity)) {
                console.error('Extracted value is not a valid number:', match[1]);
                return { success: false, error: 'Invalid similarity score' };
            }

            console.log('Extracted similarity score:', similarity);
            return { 
                success: true, 
                score: Math.max(0, Math.min(100, similarity)),
                rawResponse: result.response 
            };
        } catch (error) {
            console.error('Failed to check similarity:', error);
            return { success: false, error: error.message };
        }
    }

    async destroy() {
        console.log('Destroying AI session...');
        try {
            if (this.session) {
                if (!this.usingFallback && 'chrome' in window && 'aiOriginTrial' in chrome) {
                    await this.session.destroy();
                } else if (this.usingFallback && 'ai' in window && 'languageModel' in window.ai) {
                    await this.session.destroy();
                }
                this.session = null;
                console.log('AI session destroyed successfully');
            }
        } catch (error) {
            console.error('Error destroying AI session:', error);
        }
    }
}

export const promptService = new PromptService();
