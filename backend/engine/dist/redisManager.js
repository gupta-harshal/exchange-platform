import { createClient } from "redis";
export class RedisManager {
    static instance = null;
    client;
    constructor() {
        this.client = createClient();
        this.client.connect().catch(err => {
            console.error("Redis connect error:", err);
        });
    }
    static getInstance() {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }
    async pushMessage(message) {
        try {
            await this.client.lPush("db_processor", JSON.stringify(message));
        }
        catch (e) {
            console.error("pushMessage error", e);
        }
    }
    async publishMessage(channel, message) {
        try {
            await this.client.publish(channel, JSON.stringify(message));
        }
        catch (e) {
            console.error("publishMessage error", e);
        }
    }
    async sendToApi(clientId, message) {
        try {
            await this.client.publish(clientId, JSON.stringify(message));
        }
        catch (e) {
            console.error("sendToApi error", e);
        }
    }
}
//# sourceMappingURL=redisManager.js.map