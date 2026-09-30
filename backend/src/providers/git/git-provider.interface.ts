export interface RemoteRepo {
  id: string;
  fullName: string;
  defaultBranch: string;
  provider: 'github' | 'gitlab';
}

export interface RemoteBranch {
  name: string;
  commitSha: string;
  commitDate: Date;
  author: string;
  isProtected?: boolean;
}

export interface GitProvider {
  listRepos(token?: string): Promise<RemoteRepo[]>;
  listBranches(repoFullName: string, token?: string): Promise<RemoteBranch[]>;
  getBranch(repoFullName: string, branchName: string, token?: string): Promise<RemoteBranch | null>;
  createArchiveRef(repoFullName: string, branchName: string, commitSha: string, token?: string): Promise<string>;
  deleteBranch(repoFullName: string, branchName: string, token?: string): Promise<boolean>;
  createBranchFromSha(repoFullName: string, branchName: string, commitSha: string, token?: string): Promise<boolean>;
  deleteArchiveRef?(repoFullName: string, ref: string, token?: string): Promise<boolean>;
}
