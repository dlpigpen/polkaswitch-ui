import _ from "underscore";
import EventManager from './events';
import Wallet from "./wallet";
import TxQueue from './txQueue';
import * as ethers from 'ethers';
import TokenListManager from './tokenList';
import Storage from './storage';
import BN from 'bignumber.js';
import { ApprovalState } from "../constants/Status";

import { BigNumber, constants, providers, Signer, utils } from "ethers";
import { ActiveTransaction, NxtpSdk, NxtpSdkEvents, HistoricalTransaction } from "@connext/nxtp-sdk";
import {
  AuctionResponse,
  ChainData,
  CrosschainTransaction,
  getRandomBytes32,
  Logger,
  TransactionPreparedEvent,
} from "@connext/nxtp-utils";
import { getBalance, getChainName, getExplorerLinkForTx, mintTokens as _mintTokens } from "./nxtpUtils";

// never exponent
BN.config({ EXPONENTIAL_AT: 1e+9 });

let store = require('store');

const REACT_APP_CHAIN_CONFIG = {
  "56":{
    "provider": ["https://api-smart-chain.polkaswitch.com/fff0dd6bf467085a65f5e23ea585adfa5da745e1/"]
  },
  "137":{
    "provider":["https://api-matic.polkaswitch.com/3d041599a52783f163b2515d3ab10f900fc61c01/"]
  }
};

export const chainProviders = {};

Object.entries(REACT_APP_CHAIN_CONFIG).forEach(([chainId, { provider, subgraph, transactionManagerAddress }]) => {
  chainProviders[parseInt(chainId)] = {
    provider: new providers.FallbackProvider(
      provider.map((p) => new providers.StaticJsonRpcProvider(p, parseInt(chainId))),
    ),
    subgraph,
    transactionManagerAddress,
  };
});

