import { createClient, type RedisClientType } from "redis";
import type { MessageToApi } from "./types/toApi.js";
import type { WsMessage } from "./types/toWs.js";

export class RedisManager {
	private static instance: RedisManager | null = null;
	private client: RedisClientType;

	private constructor() {
		const url = process.env.REDIS_URL || "redis://localhost:6379";
		const options = url.startsWith("rediss://")
			? { url, socket: { tls: true, rejectUnauthorized: false } }
			: { url };
		this.client = createClient(options);
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

	async pushMessage(message: unknown) {
		try {
			await this.client.lPush("db_processor", JSON.stringify(message));
		} catch (e) {
			console.error("pushMessage error", e);
		}
	}

	async publishMessage(channel: string, message: WsMessage) {
		try {
			await this.client.publish(channel, JSON.stringify(message));
		} catch (e) {
			console.error("publishMessage error", e);
		}
	}

	async sendToApi(clientId: string, message: MessageToApi) {
		try {
			await this.client.publish(clientId, JSON.stringify(message));
		} catch (e) {
			console.error("sendToApi error", e);
		}
	}
}
