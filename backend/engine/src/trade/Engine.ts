import fs from "fs";
import { RedisManager } from "../redisManager.js";
import { ORDER_UPDATE, TRADE_ADDED } from "../types/index.js";
import {
    CANCEL_ORDER,
    CREATE_ORDER,
    GET_BALANCE,
    GET_DEPTH,
    GET_OPEN_ORDERS,
    GET_TICKERS,
    GET_TRADES,
    MessageFromApi,
    ON_RAMP
} from "../types/fromApi.js";
import { Fill, Order, Orderbook } from "./OrderBook.js";

export const BASE_CURRENCY = "INR";

interface UserBalance {
    [key: string]: {
        available: number;
        locked: number;
    }
}

interface TradeRecord {
    id: number;
    isBuyerMaker: boolean;
    price: string;
    quantity: string;
    quoteQuantity: string;
    timestamp: number;
    market: string;
}

interface MarketTicker {
    symbol: string;
    firstPrice: number;
    lastPrice: number;
    high: number;
    low: number;
    volume: number;
    quoteVolume: number;
}

export class Engine {
    private orderbooks: Orderbook[] = [];
    private balances: Map<string, UserBalance> = new Map();
    private recentTrades: Map<string, TradeRecord[]> = new Map();
    private tickers: Map<string, MarketTicker> = new Map();

