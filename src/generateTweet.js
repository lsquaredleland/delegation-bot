import {
  COMPOUND,
  UNISWAP,
  ZEROADDRESS,
} from './data/consts.js';

import {
  fmt,
  identifyAddress
} from './utils/helpers.js';

import postTweet from './postTweet.js';


const minVotes = (protocol, amt) => {
  switch (protocol) {
    case UNISWAP:
      return amt > 5000 ? true : false;
    case COMPOUND:
      return amt > 100 ? true : false;
    default:
      return false;
  }
}
const lossLevel = (protocol, amt) => {
  switch (protocol) {
    case UNISWAP:
      if (amt > 1000000) {
        return 4
      } else if (amt > 500000) {
        return 3
      } else if (amt > 100000) {
        return 2
      } else if (amt > 10000) {
        return 1
      }
      return 0
    case COMPOUND:
      if (amt > 100000) {
        return 4
      } else if (amt > 10000) {
        return 3
      } else if (amt > 1000) {
        return 2
      } else if (amt > 100) {
        return 1
      }
      return 0
  }
}

const lossLabel = level => {
  switch (level) {
    case 4:
      return 'suffers a catastrophe of biblical proportions, loses'
    case 3:
      return 'enters a pandemic, loses'
    case 2:
      return 'kneecapped, loses'
    case 1:
      return 'loses'
  }
}

const emoji = level => {
  switch (level) {
    case 4:
      return '🌋🌋'
    case 3:
      return '😭'
    case 2:
      return '🥺'
    case 1:
      return '😂'
  }
}

// Could be humorous and always push delegations to Gauntlet :p
// const status = `
//   🙏Thanks to 0x9250b9b5c67618b4753abfa3ee52bc7a13e2b814 who made the right\
//   decision to delegate ${fmt(amt)} $${ticker} from ${fromDelegate} to ${toDelegate}
// `

const getEtherscanUrl = txHash => {
  return `https://etherscan.io/tx/${txHash}`;
}

const getHandle = protocol => {
  return protocol === UNISWAP ? '@UniswapProtocol' : '@compoundfinance';
}

const getTicker = protocol => {
  return protocol === UNISWAP ? 'UNI' : 'COMP';
};

const deletaDelegateCopy = (dvc, protocol) => {
  const { delegate, previousBalance, newBalance } = dvc;
  const plus = newBalance - previousBalance > 0 ? '+' : '';
  const labeled = identifyAddress(protocol, delegate);
  return `${labeled}: ${plus}${fmt((newBalance - previousBalance) / 1e18)} => ${fmt(newBalance / 1e18)}`
}

// b + c: "AAA transfers tokens to BBB, delegate CCC loses ___ tokens, has ___ remaining" (can be 2c...)
// b + 2c:"AAA transfers tokens to BBB, delegate CCC loses ___ tokens, delegate DDD gains ____"
export const transferDelegateVotesChangedCopy = (protocol, txHash, transfer, dvc, dvc2=null) => {
  const { from, to, amount } = transfer;
  const is2nd = dvc2 !== null;

  const ll = lossLevel(protocol, amount / 1e18);
  if (ll === 0) {
    return;
  }

  const status = `
    ${emoji(ll)} ${identifyAddress(protocol, from)} transfers ${fmt(amount / 1e18)} $${getTicker(protocol)}.
    \n
    \ndelegate${is2nd ? 's' : ''}:\
    \n${deletaDelegateCopy(dvc, protocol)}
    ${is2nd ? '\n' + deletaDelegateCopy(dvc2, protocol) : ''}
    \n${getEtherscanUrl(txHash)}
  `;
  postTweet(status);
}

// Called whenever there is > 1 UNI transfers
export const complexTransactionCopy = (protocol, txHash, dvcs) => {
  const multiDvc = dvcs.length > 1;

  const maxDiff = Math.max(...dvcs.map(d => Math.abs(d.newBalance - d.previousBalance)));

  const ll = lossLevel(protocol, maxDiff / 1e18);
  if (ll === 0) {
    return;
  }

  const status = `
    ${emoji(ll)} $${getTicker(protocol)} transaction.
    \n
    \ndelegate${multiDvc ? 's' : ''}:\
    \n${dvcs.map(d => deletaDelegateCopy(d, protocol)).join('\n')}
    \n${getEtherscanUrl(txHash)}
  `;
  postTweet(status);
}

