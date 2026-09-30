import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../config/constants.js';
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Too many login attempts. Please try again in a few minutes.',
            details: {}
        }
    }
});
export const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 15, // 15 registrations per IP per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: 'Too many account registrations from this IP. Please try again later.',
            details: {}
        }
    }
});
export const passwordResetRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 reset requests per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: 'Too many password reset requests. Please try again later.',
            details: {}
        }
    }
});
export const destructiveActionRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: 'Rate limit exceeded for prune/restore actions.',
            details: {}
        }
    }
});
