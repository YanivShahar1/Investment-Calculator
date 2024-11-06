import { APIService } from '../services/api.js';

export class StockManager {
    constructor() {
        this.selectedStocks = new Set();
        this.stocksList = [];
    }

    async initialize() {
        try {
            this.stocksList = await APIService.fetchStocks();
        } catch (error) {
            console.error('Failed to initialize stock list:', error);
            throw error;
        }
    }

    addStock(stock) {
        if (this.selectedStocks.has(stock.symbol)) return false;
        this.selectedStocks.add(stock.symbol);
        return true;
    }

    removeStock(symbol) {
        if (this.selectedStocks.size <= 1) {
            return { success: false, error: "You must have at least one stock." };
        }
        this.selectedStocks.delete(symbol);
        return { success: true };
    }

    async searchStocks(query) {
        if (!query.trim()) return [];
        
        const uppercaseQuery = query.toUpperCase();
        let results = this.stocksList.filter(stock => 
            stock.symbol.includes(uppercaseQuery) || 
            stock.name.toUpperCase().includes(uppercaseQuery)
        );

        if (/^[A-Z0-9.]{1,10}$/.test(uppercaseQuery) && 
            !results.find(s => s.symbol === uppercaseQuery)) {
            results.push({
                symbol: uppercaseQuery,
                name: 'Custom Stock Symbol',
                isCustom: true
            });
        }

        return results;
    }
}
