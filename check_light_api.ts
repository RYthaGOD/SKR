const light = require('@lightprotocol/stateless.js');
console.log("Full Exports:", Object.keys(light));
if (light.LightSystemProgram) {
    console.log("LightSystemProgram found. Keys:", Object.keys(light.LightSystemProgram));
} else {
    console.log("LightSystemProgram NOT found.");
}
