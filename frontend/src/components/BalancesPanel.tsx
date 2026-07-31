import { useState } from "react";
import { api } from "../api/client";
import { formatQty } from "../utils/format";
import type { Balances } from "../types";

type Props = {
  balances: Balances;
  userId: string;
  onChanged: () => void;
};

export function BalancesPanel({ balances, userId, onChanged }: Props) {
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);
  const entries = Object.entries(balances);

  const ramp = async () => {
    setBusy(true);
    try {
      await api.onRamp(userId, Number(amount));
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel balances">
      <header className="panel-header">
        <h2>Balances</h2>
        <span className="muted">User {userId}</span>
      </header>

      {entries.length === 0 ? (
        <p className="empty">No balances yet</p>
      ) : (
        <div className="bal-list">
          {entries.map(([asset, bal]) => (
            <div key={asset} className="bal-row">
              <strong>{asset}</strong>
              <div>
                <span>Avail {formatQty(bal.available, 2)}</span>
                <span className="muted">Locked {formatQty(bal.locked, 2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="onramp">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label="On-ramp amount"
        />
        <button type="button" onClick={ramp} disabled={busy}>
          {busy ? "…" : "On-ramp INR"}
        </button>
      </div>
    </section>
  );
}
