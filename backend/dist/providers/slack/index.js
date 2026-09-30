import { LiveSlackNotifier } from './slack.notifier.js';
import { MockSlackNotifier } from './mock-slack.notifier.js';
import { env } from '../../config/env.js';
let mockSlackNotifierInstance = null;
let liveSlackNotifierInstance = null;
export function getSlackNotifier() {
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
export function getMockSlackNotifier() {
    if (!mockSlackNotifierInstance) {
        mockSlackNotifierInstance = new MockSlackNotifier();
    }
    return mockSlackNotifierInstance;
}
export * from './slack-notifier.interface.js';
