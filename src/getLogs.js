import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import web3 from 'web3';
import groupBy from 'lodash.groupby';
import { objectMap, removeEmpty } from './utils/helpers.js'

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

  const paramStr = new URLSearchParams(removeEmpty(params)).toString();
  return `https://api.etherscan.io/api?${paramStr}`;
}

const convertHex = obj => {
  return {
    ...obj,
    blockNumber: web3.utils.hexToNumber(obj.blockNumber),
    logIndex: web3.utils.hexToNumber(obj.logIndex)
  }
}

const processRaw = obj => {
  return obj.data.result.map(d => convertHex(d));
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

  const grouped = groupBy(delegateTx.concat(targetTransfers), tx => {
    return tx.transactionHash
  })

  // Sorting by tx by block number then by index
  const sortOuter = Object.values(grouped).sort((a, b) => {
    var n = a[0].blockNumber - b[0].blockNumber;
    if (n !== 0) {
        return n;
    }
    return a[0].logIndex - b[0].logIndex
  })

  // grouping tx by evt type, then order by index
  const sortInner = sortOuter.map(txSet => {
    const grouped = groupBy(txSet, tx => tx.topics[0])
    return objectMap(grouped, v => {
      return v.sort((a, b) => a.logIndex - b.logIndex)
    })
    // return txSet.sort((a, b) => a.logIndex - b.logIndex)
  })


  const mostRecentBlock = transfers.length === 0
    ? fromBlock
    : Math.max.apply(Math, transfers.map(o => o.blockNumber));

  return {
    recentLogs: sortInner,
    mostRecentBlock,
  }
}

export const getRecentLogs = async (contract, fromBlock) => {
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

export const getRecentGovernanceLogs = async (govContract, fromBlock) => {
  const url = generateUrl(govContract, null, fromBlock);
  const request = axios.get(url)

  // ADD error handling
  return await axios.get(url)
    .then(response => {
      if (response.data.message === 'NOTOK') {
        throw 'NOTOK';
      };

      return processRaw(response);
    })
    .catch(err => {
      console.log('Error', err);
      return null;
    });
}
