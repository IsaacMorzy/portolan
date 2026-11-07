/**
 * The mark is three nodes and the two edges between them — the smallest true
 * statement of what the product draws. No ornament beyond that.
 *
 * Its own module, and free of "use client": the nav is interactive and the auth
 * frames are not, and neither should be dragging the other's code in.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="none">
      <path d="M4.6 4.4 11.4 8 4.6 11.6" stroke="currentColor" strokeWidth="1.1" opacity="0.4" />
      <path d="M4.6 4.4v7.2" stroke="currentColor" strokeWidth="1.1" opacity="0.4" />
      <circle cx="4.6" cy="4.4" r="1.9" fill="currentColor" />
      <circle cx="11.4" cy="8" r="1.9" fill="currentColor" opacity="0.65" />
      <circle cx="4.6" cy="11.6" r="1.9" fill="currentColor" opacity="0.65" />
    </svg>
  );
}
