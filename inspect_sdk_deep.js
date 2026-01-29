const ct = require('@lightprotocol/compressed-token');
const sl = require('@lightprotocol/stateless.js');

console.log("--- CompressedTokenProgram ---");
try {
    const proto1 = Object.getPrototypeOf(ct.CompressedTokenProgram);
    console.log("Keys:", Object.keys(ct.CompressedTokenProgram));
    console.log("Proto Keys:", Object.getOwnPropertyNames(proto1));
} catch (e) { console.log("Error inspecting CT:", e.message); }

console.log("\n--- LightSystemProgram ---");
try {
    const proto2 = Object.getPrototypeOf(sl.LightSystemProgram);
    console.log("Keys:", Object.keys(sl.LightSystemProgram));
    console.log("Proto Keys:", Object.getOwnPropertyNames(proto2));
} catch (e) { console.log("Error inspecting LSP:", e.message); }

console.log("\n--- Exports check for 'Shield' or 'Compress' ---");
const check = (obj, name) => {
    for (const key in obj) {
        if (key.toLowerCase().includes('shield') || key.toLowerCase().includes('compress')) {
            console.log(`Found matching export in ${name}:`, key);
        }
    }
};
check(ct, 'compressed-token');
check(sl, 'stateless.js');
