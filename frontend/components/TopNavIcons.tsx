"use client";

import Link from "next/link";

export function TopNavIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/"
        aria-label="Home"
        title="Home"
        className="icon-btn"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M10 21v-6h4v6" />
        </svg>
      </Link>
      <Link
        href="/designs"
        aria-label="Dashboard"
        title="Dashboard"
        className="icon-btn"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="5" rx="1" />
          <rect x="13" y="10" width="8" height="11" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
        </svg>
      </Link>
    </div>
  );
}
