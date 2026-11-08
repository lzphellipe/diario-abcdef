/* Carrega o TensorFlow: usa @tensorflow/tfjs-node (nativo, mais rápido) se estiver instalado; senão, @tensorflow/tfjs (JavaScript puro). */
let tf, backend;
try { tf = require("@tensorflow/tfjs-node"); backend = "tfjs-node"; }
catch (e) { tf = require("@tensorflow/tfjs"); backend = "tfjs (cpu)"; }
module.exports = { tf, backend };
