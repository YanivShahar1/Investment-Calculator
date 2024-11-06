import { FormatterService } from '../services/formatter.js';

export class ResultsTable {
    static create(data) {
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Stock</th>
                <th>Total Value</th>
                <th>Invested Amount</th>
                <th>Gains/Losses</th>
                <th>Return (%)</th>
            </tr>
        `;
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        data.forEach(stockData => {
            const timeData = stockData.monthly_data || stockData.yearly_data;
            if (!timeData) return;

            timeData.forEach(point => {
                const row = document.createElement('tr');
                const gains = point.total - point.invested;
                const isPositive = gains >= 0;
                
                row.innerHTML = `
                    <td>${point.date || point.year}</td>
                    <td>${stockData.symbol}</td>
                    <td class="value-cell">${FormatterService.formatCurrency(point.total)}</td>
                    <td class="value-cell">${FormatterService.formatCurrency(point.invested)}</td>
                    <td class="value-cell ${isPositive ? 'positive-value' : 'negative-value'}">
                        <span class="percent-change ${isPositive ? 'positive' : 'negative'}">
                            ${FormatterService.formatCurrency(Math.abs(gains))}
                        </span>
                    </td>
                    <td class="value-cell ${point.return_percentage >= 0 ? 'positive-value' : 'negative-value'}">
                        <span class="percent-change ${point.return_percentage >= 0 ? 'positive' : 'negative'}">
                            ${FormatterService.formatPercentage(point.return_percentage)}
                        </span>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
        table.appendChild(tbody);

        // Wrap table in container
        const container = document.createElement('div');
        container.className = 'results-section';
        container.innerHTML = `
            <div class="results-header">
                <h2>Investment Results</h2>
            </div>
        `;
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        tableContainer.appendChild(table);
        container.appendChild(tableContainer);

        return container;
    }
}

class ResultsTablee {
    static create(data) {
        const table = document.createElement('table');
        table.className = 'results-table';
        
        const headers = ['Date', 'Stock', 'Total Value', 'Invested Amount', 'Gains', 'Return (%)'];
        const thead = document.createElement('thead');
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        data.forEach(stockData => {
            const timeData = stockData.monthly_data || stockData.yearly_data;
            if (!timeData) return;

            timeData.forEach(point => {
                const row = document.createElement('tr');
                const gains = point.total - point.invested;
                row.innerHTML = `
                    <td>${point.date || point.year}</td>
                    <td>${stockData.symbol}</td>
                    <td class="value-cell">${FormatterService.formatCurrency(point.total)}</td>
                    <td class="value-cell">${FormatterService.formatCurrency(point.invested)}</td>
                    <td class="value-cell ${gains >= 0 ? 'positive' : 'negative'}">
                        ${FormatterService.formatCurrency(gains)}
                    </td>
                    <td class="value-cell ${point.return_percentage >= 0 ? 'positive' : 'negative'}">
                        ${FormatterService.formatPercentage(point.return_percentage)}
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
        table.appendChild(tbody);

        return table;
    }
}