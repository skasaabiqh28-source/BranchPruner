import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.GIT_PROVIDER_MODE = 'mock';
  process.env.SLACK_MODE = 'mock';
  process.env.JWT_SECRET = 'branchpruner_super_secret_jwt_access_token_key_32_chars';
  process.env.JWT_REFRESH_SECRET = 'branchpruner_super_secret_jwt_refresh_token_key_32_chars';
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});
