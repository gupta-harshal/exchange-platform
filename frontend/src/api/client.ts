import { API_BASE_URL } from "../config";
import type { Balances, Depth, Kline, OpenOrder, OrderPlaced, Side, Ticker, Trade } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getDepth(market: string) {
    return request<Depth>(`/api/v1/depth?symbol=${encodeURIComponent(market)}`);
  },

  getTrades(market: string, limit = 50) {
    return request<Trade[]>(`/api/v1/trades?market=${encodeURIComponent(market)}&limit=${limit}`);
  },

  getTickers() {
    return request<Ticker[]>(`/api/v1/tickers`);
  },

  getOpenOrders(userId: string, market: string) {
    return request<OpenOrder[]>(
      `/api/v1/order/open?userId=${encodeURIComponent(userId)}&market=${encodeURIComponent(market)}`
    );
  },

  getBalances(userId: string) {
    return request<Balances>(`/api/v1/order/balances?userId=${encodeURIComponent(userId)}`);
  },

  placeOrder(input: {
    market: string;
    price: string;
    quantity: string;
    side: Side;
    userId: string;
  }) {
    return request<OrderPlaced>(`/api/v1/order`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  cancelOrder(orderId: string, market: string) {
    return request<{ orderId: string; executedQty: number; remainingQty: number }>(`/api/v1/order`, {
      method: "DELETE",
      body: JSON.stringify({ orderId, market }),
    });
  },

  onRamp(userId: string, amount: number) {
    return request<{ userId: string; amount: number }>(`/api/v1/order/onramp`, {
      method: "POST",
      body: JSON.stringify({ userId, amount }),
    });
  },

  getKlines(market: string, interval: string, startTime: number, endTime: number) {
    return request<Kline[]>(
      `/api/v1/klines?market=${encodeURIComponent(market)}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
    );
  },
};
