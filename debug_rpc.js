
const { createRpc } = require('@lightprotocol/stateless.js');
const { PublicKey } = require('@solana/web3.js');

const RPC_URL = "https://api.mainnet-beta.solana.com";

async function check() {
    const rpc = createRpc(RPC_URL);
    // Use a known public key or the one from the wallet if available
    // For now, let's just try to fetch some accounts to see structure
    const pubkey = new PublicKey("BAszjaGWSJJiSuzAxAH5VfY8Vx8sBwxy9eK5yfyqpump"); // Example ISG mint or user
    console.log("Fetching for:", pubkey.toBase58());

    try {
        const accounts = await rpc.getCompressedTokenAccountsByOwner(pubkey);
        console.log("Accounts items length:", accounts.items?.length);
        if (accounts.items && accounts.items.length > 0) {
            console.log("First account structure (keys):", Object.keys(accounts.items[0]));
            console.log("First account token structure:", JSON.stringify(accounts.items[0].token, null, 2));
        } else {
            console.log("No accounts found for this pubkey.");
        }
    } catch (e) {
        console.error("RPC Error:", e.message);
    }
}

check();
