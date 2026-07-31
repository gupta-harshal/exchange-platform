import { formatPrice, formatQty } from "../utils/format";
import type { Depth } from "../types";

type Props = {
  depth: Depth;
  onPriceClick?: (price: string) => void;
};

export function OrderBook({ depth, onPriceClick }: Props) {
  const asks = [...depth.asks].slice(0, 12).reverse();
  const bids = depth.bids.slice(0, 12);

  const maxAsk = Math.max(...asks.map(([, q]) => Number(q)), 1);
  const maxBid = Math.max(...bids.map(([, q]) => Number(q)), 1);

  const bestAsk = depth.asks[0] ? Number(depth.asks[0][0]) : 0;
  const bestBid = depth.bids[0] ? Number(depth.bids[0][0]) : 0;
  const mid = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : bestAsk || bestBid;

  return (
    <section className="panel orderbook">
      <header className="panel-header">
        <h2>Order Book</h2>
        <span className="muted">TATA / INR</span>
      </header>

      <div className="ob-cols">
        <span>Price (INR)</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      <div className="ob-asks">
        {asks.map(([price, qty]) => {
          const total = Number(price) * Number(qty);
          const width = (Number(qty) / maxAsk) * 100;
          return (
            <button
              key={`a-${price}`}
              type="button"
              className="ob-row ask"
              style={{ ["--depth" as string]: `${width}%` }}
              onClick={() => onPriceClick?.(price)}
            >
              <span>{formatPrice(price, 1)}</span>
              <span>{formatQty(qty, 2)}</span>
              <span>{formatPrice(total, 1)}</span>
            </button>
          );
        })}
      </div>

      <div className="ob-mid">
        <strong>{formatPrice(mid, 2)}</strong>
        <span className="muted">Mid</span>
      </div>

      <div className="ob-bids">
        {bids.map(([price, qty]) => {
          const total = Number(price) * Number(qty);
          const width = (Number(qty) / maxBid) * 100;
          return (
            <button
              key={`b-${price}`}
              type="button"
              className="ob-row bid"
              style={{ ["--depth" as string]: `${width}%` }}
              onClick={() => onPriceClick?.(price)}
            >
              <span>{formatPrice(price, 1)}</span>
              <span>{formatQty(qty, 2)}</span>
              <span>{formatPrice(total, 1)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
