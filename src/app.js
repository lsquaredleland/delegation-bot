import {
  COMPOUND,
  UNISWAP,
} from './data/consts.js';

import {
  DelegateChanged,
  DelegateVotesChanged,
  Transfer,
  UniContract,
  CompContract,
} from './data/events.js';

import {
  DelegateVotesChangedAbi,
  DelegateChangedAbi,
  TransferAbi
} from './data/abi.js';

import generateTweet from './generateTweet.js';
import getRecentLogs from './getLogs.js';
import { getCurrentBlockNumber } from './utils/helpers.js';
import Web3EthAbi from 'web3-eth-abi';

import {
  identifyAddress
} from './utils/helpers.js'


const processData = (protocol, transactions) => {
  let bn = 0;
  let txHash = '';

  // High probability of breaking...
  let delegateChanged = {};
  let dvc = {};
  let dvc2 = {};
  let transfer = {};

  transactions.forEach((item, i) => {
    const { data, topics, blockNumber, transactionHash } = item;
    if (blockNumber !== bn) {
      console.log(blockNumber);
      bn = blockNumber;
    }
    if (transactionHash !== txHash) {
      console.log(transactionHash);
      txHash = transactionHash;
      delegateChanged = {};
      dvc = {};
      dvc2 = {};
      transfer = {};
    }
    if (topics[0] === DelegateChanged) {
      const { delegator, fromDelegate, toDelegate } = Web3EthAbi.decodeLog(DelegateChangedAbi, data, topics.slice(1))
      delegateChanged = { delegator, fromDelegate, toDelegate }
      console.log('a',
        identifyAddress(protocol, delegator),
        identifyAddress(protocol, fromDelegate), "=>",
        identifyAddress(protocol, toDelegate)
      )
    } else if (topics[0] === Transfer){
      const { from, to, amount } = Web3EthAbi.decodeLog(TransferAbi, data, topics.slice(1));
      transfer = { from, to, amount };
      console.log('b',
        identifyAddress(protocol, from), "=>",
        identifyAddress(protocol, to),
        amount / 1e18
      )
    } else if (topics[0] === DelegateVotesChanged){
      const { delegate, previousBalance, newBalance } = Web3EthAbi.decodeLog(DelegateVotesChangedAbi, data, topics.slice(1));
      if (Object.keys(dvc).length === 0) {
        dvc = { delegate, previousBalance, newBalance }
      } else {
        dvc2 = { delegate, previousBalance, newBalance }
      }
      console.log('c',
        identifyAddress(protocol, delegate),
        newBalance / 1e18 - previousBalance / 1e18,
        previousBalance / 1e18,
        newBalance / 1e18
      )
    }
  });

  if (transactions.length === 0) {
    console.log("::No New Data")
  }
}

const sleep = (ms = 1000) => {
  return new Promise(r => setTimeout(r, ms))
};

const start = async () => {
  let maxBlock = await getCurrentBlockNumber() - 100; // ~last 20ish minutes

  const func = async () => {
    const fromBlock = maxBlock;
    const  { recentLogs: compLogs, mostRecentBlock: mrb1 } = await getRecentLogs(CompContract, fromBlock);
    console.log("**************Compound**************")
    processData(COMPOUND, compLogs);

    await sleep(2000); // delay to not hit Etherscan's API limits

    const { recentLogs: uniLogs, mostRecentBlock: mrb2 } = await getRecentLogs(UniContract, fromBlock);
    console.log("**************Uniswap**************")
    processData(UNISWAP, uniLogs);

    maxBlock = Math.max(mrb1, mrb2) + 1;
    console.log("mostRecentBlock:", maxBlock - 1);
  }

  func(); // run on start
  setInterval(func, 1000 * 30) // run every 30 seconds
}

start();
