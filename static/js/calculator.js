// State management
let stocksList = [];
let selectedStocks = new Set();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    initializeStockSearch();
    setupEventListeners();
    addErrorStyles();
});

// Setup and Initialization
function initializeForm() {
    const currentYear = new Date().getFullYear();
    document.getElementById('endYear').value = currentYear;
    document.getElementById('startYear').value = currentYear - 5;
    document.getElementById('initialInvestment').value = 10000;
    document.getElementById('additionAmount').value = 0;
}

function setupEventListeners() {
    // Form submission
    document.getElementById('calculatorForm').addEventListener('submit', function(e) {
        e.preventDefault();
        calculate();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.stock-search-wrapper')) {
            document.querySelector('.stock-dropdown')?.classList.add('hidden');
        }
    });

    // Year validation
    ['startYear', 'endYear'].forEach(id => {
        document.getElementById(id).addEventListener('change', validateYearInputs);
    });
}

// Stock Search and Management
async function initializeStockSearch() {
    try {
        const searchInput = document.querySelector('.stock-search');
        searchInput.addEventListener('input', debounce(handleSearchInput, 200));
        
        const response = await fetch('/api/stocks');
        stocksList = await response.json();
    } catch (error) {
        console.error('Error initializing stock search:', error);
        displayError('Failed to load stocks list. Please refresh the page.');
    }
}

async function handleSearchInput(e) {
    const query = e.target.value.trim().toUpperCase();
    const dropdown = document.querySelector('.stock-dropdown');
    
    if (!query) {
        dropdown.classList.add('hidden');
        return;
    }

    try {
        // First search in known stocks
        let matchingStocks = stocksList.filter(stock => 
            stock.symbol.includes(query) || 
            stock.name.toUpperCase().includes(query)
        );

        // Always add option to use custom stock if input looks like a valid symbol
        if (/^[A-Z0-9.]{1,10}$/.test(query) && !matchingStocks.find(s => s.symbol === query)) {
            matchingStocks.push({
                symbol: query,
                name: 'Custom Stock Symbol',
                isCustom: true
            });
        }

        displaySearchResults(matchingStocks);
    } catch (error) {
        console.error('Error searching stocks:', error);
    }
}

function displaySearchResults(results) {
    const dropdown = document.querySelector('.stock-dropdown');
    dropdown.innerHTML = '';

    if (results.length === 0) {
        dropdown.innerHTML = '<div class="stock-option">No results found</div>';
    } else {
        // First show known stocks
        const knownStocks = results.filter(stock => !stock.isCustom);
        if (knownStocks.length > 0) {
            knownStocks.forEach(stock => {
                if (!selectedStocks.has(stock.symbol)) {
                    addStockOption(stock, dropdown);
                }
            });
        }

        // Then show custom stock option if exists
        const customStock = results.find(stock => stock.isCustom);
        if (customStock) {
            // Add separator if we had known stocks
            if (knownStocks.length > 0) {
                const separator = document.createElement('div');
                separator.className = 'stock-separator';
                separator.textContent = 'Custom Stock';
                dropdown.appendChild(separator);
            }
            addStockOption(customStock, dropdown, true);
        }
    }
    dropdown.classList.remove('hidden');
}

// Helper function to add stock option to dropdown
function addStockOption(stock, dropdown, isCustom = false) {
    const option = document.createElement('div');
    option.className = `stock-option ${isCustom ? 'custom-stock' : ''}`;
    option.innerHTML = `
        <div class="stock-info">
            <span class="stock-symbol">${stock.symbol}</span>
            ${isCustom ? 
                `<span class="custom-label">Add Custom Stock</span>` : 
                `<span class="stock-name">${stock.name}</span>`
            }
        </div>
    `;
    option.addEventListener('click', () => addStock(stock));
    dropdown.appendChild(option);
}


function removeStock(symbol) {
    if (selectedStocks.size <= 1) {
        displayError("You must have at least one stock.");
        return;
    }
    
    selectedStocks.delete(symbol);
    const stockElement = document.getElementById(`stock-${symbol}`);
    if (stockElement) {
        stockElement.remove();
    }
}

function clearSearch() {
    const searchInput = document.querySelector('.stock-search');
    searchInput.value = '';
    document.querySelector('.stock-dropdown').classList.add('hidden');
}

