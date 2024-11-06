import os
from datetime import timedelta

class Config:
    # Use environment variables for sensitive data
    SECRET_KEY = os.environ.get('SECRET_KEY') or None
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set in environment variables")
    
    # Flask-Caching settings
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'simple')
    
    # Debug mode
    DEBUG = False
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:5000', 'http://127.0.0.1:5000']

    CELERY_BROKER_URL = 'redis://localhost:6379/1'
    CELERY_RESULT_BACKEND = 'redis://localhost:6379/2'
    CACHE_REDIS_URL = 'redis://localhost:6379/0'

class DevelopmentConfig(Config):
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    CACHE_TYPE = 'simple'

class ProductionConfig(Config):
    DEBUG = False
    CACHE_TYPE = 'redis'
    LOG_LEVEL = 'INFO'
    
    # Production security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')
    return config.get(config_name, config['default'])