    constructor() {
        let snapshot = null
        try {
            if (process.env.WITH_SNAPSHOT) {
                snapshot = fs.readFileSync("./snapshot.json");
            }
        } catch (e) {
            console.log("No snapshot found");
        }

        if (snapshot) {
            const snapshotSnapshot = JSON.parse(snapshot.toString());
            this.orderbooks = snapshotSnapshot.orderbooks.map((o: any) => new Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Map(snapshotSnapshot.balances);
            if (snapshotSnapshot.recentTrades) {
                this.recentTrades = new Map(snapshotSnapshot.recentTrades);
            }
            if (snapshotSnapshot.tickers) {
                this.tickers = new Map(snapshotSnapshot.tickers);
            }
        } else {
            this.orderbooks = [new Orderbook(`TATA`, [], [], 0, 0)];
            this.setBaseBalances();
            this.tickers.set("TATA_INR", {
                symbol: "TATA_INR",
                firstPrice: 0,
                lastPrice: 0,
                high: 0,
                low: 0,
                volume: 0,
                quoteVolume: 0
            });
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3);
    }

    saveSnapshot() {
        try {
            const snapshotSnapshot = {
                orderbooks: this.orderbooks.map(o => o.getSnapshot()),
                balances: Array.from(this.balances.entries()),
                recentTrades: Array.from(this.recentTrades.entries()),
                tickers: Array.from(this.tickers.entries())
            }
            fs.writeFileSync("./snapshot.json", JSON.stringify(snapshotSnapshot));
        } catch (e) {
            console.log("Failed to save snapshot", e);
        }
    }

    process({ message, clientId }: { message: MessageFromApi, clientId: string }) {
        switch (message.type) {
            case CREATE_ORDER:
                try {
                    const { executedQty, fills, orderId } = this.createOrder(message.data.market, message.data.price, message.data.quantity, message.data.side, message.data.userId);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills
                        }
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
                }
                break;
            case CANCEL_ORDER:
                try {
                    const orderId = message.data.orderId;
                    const cancelMarket = message.data.market;
                    const cancelOrderbook = this.orderbooks.find(o => o.ticker() === cancelMarket);
                    const quoteAsset = cancelMarket.split("_")[1]!;
                    if (!cancelOrderbook) {
                        throw new Error("No orderbook found");
                    }

                    const order = cancelOrderbook.asks.find(o => o.orderId === orderId) || cancelOrderbook.bids.find(o => o.orderId === orderId);
                    if (!order) {
                        console.log("No order found");
                        throw new Error("No order found");
                    }

                    if (order.side === "buy") {
                        const price = cancelOrderbook.cancelBid(order)
                        const leftQuantity = (order.quantity - order.filled) * order.price;
                        this.balances.get(order.userId)![BASE_CURRENCY].available += leftQuantity;
                        this.balances.get(order.userId)![BASE_CURRENCY].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    } else {
                        const price = cancelOrderbook.cancelAsk(order)
                        const leftQuantity = order.quantity - order.filled;
                        this.balances.get(order.userId)![quoteAsset].available += leftQuantity;
                        this.balances.get(order.userId)![quoteAsset].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    }

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            executedQty: order.filled,
                            remainingQty: order.quantity - order.filled
                        }
                    });

                } catch (e) {
                    console.log("Error while cancelling order");
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
                }
                break;
            case GET_OPEN_ORDERS:
                try {
                    const openOrderbook = this.orderbooks.find(o => o.ticker() === message.data.market);
                    if (!openOrderbook) {
                        throw new Error("No orderbook found");
                    }
                    const openOrders = openOrderbook.getOpenOrders(message.data.userId);

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrders
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: []
                    });
                }
                break;
            case ON_RAMP:
                const userId = message.data.userId;
                const amount = Number(message.data.amount);
                this.onRamp(userId, amount);
                RedisManager.getInstance().sendToApi(clientId, {
                    type: "ON_RAMP",
                    payload: {
                        userId,
                        amount
                    }
                });
                break;
            case GET_DEPTH:
                try {
                    const market = message.data.market;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    if (!orderbook) {
                        throw new Error("No orderbook found");
                    }
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: orderbook.getDepth()
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: [],
                            asks: []
                        }
                    });
                }
                break;
            case GET_BALANCE:
                RedisManager.getInstance().sendToApi(clientId, {
                    type: "BALANCE",
                    payload: this.balances.get(message.data.userId) || {}
                });
                break;
            case GET_TRADES: {
                const trades = this.recentTrades.get(message.data.market) || [];
                const limit = message.data.limit || 50;
                RedisManager.getInstance().sendToApi(clientId, {
                    type: "TRADES",
                    payload: trades.slice(0, limit)
                });
                break;
            }
            case GET_TICKERS:
                RedisManager.getInstance().sendToApi(clientId, {
                    type: "TICKERS",
                    payload: Array.from(this.tickers.values()).map(t => ({
                        symbol: t.symbol,
                        firstPrice: t.firstPrice.toString(),
                        lastPrice: t.lastPrice.toString(),
                        high: t.high.toString(),
                        low: t.low.toString(),
                        volume: t.volume.toString(),
                        quoteVolume: t.quoteVolume.toString(),
                        priceChange: (t.lastPrice - t.firstPrice).toString(),
                        priceChangePercent: t.firstPrice === 0
                            ? "0"
                            : (((t.lastPrice - t.firstPrice) / t.firstPrice) * 100).toFixed(2)
                    }))
                });
                break;
        }
    }

    addOrderbook(orderbook: Orderbook) {
        this.orderbooks.push(orderbook);
    }

    createOrder(market: string, price: string, quantity: string, side: "buy" | "sell", userId: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market)
        const baseAsset = market.split("_")[0]!;
        const quoteAsset = market.split("_")[1]!;

        if (!orderbook) {
            throw new Error("No orderbook found");
        }

        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity);

        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled: 0,
            side,
            userId
        }

        const { fills, executedQty } = orderbook.addOrder(order);
        this.updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty);
        this.createDbTrades(fills, market, side);
        this.updateDbOrders(order, executedQty, fills, market);
        this.publisWsDepthUpdates(fills, price, side, market);
        this.publishWsTrades(fills, side, market);
        this.updateTicker(market, fills);
        return { executedQty, fills, orderId: order.orderId };
    }

    updateDbOrders(order: Order, executedQty: number, fills: Fill[], market: string) {
        RedisManager.getInstance().pushMessage({
            type: ORDER_UPDATE,
            data: {
                orderId: order.orderId,
                executedQty: executedQty,
                market: market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side,
            }
        });

        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: ORDER_UPDATE,
                data: {
                    orderId: fill.markerOrderId,
                    executedQty: fill.qty
                }
            });
        });
    }

    createDbTrades(fills: Fill[], market: string, side: "buy" | "sell") {
        fills.forEach(fill => {
            const isBuyerMaker = side === "sell";
            const trade: TradeRecord = {
                market,
                id: fill.tradeId,
                isBuyerMaker,
                price: fill.price,
                quantity: fill.qty.toString(),
                quoteQuantity: (fill.qty * Number(fill.price)).toString(),
                timestamp: Date.now()
            };

            const existing = this.recentTrades.get(market) || [];
            existing.unshift(trade);
            this.recentTrades.set(market, existing.slice(0, 200));

            RedisManager.getInstance().pushMessage({
                type: TRADE_ADDED,
                data: {
                    market: trade.market,
                    id: trade.id.toString(),
                    isBuyerMaker: trade.isBuyerMaker,
                    price: trade.price,
                    quantity: trade.quantity,
                    quoteQuantity: trade.quoteQuantity,
                    timestamp: trade.timestamp
                }
            });
        });
    }

    publishWsTrades(fills: Fill[], side: "buy" | "sell", market: string) {
        fills.forEach(fill => {
            RedisManager.getInstance().publishMessage(`trade@${market}`, {
                stream: `trade@${market}`,
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: side === "sell",
                    p: fill.price,
                    q: fill.qty.toString(),
                    s: market,
                }
            });
        });
    }

    updateTicker(market: string, fills: Fill[]) {
        if (!fills.length) {
            return;
        }

        let ticker = this.tickers.get(market);
        if (!ticker) {
            ticker = {
                symbol: market,
                firstPrice: 0,
                lastPrice: 0,
                high: 0,
                low: 0,
                volume: 0,
                quoteVolume: 0
            };
            this.tickers.set(market, ticker);
        }

        for (const fill of fills) {
            const price = Number(fill.price);
            const qty = fill.qty;
            if (ticker.firstPrice === 0) {
                ticker.firstPrice = price;
                ticker.low = price;
                ticker.high = price;
            }
            ticker.lastPrice = price;
            ticker.high = Math.max(ticker.high, price);
            ticker.low = ticker.low === 0 ? price : Math.min(ticker.low, price);
            ticker.volume += qty;
            ticker.quoteVolume += qty * price;
        }

        RedisManager.getInstance().publishMessage(`ticker@${market}`, {
            stream: `ticker@${market}`,
            data: {
                e: "ticker",
                s: market,
                c: ticker.lastPrice.toString(),
                h: ticker.high.toString(),
                l: ticker.low.toString(),
                v: ticker.volume.toString(),
                V: ticker.quoteVolume.toString(),
                id: Date.now()
            }
        });
    }

    sendUpdatedDepthAt(price: string, market: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        const updatedBids = depth?.bids.filter(x => x[0] === price);
        const updatedAsks = depth?.asks.filter(x => x[0] === price);

        RedisManager.getInstance().publishMessage(`depth@${market}`, {
            stream: `depth@${market}`,
            data: {
                a: updatedAsks.length ? updatedAsks : [[price, "0"]],
                b: updatedBids.length ? updatedBids : [[price, "0"]],
                e: "depth"
            }
        });
    }

    publisWsDepthUpdates(fills: Fill[], price: string, side: "buy" | "sell", market: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        if (side === "buy") {
            const updatedAsks = depth?.asks.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedBid = depth?.bids.find(x => x[0] === price);
            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: updatedAsks,
                    b: updatedBid ? [updatedBid] : [[price, "0"]],
                    e: "depth"
                }
            });
        }
        if (side === "sell") {
            const updatedBids = depth?.bids.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedAsk = depth?.asks.find(x => x[0] === price);
            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: updatedAsk ? [updatedAsk] : [[price, "0"]],
                    b: updatedBids,
                    e: "depth"
                }
            });
        }
    }

    updateBalance(userId: string, baseAsset: string, quoteAsset: string, side: "buy" | "sell", fills: Fill[], executedQty: number) {
        if (side === "buy") {
            fills.forEach(fill => {
                this.balances.get(fill.otherUserId)![quoteAsset].available = this.balances.get(fill.otherUserId)![quoteAsset].available + (fill.qty * Number(fill.price));
                this.balances.get(userId)![quoteAsset].locked = this.balances.get(userId)![quoteAsset].locked - (fill.qty * Number(fill.price));
                this.balances.get(fill.otherUserId)![baseAsset].locked = this.balances.get(fill.otherUserId)![baseAsset].locked - fill.qty;
                this.balances.get(userId)![baseAsset].available = this.balances.get(userId)![baseAsset].available + fill.qty;
            });
        } else {
            fills.forEach(fill => {
                this.balances.get(fill.otherUserId)![quoteAsset].locked = this.balances.get(fill.otherUserId)![quoteAsset].locked - (fill.qty * Number(fill.price));
                this.balances.get(userId)![quoteAsset].available = this.balances.get(userId)![quoteAsset].available + (fill.qty * Number(fill.price));
                this.balances.get(fill.otherUserId)![baseAsset].available = this.balances.get(fill.otherUserId)![baseAsset].available + fill.qty;
                this.balances.get(userId)![baseAsset].locked = this.balances.get(userId)![baseAsset].locked - (fill.qty);
            });
        }
    }

    checkAndLockFunds(baseAsset: string, quoteAsset: string, side: "buy" | "sell", userId: string, asset: string, price: string, quantity: string) {
        if (side === "buy") {
            if ((this.balances.get(userId)?.[quoteAsset]?.available || 0) < Number(quantity) * Number(price)) {
                throw new Error("Insufficient funds");
            }
            this.balances.get(userId)![quoteAsset].available = this.balances.get(userId)![quoteAsset].available - (Number(quantity) * Number(price));
            this.balances.get(userId)![quoteAsset].locked = this.balances.get(userId)![quoteAsset].locked + (Number(quantity) * Number(price));
        } else {
            if ((this.balances.get(userId)?.[baseAsset]?.available || 0) < Number(quantity)) {
                throw new Error("Insufficient funds");
            }
            this.balances.get(userId)![baseAsset].available = this.balances.get(userId)![baseAsset].available - (Number(quantity));
            this.balances.get(userId)![baseAsset].locked = this.balances.get(userId)![baseAsset].locked + Number(quantity);
        }
    }

    onRamp(userId: string, amount: number) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            this.balances.set(userId, {
                [BASE_CURRENCY]: {
                    available: amount,
                    locked: 0
                }
            });
        } else {
            if (!userBalance[BASE_CURRENCY]) {
                userBalance[BASE_CURRENCY] = { available: 0, locked: 0 };
            }
            userBalance[BASE_CURRENCY].available += amount;
        }
    }

    setBaseBalances() {
        this.balances.set("1", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });

        this.balances.set("2", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });

        this.balances.set("5", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });
    }
}
