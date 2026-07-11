export const DHUKUTI_PROGRAM = {
  cluster: "devnet",
  programId: "GMhsYxEmeCpKaxqKPzSTmuoEuid6YnbfFJRYBur7ZcmL",
  programData: "vyW7FuSSXARQXAhuLEohpfas8rzVWJAjxwM9tz816hM",
  deploySignature:
    "2jeydVCQo2p9vZktrf7xsYzDoKgujixvikEWghXx6fMJjjzbPNaL8szVG6uFEvqpfmxHGJ7EP2iq86KcSsPfr2YW",
  deployedSlot: "475409129",
} as const;

export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}

export function explorerTransactionUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}
