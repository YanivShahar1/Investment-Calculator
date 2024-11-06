// static/js/main.js
import { APIService } from './services/api.js';
import { ValidationService } from './services/validation.js';
import { FormatterService } from './services/formatter.js';
import { VisualizationService } from './services/visualization.js';
import { StockManager } from './components/stockManager.js';
import { ResultsTable } from './components/resultsTable.js';
import { LoggerService } from './services/logger.js';

class InvestmentCalculator {
    constructor() {
        LoggerService.info('InvestmentCalculator', 'Initializing calculator');
        
        // Initialize properties
        this.stockManager = new StockManager();
        this.boundMethods = this.bindMethods();
        
        // Start initialization
        this.initializeApplication();
    }

    bindMethods() {
        LoggerService.debug('InvestmentCalculator', 'Binding class methods');
        
        // Bind all methods that need 'this' context
        this.handleCalculation = this.handleCalculation.bind(this);
        this.handleSearchInput = this.handleSearchInput.bind(this);
        this.validateYearInputs = this.validateYearInputs.bind(this);
        this.hideDropdown = this.hideDropdown.bind(this);
        this.displaySearchResults = this.displaySearchResults.bind(this);
        this.addStock = this.addStock.bind(this);
        this.removeStock = this.removeStock.bind(this);
        this.displayError = this.displayError.bind(this);
        this.clearError = this.clearError.bind(this);
        this.clearSearch = this.clearSearch.bind(this);
    }

    async initializeApplication() {
        try {
            await this.stockManager.initialize();
            this.initializeForm();
            this.setupEventListeners();
            LoggerService.info('InvestmentCalculator', 'Application initialized successfully');
        } catch (error) {
            LoggerService.error('InvestmentCalculator', 'Failed to initialize application', error);
            this.displayError('Failed to initialize calculator. Please refresh the page.');
        }
    }

