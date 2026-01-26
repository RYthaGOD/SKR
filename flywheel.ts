
import {
    ISG_MINT,
    SKR_MINT,
    TRACKER_INTERVAL_MS,
    EPOCH_DURATION_MS,
    MIN_SOL_TO_CLAIM,
    RPC_URL,
    WALLET_KEYPAIR,
    MIN_REWARD_TOKENS,
    RESERVE_SOL,
    CLAIM_INTERVAL_MS // Added
} from './config';
import { Tracker } from './components/tracker';
import { Distributor } from './components/distributor';
import {
    initDB,
    saveStat,
    loadStat,
    addLog,
    getRecentLogs,
    addHistoryPoint,
    getHistory,
    hasClaimed,   // Added
    markClaimed   // Added
} from './database';
import { PumpPortal } from './utils/pumportal';
import { Jupiter } from './utils/jupiter';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'; // Added

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Helper to detect Token Program ID for a mint (Cached)
 */
const programCache: Record<string, PublicKey> = {};
async function getMintProgram(mint: PublicKey): Promise<PublicKey> {
    const key = mint.toBase58();
    if (programCache[key]) return programCache[key];

    const info = await connection.getAccountInfo(mint);
    const owner = (info && info.owner.equals(TOKEN_2022_PROGRAM_ID)) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    programCache[key] = owner;
    return owner;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
function getBondingCurveAddress(mintStr: string): PublicKey {
    const mint = new PublicKey(mintStr);
    const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding-curve"), mint.toBuffer()],
        PUMP_PROGRAM_ID
    );
    return bondingCurve;
}

let isRunning = false;
let lastClaimTime = 0;
// CLAIM_INTERVAL_MS is now imported from config.ts

let lastEpochTime = Date.now();


// Init Database
initDB();


// Track Cycle State for Dashboard
let flywheelState = {
    status: "IDLE",
    lastCycleTime: 0,
    cycleCount: 0,
    totalSkrDistributed: 0,
    totalIsgBurned: 0,
    systemPressure: 0.1, // Synthetic value (0.0 to 1.0) for UI vibration
    history: {
        isgPrice: [] as number[],
        skrPrice: [] as number[],
        vaultSol: [] as number[]
    },
    logs: [] as string[],
    lastBuybackAmount: 0,
    // Epoch State (Snapshots)
    currentEpochId: 1,
    currentEpochRate: 0, // SKR per ISG (Snapshot)
    epochStartTime: Date.now()
};

// PERSISTENCE: Load initial state
// PERSISTENCE: Load initial state from DB
try {
    const savedStatus = loadStat('status', "IDLE");
    const savedCycleCount = loadStat('cycleCount', 0);
    const savedTotalSkr = loadStat('totalSkrDistributed', 0);
    const savedTotalIsg = loadStat('totalIsgBurned', 0);
    const savedlastBuyback = loadStat('lastBuybackAmount', 0);
    const savedEpochId = loadStat('currentEpochId', 1);
    const savedEpochRate = loadStat('currentEpochRate', 0); // Default 0
    const savedEpochStart = loadStat('epochStartTime', Date.now());

    flywheelState = {
        ...flywheelState,
        status: savedStatus,
        cycleCount: savedCycleCount,
        totalSkrDistributed: savedTotalSkr,
        totalIsgBurned: savedTotalIsg,
        lastBuybackAmount: savedlastBuyback,
        currentEpochId: savedEpochId,
        currentEpochRate: savedEpochRate,
        epochStartTime: savedEpochStart,
        logs: getRecentLogs(50),
        history: getHistory(24) as any
    };
    console.log(`[Flywheel] State loaded from DB. Cycle #${flywheelState.cycleCount}`);
} catch (e) {
    console.error("[Flywheel] Failed to load DB state", e);
}

