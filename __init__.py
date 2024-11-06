"""
Investment Calculator Package

A web application for comparing investment growth across multiple stocks over time.
Provides tools for calculating and visualizing investment returns with features like:
- Multiple stock comparison
- Periodic investment additions
- Inflation adjustment
- Interactive visualizations
"""

from services.calculation_service import CalculationService
from services.stock_service import fetch_stock_data, fetch_stock_data_batch, fetch_inflation_data
from services.data_service import generate_data_points
from services.cache_service import cache

__version__ = '1.0.0'
__author__ = 'Your Name'
__email__ = 'your.email@example.com'

__all__ = [
    'CalculationService',
    'fetch_stock_data',
    'fetch_stock_data_batch',
    'fetch_inflation_data',
    'generate_data_points',
    'cache'
]

# Package metadata
PACKAGE_NAME = 'investment_calculator'
DESCRIPTION = 'A tool for calculating and comparing investment growth across multiple stocks'
AUTHOR = __author__
VERSION = __version__

# Configuration defaults
DEFAULT_CACHE_TIMEOUT = 3600  # 1 hour
DEFAULT_INFLATION_RATE = 0.03  # 3% annual inflation
DEFAULT_START_YEAR = 2020
DEFAULT_END_YEAR = 2023

# API configuration
API_RATE_LIMIT = 5  # requests per second
API_TIMEOUT = 30   # seconds

# Feature flags
ENABLE_INFLATION_ADJUSTMENT = True
ENABLE_PERIODIC_INVESTMENTS = True
ENABLE_BATCH_PROCESSING = True

def get_version():
    """Return the current version of the package"""
    return __version__

def get_config():
    """Return the current configuration settings"""
    return {
        'cache_timeout': DEFAULT_CACHE_TIMEOUT,
        'inflation_rate': DEFAULT_INFLATION_RATE,
        'start_year': DEFAULT_START_YEAR,
        'end_year': DEFAULT_END_YEAR,
        'api_rate_limit': API_RATE_LIMIT,
        'api_timeout': API_TIMEOUT,
        'features': {
            'inflation_adjustment': ENABLE_INFLATION_ADJUSTMENT,
            'periodic_investments': ENABLE_PERIODIC_INVESTMENTS,
            'batch_processing': ENABLE_BATCH_PROCESSING
        }
    }