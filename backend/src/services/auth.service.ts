import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { verificationTokenRepository, passwordResetTokenRepository } from '../repositories/token.repository.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { protectedPatternRepository } from '../repositories/protected-pattern.repository.js';
import { mailerService } from './mailer.service.js';
import { env } from '../config/env.js';
import { APP_CONSTANTS, ERROR_CODES } from '../config/constants.js';

export interface TokenPayload {
  userId: string;
  email: string;
  workspaceId: string;
}

// Dummy hash for timing attack mitigation during invalid user login
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dHVtbXlfc2FsdF9mb3JfdGltaW5n$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export class AuthService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: APP_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN_SECONDS
    });
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      const err = new Error('Invalid or expired access token');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.UNAUTHENTICATED;
      (err as unknown as { code: string; status: number }).status = 401;
      throw err;
    }
  }

  async register(email: string, password: string, name?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      // Anti-enumeration: return generic success without revealing existing account
      return {
        message: 'If this email address is eligible, a verification link has been sent. Please check your inbox.'
      };
    }

    const displayName = name?.trim() || normalizedEmail.split('@')[0] || 'DevOps Engineer';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const user = await userRepository.create({
      email: normalizedEmail,
      name: displayName,
      passwordHash,
      emailVerified: false,
      authProviders: ['local']
    });

    const workspace = await workspaceRepository.create(`${displayName}'s Workspace`, user.id);

    await settingsRepository.upsert(workspace.id, {
      dryRun: true,
      staleAfterDays: 30,
      autoPrune: false
    });

    await protectedPatternRepository.create(workspace.id, 'main');
    await protectedPatternRepository.create(workspace.id, 'master');
    await protectedPatternRepository.create(workspace.id, 'develop');
    await protectedPatternRepository.create(workspace.id, 'release/*');

    // Create verification token (expires in 24 hours)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await verificationTokenRepository.create(user.id, tokenHash, expiresAt);
    await mailerService.sendVerificationEmail(user.email, user.name, rawToken);

    return {
      message: 'Registration successful. Please verify your email to activate your account.'
    };
  }

  async verifyEmail(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      const err = new Error('Verification token is required');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BAD_REQUEST;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const validToken = await verificationTokenRepository.findValid(tokenHash);

    if (!validToken) {
      const err = new Error('Verification token is invalid or has expired');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.INVALID_OR_EXPIRED_TOKEN;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    await verificationTokenRepository.markUsed(validToken.id);
    await userRepository.markEmailVerified(validToken.userId);

    return {
      message: 'Email verified successfully. You can now sign in to your account.'
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (user && !user.emailVerified) {
      await verificationTokenRepository.invalidateAllForUser(user.id);

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await verificationTokenRepository.create(user.id, tokenHash, expiresAt);
      await mailerService.sendVerificationEmail(user.email, user.name, rawToken);
    }

    // Generic anti-enumeration response
    return {
      message: 'If an unverified account exists for this email, a new verification link has been sent.'
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      // Mitigate timing attack
      await argon2.verify(DUMMY_HASH, password).catch(() => false);
      const err = new Error('Invalid email or password');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.INVALID_CREDENTIALS;
      (err as unknown as { code: string; status: number }).status = 401;
      throw err;
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      const err = new Error('Invalid email or password');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.INVALID_CREDENTIALS;
      (err as unknown as { code: string; status: number }).status = 401;
      throw err;
    }

    if (!user.emailVerified) {
      const err = new Error('Your email address has not been verified yet. Please check your inbox or request a new verification link.');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.EMAIL_NOT_VERIFIED;
      (err as unknown as { code: string; status: number }).status = 403;
      throw err;
    }

    let workspace = await workspaceRepository.findFirstForUser(user.id);
    if (!workspace) {
      workspace = await workspaceRepository.create('Personal Workspace', user.id);
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      workspaceId: workspace.id
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const rawRefreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + APP_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN_DAYS * 86400000);

    await refreshTokenRepository.create(user.id, tokenHash, expiresAt);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        workspaceId: workspace.id
      },
      accessToken,
      refreshToken: rawRefreshToken
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (user && user.emailVerified) {
      await passwordResetTokenRepository.invalidateAllForUser(user.id);

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await passwordResetTokenRepository.create(user.id, tokenHash, expiresAt);
      await mailerService.sendPasswordResetEmail(user.email, user.name, rawToken);
    }

    // Generic anti-enumeration response
    return {
      message: 'If an account exists with this email address, password reset instructions have been dispatched.'
    };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      const err = new Error('Reset token is required');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BAD_REQUEST;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const validToken = await passwordResetTokenRepository.findValid(tokenHash);

    if (!validToken) {
      const err = new Error('Password reset link is invalid or has expired');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.INVALID_OR_EXPIRED_TOKEN;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await userRepository.update(validToken.userId, { passwordHash });
    await passwordResetTokenRepository.markUsed(validToken.id);

    // Invalidate all active sessions for this user on password change
    await refreshTokenRepository.revokeAllForUser?.(validToken.userId).catch(() => {});

    return {
      message: 'Password reset successfully. You can now log in with your new password.'
    };
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      const err = new Error('Refresh token is required');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.UNAUTHENTICATED;
      (err as unknown as { code: string; status: number }).status = 401;
      throw err;
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await refreshTokenRepository.findValidToken('', tokenHash);

    if (!storedToken) {
      const err = new Error('Refresh token is invalid or expired');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.UNAUTHENTICATED;
      (err as unknown as { code: string; status: number }).status = 401;
      throw err;
    }

    // Revoke used token for rotation
    await refreshTokenRepository.revoke(storedToken.id);

    const user = await userRepository.findById(storedToken.userId);
    if (!user) {
      const err = new Error('User not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.UNAUTHENTICATED;
      (err as unknown as { code: string; status: number }).status = 401;
      throw err;
    }

    const workspace = await workspaceRepository.findFirstForUser(user.id);
    if (!workspace) {
      const err = new Error('Workspace not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.UNAUTHENTICATED;
      (err as unknown as { code: string; status: number }).status = 401;
      throw err;
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      workspaceId: workspace.id
    };

    const newAccessToken = this.generateAccessToken(tokenPayload);
    const newRawRefreshToken = this.generateRefreshToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + APP_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN_DAYS * 86400000);

    await refreshTokenRepository.create(user.id, newTokenHash, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken
    };
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      const token = await refreshTokenRepository.findValidToken('', tokenHash);
      if (token) {
        await refreshTokenRepository.revoke(token.id);
      }
    }
  }

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    const emailPrefix = user.email.split('@')[0] || '';
    const parts = emailPrefix.split('.');
    const initials = parts.map((p) => p.charAt(0).toUpperCase()).join('').slice(0, 2) || 'BP';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      handle: `@${emailPrefix}`,
      role: 'Staff DevOps Architect',
      initials
    };
  }
}

export const authService = new AuthService();