// a + c: "AAA delegates ___ tokens to AAA, new balance ____" (0x000 address)
// a + c: "AAA transfers ____ tokens delegate from ____ to ____" => may or may not be things here...
export const delegateChangedCopy = (protocol, txHash, dc, dvc, dvc2) => {
  const { delegator, fromDelegate, toDelegate } = dc;
  const { delegate, previousBalance, newBalance } = dvc;
  const ticker = getTicker(protocol);

  const amount = (newBalance - previousBalance) / 1e18; // verify accuracy
  let status = ''

  const ll = lossLevel(protocol, amount);
  if (ll === 0) {
    return;
  }

  const delegatorLabeled = identifyAddress(protocol, delegator);
  const toDelegateLabeled = identifyAddress(protocol, toDelegate);

  // New delegation
  if (fromDelegate === ZEROADDRESS) {
    status = `
      ${delegatorLabeled} delegates ${fmt(amount)} $${ticker} to ${toDelegateLabeled}.
      \n
      \nNew balance of ${fmt(newBalance / 1e18)}
    `;
  }
  else if (toDelegate === ZEROADDRESS) {
    // undelegatng to a 0x0 address is very uncommon
    status = `
      ${delegatorLabeled} undelegates ${fmt(amount)} $${ticker} from ${toDelegateLabeled}.
      \n
      \nNew balance of ${fmt(newBalance / 1e18)}
    `;
  } else { // check that a case is not missing... users could delegate to a 0x0...
    status =  `
      ${delegatorLabeled} redelegates ${fmt(amount)} $${ticker}
      \n
      \nfrom:
      \n${fromBlock}
      \n${deletaDelegateCopy(dvc, protocol)}
      \nto:
      \n${deletaDelegateCopy(dvc2, protocol)}
    `;
  }
  status = `${emoji(ll)}${status}\n${getEtherscanUrl(txHash)}`
  postTweet(status);
}

const postpendUrl = (status, txHash) => {
  return `${status}\n${getEtherscanUrl(txHash)}`
}

// Test on block 10400372 for COMP
export const ProposalCanceledCopy = (protocol, address, txHash, data) => {
  const labeled = identifyAddress(protocol, address);
  const status = `
    🔕$${getTicker(protocol)} Proposal ${data.id} Canceled
    \n
    \nBy ${labeled}
  `;

  postTweet(postpendUrl(status, txHash));
}

// Test data
// https://api.etherscan.io/api?module=logs&action=getLogs&toBlock=latest&address=0xc0dA01a04C3f3E0be433606045bB7017A7323E38&topic0=0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0
export const ProposalCreatedCopy = (protocol, address, txHash, data) => {
  const { proposer, startBlock, endBlock, description } = data;
  const labeled = identifyAddress(protocol, proposer);
  const title = description.split('\n')[0];
  const estimate = Date.now() + (endBlock - startBlock) * 13 * 1000;
  const status = `🏛️Proposal Created - ${title}
    ${getHandle(protocol)}
    \nvoting ends on${endBlock} (~${new Date(estimate).toUTCString()})
    \n
    \nBy ${labeled}
  `;

  postTweet(postpendUrl(status, txHash));
}

// Test on block 11072572 for COMP
export const ProposalExecutedCopy = (protocol, address, txHash, data) => {
  const labeled = identifyAddress(protocol, address);
  const status = `
    🖋️📜$${getTicker(protocol)} Proposal ${data.id} Executed
  `;

  postTweet(postpendUrl(status, txHash));
}

// Test on block 11059503 for COMP
export const ProposalQueuedCopy = (protocol, address, txHash, data) => {
  const labeled = identifyAddress(protocol, address);

  const date = new Date(data.eta * 1000);
  const hoursDiff = (date - Date.now()) / 1000 / 60;

  const status = `
    ⌛$${getTicker(protocol)} Proposal ${data.id} Queued
    \nLive on ${date.toUTCString()} (~${hoursDiff} hours)
  `;

  postTweet(postpendUrl(status, txHash));
}

// call proposals() to get total for + neg votes, u/ to determine if quorum is met
// also note how much time is left for said proposal (via endBlock)
export const VoteCastCopy = (protocol, address, txHash, data) => {
  const { voter, proposalId, support, votes } = data;
  const labeled = identifyAddress(protocol, voter);

  if (minVotes(protocol, votes / 1e18) !== true) {
    return;
  }

  const status = `
    🗳$${getTicker(protocol)} Vote Cast
    \n${labeled} votes ${fmt(votes / 1e18)} $${getTicker(protocol)} \
    ${support ? 'for' : 'against'} proposal ${proposalId}
  `;

  postTweet(postpendUrl(status, txHash));
}
