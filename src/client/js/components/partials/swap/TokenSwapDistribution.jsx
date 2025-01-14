import React, { Component } from 'react';
import _ from 'underscore';
import TokenIconImg from './../TokenIconImg';
import TokenListManager from '../../../utils/tokenList';
import PathFinder from '../../../utils/pathfinder';

export default class TokenSwapDistribution extends Component {
  state = {
    pools: [],
  };

  renderPool(key, icon, poolWidth) {
    return (
      <div key={key} className="token-dist-pool-wrapper" style={{ width: `${poolWidth * 100.0}%` }}>
        <div className="token-dist-pool">
          <TokenIconImg token={icon} size={25} />
          <span>{Math.round(poolWidth * 100.0)}%</span>
        </div>
      </div>
    );
  }

  componentDidMount() {
    PathFinder.getPools(1).then((pools) => this.setState({ pools }));
  }

  render() {
    var pools = [];
    var network = TokenListManager.getCurrentNetworkConfig();
    var sumOne, sumTwo, sumThree, sumFour, sumFive, parts, totalParts;

    if (this.props.parts) {
      // need to convert to integers
      parts = this.props.parts.map(p => +p);
    }

    if (+network?.chainId === 1) {
      parts = parts || Array(7).fill(0);

      /*
        This returns the destToken output amount and the optimized
        list of distributions accross different liquidity pools.
        There are 7 pools: pool 1 and 2 are Uniswap pools,
        pool 3 and 4 are Sushiswap pools, and pool 5 - 7 are
        Balancer pools. For example, the distribution [1, 0, 2, 0, 0, 0, 0]
        means 1/3 of the swap amount will route to Uniswap and 2/3 will
        route to Sushiswap.[1, 0, 0, 0, 0, 1, 1] means 1/3 of amount
        will route to Uniswap and 2/3 will route to Balancer.
      */

      totalParts = parts.reduce((prev, next) => next + prev, 0);

      pools = parts.map((v, i) => ({
        name: this.state.pools[i],
        icon: this.state.pools[i] ? TokenListManager.findTokenById(this.state.pools[i]) : {},
        size: totalParts === 0 ? 0 : v / totalParts,
      }));
    }

    else if (+network?.chainId === 137) {
      parts = parts || Array(15).fill(0);

      /*
        Supported dexes: Quickswap, Sushiswap, Dyfn, Dinoswap and Apeswap.
        getExpectedReturn funcition returns a list with length of 15,
        evenly distributed among the dexes above.(0-2 are Quickswap, 3-5 are Sushiswap, etc.).
        For example, [10,10,0,0,0,0,0,0,0,0,0,0,0,0,10] means 2/3 to Quickswap and 1/3 to Apeswap.
      */

      sumOne = parts[0] + parts[1] + parts[2]; // Quickswap
      sumTwo = parts[3] + parts[4] + parts[5]; // Sushiswap
      sumThree = parts[6] + parts[7] + parts[8]; // Dfyn
      sumFour = parts[9] + parts[10] + parts[11]; // Dinoswap
      sumFive = parts[12] + parts[13] + parts[14]; // Apeswap
      totalParts = sumOne + sumTwo + sumThree + sumFour + sumFive;

      pools = [
        {
          name: 'Quickswap',
          icon: TokenListManager.findTokenById('QUICK'),
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
        {
          name: 'Dfyn',
          icon: TokenListManager.findTokenById('Dfyn'),
          size: sumThree / totalParts,
        },
        {
          name: 'Dinoswap',
          icon: { logoURI: 'https://dinoswap.exchange/images/dino.png' },
          size: sumFour / totalParts,
        },
        {
          name: 'Apeswap',
          icon: { logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8497.png' },
          size: sumFive / totalParts,
        },
      ];
    }

    else if (+network?.chainId === 56) {
      parts = parts || Array(15).fill(0);
      /*
        Supported dexes: Pancakeswap, Sushiswap, MDEX, Biswap and Apeswap.
        getExpectedReturn funcition returns a list with length of 15,
        evenly distributed among the dexes above.(0-2 are Pancakeswap, 3-5 are Sushiswap, etc.).
        For example, [10,10,0,0,0,0,0,0,0,0,0,0,0,0,10] means 2/3 to Pancakeswap and 1/3 to Apeswap.
      */

      sumOne = parts[0] + parts[1] + parts[2];
      sumTwo = parts[3] + parts[4] + parts[5];
      sumThree = parts[6] + parts[7] + parts[8];
      sumFour = parts[9] + parts[10] + parts[11];
      sumFive = parts[12] + parts[13] + parts[14];
      totalParts = sumOne + sumTwo + sumThree + sumFour + sumFive;

      pools = [
        {
          name: 'Pancakeswap',
          icon: {
            logoURI:
              'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png?1629359065',
          },
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: {
            logoURI: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png?1606986688',
          },
          size: sumTwo / totalParts,
        },
        {
          name: 'Mdex',
          icon: {
            logoURI: 'https://assets.coingecko.com/coins/images/13775/small/mdex.png?1611739676',
          },
          size: sumThree / totalParts,
        },
        {
          name: 'Biswap',
          icon: {
            logoURI: 'https://assets.coingecko.com/coins/images/16845/small/biswap.png?1625388985',
          },
          size: sumFour / totalParts,
        },
        {
          name: 'Apeswap',
          icon: {
            logoURI: 'https://assets.coingecko.com/coins/images/14870/small/banana.png?1638884287',
          },
          size: sumFive / totalParts,
        },
      ];
    }

    else if (+network?.chainId === 43114) {
      parts = parts || Array(6).fill(0);

      /*
        This returns the destToken output amount and the optimized
        list of distributions accross different liquidity pools.
        There are 6 pools: pool 1 and 2 are Pancakeswap pools,
        pool 3 and 4 are Sushiswap pools, and pool 5 - 6 are
        Mdex exchange pools. For example, the distribution
        [1, 0, 2, 0, 0, 0] means 1/3 of the swap amount will route
        to Pancakeswap and 2/3 will route to Sushiswap.[1, 0, 0, 0, 3]
        means 1/3 of amount will route to Pancakeswap and 2/3 will
        route to Mdex.
      */

      sumOne = parts[0] + parts[1];
      sumTwo = parts[2] + parts[3];
      sumThree = parts[4] + parts[5];
      totalParts = sumOne + sumTwo + sumThree;

      pools = [
        {
          name: 'Pangolin',
          icon: TokenListManager.findTokenById('PNG'),
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
        {
          name: 'TraderJoe',
          icon: TokenListManager.findTokenById('JOE'),
          size: sumThree / totalParts,
        },
      ];
    }

    else if (+network?.chainId === 100) {
      parts = parts || Array(16).fill(0);

      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 16 pools: pool 0 - 7 are Honeyswap pools, pool 8-16 are Sushiswap pools.
        For example, the distribution [0,0,0,0,0,0,0,6,0,0,0,0,6,0,0,6]
        means 1/3 of the swap amount will route to Honeyswap and 2/3 will route to Sushiswap..
      */
      sumOne =
        parts[0] +
        parts[1] +
        parts[2] +
        parts[3] +
        parts[4] +
        parts[5] +
        parts[6] +
        parts[7];
      sumTwo =
        parts[8] +
        parts[9] +
        parts[10] +
        parts[11] +
        parts[12] +
        parts[13] +
        parts[14] +
        parts[15];
      totalParts = sumOne + sumTwo;
      pools = [
        {
          name: 'Honeyswap',
          icon: {
            logoURI: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/1190.png',
          },
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
      ];
    }

    else if (+network?.chainId === 250) {
      parts = parts || Array(12).fill(0);

      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 12 pools: pool 0 - 3 are Spookyswap pools, pool 4-7 are Sushiswap pools, pool 8-11 are Spiritswap pools.
        For example, the distribution [3,0,3,0,0,0,0,0,3,0,3,0] means 2/3 of the swap amount will route
        to Spookyswap and 1/3 will route to Sushiswap.[0,0,0,0,2,0,0,0,3,3,2,2] means 1/6 of amount will route
        to Sushiswap and 5/6 will route to Spiritswap.
      */
      sumOne = parts[0] + parts[1] + parts[2] + parts[3];
      sumTwo = parts[4] + parts[5] + parts[6] + parts[7];
      sumThree = parts[8] + parts[9] + parts[10] + parts[11];
      totalParts = sumOne + sumTwo + sumThree;
      pools = [
        {
          name: 'Spookyswap',
          icon: {
            logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/9608.png',
          },
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
        {
          name: 'Spiritswap',
          icon: {
            logoURI: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/1359.png',
          },
          size: sumThree / totalParts,
        },
      ];
    }

    else if (+network?.chainId === 1285) {
      parts = parts || Array(18).fill(0);
      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 18 pools: pool 0 - 5 are Solarbeam pools, pool 6-11 are Sushiswap pools, pool 12-17 are Moonswap pools.
        For example, the distribution ["6","0","6","0","0","0","6","0","0","0","0","0","0","0","0","0","0",0]
        means 2/3 of the swap amount will route to Solarbeam and 1/3 will route to Sushiswap.
        ["0","0","0","0","0","0","3","0","0","0","0","0","6","0","6","0","3",0] means 1/6 of amount will route to Sushiswap and 5/6 will route to Moonswap.
      */
      sumOne = parts[0] + parts[1] + parts[2] + parts[3] + parts[4] + parts[5];
      sumTwo = parts[6] + parts[7] + parts[8] + parts[9] + parts[10] + parts[11];
      sumThree = parts[12] + parts[13] + parts[14] + parts[15] + parts[16] + parts[17];
      totalParts = sumOne + sumTwo + sumThree;
      pools = [
        {
          name: 'Solarbeam',
          icon: TokenListManager.findTokenById('SOLAR'),
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: {
            logoURI: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png?1606986688',
          },
          size: sumTwo / totalParts,
        },
        {
          name: 'Moonswap',
          icon: { logoURI: 'https://d2kfoba0ei9gzz.cloudfront.net/img/51fee159c3456c1168ccfa3f67bd0cad.png' },
          size: sumThree / totalParts,
        },
      ];
    }

    else if (+network?.chainId === 1666600000) {
      parts = parts || Array(12).fill(0);
      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 12 pools: pool 0 - 3 are Mochiswap pools, pool 4-7 are Sushiswap pools, pool 8-11 are Viper Exchange pools.
        For example, the distribution [3,0,3,0,0,0,0,0,3,0,3,0] means 2/3 of the swap amount will route to Mochiswap and 1/3 will route to Sushiswap.
        [0,0,0,0,2,0,0,0,3,3,2,2] means 1/6 of amount will route to Sushiswap and 5/6 will route to Viper Exchange.
      */
      sumOne = parts[0] + parts[1] + parts[2] + parts[3];
      sumTwo = parts[4] + parts[5] + parts[6] + parts[7];
      sumThree = parts[8] + parts[9] + parts[10] + parts[11];
      totalParts = sumOne + sumTwo + sumThree;
      pools = [
        {
          name: 'Mochiswap',
          icon: { logoURI: 'https://assets.coingecko.com/coins/images/14565/small/mochi.png?1617030087' },
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: {
            logoURI: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png?1606986688',
          },
          size: sumTwo / totalParts,
        },
        {
          name: 'Viper Exchange',
          icon: TokenListManager.findTokenById('VIPER'),
          size: sumThree / totalParts,
        },
      ];
    }

    else if (+network?.chainId === 1313161554) {
      parts = parts || Array(18).fill(0);
      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 18 pools: pool 0 - 5 are Trisolaris pools, pool 6 - 11 are Wannaswap pools, pool 12 - 17 are auroraswap pools.
        For example, the distribution [6,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0] means 2/3 of the swap amount will route to Trisolaris and 1/3 will route to Wannaswap.
      */
      sumOne = parts[0] + parts[1] + parts[2] + parts[3] + parts[4] + parts[5];
      sumTwo = parts[6] + parts[7] + parts[8] + parts[9] + parts[10] + parts[11];
      sumThree = parts[12] + parts[13] + parts[14] + parts[15] + parts[16] + parts[17];
      totalParts = sumOne + sumTwo + sumThree;
      pools = [
        {
          name: 'Trisolaris',
          icon: {
            logoURI:
              'https://assets.coingecko.com/coins/images/20607/small/logo_-_2021-11-19T104946.772.png?1637290197',
          },
          size: sumOne / totalParts,
        },
        {
          name: 'Wannaswap',
          icon: { logoURI: 'https://assets.coingecko.com/coins/images/21955/small/wannaswap.PNG?1640337839' },
          size: sumTwo / totalParts,
        },
        {
          name: 'Auroraswap',
          icon: { logoURI: 'https://assets.coingecko.com/markets/images/758/small/auroraswap.png?1640773986' },
          size: sumThree / totalParts,
        },
      ];
    }

    return (
      <div className="token-dist-wrapper" aria-label="Routing distribution for the swap">
        {_.map(
          pools,
          function (v, i) {
            return this.renderPool(i, v.icon, v.size);
          }.bind(this),
        )}
      </div>
    );
  }
}
