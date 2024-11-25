class PromptService {
    constructor() {
        this.session = null;
    }

    async checkAvailability() {
        try {
            const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
            
            switch(capabilities.available) {
                case 'readily':
                    return { available: true, status: 'Model is ready to use' };
                case 'after-download':
                    return { available: true, status: 'Model needs to be downloaded first' };
                case 'no':
                    return { available: false, status: 'Model is not available on this device' };
                default:
                    return { available: false, status: 'Unknown status' };
            }
        } catch (error) {
            console.error('Failed to check Prompt API availability:', error);
            return { available: false, status: 'Error checking availability: ' + error.message };
        }
    }

    async initialize() {
        try {
            const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
            
            if (capabilities.available === 'no') {
                throw new Error('Prompt API is not available on this device');
            }

            // Create a new session with default settings
            this.session = await chrome.aiOriginTrial.languageModel.create({
                systemPrompt: 'You are a helpful language learning assistant.'
            });

            return true;
        } catch (error) {
            console.error('Failed to initialize Prompt API:', error);
            return false;
        }
    }

    async prompt(text, { streaming = false, onChunk = null } = {}) {
        if (!this.session) {
            await this.initialize();
        }

        try {
            if (streaming && onChunk) {
                const stream = this.session.promptStreaming(text);
                let result = '';
                let previousChunk = '';

                for await (const chunk of stream) {
                    const newChunk = chunk.startsWith(previousChunk)
                        ? chunk.slice(previousChunk.length)
                        : chunk;
                    
                    onChunk(newChunk);
                    result += newChunk;
                    previousChunk = chunk;
                }

                return { success: true, response: result };
            } else {
                const response = await this.session.prompt(text);
                return { success: true, response };
            }
        } catch (error) {
            console.error('Failed to get prompt response:', error);
            return { success: false, error: error.message };
        }
    }

    async checkSimilarity(userAnswer, correctAnswer) {
        if (!this.session) {
            await this.initialize();
        }

        try {
            const prompt = `Compare these two words and give me a similarity score from 0 to 100. Only respond with the number:
Word 1: "${userAnswer}"
Word 2: "${correctAnswer}"

Consider:
- Spelling similarity
- Letter arrangement
- Common typos
- Phonetic similarity

Construct your answer in this format: "The similarity score is {score}":`;

            const { success, response } = await this.prompt(prompt);
            
            if (!success) {
                throw new Error('Failed to get similarity score');
            }

            // Extract the number from the response
            const score = parseInt(response.match(/\d+/)?.[0] || '0');
            return {
                success: true,
                score: Math.min(100, Math.max(0, score)), // Ensure score is between 0 and 100
                response
            };
        } catch (error) {
            console.error('Failed to check similarity:', error);
            return { success: false, error: error.message };
        }
    }

    destroy() {
        if (this.session) {
            this.session.destroy();
            this.session = null;
        }
    }
}

export const promptService = new PromptService();
