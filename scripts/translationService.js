// Global TranslationService class
class TranslationService {
  constructor() {
    console.log('TranslationService initialized');
    this.translator = null;
    
    // Check if Translation API is supported
    if (!('translation' in self && 'createTranslator' in self.translation)) {
      console.error('Translation API is not supported in this browser');
    }
  }

  async translate(text, sourceLanguage, targetLanguage) {
    try {
      // Verify Translation API is available
      if (!('translation' in self && 'createTranslator' in self.translation)) {
        throw new Error('Translation API is not supported in this browser');
      }

      // Check if translation is supported
      const canTranslate = await translation.canTranslate({
        sourceLanguage,
        targetLanguage,
      });

      if (canTranslate === 'no') {
        throw new Error('Translation not supported for these languages');
      }

      // Create translator if needed
      if (!this.translator || 
          this.translator.sourceLanguage !== sourceLanguage || 
          this.translator.targetLanguage !== targetLanguage) {
        this.translator = await translation.createTranslator({
          sourceLanguage,
          targetLanguage,
        });
      }

      // Perform translation
      const translatedText = await this.translator.translate(text);

      return {
        success: true,
        translatedText,
        error: null
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        success: false,
        translatedText: null,
        error: error.message || 'Translation failed'
      };
    }
  }
}

// Create global instance
window.translationService = new TranslationService();
