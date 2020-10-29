import {
  DelegateVotesChangedAbi,
  DelegateChangedAbi,
  TransferAbi,
  ProposalCanceledAbi,
  ProposalCreatedAbi,
  ProposalExecutedAbi,
  ProposalQueuedAbi,
  VoteCastAbi,
} from '../data/abi.js';

import {
  identifyAddress
} from '../utils/helpers.js'

import Web3EthAbi from 'web3-eth-abi';


export const decodeDelegateChanged = (protocol, evt) => {
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

export const decodeTransfer = (protocol, evt) => {
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

export const decodeDelegateVotesChanged = (protocol, evt) => {
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

export const decodeProposalCanceled = (data, topics) => {
  const { id } = Web3EthAbi.decodeLog(ProposalCanceledAbi, data, topics.slice(1));
  return { id };
}

export const decodeProposalCreated = (data, topics) => {
  const {
    startBlock, endBlock, description, proposer,
    //targets, values, signatures, calldatas,
  } = Web3EthAbi.decodeLog(ProposalCreatedAbi, data, topics.slice(1));
  return { startBlock, endBlock, description, proposer };
}

export const decodeProposalExecuted = (data, topics) => {
  const { id } = Web3EthAbi.decodeLog(ProposalExecutedAbi, data, topics.slice(1));
  return { id };
}

export const decodeProposalQueued = (data, topics) => {
  const { id, eta } = Web3EthAbi.decodeLog(ProposalQueuedAbi, data, topics.slice(1));
  return { id, eta };
}

export const decodeVoteCast = (data, topics) => {
  const { voter, proposalId, support, votes } = Web3EthAbi.decodeLog(VoteCastAbi, data, topics.slice(1));
  return { voter, proposalId, support, votes };
}
