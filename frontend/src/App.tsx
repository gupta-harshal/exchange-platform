import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import { BalancesPanel } from "./components/BalancesPanel";
import { MarketHeader } from "./components/MarketHeader";
import { OpenOrders } from "./components/OpenOrders";
import { OrderBook } from "./components/OrderBook";
import { PriceChart } from "./components/PriceChart";
import { RecentTrades } from "./components/RecentTrades";
import { TradeTicket } from "./components/TradeTicket";
import { DEFAULT_MARKET, DEFAULT_USER_ID } from "./config";
import { useMarketSocket } from "./hooks/useMarketSocket";
import type { Balances, Depth, OpenOrder, Ticker, Trade, WsMessage } from "./types";
import { applyDepthDelta } from "./utils/format";
import "./App.css";

function App() {
  const market = DEFAULT_MARKET;
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [depth, setDepth] = useState<Depth>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [balances, setBalances] = useState<Balances>({});
  const [priceHint, setPriceHint] = useState("1000");

  const refreshStatic = useCallback(async () => {
    try {
      const [d, t, tickers, o, b] = await Promise.all([
        api.getDepth(market),
        api.getTrades(market),
        api.getTickers(),
        api.getOpenOrders(userId, market),
        api.getBalances(userId),
      ]);
      setDepth({
        bids: d.bids ?? [],
        asks: d.asks ?? [],
      });
      setTrades(t ?? []);
      setOrders(o ?? []);
      setBalances(b ?? {});
      const current = (tickers ?? []).find((x) => x.symbol === market) ?? null;
      setTicker(current);
      if (current?.lastPrice && Number(current.lastPrice) > 0) {
        setPriceHint(Number(current.lastPrice).toFixed(1));
      } else if (d.asks?.[0]?.[0]) {
        setPriceHint(d.asks[0][0]);
      } else if (d.bids?.[0]?.[0]) {
        setPriceHint(d.bids[0][0]);
      }
    } catch (err) {
      console.error("Failed to load market data", err);
    }
  }, [market, userId]);

  useEffect(() => {
    refreshStatic();
    const id = window.setInterval(refreshStatic, 8000);
    return () => window.clearInterval(id);
  }, [refreshStatic]);

  const onSocketMessage = useCallback((message: WsMessage) => {
    if (message.type === "depth") {
      setDepth((prev) => ({
        bids: applyDepthDelta(prev.bids, message.data.b, "bid"),
        asks: applyDepthDelta(prev.asks, message.data.a, "ask"),
      }));
    }

    if (message.type === "trade") {
      const trade: Trade = {
        id: message.data.t,
        isBuyerMaker: message.data.m,
        price: message.data.p,
        quantity: message.data.q,
        quoteQuantity: (Number(message.data.p) * Number(message.data.q)).toString(),
        timestamp: Date.now(),
        market: message.data.s,
      };
      setTrades((prev) => [trade, ...prev].slice(0, 80));
      setPriceHint(Number(message.data.p).toFixed(1));
      setTicker((prev) =>
        prev
          ? {
              ...prev,
              lastPrice: message.data.p,
              high: Math.max(Number(prev.high), Number(message.data.p)).toString(),
              low:
                Number(prev.low) === 0
                  ? message.data.p
                  : Math.min(Number(prev.low), Number(message.data.p)).toString(),
            }
          : {
              symbol: market,
              firstPrice: message.data.p,
              lastPrice: message.data.p,
              high: message.data.p,
              low: message.data.p,
              volume: message.data.q,
              quoteVolume: (Number(message.data.p) * Number(message.data.q)).toString(),
              priceChange: "0",
              priceChangePercent: "0",
            }
      );
    }

    if (message.type === "ticker") {
      setTicker((prev) => ({
        symbol: message.data.s ?? market,
        firstPrice: prev?.firstPrice ?? message.data.c ?? "0",
        lastPrice: message.data.c ?? prev?.lastPrice ?? "0",
        high: message.data.h ?? prev?.high ?? "0",
        low: message.data.l ?? prev?.low ?? "0",
        volume: message.data.v ?? prev?.volume ?? "0",
        quoteVolume: message.data.V ?? prev?.quoteVolume ?? "0",
        priceChange: prev?.priceChange ?? "0",
        priceChangePercent: prev?.priceChangePercent ?? "0",
      }));
      if (message.data.c) {
        setPriceHint(Number(message.data.c).toFixed(1));
      }
    }
  }, [market]);

  const { connected } = useMarketSocket(market, onSocketMessage);

  return (
    <div className="app-shell">
      <MarketHeader market={market} ticker={ticker} connected={connected} />

      <div className="toolbar">
        <label className="user-select">
          Trading as
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="1">User 1</option>
            <option value="2">User 2</option>
            <option value="5">Market Maker (5)</option>
          </select>
        </label>
        <button type="button" className="ghost" onClick={refreshStatic}>
          Refresh
        </button>
      </div>

      <main className="trading-grid">
        <OrderBook depth={depth} onPriceClick={setPriceHint} />
        <PriceChart market={market} trades={trades} lastPrice={ticker?.lastPrice} />
        <div className="right-col">
          <TradeTicket
            market={market}
            userId={userId}
            priceHint={priceHint}
            balances={balances}
            onPlaced={refreshStatic}
          />
          <RecentTrades trades={trades} />
        </div>
        <OpenOrders orders={orders} market={market} onChanged={refreshStatic} />
        <BalancesPanel balances={balances} userId={userId} onChanged={refreshStatic} />
      </main>
    </div>
  );
}

export default App;
