import { Client } from 'discord.js'
import { Context, Telegraf } from 'telegraf'
import { Update } from 'telegraf/typings/core/types/typegram'
import { TwitterApi } from 'twitter-api-v2'
import { apolloClient } from '../clients/apolloClient'
import { Position, Trade } from '../graphql'
import { PostDiscord } from '../integrations/discord'
import { SendTweet } from '../integrations/twitter'
import { GetEns } from '../integrations/ens'
import { leaderboardTradesQuery, positionsQuery } from '../queries'
import { trader } from '../types/trader'
import { DISCORD_ENABLED, TELEGRAM_ENABLED, TESTNET, TWITTER_ENABLED } from '../secrets'
import { NetPremiums, OpenOptionValue } from './helper'
import { PostTelegram } from '../integrations/telegram'
import { dollar } from '../utils/utils'
import { LeaderboardDiscord, LeaderboardTwitter, LeaderboardTelegram } from '../templates/leaderboard'
import { TRADE_CHANNEL } from '../constants/discordChannels'
import Lyra from '@lyrafinance/lyra-js'

async function GetLeaderBoardTrades(): Promise<Trade[]> {
  const trades = (
    await apolloClient.query<{ trades: Trade[] }>({
      query: leaderboardTradesQuery(),
    })
  ).data.trades
  return trades
}

async function GetLeaderBoardPositions(): Promise<Position[]> {
  const positions = (
    await apolloClient.query<{ positions: Position[] }>({
      query: positionsQuery(),
    })
  ).data.positions
  return positions
}

export async function GetTraderStats(address: string, lyra: Lyra) {
  const trades = await GetLeaderBoardTrades()
  const positions = await GetLeaderBoardPositions()
  const owners = Array.from(new Set(Object.values(trades).map((val) => <string>val.trader.toLowerCase())))

  const traders = owners
    .map((owner) => {
      const userTrades = trades.filter((trade) => trade.trader.toLowerCase() === owner)
      const netPremiums = NetPremiums(userTrades)
      const userPositions = positions.filter((position) => position.owner.toLowerCase() === owner)
      const openOptionsValue = userPositions.reduce((sum, position) => {
        const optionValue = OpenOptionValue(position)
        return sum + optionValue
      }, 0)
      const balance = netPremiums + openOptionsValue
      const trader: trader = {
        owner: owner,
        balance: balance,
        netPremiums: netPremiums,
        openOptionsValue: openOptionsValue,
        isProfitable: balance > 0,
        ens: '',
        position: 0,
        netPremiumsFormatted: dollar(netPremiums),
        openOptionsFormatted: openOptionsValue == 0 ? '' : `(${dollar(openOptionsValue)})`,
      }
      return trader
    })
    .sort((a, b) => b.netPremiums - a.netPremiums)
    .slice(0, take)

  await Promise.all(
    traders.map(async (trader, index) => {
      trader.ens = await GetEns(trader.owner)
      trader.position = index + 1
    }),
  )

  return traders
}

export function MapLeaderBoard(leaderboard: trader[], traderAddress: string): trader {
  const EMPTY: trader = {
    owner: '',
    balance: 0,
    netPremiums: 0,
    openOptionsValue: 0,
    isProfitable: false,
    ens: '',
    position: 0,
    netPremiumsFormatted: '',
    openOptionsFormatted: '',
  }

  const index = leaderboard.findIndex((leaderboard) => leaderboard.owner.toLowerCase() === traderAddress.toLowerCase())

  if (index === -1) {
    console.log('Trader not on leaderboard')
    return EMPTY
  }

  return leaderboard[index]
}

export async function BroadcastLeaderBoard(
  discordClient: Client<boolean>,
  twitterClient: TwitterApi,
  telegramClient: Telegraf<Context<Update>>,
) {
  console.log('### Broadcast Leaderboard ###')
  if (DISCORD_ENABLED) {
    const channelName = TESTNET ? 'kovan-trades' : TRADE_CHANNEL
    const embeds = LeaderboardDiscord(global.LYRA_LEADERBOARD.slice(0, 10))
    await PostDiscord(embeds, discordClient, channelName)
  }
  if (TWITTER_ENABLED) {
    const tweet = LeaderboardTwitter(global.LYRA_LEADERBOARD.slice(0, 5))
    await SendTweet(tweet, twitterClient)
  }
  if (TELEGRAM_ENABLED) {
    const post = LeaderboardTelegram(global.LYRA_LEADERBOARD.slice(0, 10))
    await PostTelegram(post, telegramClient)
  }
}
