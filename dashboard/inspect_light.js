const light = require('@lightprotocol/stateless.js');
console.log("Exports:", Object.keys(light));
if (light.LightSystemProgram) {
    console.log("LightSystemProgram Keys:", Object.keys(light.LightSystemProgram));
}
