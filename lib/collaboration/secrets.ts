/**
 * Secret Isolation Utilities
 * 
 * Ensures credentials are NEVER part of workflow JSON or PR diffs.
 * Credentials are referenced only by opaque credential_ref IDs.
 */

// Fields that should be stripped from node data
const SENSITIVE_FIELDS = [
  "accessToken",
  "refreshToken",
  "apiKey",
  "privateKey",
  "password",
  "secret",
  "token",
  "credentials",
  "oauth",
];

// Node types that have credentials
const CREDENTIAL_NODE_TYPES = [
  "gmail",
  "googleSheets",
  "openai",
  "httpRequest",
  "email",
];

export interface WorkflowContent {
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
}

/**
 * Strip sensitive credential data from workflow content.
 * Keeps only the credentialRef (opaque reference ID).
 */
export function stripSecretsFromContent(
  content: WorkflowContent | null | undefined
): WorkflowContent {
  if (!content) {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: content.nodes.map((node) => ({
      ...node,
      data: stripSecretsFromNodeData(node.data, node.type),
    })),
    edges: content.edges,
  };
}

/**
 * Strip sensitive fields from node data
 */
function stripSecretsFromNodeData(
  data: Record<string, unknown>,
  nodeType: string
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      continue;
    }

    // Keep credentialRef but ensure it's just a reference ID
    if (key === "credentialRef") {
      cleaned[key] = value;
      continue;
    }

    // Keep credentialId reference but ensure actual credential data is not included
    if (key === "credentialId") {
      cleaned[key] = value;
      continue;
    }

    // Recursively clean nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = stripSecretsFromNodeData(value as Record<string, unknown>, nodeType);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Check if content contains any raw credentials (not just refs)
 */
export function hasRawCredentials(content: WorkflowContent): boolean {
  for (const node of content.nodes) {
    for (const key of Object.keys(node.data)) {
      if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract all credential references from content
 */
export function extractCredentialRefs(
  content: WorkflowContent | null | undefined
): string[] {
  if (!content?.nodes) return [];

  const refs: string[] = [];
  for (const node of content.nodes) {
    if (node.data.credentialRef && typeof node.data.credentialRef === "string") {
      refs.push(node.data.credentialRef);
    }
    if (node.data.credentialId && typeof node.data.credentialId === "string") {
      refs.push(node.data.credentialId);
    }
  }

  return [...new Set(refs)];
}

/**
 * Mark credential references as unbound (for cloned workspaces)
 */
export function markCredentialsUnbound(
  content: WorkflowContent
): { content: WorkflowContent; unboundRefs: string[] } {
  const unboundRefs: string[] = [];

  const updatedContent: WorkflowContent = {
    ...content,
    nodes: content.nodes.map((node) => {
      if (node.data.credentialRef || node.data.credentialId) {
        const ref = (node.data.credentialRef || node.data.credentialId) as string;
        unboundRefs.push(ref);
        return {
          ...node,
          data: {
            ...node.data,
            credentialBound: false,
          },
        };
      }
      return node;
    }),
  };

  return {
    content: updatedContent,
    unboundRefs: [...new Set(unboundRefs)],
  };
}

/**
 * Generate a new credential reference ID
 */
export function generateCredentialRef(): string {
  return `cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}


