
import fs from 'fs';
import path from 'path';
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_URL, ISG_MINT, TRACKER_INTERVAL_MS } from '../config';

const POINTS_DB_PATH = path.join(__dirname, '../points.json');
const connection = new Connection(RPC_URL, "confirmed");

interface UserPointData {
    address: string;
    points: number;
    lastSeenBalance: number;
    lastUpdated: number;
}

interface PointsDB {
    [address: string]: UserPointData;
}

/**
 * Tracker Component
 * Snapshot ISG holders and calculate Points (Balance * Time).
 */
export class Tracker {

    /**
     * Load existing points from file
     */
    private static loadDB(): PointsDB {
        if (!fs.existsSync(POINTS_DB_PATH)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(POINTS_DB_PATH, 'utf-8'));
    }

    /**
     * Save points to file
     */
    private static saveDB(db: PointsDB) {
        fs.writeFileSync(POINTS_DB_PATH, JSON.stringify(db, null, 2));
    }

    /**
     * Fetch all holders of the Token
     */
    private static async getHolders(mintAddress: string): Promise<Map<string, number>> {
        console.log(`[Tracker] Fetching holders for ${mintAddress}...`);

        // Placeholder check
        if (mintAddress.includes("REPLACE")) {
            console.warn("[Tracker] Mint address is placeholder. Returning mock data.");
            return new Map([["MockHolder1", 1000], ["MockHolder2", 5000]]);
        }

        try {
            const mintPubkey = new PublicKey(mintAddress);
            const accounts = await connection.getParsedProgramAccounts(
                new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token Program
                {
                    filters: [
                        { dataSize: 165 }, // Token Account size
                        { memcmp: { offset: 0, bytes: mintAddress } } // Mint match
                    ]
                }
            );

            const balances = new Map<string, number>();

            for (const acc of accounts) {
                const data = (acc.account.data as any).parsed.info;
                const owner = data.owner;
                const amount = parseFloat(data.tokenAmount.uiAmountString);

                if (amount > 0) {
                    balances.set(owner, amount);
                }
            }

            console.log(`[Tracker] Found ${balances.size} holders.`);
            return balances;

        } catch (e) {
            console.error("[Tracker] Failed to fetch holders:", e);
            return new Map();
        }
    }

    /**
     * Main Snapshot Function
     * Run this every TRACKER_INTERVAL_MS
     */
    static async snapshotAndScore() {
        console.log(`[Tracker] Starting Snapshot...`);
        const db = this.loadDB();
        const holders = await this.getHolders(ISG_MINT);
        const timestamp = Date.now();

        for (const [address, balance] of holders) {
            if (!db[address]) {
                db[address] = {
                    address,
                    points: 0,
                    lastSeenBalance: balance,
                    lastUpdated: timestamp
                };
            }

            // --- POINT CALCULATION LOGIC ---
            // Points = Balance * Time_Interval (in minutes)
            // Ideally, we add points based on the *minimum* balance held since last check? 
            // Or just Current Balance * Interval. We'll do Current Balance * Interval for simplicity as per plan.

            const minutes = TRACKER_INTERVAL_MS / 1000 / 60;
            const pointsToAdd = balance * minutes;

            db[address].points += pointsToAdd;
            db[address].lastSeenBalance = balance;
            db[address].lastUpdated = timestamp;
        }

        this.saveDB(db);
        console.log(`[Tracker] Snapshot complete. Updated points for ${holders.size} holders.`);
    }

    /**
     * Get Total Points (for distribution calc)
     */
    static getTotalPoints(): number {
        const db = this.loadDB();
        return Object.values(db).reduce((sum, user) => sum + user.points, 0);
    }

    /**
     * Reset Points (after Epoch)
     */
    static resetPoints() {
        // Option A: Delete DB. Option B: Set points to 0.
        // We will set points to 0 but keep the users in DB to track them.
        const db = this.loadDB();
        for (const key in db) {
            db[key].points = 0;
        }
        this.saveDB(db);
        console.log(`[Tracker] Points reset for new Epoch.`);
    }

    /**
     * Get Winners (Users with Points > 0)
     */
    static getEligibleHolders(): UserPointData[] {
        const db = this.loadDB();
        return Object.values(db).filter(u => u.points > 0);
    }
}
