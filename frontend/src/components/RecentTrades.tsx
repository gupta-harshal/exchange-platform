import { formatPrice, formatQty, formatTime } from "../utils/format";
import type { Trade } from "../types";

type Props = {
  trades: Trade[];
};

export function RecentTrades({ trades }: Props) {
  return (
    <section className="panel trades">
      <header className="panel-header">
        <h2>Recent Trades</h2>
      </header>
      <div className="trade-cols">
        <span>Price</span>
        <span>Qty</span>
        <span>Time</span>
      </div>
      <div className="trade-list">
        {trades.length === 0 && <p className="empty">Waiting for fills…</p>}
        {trades.map((t) => (
          <div key={`${t.id}-${t.timestamp}`} className={`trade-row ${t.isBuyerMaker ? "sell" : "buy"}`}>
            <span>{formatPrice(t.price, 1)}</span>
            <span>{formatQty(t.quantity, 2)}</span>
            <span>{formatTime(t.timestamp)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
