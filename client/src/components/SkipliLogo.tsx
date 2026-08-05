export function SkipliLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M68 22C64 16 56 12 44 12C26 12 16 24 16 36C16 56 46 54 46 68C46 74 40 78 30 78C20 78 12 72 8 64"
        stroke="#EA3829"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M32 78C36 84 44 88 56 88C74 88 84 76 84 64C84 44 54 46 54 32C54 26 60 22 70 22C80 22 88 28 92 36"
        stroke="#EA3829"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}
