import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import Web3EthAbi from 'web3-eth-abi';
import web3 from 'web3';

import {
  DelegateChanged,
  DelegateVotesChanged,
  Transfer,
} from './data/events.js';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;


const generateUrl = (address, topic0, fromBlock) => {
  const params = {
    module: 'logs',
    action: 'getLogs',
    fromBlock,
    toBlock: 'latest',
    address,
    topic0,
    apikey: ETHERSCAN_API_KEY,
  }

  return `https://api.etherscan.io/api?${new URLSearchParams(params).toString()}`
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

const mergeAndOrder = (responses, fromBlock) => {
  const delegateChanged = processRaw(responses[0]);
  const delegateVotesChanged = processRaw(responses[1]);
  // API only returns top 1k... => block range cannot be too large
  const transfers = processRaw(responses[2]);

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
    };

    return a.transactionHash - b.transactionHash;
  });

  const mostRecentBlock = transfers.length === 0
    ? fromBlock
    : Math.max.apply(Math, transfers.map(o => o.blockNumber));

  return {
    recentLogs: sorted,
    mostRecentBlock,
  }
}

const getRecentLogs = async (contract, fromBlock) => {
  const url1 = generateUrl(contract, DelegateChanged, fromBlock);
  const url2 = generateUrl(contract, DelegateVotesChanged, fromBlock);
  const url3 = generateUrl(contract, Transfer, fromBlock);

  const request1 = axios.get(url1)
  const request2 = axios.get(url2)
  const request3 = axios.get(url3)

  // ADD error handling
  return await axios.all([request1, request2, request3])
    .then(axios.spread((...responses) => {
      if (responses[0].data.message === 'NOTOK'
        || responses[1].data.message === 'NOTOK'
        || responses[2].data.message === 'NOTOK'
      ) {
        throw 'NOTOK';
      };

      return mergeAndOrder(responses, fromBlock);
    }))
    .catch(err => {
      console.log('Error', err);
      return null;
    });
}

export default getRecentLogs;
