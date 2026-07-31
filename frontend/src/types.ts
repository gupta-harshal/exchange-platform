export type Side = "buy" | "sell";

export type DepthLevel = [string, string];

export type Depth = {
  bids: DepthLevel[];
  asks: DepthLevel[];
};

export type Trade = {
  id: number;
  isBuyerMaker: boolean;
  price: string;
  quantity: string;
  quoteQuantity: string;
  timestamp: number;
  market: string;
};

export type Ticker = {
  symbol: string;
  firstPrice: string;
  lastPrice: string;
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
  priceChange: string;
  priceChangePercent: string;
};

export type OpenOrder = {
  orderId: string;
  price: number;
  quantity: number;
  filled: number;
  side: Side;
  userId: string;
};

export type Balances = {
  [asset: string]: {
    available: number;
    locked: number;
  };
};

export type OrderPlaced = {
  orderId: string;
  executedQty: number;
  fills: { price: string; qty: number; tradeId: number }[];
};

export type Kline = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  start: string;
  end: string;
};

export type WsDepthMessage = {
  type: "depth";
  data: {
    b?: DepthLevel[];
    a?: DepthLevel[];
    e: "depth";
  };
};

export type WsTradeMessage = {
  type: "trade";
  data: {
    e: "trade";
    t: number;
    m: boolean;
    p: string;
    q: string;
    s: string;
  };
};

export type WsTickerMessage = {
  type: "ticker";
  data: {
    e: "ticker";
    s?: string;
    c?: string;
    h?: string;
    l?: string;
    v?: string;
    V?: string;
    id: number;
  };
};

export type WsMessage = WsDepthMessage | WsTradeMessage | WsTickerMessage;
