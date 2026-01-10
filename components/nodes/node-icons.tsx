/**
 * Node Icons
 * 
 * Uses actual brand images from public/icons folder
 */

import Image from "next/image";
import { Mail, Bot, Settings, MousePointerClick } from "lucide-react";

interface NodeIconProps {
  type: string;
  size?: number;
}

export function PhantomIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/icons/phantom.jpeg"
      alt="Phantom"
      width={size}
      height={size}
      priority
    />
  );
}

export function MetaMaskIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/icons/metamask.png"
      alt="MetaMask"
      width={size}
      height={size}
      priority
    />
  );
}

export function OpenAIIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/icons/openai.svg"
      alt="OpenAI"
      width={size}
      height={size}
      priority
    />
  );
}

export function GmailIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/icons/gmail.png"
      alt="Gmail"
      width={size}
      height={size}
      priority
    />
  );
}

export function GoogleSheetsIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/icons/sheets.svg"
      alt="Google Sheets"
      width={size}
      height={size}
      priority
    />
  );
}

export function PostgresIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Database cylinder icon - PostgreSQL blue theme */}
      <rect width="24" height="24" rx="6" fill="#336791" />
      {/* Top ellipse */}
      <ellipse cx="12" cy="6" rx="6" ry="2.5" fill="white" opacity="0.9" />
      {/* Middle band */}
      <rect x="6" y="6" width="12" height="6" fill="white" opacity="0.75" />
      <ellipse cx="12" cy="12" rx="6" ry="2.5" fill="white" opacity="0.75" />
      {/* Bottom section */}
      <rect x="6" y="12" width="12" height="4" fill="white" opacity="0.6" />
      <ellipse cx="12" cy="16" rx="6" ry="2.5" fill="white" opacity="0.6" />
      {/* Bottom cap */}
      <path
        d="M6 16c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5"
        stroke="white"
        strokeWidth="0.5"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

export function CoingateIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/icons/coingate-logo.webp"
      alt="CoinGate"
      width={size}
      height={size}
      priority
    />
  );
}

export function NodeIconComponent({ type, size = 24 }: NodeIconProps) {
  switch (type) {
    case "manualTrigger":
      return (
        <Image
          src="/workflow-svgs/start-trigger.svg"
          alt="Manual Trigger"
          width={size}
          height={size}
          priority
        />
      );
    case "phantomWatch":
      return <PhantomIcon size={size} />;
    case "metamaskWatch":
      return <MetaMaskIcon size={size} />;
    case "openai":
      return <OpenAIIcon size={size} />;
    case "gmail":
      return <GmailIcon size={size} />;
    case "postgres":
      return <PostgresIcon size={size} />;
    case "coingateWebhook":
    case "coingate":
      return <CoingateIcon size={size} />;
    case "googleSheets":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor" opacity="0.1" />
          <rect x="4" y="4" width="4" height="4" fill="currentColor" />
          <rect x="10" y="4" width="4" height="4" fill="currentColor" />
          <rect x="16" y="4" width="4" height="4" fill="currentColor" />
          <rect x="4" y="10" width="4" height="4" fill="currentColor" opacity="0.7" />
          <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity="0.7" />
          <rect x="16" y="10" width="4" height="4" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "x402Gate":
      return (
        <Image
          src="/workflow-svgs/x402.svg"
          alt="x402 Payment Gate"
          width={size}
          height={size}
          priority
        />
      );
    case "aiAgent":
      return (
        <Image
          src="/workflow-svgs/agent.svg"
          alt="AI Agent"
          width={size}
          height={size}
          priority
        />
      );
    default:
      return <Settings size={size} />;
  }
}


