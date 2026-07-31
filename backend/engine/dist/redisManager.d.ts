import type { MessageToApi } from "./types/toApi.js";
import type { WsMessage } from "./types/toWs.js";
export declare class RedisManager {
    private static instance;
    private client;
    private constructor();
    static getInstance(): RedisManager;
    pushMessage(message: unknown): Promise<void>;
    publishMessage(channel: string, message: WsMessage): Promise<void>;
    sendToApi(clientId: string, message: MessageToApi): Promise<void>;
}
