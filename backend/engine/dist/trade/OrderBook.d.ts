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
export declare class Orderbook {
    bids: Order[];
    asks: Order[];
    baseAsset: string;
    quoteAsset: string;
    lastTradeId: number;
    currentPrice: number;
    private bidDepth;
    private askDepth;
    constructor(baseAsset: string, bids: Order[], asks: Order[], lastTradeId: number, currentPrice: number);
    ticker(): string;
    getSnapshot(): {
        baseAsset: string;
        bids: Order[];
        asks: Order[];
        lastTradeId: number;
        currentPrice: number;
    };
    private remaining;
    private adjustDepth;
    private rebuildDepth;
    addOrder(order: Order): {
        executedQty: number;
        fills: Fill[];
    };
    matchBid(order: Order): {
        fills: Fill[];
        executedQty: number;
    };
    matchAsk(order: Order): {
        fills: Fill[];
        executedQty: number;
    };
    getDepth(): {
        bids: [string, string][];
        asks: [string, string][];
    };
    getOpenOrders(userId: string): Order[];
    cancelBid(order: Order): number | undefined;
    cancelAsk(order: Order): number | undefined;
}
