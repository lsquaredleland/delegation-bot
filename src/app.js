import {
  COMPOUND,
  UNISWAP,
} from './data/consts.js';

import {
  DelegateChanged,
  DelegateVotesChanged,
  Transfer,
  ProposalCanceled,
  ProposalCreated,
  ProposalExecuted,
  ProposalQueued,
  VoteCast,
} from './data/events.js';

import {
  UniContract,
  CompContract,
  UniGovContract,
  CompGovContract,
} from './data/contracts.js';

import {
  decodeDelegateChanged,
  decodeTransfer,
  decodeDelegateVotesChanged,
  decodeProposalCanceled,
  decodeProposalCreated,
  decodeProposalExecuted,
  decodeProposalQueued,
  decodeVoteCast,
} from './utils/decode.js'

import {
  transferDelegateVotesChangedCopy,
  delegateChangedCopy,
  complexTransactionCopy,
  ProposalCanceledCopy,
  ProposalCreatedCopy,
  ProposalExecutedCopy,
  ProposalQueuedCopy,
  VoteCastCopy,
} from './generateTweet.js';

import { getRecentLogs, getRecentGovernanceLogs } from './getLogs.js';
import { getCurrentBlockNumber } from './utils/helpers.js';

import { sleep } from './utils/helpers.js'


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

    // Temporary hack
    if (transfer && transfer.length > 1 && delegateVotesChanged) {
      complexTransactionCopy(protocol, transactionHash, delegateVotesChanged)
      return
    }

    if (transfer && delegateVotesChanged) {
      const [ t1 ] = transfer;
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

// Inject tweets here
const decodeGovLog = log => {
  const { data, topics, address, transactionHash } = log
  switch (topics[0]) {
    case ProposalCanceled:
      console.log('🔕ProposalCanceled', transactionHash);
      return [ProposalCanceled, decodeProposalCanceled(data,topics)];
    case ProposalCreated:
      console.log('🏛️ProposalCreated', transactionHash);
      return [ProposalCreated, decodeProposalCreated(data,topics)];
    case ProposalExecuted:
      console.log('🖋️📜ProposalExecuted', transactionHash);
      return [ProposalExecuted, decodeProposalExecuted(data,topics)];
    case ProposalQueued:
      console.log('⌛ProposalQueued', transactionHash);
      return [ProposalQueued, decodeProposalQueued(data,topics)];
    case VoteCast:
      console.log('🗳VoteCast️', transactionHash);
      return [VoteCast, decodeVoteCast(data,topics)];
  }
}

const processGovLogs = (protocol, logs) => {
  logs.forEach(log => {
    const { address, transactionHash } = log;

    const [ type, data ] = decodeGovLog(log);

    switch (type) {
      case ProposalCanceled:
        ProposalCanceledCopy(protocol, address, transactionHash, data);
        break;
      // case ProposalCreated:
      //   ProposalCreatedCopy(protocol, address, transactionHash, data);
      //   break;
      case ProposalExecuted:
        ProposalExecutedCopy(protocol, address, transactionHash, data);
        break;
      case ProposalQueued:
        ProposalQueuedCopy(protocol, address, transactionHash, data);
        break;
      // case VoteCast:
      //   VoteCastCopy(protocol, address, transactionHash, data);
      //   break;
    }
  });

}

const start = async () => {
  let maxBlock = await getCurrentBlockNumber() - 100; // ~last 20ish minutes

  const func = async () => {
    const fromBlock = maxBlock;
    const {
      recentLogs: compLogs,
      mostRecentBlock: mrb1
    } = await getRecentLogs(CompContract, fromBlock);
    console.log("----------------------| Compound |----------------------")
    processData(COMPOUND, compLogs);
    const compGovLogs = await getRecentGovernanceLogs(CompGovContract, fromBlock);
    processGovLogs(COMPOUND, compGovLogs)

    await sleep(2000); // delay to not hit Etherscan's API limits

    const {
      recentLogs: uniLogs,
      mostRecentBlock: mrb2
    } = await getRecentLogs(UniContract, fromBlock);
    console.log("----------------------| Uniswap |----------------------")
    processData(UNISWAP, uniLogs);

    const uniGovLogs = await getRecentGovernanceLogs(UniGovContract, fromBlock);
    processGovLogs(UNISWAP, uniGovLogs)

    maxBlock = Math.max(mrb1, mrb2) + 1;
    console.log("mostRecentBlock:", maxBlock - 1);
  }

  func(); // run on start
  setInterval(func, 1000 * 30) // run every 30 seconds
}

start();
