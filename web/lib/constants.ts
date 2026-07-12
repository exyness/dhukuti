export const DHUKUTI_PROGRAM = {
  cluster: "devnet",
  programId: "FrVMUmF1maCCiCZaVAkGn9mT69kQ5Hbgd9sUvzfmsgvs",
  programData: "vyW7FuSSXARQXAhuLEohpfas8rzVWJAjxwM9tz816hM",
  deploySignature:
    "4NnrJ5ZCseUM3ZaEPmWaTfeAb3Go8yjUJEFTsyhQrbs9EYpxfwMuyRZVToWGorZcoEn7N94gyhCZNhKePUi5rnBg",
  deployedSlot: "475643502",
} as const;

export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}

export function explorerTransactionUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${DHUKUTI_PROGRAM.cluster}`;
}
