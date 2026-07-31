export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export const GET_DEPTH = "GET_DEPTH";
export const GET_BALANCE = "GET_BALANCE";
export const GET_TRADES = "GET_TRADES";
export const GET_TICKERS = "GET_TICKERS";

export type MessageFromOrderbook = {
    type: "DEPTH",
    payload: {
        bids: [string, string][],
        asks: [string, string][],
    }
} | {
    type: "ORDER_PLACED",
    payload: {
        orderId: string,
        executedQty: number,
        fills: {
            price: string,
            qty: number,
            tradeId: number
        }[]
    }
} | {
    type: "ORDER_CANCELLED",
    payload: {
        orderId: string,
        executedQty: number,
        remainingQty: number
    }
} | {
    type: "OPEN_ORDERS",
    payload: {
        orderId: string,
        executedQty: number,
        price: number,
        quantity: number,
        side: "buy" | "sell",
        userId: string,
        filled: number
    }[]
} | {
    type: "BALANCE",
    payload: {
        [asset: string]: {
            available: number,
            locked: number
        }
    }
} | {
    type: "ON_RAMP",
    payload: {
        userId: string,
        amount: number
    }
} | {
    type: "TRADES",
    payload: {
        id: number,
        isBuyerMaker: boolean,
        price: string,
        quantity: string,
        quoteQuantity: string,
        timestamp: number,
        market: string
    }[]
} | {
    type: "TICKERS",
    payload: {
        symbol: string,
        firstPrice: string,
        lastPrice: string,
        high: string,
        low: string,
        volume: string,
        quoteVolume: string,
        priceChange: string,
        priceChangePercent: string
    }[]
}
