const app = require('express')();
const bodyParser = require('body-parser');
const httpServer = require('http').Server(app);
const io = require('socket.io')(httpServer);
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const { Blockchain, Transaction } = require('./blockchain');

const PORT = 3000;

app.use(bodyParser.json());

const myKey = ec.keyFromPrivate('7c4c45907dec40c91bab3480c39032e90049f1a44f3e18c3e07c23e3273995cf');

const myWalletAddress = myKey.getPublic('hex');

const BitcoinFake = new Blockchain();

app.post('/register', (req, res) => {
    const key = ec.genKeyPair();
    const publicKey = key.getPublic('hex');
    const privateKey = key.getPrivate('hex');
    BitcoinFake.minePendingTransactions(publicKey);

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

    res.status(200).json({});
});

io.on('connection', (socket) => {
    socket.on('ADD_TRANSACTION', (transaction) => {
        transactions.push(transaction);
        console.log(transaction);
        io.sockets.emit('UPDATED_TRANSACTIONS', transactions);
    });
});

httpServer.listen(PORT, () => console.info(`Server running on ${PORT}...`));
