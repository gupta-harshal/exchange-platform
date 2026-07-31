import { Client } from 'pg';
import { createClient } from 'redis';
import { DbMessage } from './types';

const pgClient = new Client({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432,
});

async function ensureTables() {
    await pgClient.query(`
        CREATE TABLE IF NOT EXISTS tata_prices (
            time TIMESTAMP WITH TIME ZONE NOT NULL,
            price DOUBLE PRECISION,
            volume DOUBLE PRECISION,
            currency_code VARCHAR(10)
        );
    `);

    await pgClient.query(`
        CREATE TABLE IF NOT EXISTS orders (
            order_id VARCHAR(64) PRIMARY KEY,
            executed_qty DOUBLE PRECISION,
            market VARCHAR(32),
            price VARCHAR(32),
            quantity VARCHAR(32),
            side VARCHAR(8),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);

    await pgClient.query(`
        CREATE TABLE IF NOT EXISTS trades (
            id VARCHAR(64) PRIMARY KEY,
            is_buyer_maker BOOLEAN,
            price VARCHAR(32),
            quantity VARCHAR(32),
            quote_quantity VARCHAR(32),
            timestamp BIGINT,
            market VARCHAR(32)
        );
    `);

    await pgClient.query(`
        CREATE TABLE IF NOT EXISTS tickers (
            symbol VARCHAR(32) PRIMARY KEY,
            last_price DOUBLE PRECISION,
            high DOUBLE PRECISION,
            low DOUBLE PRECISION,
            volume DOUBLE PRECISION,
            quote_volume DOUBLE PRECISION,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);
}

async function main() {
    await pgClient.connect();
    await ensureTables();

    const redisClient = createClient();
    await redisClient.connect();
    console.log("connected to redis");

    while (true) {
        const response = await redisClient.rPop("db_processor" as string)
        if (!response) {
            await new Promise(resolve => setTimeout(resolve, 50));
        } else {
            const data: DbMessage = JSON.parse(response);
            if (data.type === "TRADE_ADDED") {
                console.log("adding trade", data.data.id);
                const price = data.data.price;
                const volume = Number(data.data.quantity);
                const timestamp = new Date(data.data.timestamp);

                await pgClient.query(
                    'INSERT INTO tata_prices (time, price, volume, currency_code) VALUES ($1, $2, $3, $4)',
                    [timestamp, price, volume, data.data.market]
                );

                await pgClient.query(
                    `INSERT INTO trades (id, is_buyer_maker, price, quantity, quote_quantity, timestamp, market)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (id) DO NOTHING`,
                    [
                        data.data.id,
                        data.data.isBuyerMaker,
                        data.data.price,
                        data.data.quantity,
                        data.data.quoteQuantity,
                        data.data.timestamp,
                        data.data.market
                    ]
                );

                await pgClient.query(
                    `INSERT INTO tickers (symbol, last_price, high, low, volume, quote_volume, updated_at)
                     VALUES ($1, $2, $2, $2, $3, $4, NOW())
                     ON CONFLICT (symbol) DO UPDATE SET
                        last_price = EXCLUDED.last_price,
                        high = GREATEST(tickers.high, EXCLUDED.last_price),
                        low = LEAST(tickers.low, EXCLUDED.last_price),
                        volume = tickers.volume + EXCLUDED.volume,
                        quote_volume = tickers.quote_volume + EXCLUDED.quote_volume,
                        updated_at = NOW()`,
                    [
                        data.data.market,
                        Number(data.data.price),
                        Number(data.data.quantity),
                        Number(data.data.quoteQuantity)
                    ]
                );
            } else if (data.type === "ORDER_UPDATE") {
                console.log("updating order", data.data.orderId);
                if (data.data.market) {
                    await pgClient.query(
                        `INSERT INTO orders (order_id, executed_qty, market, price, quantity, side, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW())
                         ON CONFLICT (order_id) DO UPDATE SET
                            executed_qty = orders.executed_qty + EXCLUDED.executed_qty,
                            updated_at = NOW()`,
                        [
                            data.data.orderId,
                            data.data.executedQty,
                            data.data.market,
                            data.data.price || null,
                            data.data.quantity || null,
                            data.data.side || null
                        ]
                    );
                } else {
                    await pgClient.query(
                        `UPDATE orders SET executed_qty = executed_qty + $2, updated_at = NOW() WHERE order_id = $1`,
                        [data.data.orderId, data.data.executedQty]
                    );
                }
            }
        }
    }
}

main().catch(console.error);
