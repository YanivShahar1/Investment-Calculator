import { stockCore } from './stockCore.js';

class StockUI {
    constructor() {
        this.initializeEventListeners();
    }

    // Initialization methods
    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeForm();
            this.initializeStockSearch();
            this.setupFormListeners();
            this.setupSearchListeners();
        });
    }

    initializeForm() {
        const currentYear = new Date().getFullYear();
        document.getElementById('endYear').value = currentYear;
        document.getElementById('startYear').value = currentYear - 5;
        document.getElementById('initialInvestment').value = 10000;
        document.getElementById('additionAmount').value = 0;
    }

    async initializeStockSearch() {
        try {
            const searchInput = document.querySelector('.stock-search');
            searchInput.addEventListener('input', this.debounce(this.handleSearchInput.bind(this), 200));
            
            const response = await fetch('/api/stocks');
            stockCore.stocksList = await response.json();
        } catch (error) {
            console.error('Error initializing stock search:', error);
            this.displayError('Failed to load stocks list. Please refresh the page.');
        }
    }

    setupFormListeners() {
        document.getElementById('calculatorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCalculation();
        });

        ['startYear', 'endYear'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.validateYearInputs());
        });
    }

    // UI Event Handlers
    async handleCalculation() {
        if (!this.validateForm()) return;

        this.clearAllErrors();
        this.showLoading();
        this.clearResults();

        try {
            const formData = this.getFormData();
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (data.errors) {
                this.handleErrors(data.errors, formData.stocks);
                return;
            }

            if (data.warnings) {
                this.handleWarnings(data.warnings);
            }

            if (data.data && data.graph) {
                this.displayResults(data);
            }
        } catch (error) {
            console.error('Error during calculation:', error);
            this.displayError(stockCore.formatErrorMessage(error.message));
        } finally {
            this.hideLoading();
        }
    }

    async handleSearchInput(event) {
        const query = event.target.value.trim().toUpperCase();
        if (!query) {
            this.hideDropdown();
            return;
        }

        const matchingStocks = this.findMatchingStocks(query);
        this.displaySearchResults(matchingStocks);
    }

    // UI Display Methods
    displaySearchResults(results) {
        const dropdown = document.querySelector('.stock-dropdown');
        dropdown.innerHTML = '';

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="stock-option">No results found</div>';
        } else {
            this.renderStockOptions(results, dropdown);
        }
        
        dropdown.classList.remove('hidden');
    }

    displayResults(data) {
        const { traces, layout } = stockCore.createPlotConfig(data.data);
        Plotly.newPlot('graph', traces, layout, {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });

        this.renderResultsTable(data.data);
    }

    addStock(stock) {
        if (!stockCore.addStock(stock)) return; // Use core logic

        const stockList = document.querySelector('.selected-stocks');
        const stockElement = document.createElement('div');
        stockElement.className = 'stock-item';
        stockElement.id = `stock-${stock.symbol}`;

        stockElement.innerHTML = `
            <div class="stock-info">
                <div class="stock-header">
                    <span class="stock-symbol">${stock.symbol}</span>
                    <span class="stock-name">${stock.isCustom ? 'Custom Stock Symbol' : stock.name}</span>
                </div>
                <div class="stock-error hidden"></div>
            </div>
            <button 
                type="button" 
                class="remove-stock" 
                onclick="stockUI.removeStock('${stock.symbol}')" 
                title="Remove stock">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        stockList.appendChild(stockElement);
        this.clearSearch();
    }

    // Helper Methods
    renderStockOptions(results, dropdown) {
        const knownStocks = results.filter(stock => !stock.isCustom);
        const customStock = results.find(stock => stock.isCustom);

        knownStocks.forEach(stock => {
            if (!stockCore.selectedStocks.has(stock.symbol)) {
                this.addStockOption(stock, dropdown);
            }
        });

        if (customStock) {
            this.addCustomStockOption(customStock, dropdown, knownStocks.length > 0);
        }
    }

    renderResultsTable(data) {
        // Implementation of results table rendering
        // ... (existing implementation)
    }

    // Utility Methods
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    getFormData() {
        return {
            initialInvestment: parseFloat(document.getElementById('initialInvestment').value),
            startYear: parseInt(document.getElementById('startYear').value),
            endYear: parseInt(document.getElementById('endYear').value),
            additionAmount: parseFloat(document.getElementById('additionAmount').value),
            additionFrequency: document.getElementById('additionFrequency').value,
            adjustForInflation: document.getElementById('adjustForInflation').checked,
            stocks: Array.from(stockCore.selectedStocks)
        };
    }
}

// Initialize the UI
const stockUI = new StockUI();