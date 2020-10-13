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

import {
  transferDelegateVotesChangedCopy,
  delegateChangedCopy,
  complexTransactionCopy
} from './generateTweet.js';

import getRecentLogs from './getLogs.js';
import { getCurrentBlockNumber } from './utils/helpers.js';
import Web3EthAbi from 'web3-eth-abi';

import {
  identifyAddress,
  sleep
} from './utils/helpers.js'


const decodeDelegateChanged = (protocol, evt) => {
  return evt && evt.map(log => {
    const { data, topics } = log;
    const { delegator, fromDelegate, toDelegate } = Web3EthAbi.decodeLog(DelegateChangedAbi, data, topics.slice(1))
    console.log('a',
      identifyAddress(protocol, delegator),
      identifyAddress(protocol, fromDelegate), "=>",
      identifyAddress(protocol, toDelegate)
    )
    return { delegator, fromDelegate, toDelegate };
  })
}

const decodeTransfer = (protocol, evt) => {
  return evt && evt.map(log => {
    const { data, topics } = log;
    const { from, to, amount } = Web3EthAbi.decodeLog(TransferAbi, data, topics.slice(1));
    console.log('b',
      identifyAddress(protocol, from), "=>",
      identifyAddress(protocol, to),
      amount / 1e18
    )
    return { from, to, amount };
  })
}

const decodeDelegateVotesChanged = (protocol, evt) => {
  return evt && evt.map(log => {
    const { data, topics } = log;
    const { delegate, previousBalance, newBalance } = Web3EthAbi.decodeLog(DelegateVotesChangedAbi, data, topics.slice(1));
    console.log('c',
      identifyAddress(protocol, delegate),
      newBalance / 1e18 - previousBalance / 1e18,
      previousBalance / 1e18,
      newBalance / 1e18
    )
    return { delegate, previousBalance, newBalance };
  })
}

// Some tx have multiples the below logs, which makes parsing logic difficult...
// 0xfc4f03f3a711ccfa9c8315d7ec15ad7bcd00b9bf6560d8852d8cfb77bc0e3841 (Exchange)\
// 0xe9772bdb37ed918c1368597f149b5d232a6229d1473400d49583960f3b8e1177 (Exchange)
// 0xfa64aff60f16448c135ab0d382ea6df71d5e8c2e8f9168c6073cbba25b4d3a44 (Comp farming)
// Farming tx on COMP... would take max(newBalance) - min(previousBalance) for change
// OR sum on transfer per `to` address
const processData = (protocol, transactions) => {
  transactions.forEach(tx => {
    const { blockNumber, transactionHash } = Object.values(tx)[0][0]
    console.log(blockNumber, '-', transactionHash)

    const delegateChanged = decodeDelegateChanged(protocol, tx[DelegateChanged]);
    const transfer = decodeTransfer(protocol, tx[Transfer]);
    const delegateVotesChanged = decodeDelegateVotesChanged(protocol, tx[DelegateVotesChanged]);

    if (transfer && transfer.length > 1 && delegateVotesChanged) {
      complexTransactionCopy(protocol, transactionHash, delegateVotesChanged)
      return
    }

    if (transfer && delegateVotesChanged) {
      const [ t1 ] = transfer; // naively taking the 1st transfer...
      const [ dvc, dvc2 ] = delegateVotesChanged;
      transferDelegateVotesChangedCopy(protocol, transactionHash, t1, dvc, dvc2);

    }

    if (delegateChanged && delegateVotesChanged) {
      const [ dc ] = delegateChanged;
      const [ dvc, dvc2 ] = delegateVotesChanged;
      delegateChangedCopy(protocol, transactionHash, dc, dvc, dvc2);
    }
  })

  if (transactions.length === 0) {
    console.log("::No New Data")
  }
}

const start = async () => {
  let maxBlock = await getCurrentBlockNumber() - 100; // ~last 20ish minutes

  const func = async () => {
    const fromBlock = maxBlock;
    const  { recentLogs: compLogs, mostRecentBlock: mrb1 } = await getRecentLogs(CompContract, fromBlock);
    console.log("----------------------| Compound |----------------------")
    processData(COMPOUND, compLogs);

    await sleep(2000); // delay to not hit Etherscan's API limits

    const { recentLogs: uniLogs, mostRecentBlock: mrb2 } = await getRecentLogs(UniContract, fromBlock);
    console.log("----------------------| Uniswap |----------------------")
    processData(UNISWAP, uniLogs);

    maxBlock = Math.max(mrb1, mrb2) + 1;
    console.log("mostRecentBlock:", maxBlock - 1);
  }

  func(); // run on start
  setInterval(func, 1000 * 30) // run every 30 seconds
}

start();
