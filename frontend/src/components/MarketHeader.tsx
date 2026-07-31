import { formatPrice } from "../utils/format";
import type { Ticker } from "../types";

type Props = {
  market: string;
  ticker: Ticker | null;
  connected: boolean;
};

export function MarketHeader({ market, ticker, connected }: Props) {
  const change = Number(ticker?.priceChangePercent ?? 0);
  const up = change >= 0;

  return (
    <header className="market-header">
      <div className="brand-block">
        <div className="logo-mark" aria-hidden />
        <div>
          <p className="brand">Nexus</p>
          <p className="market-name">{market.replace("_", " / ")}</p>
        </div>
      </div>

      <div className="ticker-stats">
        <div>
          <span className="label">Last</span>
          <strong className={up ? "up" : "down"}>
            {formatPrice(ticker?.lastPrice ?? 0, 2)}
          </strong>
        </div>
        <div>
          <span className="label">24h Change</span>
          <strong className={up ? "up" : "down"}>
            {up ? "+" : ""}
            {ticker?.priceChangePercent ?? "0"}%
          </strong>
        </div>
        <div>
          <span className="label">High</span>
          <strong>{formatPrice(ticker?.high ?? 0, 2)}</strong>
        </div>
        <div>
          <span className="label">Low</span>
          <strong>{formatPrice(ticker?.low ?? 0, 2)}</strong>
        </div>
        <div>
          <span className="label">Volume</span>
          <strong>{formatPrice(ticker?.volume ?? 0, 2)}</strong>
        </div>
      </div>

      <div className={`conn ${connected ? "on" : "off"}`}>
        <span className="dot" />
        {connected ? "Live" : "Reconnecting"}
      </div>
    </header>
  );
}
