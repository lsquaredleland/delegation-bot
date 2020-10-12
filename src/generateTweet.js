import Twitter from 'twitter';
import config from './config.js';
var T = new Twitter(config);

import {
  COMPOUND,
  UNISWAP,
} from './data/consts.js';

import {
  fmt
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

const generateStatus = () => {
  const fromDelegate = 'Andre Multisig';
  const toDelegate = 'Gauntlet';
  const amt = 472274.06216579955;
  const level = lossLevel(UNISWAP, amt);
  const ticker = 'UNI'

  const tx = 'https://etherscan.io/tx/0x9c17b77624dd2a7749a1b31e8bf72ffd32d7d4186a582a005189ac3443497163'
  const status = `
    ${emoji(level)} ${fromDelegate} ${emoji(level)} ${lossLabel(level)} ${fmt(amt)} $${ticker} to ${toDelegate}
    \n
    \n${tx}#eventlog
  `;
}

// Could be humorous and always push delegations to Gauntlet :p
// const status = `
//   🙏Thanks to 0x9250b9b5c67618b4753abfa3ee52bc7a13e2b814 who made the right\
//   decision to delegate ${fmt(amt)} $${ticker} from ${fromDelegate} to ${toDelegate}
// `

const generateTweet = (protocol) => {
  postTweet({
    status: generateStatus(),
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
      console.log('Favorited: ', `https://twitter.com/${username}/status/${tweetId}`)
    }
  })
};

export default generateTweet;
