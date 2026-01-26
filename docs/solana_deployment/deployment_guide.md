# Solana dApp Store 2.0 Deployment Guide

This guide summarizes the research on deploying your dashboard to the Solana dApp Store 2.0 (Solana Mobile dApp Store).

## 1. Prerequisites & Requirements

Before you begin, ensure you have the following:

### Development Environment
-   **Java JDK 17**: Required for building the Android APK.
-   **Android Studio & SDK**: Needed for build tools and the Android Emulator.
-   **Solana CLI**: For keypair generation and management.

### Application Requirements
-   **APK File**: You must build a **released** version of your app as an Android Package (APK).
    -   Must be signed with a **new, unique signing key** specifically for the Solana dApp Store (do NOT use an existing Google Play Store key).
    -   Debug builds are *not* accepted.
    -   Your dashboard is a web app, so you will likely need to wrap it using a Trusted Web Activity (TWA) or similar mechanism to create an Android app, or if you are building a React Native app.

### Publishing Assets
You must prepare a folder with the following assets:
-   **Icon**: 512x512 px (PNG).
-   **Banner Graphic**: 1200x600 px (PNG/JPG).
-   **Feature Graphic**: 1200x1200 px (Optional, for Editor's Choice).
-   **Screenshots**: Minimum of 4 images.
    -   Resolution: 1080p (1920x1080 or 1080x1920).
    -   Format: PNG or JPEG.
    -   Consistent orientation (all landscape or all portrait).

### Keys & Config
-   **Solana Keypair**: A wallet funded with a small amount of SOL to pay for the minting of the "dApp NFT" (the store listing is technically an NFT).
-   **`config.yaml`**: A configuration file describing your app (name, description, developer info, etc.).

## 2. GitHub Tools & Resources

We found the following official repositories to make the process easier:

### `solana-mobile/dapp-publishing`
This is the **primary tool** you need. It contains the CLI for submitting your app.
-   **Repo**: [https://github.com/solana-mobile/dapp-publishing](https://github.com/solana-mobile/dapp-publishing)
-   **Purpose**: Validates your `config.yaml` and assets, and submits the transaction to create your store listing.

### `solana-mobile/mobile-wallet-adapter`
If your dashboard connects to wallets, you should ensure it supports the Mobile Wallet Adapter (MWA) standard for the best experience on mobile.
-   **Repo**: [https://github.com/solana-mobile/mobile-wallet-adapter](https://github.com/solana-mobile/mobile-wallet-adapter)

## 3. Deployment Steps Overview

1.  **Prepare your APK**: Build your dashboard into a signed release APK.
2.  **Prepare Assets**: Create the required images and put them in a dedicated folder.
3.  **Install the CLI**:
    ```bash
    npm install -g @solana-mobile/dapp-publishing-cli
    ```
4.  **Create Config**:
    Run `dapp-store init` to generate a `config.yaml` template and fill it out.
5.  **Validate**:
    Run `dapp-store validate` to check your assets and config.
6.  **Publish**:
    Run `dapp-store publish` (or similar command from the CLI docs) to mint your listing on-chain.
