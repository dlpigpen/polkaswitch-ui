/* eslint-disable react/prop-types */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import BN from 'bignumber.js';
import TokenIconBalanceGroupView from '../TokenIconBalanceGroupView';
import TokenSwapDistribution from './TokenSwapDistribution';
import SwapTransactionDetails from './SwapTransactionDetails';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import SwapFn from '../../../utils/swapFn';
import { approvalState } from '../../../constants';

export default class SwapConfirmSlide extends Component {
  constructor(props) {
    super(props);
    this.state = { loading: false };

    this.handleConfirm = this.handleConfirm.bind(this);
    this.handleBack = this.handleBack.bind(this);
  }

  componentDidMount() {
    this.subWalletUpdated = EventManager.listenFor(
      'walletUpdated',
      this.handleWalletChange,
    );
  }

  componentWillUnmount() {
    this.subWalletUpdated.unsubscribe();
  }

  handleBack(e) {
    if (!this.state.loading) {
      this.props.handleBackOnConfirm();
    }
  }

  handleConfirm() {
    this.setState(
      {
        loading: true,
      },
      () => {
        console.log('Debug Crash: ', this.props.fromAmount, this.props.from);
        const fromAmountBN = window.ethers.utils.parseUnits(
          this.props.fromAmount,
          this.props.from.decimals,
        );

        if (this.props.approveStatus === approvalState.APPROVED) {
          const distBN = _.map(this.props.swapDistribution, (e) =>
            window.ethers.utils.parseUnits(`${e}`, 'wei'),
          );

          SwapFn.performSwap(
            this.props.from,
            this.props.to,
            fromAmountBN,
            distBN,
          )
            .then((nonce) => {
              console.log(nonce);

              this.props.handleTransactionComplete(true, nonce);

              Metrics.track('swap-complete', {
                from: this.props.from,
                to: this.props.to,
                fromAmont: this.props.fromAmount,
              });

              this.setState({
                loading: false,
              });
            })
            .catch((e) => {
              console.error('#### swap failed from catch ####', e);

              this.props.handleTransactionComplete(false, undefined);

              this.setState({
                loading: false,
              });
            });
        } else {
          SwapFn.performApprove(this.props.from, fromAmountBN)
            .then((confirmedTransaction) => {
              Metrics.track('approve-complete', {
                from: this.props.from,
                fromAmount: this.props.fromAmount,
              });

              this.setState({
                loading: false,
              });
              this.props.onApproveComplete(approvalState.APPROVED);
            })
            .catch((e) => {
              console.error('#### approve failed from catch ####', e);
              console.error(e);
              this.setState({
                loading: false,
              });
            });
        }
      },
    );
  }

  displayValue(token, amount) {
    return BN(BN(amount).toPrecision(18)).toString();
  }

  hasSufficientBalance() {
    if (this.props.availableBalance) {
      const balBN = BN(this.props.availableBalance);
      const fromBN = BN(this.props.fromAmount);
      return fromBN.lte(balBN);
    }
    return false;
  }

  allowSwap() {
    return !this.state.loading && this.hasSufficientBalance();
  }

  render() {
    if (!this.props.toAmount || !this.props.fromAmount) {
      return <div />;
    }

    return (
      <div className="page page-stack">
        <div className="page-inner">
          <div className="level is-mobile">
            <div className="level-left">
              <div className="level-item">
                <div className="level-item">
                  <span
                    className="icon ion-icon clickable"
                    onClick={this.handleBack}
                  >
                    <ion-icon name="arrow-back-outline" />
                  </span>
                </div>
              </div>
              <div className="level-item">
                <b className="widget-title">Review Order</b>
              </div>
            </div>
          </div>

          <hr />

          <div className="text-gray-stylized">
            <span>You Pay</span>
          </div>

          <div className="level is-mobile">
            <div className="level-left">
              <TokenIconBalanceGroupView
                token={this.props.from}
                refresh={this.props.refresh}
              />
            </div>

            <div className="level-right">
              <div className="level-item">
                <div>
                  <div className="currency-text">
                    {this.displayValue(this.props.from, this.props.fromAmount)}
                  </div>
                  <div
                    className={classnames(
                      'fund-warning has-text-danger has-text-right',
                      {
                        'is-hidden': this.hasSufficientBalance(),
                      },
                    )}
                  >
                    <span className="icon">
                      <ion-icon name="warning-outline" />
                    </span>
                    <span>Insufficient funds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr />

          <div className="text-gray-stylized">
            <span>You Receive</span>
          </div>

          <div className="level is-mobile">
            <div className="level-left">
              <TokenIconBalanceGroupView
                token={this.props.to}
                refresh={this.props.refresh}
              />
            </div>

            <div className="level-right">
              <div className="level-item">
                <div className="currency-text">
                  {this.displayValue(this.props.to, this.props.toAmount)}
                </div>
              </div>
            </div>
          </div>

          <hr />

          <SwapTransactionDetails
            to={this.props.to}
            from={this.props.from}
            toAmount={this.props.toAmount}
            fromAmount={this.props.fromAmount}
            swapDistribution={this.props.swapDistribution}
          />

          <div
            className={classnames('hint--large', 'token-dist-expand-wrapper', {
              'hint--top': this.props.swapDistribution,
              expand: this.props.swapDistribution,
            })}
            aria-label="We have queried multiple exchanges to find the best possible pricing for this swap. The below routing chart shows which exchanges we used to achieve the best swap."
          >
            <div className="token-dist-hint-text">
              <span>Routing Distribution</span>
              <span className="hint-icon">?</span>
            </div>
            <TokenSwapDistribution parts={this.props.swapDistribution} />
          </div>
          <div>
            <button
              type="button"
              className={classnames(
                'button is-primary is-fullwidth is-medium',
                {
                  'is-loading': this.state.loading,
                },
              )}
              disabled={!this.allowSwap()}
              onClick={this.handleConfirm}
            >
              {this.props.approveStatus === approvalState.APPROVED
                ? 'Swap'
                : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
