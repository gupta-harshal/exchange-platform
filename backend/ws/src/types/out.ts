
export type TickerUpdateMessage = {
    type: "ticker",
    data: {
        c?: string,
        h?: string,
        l?: string,
        v?: string,
        V?: string,
        s?: string,
        id: number,
        e: "ticker"
    }
}

export type DepthUpdateMessage = {
    type: "depth",
    data: {
        b?: [string, string][],
        a?: [string, string][],
        id?: number,
        e: "depth"
    }
}

export type TradeUpdateMessage = {
    type: "trade",
    data: {
        e: "trade",
        t: number,
        m: boolean,
        p: string,
        q: string,
        s: string,
    }
}

export type OutgoingMessage = TickerUpdateMessage | DepthUpdateMessage | TradeUpdateMessage;
