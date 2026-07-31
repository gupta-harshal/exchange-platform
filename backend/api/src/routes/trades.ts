import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { GET_TRADES } from "../types";

export const tradesRouter = Router();

tradesRouter.get("/", async (req, res) => {
    const market = (req.query.market || req.query.symbol) as string;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_TRADES,
        data: {
            market,
            limit
        }
    });

    if (response.type !== "TRADES") {
        res.status(400).json({ message: "Unexpected response" });
        return;
    }

    res.json(response.payload);
});
