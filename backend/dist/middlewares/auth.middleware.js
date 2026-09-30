import { authService } from '../services/auth.service.js';
import { ERROR_CODES } from '../config/constants.js';
export function authMiddleware(req, res, next) {
    // Check cookie first, then Authorization header
    let token = req.cookies?.access_token;
    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }
    if (!token) {
        res.status(401).json({
            error: {
                code: ERROR_CODES.UNAUTHENTICATED,
                message: 'Authentication required. Please sign in.',
                details: {}
            }
        });
        return;
    }
    try {
        const payload = authService.verifyAccessToken(token);
        req.user = payload;
        next();
    }
    catch (err) {
        res.status(401).json({
            error: {
                code: ERROR_CODES.UNAUTHENTICATED,
                message: err.message || 'Invalid or expired session',
                details: {}
            }
        });
    }
}
