// Local, device-side record of links this browser created. It is a convenience index for the
// "My links" page — the live truth (amount, claimed/expired) is always re-read from the chain.
export type SentLink = {
  linkAddr: `0x${string}`;
  amount: string; // MON, human string
  expiry: number; // unix seconds
  txHash: string;
  createdAt: number; // unix ms
  demo?: boolean;
};

const KEY = "damla_sent_links";

export function loadSent(): SentLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SentLink[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveSent(entry: SentLink) {
  if (typeof window === "undefined") return;
  const all = loadSent().filter((e) => e.linkAddr.toLowerCase() !== entry.linkAddr.toLowerCase());
  all.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
}
