export const DHUKUTI_PROGRAM = {
  cluster: "devnet",
  programId: "GMhsYxEmeCpKaxqKPzSTmuoEuid6YnbfFJRYBur7ZcmL",
  programData: "vyW7FuSSXARQXAhuLEohpfas8rzVWJAjxwM9tz816hM",
  deploySignature:
    "466kbS1h4ifXXsK4erb7DUzt1xokEyx5msDYgwUxBxoQZsGkw1LKKnqhgm2bQdDSFANw3E53e8hXr68Qrajrvwce",
  deployedSlot: "475226100",
} as const;

export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}

export function explorerTransactionUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}
