interface GoogleButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function GoogleLogo() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M16.9125 9.1875C16.9125 8.5875 16.875 8.025 16.7625 7.5H9V10.875H13.425C13.2375 11.8875 12.675 12.75 11.8125 13.35V15.375H14.4375C15.975 13.875 16.9125 11.7375 16.9125 9.1875Z"
        fill="#4285F4"
      />
      <path
        d="M9 17.25C11.2125 17.25 13.0875 16.5 14.4375 15.2625L11.8125 13.2375C11.0625 13.725 10.125 14.025 9 14.025C6.825 14.025 4.9875 12.5625 4.35 10.575H1.6125V12.675C2.9625 15.4125 5.775 17.25 9 17.25Z"
        fill="#34A853"
      />
      <path
        d="M4.35 10.575C4.2 10.0875 4.0875 9.56245 4.0875 8.99995C4.0875 8.43745 4.1625 7.91245 4.35 7.42495V5.32495H1.6125C1.05 6.41245 0.75 7.64995 0.75 8.99995C0.75 10.35 1.05 11.5875 1.6125 12.675L4.35 10.575Z"
        fill="#FBBC05"
      />
      <path
        d="M9 4.0125C10.2 4.0125 11.2875 4.425 12.15 5.25L14.475 2.925C13.0875 1.575 11.2125 0.75 9 0.75C5.775 0.75 2.9625 2.5875 1.6125 5.325L4.35 7.425C4.9875 5.4375 6.825 4.0125 9 4.0125Z"
        fill="#EA4335"
      />
    </svg>
  );
}

// UI Specification §6 Auth: Google's own OAuth-button brand guidelines
// require this neutral style (white bg, official multi-color "G" mark)
// instead of the system's coral Primary button — a deliberate, spec'd
// exception, not a missed design-system application. Exact
// spacing/colors/logo confirmed via Figma (node 8:121..8:145, file
// KJdzlOzt7AbKUXca1gmpDk).
export function GoogleButton({ onClick, disabled }: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-button inline-flex min-h-[48px] items-center justify-center gap-[10px] border border-black/10 bg-white px-[27px] py-[14px] font-body text-[14px] font-semibold text-[#3c4043] transition-transform active:scale-[0.97] disabled:opacity-40"
    >
      <GoogleLogo />
      Увійти через Google
    </button>
  );
}