    initializeForm() {
        LoggerService.debug('InvestmentCalculator', 'Initializing form');
        try {
            const currentYear = new Date().getFullYear();
            const elements = {
                endYear: currentYear,
                startYear: currentYear - 5,
                initialInvestment: '10000',
                additionAmount: '0'
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                } else {
                    LoggerService.warn('InvestmentCalculator', `Form element not found: ${id}`);
                }
            });
        } catch (error) {
            LoggerService.error('InvestmentCalculator', 'Form initialization failed', error);
            throw error;
        }
    }

    setupEventListeners() {
        LoggerService.debug('InvestmentCalculator', 'Setting up event listeners');

        // Form submission
        const form = document.getElementById('calculatorForm');
        if (form) {
            form.addEventListener('submit', this.handleCalculation);
        }

        // Search input
        const searchInput = document.querySelector('.stock-search');
        if (searchInput) {
            const debouncedSearch = this.debounce((e) => this.handleSearchInput(e), 200);
            searchInput.addEventListener('input', debouncedSearch);
        }

        // Year validation
        ['startYear', 'endYear'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', this.validateYearInputs);
            }
        });

        // Dropdown close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.stock-search-wrapper')) {
                this.hideDropdown();
            }
        });

        LoggerService.info('InvestmentCalculator', 'Event listeners setup completed');
    }

    async handleSearchInput(event) {
        const query = event.target.value.trim();
        LoggerService.debug('InvestmentCalculator', 'Search input received', { query });

        if (!query) {
            this.hideDropdown();
            return;
        }

        try {
            const results = await this.stockManager.searchStocks(query);
            this.displaySearchResults(results);
        } catch (error) {
            LoggerService.error('InvestmentCalculator', 'Search operation failed', {
                query,
                error: error.message
            });
            this.displayError('Failed to search stocks');
        }
    }

    displaySearchResults(results) {
        LoggerService.debug('InvestmentCalculator', 'Displaying search results', { resultCount: results.length });
        
        const dropdown = document.querySelector('.stock-dropdown');
        if (!dropdown) {
            LoggerService.error('InvestmentCalculator', 'Dropdown element not found');
            return;
        }

        dropdown.innerHTML = '';

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="stock-option">No results found</div>';
        } else {
            results.forEach(stock => {
                if (!this.stockManager.selectedStocks.has(stock.symbol)) {
                    this.addStockOption(stock, dropdown);
                }
            });
        }

        dropdown.classList.remove('hidden');
    }

    addStockOption(stock, dropdown) {
        const option = document.createElement('div');
        option.className = `stock-option ${stock.isCustom ? 'custom-stock' : ''}`;
        option.innerHTML = `
            <div class="stock-info">
                <span class="stock-symbol">${stock.symbol}</span>
                ${stock.isCustom ? 
                    `<span class="custom-label">Add Custom Stock</span>` : 
                    `<span class="stock-name">${stock.name}</span>`
                }
            </div>
        `;
        option.addEventListener('click', () => this.addStock(stock));
        dropdown.appendChild(option);
    }

    displayResults(data) {
        LoggerService.debug('InvestmentCalculator', 'Displaying results', data);
        
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) {
            LoggerService.error('InvestmentCalculator', 'Results container not found');
            return;
        }

        resultsDiv.innerHTML = '';

        // Clear all previous warnings first
        this.clearAllWarnings();

        // Display warnings if present
        if (data.warnings) {
            this.displayWarnings(data.warnings);
        }

        const table = ResultsTable.create(data.data);
        resultsDiv.appendChild(table);
    }

    clearAllWarnings() {
        // Clear warnings from all stock items
        document.querySelectorAll('.stock-warning').forEach(warning => {
            warning.textContent = '';
            warning.classList.add('hidden');
        });
        // Clear any warning highlights
        document.querySelectorAll('.stock-item').forEach(item => {
            item.classList.remove('has-warning');
        });
    }


    displayStockWarning(symbol, warning) {
        const stockElement = document.getElementById(`stock-${symbol}`);
        if (!stockElement) {
            LoggerService.warn('InvestmentCalculator', 'Stock element not found for warning', {
                symbol,
                warning
            });
            return;
        }

        const warningElement = stockElement.querySelector('.stock-warning');
        if (warningElement) {
            // Format the warning message based on the warning data structure
            let warningMessage = '';
            if (typeof warning === 'object') {
                if (warning.status === 'all_null' || warning.status === 'no_valid_data') {
                    warningMessage = 'Invalid symbol or no data available';
                } else if (warning.status === 'partial_data' && warning.first_valid_date) {
                    const startYear = warning.first_valid_date.split('-')[0];
                    warningMessage = `Data available since ${startYear}`;
                } else if (warning.error) {
                    warningMessage = warning.error;
                } else {
                    warningMessage = `Unknown error occurred, error status: ${warning.status}`;
                }
            } else {
                warningMessage = String(warning); // Convert to string in case it's not already
            }

            warningElement.textContent = warningMessage;
            warningElement.classList.remove('hidden');
            stockElement.classList.add('has-warning');

            LoggerService.debug('InvestmentCalculator', 'Warning displayed for stock', {
                symbol,
                warningMessage
            });
        }
    }

    displayWarnings(warnings) {
        LoggerService.debug('InvestmentCalculator', 'Processing warnings', warnings);
    
        const { invalidSymbols = [], dataIssues = {}, dateRangeIssues = [] } = warnings;
    
        // Handle invalid symbols and data issues together
        invalidSymbols.forEach(symbol => {
            const issue = dataIssues[symbol] || { status: 'no_data', error: 'Symbol not found' };
            this.displayStockWarning(symbol, issue);
        });
    
        // Handle any remaining data issues for valid symbols
        Object.entries(dataIssues).forEach(([symbol, issue]) => {
            if (!invalidSymbols.includes(symbol)) {
                this.displayStockWarning(symbol, issue);
            }
        });
    
        // Handle date range issues (if any)
        if (dateRangeIssues.length > 0) {
            this.displayDateRangeWarning(dateRangeIssues);
        }
    }


    removeStock(symbol) {
        LoggerService.debug('InvestmentCalculator', 'Removing stock', { symbol });
        
        const result = this.stockManager.removeStock(symbol);
        if (result.success) {
            const stockElement = document.getElementById(`stock-${symbol}`);
            if (stockElement) {
                stockElement.remove();
            }
        } else {
            this.displayError(result.error);
        }
    }

    async handleCalculation(event) {
        event.preventDefault();
        this.clearError();
        
        // Clear previous graph and results
        const graphDiv = document.getElementById('graph');
        const resultsDiv = document.getElementById('results');
        if (graphDiv) graphDiv.innerHTML = '';
        if (resultsDiv) resultsDiv.innerHTML = '';
        
        const startTime = LoggerService.startTimer();
        
        LoggerService.info('InvestmentCalculator', 'Starting calculation process');
    
        try {
            const formData = this.getFormData();
            const validation = ValidationService.validateFormInputs(formData); // Rename/modify to only check basic inputs
            
            if (!validation.isValid) {
                LoggerService.warn('InvestmentCalculator', 'Form validation failed', validation.errors);
                this.displayErrors(validation.errors);
                return;
            }
    
            this.showLoading();
            const result = await APIService.calculateInvestment(formData);
    
            // If we got data, display it regardless of warnings
            if (result.data) {
                const plotConfig = VisualizationService.createPlotConfig(result.data);
                await Plotly.newPlot('graph', plotConfig.traces, plotConfig.layout, {
                    responsive: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d']
                });
                this.displayResults(result);
            }
    
            // Display any warnings, but don't treat them as errors
            if (result.warnings) {
                this.displayWarnings(result.warnings);
            }
    
            LoggerService.endTimer(startTime, 'InvestmentCalculator', 'calculation');
    
        } catch (error) {
            LoggerService.error('InvestmentCalculator', 'Calculation failed', error);
            this.displayError(FormatterService.formatErrorMessage(error));
        } finally {
            this.hideLoading();
        }
    }
    
    displayWarnings(warnings) {
        LoggerService.debug('InvestmentCalculator', 'Processing warnings', warnings);
    
        const { invalidSymbols = [], dataIssues = {}, dateRangeIssues = [] } = warnings;
    
        // Handle invalid symbols and data issues together
        invalidSymbols.forEach(symbol => {
            const issue = dataIssues[symbol] || 'Symbol not found';
            this.displayStockWarning(symbol, issue);
        });
    
        // Handle any remaining data issues for valid symbols
        Object.entries(dataIssues).forEach(([symbol, issue]) => {
            if (!invalidSymbols.includes(symbol)) {
                this.displayStockWarning(symbol, issue);
            }
        });
    
        // Handle date range issues (if any)
        if (dateRangeIssues.length > 0) {
            this.displayDateRangeWarning(dateRangeIssues);
        }
    }

    addStock(stock) {
        LoggerService.debug('InvestmentCalculator', 'Adding stock', stock);
        
        if (this.stockManager.addStock(stock)) {
            const stockList = document.querySelector('.selected-stocks');
            if (!stockList) {
                LoggerService.error('InvestmentCalculator', 'Stock list element not found');
                return;
            }

            const stockElement = document.createElement('div');
            stockElement.className = `stock-item ${stock.isCustom ? 'custom-stock' : ''}`;
            stockElement.id = `stock-${stock.symbol}`;
            
            stockElement.innerHTML = `
                <div class="stock-info">
                    <div class="stock-header">
                        <span class="stock-symbol">${stock.symbol}</span>
                        <span class="stock-name">${stock.isCustom ? 'Custom Stock Symbol' : stock.name}</span>
                    </div>
                    <div class="stock-warning hidden"></div>
                </div>
                <button type="button" class="remove-stock" title="Remove stock">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            const removeButton = stockElement.querySelector('.remove-stock');
            removeButton.addEventListener('click', () => this.removeStock(stock.symbol));
            
            stockList.appendChild(stockElement);
            this.clearSearch();
        }
    }


    displayError(message) {
        LoggerService.debug('InvestmentCalculator', 'Displaying error', { message });
        
        const errorContainer = document.getElementById('errorContainer');
        const errorText = document.getElementById('errorText');
        
        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.classList.remove('hidden');
        } else {
            LoggerService.error('InvestmentCalculator', 'Error container elements not found');
        }
    }

    displayErrors(errors) {
        const errorContainer = document.getElementById('errorContainer');
        const errorText = document.getElementById('errorText');
        
        if (errorContainer && errorText) {
            errorText.innerHTML = errors.map(error => `<div>${error}</div>`).join('');
            errorContainer.classList.remove('hidden');
        }
    }

    clearError() {
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.classList.add('hidden');
        }
    }

    showLoading() {
        document.getElementById('loading')?.classList.remove('hidden');
        document.querySelector('button[type="submit"]')?.setAttribute('disabled', 'true');
    }

    hideLoading() {
        document.getElementById('loading')?.classList.add('hidden');
        document.querySelector('button[type="submit"]')?.removeAttribute('disabled');
    }

    clearSearch() {
        const searchInput = document.querySelector('.stock-search');
        if (searchInput) {
            searchInput.value = '';
        }
        this.hideDropdown();
    }

    hideDropdown() {
        const dropdown = document.querySelector('.stock-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    validateYearInputs() {
        const startYear = parseInt(document.getElementById('startYear')?.value);
        const endYear = parseInt(document.getElementById('endYear')?.value);
        
        const validation = ValidationService.validateYearInputs(startYear, endYear);
        if (!validation.isValid) {
            this.displayError(validation.error);
            return false;
        }
        
        this.clearError();
        return true;
    }

    getFormData() {
        return {
            initialInvestment: parseFloat(document.getElementById('initialInvestment')?.value || '0'),
            startYear: parseInt(document.getElementById('startYear')?.value || '0'),
            endYear: parseInt(document.getElementById('endYear')?.value || '0'),
            additionAmount: parseFloat(document.getElementById('additionAmount')?.value || '0'),
            additionFrequency: document.getElementById('additionFrequency')?.value || 'none',
            adjustForInflation: document.getElementById('adjustForInflation')?.checked || false,
            stocks: Array.from(this.stockManager.selectedStocks)
        };
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                LoggerService.debug('InvestmentCalculator', 'Debounced function executed');
                func.apply(this, args);
            }, wait);
        };
    }
}

// Initialize the calculator when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new InvestmentCalculator();
});