const saveStats = () => {
    // Save atomic props
    saveStat('status', flywheelState.status);
    saveStat('cycleCount', flywheelState.cycleCount);
    saveStat('totalSkrDistributed', flywheelState.totalSkrDistributed);
    saveStat('totalIsgBurned', flywheelState.totalIsgBurned);
    saveStat('lastBuybackAmount', flywheelState.lastBuybackAmount);
    saveStat('currentEpochId', flywheelState.currentEpochId);
    saveStat('currentEpochRate', flywheelState.currentEpochRate);
    saveStat('epochStartTime', flywheelState.epochStartTime);
    // History and Logs are saved incrementally via their specific helpers
};

const updateHistory = (isg: number, skr: number, sol: number) => {
    const h = flywheelState.history;
    h.isgPrice.push(isg);
    h.skrPrice.push(skr);
    h.vaultSol.push(sol);

    // Keep locally
    if (h.isgPrice.length > 24) {
        h.isgPrice.shift();
        h.skrPrice.shift();
        h.vaultSol.shift();
    }

    // Persist
    addHistoryPoint(Date.now(), isg, skr, sol);

    // Update system pressure based on recent volatility or activity
    flywheelState.systemPressure = Math.min(1.0, 0.1 + (flywheelState.cycleCount % 10) / 20 + Math.random() * 0.1);

    // SAVE STATS (Critical for persistence)
    saveStats();
};

const addFlywheelLog = (msg: string) => {
    console.log(msg);
    flywheelState.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg.replace('[Flywheel] ', '')}`);
    if (flywheelState.logs.length > 50) flywheelState.logs.pop();

    addLog(`[${new Date().toLocaleTimeString()}] ${msg.replace('[Flywheel] ', '')}`);
};

/**
 * Main Flywheel Loop
 */
async function main() {
    addFlywheelLog("Starting SKR Flywheel...");

    // Initial run
    await runCycle();

    // Loop
    setInterval(async () => {
        if (isRunning) {
            addFlywheelLog("Previous cycle still running. Skipping...");
            return;
        }
        try {
            isRunning = true;
            await runCycle();
        } catch (e: any) {
            console.error("[Flywheel] Cycle Error:", e);
            addFlywheelLog(`Cycle Error: ${e.message}`);
        } finally {
            isRunning = false;
        }
    }, TRACKER_INTERVAL_MS);
}

/**
 * The Cycle Logic (Maintenance only)
 */
async function runCycle() {
    const now = Date.now();
    flywheelState.status = "UPDATING_STATS";
    flywheelState.lastCycleTime = now;
    flywheelState.cycleCount++;
    addFlywheelLog(`--- Starting Maintenance Cycle #${flywheelState.cycleCount} ---`);

    // 1. Check Fees & Buyback
    try {
        if (now - lastClaimTime > CLAIM_INTERVAL_MS) {
            // Optimization: Real On-Chain Fee Check
            const curve = getBondingCurveAddress(ISG_MINT);
            const curveBalance = await connection.getBalance(curve);
            const curveSol = curveBalance / 1e9;
            addFlywheelLog(`Checking Curve Fees: ${curveSol.toFixed(4)} SOL (Threshold: ${MIN_SOL_TO_CLAIM})`);

            if (curveSol > MIN_SOL_TO_CLAIM) {
                flywheelState.status = "CLAIMING_FEES";
                addFlywheelLog(`Fees found! Claiming...`);
                await PumpPortal.claimCreatorFees({ mint: ISG_MINT });
                addFlywheelLog("Claim Transaction Sent.");
                lastClaimTime = now;
                await new Promise(r => setTimeout(r, 10000));
            } else {
                addFlywheelLog("Fees below threshold. Skipping claim.");
                // Reset timer so we don't spam check? Or kept as is (1hr)
                lastClaimTime = now;
            }
        }
    } catch (e: any) {
        console.warn("[Flywheel] Claim check skipped.", e);
        addFlywheelLog(`Claim Check Error: ${e.message}`);
    }

    // 2. Buyback surplus SOL
    try {
        const balance = await connection.getBalance(WALLET_KEYPAIR.publicKey);
        const balanceSol = balance / 1e9;
        if (balanceSol > RESERVE_SOL + 0.01) {
            const buyAmount = (balanceSol - RESERVE_SOL) * 0.9;
            addFlywheelLog(`Buying SKR with surplus ${buyAmount.toFixed(4)} SOL`);
            await Jupiter.swapSolToToken(buyAmount, SKR_MINT);
        }
    } catch (e) { }

    // 3. Epoch Cleanup & Rate Snapshot
    // Logic: If Epoch is over, we snapshot the Current Wallet Balance as the Pot for the NEXT Epoch.
    // Users claim from this Pot.

    if (now - flywheelState.epochStartTime > EPOCH_DURATION_MS) {
        addFlywheelLog("--- END OF EPOCH ---");

        // 1. Snapshot Balance and Supply
        const currentSkrBalance = await getTokenBalance(SKR_MINT);
        const currentSupply = await Tracker.getEligibleSupply();

        // 2. Calculate New Rate
        // If Supply is 0 (impossible), avoid NaN
        const newRate = currentSupply > 0 ? (currentSkrBalance / currentSupply) : 0;

        // 3. Update State
        flywheelState.currentEpochId++;
        flywheelState.currentEpochRate = newRate;
        flywheelState.epochStartTime = now;

        addFlywheelLog(`Snapshot: Pot=${currentSkrBalance}, Supply=${currentSupply}, Rate=${newRate.toFixed(6)}`);
        addFlywheelLog(`New Epoch #${flywheelState.currentEpochId} Started.`);
        saveStats();
    }

    addFlywheelLog("--- CYCLE END ---");
    flywheelState.status = "READY";
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
    try {
        const mintPubkey = new PublicKey(mint);
        const walletPubkey = WALLET_KEYPAIR.publicKey;

        const programId = await getMintProgram(mintPubkey);

        // Get ATA
        const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey, false, programId);

        // Fetch Balance
        const balance = await connection.getTokenAccountBalance(ata);
        return balance.value.uiAmount || 0;
    } catch (e: any) {
        console.warn(`[Flywheel] Could not fetch balance for ${mint}: ${e.message}`);
        return 0; // Return 0 if account doesn't exist
    }
}


