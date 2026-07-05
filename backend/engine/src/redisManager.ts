import { createClient, RedisClientType } from "redis";

export class RedisManager {
	private static instance: RedisManager | null = null;
	private client: RedisClientType;

	private constructor() {
		this.client = createClient();
		this.client.connect().catch(err => {
			console.error("Redis connect error:", err);
		});
	}

	static getInstance(): RedisManager {
		if (!RedisManager.instance) {
			RedisManager.instance = new RedisManager();
		}
		return RedisManager.instance;
	}

	async pushMessage(message: any) {
		try {
			await this.client.lPush("messages", JSON.stringify(message));
		} catch (e) {
			console.error("pushMessage error", e);
		}
	}

	async publishMessage(channel: string, message: any) {
		try {
			await this.client.publish(channel, JSON.stringify(message));
		} catch (e) {
			console.error("publishMessage error", e);
		}
	}

	// Send a message intended for a specific API client. Implementation uses a list
	// per-client so callers can pick the mechanism they prefer (LPUSH/RPOP or SUBSCRIBE).
	async sendToApi(clientId: string, message: any) {
		try {
			const payload = { clientId, message };
			await this.client.lPush(`responses:${clientId}`, JSON.stringify(payload));
		} catch (e) {
			console.error("sendToApi error", e);
		}
	}
}

