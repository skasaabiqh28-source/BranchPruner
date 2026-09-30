import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
export class LiveSlackNotifier {
    token;
    constructor(token) {
        this.token = token || env.SLACK_BOT_TOKEN;
    }
    async sendWarning(channel, payload) {
        if (!this.token) {
            logger.warn('SLACK_BOT_TOKEN not provided, cannot send live Slack message');
            return false;
        }
        try {
            const text = `⚠️ *BranchPruner Stale Branch Alert* ⚠️\n` +
                `• *Repository:* \`${payload.repoFullName}\`\n` +
                `• *Branch:* \`${payload.branchName}\`\n` +
                `• *Author:* @${payload.author}\n` +
                `• *Idle Staleness:* ${payload.daysStale} days\n` +
                `• *Time Until Automated Pruning:* ~${payload.timeLeftHours} hours (Deadline: ${payload.deadlineAt.toISOString()})\n` +
                `_To prevent automated pruning, keep the branch from the BranchPruner console or push a new commit._`;
            await axios.post('https://slack.com/api/chat.postMessage', {
                channel,
                text,
                mrkdwn: true
            }, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json; charset=utf-8'
                }
            });
            logger.info({ channel, branch: payload.branchName }, '[LiveSlackNotifier] Alert posted to Slack channel');
            return true;
        }
        catch (e) {
            logger.error({ error: e, channel, branch: payload.branchName }, '[LiveSlackNotifier] Failed to post Slack alert');
            return false;
        }
    }
    async listChannels() {
        if (!this.token) {
            return ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage'];
        }
        try {
            const response = await axios.get('https://slack.com/api/conversations.list', {
                headers: { Authorization: `Bearer ${this.token}` },
                params: { types: 'public_channel,private_channel', limit: 100 }
            });
            if (response.data?.ok && Array.isArray(response.data.channels)) {
                return response.data.channels.map((c) => `#${c.name}`);
            }
            return ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage'];
        }
        catch (e) {
            logger.warn({ error: e }, '[LiveSlackNotifier] Failed to fetch Slack channels, falling back to defaults');
            return ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage'];
        }
    }
    async sendTestAlert(channel) {
        if (!this.token)
            return false;
        try {
            await axios.post('https://slack.com/api/chat.postMessage', {
                channel,
                text: `🔔 *BranchPruner Connectivity Test*: Slack webhooks are configured and operational!`
            }, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json; charset=utf-8'
                }
            });
            return true;
        }
        catch (e) {
            logger.error({ error: e, channel }, '[LiveSlackNotifier] Failed to send test alert');
            return false;
        }
    }
}
