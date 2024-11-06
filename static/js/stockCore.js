class StockCore {
    constructor() {
        this.stocksList = [];
        this.selectedStocks = new Set();
    }

    validateYearInputs(startYear, endYear) {
        const currentYear = new Date().getFullYear();

        if (startYear > endYear) {
            return {
                isValid: false,
                error: 'Start year must be before end year'
            };
        }

        if (startYear < 1970) {
            return {
                isValid: false,
                error: 'Start year must be 1970 or later'
            };
        }

        if (endYear > currentYear + 1) {
            return {
                isValid: false,
                error: `End year cannot be more than ${currentYear + 1}`
            };
        }

        return { isValid: true };
    }

    validateStockData(stockData, startYear, endYear) {
        if (!stockData || stockData.empty) {
            return {
                isValid: false,
                error: "No data available for this symbol"
            };
        }

        const firstDate = new Date(stockData.index[0]);
        const lastDate = new Date(stockData.index[stockData.index.length - 1]);
        const firstYear = firstDate.getFullYear();
        const lastYear = lastDate.getFullYear();

        if (startYear < firstYear) {
            return {
                isValid: false,
                error: `Data only available from ${firstYear}`
            };
        }

        if (endYear > lastYear + 1) {
            return {
                isValid: false,
                error: `Data only available until ${lastYear}`
            };
        }

        return { isValid: true };
    }

    addStock(stock) {
        if (this.selectedStocks.has(stock.symbol)) return false;
        this.selectedStocks.add(stock.symbol);
        return true;
    }

    removeStock(symbol) {
        if (this.selectedStocks.size <= 1) {
            return {
                success: false,
                error: "You must have at least one stock."
            };
        }
        
        this.selectedStocks.delete(symbol);
        return { success: true };
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    formatErrorMessage(error) {
        if (error.includes('Unexpected token') || error.includes('not valid JSON')) {
            return 'Invalid stock symbol. This stock may not exist or is not available for trading.';
        }
        if (error.includes('No data available')) {
            return 'No trading data available for this stock in the selected date range.';
        }
        if (error.toLowerCase().includes('not found') || error.toLowerCase().includes('invalid')) {
            return 'This stock symbol could not be found. Please verify the symbol is correct.';
        }
        return error;
    }

    createPlotConfig(data) {
        const colors = ['#2E86C1', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6'];
        const traces = [];

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

        return {
            traces,
            layout: {
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
            }
        };
    }
}

const stockCore = new StockCore();
window.stockCore = stockCore; // Make available globally