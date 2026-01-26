
import fetch from 'node-fetch';
import { Connection } from '@solana/web3.js';

const RPC = "https://api.mainnet-beta.solana.com";
const JUP = "https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000";

async function test() {
    console.log("1. Testing RPC Connection...");
    try {
        const connection = new Connection(RPC);
        const version = await connection.getVersion();
        console.log("✅ RPC OK. Version:", version);
    } catch (e: any) {
        console.error("❌ RPC Failed:", e.message);
    }

    console.log("\n2. Testing Jupiter API...");
    try {
        const res = await fetch(JUP);
        if (res.ok) {
            console.log("✅ Jupiter OK. Status:", res.status);
            const data = await res.json();
            // @ts-ignore
            console.log("Quote found:", data.outAmount);
        } else {
            console.error("❌ Jupiter Error:", res.status, res.statusText);
        }
    } catch (e: any) {
        console.error("❌ Jupiter Failed:", e.message);
    }
}

test();
