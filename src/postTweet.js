import Twitter from 'twitter';
import config from './config.js';
var T = new Twitter(config);


const postTweet = (status) => {
  post({
    status,
    media_ids: '', // NOTE media has to be uploaded separately
  });
};

const post = params => {
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

export default postTweet;