async function getIsgBurned(): Promise<number> {
    if (ISG_MINT.includes("REPLACE")) return 0;
    try {
        const mintPubkey = new PublicKey(ISG_MINT);
        // Detect Program ID first
        const info = await connection.getAccountInfo(mintPubkey);
        if (!info) return 0;

        const programId = info.owner; // Use actual owner (Token or Token-2022)
        const mintInfo = await getMint(connection, mintPubkey, "confirmed", programId);

        const currentSupply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
        const initialSupply = 1_000_000_000; // Standard Pump.fun 1B Supply

        const burned = initialSupply - currentSupply;
        return Math.max(0, burned);
    } catch (e) {
        console.warn("[Flywheel] Failed to fetch ISG Supply", e);
        return flywheelState.totalIsgBurned; // Fallback to internal counter
    }
}

// Start
// --- SERVER & API ---
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;

// 1. Get Balance & Eligibility
let statsCache: any = null;
let lastStatsFetch = 0;
const CACHE_TTL = 15000; // 15 Seconds
let leaderboardCache: any[] = [];
let lastLeaderboardUpdate = 0;
const LEADERBOARD_CACHE_TTL = 60 * 1000; // 1 Minute

app.get('/api/stats', async (req, res) => {
    const now = Date.now();
    if (statsCache && (now - lastStatsFetch < CACHE_TTL)) {
        return res.json(statsCache);
    }

    try {
        const solMint = "So11111111111111111111111111111111111111112";

        // Helper to get price in SOL
        const getPriceInSol = async (mint: string): Promise<number> => {
            if (mint.includes("REPLACE")) return 0;
            try {
                const mintPubkey = new PublicKey(mint);
                const programId = await getMintProgram(mintPubkey);

                // Quote 1 Unit
                const mintInfo = await getMint(connection, mintPubkey, "confirmed", programId);
                const oneUnit = Math.pow(10, mintInfo.decimals);

                await sleep(300); // Space out requests
                const quote = await Jupiter.getQuote(mint, solMint, oneUnit);
                return parseInt(quote.outAmount) / 1_000_000_000;
            } catch (e: any) {
                console.warn(`Failed to fetch price for ${mint}`, e.message);
                return 0;
            }
        };

        const isgPrice = await getPriceInSol(ISG_MINT);
        await sleep(300);
        const skrPrice = await getPriceInSol(SKR_MINT);

        const balance = await connection.getBalance(WALLET_KEYPAIR.publicKey);
        const skrBalance = await getTokenBalance(SKR_MINT);

        // Update Backend History
        updateHistory(isgPrice, skrPrice, balance / 1e9);

        console.log(`[API] Cache Refreshed: SKR Balance = ${skrBalance}, Wallet SOL = ${balance / 1e9}`);

        statsCache = {
            isgPriceSol: isgPrice,
            skrPriceSol: skrPrice,
            vaultSol: balance / 1_000_000_000,
            vaultSkr: skrBalance,
            systemPressure: flywheelState.systemPressure,
            history: flywheelState.history,
            analytics: {
                totalDistributed: flywheelState.totalSkrDistributed,
                totalBurned: await getIsgBurned(), // Realtime On-Chain
                leaderboard: await (async () => {
                    const now = Date.now();
                    if (now - lastLeaderboardUpdate > LEADERBOARD_CACHE_TTL || leaderboardCache.length === 0) {
                        try {
                            console.log("[Stats] Refreshing Leaderboard...");
                            const fresh = await Tracker.getTopHolders(5);
                            leaderboardCache = fresh.map((h: any) => ({
                                address: h.address ? (h.address.slice(0, 4) + '...' + h.address.slice(-4)) : "N/A",
                                points: Math.round(h.points || 0)
                            }));
                            lastLeaderboardUpdate = now;
                        } catch (e) {
                            console.error("[Stats] Leaderboard update failed, using cache", e);
                        }
                    }
                    return leaderboardCache;
                })()
            },
            cycleParams: {
                status: flywheelState.status,
                lastCycle: flywheelState.lastCycleTime,
                nextCycle: flywheelState.lastCycleTime + TRACKER_INTERVAL_MS,
                count: flywheelState.cycleCount,
                logs: flywheelState.logs
            },
            epoch: {
                id: flywheelState.currentEpochId,
                rate: flywheelState.currentEpochRate,
                endsAt: flywheelState.epochStartTime + EPOCH_DURATION_MS
            }
        };
        lastStatsFetch = now;
        res.json(statsCache);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Stats Error" });
    }
});

