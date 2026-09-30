import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginRateLimiter, registerRateLimiter, passwordResetRateLimiter } from '../middlewares/rate-limit.middleware.js';
export const authRouter = Router();
const registerSchema = z.object({
    email: z.string().email('Please provide a valid work email format'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: z.string().optional()
});
const loginSchema = z.object({
    email: z.string().email('Please provide a valid work email format'),
    password: z.string().min(1, 'Password is required')
});
const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Verification token is required')
});
const resendVerificationSchema = z.object({
    email: z.string().email('Please provide a valid work email format')
});
const forgotPasswordSchema = z.object({
    email: z.string().email('Please provide a valid work email format')
});
const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long')
});
// Registration
authRouter.post('/register', registerRateLimiter, validate({ body: registerSchema }), (req, res, next) => authController.register(req, res, next));
// Email Verification
authRouter.post('/verify-email', validate({ body: verifyEmailSchema }), (req, res, next) => authController.verifyEmail(req, res, next));
authRouter.get('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
authRouter.post('/resend-verification', validate({ body: resendVerificationSchema }), (req, res, next) => authController.resendVerification(req, res, next));
// Login
authRouter.post('/login', loginRateLimiter, validate({ body: loginSchema }), (req, res, next) => authController.login(req, res, next));
// Password recovery
authRouter.post('/forgot-password', passwordResetRateLimiter, validate({ body: forgotPasswordSchema }), (req, res, next) => authController.forgotPassword(req, res, next));
authRouter.post('/reset-password', passwordResetRateLimiter, validate({ body: resetPasswordSchema }), (req, res, next) => authController.resetPassword(req, res, next));
// GitHub OAuth
authRouter.get('/github', (req, res, next) => authController.initiateGitHubOAuth(req, res, next));
authRouter.get('/github/callback', (req, res, next) => authController.handleGitHubCallback(req, res, next));
// Google OAuth
authRouter.get('/google', (req, res, next) => authController.initiateGoogleOAuth(req, res, next));
authRouter.get('/google/callback', (req, res, next) => authController.handleGoogleCallback(req, res, next));
// Session rotation & logout
authRouter.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
// Session user profile
authRouter.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));
export const meRouter = Router();
meRouter.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));
