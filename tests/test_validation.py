# tests/test_validation.py

import pytest
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime
from services.calculation_service import CalculationService
import logging

logger = logging.getLogger(__name__)

class TestInvestmentCalculator:
    @pytest.fixture
    def calculation_service(self):
        """Fixture to create calculation service instance"""
        return CalculationService()

    @pytest.fixture
    def steady_growth_data(self):
        """Create test data with steady 10% annual growth"""
        dates = pd.date_range(start='2020-01-01', end='2022-12-31')
        daily_growth = (1.10) ** (1/252)  # 10% annual growth
        return pd.Series(
            index=dates,
            data=[100 * (daily_growth ** i) for i in range(len(dates))]
        )

    @pytest.fixture
    def volatile_growth_data(self):
        """Create test data with realistic market volatility"""
        dates = pd.date_range(start='2020-01-01', end='2022-12-31')
        np.random.seed(42)  # For reproducibility
        daily_returns = np.random.normal(0.0004, 0.02, len(dates))  # ~10% annual return with volatility
        price_series = 100 * (1 + daily_returns).cumprod()
        return pd.Series(index=dates, data=price_series)

    def test_basic_investment_growth(self, calculation_service, steady_growth_data):
        """Test basic investment growth without additions"""
        initial_investment = 10000
        stocks = {'TEST': steady_growth_data}
        
        result = calculation_service.calculate_investment_growth(
            initial=initial_investment,
            start_year=2020,
            end_year=2020,
            stocks=stocks,
            addition_amount=0,
            addition_frequency='none',
            adjust_for_inflation=False
        )
        
        # Verify structure
        assert len(result) > 0
        assert 'total' in result[-1]
        assert 'TEST' in result[-1]['total']
        
        # Verify growth
        final_value = result[-1]['total']['TEST']
        assert final_value > initial_investment
        annual_return = (final_value / initial_investment - 1) * 100
        assert abs(annual_return - 10) < 1.0  # Should be close to 10% annual return

    def test_monthly_investment(self, calculation_service, steady_growth_data):
        """Test monthly investment additions"""
        initial = 1000
        monthly_addition = 100
        stocks = {'TEST': steady_growth_data}
        
        result = calculation_service.calculate_investment_growth(
            initial=initial,
            start_year=2020,
            end_year=2020,
            stocks=stocks,
            addition_amount=monthly_addition,
            addition_frequency='monthly',
            adjust_for_inflation=False
        )
        
        # Verify total invested amount
        expected_investment = initial + (monthly_addition * 12)
        actual_investment = result[-1]['invested']
        assert abs(actual_investment - expected_investment) < 0.01, \
            f"Expected investment {expected_investment}, got {actual_investment}"
        
        # Verify returns are positive
        final_value = result[-1]['total']['TEST']
        assert final_value > actual_investment, "Investment should show positive returns"

    def test_dca_vs_lump_sum(self, calculation_service, steady_growth_data):
        """Test Dollar Cost Averaging vs Lump Sum investing"""
        total_investment = 12000
        stocks = {'TEST': steady_growth_data}
        
        # Lump sum investment
        lump_sum = calculation_service.calculate_investment_growth(
            initial=total_investment,
            start_year=2020,
            end_year=2020,
            stocks=stocks,
            addition_amount=0,
            addition_frequency='none',
            adjust_for_inflation=False
        )
        
        # DCA investment
        monthly_amount = total_investment / 12
        dca = calculation_service.calculate_investment_growth(
            initial=monthly_amount,
            start_year=2020,
            end_year=2020,
            stocks=stocks,
            addition_amount=monthly_amount,
            addition_frequency='monthly',
            adjust_for_inflation=False
        )
        
        # Verify total invested amounts
        assert abs(dca[-1]['invested'] - total_investment) < 0.01
        assert abs(lump_sum[-1]['invested'] - total_investment) < 0.01
        
        # In a steadily rising market, lump sum should outperform DCA
        lump_sum_return = lump_sum[-1]['total']['TEST'] - lump_sum[-1]['invested']
        dca_return = dca[-1]['total']['TEST'] - dca[-1]['invested']
        assert lump_sum_return > dca_return

    def test_inflation_impact(self, calculation_service, steady_growth_data):
        """Test inflation adjustment impact"""
        initial = 10000
        stocks = {'TEST': steady_growth_data}
        
        # Calculate without inflation
        nominal_result = calculation_service.calculate_investment_growth(
            initial=initial,
            start_year=2020,
            end_year=2021,
            stocks=stocks,
            addition_amount=0,
            addition_frequency='none',
            adjust_for_inflation=False
        )
        
        # Calculate with inflation
        real_result = calculation_service.calculate_investment_growth(
            initial=initial,
            start_year=2020,
            end_year=2021,
            stocks=stocks,
            addition_amount=0,
            addition_frequency='none',
            adjust_for_inflation=True
        )
        
        # Real returns should be lower than nominal returns
        nominal_value = nominal_result[-1]['total']['TEST']
        real_value = real_result[-1]['total']['TEST']
        assert real_value < nominal_value
        
        # With 2% inflation, real value should be about 2% lower than nominal
        expected_ratio = 1 / 1.02  # One year of 2% inflation
        actual_ratio = real_value / nominal_value
        assert abs(actual_ratio - expected_ratio) < 0.01

    def test_multiple_stocks(self, calculation_service):
        """Test calculations with multiple stocks"""
        # Create test data for two stocks
        dates = pd.date_range(start='2020-01-01', end='2020-12-31')
        stock1_data = pd.Series(
            index=dates,
            data=[100 * (1.15 ** (i/252)) for i in range(len(dates))]  # 15% annual growth
        )
        stock2_data = pd.Series(
            index=dates,
            data=[100 * (1.08 ** (i/252)) for i in range(len(dates))]  # 8% annual growth
        )
        
        stocks = {
            'STOCK1': stock1_data,
            'STOCK2': stock2_data
        }
        
        result = calculation_service.calculate_investment_growth(
            initial=10000,
            start_year=2020,
            end_year=2020,
            stocks=stocks,
            addition_amount=0,
            addition_frequency='none',
            adjust_for_inflation=False
        )
        
        # Verify both stocks are calculated
        final_data = result[-1]
        assert 'STOCK1' in final_data['total']
        assert 'STOCK2' in final_data['total']
        
        # STOCK1 should outperform STOCK2
        assert final_data['total']['STOCK1'] > final_data['total']['STOCK2']

    def test_real_stock_data(self, calculation_service):
        """Test with real historical stock data"""
        try:
            # Fetch real data for a well-known stock
            spy_data = yf.download('SPY', 
                                 start='2020-01-01', 
                                 end='2020-12-31')['Close']
            
            result = calculation_service.calculate_investment_growth(
                initial=10000,
                start_year=2020,
                end_year=2020,
                stocks={'SPY': spy_data},
                addition_amount=0,
                addition_frequency='none',
                adjust_for_inflation=False
            )
            
            # Verify basic expectations
            assert len(result) > 0
            assert 'SPY' in result[-1]['total']
            
        except Exception as e:
            pytest.skip(f"Failed to fetch real stock data: {str(e)}")

    def test_edge_cases(self, calculation_service, steady_growth_data):
        """Test edge cases and error handling"""
        stocks = {'TEST': steady_growth_data}
        
        # Test zero initial investment
        result = calculation_service.calculate_investment_growth(
            initial=0,
            start_year=2020,
            end_year=2020,
            stocks=stocks,
            addition_amount=100,
            addition_frequency='monthly',
            adjust_for_inflation=False
        )
        assert result[-1]['invested'] > 0, "Should handle zero initial investment"
        
        # Test single day investment period
        short_data = steady_growth_data['2020-01-01':'2020-01-01']
        result = calculation_service.calculate_investment_growth(
            initial=1000,
            start_year=2020,
            end_year=2020,
            stocks={'TEST': short_data},
            addition_amount=0,
            addition_frequency='none',
            adjust_for_inflation=False
        )
        assert len(result) > 0, "Should handle single day period"

    @pytest.mark.parametrize("addition_frequency", ['monthly', 'annually', 'none'])
    def test_different_frequencies(self, calculation_service, steady_growth_data, addition_frequency):
        """Test different investment frequencies"""
        initial = 1000
        addition_amount = 100
        
        result = calculation_service.calculate_investment_growth(
            initial=initial,
            start_year=2020,
            end_year=2020,
            stocks={'TEST': steady_growth_data},
            addition_amount=addition_amount,
            addition_frequency=addition_frequency,
            adjust_for_inflation=False
        )
        
        # Verify invested amount based on frequency
        expected_additions = {
            'monthly': 12 * addition_amount,
            'annually': addition_amount,
            'none': 0
        }
        
        expected_total = initial + expected_additions[addition_frequency]
        assert abs(result[-1]['invested'] - expected_total) < 0.01, \
            f"Incorrect total for {addition_frequency} frequency"

if __name__ == '__main__':
    pytest.main(['-v'])