app.get('/api/balance/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const balance = await Tracker.getUserBalance(address);
        if (balance <= 0) {
            return res.json({ points: 0, amount: 0, claimable: false, reason: "No Balance" });
        }

        // Check if already claimed this epoch
        if (hasClaimed(flywheelState.currentEpochId, address)) {
            return res.json({ points: balance, amount: 0, claimable: false, reason: "Already Claimed This Epoch" });
        }

        // Calculate based on Snapshot Rate
        const share = balance * flywheelState.currentEpochRate;

        // Safety: If rate is 0 (first run), fallback to 0

        res.json({
            points: balance,
            amount: share,
            claimable: share >= MIN_REWARD_TOKENS,
            epochId: flywheelState.currentEpochId
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "On-Chain Error" });
    }
});

// 2. Create Claim Transaction
app.post('/api/claim', async (req, res) => {
    const { address } = req.body;
    try {
        const currentEpoch = flywheelState.currentEpochId;
        const rate = flywheelState.currentEpochRate;

        // 1. Check Previous Claim
        if (hasClaimed(currentEpoch, address)) {
            return res.status(400).json({ error: "You have already claimed for this Epoch. Please wait for the next cycle." });
        }

        // 2. Get User Balance
        const balance = await Tracker.getUserBalance(address);
        if (balance <= 0) return res.status(400).json({ error: "No holdings detected on-chain" });

        // 3. Calculate Amount using FIXED Rate
        const claimAmount = balance * rate;

        if (claimAmount < MIN_REWARD_TOKENS) return res.status(400).json({ error: "Claim too small. Wait for more fees." });

        // Double Check: Ensure Vault has enough funds (Rate is based on start of epoch, funds might have moved?)
        // In theory, if everyone claims, we drain it exactly.
        // But if we had rounding errors, we might be short.
        const currentVault = await getTokenBalance(SKR_MINT);
        if (claimAmount > currentVault) {
            // Edge Case: Rounding or theft? Cap it at currentVault?
            // Or better: Fail safely.
            console.warn(`[Claim] Warning: Vault shortage. Needed ${claimAmount}, Has ${currentVault}. Clipping.`);
            // We can proceed with Min(claimAmount, currentVault), or fail.
            // If we Clip, the User gets less than fair share, but better than nothing.
        }

        const finalAmount = Math.min(claimAmount, currentVault);

        console.log(`[API] User ${address} claiming ${finalAmount.toFixed(2)} SKR (Epoch ${currentEpoch})...`);

        // --- DYNAMIC BURN CALCULATION ---

        // Helper to detect program ID
        const getProgramId = async (mint: PublicKey) => {
            const info = await connection.getAccountInfo(mint);
            if (info && info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
            return TOKEN_PROGRAM_ID; // Default to V1
        };

        const skrPubkey = new PublicKey(SKR_MINT);
        const isgPubkey = new PublicKey(ISG_MINT);

        const skrProgramId = await getProgramId(skrPubkey);
        const isgProgramId = await getProgramId(isgPubkey);

        // 1. Get Value of SKR in SOL
        const skrMintInfo = await getMint(connection, skrPubkey, "confirmed", skrProgramId);
        const solMint = "So11111111111111111111111111111111111111112"; // Wrapped SOL

        const skrLamports = Math.floor(finalAmount * Math.pow(10, skrMintInfo.decimals));

        // Quote: SKR -> SOL
        const skrToSolQuote = await Jupiter.getQuote(SKR_MINT, solMint, skrLamports);
        const valueInSol = parseInt(skrToSolQuote.outAmount) / 1_000_000_000;

        // 2. Target Burn Value = 20% of Value
        const burnValueSol = valueInSol * 0.20;
        console.log(`[API] Claim Value: ${valueInSol.toFixed(4)} SOL. Burn Target: ${burnValueSol.toFixed(4)} SOL (20%)`);

        // 3. Get Amount of ISG required to match Burn Value
        // Quote: SOL -> ISG (How much ISG do I get for X SOL?) -> That is the Burn Amount.
        // Input: BurnValueSol (Lamports)
        const burnValueLamports = Math.floor(burnValueSol * 1_000_000_000);
        const solToIsgQuote = await Jupiter.getQuote(solMint, ISG_MINT, burnValueLamports);

        const isgMintInfo = await getMint(connection, isgPubkey, "confirmed", isgProgramId);
        const isgBurnAmount = parseInt(solToIsgQuote.outAmount) / Math.pow(10, isgMintInfo.decimals);

        console.log(`[API] ISG Burn Required: ${isgBurnAmount.toFixed(4)} ISG`);

        // 4. Create Transaction
        const tx = await Distributor.createClaimTransaction(address, finalAmount, isgBurnAmount);

        // Update analytics
        flywheelState.totalIsgBurned += isgBurnAmount;

        // 5. MARK AS CLAIMED
        markClaimed(currentEpoch, address, finalAmount);

        // Serialize and Return
        const serializedTx = tx.serialize({ requireAllSignatures: false }).toString('base64');
        res.json({ transaction: serializedTx, burnAmount: isgBurnAmount, claimAmount: finalAmount });

    } catch (e) {
        console.error("Claim Error:", e);
        res.status(500).json({ error: "Failed to create transaction" });
    }
});

// Start Server & Bot
app.listen(PORT, () => {
    console.log(`[API] Server running on port ${PORT}`);
    main(); // Start Flywheel Loop
});
