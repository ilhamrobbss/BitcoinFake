const app = require('express')();
const crypto = require('crypto');
const bodyParser = require('body-parser');
const httpServer = require('http').Server(app);
const io = require('socket.io')(httpServer);
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const cors = require('cors');

app.use(cors());

const { Blockchain, Transaction } = require('./blockchain');

const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const BitcoinFake = new Blockchain();

io.on('connection', (socket) => {
    console.log(`${socket.id} connected`)
    socket.emit('UPDATED_BLOCKCHAIN', BitcoinFake);

    socket.on('CREATE_NEW_WALLET', () => {
        const key = ec.genKeyPair();
        const publicKey = key.getPublic('hex');
        const privateKey = key.getPrivate('hex');

        BitcoinFake.addAirdropReward(publicKey);
        const balance = BitcoinFake.getBalanceOfAddress(publicKey);

        socket.emit('NEW_WALLET', { publicKey, privateKey, balance });
        io.sockets.emit('UPDATED_BLOCKCHAIN', BitcoinFake);
    });

    socket.on('CREATE_NEW_TRANSACTION', (transaction) => {
        BitcoinFake.addTransaction(transaction);

        io.sockets.emit('UPDATED_TRANSACTIONS', BitcoinFake.pendingTransactions);
    });

    socket.on('MINE', () => {
        const transactions = BitcoinFake.pendingTransactions;
        BitcoinFake.pendingTransactions = [];

        if (transactions.length > 0) {
            socket.emit('TRANSACTIONS_NEED_TO_MINE', transactions);
        }

        io.sockets.emit('UPDATED_TRANSACTIONS', BitcoinFake.pendingTransactions);
    });

    socket.on('MINED', (block, publicKey) => {
        BitcoinFake.addBlock(block, publicKey);

        socket.emit('REWARD', BitcoinFake.miningReward);
        io.sockets.emit('UPDATED_BLOCKCHAIN', BitcoinFake);
    });

    socket.on('CHECK_BALANCE', (publicKey) => {
        socket.emit('BALANCE_RESULT', BitcoinFake.getBalanceOfAddress(publicKey));
    });

    socket.on('EXPLORE_TRANSACTION', (publicKey) => {
        let tx = [];
        tx = tx.concat(BitcoinFake.getAllTransactionsForWallet(publicKey));
        tx = tx.concat(BitcoinFake.getAllTransactionsPenddingForWallet(publicKey));
        socket.emit('EXPLORE_TRANSACTION_RESULT', tx);
        console.log(tx)
    });
});

httpServer.listen(PORT, () => console.info(`Server running on ${PORT}...`));