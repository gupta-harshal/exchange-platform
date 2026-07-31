import { createClient, } from "redis";
import { Engine } from "./trade/Engine.js";


async function main() {
    const engine = new Engine(); 
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    const options = url.startsWith("rediss://")
        ? { url, socket: { tls: true, rejectUnauthorized: false } }
        : { url };
    const redisClient = createClient(options);
    await redisClient.connect();
    console.log("connected to redis");

    while (true) {
        const response = await redisClient.rPop("messages" as string)
        if (!response) {
            await new Promise(resolve => setTimeout(resolve, 10));
        } else {
            engine.process(JSON.parse(response));
        }
    }

}

main();