export const DHUKUTI_PROGRAM = {
  cluster: "devnet",
  programId: "GMhsYxEmeCpKaxqKPzSTmuoEuid6YnbfFJRYBur7ZcmL",
  programData: "vyW7FuSSXARQXAhuLEohpfas8rzVWJAjxwM9tz816hM",
  deploySignature:
    "4FEzrfRZt3Cu57HpRLirmmJ8erM7BnG7bxyLt3CB67eFdoVNEtyyem6XWmtXLpYJYJKSD5psfb5J5cjzjGPmpMtH",
  deployedSlot: "475568399",
} as const;

export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}

export function explorerTransactionUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}
