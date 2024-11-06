import pandas as pd
from typing import Dict, List
import logging
from .inflation_service import get_inflation_data

logger = logging.getLogger(__name__)

MONTHLY_FREQUENCY = 'monthly'
ANNUALLY_FREQUENCY = 'annually'

import pandas as pd
import logging

logger = logging.getLogger(__name__)

def generate_data_points(initial, start_year, end_year, stocks, addition_amount, addition_frequency, adjust_for_inflation):
    """
    Generate investment data points, removing any NaN values and ensuring clean data.
    """
    logger.info(f"Starting investment growth calculation: initial=${initial}, years={start_year}-{end_year-1}")
    data = []
    inflation_data = get_inflation_data() if adjust_for_inflation else None
    logger.info(f"inflation_data = {inflation_data}")
    for symbol, stock_data in stocks.items():
        monthly_data = []
        current_investment = float(initial)
        current_value = float(initial)
        last_year_processed = None

        # Remove any NaN values and resample to monthly
        stock_data = stock_data.dropna()
        if len(stock_data) == 0:
            continue  # Skip if no valid data after removing NaN
            
        monthly_stock_data = stock_data.resample('ME').last().dropna()
        
        # Skip if no valid monthly data
        if len(monthly_stock_data) == 0:
            continue
            
        for date in monthly_stock_data.index:
            year = int(date.year)
            month = int(date.month)
            
            if year < start_year or year >= end_year:
                continue

            # Get start price, ensuring it's not NaN
            start_price = float(stock_data.iloc[0])
            current_price = float(monthly_stock_data.loc[date])
            
            # Skip if either price is invalid
            if pd.isna(start_price) or pd.isna(current_price):
                continue
                
            cumulative_return = (current_price / start_price) - 1
            current_value = initial * (1 + cumulative_return)
            
            # Handle periodic investments
            if addition_frequency == 'monthly' and (year > start_year or month > 1):
                current_investment += addition_amount
                if month > 1 or year > start_year:
                    prev_date = date - pd.DateOffset(months=1)
                    # Only calculate additional return if we have valid previous data
                    if prev_date in stock_data.index and not pd.isna(stock_data.loc[prev_date]):
                        addition_start_price = float(stock_data.loc[prev_date])
                        addition_return = (current_price / addition_start_price) - 1
                        current_value += addition_amount * (1 + addition_return)
                    else:
                        # If no valid previous data, just add the amount without return
                        current_value += addition_amount
            
            elif addition_frequency == 'annually' and month == 1 and year > start_year:
                current_investment += addition_amount
                current_value += addition_amount

            # Apply inflation adjustment yearly (in December)
            if adjust_for_inflation and inflation_data and str(year) in inflation_data:
                # Only apply inflation adjustment once per year (in December)
                if month == 12 and year != last_year_processed:
                    annual_inflation = float(inflation_data[str(year)])
                    logger.info(
                        f"Applying yearly inflation adjustment for {year}:\n"
                        f"  Annual inflation rate: {annual_inflation:.4f} ({annual_inflation*100:.2f}%)\n"
                        f"  Before adjustment: value=${current_value:.2f}"
                    )
                    
                    # Apply annual inflation adjustment
                    current_value *= (1 - annual_inflation)
                    
                    logger.info(
                        f"  After adjustment: value=${current_value:.2f}\n"
                        f"  Value decrease due to inflation: ${(current_value / (1 - annual_inflation) - current_value):.2f}"
                    )
                    last_year_processed = year
            
            gains = current_value - current_investment
            
            # Skip if any calculations resulted in NaN
            if any(pd.isna(x) for x in [current_value, current_investment, gains]):
                continue
                
            return_percentage = (gains / current_investment) * 100 if current_investment != 0 else 0
            
            monthly_data.append({
                "year": year,
                "month": month,
                "date": date.strftime("%Y-%m"),
                "invested": round(float(current_investment), 2),
                "total": round(float(current_value), 2),
                "gains": round(float(gains), 2),
                "return_percentage": round(float(return_percentage), 2)
            })

        # Only add to results if we have valid monthly data
        if monthly_data:
            data.append({
                "symbol": symbol,
                "monthly_data": monthly_data
            })
    
    logger.info("Investment growth calculation completed")
    return data


def _should_add_investment(frequency: str, date: pd.Timestamp, year: int, start_year: int) -> bool:
    if frequency == MONTHLY_FREQUENCY:
        return date.day == 1 and not (year == start_year and date.month == 1)
    elif frequency == ANNUALLY_FREQUENCY:
        return date.month == 1 and date.day == 1 and year != start_year
    return False

def _calculate_new_value(stock_data: pd.Series, current_date: pd.Timestamp, current_value: float) -> float:
    price = stock_data.loc[current_date]
    next_date = current_date + pd.Timedelta(days=1)
    if next_date in stock_data.index:
        next_price = stock_data.loc[next_date]
        growth_factor = next_price / price
        return current_value * growth_factor
    return current_value

def _create_yearly_data_point(year: int, invested: float, total: float) -> Dict:
    gains = total - invested
    return {
        "year": year,
        "invested": float(round(invested, 2)),
        "total": float(round(total, 2)),
        "gains": float(round(gains, 2)),
        "return_percentage": float(round((gains / invested) * 100, 2))
    }