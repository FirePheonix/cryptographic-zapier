/**
 * Crypto/Wallet SVG Icons
 * 
 * High-quality brand icons for wallet integrations
 */

import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  size?: number;
}

// Phantom Wallet Icon (Purple Ghost)
export const PhantomIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <circle cx="64" cy="64" r="64" fill="url(#phantom-gradient)" />
    <path
      d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.5709 35.128 108 58.7842 108H62.6568C83.5258 108 110.584 89.1216 110.584 64.9142Z"
      fill="url(#phantom-inner)"
    />
    <circle cx="44" cy="58" r="7" fill="#1E1E1E" />
    <circle cx="74" cy="58" r="7" fill="#1E1E1E" />
    <defs>
      <linearGradient id="phantom-gradient" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#534BB1" />
        <stop offset="1" stopColor="#551BF9" />
      </linearGradient>
      <linearGradient id="phantom-inner" x1="14" y1="23" x2="110" y2="108" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EFEFEF" />
        <stop offset="1" stopColor="#E8E8E8" />
      </linearGradient>
    </defs>
  </svg>
);

// MetaMask Fox Icon
export const MetaMaskIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 318 318"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path d="M274.1 35.5L174.6 109.4L193 65.8L274.1 35.5Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M44.4 35.5L143.1 110.1L125.6 65.8L44.4 35.5Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M238.3 206.8L211.8 247.4L268.5 262.4L284.1 207.7L238.3 206.8Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M33.9 207.7L49.4 262.4L106.1 247.4L79.7 206.8L33.9 207.7Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M103.6 138.2L87.8 162.1L144.1 164.6L142.1 104.1L103.6 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M214.9 138.2L175.9 103.4L174.6 164.6L230.8 162.1L214.9 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M106.1 247.4L140.4 230.9L110.6 208.1L106.1 247.4Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M177.9 230.9L211.8 247.4L207.4 208.1L177.9 230.9Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M211.8 247.4L177.9 230.9L180.6 253L180.3 261.7L211.8 247.4Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M106.1 247.4L137.6 261.7L137.4 253L140.4 230.9L106.1 247.4Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M138.2 193.5L109.9 185.1L129.5 175.9L138.2 193.5Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M180.3 193.5L189 175.9L208.7 185.1L180.3 193.5Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M106.1 247.4L110.8 206.8L79.7 207.7L106.1 247.4Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M207.2 206.8L211.8 247.4L238.3 207.7L207.2 206.8Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M230.8 162.1L174.6 164.6L180.3 193.5L189 175.9L208.7 185.1L230.8 162.1Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M109.9 185.1L129.5 175.9L138.2 193.5L144.1 164.6L87.8 162.1L109.9 185.1Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M87.8 162.1L110.6 208.1L109.9 185.1L87.8 162.1Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M208.7 185.1L207.4 208.1L230.8 162.1L208.7 185.1Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M144.1 164.6L138.2 193.5L145.4 229.7L147.1 182.8L144.1 164.6Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M174.6 164.6L171.7 182.7L172.9 229.7L180.3 193.5L174.6 164.6Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M180.3 193.5L172.9 229.7L177.9 230.9L207.4 208.1L208.7 185.1L180.3 193.5Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M109.9 185.1L110.6 208.1L140.4 230.9L145.4 229.7L138.2 193.5L109.9 185.1Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M180.3 261.7L180.6 253L178.1 250.8H140.4L137.4 253L137.6 261.7L106.1 247.4L117.2 256.4L140.1 272.3H178.4L201.4 256.4L211.8 247.4L180.3 261.7Z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M177.9 230.9L172.9 229.7H145.4L140.4 230.9L137.4 253L140.4 250.8H178.1L180.6 253L177.9 230.9Z" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M278.3 114.2L286.8 73.4L274.1 35.5L177.9 106.9L214.9 138.2L267.2 152.5L278.8 138.9L273.8 135.4L281.8 128.1L275.6 123.3L283.6 117.2L278.3 114.2Z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M31.8 73.4L40.3 114.2L34.9 117.2L42.9 123.3L36.8 128.1L44.8 135.4L39.8 138.9L51.3 152.5L103.6 138.2L140.6 106.9L44.4 35.5L31.8 73.4Z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M267.2 152.5L214.9 138.2L230.8 162.1L207.4 208.1L238.3 207.7H284.1L267.2 152.5Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M103.6 138.2L51.3 152.5L33.9 207.7H79.7L110.6 208.1L87.8 162.1L103.6 138.2Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M174.6 164.6L177.9 106.9L193.1 65.8H125.6L140.6 106.9L144.1 164.6L145.3 182.8L145.4 229.7H172.9L173.1 182.8L174.6 164.6Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Solana Icon
export const SolanaIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 397 311"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path
      d="M64.6 237.9C67.3 235.2 71 233.6 75 233.6H392.1C398.5 233.6 401.7 241.4 397.2 245.9L332.4 310.7C329.7 313.4 326 315 322 315H4.9C-1.5 315 -4.7 307.2 -0.2 302.7L64.6 237.9Z"
      fill="url(#solana-gradient-1)"
    />
    <path
      d="M64.6 3.8C67.4 1.1 71.1 -0.5 75 -0.5H392.1C398.5 -0.5 401.7 7.3 397.2 11.8L332.4 76.6C329.7 79.3 326 80.9 322 80.9H4.9C-1.5 80.9 -4.7 73.1 -0.2 68.6L64.6 3.8Z"
      fill="url(#solana-gradient-2)"
    />
    <path
      d="M332.4 120.3C329.7 117.6 326 116 322 116H4.9C-1.5 116 -4.7 123.8 -0.2 128.3L64.6 193.1C67.3 195.8 71 197.4 75 197.4H392.1C398.5 197.4 401.7 189.6 397.2 185.1L332.4 120.3Z"
      fill="url(#solana-gradient-3)"
    />
    <defs>
      <linearGradient id="solana-gradient-1" x1="360" y1="355" x2="68" y2="63" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="solana-gradient-2" x1="264" y1="-40" x2="-28" y2="252" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="solana-gradient-3" x1="312" y1="157" x2="20" y2="449" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
  </svg>
);

// Ethereum Icon
export const EthereumIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 256 417"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path d="M127.961 0L125.166 9.5V285.168L127.961 287.958L255.923 212.32L127.961 0Z" fill="#343434" />
    <path d="M127.962 0L0 212.32L127.962 287.959V154.158V0Z" fill="#8C8C8C" />
    <path d="M127.961 312.187L126.386 314.107V412.306L127.961 416.905L256 236.587L127.961 312.187Z" fill="#3C3C3B" />
    <path d="M127.962 416.905V312.187L0 236.587L127.962 416.905Z" fill="#8C8C8C" />
    <path d="M127.961 287.958L255.922 212.32L127.961 154.159V287.958Z" fill="#141414" />
    <path d="M0.001 212.32L127.962 287.958V154.159L0.001 212.32Z" fill="#393939" />
  </svg>
);

// Webhook/Lightning Icon
export const WebhookIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.2"
    />
  </svg>
);

// Trigger Icon (Play with circle)
export const TriggerIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M10 8L16 12L10 16V8Z"
      fill="currentColor"
    />
  </svg>
);


