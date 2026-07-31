import { RedisClientType, createClient } from "redis";
import { UserManager } from "./UserManager";
import { OutgoingMessage } from "./types/out";

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private subscriptions: Map<string, string[]> = new Map();
    private reverseSubscriptions: Map<string, string[]> = new Map();
    private redisClient: RedisClientType;

    private constructor() {
        const url = process.env.REDIS_URL || "redis://localhost:6379";
        const options = url.startsWith("rediss://")
            ? { url, socket: { tls: true, rejectUnauthorized: false } }
            : { url };
        this.redisClient = createClient(options);
        this.redisClient.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public subscribe(userId: string, subscription: string) {
        if (this.subscriptions.get(userId)?.includes(subscription)) {
            return
        }

        this.subscriptions.set(userId, (this.subscriptions.get(userId) || []).concat(subscription));
        this.reverseSubscriptions.set(subscription, (this.reverseSubscriptions.get(subscription) || []).concat(userId));
        if (this.reverseSubscriptions.get(subscription)?.length === 1) {
            this.redisClient.subscribe(subscription, this.redisCallbackHandler);
        }
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        const parsedMessage = JSON.parse(message);
        const outgoing = this.toOutgoing(channel, parsedMessage);
        this.reverseSubscriptions.get(channel)?.forEach(s => UserManager.getInstance().getUser(s)?.emit(outgoing));
    }

    private toOutgoing(channel: string, parsedMessage: any): OutgoingMessage {
        if (parsedMessage?.data?.e === "trade" || channel.startsWith("trade@")) {
            return {
                type: "trade",
                data: parsedMessage.data
            };
        }
        if (parsedMessage?.data?.e === "ticker" || channel.startsWith("ticker@")) {
            return {
                type: "ticker",
                data: parsedMessage.data
            };
        }
        return {
            type: "depth",
            data: parsedMessage.data
        };
    }

    public unsubscribe(userId: string, subscription: string) {
        const subscriptions = this.subscriptions.get(userId);
        if (subscriptions) {
            this.subscriptions.set(userId, subscriptions.filter(s => s !== subscription));
        }
        const reverseSubscriptions = this.reverseSubscriptions.get(subscription);
        if (reverseSubscriptions) {
            this.reverseSubscriptions.set(subscription, reverseSubscriptions.filter(s => s !== userId));
            if (this.reverseSubscriptions.get(subscription)?.length === 0) {
                this.reverseSubscriptions.delete(subscription);
                this.redisClient.unsubscribe(subscription);
            }
        }
    }

    public userLeft(userId: string) {
        console.log("user left " + userId);
        this.subscriptions.get(userId)?.forEach(s => this.unsubscribe(userId, s));
    }

    getSubscriptions(userId: string) {
        return this.subscriptions.get(userId) || [];
    }
}
