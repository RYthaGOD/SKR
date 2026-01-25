
# Infinite Seeker Glitch (ISG) Flywheel

This automated "Flywheel" program incentivizes holding **Infinite Seeker Glitch (ISG)** by claiming creator fees, using them to buy **SKR** (Solana Mobile Token), and distributing the SKR to ISG holders based on a **Time-Weighted** reward system.

## 🚀 Features

*   **Fee Auto-Claimer**: Monitors the ISG Mint for accrued Creator Fees on Pump.fun and claims them (locally signed).
*   **Auto-Buyback**: Uses the claimed SOL to buy **SKR** tokens using **Jupiter V6 Aggregator** for the best possible price across all DEXs.
*   **Time-Weighted Rewards**: Tracks how long users hold ISG. Rewards are calculated as `Balance * Time Held`. Whales who just bought in don't dilute long-term holders immediately.
*   **Dust Protection**: Automatically ignores rewards typically less than the cost of rent (configurable), ensuring the flywheel doesn't burn money on dust accounts.
*   **Batched Distribution**: Sends rewards in efficient batches (12 transfers per transaction) to respect Solana limits.

## 🛠 Prerequisites

*   **Node.js** (v16+)
*   **Solana Wallet** (The Creator Wallet of ISG).

## ⚙️ Configuration

1.  Clone the repository:
    ```bash
    git clone https://github.com/RYthaGOD/SKR.git
    cd SKR
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure `config.ts`:
    Open `config.ts` and set your specific values:

    ```typescript
    // The Coin you Launched (Fee Source)
    export const ISG_MINT = "YOUR_ISG_MINT_ADDRESS";

    // The Reward Token
    export const SKR_MINT = "YOUR_SKR_MINT_ADDRESS"; 

    // Your Creator Wallet Private Key (Base58)
    // REQUIRED to sign the Claim and Distribution transactions.
    export const PRIVATE_KEY_STRING = "YOUR_PRIVATE_KEY";
    ```

    > **Security Note**: Never commit your real private key to GitHub. Use environment variables or keep it local.

4.  **Exclusions**:
    Add addresses to `EXCLUDED_ADDRESSES` in `config.ts` if you want to blacklist certain wallets (like the Liquidity Pool or your own wallet) from receiving rewards.

## 🏃‍♂️ Usage

Start the flywheel:

```bash
npx ts-node flywheel.ts
```

**The Loop:**
1.  **Every 5 Minutes**: Snapshots ISG holders and updates their Time-Points.
2.  **Every Cycle**: Checks if fees > 0.05 SOL. If yes, Claims SOL -> Swaps for SKR.
3.  **Every 24 Hours**: Distributes held SKR to eligible holders and resets points.

## ⚠️ Disclaimer

This software is experimental. Use at your own risk. Ensure you have enough SOL in the wallet for transaction fees.
