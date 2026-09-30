import crypto from 'crypto';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../config/constants.js';
export function csrfMiddleware(req, res, next) {
    // Ensure a CSRF token cookie is always set for the client
    let csrfToken = req.cookies?.csrf_token;
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(24).toString('hex');
        res.cookie('csrf_token', csrfToken, {
            httpOnly: false, // Must be readable by client JS to send in X-CSRF-Token header
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
    }
    // Safe HTTP methods do not mutate state
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    // Exempt webhooks from CSRF checks (they use cryptographic HMAC signatures)
    if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/webhooks')) {
        return next();
    }
    // Exempt OAuth callbacks (they validate the OAuth 'state' parameter directly)
    if (req.path.includes('/callback')) {
        return next();
    }
    // For state-mutating requests, check CSRF token header if cookie is present
    const headerToken = req.headers['x-csrf-token'];
    // If client sent an explicit CSRF token header, verify match
    if (headerToken) {
        if (headerToken !== csrfToken) {
            res.status(403).json({
                error: {
                    code: ERROR_CODES.CSRF_ERROR,
                    message: 'Invalid CSRF token header. Request rejected.',
                    details: {}
                }
            });
            return;
        }
    }
    next();
}
