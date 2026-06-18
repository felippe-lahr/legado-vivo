// Avatares ilustrados por faixa etária, usados na seleção inicial.
// Mapeados pelo id da faixa ("50-60", "60-70", "70+").

interface Props {
  faixaId: string;
  className?: string;
}

function Avatar5060({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M7 48 C7 35 14.5 30 24 30 C33.5 30 41 35 41 48" fill="#6A5CA0" />
      <path d="M21 26.5 L21 30.5 L27 30.5 L27 26.5" fill="#F2B368" />
      <ellipse cx="14.8" cy="19" rx="2.2" ry="2.8" fill="#E5A254" />
      <ellipse cx="33.2" cy="19" rx="2.2" ry="2.8" fill="#E5A254" />
      <circle cx="24" cy="17.5" r="10" fill="#F2B368" />
      <path
        d="M14 18 C13.5 7.5 18.5 3 24 3 C29.5 3 34.5 7.5 34 18 C31.5 13.5 28.5 11 26 11.5 C25.2 13 22.8 13 22 11.5 C19.5 11 16.5 13.5 14 18Z"
        fill="#3B2A1C"
      />
      <circle cx="21" cy="19" r="1.5" fill="#2A1C12" />
      <circle cx="27" cy="19" r="1.5" fill="#2A1C12" />
      <path
        d="M21 23 C22.5 24.8 25.5 24.8 27 23"
        fill="none"
        stroke="#C4894A"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Avatar6070({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M7 48 C7 35 14.5 30 24 30 C33.5 30 41 35 41 48" fill="#5A6A92" />
      <path d="M21 26.5 L21 30.5 L27 30.5 L27 26.5" fill="#F2B368" />
      <ellipse cx="14.8" cy="19" rx="2.2" ry="2.8" fill="#E5A254" />
      <ellipse cx="33.2" cy="19" rx="2.2" ry="2.8" fill="#E5A254" />
      <circle cx="24" cy="17.5" r="10" fill="#F2B368" />
      <path
        d="M15.5 17 C15 8.5 19 5 24 5 C29 5 33 8.5 32.5 17 C30.5 13.5 28 12 26 12.5 C25.2 14 22.8 14 22 12.5 C20 12 17.5 13.5 15.5 17Z"
        fill="#7A6852"
      />
      <circle cx="20.5" cy="19.5" r="3.6" fill="none" stroke="#2A1C12" strokeWidth="1.5" />
      <circle cx="27.5" cy="19.5" r="3.6" fill="none" stroke="#2A1C12" strokeWidth="1.5" />
      <path d="M24.1 19.5 L23.9 19.5" stroke="#2A1C12" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20.5" cy="19.5" r="1.4" fill="#2A1C12" />
      <circle cx="27.5" cy="19.5" r="1.4" fill="#2A1C12" />
    </svg>
  );
}

function Avatar70({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M7 48 C7 35 14.5 30 24 30 C33.5 30 41 35 41 48" fill="#685E8C" />
      <path d="M21 26.5 L21 30.5 L27 30.5 L27 26.5" fill="#F2B368" />
      <ellipse cx="14.8" cy="19" rx="2.2" ry="2.8" fill="#E5A254" />
      <ellipse cx="33.2" cy="19" rx="2.2" ry="2.8" fill="#E5A254" />
      <circle cx="24" cy="17.5" r="10" fill="#F2B368" />
      <path
        d="M16.5 16 C16.5 9.5 19.5 6.5 24 6.5 C28.5 6.5 31.5 9.5 31.5 16 C30 13.5 28 12.5 26.5 13 C25.5 14.5 22.5 14.5 21.5 13 C20 12.5 18 13.5 16.5 16Z"
        fill="#AAA2B2"
      />
      <circle cx="20.5" cy="19.5" r="3.6" fill="none" stroke="#2A1C12" strokeWidth="1.5" />
      <circle cx="27.5" cy="19.5" r="3.6" fill="none" stroke="#2A1C12" strokeWidth="1.5" />
      <path d="M24.1 19.5 L23.9 19.5" stroke="#2A1C12" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20.5" cy="19.5" r="1.4" fill="#2A1C12" />
      <circle cx="27.5" cy="19.5" r="1.4" fill="#2A1C12" />
      <path
        d="M20.5 24 C22 26 26 26 27.5 24"
        fill="none"
        stroke="#C4894A"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M17.5 21.5 L16.5 23" stroke="#D4A060" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M30.5 21.5 L31.5 23" stroke="#D4A060" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

export function AvatarFaixa({ faixaId, className }: Props) {
  if (faixaId === "60-70") return <Avatar6070 className={className} />;
  if (faixaId === "70+") return <Avatar70 className={className} />;
  return <Avatar5060 className={className} />;
}
