
import {
    ISG_MINT,
    SKR_MINT,
    TRACKER_INTERVAL_MS,
    EPOCH_DURATION_MS,
    MIN_SOL_TO_CLAIM,
    RPC_URL
} from './config';
import { Tracker } from './components/tracker';
import { Distributor } from './components/distributor';
import { PumpPortal } from './utils/pumportal';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(RPC_URL, "confirmed");

let lastEpochTime = Date.now();

/**
 * Main Flywheel Loop
 */
async function main() {
    console.log("Starting SKR Flywheel...");

    // Initial run
    await runCycle();

    // Loop
    setInterval(async () => {
        try {
            await runCycle();
        } catch (e) {
            console.error("[Flywheel] Cycle Error:", e);
        }
    }, TRACKER_INTERVAL_MS);
}

/**
 * The Cycle Logic
 */
async function runCycle() {
    const now = Date.now();
    console.log(`\n--- CYCLE START [${new Date(now).toISOString()}] ---`);

    // 1. Snapshot Holders (Points += Balance * Time)
    // Applies to ISG Holders
    await Tracker.snapshotAndScore();

    // 2. Check Fees & Buyback (Every Cycle? Or Threshold?)
    // Let's check fees every cycle.
    try {
        const feesToClaim = await checkClaimableFees();

        if (feesToClaim > MIN_SOL_TO_CLAIM) {
            console.log(`[Flywheel] Found ${feesToClaim} SOL in fees. Claiming...`);

            // A. Claim
            await PumpPortal.claimCreatorFees({ mint: ISG_MINT });

            // Wait a bit for confirmation/balance update
            await new Promise(r => setTimeout(r, 10000));

            // B. Buy SKR
            // We use the claimed amount (minus gas). 
            // Simplified: Use 'feesToClaim' - 0.01 SOL buffer.
            const buyAmount = feesToClaim - 0.01;
            if (buyAmount > 0) {
                await PumpPortal.buyToken(buyAmount, SKR_MINT);
            }
        } else {
            console.log(`[Flywheel] Fees too low to claim (${feesToClaim} SOL). Threshold: ${MIN_SOL_TO_CLAIM}`);
        }

    } catch (e) {
        console.error("[Flywheel] Fee/Buyback Error (skipping this cycle):", e);
    }

    // 3. Distribution (Epoch Check)
    if (now - lastEpochTime > EPOCH_DURATION_MS) {
        console.log(`[Flywheel] EPOCH END. Distributing Rewards...`);

        // Determine how much SKR we have to distribute.
        // We distribute EVERYTHING in the wallet? Or tracks specific "Pot"?
        // Simpler: Distribute ALL SKR in the wallet.
        try {
            const skrBalance = await getTokenBalance(SKR_MINT);
            if (skrBalance > 0) {
                await Distributor.distribute(skrBalance);
                lastEpochTime = now;
            } else {
                console.log("[Flywheel] No SKR to distribute.");
            }
        } catch (e) {
            console.error("[Flywheel] Distribution Error:", e);
        }
    } else {
        const timeLeft = (EPOCH_DURATION_MS - (now - lastEpochTime)) / 1000 / 60;
        console.log(`[Flywheel] Epoch continues. Time until distribution: ${timeLeft.toFixed(1)} mins`);
    }

    console.log("--- CYCLE END ---");
}

/* --- HELPERS --- */

// Mock helper until real API exists or we use RPC to check curve
// Realistically, to check "Claimable Fees" on Pump.fun, we might just try to claim?
// Or check the bonding curve account data.
// For V1 Safety: We will just try to *Check Wallet Balance*? 
// No, Creator fees accrue on the curve.
// PumpPortal doesn't have a "Check Fees" endpoint, only "Claim".
// Strategy: We can try to Claim periodically regardless.
// IF PumpPortal throws "No fees", we catch it.
// Better: Just claim if it's been X hours.
// FOR NOW: We mimic "Check" by returning a mock/random value or 0 if placeholder.
async function checkClaimableFees(): Promise<number> {
    if (ISG_MINT.includes("REPLACE")) return 0;

    // TODO: Implement real check (e.g. read curve state).
    // For now, we will rely on the user manually triggering or blindly trying to claim 
    // if we put this in production. 
    // Alternative: Just return 0 to prevent spamming generic claim TXs.
    // To make this robust: Since we can't easily check without complex parsing,
    // we might just return 0 here and rely on the USER to set `MIN_SOL_TO_CLAIM` 
    // to 0 if they want to force a claim attempt every cycle (not recommended).

    // ACTUALLY: Let's blindly attempt claim if it's been > 1 hour?
    // Let's just return 0 for safety in this strict script until User confirms they want auto-claim.
    return 0;
}

async function getTokenBalance(mint: string): Promise<number> {
    if (mint.includes("REPLACE")) return 0;
    // ... Fetch SPL balance logic ...
    // Placeholder
    return 0;
}

// Start
main();
