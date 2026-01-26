
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ISG_MINT, SKR_MINT, RPC_URL, WALLET_KEYPAIR } from "./config";

// Force a reliable RPC for reading if different from config, but config is usually best source of truth for the app
const connection = new Connection(RPC_URL, "confirmed");

async function main() {
    console.log("--- DATA AUDIT ---");
    console.log(`Endpoint: ${RPC_URL}`);
    console.log(`Wallet: ${WALLET_KEYPAIR.publicKey.toBase58()}`);

    // 1. Check ISG Supply (Burn Check)
    try {
        const isgMint = new PublicKey(ISG_MINT);
        const info = await connection.getAccountInfo(isgMint);
        if (!info) throw new Error("ISG Mint not found");

        const programId = info.owner;
        const mintInfo = await getMint(connection, isgMint, "confirmed", programId);

        const supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
        const initial = 1_000_000_000;
        const burned = initial - supply;
        console.log(`\n[ISG MINT] ${ISG_MINT}`);
        console.log(`Program: ${programId.toBase58()}`);
        console.log(`Supply: ${supply.toLocaleString()}`);
        console.log(`Burned: ${burned.toLocaleString()} (Calculated from 1B initial)`);
    } catch (e: any) {
        console.error(`[ISG ERROR]`, e);
    }

    // 2. Check SKR Supply & Balance
    try {
        const skrMint = new PublicKey(SKR_MINT);
        const mintInfo = await getMint(connection, skrMint);
        console.log(`\n[SKR MINT] ${SKR_MINT}`);
        console.log(`Supply: ${(Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toLocaleString()}`);
    } catch (e: any) {
        console.error(`[SKR ERROR] ${e.message}`);
    }

    // 3. Check Wallet SOL
    try {
        const balance = await connection.getBalance(WALLET_KEYPAIR.publicKey);
        console.log(`\n[WALLET SOL]`);
        console.log(`Balance: ${balance / 1e9} SOL`);
    } catch (e: any) {
        console.error(`[WALLET ERROR] ${e.message}`);
    }

    // 4. Check DB Content
    try {
        console.log("\n[DATABASE DUMP]");
        const Database = require('better-sqlite3');
        const path = require('path');
        const dbPath = path.join(__dirname, 'flywheel.db');
        const db = new Database(dbPath, { readonly: true });

        const stats = db.prepare('SELECT * FROM stats').all();
        console.log("Stats Table:", stats);

        const historyCount = db.prepare('SELECT count(*) as c FROM history').get();
        console.log("History Points:", historyCount);
    } catch (e: any) {
        console.error(`[DB ERROR] ${e.message}`);
    }
}

main();
