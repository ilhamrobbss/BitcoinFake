const app = require('express')();
const bodyParser = require('body-parser');
const httpServer = require('http').Server(app);
const io = require('socket.io')(httpServer);
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const cors = require('cors');
app.use(cors());

const { Blockchain, Transaction } = require('./blockchain');

const PORT = 3000;

app.use(bodyParser.json());

const BitcoinFake = new Blockchain();

app.post('/new_block', (req, res) => {
    const { block } = req.body;

    BitcoinFake.addNewBlock(block);

    io.sockets.emit('UPDATED_TRANSACTIONS', BitcoinFake.pendingTransactions);

    res.status(200).json({ publicKey, privateKey });
});

app.get('/wallets/:address', (req, res) => {
    const balance = BitcoinFake.getBalanceOfAddress(req.params.address);

    res.status(200).json({ balance });
});

app.post('/transactions', (req, res) => {
    const { privateKey, sender, receiver, amount } = req.body;
    const myKey = ec.keyFromPrivate(privateKey);

    const tx = new Transaction(sender, receiver, amount);
    tx.signTransaction(myKey);
    BitcoinFake.addTransaction(tx);

    io.sockets.emit('UPDATED_TRANSACTIONS', BitcoinFake.pendingTransactions);

    res.status(200).json({ tx });
});

io.on('connection', (socket) => {
    console.log(`${socket.id} connected`)
    socket.emit('CURRENT_BLOCKCHAIN', BitcoinFake);

    socket.on('CREATE_NEW_WALLET', () => {
        const key = ec.genKeyPair();
        const publicKey = key.getPublic('hex');
        const privateKey = key.getPrivate('hex');
        BitcoinFake.minePendingTransactions(publicKey);

        socket.emit('NEW_WALLET', { publicKey, privateKey })
    });

    socket.on('CREATE_NEW_TRANSACTION', ({ privateKey, sender, receiver, amount }) => {
        const myKey = ec.keyFromPrivate(privateKey);

        const tx = new Transaction(sender, receiver, amount);
        tx.signTransaction(myKey);
        BitcoinFake.addTransaction(tx);

        io.sockets.emit('UPDATED_TRANSACTIONS', BitcoinFake.pendingTransactions);
    });
});

httpServer.listen(PORT, () => console.info(`Server running on ${PORT}...`));
