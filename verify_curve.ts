
import { Connection, PublicKey } from "@solana/web3.js";
import { ISG_MINT, RPC_URL } from "./config";

const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

async function main() {
    console.log("Deriving Bonding Curve for:", ISG_MINT);
    const mint = new PublicKey(ISG_MINT);

    const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding-curve"), mint.toBuffer()],
        PUMP_PROGRAM_ID
    );

    console.log("Bonding Curve Address:", bondingCurve.toBase58());

    const connection = new Connection(RPC_URL, "confirmed");
    const balance = await connection.getBalance(bondingCurve);
    console.log(`Curve Balance: ${balance / 1e9} SOL`);
}

main();
