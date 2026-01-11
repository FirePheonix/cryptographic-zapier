/**
 * Google Provider Adapter
 * 
 * Handles Gmail and Google Sheets operations via Google REST APIs.
 * Supports OAuth2 and Service Account credentials.
 */

import type {
  Credentials,
  ExecutionContext,
  GoogleOperation,
  OAuthCredentials,
  OperationId,
  ServiceAccountCredentials,
} from "../types";
import { BaseProviderAdapter, makeRequest } from "./base";
import { createError } from "../rate-limit";

// ============================================================================
// Google OAuth Configuration
// ============================================================================

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_SCOPES = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
  sheets: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
};

// ============================================================================
// Google Provider Adapter
// ============================================================================

export class GoogleAdapter extends BaseProviderAdapter {
  readonly providerId = "google" as const;
  readonly supportedOperations: OperationId[] = [
    "gmail.send",
    "gmail.read",
    "gmail.list",
    "sheets.appendRow",
    "sheets.updateRow",
    "sheets.findRow",
    "sheets.getRows",
    "sheets.deleteRow",
  ];
  
  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    // Get access token
    const accessToken = await this.getAccessToken(credentials);
    
    // Route to operation handler
    switch (operation as GoogleOperation) {
      case "gmail.send":
        return this.gmailSend(input, accessToken);
      case "gmail.read":
        return this.gmailRead(input, accessToken);
      case "gmail.list":
        return this.gmailList(input, accessToken);
      case "sheets.appendRow":
        return this.sheetsAppendRow(input, accessToken);
      case "sheets.updateRow":
        return this.sheetsUpdateRow(input, accessToken);
      case "sheets.findRow":
        return this.sheetsFindRow(input, accessToken);
      case "sheets.getRows":
        return this.sheetsGetRows(input, accessToken);
      case "sheets.deleteRow":
        return this.sheetsDeleteRow(input, accessToken);
      default:
        throw createError("UNSUPPORTED_OPERATION", `Unknown operation: ${operation}`);
    }
  }
  
  // ============================================================================
  // Credential Handling
  // ============================================================================
  
  /**
   * Get access token from credentials
   */
  private async getAccessToken(credentials: Credentials): Promise<string> {
    if (credentials.type === "oauth2") {
      const oauth = credentials as OAuthCredentials;
      if (this.isCredentialsExpired(credentials)) {
        const refreshed = await this.refreshCredentials(oauth);
        return refreshed.accessToken;
      }
      return oauth.accessToken;
    }
    
    if (credentials.type === "service_account") {
      return this.getServiceAccountToken(credentials as ServiceAccountCredentials);
    }
    
    throw createError("INVALID_CREDENTIALS", "Unsupported credential type for Google");
  }
  
  /**
   * Get access token from service account using JWT
   */
  private async getServiceAccountToken(
    credentials: ServiceAccountCredentials
  ): Promise<string> {
    const crypto = await import("crypto");
    
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: credentials.clientEmail,
      scope: [...GOOGLE_OAUTH_SCOPES.gmail, ...GOOGLE_OAUTH_SCOPES.sheets].join(" "),
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    };
    
    const base64UrlEncode = (data: string) => {
      return Buffer.from(data)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    };
    
    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signatureInput);
    const signature = sign
      .sign(credentials.privateKey, "base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    
    const jwt = `${signatureInput}.${signature}`;
    
    const response = await makeRequest(
      GOOGLE_TOKEN_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      },
      { provider: this.providerId }
    );
    
    const data = await response.json();
    return data.access_token;
  }
  
  /**
   * Refresh OAuth2 credentials
   */
  async refreshCredentials(credentials: OAuthCredentials): Promise<OAuthCredentials> {
    const response = await makeRequest(
      GOOGLE_TOKEN_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          refresh_token: credentials.refreshToken,
          grant_type: "refresh_token",
        }),
      },
      { provider: this.providerId }
    );
    
    const data = await response.json();
    
    return {
      ...credentials,
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: data.token_type || "Bearer",
    };
  }
  
  // ============================================================================
  // Gmail Operations
  // ============================================================================
  
  /**
   * Send email via Gmail API using MIME format
   */
  private async gmailSend(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { to, subject, body, html, cc, bcc, from, replyTo } = input as {
      to: string | string[];
      subject: string;
      body?: string;
      html?: string;
      cc?: string | string[];
      bcc?: string | string[];
      from?: string;
      replyTo?: string;
    };
    
    if (!to) {
      throw createError("VALIDATION_ERROR", "Recipient (to) is required");
    }
    
    // Build MIME message
    const mimeMessage = this.buildMimeMessage({
      to: Array.isArray(to) ? to.join(", ") : to,
      subject: subject || "(No Subject)",
      body: body || "",
      html,
      cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
      from,
      replyTo,
    });
    
    // Base64url encode
    const encodedMessage = Buffer.from(mimeMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    
    const response = await makeRequest(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
      },
      { provider: this.providerId, operation: "gmail.send" }
    );
    
    const result = await response.json();
    
    return {
      success: true,
      messageId: result.id,
      threadId: result.threadId,
      to: Array.isArray(to) ? to : [to],
      subject,
    };
  }
  
  /**
   * Build MIME message for email
   */
  private buildMimeMessage(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    cc?: string;
    bcc?: string;
    from?: string;
    replyTo?: string;
  }): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lines: string[] = [];
    
    // Headers
    if (params.from) lines.push(`From: ${params.from}`);
    lines.push(`To: ${params.to}`);
    if (params.cc) lines.push(`Cc: ${params.cc}`);
    if (params.bcc) lines.push(`Bcc: ${params.bcc}`);
    if (params.replyTo) lines.push(`Reply-To: ${params.replyTo}`);
    lines.push(`Subject: =?UTF-8?B?${Buffer.from(params.subject).toString("base64")}?=`);
    lines.push("MIME-Version: 1.0");
    
    if (params.html) {
      // Multipart message with both plain text and HTML
      lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      lines.push("");
      
      // Plain text part
      lines.push(`--${boundary}`);
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: base64");
      lines.push("");
      lines.push(Buffer.from(params.body).toString("base64"));
      lines.push("");
      
      // HTML part
      lines.push(`--${boundary}`);
      lines.push("Content-Type: text/html; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: base64");
      lines.push("");
      lines.push(Buffer.from(params.html).toString("base64"));
      lines.push("");
      
      lines.push(`--${boundary}--`);
    } else {
      // Plain text only
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: base64");
      lines.push("");
      lines.push(Buffer.from(params.body).toString("base64"));
    }
    
    return lines.join("\r\n");
  }
  
  /**
   * Read a specific email by ID
   */
  private async gmailRead(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { messageId, format = "full" } = input as {
      messageId: string;
      format?: "minimal" | "full" | "raw" | "metadata";
    };
    
    if (!messageId) {
      throw createError("VALIDATION_ERROR", "Message ID is required");
    }
    
    const response = await makeRequest(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=${format}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      { provider: this.providerId, operation: "gmail.read" }
    );
    
    const message = await response.json();
    return this.parseGmailMessage(message);
  }
  
  /**
   * List emails with optional query
   */
  private async gmailList(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { query, maxResults = 10, pageToken } = input as {
      query?: string;
      maxResults?: number;
      pageToken?: string;
    };
    
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("maxResults", String(maxResults));
    if (pageToken) params.set("pageToken", pageToken);
    
    const response = await makeRequest(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      { provider: this.providerId, operation: "gmail.list" }
    );
    
    const data = await response.json();
    
    return {
      messages: data.messages || [],
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate,
    };
  }
  
  /**
   * Parse Gmail message into normalized format
   */
  private parseGmailMessage(message: Record<string, unknown>): Record<string, unknown> {
    const headers = (message.payload as { headers?: Array<{ name: string; value: string }> })?.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
    
    return {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds,
      snippet: message.snippet,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      body: this.extractMessageBody(message.payload as Record<string, unknown>),
    };
  }
  
  /**
   * Extract body from Gmail message payload
   */
  private extractMessageBody(payload: Record<string, unknown>): string {
    if (!payload) return "";
    
    // Check for body data
    const body = payload.body as { data?: string };
    if (body?.data) {
      return Buffer.from(body.data, "base64").toString("utf8");
    }
    
    // Check parts for multipart messages
    const parts = payload.parts as Array<Record<string, unknown>>;
    if (parts) {
      for (const part of parts) {
        const mimeType = part.mimeType as string;
        if (mimeType === "text/plain" || mimeType === "text/html") {
          const partBody = part.body as { data?: string };
          if (partBody?.data) {
            return Buffer.from(partBody.data, "base64").toString("utf8");
          }
        }
        // Recursively check nested parts
        if (part.parts) {
          const nested = this.extractMessageBody(part);
          if (nested) return nested;
        }
      }
    }
    
    return "";
  }
  
  // ============================================================================
  // Google Sheets Operations
  // ============================================================================
  
  /**
   * Append a row to a sheet
   */
  private async sheetsAppendRow(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { spreadsheetId, sheetName = "Sheet1", values } = input as {
      spreadsheetId: string;
      sheetName?: string;
      values: unknown[];
    };
    
    if (!spreadsheetId) {
      throw createError("VALIDATION_ERROR", "Spreadsheet ID is required");
    }
    
    if (!values || !Array.isArray(values)) {
      throw createError("VALIDATION_ERROR", "Values must be an array");
    }
    
    const response = await makeRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [values] }),
      },
      { provider: this.providerId, operation: "sheets.appendRow" }
    );
    
    const result = await response.json();
    
    return {
      success: true,
      spreadsheetId,
      updatedRange: result.updates?.updatedRange,
      updatedRows: result.updates?.updatedRows,
      updatedCells: result.updates?.updatedCells,
      appendedRow: values,
    };
  }
  
  /**
   * Update a specific row
   */
  private async sheetsUpdateRow(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { spreadsheetId, range, values } = input as {
      spreadsheetId: string;
      range: string; // e.g., "Sheet1!A2:D2"
      values: unknown[];
    };
    
    if (!spreadsheetId || !range) {
      throw createError("VALIDATION_ERROR", "Spreadsheet ID and range are required");
    }
    
    const response = await makeRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [values] }),
      },
      { provider: this.providerId, operation: "sheets.updateRow" }
    );
    
    const result = await response.json();
    
    return {
      success: true,
      spreadsheetId,
      updatedRange: result.updatedRange,
      updatedRows: result.updatedRows,
      updatedCells: result.updatedCells,
    };
  }
  
  /**
   * Find rows matching a query
   */
  private async sheetsFindRow(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { spreadsheetId, sheetName = "Sheet1", column, value, matchType = "exact" } = input as {
      spreadsheetId: string;
      sheetName?: string;
      column: string; // Column letter (A, B, C, etc.)
      value: string;
      matchType?: "exact" | "contains" | "startsWith";
    };
    
    if (!spreadsheetId || !column || value === undefined) {
      throw createError("VALIDATION_ERROR", "Spreadsheet ID, column, and value are required");
    }
    
    // Get all data first
    const allRows = await this.sheetsGetRows(
      { spreadsheetId, sheetName },
      accessToken
    );
    
    const rows = allRows.rows as Array<{ rowNumber: number; values: unknown[] }>;
    const columnIndex = column.toUpperCase().charCodeAt(0) - 65;
    
    // Find matching rows
    const matches = rows.filter(row => {
      const cellValue = String(row.values[columnIndex] || "");
      const searchValue = String(value);
      
      switch (matchType) {
        case "contains":
          return cellValue.toLowerCase().includes(searchValue.toLowerCase());
        case "startsWith":
          return cellValue.toLowerCase().startsWith(searchValue.toLowerCase());
        default:
          return cellValue === searchValue;
      }
    });
    
    return {
      success: true,
      found: matches.length > 0,
      count: matches.length,
      rows: matches,
      firstMatch: matches[0] || null,
    };
  }
  
  /**
   * Get all rows from a sheet
   */
  private async sheetsGetRows(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { spreadsheetId, sheetName = "Sheet1", range } = input as {
      spreadsheetId: string;
      sheetName?: string;
      range?: string;
    };
    
    if (!spreadsheetId) {
      throw createError("VALIDATION_ERROR", "Spreadsheet ID is required");
    }
    
    const rangeParam = range || sheetName;
    
    const response = await makeRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeParam)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      { provider: this.providerId, operation: "sheets.getRows" }
    );
    
    const result = await response.json();
    const values = result.values || [];
    
    return {
      success: true,
      spreadsheetId,
      range: result.range,
      rowCount: values.length,
      rows: values.map((row: unknown[], index: number) => ({
        rowNumber: index + 1,
        values: row,
      })),
    };
  }
  
  /**
   * Delete a row from a sheet
   */
  private async sheetsDeleteRow(
    input: Record<string, unknown>,
    accessToken: string
  ): Promise<Record<string, unknown>> {
    const { spreadsheetId, sheetId, rowIndex } = input as {
      spreadsheetId: string;
      sheetId: number; // Numeric sheet ID (0 for first sheet)
      rowIndex: number; // 0-based row index
    };
    
    if (!spreadsheetId || rowIndex === undefined) {
      throw createError("VALIDATION_ERROR", "Spreadsheet ID and row index are required");
    }
    
    const response = await makeRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId || 0,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          }],
        }),
      },
      { provider: this.providerId, operation: "sheets.deleteRow" }
    );
    
    await response.json();
    
    return {
      success: true,
      spreadsheetId,
      deletedRowIndex: rowIndex,
    };
  }
}

// Export singleton instance
export const googleAdapter = new GoogleAdapter();


