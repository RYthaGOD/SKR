
import {
    ISG_MINT,
    SKR_MINT,
    TRACKER_INTERVAL_MS,
    EPOCH_DURATION_MS,
    MIN_SOL_TO_CLAIM,
    RPC_URL,
    WALLET_KEYPAIR // Added Import
} from './config';
import { Tracker } from './components/tracker';
import { Distributor } from './components/distributor';
import { PumpPortal } from './utils/pumportal';
import { Jupiter } from './utils/jupiter'; // Import Jupiter
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(RPC_URL, "confirmed");

let isRunning = false;
let lastClaimTime = 0;
const CLAIM_INTERVAL_MS = 60 * 60 * 1000; // Check/Claim Fees every 1 Hour

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
        if (isRunning) {
            console.log("[Flywheel] Previous cycle still running. Skipping...");
            return;
        }
        try {
            isRunning = true;
            await runCycle();
        } catch (e) {
            console.error("[Flywheel] Cycle Error:", e);
        } finally {
            isRunning = false;
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

    // 2. Fees & Buyback (Blind Claim Strategy)
    // Since we can't check fees easily, we attempt to claim every Hour.
    // If successful, we get SOL. We then check Wallet Balance increase? 
    // Simplified: "Try Claim" -> "Check Wallet Balance" -> "Swap Surplus".
    // Actually, we can just Check Wallet Balance *before* and *after*.
    // Or just check Wallet Balance for > MIN_SOL_TO_CLAIM + Buffer.
    try {
        if (now - lastClaimTime > CLAIM_INTERVAL_MS) {
            console.log(`[Flywheel] Blind Claim Check (Every 1h)...`);

            // A. Claim
            try {
                await PumpPortal.claimCreatorFees({ mint: ISG_MINT });
                console.log("[Flywheel] Fees Claimed (if any).");
            } catch (claimErr) {
                console.warn("[Flywheel] Claim attempt failed (maybe no fees/error):", claimErr);
            }

            lastClaimTime = now;

            // Wait for balance update
            await new Promise(r => setTimeout(r, 10000));

            // B. Check Balance & Swap
            // We check the SOL balance of the wallet directly.
            // If Balance > Reserve (e.g. 0.05), we swap the excess.
            const balance = await connection.getBalance(WALLET_KEYPAIR.publicKey);
            const balanceSol = balance / 1_000_000_000;
            const RESERVE_SOL = 0.05; // Keep 0.05 SOL for gas

            if (balanceSol > RESERVE_SOL + 0.02) { // Only swap if we have meaningful surplus (> 0.02)
                const buyAmount = balanceSol - RESERVE_SOL;
                console.log(`[Flywheel] Wallet Balance: ${balanceSol.toFixed(4)} SOL. Swapping surplus: ${buyAmount.toFixed(4)} SOL`);

                // REFACTORED: Use Jupiter V6 for Best Price Routing
                await Jupiter.swapSolToToken(buyAmount, SKR_MINT);
            } else {
                console.log(`[Flywheel] Wallet Balance (${balanceSol.toFixed(4)}) too low to swap. Reserve: ${RESERVE_SOL}`);
            }
        } else {
            console.log(`[Flywheel] Skipping Fee Claim (Last checked ${(now - lastClaimTime) / 60000} mins ago).`);
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
