import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { GET_TICKERS } from "../types";

export const tickersRouter = Router();

tickersRouter.get("/", async (_req, res) => {
    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_TICKERS,
        data: {}
    });

    if (response.type !== "TICKERS") {
        res.status(400).json({ message: "Unexpected response" });
        return;
    }

    res.json(response.payload);
});
