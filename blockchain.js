const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = Date.now();
    this.TXID = crypto.randomBytes(32).toString('hex');
  }

  createTo({ fromAddress, toAddress, amount, timestamp, signature, TXID }) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = timestamp;
    this.signature = signature;
    this.TXID = TXID;
  }

  calculateHash() {
    return crypto.createHash('sha256').update(this.fromAddress + this.toAddress + this.amount + this.timestamp).digest('hex');
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');

    this.signature = sig.toDER('hex');
  }

  isValid() {
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  createTo({ previousHash, timestamp, transactions, nonce, hash }) {
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.nonce = nonce;
    this.hash = hash;
    let _transactions = [];
    transactions.forEach(element => {
      let transaction = new Transaction()
      transaction.createTo(element);
      _transactions.push(transaction);
    });
    this.transactions = _transactions;
  }

  calculateHash() {
    return crypto.createHash('sha256').update(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).digest('hex');
  }

  mineBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = 1;
    this.airdropReward = 100;
  }

  createGenesisBlock() {
    return new Block(Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addAirdropReward(publicKey) {
    const rewardTx = new Transaction(null, publicKey, this.airdropReward);

    const block = new Block(Date.now(), [rewardTx], this.getLatestBlock().hash);
    block.mineBlock(0);

    this.chain.push(block);
  }

  addBlock(newblock, publicKey) {
    const block = new Block();
    block.createTo(newblock);

    if (block.calculateHash() !== block.hash) {
      console.log('Hash invalid');
      return;
    }

    if (!block.hasValidTransactions()) {
      console.log('Invalid transactions in this block');
      return
    }
    
    this.chain.push(block);

    const rewardTx = new Transaction(null, publicKey, this.miningReward);

    const blockReward = new Block(Date.now(), [rewardTx], this.getLatestBlock().hash);
    blockReward.mineBlock(0);

    this.chain.push(blockReward);
  }

  addTransaction(newTransaction) {
    let transaction = new Transaction();
    transaction.createTo(newTransaction);

    if (!transaction.fromAddress || !transaction.toAddress) {
      console.log('Transaction must include from and to address');
      return;
    }

    if (transaction.fromAddress === transaction.toAddress) {
      console.log('Receiver address is invalid');
      return;
    }

    if (!transaction.isValid()) {
      console.log('Cannot add invalid transaction to chain');
      return;
    }

    if (transaction.amount <= 0) {
      console.log('Transaction amount should be higher than 0');
      return;
    }

    if (this.getBalanceOfAddress(transaction.fromAddress) < transaction.amount) {
      console.log('Not enough balance');
      return;
    }

    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.fromAddress === address) {
          balance -= +transaction.amount;
        }

        if (transaction.toAddress === address) {
          balance += +transaction.amount;
        }
      }
    }

    for (const transaction of this.pendingTransactions) {
      if (transaction.fromAddress === address) {
        balance -= +transaction.amount;
      }

      if (transaction.toAddress === address) {
        balance += +transaction.amount;
      }
    }

    return balance;
  }

  getAllTransactionsForWallet(address) {
    const txs = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          txs.push(tx);
        }
      }
    }

    return txs;
  }

  getAllTransactionsPenddingForWallet(address) {
    const txs = [];

    for (const tx of this.pendingTransactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
            txs.push(tx);
        }
    }

    return txs;
}

  isChainValid() {
    const realGenesis = JSON.stringify(this.createGenesisBlock());

    if (realGenesis !== JSON.stringify(this.chain[0])) {
      return false;
    }

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
    }

    return true;
  }
}

module.exports.Blockchain = Blockchain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;
