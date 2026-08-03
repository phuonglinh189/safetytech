let categoryChart = null;
let radarChart = null;
let currentResults = null;
let selectedLanguage = 'en';
const translationsCache = {};

// Category color mapping
const categoryColors = {
    'S': '#7030A0',  // Strategy - Purple
    'O': '#C00000',  // Operations - Red
    'P': '#D4A017',  // People - Gold
    'T': '#4472C4'   // Technology - Blue
};

// RGB versions for rgba() in CSS
const categoryColorsRGB = {
    'S': '112, 48, 160',      // Purple
    'O': '192, 0, 0',         // Red
    'P': '212, 160, 23',      // Gold
    'T': '68, 114, 196'       // Blue
};

let lastHeaderScroll = window.pageYOffset;
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (!header) return;

    const currentScroll = window.pageYOffset;
    if (currentScroll > lastHeaderScroll && currentScroll > 80) {
        header.classList.add('hide-header');
    } else if (currentScroll < lastHeaderScroll) {
        header.classList.remove('hide-header');
    }

    if (currentScroll > 30) {
        header.classList.add('shrink');
    } else {
        header.classList.remove('shrink');
    }

    lastHeaderScroll = Math.max(currentScroll, 0);
});

function getTranslation(key) {
    const lang = selectedLanguage || 'en';
    const t = translationsCache[lang] || {};
    return t[key] || null;
}

async function loadTranslations(lang) {
    if (translationsCache[lang]) return translationsCache[lang];
    try {
        const resp = await fetch(`/static/translations/${lang}.json`);
        if (!resp.ok) throw new Error('No translations');
        const data = await resp.json();
        translationsCache[lang] = data;
        return data;
    } catch (e) {
        console.warn('Translation load failed for', lang, e);
        translationsCache[lang] = {};
        return {};
    }
}

function applyTranslations() {
    const lang = selectedLanguage;
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const txt = getTranslation(key);
        if (txt) {
            el.textContent = txt;
        } else {
            // restore original default if translation missing
            const def = el.getAttribute('data-default');
            if (def !== null) el.textContent = def;
        }
    });

    // placeholders
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const txt = getTranslation(key);
        if (txt) el.setAttribute('placeholder', txt);
        else {
            const def = el.getAttribute('data-default-placeholder');
            if (def !== null) el.setAttribute('placeholder', def);
        }
    });

    // Special: update progress with translated template
    updateProgress();
}

// Toggle weights panel
function toggleWeights() {
    const panel = document.getElementById('weightsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Save weights
function saveWeights() {
    alert('Weights saved successfully! You can now proceed with the assessment.');
    toggleWeights();
}

// Reset weights to default
function resetWeights() {
    const inputs = document.querySelectorAll('.weight-input');
    inputs.forEach(input => {
        input.value = '1.0';
    });
    alert('All weights reset to default value (1.0)');
}

// Update progress bar with individual segments for each indicator
function updateProgress() {
    const total = 22;
    const completed = document.querySelectorAll('input[type="radio"]:checked').length;
    
    // Update text
    const progressTemplate = getTranslation('progress_text') || '{completed} of {total} indicators completed';
    document.getElementById('progressText').textContent = progressTemplate.replace('{completed}', completed).replace('{total}', total);
    
    // Update segments
    updateProgressSegments();
    
    // Enable/disable calculate button
    const calculateBtn = document.getElementById('calculateBtn');
    if (completed === total) {
        calculateBtn.disabled = false;
        calculateBtn.style.background = 'linear-gradient(135deg, #7030A0 0%, #501878 100%)';
    } else {
        calculateBtn.disabled = true;
        calculateBtn.style.background = '#ccc';
    }
}

// Initialize progress segments on page load
function initializeProgressSegments() {
    const container = document.getElementById('progressBarContainer');
    container.innerHTML = ''; // Clear existing
    
    // Get all indicator codes in order (S1-S5, O1-O7, P1-P4, T1-T6)
    const indicators = [
        'S1', 'S2', 'S3', 'S4', 'S5',
        'O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7',
        'P1', 'P2', 'P3', 'P4',
        'T1', 'T2', 'T3', 'T4', 'T5', 'T6'
    ];
    
    indicators.forEach(code => {
        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        segment.id = `progress_${code}`;
        segment.setAttribute('data-category', code.charAt(0));
        segment.textContent = code;
        segment.title = code;
        segment.onclick = () => scrollToIndicator(code);
        container.appendChild(segment);
    });
    
    updateProgressSegments();
}

// Update which segments are filled
function updateProgressSegments() {
    const indicators = [
        'S1', 'S2', 'S3', 'S4', 'S5',
        'O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7',
        'P1', 'P2', 'P3', 'P4',
        'T1', 'T2', 'T3', 'T4', 'T5', 'T6'
    ];
    
    indicators.forEach(code => {
        const segment = document.getElementById(`progress_${code}`);
        const radio = document.querySelector(`input[name="${code}"]:checked`);
        const categoryPrefix = code.charAt(0);
        const categoryColor = categoryColors[categoryPrefix];
        
        if (radio) {
            segment.classList.add('filled');
            segment.style.backgroundColor = categoryColor;
        } else {
            segment.classList.remove('filled');
            segment.style.backgroundColor = '#d0d0d0';
        }
    });
}

// Scroll to a specific indicator
function scrollToIndicator(code) {
    const element = document.querySelector(`input[name="${code}"]`);
    if (element) {
        element.closest('.indicator-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Get all selections
function getSelections() {
    const selections = {};
    const radios = document.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
        selections[radio.name] = radio.value;
    });
    return selections;
}

// Get all weights
function getWeights() {
    const weights = {};
    const inputs = document.querySelectorAll('.weight-input');
    inputs.forEach(input => {
        weights[input.id.replace('weight_', '')] = input.value;
    });
    return weights;
}

// Calculate maturity
async function calculateMaturity() {
    const selections = getSelections();
    
    if (Object.keys(selections).length !== 22) {
        alert(getTranslation('please_complete_all') || 'Please complete all 22 indicators before calculating.');
        return;
    }
    
    try {
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selections: selections,
                language: selectedLanguage
            })
        });
        
        const results = await response.json();
        currentResults = results;
        displayResults(results);
    } catch (error) {
        console.error('Error calculating maturity:', error);
        alert('An error occurred while calculating. Please try again.');
    }
}

