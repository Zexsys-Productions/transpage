const scrollToWord = (word) => {
    const elements = document.querySelectorAll('.transpage-word');
    for (const element of elements) {
        if (element.dataset.translatedText === word) {
            // Scroll the element into view with smooth animation
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });
            
            // Add a brief highlight animation
            element.style.transition = 'all 0.3s ease';
            element.style.transform = 'scale(1.1)';
            element.style.boxShadow = '0 0 10px rgba(26, 115, 232, 0.5)';
            
            setTimeout(() => {
                element.style.transform = '';
                element.style.boxShadow = '';
            }, 1000);
            
            break;
        }
    }
};
