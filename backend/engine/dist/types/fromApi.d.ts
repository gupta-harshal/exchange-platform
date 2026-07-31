export declare const CREATE_ORDER = "CREATE_ORDER";
export declare const CANCEL_ORDER = "CANCEL_ORDER";
export declare const ON_RAMP = "ON_RAMP";
export declare const GET_DEPTH = "GET_DEPTH";
export declare const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export declare const GET_BALANCE = "GET_BALANCE";
export declare const GET_TRADES = "GET_TRADES";
export declare const GET_TICKERS = "GET_TICKERS";
export type MessageFromApi = {
    type: typeof CREATE_ORDER;
    data: {
        market: string;
        price: string;
        quantity: string;
        side: "buy" | "sell";
        userId: string;
    };
} | {
    type: typeof CANCEL_ORDER;
    data: {
        orderId: string;
        market: string;
    };
} | {
    type: typeof ON_RAMP;
    data: {
        amount: string;
        userId: string;
        txnId: string;
    };
} | {
    type: typeof GET_DEPTH;
    data: {
        market: string;
    };
} | {
    type: typeof GET_OPEN_ORDERS;
    data: {
        userId: string;
        market: string;
    };
} | {
    type: typeof GET_BALANCE;
    data: {
        userId: string;
    };
} | {
    type: typeof GET_TRADES;
    data: {
        market: string;
        limit?: number;
    };
} | {
    type: typeof GET_TICKERS;
    data: Record<string, never>;
};
