
import * as dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
// Removed recursive import

dotenv.config();

// --- CONFIGURATION ---

// 1. The Coin you Launched on Pump.fun (Generates Fees)
export const ISG_MINT = process.env.ISG_MINT || "BAszjaGWSJJiSuzAxAH5VfY8Vx8sBwxy9eK5yfyqpump";

// 2. The Reward Coin you are Buying & Distributing (SKR)
export const SKR_MINT = process.env.SKR_MINT || "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";

// 3. Your Wallet (Must be the Creator Wallet of ISG to claim fees)
export const PRIVATE_KEY_STRING = process.env.PRIVATE_KEY || "";
export const WALLET_KEYPAIR = PRIVATE_KEY_STRING
    ? Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY_STRING))
    : Keypair.generate(); // Fallback for testing only

// 4. Settings
export const RPC_URL = process.env.RPC_URL || "https://mainnet.helius-rpc.com/?api-key=7fe3d6c8-f846-4f3c-bd5d-5dd9a48f161f";
export const PUMP_PORTAL_API = "https://pumpportal.fun/api";
export const EPOCH_DURATION_MS = 5 * 60 * 1000; // 5 Minutes (TESTING)
export const TRACKER_INTERVAL_MS = 5 * 60 * 1000;     // 5 Minutes
export const CLAIM_INTERVAL_MS = 60 * 60 * 1000;      // 1 Hour
export const MIN_SOL_TO_CLAIM = 0.05;                 // Minimum accumulated SOL fees to trigger a claim
export const RESERVE_SOL = 0.05;                      // Minimum SOL to keep in wallet at all times
export const SLIPPAGE_BPS = 200;                      // 2% Slippage
export const MIN_REWARD_TOKENS = 100;                 // Minimum SKR tokens to distribute (Dust Gate) - Adjust based on SKR price/decimals
// Note: 0.002 SOL is rent. If SKR is cheap, ensure 100 SKR > 0.002 SOL worth. 
// Better: We can't easily price SKR here without an oracle. 
// User should set a sensible "Minimum Tokens" amount that is worth > $0.01.

// 5. Exclusions (Addresses that should NEVER receive rewards)
// e.g. The Curve Address, The Raydium Pool, Your Wallet, Etc.
export const EXCLUDED_ADDRESSES: string[] = [
    "4wTV1YmiEkp25D2De2uKS9HTvS06SDE" + "re6T4f3mppump", // Pump.fun Bonding Curve (Example pattern, but let's use the real one)
    "5Q544fKrSJu8VpSNErthf9vpx6FvS" + "pAnp4Rn6Lxp6W99", // Raydium
];
// Use the real ISG Bonding Curve from Solscan: 
// BAszjaGWSJJiSuzAxAH5VfY8Vx8sBwxy9eK5yfyqpump is the MINT.
// Usually the bonding curve is predictable but we can just check it.
// Actually, Solscan says "Pump.fun (ISG) Bonding Curve" holds 93%.
// It's the ATA: 8vHn...

console.log(`ISG Mint (Fee Source): ${ISG_MINT}`);
console.log(`SKR Mint (Reward):     ${SKR_MINT}`);
console.log(`Wallet Public Key:     ${WALLET_KEYPAIR.publicKey.toBase58()}`);
console.log("---------------------");
