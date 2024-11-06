from flask import Flask, render_template, request, jsonify
import logging
from services import cache, fetch_stock_data_batch, generate_data_points, VisualizationService, get_inflation_data
import hashlib
import json
from config import get_config
import pandas as pd
import os

def create_app(config_name=None):
    app = Flask(__name__)
    
    config = get_config(config_name)
    app.config.from_object(config)
     # Set up the correct data directory path
    app.config['DATA_DIR'] = os.path.join(app.root_path, 'services', 'data')

    # Set up logging
    logging.basicConfig(
        level=app.config['LOG_LEVEL'],
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    cache.init_app(app)

    def cache_key():
        """Generate a cache key based on the request data."""
        data = request.get_json()
        data['stocks'] = sorted(data['stocks'])
        return hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/calculate', methods=['POST'])
    @cache.cached(timeout=300, key_prefix=cache_key)

    
    def calculate():
        try:
            data = request.json
            logger.info(f"Received calculation request: {data}")

            # Validate input data
            try:
                initial_investment = float(data['initialInvestment'])
                start_year = int(data['startYear'])
                end_year = int(data['endYear'])
                stock_symbols = data['stocks']
                addition_amount = float(data['additionAmount'])
                addition_frequency = data['additionFrequency']
                adjust_for_inflation = data['adjustForInflation']
            except (KeyError, ValueError) as e:
                logger.error(f"Invalid input parameters: {str(e)}")
                return jsonify({
                    'error': 'Invalid input parameters',
                    'details': str(e)
                }), 400

            # Validate date range
            if end_year <= start_year:
                return jsonify({
                    'error': 'Invalid date range',
                    'details': 'End year must be greater than start year'
                }), 400

            try:
                # Fetch stock data with error handling
                logger.info(f"want to fetch stock data for symbols: {stock_symbols}")
                stocks, invalid_symbols, data_issues = fetch_stock_data_batch(stock_symbols, start_year, end_year)
                logger.info(f"Fetched {len(stocks)} valid stocks out of {len(stock_symbols)} requested")

                if invalid_symbols:
                    logger.warning(f"Invalid symbols found: {invalid_symbols}")

                if not stocks:
                    return jsonify({
                        'error': f'No valid stock data for stocks {stock_symbols}',
                        'details': {
                            'invalidSymbols': invalid_symbols,
                            'message': f"No valid data found for any symbols. Please check: {', '.join(invalid_symbols)}"
                        }
                    }), 400

                # # Validate data range for each stock
                # data_issues = {}
                # for symbol, data in stocks.items():
                #     if data.empty:
                #         data_issues[symbol] = "No data available"
                #         continue

                #     first_date = data.index[0]
                #     last_date = data.index[-1]
                    
                #     if first_date.year > start_year:
                #         data_issues[symbol] = f"Data only available from {first_date.year}"
                #     elif last_date.year < end_year - 1:
                #         data_issues[symbol] = f"Data only available until {last_date.year}"

                #     logger.info(f"data for symbol {symbol}: {data}")

                # Prepare response with warnings if needed
                response_data = {}
                if invalid_symbols or len(data_issues) > 0:
                    logger.info(f"invalid or (len = {len(data_issues)}) invalid :  {invalid_symbols}")
                    response_data['warnings'] = {
                        'invalidSymbols': invalid_symbols,
                        'dataIssues': data_issues,
                        'message': "Some stocks had issues with data availability"
                    }

                # Generate data points
                logger.info('Generating data points...')
                try:
                    results = generate_data_points(
                        initial_investment, 
                        start_year, 
                        end_year, 
                        stocks,
                        addition_amount, 
                        addition_frequency, 
                        adjust_for_inflation
                    )
                except Exception as e:
                    logger.error(f"Error generating data points: {str(e)}")
                    return jsonify({
                        'error': 'Calculation error',
                        'details': str(e)
                    }), 400

                # Generate visualization
                try:
                    vis_service = VisualizationService()
                    graph_json = vis_service.generate_graph(results)
                except Exception as e:
                    logger.error(f"Error generating visualization: {str(e)}")
                    return jsonify({
                        'error': 'Visualization error',
                        'details': str(e)
                    }), 400

                # Add results to response
                response_data.update({
                    'data': results,
                    'graph': graph_json
                })

                logger.info("Calculation completed successfully")
                return jsonify(response_data)

            except Exception as e:
                logger.error(f"Error processing stock data: {str(e)}")
                return jsonify({
                    'error': 'Data processing error',
                    'details': str(e)
                }), 400

        except Exception as e:
            logger.exception(f"Unexpected error in calculate route: {str(e)}")
            return jsonify({
                'error': 'Server error',
                'details': 'An unexpected error occurred'
            }), 500


    @app.route('/api/inflation')
    def get_inflation():
        """Get inflation data endpoint"""
        try:
            data = get_inflation_data()
            if data is None:
                return jsonify({
                    'error': 'Failed to load inflation data',
                    'details': 'Data file not found or invalid'
                }), 500
            return jsonify(data)
        except Exception as e:
            logger.error(f"Error fetching inflation data: {str(e)}")
            return jsonify({
                'error': 'Failed to fetch inflation data',
                'details': str(e)
            }), 500

    from services.stock_list_service import get_stock_list, search_stocks



    @app.route('/api/stocks')
    def get_stocks():
        """Get list of available stocks"""
        try:
            return jsonify(get_stock_list())
        except Exception as e:
            logger.error(f"Error fetching stock list: {str(e)}")
            return jsonify({
                'error': 'Failed to fetch stock list',
                'details': str(e)
            }), 500

    @app.route('/api/stocks/search')
    def search():
        """Search stocks by query"""
        try:
            query = request.args.get('q', '')
            if not query:
                return jsonify([])
            results = search_stocks(query)
            return jsonify(results)
        except Exception as e:
            logger.error(f"Error searching stocks: {str(e)}")
            return jsonify({
                'error': 'Search failed',
                'details': str(e)
            }), 500

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            'error': 'Not found',
            'details': 'The requested resource was not found'
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.exception("An internal error occurred")
        return jsonify({
            'error': 'Internal server error',
            'details': 'An unexpected error occurred'
        }), 500

    return app

if __name__ == '__main__':
    app = create_app('development')
    app.run(debug=app.config['DEBUG'])