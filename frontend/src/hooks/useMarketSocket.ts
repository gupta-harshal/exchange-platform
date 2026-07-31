import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "../config";
import type { WsMessage } from "../types";

type Handler = (message: WsMessage) => void;

export function useMarketSocket(market: string, onMessage: Handler) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const subscribe = useCallback((ws: WebSocket, mkt: string) => {
    ws.send(
      JSON.stringify({
        method: "SUBSCRIBE",
        params: [`depth@${mkt}`, `trade@${mkt}`, `ticker@${mkt}`],
      })
    );
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retryTimer: number | undefined;

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (closed) return;
        setConnected(true);
        subscribe(ws!, market);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as WsMessage;
          handlerRef.current(parsed);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          retryTimer = window.setTimeout(connect, 1500);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [`depth@${market}`, `trade@${market}`, `ticker@${market}`],
          })
        );
      }
      ws?.close();
    };
  }, [market, subscribe]);

  return { connected };
}
