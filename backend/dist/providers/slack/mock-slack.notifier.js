import { logger } from '../../config/logger.js';
export class MockSlackNotifier {
    dispatchedMessages = [];
    async sendWarning(channel, payload) {
        this.dispatchedMessages.push({
            channel,
            payload,
            timestamp: new Date()
        });
        logger.info({ channel, branchName: payload.branchName, author: payload.author, timeLeftHours: payload.timeLeftHours }, '[MockSlackNotifier] Dispatched hygiene warning to Slack');
        return true;
    }
    async listChannels() {
        return ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage'];
    }
    async sendTestAlert(channel) {
        this.dispatchedMessages.push({
            channel,
            test: true,
            timestamp: new Date()
        });
        logger.info({ channel }, '[MockSlackNotifier] Dispatched test alert');
        return true;
    }
    getDispatchedMessages() {
        return [...this.dispatchedMessages];
    }
    clearMessages() {
        this.dispatchedMessages = [];
    }
}
