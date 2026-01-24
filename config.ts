
import * as dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
// Removed recursive import

dotenv.config();

// --- CONFIGURATION ---

// 1. The Coin you Launched on Pump.fun (Generates Fees)
export const ISG_MINT = process.env.ISG_MINT || "REPLACE_WITH_ISG_MINT_ADDRESS";

// 2. The Reward Coin you are Buying & Distributing (SKR)
export const SKR_MINT = process.env.SKR_MINT || "REPLACE_WITH_SKR_MINT_ADDRESS";

// 3. Your Wallet (Must be the Creator Wallet of ISG to claim fees)
export const PRIVATE_KEY_STRING = process.env.PRIVATE_KEY || "";
export const WALLET_KEYPAIR = PRIVATE_KEY_STRING
    ? Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY_STRING))
    : Keypair.generate(); // Fallback for testing only

// 4. Settings
export const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
export const PUMP_PORTAL_API = "https://pumpportal.fun/api";
export const EPOCH_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours
export const TRACKER_INTERVAL_MS = 5 * 60 * 1000;     // 5 Minutes
export const MIN_SOL_TO_CLAIM = 0.05;                 // Minimum accumulated SOL fees to trigger a claim
export const SLIPPAGE_BPS = 200;                      // 2% Slippage
export const MIN_REWARD_TOKENS = 100;                 // Minimum SKR tokens to distribute (Dust Gate) - Adjust based on SKR price/decimals
// Note: 0.002 SOL is rent. If SKR is cheap, ensure 100 SKR > 0.002 SOL worth. 
// Better: We can't easily price SKR here without an oracle. 
// User should set a sensible "Minimum Tokens" amount that is worth > $0.01.

// 5. Exclusions (Addresses that should NEVER receive rewards)
// e.g. The Curve Address, The Raydium Pool, Your Wallet, Etc.
export const EXCLUDED_ADDRESSES: string[] = [
    // "PumpFunCurveAddressHere", 
    // "RaydiumPoolAddressHere",
    // WALLET_KEYPAIR.publicKey.toBase58() // Automatically exclude self? Optional.
];
console.log(`ISG Mint (Fee Source): ${ISG_MINT}`);
console.log(`SKR Mint (Reward):     ${SKR_MINT}`);
console.log(`Wallet Public Key:     ${WALLET_KEYPAIR.publicKey.toBase58()}`);
console.log("---------------------");
