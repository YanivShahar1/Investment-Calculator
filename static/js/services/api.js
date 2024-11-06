// static/js/services/APIService.js
import { LoggerService } from './logger.js';

export class APIService {
    static API_ENDPOINTS = {
        STOCKS_LIST: '/api/stocks',
        STOCKS_SEARCH: '/api/stocks/search',
        CALCULATE: '/calculate',
        INFLATION: '/api/inflation'
    };

    static ERROR_TYPES = {
        INVALID_INPUT: 'INVALID_INPUT',
        INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
        NO_STOCK_DATA: 'NO_STOCK_DATA',
        CALCULATION_ERROR: 'CALCULATION_ERROR',
        VISUALIZATION_ERROR: 'VISUALIZATION_ERROR',
        DATA_PROCESSING_ERROR: 'DATA_PROCESSING_ERROR',
        SERVER_ERROR: 'SERVER_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR'
    };

    static API_TIMEOUT = 30000; // 30 seconds

    /**
     * Fetches the list of available stocks
     * Corresponds to /api/stocks endpoint
     */
    static async fetchStocks() {
        const startTime = LoggerService.startTimer();
        LoggerService.info('APIService', 'Fetching stock list');

        try {
            const response = await this.fetchWithTimeout(this.API_ENDPOINTS.STOCKS_LIST);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 400) {
                    throw this.createError(data, this.ERROR_TYPES.INVALID_INPUT);
                } else if (response.status === 404) {
                    throw this.createError(data, this.ERROR_TYPES.NO_STOCK_DATA);
                } else if (response.status === 500) {
                    throw this.createError(data, this.ERROR_TYPES.SERVER_ERROR);
                } else {
                    throw this.createError(data, this.ERROR_TYPES.DATA_PROCESSING_ERROR);
                }
            }

            LoggerService.info('APIService', 'Successfully fetched stock list', {
                stockCount: data.length,
                duration: LoggerService.endTimer(startTime, 'APIService', 'fetchStocks')
            });