export default {
  _queue: {},
  _sdk: false,

  _activeTxs: [],
  _historicalTxs: [],

  _storeKey: () => {
    return `connext_${Wallet.currentAddress()}`;
  },

  initalize: async function() {
    // TODO need to refresh when wallet connects/disconnects
    const signer = Wallet.getProvider().getSigner();

    this._sdk = new NxtpSdk(
      chainProviders, // TODO
      signer,
      new Logger({ level: "info" }),
      process.env.REACT_APP_NETWORK || "mainnet",
    );

    // TODO figure out historical later,
    // need to refresh when wallet connects/disconnects
    // await this.fetchActiveTxs();
    // await this.fetchHistoricalTxs();
    this.attachNxtpSdkListeners(this._sdk);
  },

  fetchActiveTxs: async function() {
    this._activeTxs = await this._sdk.getActiveTransactions();
    console.log("activeTxs: ", this._activeTxs);
  },

  fetchHistoricalTxs: async function() {
    this._historicalTxs = await this._sdk.getHistoricalTransactions();
    console.log("historicalTxs: ", this._historicalTxs);
  },

  attachNxtpSdkListeners: function(_sdk) {
    _sdk.attach(NxtpSdkEvents.SenderTransactionPrepared, (data) => {
      console.log("SenderTransactionPrepared:", data);
      const { amount, expiry, preparedBlockNumber, ...invariant } = data.txData;
      const table = [...activeTransferTableColumns];

      table.push({
        crosschainTx: {
          invariant,
          sending: { amount, expiry, preparedBlockNumber },
        },
        preparedTimestamp: Math.floor(Date.now() / 1000),
        bidSignature: data.bidSignature,
        encodedBid: data.encodedBid,
        encryptedCallData: data.encryptedCallData,
        status: NxtpSdkEvents.SenderTransactionPrepared,
      });
      setActiveTransferTableColumns(table);
    });

    _sdk.attach(NxtpSdkEvents.SenderTransactionFulfilled, (data) => {
      console.log("SenderTransactionFulfilled:", data);
      this.removeActiveTx(data.txData.transactionId)
      this.fetchHistoricalTxs();
    });

    _sdk.attach(NxtpSdkEvents.SenderTransactionCancelled, (data) => {
      console.log("SenderTransactionCancelled:", data);
      this.removeActiveTx(data.txData.transactionId)
      this.fetchHistoricalTxs();
    });

    _sdk.attach(NxtpSdkEvents.ReceiverTransactionPrepared, (data) => {
      console.log("ReceiverTransactionPrepared:", data);
      const { amount, expiry, preparedBlockNumber, ...invariant } = data.txData;
      const index = activeTransferTableColumns.findIndex(
        (col) => col.crosschainTx.invariant.transactionId === invariant.transactionId,
      );

      const table = [...activeTransferTableColumns];
      if (index === -1) {
        // TODO: is there a better way to
        // get the info here?
        table.push({
          preparedTimestamp: Math.floor(Date.now() / 1000),
          crosschainTx: {
            invariant,
            sending: {}, // Find to do this, since it defaults to receiver side info
            receiving: { amount, expiry, preparedBlockNumber },
          },
          bidSignature: data.bidSignature,
          encodedBid: data.encodedBid,
          encryptedCallData: data.encryptedCallData,
          status: NxtpSdkEvents.ReceiverTransactionPrepared,
        });
        setActiveTransferTableColumns(table);
      } else {
        const item = { ...table[index] };
        table[index] = {
          ...item,
          status: NxtpSdkEvents.ReceiverTransactionPrepared,
          crosschainTx: {
            ...item.crosschainTx,
            receiving: { amount, expiry, preparedBlockNumber },
          },
        };
        setActiveTransferTableColumns(table);
      }
    });

    _sdk.attach(NxtpSdkEvents.ReceiverTransactionFulfilled, async (data) => {
      console.log("ReceiverTransactionFulfilled:", data);
      this.updateActiveTx(data.txData.transactionId, NxtpSdkEvents.ReceiverTransactionFulfilled, data, { invariant: data.txData, receiving: data.txData })
      this.removeActiveTx(data.txData.transactionId)
      this.fetchHistoricalTxs();
    });

    _sdk.attach(NxtpSdkEvents.ReceiverTransactionCancelled, (data) => {
      console.log("ReceiverTransactionCancelled:", data);
      this.updateActiveTx(data.txData.transactionId, NxtpSdkEvents.ReceiverTransactionCancelled, data, { invariant: data.txData, receiving: data.txData })
      this.removeActiveTx(data.txData.transactionId);
      this.fetchHistoricalTxs();
    });

    _sdk.attach(NxtpSdkEvents.SenderTokenApprovalMined, (data) => {
      console.log("SenderTokenApprovalMined:", data);
    });

    _sdk.attach(NxtpSdkEvents.SenderTransactionPrepareSubmitted, (data) => {
      console.log("SenderTransactionPrepareSubmitted:", data);
    });
  },

  updateActiveTx: function(transactionId, status, event, crosschainTx) {
    let updated = false;
    this._activeTxs = this._activeTxs.map(item => {
      if (item.crosschainTx.invariant.transactionId === transactionId) {
        if (crosschainTx) {
          item.crosschainTx = Object.assign({}, item.crosschainTx, crosschainTx)
        }
        item.status = status
        item.event = event
        updated = true
      }
      return item;
    })

    if (!updated) {
      this._activeTxs.append({ crosschainTx: crosschainTx, status, event });
    }
    // send event
  },

  removeActiveTx: function(transactionId) {
    this._activeTxs = this._activeTxs.filter((t) => t.crosschainTx.invariant.transactionId !== transactionId);
    // send event
  },

  getTransferQuote: async function (
    sendingChainId,
    sendingAssetId,
    receivingChainId,
    receivingAssetId,
    amount,
    receivingAddress
  ) {
    // Create txid
    const transactionId = getRandomBytes32();

    const response = await this._sdk.getTransferQuote({
      sendingAssetId,
      sendingChainId,
      receivingChainId,
      receivingAssetId,
      receivingAddress,
      amount,
      transactionId,
      expiry: Math.floor(Date.now() / 1000) + 3600 * 24 * 3, // 3 days
    });
    return response;
  },

  transferStepOne: async function (sendingChainIdtransferQuote) {
    if (!transferQuote) {
      throw new Error("Please request quote first");
    }

    if (!Wallet.isConnected()) {
      //if (injectedProviderChainId !== auctionResponse.bid.sendingChainId) {
      return false;
    }

    const transfer = await this._sdk.prepareTransfer(transferQuote, true);
    console.log("transfer: ", transfer);
    // WAIT on Events at this point

    return transfer;
  },

  transferStepTwo: async function({
    bidSignature,
    encodedBid,
    encryptedCallData,
    txData,
  }) {
    const finish = await this._sdk.fulfillTransfer({ bidSignature, encodedBid, encryptedCallData, txData });
    console.log("finish: ", finish);
    if (finish.metaTxResponse?.transactionHash || finish.metaTxResponse?.transactionHash === "") {
      this.removeActiveTx(txData.transactionId)
    }
  },

  getQueue: function() {
    const queue = store.get(this._storeKey()) || {};
    return queue;
  },

  numOfPending: function() {
    return _.keys(this.getQueue()).length;
  },

  getTx: function(nonce) {
    return this.getQueue()[nonce];
  },
};

