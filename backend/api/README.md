
## API

### Endpoints
- `POST /api/v1/order` — place order
- `DELETE /api/v1/order` — cancel order
- `GET /api/v1/order/open` — open orders
- `GET /api/v1/order/balances?userId=` — user balances
- `POST /api/v1/order/onramp` — on-ramp INR
- `GET /api/v1/depth?symbol=` — orderbook depth
- `GET /api/v1/trades?market=` — recent trades
- `GET /api/v1/tickers` — market tickers
- `GET /api/v1/klines` — candlesticks (requires TimescaleDB)
