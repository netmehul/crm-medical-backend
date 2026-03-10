const formatUSD = (cents) => {
  if (cents === null || cents === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

const toCents = (dollars) => Math.round(parseFloat(dollars) * 100)
const toDollars = (cents) => (cents / 100).toFixed(2)

module.exports = { formatUSD, toCents, toDollars }
