export default function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-line motion-reduce:animate-none ${className}`}
    />
  );
}
