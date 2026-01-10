import {
  BrainCircuitIcon,
  GlobeIcon,
  GitBranchIcon,
  MailIcon,
  MailOpenIcon,
  TableIcon,
  WebhookIcon,
  WrenchIcon,
  WalletIcon,
  DatabaseIcon,
  CoinsIcon,
  ShieldCheckIcon,
  SendIcon,
  MailCheckIcon,
  ShieldIcon,
  MousePointerClickIcon,
  ReplyIcon,
  BotIcon,
} from "lucide-react";

export const nodeButtons = [
  {
    id: "manualTrigger",
    label: "Manual Trigger",
    icon: MousePointerClickIcon,
    data: {
      label: 'When clicking "Execute Workflow"',
    },
  },
  {
    id: "webhookTrigger",
    label: "Webhook",
    icon: WebhookIcon,
    data: {
      label: "Webhook Trigger",
      httpMethod: "POST",
      responseMode: "onReceived",
    },
  },
  {
    id: "respondToWebhook",
    label: "Respond to Webhook",
    icon: ReplyIcon,
    data: {
      label: "Respond to Webhook",
      statusCode: 200,
      contentType: "application/json",
      respondWith: "allInputs",
    },
  },
  {
    id: "trigger",
    label: "Trigger (Webhook)",
    icon: WebhookIcon,
  },
  {
    id: "coingateWebhook",
    label: "CoinGate Payment",
    icon: CoinsIcon,
    data: {
      priceCurrency: "USD",
      receiveCurrency: "BTC",
    },
  },
  {
    id: "metamaskWatch",
    label: "MetaMask Watch",
    icon: WalletIcon,
    data: {
      network: "ETH_GOERLI",
    },
  },
  {
    id: "phantomWatch",
    label: "Phantom Watch",
    icon: WalletIcon,
    data: {
      network: "SOLANA_DEVNET",
    },
  },
  {
    id: "openai",
    label: "OpenAI Chat",
    icon: BrainCircuitIcon,
    data: {
      model: "gpt-4o-mini",
    },
  },
  {
    id: "aiAgent",
    label: "AI Agent",
    icon: BotIcon,
    data: {
      systemPrompt: "You are a helpful AI assistant.\nUse tools when needed to fetch data.\nNever hallucinate information.",
      maxIterations: 10,
    },
  },
  {
    id: "gmail",
    label: "Gmail",
    icon: MailOpenIcon,
    data: {
      operation: "gmail.send",
    },
  },
  {
    id: "postgres",
    label: "PostgreSQL",
    icon: DatabaseIcon,
    data: {
      operation: "postgres.query",
    },
  },
  {
    id: "googleSheets",
    label: "Google Sheets",
    icon: TableIcon,
    data: {
      operation: "sheets.appendRow",
    },
  },
  {
    id: "httpRequest",
    label: "HTTP Request",
    icon: GlobeIcon,
    data: {
      method: "GET",
    },
  },
  {
    id: "transform",
    label: "Transform",
    icon: WrenchIcon,
    data: {
      operation: "transform.jsonParse",
    },
  },
  {
    id: "flow",
    label: "Flow Control",
    icon: GitBranchIcon,
    data: {
      mode: "iterator",
    },
  },
  {
    id: "email",
    label: "Email (Resend)",
    icon: MailIcon,
  },
  // x402 Payment Protocol Nodes (Cronos)
  {
    id: "x402Gate",
    label: "402 Payment Gate",
    icon: ShieldCheckIcon,
    data: {
      requiredAmount: "10.0",
      replayWindowSeconds: 300,
      allowOverpayment: true,
    },
  },
  {
    id: "cronosPayment",
    label: "Cronos Payment",
    icon: SendIcon,
    data: {
      waitForConfirmations: 1,
      autoRetry: false,
    },
  },
  {
    id: "httpResponse",
    label: "HTTP Response",
    icon: MailCheckIcon,
    data: {
      statusCode: 200,
      contentType: "application/json",
    },
  },
  {
    id: "blockchainAudit",
    label: "Blockchain Audit",
    icon: ShieldIcon,
    data: {
      includeTimestamp: true,
      includeWorkflowId: true,
      includeExecutionId: true,
      includePaymentProof: true,
      attachToResponse: true,
    },
  },
];


