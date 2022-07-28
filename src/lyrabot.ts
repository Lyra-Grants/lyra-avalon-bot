import { RunTradeBot } from './lyra/trades'
import { BroadcastLeaderBoard, GetLeaderBoard } from './lyra/leaderboard'
import { DISCORD_ACCESS_TOKEN, DISCORD_ENABLED, TELEGRAM_ENABLED, TESTNET, TWITTER_ENABLED } from './secrets'
import { DiscordClient } from './clients/discordClient'
import { Client, TextChannel } from 'discord.js'
import { TwitterApi } from 'twitter-api-v2'
import { Context, Telegraf } from 'telegraf'
import { Update } from 'telegraf/typings/core/types/typegram'
import { defaultActivity, defaultName } from './integrations/discord'
import { TwitterClient } from './clients/twitterClient'
import { TelegramClient } from './clients/telegramClient'
import { Job, scheduleJob } from 'node-schedule'
import Lyra, { Deployment } from '@lyrafinance/lyra-js'
import { maketrade } from './actions/maketrade'
import { ethers } from 'ethers'
import { TestWallet } from './wallets/wallet'
import faucet from './actions/faucet'

import { TrackTokenMoves } from './token/tracker'
import { GetPrice } from './integrations/coingecko'
import { LeaderboardDiscord } from './templates/leaderboard'
import { BroadCastStats, GetStats } from './lyra/stats'
import { StatDiscord } from './templates/stats'
import { STATS_CHANNEL, TRADE_CHANNEL } from './constants/discordChannels'
import { HelpDiscord, LyraDiscord, QuantDiscord } from './templates/help'
import { GetLyra } from './lyra/lyra'
import { GetTrader, GetTraderStats } from './lyra/trader'

let discordClient: Client<boolean>
let twitterClient: TwitterApi
let telegramClient: Telegraf<Context<Update>>
let lyraClient: Lyra

export async function initializeLyraBot() {
  let deployment: Deployment
  if (TESTNET) {
    deployment = Deployment.Kovan
  } else {
    deployment = Deployment.Mainnet
  }
  lyraClient = new Lyra(deployment)

  if (TESTNET) {
    //const signer = new ethers.Wallet(TestWallet().privateKey, lyraClient.provider)
    //faucet(lyraClient, signer)
    //maketrade(lyraClient, signer)
  }
  global.ETH_24HR = 0
  global.ETH_PRICE = 0
  await GetPrice()
  await SetUpDiscord()
  await SetUpTwitter()
  await SetUpTelegram()

  global.LYRA_ENS = {}
  global.LYRA_LEADERBOARD = await GetLeaderBoard(30)

  await RunTradeBot(discordClient, twitterClient, telegramClient, lyraClient)
  //await TrackTokenMoves(discordClient, lyraClient)

  //Changing usernames in Discord is heavily rate limited, with only 2 requests every hour.
  const pricingJob: Job = scheduleJob('*/30 * * * *', async () => {
    console.log('30 min pricing job running')
    await GetPrice()
    defaultActivity(discordClient)
    await defaultName(discordClient)
  })

  // Monday / Wednesday / Friday (as this resets each build)
  const leadeboardJob: Job = scheduleJob('0 0 * * 1,3,5', async () => {
    global.LYRA_LEADERBOARD = await GetLeaderBoard(30)
    await BroadcastLeaderBoard(discordClient, twitterClient, telegramClient)
  })

  const statsJob: Job = scheduleJob('0 1 * * 1,3,5', async () => {
    const statsDto = await GetStats('eth', lyraClient)
    await BroadCastStats(statsDto, twitterClient, telegramClient, discordClient)
  })
}

export async function SetUpDiscord() {
  if (DISCORD_ENABLED) {
    discordClient = DiscordClient
    discordClient.on('ready', async (client) => {
      console.debug('Discord bot is online!')
    })

    discordClient.on('interactionCreate', async (interaction) => {
      if (!interaction.isCommand()) return

      const tradeChannel = interaction?.guild?.channels.cache.find((channel) => channel.name === TRADE_CHANNEL)
      const statsChannel = interaction?.guild?.channels.cache.find((channel) => channel.name === STATS_CHANNEL)

      const channelName = (interaction?.channel as TextChannel).name
      const { commandName } = interaction

      if (commandName === 'leaderboard') {
        if (channelName === TRADE_CHANNEL) {
          if (interaction) global.LYRA_LEADERBOARD = await GetLeaderBoard(30)
          const post = LeaderboardDiscord(global.LYRA_LEADERBOARD.slice(0, 10))
          await interaction.reply({ embeds: post })
        } else {
          await interaction.reply(`Command 'leaderboard' only available in <#${tradeChannel?.id}>`)
        }
      }
      if (commandName === 'top30') {
        if (channelName === TRADE_CHANNEL) {
          global.LYRA_LEADERBOARD = await GetLeaderBoard(30)
          const post = LeaderboardDiscord(global.LYRA_LEADERBOARD)
          await interaction.reply({ embeds: post })
        } else {
          await interaction.reply(`Command 'top30' only available in <#${tradeChannel?.id}>`)
        }
      }
      if (commandName === 'stats') {
        if (channelName === STATS_CHANNEL) {
          const statsDto = await GetStats(interaction.options.getString('market') as string, lyraClient)
          const stats = StatDiscord(statsDto)
          await interaction.reply({ embeds: stats })
        } else {
          await interaction.reply(`Command 'stats' only available in <#${statsChannel?.id}>`)
        }
      }
      if (commandName === 'help') {
        if (channelName === STATS_CHANNEL || channelName === TRADE_CHANNEL) {
          const help = HelpDiscord()
          await interaction.reply(help)
        } else {
          await interaction.reply(`Command 'help' only available in <#${statsChannel?.id}> or <#${tradeChannel?.id}> `)
        }
      }
      if (commandName === 'lyra') {
        if (channelName === STATS_CHANNEL || channelName === TRADE_CHANNEL) {
          const lyraDto = await GetLyra()
          const embed = LyraDiscord(lyraDto)
          await interaction.reply({ embeds: embed })
        } else {
          await interaction.reply(`Command 'lyra' only available in <#${statsChannel?.id}> or <#${tradeChannel?.id}> `)
        }
      }
      if (commandName === 'quant') {
        if (channelName === STATS_CHANNEL || channelName === TRADE_CHANNEL) {
          const embed = QuantDiscord()
          await interaction.reply({ embeds: embed })
        } else {
          await interaction.reply(`Command 'quant' only available in <#${statsChannel?.id}> or <#${tradeChannel?.id}> `)
        }
      }
      if (commandName === 'trader') {
        if (channelName === STATS_CHANNEL) {
          const traderDto = await GetTraderStats(interaction.options.getString('address') as string, lyraClient)

          const stats = StatDiscord(statsDto)
          await interaction.reply({ embeds: stats })
        } else {
          await interaction.reply(`Command 'stats' only available in <#${statsChannel?.id}>`)
        }
      }
    })

    await discordClient.login(DISCORD_ACCESS_TOKEN)

    defaultActivity(discordClient)
    await defaultName(discordClient)
  }
}

export async function SetUpTwitter() {
  if (TWITTER_ENABLED) {
    twitterClient = TwitterClient
    twitterClient.readWrite
  }
}

export async function SetUpTelegram() {
  if (TELEGRAM_ENABLED) {
    telegramClient = TelegramClient
  }
}