// Display results
function displayResults(results) {
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('overallScore').textContent = results.overall_score.toFixed(2);
    document.getElementById('maturityLevel').textContent = results.maturity_level;
    document.getElementById('levelDescription').textContent = results.level_description;
    
    // Display category details
    const categoryDetails = document.getElementById('categoryDetails');
    categoryDetails.innerHTML = '';
    
    for (const [key, category] of Object.entries(results.category_scores)) {
        const card = document.createElement('div');
        card.className = 'category-detail-card';
        card.style.borderLeftColor = category.color;
        const translated = getTranslation(`category_NAME_${key}`) || category.name;
        card.innerHTML = `
            <h4>${translated}</h4>
            <div class="category-score" style="color: ${category.color}">${category.score.toFixed(2)}</div>
            <div class="category-level">Level ${Math.round(category.score)}</div>
        `;
        
        categoryDetails.appendChild(card);
    }
    
    // Create charts
    createCategoryChart(results.category_scores);
    createRadarChart(results.category_scores);
    
    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Create category bar chart
function createCategoryChart(categoryScores) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const labels = [];
    const data = [];
    const colors = [];

    for (const [catKey, category] of Object.entries(categoryScores)) {
        const translated = getTranslation(`category_NAME_${catKey}`) || category.name;
        labels.push(translated);
        data.push(category.score);
        colors.push(category.color);
    }
    
    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Maturity Score',
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Maturity Level'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Score: ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Create radar chart
function createRadarChart(categoryScores) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (radarChart) {
        radarChart.destroy();
    }
    
    const labels = [];
    const data = [];

    for (const [catKey, category] of Object.entries(categoryScores)) {
        const translated = getTranslation(`category_NAME_${catKey}`) || category.name;
        labels.push(translated);
        data.push(category.score);
    }
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Maturity Score',
                data: data,
                backgroundColor: 'rgba(112, 48, 160, 0.2)',
                borderColor: 'rgba(112, 48, 160, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(112, 48, 160, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(112, 48, 160, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Export to PDF (and save assessment)
async function exportPDF() {
    const orgName = document.getElementById('orgName').value;
    const assessorName = document.getElementById('assessorName').value;
    const selections = getSelections();
    
    if (!orgName || !assessorName) {
        alert(getTranslation('please_enter_names') || 'Please enter both Organization Name and Assessor Name.');
        return;
    }
    
    if (!currentResults) {
        alert('Please calculate the maturity level first.');
        return;
    }
    
    try {
        // First, save the assessment to backend
        const saveResponse = await fetch('/save_assessment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                organization_name: orgName,
                assessor_name: assessorName,
                selections: selections,
                results: currentResults,
                language: selectedLanguage
            })
        });
        
        const saveData = await saveResponse.json();
        if (!saveData.success) {
            alert(`Error saving assessment: ${saveData.message}`);
            return;
        }
        
        // Then generate and download PDF
        const response = await fetch('/export_pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selections: selections,
                results: currentResults,
                organization_name: orgName
                ,language: selectedLanguage
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `maturity_assessment_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Error generating PDF. Please try again.');
        }
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('An error occurred while exporting. Please try again.');
    }
}


// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // restore language preference
    const saved = localStorage.getItem('maturity_lang');
    if (saved) selectedLanguage = saved;
    const select = document.getElementById('languageSelect');
    // store default texts for all translatable elements so we can restore when translations missing
    const transEls = document.querySelectorAll('[data-i18n]');
    transEls.forEach(el => {
        if (!el.hasAttribute('data-default')) {
            el.setAttribute('data-default', el.textContent || '');
        }
    });
    const phEls = document.querySelectorAll('[data-i18n-placeholder]');
    phEls.forEach(el => {
        if (!el.hasAttribute('data-default-placeholder')) {
            el.setAttribute('data-default-placeholder', el.getAttribute('placeholder') || '');
        }
    });
    if (select) {
        select.value = selectedLanguage;
        select.addEventListener('change', async (e) => {
            selectedLanguage = e.target.value;
            localStorage.setItem('maturity_lang', selectedLanguage);
            await loadTranslations(selectedLanguage);
            applyTranslations();
        });
    }

    // Initialize progress bar segments
    initializeProgressSegments();
    
    // Apply category colors to indicator cards
    document.querySelectorAll('.indicator-card[data-category-color]').forEach(card => {
        const color = card.getAttribute('data-category-color');
        const categoryPrefix = Array.from(card.querySelector('input[type="radio"]').name)[0];
        const rgb = categoryColorsRGB[categoryPrefix];
        card.style.setProperty('--category-color', color);
        if (rgb) card.style.setProperty('--category-color-rgb', rgb);
    });
    
    // load and apply translations
    loadTranslations(selectedLanguage).then(() => applyTranslations());
    updateProgress();
});

