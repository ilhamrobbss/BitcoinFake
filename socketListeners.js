const socketListeners = (socket) => {
  socket.on("ADD_TRANSACTION", (transaction) => {
    console.log(transaction);
  });

  socket.on("MINED", (newChain) => {
    console.log('Mined a block');
  });

  return socket;
};

module.exports = socketListeners;
