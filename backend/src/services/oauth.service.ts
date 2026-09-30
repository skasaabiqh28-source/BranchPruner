import crypto from 'crypto';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { oauthAccountRepository } from '../repositories/oauth-account.repository.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { protectedPatternRepository } from '../repositories/protected-pattern.repository.js';
import { refreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { authService, TokenPayload } from './auth.service.js';
import { APP_CONSTANTS, ERROR_CODES } from '../config/constants.js';
import { logger } from '../config/logger.js';

export class OAuthService {
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  getGitHubAuthUrl(state: string): string {
    if (!env.GITHUB_CLIENT_ID) {
      throw new Error('GITHUB_CLIENT_ID is not configured in environment variables.');
    }
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'read:user user:email',
      state
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  getGoogleAuthUrl(state: string): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables.');
    }
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGitHubCallback(code: string, state: string, expectedState?: string) {
    if (!state || !expectedState || state !== expectedState) {
      const err = new Error('Invalid OAuth state parameter. Possible CSRF attempt.');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.CSRF_ERROR;
      (err as unknown as { code: string; status: number }).status = 403;
      throw err;
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_CALLBACK_URL
      })
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenData.access_token) {
      const err = new Error(tokenData.error_description || tokenData.error || 'Failed to obtain GitHub access token');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.OAUTH_ERROR;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    // Fetch user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'BranchPruner-Auth'
      }
    });

    if (!userRes.ok) {
      throw new Error('Failed to retrieve GitHub user profile');
    }

    const ghUser = await userRes.json() as { id: number; login: string; name?: string; avatar_url?: string };

    // Fetch verified emails
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'BranchPruner-Auth'
      }
    });

    if (!emailsRes.ok) {
      throw new Error('Failed to retrieve GitHub email addresses');
    }

    const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
    const primaryVerifiedEmail = emails.find((e) => e.primary && e.verified)?.email || emails.find((e) => e.verified)?.email;

    if (!primaryVerifiedEmail) {
      const err = new Error('Your GitHub account does not have a verified email address.');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.OAUTH_ERROR;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    return this.findOrCreateOAuthUser({
      provider: 'github',
      providerUserId: String(ghUser.id),
      email: primaryVerifiedEmail,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url
    });
  }

  async handleGoogleCallback(code: string, state: string, expectedState?: string) {
    if (!state || !expectedState || state !== expectedState) {
      const err = new Error('Invalid OAuth state parameter. Possible CSRF attempt.');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.CSRF_ERROR;
      (err as unknown as { code: string; status: number }).status = 403;
      throw err;
    }

    // Exchange code for Google token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; id_token?: string; error?: string; error_description?: string };
    if (!tokenData.access_token) {
      const err = new Error(tokenData.error_description || tokenData.error || 'Failed to obtain Google access token');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.OAUTH_ERROR;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userRes.ok) {
      throw new Error('Failed to retrieve Google user profile');
    }

    const gUser = await userRes.json() as { sub: string; email: string; email_verified?: boolean; name?: string; picture?: string };

    if (!gUser.email_verified) {
      const err = new Error('Google account email is unverified.');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.OAUTH_ERROR;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    return this.findOrCreateOAuthUser({
      provider: 'google',
      providerUserId: gUser.sub,
      email: gUser.email,
      name: gUser.name || gUser.email.split('@')[0],
      avatarUrl: gUser.picture
    });
  }

  private async findOrCreateOAuthUser(params: {
    provider: 'github' | 'google';
    providerUserId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }) {
    const { provider, providerUserId, email, name, avatarUrl } = params;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if OAuth account link already exists
    const existingOAuth = await oauthAccountRepository.findByProvider(provider, providerUserId);

    let user = existingOAuth ? await userRepository.findById(existingOAuth.userId) : null;

    if (!user) {
      // 2. Check if a user with this email exists
      const existingUserByEmail = await userRepository.findByEmail(normalizedEmail);

      if (existingUserByEmail) {
        // Link to an existing account ONLY when existing user's email is verified
        if (existingUserByEmail.emailVerified) {
          user = existingUserByEmail;
          await oauthAccountRepository.create({
            userId: user.id,
            provider,
            providerUserId,
            email: normalizedEmail
          });
          logger.info({ userId: user.id, provider }, 'Linked OAuth account to existing verified user');
        } else {
          // If existing account is not verified, require verification before linking
          const err = new Error('An unverified account already exists with this email. Please verify that account before linking OAuth.');
          (err as unknown as { code: string; status: number }).code = ERROR_CODES.EMAIL_NOT_VERIFIED;
          (err as unknown as { code: string; status: number }).status = 403;
          throw err;
        }
      } else {
        // 3. Create a brand new verified user
        const displayName = name?.trim() || normalizedEmail.split('@')[0] || 'DevOps Engineer';

        user = await userRepository.create({
          email: normalizedEmail,
          name: displayName,
          avatarUrl: avatarUrl || null,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          authProviders: [provider]
        });

        await oauthAccountRepository.create({
          userId: user.id,
          provider,
          providerUserId,
          email: normalizedEmail
        });

        // Provision workspace
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

        logger.info({ userId: user.id, provider }, 'Created new user via OAuth');
      }
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

    const accessToken = authService.generateAccessToken(tokenPayload);
    const rawRefreshToken = authService.generateRefreshToken();
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
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
}

export const oauthService = new OAuthService();
