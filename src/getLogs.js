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

import {
  DelegateVotesChangedAbi,
  DelegateChangedAbi,
  TransferAbi
} from './data/abi.js';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;


const generateUrl = (address, topic0) => {
  // Change to block to "latest"
  const fromBlock = 10963950;
  const toBlock = 10964075;
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
  const one = processRaw(responses[0]);
  const two = processRaw(responses[1]);

  const targetTxs = one.concat(two).map(d => d.transactionHash);
  const three = processRaw(responses[2]).filter(tx => {
    return targetTxs.includes(tx.transactionHash);
  })

  const sorted = one.concat(two).concat(three).sort((a,b) => {
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
  const url1 = generateUrl(UniContract, UniDelegateChanged);
  const url2 = generateUrl(UniContract, UniDelegateVotesChanged);
  const url3 = generateUrl(UniContract, UniTransfer);

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
