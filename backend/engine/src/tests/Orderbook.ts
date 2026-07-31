import { BASE_CURRENCY } from "./Engine";

export interface Order {
    price: number;
    quantity: number;
    orderId: string;
    filled: number;
    side: "buy" | "sell";
    userId: string;
}

export interface Fill {
    price: string;
    qty: number;
    tradeId: number;
    otherUserId: string;
    markerOrderId: string;
}

export class Orderbook {
    bids: Order[];
    asks: Order[];
    baseAsset: string;
    quoteAsset: string = BASE_CURRENCY;
    lastTradeId: number;
    currentPrice: number;
    private bidDepth: Map<number, number> = new Map();
    private askDepth: Map<number, number> = new Map();

    constructor(baseAsset: string, bids: Order[], asks: Order[], lastTradeId: number, currentPrice: number) {
        this.bids = bids;
        this.asks = asks;
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId || 0;
        this.currentPrice = currentPrice || 0;
        this.rebuildDepth();
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    getSnapshot() {
        return {
            baseAsset: this.baseAsset,
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        }
    }

    private remaining(order: Order) {
        return order.quantity - order.filled;
    }

    private adjustDepth(side: "buy" | "sell", price: number, delta: number) {
        const book = side === "buy" ? this.bidDepth : this.askDepth;
        const next = (book.get(price) || 0) + delta;
        if (next <= 1e-12) {
            book.delete(price);
        } else {
            book.set(price, next);
        }
    }

    private rebuildDepth() {
        this.bidDepth.clear();
        this.askDepth.clear();
        for (const order of this.bids) {
            this.adjustDepth("buy", order.price, this.remaining(order));
        }
        for (const order of this.asks) {
            this.adjustDepth("sell", order.price, this.remaining(order));
        }
    }

    addOrder(order: Order): {
        executedQty: number,
        fills: Fill[]
    } {
        if (order.side === "buy") {
            const { executedQty, fills } = this.matchBid(order);
            order.filled = executedQty;
            if (executedQty === order.quantity) {
                return { executedQty, fills };
            }
            this.bids.push(order);
            this.adjustDepth("buy", order.price, this.remaining(order));
            this.bids.sort((a, b) => b.price - a.price);
            return { executedQty, fills };
        } else {
            const { executedQty, fills } = this.matchAsk(order);
            order.filled = executedQty;
            if (executedQty === order.quantity) {
                return { executedQty, fills };
            }
            this.asks.push(order);
            this.adjustDepth("sell", order.price, this.remaining(order));
            this.asks.sort((a, b) => a.price - b.price);
            return { executedQty, fills };
        }
    }

    matchBid(order: Order): { fills: Fill[], executedQty: number } {
        const fills: Fill[] = [];
        let executedQty = 0;

        this.asks.sort((a, b) => a.price - b.price);

        for (let i = 0; i < this.asks.length && executedQty < order.quantity; i++) {
            const ask = this.asks[i]!;
            if (ask.userId === order.userId) {
                continue;
            }
            if (ask.price > order.price) {
                break;
            }

            const askRemaining = this.remaining(ask);
            if (askRemaining <= 0) {
                continue;
            }

            const filledQty = Math.min(order.quantity - executedQty, askRemaining);
            executedQty += filledQty;
            ask.filled += filledQty;
            this.adjustDepth("sell", ask.price, -filledQty);
            this.currentPrice = ask.price;

            fills.push({
                price: ask.price.toString(),
                qty: filledQty,
                tradeId: ++this.lastTradeId,
                otherUserId: ask.userId,
                markerOrderId: ask.orderId
            });
        }

        this.asks = this.asks.filter(a => this.remaining(a) > 0);
        return { fills, executedQty };
    }

    matchAsk(order: Order): { fills: Fill[], executedQty: number } {
        const fills: Fill[] = [];
        let executedQty = 0;

        this.bids.sort((a, b) => b.price - a.price);

        for (let i = 0; i < this.bids.length && executedQty < order.quantity; i++) {
            const bid = this.bids[i]!;
            if (bid.userId === order.userId) {
                continue;
            }
            if (bid.price < order.price) {
                break;
            }

            const bidRemaining = this.remaining(bid);
            if (bidRemaining <= 0) {
                continue;
            }

            const filledQty = Math.min(order.quantity - executedQty, bidRemaining);
            executedQty += filledQty;
            bid.filled += filledQty;
            this.adjustDepth("buy", bid.price, -filledQty);
            this.currentPrice = bid.price;

            fills.push({
                price: bid.price.toString(),
                qty: filledQty,
                tradeId: ++this.lastTradeId,
                otherUserId: bid.userId,
                markerOrderId: bid.orderId
            });
        }

        this.bids = this.bids.filter(b => this.remaining(b) > 0);
        return { fills, executedQty };
    }

    getDepth() {
        const bids: [string, string][] = Array.from(this.bidDepth.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([price, qty]) => [price.toString(), qty.toString()]);

        const asks: [string, string][] = Array.from(this.askDepth.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([price, qty]) => [price.toString(), qty.toString()]);

        return { bids, asks };
    }

    getOpenOrders(userId: string): Order[] {
        const asks = this.asks.filter(x => x.userId === userId);
        const bids = this.bids.filter(x => x.userId === userId);
        return [...asks, ...bids];
    }

    cancelBid(order: Order) {
        const index = this.bids.findIndex(x => x.orderId === order.orderId);
        if (index !== -1) {
            const existing = this.bids[index]!;
            const price = existing.price;
            this.adjustDepth("buy", price, -this.remaining(existing));
            this.bids.splice(index, 1);
            return price;
        }
    }

    cancelAsk(order: Order) {
        const index = this.asks.findIndex(x => x.orderId === order.orderId);
        if (index !== -1) {
            const existing = this.asks[index]!;
            const price = existing.price;
            this.adjustDepth("sell", price, -this.remaining(existing));
            this.asks.splice(index, 1);
            return price;
        }
    }
}
