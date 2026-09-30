import { SlackNotifier, SlackWarningPayload } from './slack-notifier.interface.js';
import { logger } from '../../config/logger.js';

export class MockSlackNotifier implements SlackNotifier {
  private dispatchedMessages: Array<{ channel: string; payload?: SlackWarningPayload; test?: boolean; timestamp: Date }> = [];

  async sendWarning(channel: string, payload: SlackWarningPayload): Promise<boolean> {
    this.dispatchedMessages.push({
      channel,
      payload,
      timestamp: new Date()
    });
    logger.info(
      { channel, branchName: payload.branchName, author: payload.author, timeLeftHours: payload.timeLeftHours },
      '[MockSlackNotifier] Dispatched hygiene warning to Slack'
    );
    return true;
  }

  async listChannels(): Promise<string[]> {
    return ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage'];
  }

  async sendTestAlert(channel: string): Promise<boolean> {
    this.dispatchedMessages.push({
      channel,
      test: true,
      timestamp: new Date()
    });
    logger.info({ channel }, '[MockSlackNotifier] Dispatched test alert');
    return true;
  }

  public getDispatchedMessages() {
    return [...this.dispatchedMessages];
  }

  public clearMessages() {
    this.dispatchedMessages = [];
  }
}
