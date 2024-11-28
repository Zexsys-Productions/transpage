const setupTooltip = () => {
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
};
