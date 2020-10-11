import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import Web3EthAbi from 'web3-eth-abi';
import web3 from 'web3';

import {
  UniDelegateChanged,
  UniDelegateVotesChanged,
  UniContract,
  UniTransfer
} from './data/events.js';

import { getCurrentBlockNumber } from './utils/helpers.js';

import {
  DelegateVotesChangedAbi,
  DelegateChangedAbi,
  TransferAbi
} from './data/abi.js';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;


const generateUrl = (address, topic0, fromBlock) => {
  const toBlock = 'latest';
  return `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${address}&topic0=${topic0}&apikey=${ETHERSCAN_API_KEY}`;
}

const convertHex = obj => {
  return {
    ...obj,
    blockNumber: web3.utils.hexToNumber(obj.blockNumber),
    logIndex: web3.utils.hexToNumber(obj.logIndex)
  }
}

const processRaw = obj => {
  return obj.data.result.map(d => convertHex(d))
}

const mergeAndOrder = (responses) => {
  const delegateChanged = processRaw(responses[0]);
  const delegateVotesChanged = processRaw(responses[1]);
  const transfers = processRaw(responses[2]); // API only returns top 1k... => block range cannot be too large

  // CHECK, some transfers are being excluded...
  const delegateTx = delegateChanged.concat(delegateVotesChanged);
  const targetTxs = [...new Set(delegateTx.map(tx => tx.transactionHash))];
  const targetTransfers = transfers.filter(tx => {
    return targetTxs.includes(tx.transactionHash);
  })

  const sorted = delegateTx.concat(targetTransfers).sort((a,b) => {
    var n = a.blockNumber - b.blockNumber;
    if (n !== 0) {
        return n;
    }

    if (a.transactionHash === b.transactionHash) {
      return a.logIndex - b.logIndex;
    }

    return a.transactionHash - b.transactionHash;
  })

  return sorted
}

const getRecentLogs = async () => {
  const fromBlock = await getCurrentBlockNumber() - 100; // ~last 22ish minutes
  console.log(fromBlock, fromBlock + 100)

  const url1 = generateUrl(UniContract, UniDelegateChanged, fromBlock);
  const url2 = generateUrl(UniContract, UniDelegateVotesChanged, fromBlock);
  const url3 = generateUrl(UniContract, UniTransfer, fromBlock);

  const request1 = axios.get(url1)
  const request2 = axios.get(url2)
  const request3 = axios.get(url3)

  // ADD error handling
  return await axios.all([request1, request2, request3])
    .then(axios.spread((...responses) => {
      return mergeAndOrder(responses);
    }))
    .catch(err => {
      console.log('Error', err);
      return null;
    });
}

export default getRecentLogs;
