"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { publicClient } from "@/lib/damla";
import { GIFT_CONTRACT, GIFT_ABI } from "@/lib/contract";

// A slim, live banner: reads the on-chain gift counter and invites early users to claim.
// Hidden once every gift is gone, so it never lingers as dead UI.
export function GiftBanner() {
  const [claimed, setClaimed] = useState<number | null>(null);
  const [max, setMax] = useState<number>(20);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [c, m] = await Promise.all([
          publicClient.readContract({ address: GIFT_CONTRACT, abi: GIFT_ABI, functionName: "claimedCount" }),
          publicClient.readContract({ address: GIFT_CONTRACT, abi: GIFT_ABI, functionName: "MAX" }),
        ]);
        if (alive) {
          setClaimed(Number(c));
          setMax(Number(m));
        }
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (claimed !== null && claimed >= max) return null;

  return (
    <Link href="/gift" className="gift-banner reveal">
      <span className="gb-left">
        <span className="gb-gift">🎁</span>
        <span>
          <span className="gb-title">0.6 MON welcome gift for early users</span>
          <br />
          <span className="gb-sub">
            {claimed === null ? "Loading…" : `${claimed} of ${max} claimed, ${Math.max(0, max - claimed)} left`}
          </span>
        </span>
      </span>
      <span className="gb-cta">Claim yours →</span>
    </Link>
  );
}
