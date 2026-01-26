
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { RPC_URL, ISG_MINT } from '../config';

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Production Tracker
 * Verifies on-chain holdings for individual users in real-time.
 * Eliminates mocking and background loops.
 */
export class Tracker {

    /**
     * Get real-time balance for a specific wallet
     */
    static async getUserBalance(address: string): Promise<number> {
        try {
            const owner = new PublicKey(address);
            const mint = new PublicKey(ISG_MINT);

            // Get ATA - ISG is Token-2022 (BAsz...pump)
            const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_2022_PROGRAM_ID);

            // Fetch Balance
            const balance = await connection.getTokenAccountBalance(ata);
            return balance.value.uiAmount || 0;
        } catch (e) {
            // Likely account doesn't exist (0 balance)
            return 0;
        }
    }

    /**
     * Get "Effective Circulating Supply"
     * Total Supply minus the Bonding Curve
     */
    static async getEligibleSupply(): Promise<number> {
        try {
            const mint = new PublicKey(ISG_MINT);
            const supply = await connection.getTokenSupply(mint);
            const total = supply.value.uiAmount || 1_000_000_000;

            // Fetch largest accounts to find the Bonding Curve
            const largest = await connection.getTokenLargestAccounts(mint);
            let curveBalance = 0;
            if (largest.value && largest.value[0]) {
                const top = largest.value[0];
                if (top.uiAmount && top.uiAmount > total * 0.5) {
                    curveBalance = top.uiAmount;
                    console.log(`[Tracker] Excluding Curve: ${curveBalance.toFixed(0)} tokens`);
                }
            }

            const circulating = total - curveBalance;
            return circulating > 0 ? circulating : total;
        } catch (e) {
            return 1_000_000_000;
        }
    }

    /**
     * Leaderboard: Empty for now (since we don't snapshot all holders)
     * To implement without mock: We'd need to scrape Solscan or use a Pro API.
     */
    static getTopHolders(limit: number = 5): any[] {
        return []; // No mocks in production
    }
}
