import Twitter from 'twitter';
import config from './config.js';
var T = new Twitter(config);

import {
  COMPOUND,
  UNISWAP,
} from './data/consts.js';

import {
  fmt,
  identifyAddress
} from './utils/helpers.js';


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

const delegateCopy = (dvc, protocol) => {
  const { delegate, previousBalance, newBalance } = dvc;
  const plus = newBalance - previousBalance > 0 ? '+' : '';
  const labeled = identifyAddress(protocol, delegate);
  return `${labeled}: ${plus}${fmt((newBalance - previousBalance) / 1e18)} => ${fmt(newBalance / 1e18)}`
}

// b + c: "AAA transfers tokens to BBB, delegate CCC loses ___ tokens, has ___ remaining" (can be 2c...)
// b + 2c:"AAA transfers tokens to BBB, delegate CCC loses ___ tokens, delegate DDD gains ____"
export const transferDelegateVotesChangedCopy = (protocol, txHash, transfer, dvc, dvc2=null) => {
  const { from, to, amount } = transfer;
  const ticker = protocol === UNISWAP ? 'UNI' : 'COMP';
  const is2nd = dvc2 !== null;

  if (lossLevel(protocol, amount / 1e18) === 0) {
    return;
  }

  const status = `
    ${identifyAddress(protocol, from)} transfers ${fmt(amount / 1e18)} $${ticker}.
    \n
    \ndelegate${is2nd ? 's' : ''}:\
    \n${delegateCopy(dvc, protocol)}
    ${is2nd ? '\n' + delegateCopy(dvc2, protocol) : ''}
    \n${getEtherscanUrl(txHash)}
  `;
  generateTweet(status);
}

// Called whenever there is > 1 UNI transfers
export const complexTransactionCopy = (protocol, txHash, dvcs) => {
  const ticker = protocol === UNISWAP ? 'UNI' : 'COMP';
  const multiDvc = dvcs.length > 1;

  const maxDiff = Math.max(dvcs.map(dvc => Math.abs(newBalance - previousBalance)));

  if (lossLevel(protocol, maxDiff / 1e18) === 0) {
    return;
  }

  const status = `
    $${ticker} transaction.
    \n
    \ndelegate${multiDvc ? 's' : ''}:\
    \n${dvcs.map(d => delegateCopy(d, protocol)).join('\n')}
    \n${getEtherscanUrl(txHash)}
  `;
  generateTweet(status);
}

// a + c: "AAA delegates ___ tokens to AAA, new balance ____" (0x000 address)
// a + c: "AAA transfers ____ tokens delegate from ____ to ____" => may or may not be things here...
export const delegateChangedCopy = (protocol, txHash, dc, dvc, dvc2) => {
  const { delegator, fromDelegate, toDelegate } = dc;
  const { delegate, previousBalance, newBalance } = dvc;
  const ticker = protocol === UNISWAP ? 'UNI' : 'COMP';

  const amount = (newBalance - previousBalance) / 1e18; // verify accuracy
  let status = ''

  if (lossLevel(protocol, amount) === 0) {
    return;
  }

  const delegatorLabeled = identifyAddress(protocol, delegator);
  const toDelegateLabeled = identifyAddress(protocol, toDelegate);

  // New delegation
  if (fromDelegate === '0x0000000000000000000000000000000000000000') {
    status = `${delegatorLabeled} delegates ${fmt(amount)} $${ticker} to ${toDelegateLabeled}.
      \n
      \nNew balance of ${fmt(newBalance / 1e18)}
    `;
  }
  else if (toDelegate === '0x0000000000000000000000000000000000000000') {
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
      \n${delegateCopy(dvc, protocol)}
      \nto:
      \n${delegateCopy(dvc2, protocol)}
    `;
  }
  status = `${status}\n${getEtherscanUrl(txHash)}`
  generateTweet(status);
}

const generateTweet = (status) => {
  postTweet({
    status,
    media_ids: '', // NOTE media has to be uploaded separately
  });
};

const postTweet = params => {
  T.post('statuses/update', params, (err, response) => {
    // If the favorite fails, log the error message
    if (err) {
      console.log(err);
    } else {
      let username = response.user.screen_name;
      let tweetId = response.id_str;
      console.log('posted: ', `https://twitter.com/${username}/status/${tweetId}`)
    }
  })
};
