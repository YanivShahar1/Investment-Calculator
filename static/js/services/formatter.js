export class FormatterService {
    static formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    static formatPercentage(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    }

    static formatErrorMessage(error) {
        if (typeof error === 'string') {
            if (error.includes('Unexpected token') || error.includes('not valid JSON')) {
                return 'Invalid stock symbol. This stock may not exist or is not available for trading.';
            }
            if (error.includes('No data available')) {
                return 'No trading data available for this stock in the selected date range.';
            }
            if (error.toLowerCase().includes('not found') || error.toLowerCase().includes('invalid')) {
                return 'This stock symbol could not be found. Please verify the symbol is correct.';
            }
        }
        return error?.message || error?.toString() || 'An unknown error occurred';
    }
}