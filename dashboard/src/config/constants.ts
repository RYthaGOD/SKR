export const ISG_MINT = process.env.NEXT_PUBLIC_ISG_MINT || "BAszjaGWSJJiSuzAxAH5VfY8Vx8sBwxy9eK5yfyqpump";
export const SKR_MINT = process.env.NEXT_PUBLIC_SKR_MINT || "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";

// Determine API URL based on environment
const IS_DEV = process.env.NODE_ENV === 'development';
export const API_BASE_URL = IS_DEV ? 'http://localhost:3001' : ''; // Relative path in prod via Next.js rewrites

export const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=f901ea4c-bd09-48be-9e7c-43f35d35bcf5";
export const HELIUS_RPC_URL = RPC_URL;

export const MIN_REWARD_TOKENS = 100;
export const APP_VERSION = "1.5.0-SEEKER";
export const BUILD_TIMESTAMP = "2026-01-30 00:30:00 UTC"; // Manual Stamp

export const SOCIALS = {
    telegram: "https://t.me/SKR_COMMUNITY_LINK",
    twitter: "https://twitter.com/SKR_TOKEN_LINK"
};
