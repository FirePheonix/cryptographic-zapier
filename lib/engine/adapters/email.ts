/**
 * Email Provider Adapter
 * 
 * Handles email sending via Resend API.
 * Can be extended to support other providers (SendGrid, SES, etc.)
 */

import type {
  ApiKeyCredentials,
  Credentials,
  ExecutionContext,
  EmailOperation,
  OperationId,
} from "../types";
import { BaseProviderAdapter, makeRequest } from "./base";
import { createError } from "../rate-limit";

// ============================================================================
// Email Configuration
// ============================================================================

const RESEND_API_URL = "https://api.resend.com";

// ============================================================================
// Email Provider Adapter
// ============================================================================

export class EmailAdapter extends BaseProviderAdapter {
  readonly providerId = "email" as const;
  readonly supportedOperations: OperationId[] = [
    "send",
    "sendTemplate",
  ];
  
  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const apiKey = this.getApiKey(credentials);
    
    switch (operation as EmailOperation) {
      case "send":
        return this.sendEmail(input, apiKey);
      case "sendTemplate":
        return this.sendTemplateEmail(input, apiKey);
      default:
        throw createError("UNSUPPORTED_OPERATION", `Unknown operation: ${operation}`);
    }
  }
  
  /**
   * Get API key from credentials
   */
  private getApiKey(credentials: Credentials): string {
    if (credentials.type !== "api_key") {
      throw createError("INVALID_CREDENTIALS", "Email requires API key credentials");
    }
    return (credentials as ApiKeyCredentials).apiKey;
  }
  
  // ============================================================================
  // Email Operations
  // ============================================================================
  
  /**
   * Send a plain email
   */
  private async sendEmail(
    input: Record<string, unknown>,
    apiKey: string
  ): Promise<Record<string, unknown>> {
    const {
      from,
      to,
      subject,
      text,
      html,
      cc,
      bcc,
      replyTo,
      headers,
      attachments,
      tags,
    } = input as {
      from: string;
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
      cc?: string | string[];
      bcc?: string | string[];
      replyTo?: string | string[];
      headers?: Record<string, string>;
      attachments?: Array<{
        filename: string;
        content: string; // Base64 encoded
        contentType?: string;
      }>;
      tags?: Array<{ name: string; value: string }>;
    };
    
    // Validation
    if (!from) {
      throw createError("VALIDATION_ERROR", "Sender (from) is required");
    }
    
    if (!to) {
      throw createError("VALIDATION_ERROR", "Recipient (to) is required");
    }
    
    if (!text && !html) {
      throw createError("VALIDATION_ERROR", "Email body (text or html) is required");
    }
    
    // Build request body
    const requestBody: Record<string, unknown> = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject: subject || "(No Subject)",
    };
    
    if (text) requestBody.text = text;
    if (html) requestBody.html = html;
    if (cc) requestBody.cc = Array.isArray(cc) ? cc : [cc];
    if (bcc) requestBody.bcc = Array.isArray(bcc) ? bcc : [bcc];
    if (replyTo) requestBody.reply_to = Array.isArray(replyTo) ? replyTo : [replyTo];
    if (headers) requestBody.headers = headers;
    if (attachments) requestBody.attachments = attachments;
    if (tags) requestBody.tags = tags;
    
    const response = await makeRequest(
      `${RESEND_API_URL}/emails`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      { provider: this.providerId, operation: "send" }
    );
    
    const result = await response.json();
    
    return {
      success: true,
      messageId: result.id,
      to: Array.isArray(to) ? to : [to],
      from,
      subject,
    };
  }
  
  /**
   * Send email using a template
   */
  private async sendTemplateEmail(
    input: Record<string, unknown>,
    apiKey: string
  ): Promise<Record<string, unknown>> {
    const {
      from,
      to,
      subject,
      template,
      variables,
      cc,
      bcc,
      replyTo,
    } = input as {
      from: string;
      to: string | string[];
      subject: string;
      template: string; // Template name or HTML template
      variables: Record<string, unknown>;
      cc?: string | string[];
      bcc?: string | string[];
      replyTo?: string | string[];
    };
    
    // Validation
    if (!from || !to || !template) {
      throw createError("VALIDATION_ERROR", "From, to, and template are required");
    }
    
    // Interpolate template with variables
    const html = this.interpolateTemplate(template, variables || {});
    
    // Send using standard send
    return this.sendEmail(
      {
        from,
        to,
        subject,
        html,
        cc,
        bcc,
        replyTo,
      },
      apiKey
    );
  }
  
  /**
   * Simple template interpolation
   * Replaces {{variable}} with values from variables object
   */
  private interpolateTemplate(
    template: string,
    variables: Record<string, unknown>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = variables[key];
      if (value === undefined || value === null) return "";
      return String(value);
    });
  }
}

// Export singleton instance
export const emailAdapter = new EmailAdapter();


