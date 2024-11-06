import yfinance as yf
import pandas as pd
from .cache_service import cache
import logging

import yfinance as yf
import pandas as pd
from .cache_service import cache
import logging

logger = logging.getLogger(__name__)

@cache.memoize(timeout=3600)  # Cache for 1 hour
def fetch_stock_data_batch(symbols, start_year, end_year):
    """
    Fetch historical data for multiple stock symbols, handling NaN values appropriately.
    """
    logger.info(f"Fetching batch stock data for symbols: {symbols}")
    
    start_date = f"{start_year}-01-01"
    end_date = f"{end_year}-12-31"
    
    try:
        symbols_str = " ".join(symbols)
        data = yf.download(
            tickers=symbols_str,
            start=start_date,
            end=end_date,
            interval="1d",
            group_by='ticker',
            auto_adjust=True
        )
        
        logger.debug(f"Downloaded data length: {len(data)}")
        
        result = {}
        invalid_symbols = []
        data_issues = {}
        
        # Handle single stock case
        if len(symbols) == 1:
            symbol = symbols[0]
            if isinstance(data, pd.DataFrame) and not data['Close'].isnull().all():
                close_data = data['Close'].dropna()  # Remove NaN values
                if len(close_data) > 0:  # Only include if we have valid data
                    result[symbol] = close_data
                    result[symbol].index = pd.to_datetime(result[symbol].index.date)
                    logger.debug(f"Processed single stock data for {symbol}")
                else:
                    invalid_symbols.append(symbol)
                    data_issues[symbol] = {
                        'status': 'no_data',
                        'error': 'No valid data points found'
                    }
            else:
                invalid_symbols.append(symbol)
                data_issues[symbol] = {
                    'status': 'no_data',
                    'error': 'Invalid or missing data'
                }
            
        # Handle multiple stocks case
        else:
            for symbol in symbols:
                try:
                    if symbol in data.columns.levels[0]:
                        stock_data = data[symbol]['Close'].dropna()  # Remove NaN values
                        
                        # Calculate data quality metrics
                        total_original = len(data[symbol]['Close'])
                        valid_points = len(stock_data)
                        null_points = total_original - valid_points
                        
                        if valid_points > 0:  # If we have any valid points
                            result[symbol] = stock_data
                            result[symbol].index = pd.to_datetime(result[symbol].index.date)
                            
                            # Record data quality information
                            if null_points > 0:
                                data_issues[symbol] = {
                                    'total_points': int(total_original),
                                    'valid_points': int(valid_points),
                                    'null_points': int(null_points),
                                    'null_percentage': float((null_points/total_original) * 100),
                                    'first_valid_date': stock_data.index[0].strftime('%Y-%m-%d'),
                                    'last_valid_date': stock_data.index[-1].strftime('%Y-%m-%d'),
                                    'status': 'partial_data'
                                }
                        else:
                            invalid_symbols.append(symbol)
                            data_issues[symbol] = {
                                'total_points': int(total_original),
                                'valid_points': 0,
                                'null_points': int(total_original),
                                'status': 'no_valid_data'
                            }
                    else:
                        invalid_symbols.append(symbol)
                        data_issues[symbol] = {
                            'status': 'no_data',
                            'error': 'Symbol not found in data'
                        }
                except Exception as e:
                    invalid_symbols.append(symbol)
                    data_issues[symbol] = {
                        'status': 'error',
                        'error': str(e)
                    }

        logger.info(f"Successfully fetched data for {len(result)} stocks")
        logger.info(f"Data issues found: {data_issues}")
        logger.info(f"Invalid symbols: {invalid_symbols}")
        
        return result, invalid_symbols, data_issues
        
    except Exception as e:
        logger.error(f"Error fetching batch stock data: {str(e)}")
        return {}, symbols, {}
