// static/js/services/LoggerService.js

export class LoggerService {
    static LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    // Check if we're in development mode by looking for common development indicators
    static isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('local');
    }

    static currentLogLevel = this.isDevelopment() 
        ? this.LOG_LEVELS.DEBUG 
        : this.LOG_LEVELS.INFO;

    static formatMessage(level, context, message, data) {
        const timestamp = new Date().toISOString();
        let dataString = '';
        
        try {
            dataString = data ? JSON.stringify(data, this.safeStringify) : '';
        } catch (e) {
            dataString = '[Unstringifiable data]';
        }
        
        return `[${timestamp}] [${level}] [${context}] ${message} ${dataString}`.trim();
    }

    static safeStringify(key, value) {
        if (value instanceof Error) {
            return {
                message: value.message,
                stack: value.stack,
                ...Object.fromEntries(
                    Object.getOwnPropertyNames(value)
                        .map(prop => [prop, value[prop]])
                )
            };
        }
        if (typeof value === 'bigint') {
            return value.toString();
        }
        if (value instanceof Set) {
            return Array.from(value);
        }
        if (value instanceof Map) {
            return Object.fromEntries(value);
        }
        if (typeof value === 'function') {
            return '[Function]';
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    }

    static debug(context, message, data = null) {
        if (this.currentLogLevel <= this.LOG_LEVELS.DEBUG) {
            console.debug(this.formatMessage('DEBUG', context, message, data));
        }
    }

    static info(context, message, data = null) {
        if (this.currentLogLevel <= this.LOG_LEVELS.INFO) {
            console.info(this.formatMessage('INFO', context, message, data));
        }
    }

    static warn(context, message, data = null) {
        if (this.currentLogLevel <= this.LOG_LEVELS.WARN) {
            console.warn(this.formatMessage('WARN', context, message, data));
        }
    }

    static error(context, message, error = null) {
        if (this.currentLogLevel <= this.LOG_LEVELS.ERROR) {
            console.error(this.formatMessage('ERROR', context, message, error));
        }
    }

    // Performance monitoring
    static startTimer() {
        return performance.now();
    }

    static endTimer(startTime, context, operation) {
        const duration = performance.now() - startTime;
        this.debug(context, `Operation timing: ${operation}`, { duration: `${duration}ms` });
        return duration;
    }

    static setLogLevel(level) {
        if (this.LOG_LEVELS.hasOwnProperty(level)) {
            this.currentLogLevel = this.LOG_LEVELS[level];
            this.debug('LoggerService', `Log level set to ${level}`);
        }
    }

    // Additional utility methods
    static getStackTrace() {
        try {
            throw new Error();
        } catch (e) {
            return e.stack.split('\n').slice(2).join('\n');
        }
    }

    static group(context, label) {
        if (this.currentLogLevel <= this.LOG_LEVELS.DEBUG) {
            console.group(`[${context}] ${label}`);
        }
    }

    static groupEnd() {
        if (this.currentLogLevel <= this.LOG_LEVELS.DEBUG) {
            console.groupEnd();
        }
    }

    static table(context, data, columns = null) {
        if (this.currentLogLevel <= this.LOG_LEVELS.DEBUG) {
            console.log(`[${context}] Table data:`);
            console.table(data, columns);
        }
    }

    // Environment detection
    static getEnvironment() {
        return {
            isDevelopment: this.isDevelopment(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }
}

// Initialize with debug mode if in development
if (LoggerService.isDevelopment()) {
    LoggerService.debug('LoggerService', 'Initialized in development mode', 
        LoggerService.getEnvironment());
}