
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_URL, ISG_MINT, SKR_MINT } from './config';

const connection = new Connection(RPC_URL, "confirmed");

async function check() {
    const isg = new PublicKey(ISG_MINT);
    const skr = new PublicKey(SKR_MINT);

    const isgInfo = await connection.getAccountInfo(isg);
    const skrInfo = await connection.getAccountInfo(skr);

    console.log(`ISG (${ISG_MINT}) Program: ${isgInfo?.owner.toBase58()}`);
    console.log(`SKR (${SKR_MINT}) Program: ${skrInfo?.owner.toBase58()}`);
}

check();
