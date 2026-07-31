import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { CREATE_ORDER, CANCEL_ORDER, GET_OPEN_ORDERS, ON_RAMP, GET_BALANCE, MessageFromOrderbook } from "../types";

export const orderRouter = Router();

orderRouter.post("/", async (req, res) => {
    const { market, price, quantity, side, userId } = req.body;
    console.log({ market, price, quantity, side, userId });
    const response = await RedisManager.getInstance().sendAndAwait({
        type: CREATE_ORDER,
        data: {
            market,
            price,
            quantity,
            side,
            userId
        }
    });

    if (response.type !== "ORDER_PLACED") {
        res.status(400).json(response.payload);
        return;
    }

    const orderPlaced: Extract<MessageFromOrderbook, { type: "ORDER_PLACED" }> = response;
    res.json(orderPlaced.payload);
});

orderRouter.delete("/", async (req, res) => {
    const { orderId, market } = req.body;
    const response = await RedisManager.getInstance().sendAndAwait({
        type: CANCEL_ORDER,
        data: {
            orderId,
            market
        }
    });

    if (response.type !== "ORDER_CANCELLED") {
        res.status(400).json({ message: "Unexpected response" });
        return;
    }

    res.json(response.payload);
});

orderRouter.get("/open", async (req, res) => {
    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_OPEN_ORDERS,
        data: {
            userId: req.query.userId as string,
            market: req.query.market as string
        }
    });

    if (response.type !== "OPEN_ORDERS") {
        res.status(400).json({ message: "Unexpected response" });
        return;
    }

    res.json(response.payload);
});

orderRouter.post("/onramp", async (req, res) => {
    const { userId, amount, txnId } = req.body;
    const response = await RedisManager.getInstance().sendAndAwait({
        type: ON_RAMP,
        data: {
            userId,
            amount: String(amount),
            txnId: txnId || `txn_${Date.now()}`
        }
    });

    if (response.type !== "ON_RAMP") {
        res.status(400).json({ message: "Unexpected response" });
        return;
    }

    res.json(response.payload);
});

orderRouter.get("/balances", async (req, res) => {
    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_BALANCE,
        data: {
            userId: req.query.userId as string
        }
    });

    if (response.type !== "BALANCE") {
        res.status(400).json({ message: "Unexpected response" });
        return;
    }

    res.json(response.payload);
});
