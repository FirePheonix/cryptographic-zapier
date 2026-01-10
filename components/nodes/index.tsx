import { DropNode } from "./drop";
import { CompactNode } from "./compact-node";
import { ManualTriggerNode } from "./manual-trigger";
import { WebhookTriggerNode } from "./webhook-trigger";
import { RespondToWebhookNode } from "./respond-to-webhook";
import { AIAgentNode } from "./ai-agent";

// All workflow nodes use the compact n8n-style design
// The full configuration opens in a panel when clicked
export const nodeTypes = {
  // Manual Trigger - special D-shaped trigger node
  manualTrigger: ManualTriggerNode,
  // Webhook Trigger - D-shaped HTTP endpoint trigger
  webhookTrigger: WebhookTriggerNode,
  // Respond to Webhook - returns HTTP response
  respondToWebhook: RespondToWebhookNode,
  // AI Agent - special rectangular node with internal sub-connections
  // (tools/model/memory are stored as data, NOT separate workflow nodes)
  aiAgent: AIAgentNode,
  trigger: CompactNode,
  email: CompactNode,
  gmail: CompactNode,
  openai: CompactNode,
  googleSheets: CompactNode,
  httpRequest: CompactNode,
  transform: CompactNode,
  flow: CompactNode,
  drop: DropNode,
  phantomWatch: CompactNode,
  metamaskWatch: CompactNode,
  postgres: CompactNode,
  coingateWebhook: CompactNode,
  coingate: CompactNode,
  // Add more node types here
  webhook: CompactNode,
  http: CompactNode,
  code: CompactNode,
  slack: CompactNode,
  telegram: CompactNode,
  discord: CompactNode,
  // x402 Payment Protocol Nodes (Cronos)
  x402Gate: CompactNode,
  cronosPayment: CompactNode,
  httpResponse: CompactNode,
  blockchainAudit: CompactNode,
};


