const injectStyles = (extensionId) => {
    if (!document.getElementById('transpage-tooltip-styles')) {
        const styles = document.createElement('style');
        styles.id = 'transpage-tooltip-styles';
        styles.textContent = `
            @font-face {
                font-family: 'FineprintPro';
                src: url('chrome-extension://${extensionId}/fonts/FineprintProRegular.OTF') format('opentype');
                font-weight: normal;
                font-style: normal;
            }
            .transpage-word {
                cursor: pointer;
                border: 2px solid #666666;
                border-radius: 4px;
                position: relative;
                display: inline-block;
                padding: 0 4px;
                font-family: 'FineprintPro', sans-serif !important;
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
                left: -6px;
                top: -6px;
                width: 12px;
                height: 12px;
                background-color: #333333;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
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
    }
};
