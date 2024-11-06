export class VisualizationService {
    static createPlotConfig(data) {
        const traces = [];
        const colors = ['#2E86C1', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6'];

        data.forEach((stockData, index) => {
            const timeData = stockData.monthly_data || stockData.yearly_data;
            if (!timeData?.length) return;

            traces.push({
                x: timeData.map(point => point.date || point.year),
                y: timeData.map(point => point.total),
                mode: 'lines+markers',
                name: `${stockData.symbol} Total`,
                line: { color: colors[index % colors.length], width: 2 },
                marker: { size: 6 },
                hovertemplate: '%{x}<br>Value: $%{y:,.2f}<extra></extra>'
            });

            if (index === 0) {
                traces.push({
                    x: timeData.map(point => point.date || point.year),
                    y: timeData.map(point => point.invested),
                    mode: 'lines',
                    name: 'Invested Amount',
                    line: { color: '#95A5A6', dash: 'dash', width: 2 },
                    hovertemplate: '%{x}<br>Invested: $%{y:,.2f}<extra></extra>'
                });
            }
        });

        return {
            traces,
            layout: {
                title: { text: 'Investment Growth Comparison', font: { size: 24 } },
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
                margin: { t: 100, b: 80, l: 80, r: 40 },
                plot_bgcolor: 'white',
                paper_bgcolor: 'white',
                font: { family: 'Arial, sans-serif' }
            }
        };
    }
}
