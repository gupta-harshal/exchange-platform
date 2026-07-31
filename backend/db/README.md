
## DB Processor

Consumes `db_processor` Redis queue and persists:
- Trade prices + volume into `tata_prices` (for klines)
- Individual trades into `trades`
- Order updates into `orders`
- Rolling ticker state into `tickers`
