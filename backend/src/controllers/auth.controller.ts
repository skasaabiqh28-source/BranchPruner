import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { oauthService } from '../services/oauth.service.js';
import { env } from '../config/env.js';
import { APP_CONSTANTS } from '../config/constants.js';

const getCookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeMs
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;
      const result = await authService.register(email, password, name);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = (req.body?.token || req.query?.token) as string;
      const result = await authService.verifyEmail(token);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.resendVerification(email);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.cookie(
        'access_token',
        result.accessToken,
        getCookieOptions(APP_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000)
      );
      res.cookie(
        'refresh_token',
        result.refreshToken,
        getCookieOptions(APP_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN_DAYS * 86400000)
      );

      res.status(200).json({
        user: result.user,
        message: 'Authenticated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  initiateGitHubOAuth(_req: Request, res: Response, next: NextFunction): void {
    try {
      const state = oauthService.generateState();
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
      const url = oauthService.getGitHubAuthUrl(state);
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  }

  async handleGitHubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const expectedState = req.cookies?.oauth_state;

      res.clearCookie('oauth_state', { path: '/' });

      if (!code) {
        throw new Error('Authorization code missing from GitHub OAuth callback');
      }

      const result = await oauthService.handleGitHubCallback(code, state, expectedState);

      res.cookie(
        'access_token',
        result.accessToken,
        getCookieOptions(APP_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000)
      );
      res.cookie(
        'refresh_token',
        result.refreshToken,
        getCookieOptions(APP_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN_DAYS * 86400000)
      );

      res.redirect(`${env.APP_URL}/dashboard`);
    } catch (err) {
      next(err);
    }
  }

  initiateGoogleOAuth(_req: Request, res: Response, next: NextFunction): void {
    try {
      const state = oauthService.generateState();
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
      const url = oauthService.getGoogleAuthUrl(state);
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  }

  async handleGoogleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const expectedState = req.cookies?.oauth_state;

      res.clearCookie('oauth_state', { path: '/' });

      if (!code) {
        throw new Error('Authorization code missing from Google OAuth callback');
      }

      const result = await oauthService.handleGoogleCallback(code, state, expectedState);

      res.cookie(
        'access_token',
        result.accessToken,
        getCookieOptions(APP_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000)
      );
      res.cookie(
        'refresh_token',
        result.refreshToken,
        getCookieOptions(APP_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN_DAYS * 86400000)
      );

      res.redirect(`${env.APP_URL}/dashboard`);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      const result = await authService.refresh(refreshToken);

      res.cookie(
        'access_token',
        result.accessToken,
        getCookieOptions(APP_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000)
      );
      res.cookie(
        'refresh_token',
        result.refreshToken,
        getCookieOptions(APP_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN_DAYS * 86400000)
      );

      res.status(200).json({
        message: 'Token refreshed successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token;
      await authService.logout(refreshToken);

      res.clearCookie('access_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/' });

      res.status(200).json({
        message: 'Signed out successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } });
        return;
      }
      const me = await authService.getMe(req.user.userId);
      res.status(200).json(me);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
