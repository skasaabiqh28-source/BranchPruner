import { logger } from '../../config/logger.js';
export class MockProvider {
    repos = [
        { id: 'mock-101', fullName: 'org/core-api', defaultBranch: 'main', provider: 'github' },
        { id: 'mock-102', fullName: 'org/web-client', defaultBranch: 'main', provider: 'github' },
        { id: 'mock-103', fullName: 'org/infra-terraform', defaultBranch: 'main', provider: 'github' },
        { id: 'mock-104', fullName: 'org/auth-service', defaultBranch: 'main', provider: 'github' },
        { id: 'mock-105', fullName: 'org/billing-pipeline', defaultBranch: 'main', provider: 'github' }
    ];
    // Map of repoFullName -> Map of branchName -> RemoteBranch
    branches = new Map();
    // Map of repoFullName -> Map of ref -> commitSha
    archiveRefs = new Map();
    constructor() {
        this.seedDefaultData();
    }
    seedDefaultData() {
        this.branches.clear();
        this.archiveRefs.clear();
        const now = Date.now();
        const initialBranches = {
            'org/core-api': [
                { name: 'main', author: 'ci-bot', daysStale: 0, sha: '1010101010' },
                { name: 'feat/checkout-v2-redesign', author: 'sarah.dev', daysStale: 135, sha: 'a891f041b3' },
                { name: 'chore/dep-upgrade-node20', author: 'alex.tan', daysStale: 44, sha: 'd567a123bc' },
                { name: 'perf/cache-invalidation-v2', author: 'alex.tan', daysStale: 68, sha: '1122a334ff' }
            ],
            'org/web-client': [
                { name: 'main', author: 'ci-bot', daysStale: 0, sha: '2020202020' },
                { name: 'spike/webrtc-audio-poc', author: 'marcus.k', daysStale: 72, sha: 'c341b892ef' },
                { name: 'temp/table-virtualization', author: 'sarah.dev', daysStale: 148, sha: '9876b543ac' }
            ],
            'org/infra-terraform': [
                { name: 'main', author: 'ci-bot', daysStale: 0, sha: '3030303030' },
                { name: 'fix/s3-retention-test', author: 'elena.rodriguez', daysStale: 89, sha: 'e789f456de' }
            ],
            'org/auth-service': [
                { name: 'main', author: 'ci-bot', daysStale: 0, sha: '4040404040' },
                { name: 'experiment/passkeys-fido2', author: 'devon.miles', daysStale: 34, sha: 'f123a789bc' },
                { name: 'chore/remove-legacy-shims', author: 'devon.miles', daysStale: 95, sha: '9900c112dd' }
            ],
            'org/billing-pipeline': [
                { name: 'main', author: 'ci-bot', daysStale: 0, sha: '5050505050' },
                { name: 'test/stripe-webhook-sandbox', author: 'kenji.s', daysStale: 52, sha: '4567c890df' },
                { name: 'refactor/sql-query-builder', author: 'kenji.s', daysStale: 40, sha: '5566b778ee' }
            ]
        };
        for (const [repo, bList] of Object.entries(initialBranches)) {
            const repoMap = new Map();
            for (const b of bList) {
                repoMap.set(b.name, {
                    name: b.name,
                    author: b.author,
                    commitSha: b.sha,
                    commitDate: new Date(now - b.daysStale * 86400000)
                });
            }
            this.branches.set(repo, repoMap);
        }
    }
    async listRepos() {
        return [...this.repos];
    }
    async listBranches(repoFullName) {
        const repoBranches = this.branches.get(repoFullName);
        if (!repoBranches)
            return [];
        return Array.from(repoBranches.values());
    }
    async getBranch(repoFullName, branchName) {
        const repoBranches = this.branches.get(repoFullName);
        return repoBranches?.get(branchName) || null;
    }
    async createArchiveRef(repoFullName, branchName, commitSha) {
        const ref = `refs/branchpruner/archive/${branchName}`;
        let refs = this.archiveRefs.get(repoFullName);
        if (!refs) {
            refs = new Map();
            this.archiveRefs.set(repoFullName, refs);
        }
        refs.set(ref, commitSha);
        logger.info({ repoFullName, ref, commitSha }, '[MockProvider] Created archive ref');
        return ref;
    }
    async deleteBranch(repoFullName, branchName) {
        const repoBranches = this.branches.get(repoFullName);
        if (!repoBranches || !repoBranches.has(branchName)) {
            return false;
        }
        repoBranches.delete(branchName);
        logger.info({ repoFullName, branchName }, '[MockProvider] Deleted branch');
        return true;
    }
    async createBranchFromSha(repoFullName, branchName, commitSha) {
        let repoBranches = this.branches.get(repoFullName);
        if (!repoBranches) {
            repoBranches = new Map();
            this.branches.set(repoFullName, repoBranches);
        }
        if (repoBranches.has(branchName)) {
            const err = new Error(`Branch '${branchName}' already exists on remote`);
            err.status = 409;
            throw err;
        }
        repoBranches.set(branchName, {
            name: branchName,
            author: 'restored-by-branchpruner',
            commitSha,
            commitDate: new Date()
        });
        logger.info({ repoFullName, branchName, commitSha }, '[MockProvider] Restored branch from SHA');
        return true;
    }
    async deleteArchiveRef(repoFullName, ref) {
        const refs = this.archiveRefs.get(repoFullName);
        if (refs && refs.has(ref)) {
            refs.delete(ref);
            logger.info({ repoFullName, ref }, '[MockProvider] Deleted archive ref (rollback)');
            return true;
        }
        return false;
    }
}