            return data;

        } catch (error) {
            LoggerService.error('APIService', 'Failed to fetch stocks', {
                error: error.message,
                type: error.type,
                details: error.details,
                status: error.status
            });
            throw error;
        }
    }

    /**
     * Fetches inflation data
     * Corresponds to /api/inflation endpoint
     */
    static async fetchInflationData() {
        const startTime = LoggerService.startTimer();
        LoggerService.info('APIService', 'Fetching inflation data');

        try {
            const response = await this.fetchWithTimeout(this.API_ENDPOINTS.INFLATION);
            const data = await response.json();

            if (!response.ok) {
                throw this.createError(data, this.ERROR_TYPES.DATA_PROCESSING_ERROR);
            }

            LoggerService.info('APIService', 'Successfully fetched inflation data', {
                yearsCount: Object.keys(data).length,
                duration: LoggerService.endTimer(startTime, 'APIService', 'fetchInflationData')
            });

            return data;

        } catch (error) {
            LoggerService.error('APIService', 'Failed to fetch inflation data', {
                error: error.message,
                type: error.type,
                details: error.details
            });
            throw error;
        }
    }

    /**
     * Searches for stocks based on query
     * Corresponds to /api/stocks/search endpoint
     */
    static async searchStocks(query) {
        const startTime = LoggerService.startTimer();
        LoggerService.info('APIService', 'Searching stocks', { query });

        if (!query?.trim()) {
            LoggerService.debug('APIService', 'Empty search query, returning empty results');
            return [];
        }

        try {
            const url = `${this.API_ENDPOINTS.STOCKS_SEARCH}?q=${encodeURIComponent(query)}`;
            const response = await this.fetchWithTimeout(url);
            const data = await response.json();

            if (!response.ok) {
                throw this.createError(data, this.ERROR_TYPES.DATA_PROCESSING_ERROR);
            }

            LoggerService.info('APIService', 'Stock search completed', {
                query,
                resultsCount: data.length,
                duration: LoggerService.endTimer(startTime, 'APIService', 'searchStocks')
            });

            return data;

        } catch (error) {
            LoggerService.error('APIService', 'Stock search failed', {
                query,
                error: error.message,
                type: error.type,
                details: error.details
            });
            throw error;
        }
    }

    /**
     * Calculates investment returns
     * Corresponds to /calculate endpoint
     */
    static async calculateInvestment(data) {
        const startTime = LoggerService.startTimer();
        LoggerService.info('APIService', 'Starting investment calculation', {
            stocks: data.stocks,
            startYear: data.startYear,
            endYear: data.endYear
        });
    
        try {
            // Only validate for critical errors, not dates
            this.validateCalculationInput(data);
    
            const response = await this.fetchWithTimeout(
                this.API_ENDPOINTS.CALCULATE,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }
            );
    
            const result = await response.json();
    
            // Simplified error handling - only handle true errors
            if (!response.ok) {
                if (response.status === 400 && result.details?.invalidSymbols) {
                    // Handle invalid symbols as warnings, not errors
                    result.warnings = result.warnings || {};
                    result.warnings.invalidSymbols = result.details.invalidSymbols;
                    
                    // If we have any valid symbols, continue
                    if (result.data) {
                        LoggerService.warn('APIService', 'Some symbols were invalid', {
                            invalidSymbols: result.details.invalidSymbols
                        });
                    } else {
                        throw this.createError(result, this.ERROR_TYPES.NO_STOCK_DATA);
                    }
                } else if (response.status === 500) {
                    throw this.createError(result, this.ERROR_TYPES.SERVER_ERROR);
                } else {
                    throw this.createError(result, this.ERROR_TYPES.DATA_PROCESSING_ERROR);
                }
            }
    
            // Log any warnings
            if (result.warnings) {
                LoggerService.warn('APIService', 'Calculation completed with warnings', {
                    warnings: result.warnings,
                    stocks: data.stocks
                });
            }
    
            LoggerService.info('APIService', 'Investment calculation completed', {
                stockCount: data.stocks.length,
                duration: LoggerService.endTimer(startTime, 'APIService', 'calculateInvestment'),
                hasWarnings: !!result.warnings
            });
    
            return result;
    
        } catch (error) {
            LoggerService.error('APIService', 'Investment calculation failed', {
                data,
                error: error.message,
                type: error.type,
                details: error.details
            });
            throw error;
        }
    }

    /**
     * Validates calculation input data
     */
    static validateCalculationInput(data) {
        if (!data.stocks?.length) {
            throw this.createError(
                { error: 'No stocks provided', details: 'At least one stock must be selected' },
                this.ERROR_TYPES.INVALID_INPUT
            );
        }

        if (data.endYear <= data.startYear) {
            throw this.createError(
                { error: 'Invalid date range', details: 'End year must be greater than start year' },
                this.ERROR_TYPES.INVALID_DATE_RANGE
            );
        }

        if (data.initialInvestment < 0) {
            throw this.createError(
                { error: 'Invalid investment amount', details: 'Initial investment cannot be negative' },
                this.ERROR_TYPES.INVALID_INPUT
            );
        }

        if (data.additionAmount < 0) {
            throw this.createError(
                { error: 'Invalid addition amount', details: 'Additional investment amount cannot be negative' },
                this.ERROR_TYPES.INVALID_INPUT
            );
        }

        LoggerService.debug('APIService', 'Calculation input validation passed', data);
    }

    /**
     * Creates a standardized error object
     */
    static createError(response, type) {
        const error = new Error(response.error || 'An unexpected error occurred');
        error.type = type;
        error.details = response.details || {};
        return error;
    }

    /**
     * Fetches with timeout
     */
    static async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw this.createError(
                    { error: 'Request timeout', details: 'The request took too long to complete' },
                    this.ERROR_TYPES.NETWORK_ERROR
                );
            }
            throw this.createError(
                { error: 'Network error', details: error.message },
                this.ERROR_TYPES.NETWORK_ERROR
            );
        }
    }

    /**
     * Handles error responses
     */
    static async handleErrorResponse(response) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = {
                error: 'Unknown error',
                details: 'Failed to parse error response'
            };
        }

        return errorData;
    }
}