// Calculation and Results
async function calculate() {
    if (!validateForm()) return;

    clearError();
    showLoading();
    clearResults();

    try {
        const formData = getFormData();
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.errors) {
            displayErrors(data.errors);
        } else if (data.error) {
            displayError(data.error);
        } else if (data.data && Array.isArray(data.data)) {
            createPlot(data.data);
            displayResults(data.data);
        } else {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Error during calculation:', error);
        displayError(`Calculation failed: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function createPlot(data) {
    const traces = [];
    const colors = ['#2E86C1', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6'];

    data.forEach((stockData, index) => {
        const timeData = stockData.monthly_data || stockData.yearly_data;
        if (!timeData) return;

        traces.push({
            x: timeData.map(point => point.date || point.year),
            y: timeData.map(point => point.total),
            mode: 'lines+markers',
            name: `${stockData.symbol} Total`,
            line: {color: colors[index % colors.length], width: 2},
            marker: {size: 6},
            hovertemplate: '%{x}<br>Value: $%{y:,.2f}<extra></extra>'
        });

        // Only add invested amount line once
        if (index === 0) {
            traces.push({
                x: timeData.map(point => point.date || point.year),
                y: timeData.map(point => point.invested),
                mode: 'lines',
                name: 'Invested Amount',
                line: {color: '#95A5A6', dash: 'dash', width: 2},
                hovertemplate: '%{x}<br>Invested: $%{y:,.2f}<extra></extra>'
            });
        }
    });

    const layout = {
        title: {
            text: 'Investment Growth Comparison',
            font: {size: 24}
        },
        xaxis: {
            title: 'Date',
            tickangle: -45,
            tickformat: '%Y-%m',
            gridcolor: '#E0E0E0'
        },
        yaxis: {
            title: 'Value ($)',
            tickformat: '$,.0f',
            rangemode: 'tozero',
            gridcolor: '#E0E0E0'
        },
        hovermode: 'x unified',
        showlegend: true,
        legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1
        },
        margin: {t: 100, b: 80, l: 80, r: 40},
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        font: {family: 'Arial, sans-serif'}
    };

    Plotly.newPlot('graph', traces, layout, {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    });
}

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="results-section">
            <div class="results-header">
                <h2>Investment Results</h2>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Stock</th>
                            <th>Total Value</th>
                            <th>Invested Amount</th>
                            <th>Gains</th>
                            <th>Return (%)</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

    const tbody = resultsDiv.querySelector('tbody');
    
    data.forEach(stockData => {
        const timeData = stockData.monthly_data || stockData.yearly_data;
        if (!timeData) return;

        timeData.forEach(point => {
            const row = document.createElement('tr');
            const gains = point.total - point.invested;
            row.innerHTML = `
                <td>${point.date || point.year}</td>
                <td>${stockData.symbol}</td>
                <td class="value-cell">${formatCurrency(point.total)}</td>
                <td class="value-cell">${formatCurrency(point.invested)}</td>
                <td class="value-cell ${gains >= 0 ? 'positive-value' : 'negative-value'}">
                    ${formatCurrency(gains)}
                </td>
                <td class="value-cell ${point.return_percentage >= 0 ? 'positive-value' : 'negative-value'}">
                    ${point.return_percentage.toFixed(2)}%
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

// Utility Functions
function validateForm() {
    const form = document.getElementById('calculatorForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }
    return validateYearInputs();
}

function validateYearInputs() {
    const startYear = parseInt(document.getElementById('startYear').value);
    const endYear = parseInt(document.getElementById('endYear').value);
    const currentYear = new Date().getFullYear();

    if (startYear > endYear) {
        displayError('Start year must be before end year');
        return false;
    }

    if (startYear < 1970) {
        displayError('Start year must be 1970 or later');
        return false;
    }

    if (endYear > currentYear + 1) {
        displayError(`End year cannot be more than ${currentYear + 1}`);
        return false;
    }

    return true;
}

function getFormData() {
    return {
        initialInvestment: parseFloat(document.getElementById('initialInvestment').value),
        startYear: parseInt(document.getElementById('startYear').value),
        endYear: parseInt(document.getElementById('endYear').value),
        additionAmount: parseFloat(document.getElementById('additionAmount').value),
        additionFrequency: document.getElementById('additionFrequency').value,
        adjustForInflation: document.getElementById('adjustForInflation').checked,
        stocks: Array.from(selectedStocks)
    };
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.querySelector('button[type="submit"]').disabled = true;
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.querySelector('button[type="submit"]').disabled = false;
}

function clearResults() {
    document.getElementById('graph').innerHTML = '';
    document.getElementById('results').innerHTML = '';
}

function displayError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorText = document.getElementById('errorText');
    const graphDiv = document.getElementById('graph');
    const resultsDiv = document.getElementById('results');
    
    // Show error message
    errorText.textContent = message;
    errorContainer.classList.remove('hidden');
    
    // Clear results
    graphDiv.innerHTML = '';
    resultsDiv.innerHTML = '';
}

function clearError() {
    document.getElementById('errorContainer').classList.add('hidden');
}

function displayErrors(errors) {
    // First, hide all error messages
    document.querySelectorAll('.stock-input .error-message').forEach(msg => {
        msg.textContent = '';
        msg.classList.add('hidden');
    });

    // Display new error messages
    Object.entries(errors).forEach(([symbol, error]) => {
        const stockInput = Array.from(document.querySelectorAll('.stock-input'))
            .find(div => div.querySelector('input').value === symbol);
        if (stockInput) {
            const errorSpan = stockInput.querySelector('.error-message');
            errorSpan.textContent = error;
            errorSpan.classList.remove('hidden');
        }
    });
}


function displayErrors2(errors) {
    // Clear any previous global error
    clearError();
    
    Object.entries(errors).forEach(([symbol, error]) => {
        // Get the stock element
        const stockElement = document.getElementById(`stock-${symbol}`);
        if (stockElement) {
            stockElement.classList.add('has-error');
            
            // Add or update error message
            let errorDiv = stockElement.querySelector('.stock-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'stock-error';
                stockElement.appendChild(errorDiv);
            }

            // Make error message more user-friendly
            let userFriendlyError = formatErrorMessage(error);
            errorDiv.textContent = userFriendlyError;
        }
    });
}

// Add a function to format error messages
function formatErrorMessage(error) {
    // Check for common error patterns and convert to user-friendly messages
    if (error.includes('Unexpected token') || error.includes('not valid JSON')) {
        return 'Invalid stock symbol. This stock may not exist or is not available for trading.';
    }
    if (error.includes('No data available')) {
        return 'No trading data available for this stock in the selected date range.';
    }
    
    // For custom stocks that don't exist
    if (error.toLowerCase().includes('not found') || error.toLowerCase().includes('invalid')) {
        return 'This stock symbol could not be found. Please verify the symbol is correct.';
    }

    // Default case
    return error;
}

// Update the error display styles
function addErrorStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .stock-error {
            color: #e74c3c;
            font-size: 0.9em;
            margin-top: 5px;
            padding: 5px 10px;
            background-color: #fdf2f2;
            border-radius: 4px;
            display: block;
        }

        .stock-item.has-error {
            border-left: 3px solid #e74c3c;
            background-color: #fff5f5;
        }

        .stock-item.has-error .stock-symbol {
            color: #e74c3c;
        }
    `;
    document.head.appendChild(style);
}

function addStock(stock) {
    if (selectedStocks.has(stock.symbol)) return;

    selectedStocks.add(stock.symbol);
    const stockList = document.querySelector('.selected-stocks');
    
    // Remove any existing error states
    const existingError = document.querySelector(`#stock-${stock.symbol}`);
    if (existingError) {
        existingError.classList.remove('has-error');
        const errorMessage = existingError.querySelector('.stock-error');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    const stockElement = document.createElement('div');
    stockElement.className = `stock-item ${stock.isCustom ? 'custom-stock' : ''}`;
    stockElement.id = `stock-${stock.symbol}`;
    stockElement.innerHTML = `
        <div class="stock-info">
            <span class="stock-symbol">${stock.symbol}</span>
            <span class="stock-name">
                ${stock.isCustom ? 'Custom Stock Symbol' : stock.name}
                ${stock.isCustom ? '<span class="custom-indicator">(Custom)</span>' : ''}
            </span>
        </div>
        <button type="button" class="remove-stock" onclick="removeStock('${stock.symbol}')" title="Remove stock">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    stockList.appendChild(stockElement);
    clearSearch();
}


function displayStockError(symbol, error) {
    const stockElement = document.getElementById(`stock-${symbol}`);
    if (stockElement) {
        stockElement.classList.add('has-error');
        let errorDiv = stockElement.querySelector('.stock-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'stock-error';
            stockElement.appendChild(errorDiv);
        }
        errorDiv.textContent = error;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}