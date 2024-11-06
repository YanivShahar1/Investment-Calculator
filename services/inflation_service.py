# services/inflation_service.py
import json
import os
from flask import current_app

def get_inflation_data():
    """Get historical inflation data"""
    try:
        file_path = os.path.join(current_app.config['DATA_DIR'], 'inflation_data.json')
        with open(file_path, 'r') as f:
            data = json.load(f)
            return data['US']  # Or allow country selection in the future
    except Exception as e:
        current_app.logger.error(f"Error loading inflation data: {str(e)}")
        return None