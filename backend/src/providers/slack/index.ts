import { SlackNotifier } from './slack-notifier.interface.js';
import { LiveSlackNotifier } from './slack.notifier.js';
import { MockSlackNotifier } from './mock-slack.notifier.js';
import { env } from '../../config/env.js';

let mockSlackNotifierInstance: MockSlackNotifier | null = null;
let liveSlackNotifierInstance: LiveSlackNotifier | null = null;

export function getSlackNotifier(): SlackNotifier {
  if (env.SLACK_MODE === 'mock') {
    if (!mockSlackNotifierInstance) {
      mockSlackNotifierInstance = new MockSlackNotifier();
    }
    return mockSlackNotifierInstance;
  }

  if (!liveSlackNotifierInstance) {
    liveSlackNotifierInstance = new LiveSlackNotifier();
  }
  return liveSlackNotifierInstance;
}

export function getMockSlackNotifier(): MockSlackNotifier {
  if (!mockSlackNotifierInstance) {
    mockSlackNotifierInstance = new MockSlackNotifier();
  }
  return mockSlackNotifierInstance;
}

export * from './slack-notifier.interface.js';
