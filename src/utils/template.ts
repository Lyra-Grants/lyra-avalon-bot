import dayjs from 'dayjs'
import { TESTNET, AVALON } from '../utils/secrets'
import { TradeDto } from '../types/tradeDto'
import { MessageEmbed } from 'discord.js'
import { trader } from '../types/trader'
import { shortAddress } from './utils'

const zapperUrl = 'https://zapper.fi/account/'
const debankUrl = 'https://debank.com/profile/'

// TWITTER //
export function TradeTwitter(trade: TradeDto) {
  const post: string[] = []

  post.push(`📈 $${trade.asset} ${FormattedDate(trade.expiry)} ${trade.isCall ? 'Call' : 'Put'} $${trade.strike}\n`)
  post.push(`${trade.isOpen ? '✅ Opened' : '🚫 Closed'} ${trade.isLong ? 'Long' : 'Short'} X ${trade.size}\n`)
  post.push(`💵 ${AmountWording(trade.isLong, trade.isOpen)} $${trade.premium}\n`)
  post.push(`💻 Avalon\n`)
  post.push(`⏰ ${FormattedDate(trade.expiry)}\n`)
  if (ShowProfitAndLoss(trade.positionTradeCount, trade.pnl)) {
    post.push(
      `${trade.isProfitable ? '🟢 ' : '🔴 -'}$${trade.pnl} ${
        trade.isProfitable ? 'Profit' : 'Loss'
      } ${trade.pnlPercent.toFixed(2)}%\n`,
    )
  }
  if (trade.leaderBoard.owner !== '') {
    post.push(
      `${Medal(trade.leaderBoard.position)} #${trade.leaderBoard.position} Trader 💵 $${trade.leaderBoard.balance}\n`,
    )
  }
  post.push(`👨‍ ${trade.ens ? trade.ens : trade.trader}\n`)
  post.push(`${PositionLink(trade)}\n`)
  return post.join('')
}

// TELEGRAM //
export function TradeTelegram(trade: TradeDto) {
  const post: string[] = []
  post.push(`📈 ${trade.asset} ${FormattedDate(trade.expiry)} ${trade.isCall ? 'Call' : 'Put'} $${trade.strike}\n`)
  post.push(`${trade.isOpen ? '✅ Opened' : '🚫 Closed'} ${trade.isLong ? 'Long' : 'Short'} X ${trade.size}\n`)
  post.push(`💵 ${AmountWording(trade.isLong, trade.isOpen)} $${trade.premium}\n`)
  post.push(`💻 Avalon\n`)
  post.push(`⏰ ${FormattedDate(trade.expiry)}\n`)
  if (ShowProfitAndLoss(trade.positionTradeCount, trade.pnl)) {
    post.push(
      `${trade.isProfitable ? '🟢 ' : '🔴 -'}$${trade.pnl} ${
        trade.isProfitable ? 'Profit' : 'Loss'
      } ${trade.pnlPercent.toFixed(2)}%\n`,
    )
  }
  if (trade.leaderBoard.owner !== '') {
    post.push(
      `${Medal(trade.leaderBoard.position)} #${trade.leaderBoard.position} Trader 💵 $${trade.leaderBoard.balance}\n`,
    )
  }
  post.push(`👨‍ <a href='${zapperUrl}${trade.trader}'>${trade.ens ? trade.ens : trade.trader}</a>\n`)
  post.push(`============================\n`)
  post.push(
    `<a href='${EtherScanTransactionLink(trade)}'>Trxn</a> | <a href='${TradeHistoryLink(
      trade,
    )}'>History</a> | <a href='${PositionLink(trade)}'>Position</a> | <a href='${PortfolioLink(
      trade,
    )}'>Portfolio</a>\n`,
  )
  post.push(`============================\n`)
  post.push(`⏱️ ${FormattedDateTime(trade.timeStamp)}\n`)
  return post.join('')
}

