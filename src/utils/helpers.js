import {
  CompDelegates,
  UniDelegates,
} from '../data/mapping.js';

import {
  COMPOUND,
  UNISWAP,
} from '../data/consts.js';

import axios from 'axios';
import web3 from 'web3';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;


export const identifyAddress = (protocol, address) => {
  const addressLower = address.toLowerCase();
  switch (protocol) {
    case COMPOUND:
      return CompDelegates[addressLower] || addressLower;
    case UNISWAP:
      return UniDelegates[addressLower] || addressLower;
    return address;
  };
};

export const getCurrentBlockNumber = async () => {
  const url =`https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${ETHERSCAN_API_KEY}`
  return await axios.get(url)
    .then(response => {
      return web3.utils.hexToNumber(response.data.result);
    })
    .catch(err => {
      console.log(err);
      return null;
    });
};

export const fmt = num => {
  return num.toString().split('.')[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};

export const sleep = (ms = 1000) => {
  return new Promise(r => setTimeout(r, ms));
};

export const objectMap = (obj, fn) => {
  return Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  )
};

export const removeEmpty = obj =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([k, v]) => v != null)
      .map(([k, v]) => (typeof v === "object" ? [k, removeEmpty(v)] : [k, v]))
  );
