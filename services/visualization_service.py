# services/visualization_service.py
import plotly
import plotly.graph_objs as go
import json
import logging

logger = logging.getLogger(__name__)


class VisualizationService:
    @staticmethod
    def generate_graph(results):
        logger.info("Generating investment growth graph")
        traces = []
        colors = ['blue', 'red', 'green', 'purple', 'orange']

        for i, stock_data in enumerate(results):
            symbol = stock_data['symbol']
            color = colors[i % len(colors)]
            
            monthly_data = stock_data['monthly_data']
            x_values = [point['date'] for point in monthly_data]
            y_values = [point['total'] for point in monthly_data]
            
            # Create the main line trace with markers
            trace_total = go.Scatter(
                x=x_values,
                y=y_values,
                mode='lines+markers',  # Removed text to avoid crowding with monthly points
                name=f'{symbol} Total',
                line=dict(color=color),
                hovertemplate='%{x}<br>Value: $%{y:,.2f}<extra></extra>'
            )
            
            # Create trace for invested amount
            invested_values = [point['invested'] for point in monthly_data]
            trace_invested = go.Scatter(
                x=x_values,
                y=invested_values,
                mode='lines+markers',
                name='Invested Amount',
                line=dict(color='gray', dash='dash'),
                hovertemplate='%{x}<br>Invested: $%{y:,.2f}<extra></extra>'
            )
            
            traces.extend([trace_total, trace_invested])
            logger.debug(f"Added traces for {symbol}")

        # Get min and max dates from the data
        all_dates = [point['date'] for stock in results for point in stock['monthly_data']]
        min_date = min(all_dates) if all_dates else None
        max_date = max(all_dates) if all_dates else None

        layout = go.Layout(
            title='Investment Growth Comparison',
            xaxis={
                'title': 'Date',
                'tickformat': '%Y-%m',  # Show as YYYY-MM
                'tickangle': -45,  # Angle the dates for better readability
                'nticks': 12,  # Show approximately monthly ticks
            },
            yaxis={
                'title': 'Value ($)',
                'tickformat': '$,.0f',
                'rangemode': 'tozero'  # Start y-axis from 0
            },
            hovermode='x unified',
            showlegend=True,
            legend={
                'orientation': 'h',
                'yanchor': 'bottom',
                'y': 1.02,
                'xanchor': 'right',
                'x': 1
            },
            margin=dict(t=100, b=80),  # Increased bottom margin for angled labels
            plot_bgcolor='white',
            paper_bgcolor='white',
        )

        fig = go.Figure(data=traces, layout=layout)
        
        # Add gridlines
        fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='#f0f0f0')
        fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='#f0f0f0')
        
        logger.info("Graph generation completed")
        return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)