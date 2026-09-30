import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../config/constants.js';
export function errorHandler(err, req, res, _next) {
    const status = err.status || 500;
    const code = err.code || (status === 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.BAD_REQUEST);
    if (status >= 500) {
        logger.error({ err, path: req.path, method: req.method }, 'Unhandled server error');
    }
    else {
        logger.warn({ path: req.path, method: req.method, code, message: err.message }, 'Client error');
    }
    res.status(status).json({
        error: {
            code,
            message: err.message || 'An unexpected error occurred',
            details: err.details || {}
        }
    });
}
