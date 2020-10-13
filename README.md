# Delegate Bot

Every time there is a large change in delegation for [Uniswap](http://uniswap.io/) or [Compound Finance](https://compound.finance), this bot will tweet via [@dele_rekt](https://twitter.com/dele_rekt) on Twitter. Note that this app covers general cases of `DelegateChanged` and `DelegateVotesChanged` events well, but often complex transactions that involve multiple events are not handled gracefully.

## Corner cases to handle
- COMP farming results in multiple `delegateVotesChanged()` when claiming COMP...
- Multiple transfers to different addresses all with different delegates...

## Additional Tweet Content
- Show a graph representing how many tokens were lost
- Current ranking of delegate
- Value at time of delegation (can approximate from Uniswap prices)
- If there is a transfer, where are the assets going (exchanges? lending markets?)

## Features to consider
- Daily / weekly summary (large changes)
- Daily leaderboard of recent changes

### Misc to learn
- What is the best way to store state in a node app? Or is the better approach to connect to an external database?
