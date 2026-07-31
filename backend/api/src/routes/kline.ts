import { Client } from 'pg';
import { Router } from "express";

const pgClient = new Client({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432,
});

let connected = false;
pgClient.connect()
    .then(() => { connected = true; })
    .catch((err) => {
        console.log("Postgres unavailable for klines:", err.message);
    });

export const klineRouter = Router();

klineRouter.get("/", async (req, res) => {
    const { interval, startTime, endTime } = req.query;

    if (!connected) {
        res.json([]);
        return;
    }

    let query: string;
    switch (interval) {
        case '1m':
            query = `SELECT * FROM klines_1m WHERE bucket >= $1 AND bucket <= $2 ORDER BY bucket ASC`;
            break;
        case '1h':
            query = `SELECT * FROM klines_1h WHERE bucket >= $1 AND bucket <= $2 ORDER BY bucket ASC`;
            break;
        case '1w':
            query = `SELECT * FROM klines_1w WHERE bucket >= $1 AND bucket <= $2 ORDER BY bucket ASC`;
            break;
        default:
            return res.status(400).send('Invalid interval');
    }

    try {
        const start = new Date(Number(startTime) * 1000);
        const end = new Date(Number(endTime) * 1000);
        const result = await pgClient.query(query, [start, end]);
        res.json(result.rows.map(x => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.quoteVolume ?? x.volume,
            start: x.bucket,
            trades: x.trades ?? 0,
            volume: x.volume,
        })));
    } catch (err) {
        console.log(err);
        res.json([]);
    }
});
