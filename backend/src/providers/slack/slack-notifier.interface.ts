export interface SlackWarningPayload {
  branchName: string;
  repoFullName: string;
  author: string;
  daysStale: number;
  timeLeftHours: number;
  deadlineAt: Date;
}

export interface SlackNotifier {
  sendWarning(channel: string, payload: SlackWarningPayload): Promise<boolean>;
  listChannels(): Promise<string[]>;
  sendTestAlert(channel: string): Promise<boolean>;
}
