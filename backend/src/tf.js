/* Carrega o TensorFlow: usa @tensorflow/tfjs-node (nativo, mais rápido) se estiver instalado; senão, @tensorflow/tfjs (JavaScript puro). */
let tf, backend;
try { tf = require("@tensorflow/tfjs-node"); backend = "tfjs-node"; }
catch (e) {
  tf = require("@tensorflow/tfjs");
  backend = "tfjs (cpu)";
  // Modo produção: desliga o aviso "install our node backend" e verificações de depuração.
  // Para este modelo pequeno a versão em JavaScript puro é suficiente; defina TF_DEBUG=1 para ver os avisos.
  if (!process.env.TF_DEBUG) tf.enableProdMode();
}
module.exports = { tf, backend };
