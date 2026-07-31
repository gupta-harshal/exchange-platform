import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from "lightweight-charts";
import { api } from "../api/client";
import type { Trade } from "../types";

type Props = {
  market: string;
  trades: Trade[];
  lastPrice?: string;
};

export function PriceChart({ market, trades, lastPrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#8b93a7",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: {
        vertLine: { color: "rgba(94, 234, 212, 0.35)" },
        horzLine: { color: "rgba(94, 234, 212, 0.35)" },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#2dd4a8",
      downColor: "#f07167",
      borderVisible: false,
      wickUpColor: "#2dd4a8",
      wickDownColor: "#f07167",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    resize();
    window.addEventListener("resize", resize);

    const end = Math.floor(Date.now() / 1000);
    const start = end - 60 * 60 * 24;
    api
      .getKlines(market, "1m", start, end)
      .then((klines) => {
        if (!klines.length) {
          seedFromTrades(series, trades, lastPrice);
          return;
        }
        const data: CandlestickData[] = klines.map((k) => ({
          time: (Math.floor(new Date(k.start).getTime() / 1000) as Time),
          open: Number(k.open),
          high: Number(k.high),
          low: Number(k.low),
          close: Number(k.close),
        }));
        series.setData(data);
        chart.timeScale().fitContent();
      })
      .catch(() => {
        seedFromTrades(series, trades, lastPrice);
      });

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !trades.length) return;

    const latest = trades[0];
    if (!latest) return;
    const price = Number(latest.price);
    const bucket = Math.floor(latest.timestamp / 60000) * 60;

    try {
      series.update({
        time: bucket as Time,
        open: price,
        high: price,
        low: price,
        close: price,
      });
    } catch {
      // chart may not be ready
    }
  }, [trades]);

  return (
    <section className="panel chart">
      <header className="panel-header">
        <h2>Chart</h2>
        <span className="muted">1m</span>
      </header>
      <div className="chart-canvas" ref={containerRef} />
    </section>
  );
}

function seedFromTrades(
  series: ISeriesApi<"Candlestick">,
  trades: Trade[],
  lastPrice?: string
) {
  if (trades.length) {
    const buckets = new Map<number, CandlestickData>();
    [...trades].reverse().forEach((t) => {
      const time = Math.floor(t.timestamp / 60000) * 60;
      const price = Number(t.price);
      const existing = buckets.get(time);
      if (!existing) {
        buckets.set(time, {
          time: time as Time,
          open: price,
          high: price,
          low: price,
          close: price,
        });
      } else {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
      }
    });
    series.setData(Array.from(buckets.values()));
    return;
  }

  if (lastPrice && Number(lastPrice) > 0) {
    const now = Math.floor(Date.now() / 1000);
    const price = Number(lastPrice);
    series.setData([
      {
        time: (now - 120) as Time,
        open: price,
        high: price,
        low: price,
        close: price,
      },
      {
        time: now as Time,
        open: price,
        high: price,
        low: price,
        close: price,
      },
    ]);
  }
}
