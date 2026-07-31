import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Balances, Side } from "../types";

type Props = {
  market: string;
  userId: string;
  priceHint: string;
  balances: Balances;
  onPlaced: () => void;
};

export function TradeTicket({ market, userId, priceHint, balances, onPlaced }: Props) {
  const [side, setSide] = useState<Side>("buy");
  const [price, setPrice] = useState(priceHint || "1000");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (priceHint) setPrice(priceHint);
  }, [priceHint]);

  const base = market.split("_")[0] ?? "TATA";
  const quote = market.split("_")[1] ?? "INR";
  const availableQuote = balances[quote]?.available ?? 0;
  const availableBase = balances[base]?.available ?? 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.placeOrder({
        market,
        price,
        quantity,
        side,
        userId,
      });
      setMessage(
        result.executedQty > 0
          ? `Filled ${result.executedQty} · order ${result.orderId.slice(0, 8)}`
          : `Resting · order ${result.orderId.slice(0, 8)}`
      );
      onPlaced();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel trade-form">
      <header className="panel-header">
        <h2>Place Order</h2>
      </header>

      <div className="side-toggle">
        <button
          type="button"
          className={side === "buy" ? "active buy" : ""}
          onClick={() => setSide("buy")}
        >
          Buy
        </button>
        <button
          type="button"
          className={side === "sell" ? "active sell" : ""}
          onClick={() => setSide("sell")}
        >
          Sell
        </button>
      </div>

      <form onSubmit={submit}>
        <label>
          <span>Price ({quote})</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            required
          />
        </label>
        <label>
          <span>Quantity ({base})</span>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="decimal"
            required
          />
        </label>

        <div className="avail">
          <span>
            Available {quote}: {availableQuote.toLocaleString()}
          </span>
          <span>
            Available {base}: {availableBase.toLocaleString()}
          </span>
        </div>

        <button type="submit" className={`submit ${side}`} disabled={busy}>
          {busy ? "Submitting…" : `${side === "buy" ? "Buy" : "Sell"} ${base}`}
        </button>
      </form>

      {message && <p className="ok">{message}</p>}
      {error && <p className="err">{error}</p>}
    </section>
  );
}
