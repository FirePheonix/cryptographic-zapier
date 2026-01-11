// Workflow templates with actual nodes and edges
// These are importable templates that users can use to create new workflows

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icons: string[];
  additionalCount?: number;
  content: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>;
  };
}

export const templates: WorkflowTemplate[] = [
  {
    id: "email-marketing",
    name: "Automated Email Marketing Campaign Workflow",
    description:
      "Automatically send personalized email campaigns based on webhook triggers. Uses OpenAI to generate personalized content and Gmail to send emails.",
    icons: ["gmail", "openai"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              email: "customer@example.com",
              name: "John Doe",
              product: "Premium Plan",
            },
          },
        },
        {
          id: "openai-1",
          type: "openai",
          position: { x: 450, y: 200 },
          data: {
            model: "gpt-4o-mini",
            systemPrompt:
              "You are a professional email copywriter. Write personalized, engaging marketing emails that convert. Keep the tone friendly and professional.",
            prompt:
              "Write a personalized marketing email for {{trigger.name}} about our {{trigger.product}}. Make it compelling and include a call to action.",
            maxTokens: 500,
            temperature: 0.7,
          },
        },
        {
          id: "gmail-1",
          type: "gmail",
          position: { x: 800, y: 200 },
          data: {
            operation: "gmail.send",
            to: "{{trigger.email}}",
            subject: "Special offer just for you, {{trigger.name}}!",
            body: "{{openai-1.content}}",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "openai-1",
        },
        {
          id: "edge-2",
          source: "openai-1",
          target: "gmail-1",
        },
      ],
    },
  },
  {
    id: "lead-capture",
    name: "Smart Lead Capture with AI Follow-Up",
    description:
      "Capture leads from webhook triggers and automatically send AI-generated personalized follow-up emails based on lead information.",
    icons: ["openai", "gmail"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              leadEmail: "lead@company.com",
              leadName: "Jane Smith",
              company: "Acme Corp",
              interest: "Enterprise solutions",
              source: "Website contact form",
            },
          },
        },
        {
          id: "openai-1",
          type: "openai",
          position: { x: 450, y: 200 },
          data: {
            model: "gpt-4o-mini",
            systemPrompt:
              "You are a sales development representative. Write professional, personalized follow-up emails to new leads. Be helpful and focus on understanding their needs.",
            prompt:
              "Write a follow-up email to {{trigger.leadName}} from {{trigger.company}}. They expressed interest in {{trigger.interest}} through {{trigger.source}}. Keep it concise and include a meeting scheduling link placeholder.",
            maxTokens: 400,
            temperature: 0.6,
          },
        },
        {
          id: "gmail-1",
          type: "gmail",
          position: { x: 800, y: 200 },
          data: {
            operation: "gmail.send",
            to: "{{trigger.leadEmail}}",
            subject: "Thanks for your interest, {{trigger.leadName}}!",
            body: "{{openai-1.content}}",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "openai-1",
        },
        {
          id: "edge-2",
          source: "openai-1",
          target: "gmail-1",
        },
      ],
    },
  },
  {
    id: "customer-support-ai",
    name: "AI-Powered Customer Support Response",
    description:
      "Automatically analyze incoming customer inquiries and generate personalized support responses using AI, then send via Gmail.",
    icons: ["gmail", "openai"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              customerEmail: "user@example.com",
              customerName: "Alex Johnson",
              subject: "Issue with my order",
              message: "I ordered a product last week but haven't received tracking information yet.",
              orderId: "ORD-12345",
            },
          },
        },
        {
          id: "openai-1",
          type: "openai",
          position: { x: 450, y: 200 },
          data: {
            model: "gpt-4o-mini",
            systemPrompt:
              "You are a helpful customer support agent. Respond with empathy, provide clear solutions, and maintain a professional yet friendly tone. Always acknowledge the customer's concern first.",
            prompt:
              "Customer {{trigger.customerName}} has an inquiry about order {{trigger.orderId}}: '{{trigger.message}}'. Write a helpful support response addressing their concern.",
            maxTokens: 400,
            temperature: 0.5,
          },
        },
        {
          id: "gmail-1",
          type: "gmail",
          position: { x: 800, y: 200 },
          data: {
            operation: "gmail.send",
            to: "{{trigger.customerEmail}}",
            subject: "Re: {{trigger.subject}} [{{trigger.orderId}}]",
            body: "{{openai-1.content}}",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "openai-1",
        },
        {
          id: "edge-2",
          source: "openai-1",
          target: "gmail-1",
        },
      ],
    },
  },
  {
    id: "newsletter-ai-writer",
    name: "AI Newsletter Content Generator",
    description:
      "Generate engaging newsletter content using AI based on topics and automatically send to subscribers via Gmail.",
    icons: ["openai", "gmail"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              subscriberEmail: "subscriber@example.com",
              subscriberName: "Sarah",
              topics: ["crypto trends", "DeFi updates", "NFT news"],
              frequency: "weekly",
            },
          },
        },
        {
          id: "openai-1",
          type: "openai",
          position: { x: 450, y: 200 },
          data: {
            model: "gpt-4o-mini",
            systemPrompt:
              "You are an expert newsletter writer specializing in Web3 and crypto content. Write engaging, informative content that keeps readers up-to-date with the latest trends. Use clear headings and bullet points.",
            prompt:
              "Write a {{trigger.frequency}} newsletter for {{trigger.subscriberName}} covering these topics: {{trigger.topics}}. Include key highlights, market insights, and actionable takeaways.",
            maxTokens: 800,
            temperature: 0.7,
          },
        },
        {
          id: "gmail-1",
          type: "gmail",
          position: { x: 800, y: 200 },
          data: {
            operation: "gmail.send",
            to: "{{trigger.subscriberEmail}}",
            subject: "Your {{trigger.frequency}} Web3 Digest 🚀",
            body: "{{openai-1.content}}",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "openai-1",
        },
        {
          id: "edge-2",
          source: "openai-1",
          target: "gmail-1",
        },
      ],
    },
  },
  {
    id: "meeting-summary-email",
    name: "AI Meeting Summary & Email Dispatch",
    description:
      "Process meeting transcripts with AI to generate concise summaries and action items, then distribute via Gmail to all participants.",
    icons: ["gmail", "openai"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              meetingTitle: "Product Roadmap Review",
              participants: "team@company.com",
              transcript: "Discussion about Q1 priorities, feature launches, and resource allocation...",
              date: "2026-01-11",
            },
          },
        },
        {
          id: "openai-1",
          type: "openai",
          position: { x: 450, y: 200 },
          data: {
            model: "gpt-4o-mini",
            systemPrompt:
              "You are a professional meeting assistant. Create clear, structured meeting summaries with key decisions, action items with owners, and next steps. Use bullet points and clear formatting.",
            prompt:
              "Summarize this meeting '{{trigger.meetingTitle}}' from {{trigger.date}}. Transcript: {{trigger.transcript}}. Include: 1) Key Discussion Points, 2) Decisions Made, 3) Action Items with owners, 4) Next Steps.",
            maxTokens: 600,
            temperature: 0.4,
          },
        },
        {
          id: "gmail-1",
          type: "gmail",
          position: { x: 800, y: 200 },
          data: {
            operation: "gmail.send",
            to: "{{trigger.participants}}",
            subject: "Meeting Summary: {{trigger.meetingTitle}} - {{trigger.date}}",
            body: "{{openai-1.content}}",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "openai-1",
        },
        {
          id: "edge-2",
          source: "openai-1",
          target: "gmail-1",
        },
      ],
    },
  },
  {
    id: "solana-price-alert",
    name: "Solana Price Alert Notification",
    description:
      "Monitor Solana blockchain data and trigger notifications when specific price thresholds are met. Perfect for traders and investors.",
    icons: ["solana", "http"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              symbol: "SOL",
              currentPrice: 125.50,
              threshold: 120,
              alertType: "above",
              walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            },
          },
        },
        {
          id: "http-1",
          type: "http",
          position: { x: 450, y: 200 },
          data: {
            method: "POST",
            url: "https://api.telegram.org/bot{{env.TELEGRAM_BOT_TOKEN}}/sendMessage",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: "{{env.TELEGRAM_CHAT_ID}}",
              text: "🚨 SOL Price Alert!\n\nSymbol: {{trigger.symbol}}\nCurrent Price: ${{trigger.currentPrice}}\nThreshold: ${{trigger.threshold}} ({{trigger.alertType}})\n\nWallet: {{trigger.walletAddress}}",
            }),
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "http-1",
        },
      ],
    },
  },
  {
    id: "nft-mint-notifier",
    name: "NFT Mint Event Tracker",
    description:
      "Track NFT minting events on Solana and send real-time notifications via HTTP webhook. Ideal for collectors and project watchers.",
    icons: ["solana", "http"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              collectionName: "DeGods",
              mintAddress: "6XxjKYFbcndh2gDcsUrmZgVEsoDxXMnfsaGY6fpTJzNr",
              mintPrice: 5.5,
              currency: "SOL",
              minterWallet: "8ZpKT3QfLtFJPPqLjLxZqFJBqVJBQBLZMvJZ9xCVv1yz",
              timestamp: "2026-01-11T10:30:00Z",
            },
          },
        },
        {
          id: "http-1",
          type: "http",
          position: { x: 450, y: 200 },
          data: {
            method: "POST",
            url: "https://discord.com/api/webhooks/{{env.DISCORD_WEBHOOK_ID}}/{{env.DISCORD_WEBHOOK_TOKEN}}",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [{
                title: "🎨 New NFT Minted!",
                description: "A new NFT has been minted from {{trigger.collectionName}}",
                fields: [
                  { name: "Mint Address", value: "{{trigger.mintAddress}}", inline: false },
                  { name: "Price", value: "{{trigger.mintPrice}} {{trigger.currency}}", inline: true },
                  { name: "Minter", value: "{{trigger.minterWallet}}", inline: false },
                ],
                color: 5814783,
              }],
            }),
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "http-1",
        },
      ],
    },
  },
  {
    id: "defi-transaction-logger",
    name: "DeFi Transaction Logger & Analytics",
    description:
      "Log and analyze DeFi transactions by sending data to external analytics services via HTTP. Track swaps, liquidity events, and more.",
    icons: ["http", "solana"],
    additionalCount: 1,
    content: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 200 },
          data: {
            samplePayload: {
              transactionType: "swap",
              protocol: "Jupiter",
              fromToken: "SOL",
              toToken: "USDC",
              amount: 10,
              receivedAmount: 1255.50,
              walletAddress: "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
              txSignature: "5KtPn1LGuxhFLTfHGx3qsRPz5v1QHqZBvJzfmxKPNuMWdJaZHs1ePQp6tCRZPYZQ",
              timestamp: "2026-01-11T14:22:00Z",
            },
          },
        },
        {
          id: "http-1",
          type: "http",
          position: { x: 450, y: 200 },
          data: {
            method: "POST",
            url: "{{env.ANALYTICS_WEBHOOK_URL}}",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer {{env.ANALYTICS_API_KEY}}",
            },
            body: JSON.stringify({
              event: "defi_transaction",
              properties: {
                type: "{{trigger.transactionType}}",
                protocol: "{{trigger.protocol}}",
                from_token: "{{trigger.fromToken}}",
                to_token: "{{trigger.toToken}}",
                amount: "{{trigger.amount}}",
                received: "{{trigger.receivedAmount}}",
                wallet: "{{trigger.walletAddress}}",
                signature: "{{trigger.txSignature}}",
                timestamp: "{{trigger.timestamp}}",
              },
            }),
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "http-1",
        },
      ],
    },
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return templates.find((t) => t.id === id);
}


