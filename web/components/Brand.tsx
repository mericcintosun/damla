import Link from "next/link";

export function DropMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="drop"
      width={size}
      height={size * 1.18}
      viewBox="0 0 24 28"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34e2c8" />
          <stop offset="1" stopColor="#1fb6ff" />
        </linearGradient>
      </defs>
      <path
        d="M12 1C12 1 3 12 3 18a9 9 0 0 0 18 0C21 12 12 1 12 1Z"
        fill="url(#dg)"
      />
      <path
        d="M8.5 17.5a3.5 3.5 0 0 0 3.5 3.5"
        stroke="#04140f"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <div className="topbar">
      <Link href="/" className="brand">
        <DropMark />
        <span>Damla</span>
      </Link>
      {right ?? <span className="badge"><span className="dot" /> Monad Testnet</span>}
    </div>
  );
}
