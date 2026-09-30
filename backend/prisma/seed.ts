import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data for idempotency
  await prisma.auditEvent.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.protectedPattern.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Demo User
  const passwordHash = await argon2.hash('GitHygiene2025!');
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@branchpruner.dev',
      name: 'Jordan Alvarez',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      passwordHash,
      authProviders: ['email', 'github', 'google']
    }
  });

  console.log(`👤 Created demo user: ${demoUser.email}`);

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Corp DevOps Enclave',
      ownerId: demoUser.id
    }
  });

  console.log(`🏢 Created workspace: ${workspace.name}`);

  // 3. Create Settings
  await prisma.settings.create({
    data: {
      workspaceId: workspace.id,
      dryRun: true,
      staleAfterDays: 30,
      autoPrune: false,
      remediationWindowDays: 7
    }
  });

  // 4. Create Protected Branch Patterns
  const patterns = ['main', 'master', 'release/*', 'hotfix/*', 'prod-v*'];
  for (const pattern of patterns) {
    await prisma.protectedPattern.create({
      data: {
        workspaceId: workspace.id,
        pattern
      }
    });
  }

  console.log(`🛡️ Seeded ${patterns.length} protected patterns`);

  // 5. Create Integrations
  await prisma.integration.create({
    data: {
      workspaceId: workspace.id,
      provider: 'github',
      status: 'connected',
      connectedAs: '@pruner-bot-ci',
      encryptedToken: 'mock_encrypted_gh_pat_token',
      config: {
        accountType: 'GitHub Enterprise Org',
        organization: 'acme-org'
      },
      lastSyncedAt: new Date()
    }
  });

  await prisma.integration.create({
    data: {
      workspaceId: workspace.id,
      provider: 'gitlab',
      status: 'disconnected',
      connectedAs: null,
      config: {
        accountType: 'Self-Hosted or SaaS'
      },
      lastSyncedAt: null
    }
  });

  await prisma.integration.create({
    data: {
      workspaceId: workspace.id,
      provider: 'slack',
      status: 'connected',
      connectedAs: '@devops-notify',
      encryptedToken: 'mock_encrypted_slack_bot_token',
      config: {
        channel: '#git-hygiene',
        availableChannels: ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage']
      },
      lastSyncedAt: new Date(Date.now() - 14 * 60 * 1000)
    }
  });

  console.log('🔗 Seeded GitHub, GitLab, and Slack integrations');

  // 6. Create Repositories
  const reposData = [
    { fullName: 'org/core-api', defaultBranch: 'main', externalId: 'gh_repo_101' },
    { fullName: 'org/web-client', defaultBranch: 'main', externalId: 'gh_repo_102' },
    { fullName: 'org/infra-terraform', defaultBranch: 'main', externalId: 'gh_repo_103' },
    { fullName: 'org/auth-service', defaultBranch: 'main', externalId: 'gh_repo_104' },
    { fullName: 'org/billing-pipeline', defaultBranch: 'main', externalId: 'gh_repo_105' }
  ];

  const repoMap: Record<string, string> = {};
  for (const r of reposData) {
    const created = await prisma.repository.create({
      data: {
        workspaceId: workspace.id,
        provider: 'github',
        fullName: r.fullName,
        defaultBranch: r.defaultBranch,
        externalId: r.externalId,
        trackedAt: new Date(Date.now() - 60 * 86400000)
      }
    });
    repoMap[r.fullName] = created.id;
  }

  console.log(`📦 Seeded ${reposData.length} repositories`);

  // 7. Seed Flagged Branches (with varied staleness and at least two under 48 hours)
  const now = Date.now();
  const branchesData = [
    {
      repo: 'org/core-api',
      name: 'feat/checkout-v2-redesign',
      author: 'sarah.dev',
      daysStale: 135,
      hoursLeft: 14, // < 48 hours: URGENT!
      sha: 'a891f041b3'
    },
    {
      repo: 'org/web-client',
      name: 'spike/webrtc-audio-poc',
      author: 'marcus.k',
      daysStale: 72,
      hoursLeft: 38, // < 48 hours: URGENT!
      sha: 'c341b892ef'
    },
    {
      repo: 'org/core-api',
      name: 'chore/dep-upgrade-node20',
      author: 'alex.tan',
      daysStale: 44,
      hoursLeft: 96,
      sha: 'd567a123bc'
    },
    {
      repo: 'org/infra-terraform',
      name: 'fix/s3-retention-test',
      author: 'elena.rodriguez',
      daysStale: 89,
      hoursLeft: 122,
      sha: 'e789f456de'
    },
    {
      repo: 'org/auth-service',
      name: 'experiment/passkeys-fido2',
      author: 'devon.miles',
      daysStale: 34,
      hoursLeft: 154,
      sha: 'f123a789bc'
    },
    {
      repo: 'org/web-client',
      name: 'temp/table-virtualization',
      author: 'sarah.dev',
      daysStale: 148,
      hoursLeft: 22, // < 48 hours: URGENT!
      sha: '9876b543ac'
    },
    {
      repo: 'org/billing-pipeline',
      name: 'test/stripe-webhook-sandbox',
      author: 'kenji.s',
      daysStale: 52,
      hoursLeft: 64,
      sha: '4567c890df'
    },
    {
      repo: 'org/core-api',
      name: 'perf/cache-invalidation-v2',
      author: 'alex.tan',
      daysStale: 68,
      hoursLeft: 80,
      sha: '1122a334ff'
    },
    {
      repo: 'org/billing-pipeline',
      name: 'refactor/sql-query-builder',
      author: 'kenji.s',
      daysStale: 40,
      hoursLeft: 110,
      sha: '5566b778ee'
    },
    {
      repo: 'org/auth-service',
      name: 'chore/remove-legacy-shims',
      author: 'devon.miles',
      daysStale: 95,
      hoursLeft: 130,
      sha: '9900c112dd'
    }
  ];

  for (const b of branchesData) {
    const repositoryId = repoMap[b.repo]!;
    const lastCommitAt = new Date(now - b.daysStale * 86400000);
    // Flagged 7 days minus hoursLeft
    const flaggedAt = new Date(now - (7 * 24 - b.hoursLeft) * 3600000);
    const deadlineAt = new Date(flaggedAt.getTime() + 7 * 86400000);

    await prisma.branch.create({
      data: {
        repositoryId,
        name: b.name,
        author: b.author,
        lastCommitSha: b.sha,
        lastCommitAt,
        status: 'flagged',
        flaggedAt,
        deadlineAt
      }
    });
  }

  console.log(`🌿 Seeded ${branchesData.length} flagged remediation branches`);

  // 8. Seed Recovery Log Snapshots
  const snapshotsData = [
    {
      repo: 'org/core-api',
      branchName: 'feat/graphql-legacy-endpoint',
      sha: '7b2a9f14',
      prunedAt: new Date(now - 2 * 3600000),
      prunedBy: 'user'
    },
    {
      repo: 'org/web-client',
      branchName: 'quickfix/nav-icon-alignment',
      sha: '3e41c09b',
      prunedAt: new Date(now - 24 * 3600000),
      prunedBy: 'scheduler'
    },
    {
      repo: 'org/auth-service',
      branchName: 'debug/jwt-expiry-race',
      sha: 'f90c12da',
      prunedAt: new Date(now - 3 * 86400000),
      prunedBy: 'user'
    },
    {
      repo: 'org/core-api',
      branchName: 'poc/grpc-gateway',
      sha: 'a1b2c3d4',
      prunedAt: new Date(now - 5 * 86400000),
      prunedBy: 'scheduler'
    },
    {
      repo: 'org/web-client',
      branchName: 'spike/esbuild-migration',
      sha: 'c5d6e7f8',
      prunedAt: new Date(now - 6 * 86400000),
      prunedBy: 'user'
    }
  ];

  for (const s of snapshotsData) {
    const repositoryId = repoMap[s.repo]!;
    await prisma.snapshot.create({
      data: {
        repositoryId,
        branchName: s.branchName,
        archivedCommitSha: s.sha,
        archiveRef: `refs/branchpruner/archive/${s.branchName}`,
        prunedAt: s.prunedAt,
        prunedBy: s.prunedBy,
        status: 'archived'
      }
    });
  }

  console.log(`📸 Seeded ${snapshotsData.length} recovery log snapshots`);

  // 9. Initial Audit Events
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      actorId: demoUser.id,
      type: 'WORKSPACE_INITIALIZED',
      payload: { note: 'Initial seed configuration with baseline guardrails' },
      dryRun: false
    }
  });

  console.log('✅ Database seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
