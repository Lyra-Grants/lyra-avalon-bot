import dayjs from 'dayjs'
import dayjsPluginUTC from 'dayjs/plugin/utc'
import { TESTNET, AVALON } from '../secrets'
import { TradeDto } from '../types/tradeDto'

export const zapperUrl = 'https://zapper.fi/account/'
export const debankUrl = 'https://debank.com/profile/'

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

export function AmountWording(isLong: boolean, isOpen: boolean, isLiquidation: boolean): string {
  if (isLiquidation) {
    return 'Amount'
  }
  const paid = 'Premium Paid'
  const received = "Premium Rec'd"

  if (isOpen) {
    return isLong ? paid : received
  }

  return isLong ? received : paid
}

export function AmountShortWording(isLong: boolean, isOpen: boolean, isLiquidation: boolean): string {
  if (isLiquidation) {
    return 'Amount'
  }

  const paid = 'Premium Paid'
  const received = "Premium Rec'd"

  if (isOpen) {
    return isLong ? paid : received
  }

  return isLong ? received : paid
}

export function PositionLink(trade: TradeDto): string {
  return `${LyraDappUrl()}/position/${trade.asset}/${trade.positionId}?see=${trade.trader}`
}

export function PortfolioLink(address: string) {
  return `${LyraDappUrl()}/portfolio?see=${address}`
}

export function TradeHistoryLink(trade: TradeDto) {
  return `${LyraDappUrl()}/portfolio/history?see=${trade.trader}`
}

export function EtherScanTransactionLink(transactionHash: string) {
  return `${EtherScanUrl()}/tx/${transactionHash}`
}

export function FormattedDate(date: Date) {
  dayjs.extend(dayjsPluginUTC)
  return dayjs(date).utc().format('DD MMM YY')
}

export function FormattedDateTime(date: Date) {
  dayjs.extend(dayjsPluginUTC)
  return dayjs(date).utc().format('MMM-DD-YY HH:mm:ss') + ' UTC'
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

export function TradeShareImage(trade: TradeDto) {
  return `${LyraDappUrl()}/position/image/${trade.asset}/${trade.positionId}`
}

export function FN(value: number, decimals: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
