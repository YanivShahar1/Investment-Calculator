# services/calculation_service.py
import plotly
import plotly.graph_objs as go
import json
import logging
import pandas as pd
import numpy as np
from .inflation_service import get_inflation_data

logger = logging.getLogger(__name__)

class CalculationService:
    def calculate_investment_growth(self, initial, start_year, end_year, stocks, addition_amount, addition_frequency, adjust_for_inflation):
        logger.info(f"Starting investment growth calculation: initial=${initial}, years={start_year}-{end_year}")
        data = []
        
        # Filter out stocks with no data
        valid_stocks = {}
        for symbol, stock_data in stocks.items():
            if stock_data.isnull().all():
                logger.warning(f"Skipping {symbol} - no valid data found")
                continue
            valid_stocks[symbol] = stock_data
            
        if not valid_stocks:
            raise ValueError("No valid stock data available for calculation")
            
        inflation_data = get_inflation_data() if adjust_for_inflation else None
        logger.info(f"inflation data : {inflation_data}")
        
        for symbol, stock_data in valid_stocks.items():
            current_investment = initial
            last_investment_date = None
            
            
            # Process data year by year
            for year in range(start_year, end_year + 1):
                yearly_data = stock_data[stock_data.index.year == year]
                if yearly_data.empty:
                    logger.warning(f"No data for {symbol} in year {year}")
                    continue
                
                try:
                    # Get start and end values for the year
                    if year == start_year:
                        start_value = current_investment
                        current_value = current_investment
                    else:
                        start_value = current_value
                    
                    # Calculate returns using daily data
                    daily_return_index = (1 + yearly_data.pct_change()).cumprod()
                    if daily_return_index.iloc[-1] is None or np.isnan(daily_return_index.iloc[-1]):
                        logger.warning(f"Invalid return calculation for {symbol} in year {year}")
                        continue
                        
                    current_value = start_value * daily_return_index.iloc[-1]
                    
                    # Handle periodic investments
                    if addition_frequency == 'monthly':
                        months_in_year = 12 if year > start_year else (13 - yearly_data.index[0].month)
                        addition_total = addition_amount * months_in_year
                        current_investment += addition_total
                        avg_return = daily_return_index.mean()
                        if not np.isnan(avg_return):
                            current_value += addition_total * avg_return
                    
                    elif addition_frequency == 'annually' and year > start_year:
                        current_investment += addition_amount
                        current_value += addition_amount
                    
                    # Apply inflation adjustment if needed
                    if adjust_for_inflation:
                        inflation_rate = inflation_data.get(str(year), 0)
                        logger.info(f"inflationrate for year {year} {inflation_rate}")
                        current_value /= (1 + inflation_rate)
                        current_investment /= (1 + inflation_rate)
                    
                    # Ensure values are valid before adding to data
                    if not (np.isnan(current_value) or np.isnan(current_investment)):
                        data_point = next((d for d in data if d['year'] == year), None)
                        if data_point is None:
                            data_point = {
                                'year': year,
                                'invested': round(current_investment, 2),
                                'total': {},
                                'gains': {}
                            }
                            data.append(data_point)
                        
                        data_point['total'][symbol] = round(current_value, 2)
                        data_point['gains'][symbol] = round(current_value - current_investment, 2)
                        data_point['invested'] = round(current_investment, 2)
                
                except Exception as e:
                    logger.error(f"Error calculating data for {symbol} in year {year}: {str(e)}")
                    continue
        
        # Sort data points by year
        data.sort(key=lambda x: x['year'])
        
        # Validate final data
        if not data:
            raise ValueError("No valid calculation results generated")
            
        logger.info("Investment growth calculation completed")
        return data

    def generate_graph(self, results):
        logger.info("Generating investment growth graph")
        traces = []
        colors = ['blue', 'red', 'green', 'purple', 'orange']
        
        try:
            # Get list of valid symbols (those with non-null data)
            valid_symbols = set()
            for point in results:
                for symbol in point['total'].keys():
                    if point['total'][symbol] is not None and not np.isnan(point['total'][symbol]):
                        valid_symbols.add(symbol)
            
            for i, symbol in enumerate(valid_symbols):
                color = colors[i % len(colors)]
                
                # Filter out null/NaN values
                years = []
                totals = []
                gains = []
                
                for point in results:
                    if symbol in point['total'] and point['total'][symbol] is not None:
                        if not np.isnan(point['total'][symbol]):
                            years.append(point['year'])
                            totals.append(point['total'][symbol])
                            gains.append(point['gains'][symbol])
                
                if years and totals:  # Only create traces if we have valid data
                    trace_total = go.Scatter(
                        x=years,
                        y=totals,
                        mode='lines+markers',
                        name=f'{symbol} (Total)',
                        line=dict(color=color)
                    )
                    
                    trace_gains = go.Scatter(
                        x=years,
                        y=gains,
                        mode='lines',
                        name=f'{symbol} (Gains)',
                        line=dict(color=color, dash='dot')
                    )
                    
                    traces.extend([trace_total, trace_gains])
                    logger.debug(f"Added traces for {symbol}")
            
            # Only add invested trace if we have any valid data
            if traces:
                trace_invested = go.Scatter(
                    x=[point['year'] for point in results],
                    y=[point['invested'] for point in results],
                    mode='lines',
                    name='Invested Amount',
                    line=dict(color='gray', dash='dash')
                )
                traces.append(trace_invested)
            
            layout = go.Layout(
                title='Investment Growth Comparison',
                xaxis={'title': 'Year'},
                yaxis={'title': 'Value ($)'}
            )
            
            if not traces:
                raise ValueError("No valid data to plot")
            
            fig = go.Figure(data=traces, layout=layout)
            return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
            
        except Exception as e:
            logger.error(f"Error generating graph: {str(e)}")
            raise