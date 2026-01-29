const ct = require('@lightprotocol/compressed-token');
console.log("CompressedToken Exports:", Object.keys(ct));
if (ct.CompressedTokenProgram) {
    console.log("CompressedTokenProgram Keys:", Object.getOwnPropertyNames(ct.CompressedTokenProgram));
}