// DISCORD //
export function TradeDiscord(trade: TradeDto): MessageEmbed {
  const url = PositionLink(trade)
  const tradeEmbed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle(
      `${trade.isOpen ? '✅' : '🚫'} ${trade.isOpen ? 'Open' : 'Close'} ${trade.isLong ? 'Long' : 'Short'} ${
        trade.size
      } $${trade.asset} $${trade.strike} ${trade.isCall ? 'Call' : 'Put'}`,
    )
    .setURL(`${url}`)

  if (trade.asset == 'ETH') {
    tradeEmbed.setThumbnail('https://avalon.app.lyra.finance/images/ethereum-logo.png')
  }

  if (trade.leaderBoard.owner !== '') {
    tradeEmbed
      .addField(`Leaderboard`, `${Medal(trade.leaderBoard.position)} #${trade.leaderBoard.position} Trader`, true)
      .addField('Total Profit', `$${trade.leaderBoard.balance}`, true)
      .addField('\u200B', '\u200B', true)
  }
  tradeEmbed.addFields(
    {
      name: 'Trade Type',
      value: `${trade.isCall ? '📈' : '📉'} ${trade.isLong ? 'LONG' : 'SHORT'} ${trade.isCall ? 'CALL' : 'PUT'}`,
      inline: true,
    },
    {
      name: 'Strike',
      value: `$${trade.strike}`,
      inline: true,
    },
    {
      name: 'Expiry',
      value: `${FormattedDate(trade.expiry)}`,
      inline: true,
    },
    {
      name: `Premium ${AmountShortWording(trade.isLong, trade.isOpen)}`,
      value: `💵 $${trade.premium}`,
      inline: true,
    },
    {
      name: 'Amount',
      value: `${trade.size}`,
      inline: true,
    },
    {
      name: 'Timestamp',
      value: `${FormattedDateTime(trade.timeStamp)}`,
      inline: true,
    },
  )

  if (ShowProfitAndLoss(trade.positionTradeCount, trade.pnl)) {
    tradeEmbed.addField(
      `${trade.isProfitable ? 'Profit' : 'Loss'}`,
      `${trade.isProfitable ? '🟢 ' : '🔴 -'}$${trade.pnl}`,
      true,
    )
    tradeEmbed.addField(`Percent`, `${trade.pnlPercent.toFixed(2)}%`, true)
  }
  tradeEmbed.addField('Trader', `👨‍ ${trade.ens ? trade.ens : shortAddress(trade.trader)}`, true)
  return tradeEmbed
}

export function ShowProfitAndLoss(positionTradeCount: number, pnl: number): boolean {
  return positionTradeCount > 1 && pnl != 0
}

export function Medal(position: number): string {
  if (position == 1) {
    return '🥇'
  }
  if (position == 2) {
    return '🥈'
  }
  if (position == 3) {
    return '🥉'
  }
  return '🏅'
}

export function AmountWording(isLong: boolean, isOpen: boolean): string {
  const paid = 'Premium Paid'
  const received = "Premium Rec'd"

  if (isOpen) {
    return isLong ? paid : received
  }

  return isLong ? received : paid
}

export function AmountShortWording(isLong: boolean, isOpen: boolean): string {
  const paid = 'Paid'
  const received = "Rec'd"

  if (isOpen) {
    return isLong ? paid : received
  }

  return isLong ? received : paid
}

export function PositionLink(trade: TradeDto): string {
  return `${LyraDappUrl()}/position/${trade.asset}/${trade.positionId}?see=${trade.trader}`
}

export function PortfolioLink(trade: TradeDto) {
  return `${LyraDappUrl()}/portfolio?see=${trade.trader}`
}

export function TradeHistoryLink(trade: TradeDto) {
  return `${LyraDappUrl()}/portfolio/history?see=${trade.trader}`
}

export function EtherScanTransactionLink(trade: TradeDto) {
  return `${EtherScanUrl()}/tx/${trade.transactionHash}`
}

export function FormattedDate(date: Date) {
  return dayjs(date).format('DD MMM YY')
}

export function FormattedDateTime(date: Date) {
  return dayjs(date).format('DD MMM YY | HH:mm')
}

export function EtherScanUrl() {
  if (TESTNET) {
    return 'https://kovan-optimistic.etherscan.io'
  }
  return 'https://optimistic.etherscan.io'
}

export function LyraDappUrl() {
  if (AVALON) {
    return 'https://avalon.app.lyra.finance'
  }
  return 'https://app.lyra.finance'
}

export function LeaderboardDiscord(leaderBoard: trader[]): MessageEmbed[] {
  const tradeEmbed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle(`✅ Top 15 ${TESTNET ? 'Kovan' : 'Avalon'} Profitable Traders 💵 💰 🤑 💸`)
    .setDescription(`Calculated from last 1000 positions. (Open Value)`)
    .addField('Trader', '-----------', true)
    .addField('Premiums', '-----------', true)
    .addField('💵 Profit', '-----------', true)
  //\u200b
  leaderBoard.slice(0, 5).map((trader) => {
    return leaderBoardRow(tradeEmbed, trader)
  })

  const tradeEmbed2 = new MessageEmbed()
    .setColor('#0099ff')
    .setDescription(`---------------------------------------------------------------`)
  leaderBoard.slice(5, 10).map((trader) => {
    return leaderBoardRow(tradeEmbed2, trader)
  })

  // const tradeEmbed3 = new MessageEmbed()
  //   .setColor('#0099ff')
  //   .setDescription(`---------------------------------------------------------------`)
  // leaderBoard.slice(10, 15).map((trader) => {
  //   return leaderBoardRow(tradeEmbed3, trader)
  // })

  return [tradeEmbed, tradeEmbed2]
}

export function leaderBoardRow(tradeEmbed: MessageEmbed, trader: trader): MessageEmbed {
  return tradeEmbed
    .addField(
      `${Medal(trader.position)} #${trader.position}`,
      `${trader.ens ? trader.ens : shortAddress(trader.owner)}`,
      true,
    )
    .addField(`$${trader.netPremiums.toFixed(2)}`, `($${trader.openOptionsValue.toFixed()})`, true)
    .addField(`$${trader.balance.toFixed(2)}`, '\u200b', true)
}
