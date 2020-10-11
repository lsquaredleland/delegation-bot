import {
  COMPOUND,
  UNISWAP,
} from './data/consts.js';

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

import generateTweet from './tweetCopy.js';
import getRecentLogs from './getLogs.js';
import Web3EthAbi from 'web3-eth-abi';

import Twitter from 'twitter';
import config from './config.js';
var T = new Twitter(config);

import {
  identifyAddress
} from './utils/helpers.js'


const processData = d => {
  let bn = 0, txHash = ''
  d.forEach((item, i) => {
    const { data, topics, blockNumber, transactionHash } = item;
    if (blockNumber !== bn) {
      console.log(blockNumber);
      bn = blockNumber;
    }
    if (transactionHash !== txHash) {
      console.log(transactionHash);
      txHash = transactionHash;
    }
    if (topics[0] === UniDelegateChanged) {
      const { delegator, fromDelegate, toDelegate } = Web3EthAbi.decodeLog(DelegateChangedAbi, data, topics.slice(1))
      console.log('a',
        identifyAddress(UNISWAP, delegator),
        identifyAddress(UNISWAP, fromDelegate), "=>",
        identifyAddress(UNISWAP, toDelegate)
      )
    } else if (topics[0] === UniTransfer){
      const { from, to, amount } = Web3EthAbi.decodeLog(TransferAbi, data, topics.slice(1));
      console.log('b',
        identifyAddress(UNISWAP, from), "=>",
        identifyAddress(UNISWAP, to),
        amount / 1e18
      )
    } else if (topics[0] === UniDelegateVotesChanged){
      const { delegate, previousBalance, newBalance } = Web3EthAbi.decodeLog(DelegateVotesChangedAbi, data, topics.slice(1));
      console.log('c',
        identifyAddress(UNISWAP, delegate),
        newBalance / 1e18 - previousBalance / 1e18,
        previousBalance / 1e18,
        newBalance / 1e18
      )
    }
  });
}

processData(await getRecentLogs());

// const params = generateTweet();
//
// T.post('statuses/update', params, (err, response) => {
//   // If the favorite fails, log the error message
//   if(err){
//     console.log(err);
//   }
//   // If the favorite is successful, log the url of the tweet
//   else{
//     let username = response.user.screen_name;
//     let tweetId = response.id_str;
//     console.log('Favorited: ', `https://twitter.com/${username}/status/${tweetId}`)
//   }
// })
