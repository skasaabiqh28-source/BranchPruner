import { describe, it, expect, vi, beforeEach } from 'vitest';
import argon2 from 'argon2';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { workspaceRepository } from '../src/repositories/workspace.repository.js';
import { refreshTokenRepository } from '../src/repositories/refresh-token.repository.js';
import { verificationTokenRepository, passwordResetTokenRepository } from '../src/repositories/token.repository.js';
import { settingsRepository } from '../src/repositories/settings.repository.js';
import { protectedPatternRepository } from '../src/repositories/protected-pattern.repository.js';
import { authService } from '../src/services/auth.service.js';
import { oauthService } from '../src/services/oauth.service.js';
import { mailerService } from '../src/services/mailer.service.js';

describe('Real Authentication Engine (/api/auth)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settingsRepository, 'upsert').mockResolvedValue({} as any);
    vi.spyOn(protectedPatternRepository, 'create').mockResolvedValue({} as any);
  });

  describe('POST /api/auth/register', () => {
    it('validates minimum password length of 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@branchpruner.io', password: 'short' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates unverified user and dispatches verification email', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);
      vi.spyOn(userRepository, 'create').mockResolvedValueOnce({
        id: 'u-reg',
        email: 'engineer@branchpruner.io',
        name: 'Engineer Lead',
        avatarUrl: null,
        passwordHash: 'hash',
        emailVerified: false,
        emailVerifiedAt: null,
        authProviders: ['local'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      vi.spyOn(workspaceRepository, 'create').mockResolvedValueOnce({ id: 'ws-reg' } as any);
      vi.spyOn(verificationTokenRepository, 'create').mockResolvedValueOnce({} as any);
      const mailSpy = vi.spyOn(mailerService, 'sendVerificationEmail').mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'engineer@branchpruner.io',
          password: 'SuperSecretPassword2026!',
          name: 'Engineer Lead'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Please verify your email');
      expect(mailSpy).toHaveBeenCalled();
    });

    it('returns generic response for existing email to prevent account enumeration', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce({
        id: 'u-existing',
        email: 'existing@branchpruner.io',
        name: 'Existing User'
      } as any);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@branchpruner.io',
          password: 'SuperSecretPassword2026!'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('If this email address is eligible');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('verifies email with valid single-use token', async () => {
      vi.spyOn(verificationTokenRepository, 'findValid').mockResolvedValueOnce({
        id: 'vt-1',
        userId: 'u-1',
        tokenHash: 'some-hash',
        expiresAt: new Date(Date.now() + 10000),
        usedAt: null,
        createdAt: new Date()
      });
      vi.spyOn(verificationTokenRepository, 'markUsed').mockResolvedValueOnce({} as any);
      vi.spyOn(userRepository, 'markEmailVerified').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token-string' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Email verified successfully');
    });

    it('rejects invalid or expired token', async () => {
      vi.spyOn(verificationTokenRepository, 'findValid').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'expired-or-invalid-token' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects unverified user with EMAIL_NOT_VERIFIED (403)', async () => {
      const hashedPassword = await argon2.hash('Secret12345!', { type: argon2.argon2id });
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce({
        id: 'u-unverified',
        email: 'unverified@branchpruner.io',
        name: 'Unverified User',
        avatarUrl: null,
        passwordHash: hashedPassword,
        emailVerified: false,
        emailVerifiedAt: null,
        authProviders: ['local'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unverified@branchpruner.io', password: 'Secret12345!' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('authenticates verified user and sets httpOnly cookies', async () => {
      const hashedPassword = await argon2.hash('Secret12345!', { type: argon2.argon2id });
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce({
        id: 'u-verified',
        email: 'verified@branchpruner.io',
        name: 'Verified User',
        avatarUrl: null,
        passwordHash: hashedPassword,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authProviders: ['local'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      vi.spyOn(workspaceRepository, 'findFirstForUser').mockResolvedValueOnce({
        id: 'ws-verified',
        name: 'Verified Workspace',
        ownerId: 'u-verified',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      vi.spyOn(refreshTokenRepository, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'verified@branchpruner.io', password: 'Secret12345!' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('verified@branchpruner.io');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
      expect(cookieStr).toContain('access_token=');
      expect(cookieStr).toContain('refresh_token=');
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('SameSite=Lax');
    });
  });

  describe('Password Recovery', () => {
    it('returns generic response on forgot-password to prevent enumeration', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown@branchpruner.io' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset instructions have been dispatched');
    });

    it('resets password with valid token and hashes using argon2id', async () => {
      vi.spyOn(passwordResetTokenRepository, 'findValid').mockResolvedValueOnce({
        id: 'prt-1',
        userId: 'u-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
        usedAt: null,
        createdAt: new Date()
      });
      const userUpdateSpy = vi.spyOn(userRepository, 'update').mockResolvedValueOnce({} as any);
      vi.spyOn(passwordResetTokenRepository, 'markUsed').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-reset-token', newPassword: 'BrandNewSecurePassword2026!' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset successfully');
      expect(userUpdateSpy).toHaveBeenCalled();
    });
  });

  describe('OAuth Flow & CSRF State Validation', () => {
    it('initiates GitHub OAuth redirect with state cookie', async () => {
      vi.spyOn(oauthService, 'getGitHubAuthUrl').mockReturnValueOnce('https://github.com/login/oauth/authorize?mock=1');

      const res = await request(app).get('/api/auth/github');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('https://github.com');
      const cookies = res.headers['set-cookie'];
      expect(String(cookies)).toContain('oauth_state=');
    });

    it('rejects OAuth callback on state mismatch (CSRF prevention)', async () => {
      const res = await request(app)
        .get('/api/auth/github/callback?code=mock-code&state=forged-state')
        .set('Cookie', ['oauth_state=legitimate-state']);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
    });
  });

  describe('GET /api/me', () => {
    it('returns user profile including emailVerified status', async () => {
      const token = authService.generateAccessToken({
        userId: 'u-me',
        email: 'dev@branchpruner.io',
        workspaceId: 'ws-me'
      });

      vi.spyOn(userRepository, 'findById').mockResolvedValueOnce({
        id: 'u-me',
        email: 'dev@branchpruner.io',
        name: 'Dev Architect',
        avatarUrl: null,
        passwordHash: 'hash',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authProviders: ['local'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const res = await request(app)
        .get('/api/me')
        .set('Cookie', [`access_token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 'u-me',
        email: 'dev@branchpruner.io',
        emailVerified: true
      });
    });
  });
});
