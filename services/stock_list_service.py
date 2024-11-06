import json
import os
from flask import current_app

def load_stock_data():
    """Load stock data from JSON file"""
    try:
        file_path = os.path.join(current_app.config['DATA_DIR'], 'stock_list.json')
        with open(file_path, 'r') as f:
            data = json.load(f)
            return data['stocks']
    except Exception as e:
        current_app.logger.error(f"Error loading stock data: {str(e)}")
        return []

def get_stock_list():
    return load_stock_data()

def search_stocks(query):
    """Search stocks by symbol or name"""
    stocks = load_stock_data()
    query = query.lower()
    return [
        stock for stock in stocks
        if query in stock['symbol'].lower() or query in stock['name'].lower()
    ]