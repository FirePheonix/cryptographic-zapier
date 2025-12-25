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
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return templates.find((t) => t.id === id);
}
