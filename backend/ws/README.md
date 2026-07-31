
## WebSocket

Port `3001`

### Subscribe
```json
{ "method": "SUBSCRIBE", "params": ["depth@TATA_INR", "trade@TATA_INR", "ticker@TATA_INR"] }
```

### Unsubscribe
```json
{ "method": "UNSUBSCRIBE", "params": ["depth@TATA_INR"] }
```

Supported streams: `depth@MARKET`, `trade@MARKET`, `ticker@MARKET`
