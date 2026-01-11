/**
 * Transform Provider Adapter
 * 
 * Handles data transformation operations (JSON, text, arrays).
 * No external API calls - pure data manipulation.
 */

import type {
  Credentials,
  ExecutionContext,
  OperationId,
  TransformOperation,
} from "../types";
import { BaseProviderAdapter } from "./base";
import { createError } from "../rate-limit";

// ============================================================================
// Transform Provider Adapter
// ============================================================================

export class TransformAdapter extends BaseProviderAdapter {
  readonly providerId = "transform" as const;
  readonly supportedOperations: OperationId[] = [
    "json.parse",
    "json.stringify",
    "text.template",
    "array.filter",
    "array.map",
  ];
  
  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    switch (operation as TransformOperation) {
      case "json.parse":
        return this.jsonParse(input);
      case "json.stringify":
        return this.jsonStringify(input);
      case "text.template":
        return this.textTemplate(input, context);
      case "array.filter":
        return this.arrayFilter(input);
      case "array.map":
        return this.arrayMap(input);
      default:
        throw createError("UNSUPPORTED_OPERATION", `Unknown operation: ${operation}`);
    }
  }
  
  // ============================================================================
  // JSON Operations
  // ============================================================================
  
  /**
   * Parse JSON string to object
   */
  private async jsonParse(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data, path } = input as {
      data: string;
      path?: string; // Optional JSONPath to extract
    };
    
    if (!data) {
      throw createError("VALIDATION_ERROR", "Data is required for JSON parse");
    }
    
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      throw createError("PARSE_ERROR", `Failed to parse JSON: ${(e as Error).message}`);
    }
    
    // Extract path if provided
    if (path) {
      parsed = this.extractPath(parsed, path);
    }
    
    return {
      success: true,
      data: parsed,
      output: parsed,
    };
  }
  
  /**
   * Stringify object to JSON
   */
  private async jsonStringify(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data, pretty = false } = input as {
      data: unknown;
      pretty?: boolean;
    };
    
    const result = pretty 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    
    return {
      success: true,
      data: result,
      output: result,
    };
  }
  
  // ============================================================================
  // Text Operations
  // ============================================================================
  
  /**
   * Apply text template with variable substitution
   */
  private async textTemplate(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const { template, variables = {} } = input as {
      template: string;
      variables?: Record<string, unknown>;
    };
    
    if (!template) {
      throw createError("VALIDATION_ERROR", "Template is required");
    }
    
    // Merge context variables with provided variables
    const allVariables = {
      ...variables,
      trigger: context.triggerInput,
    };
    
    // Simple template interpolation: {{variable}} or {{nested.path}}
    const result = template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const value = this.extractPath(allVariables, path.trim());
      if (value === undefined || value === null) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
    
    return {
      success: true,
      data: result,
      output: result,
    };
  }
  
  // ============================================================================
  // Array Operations
  // ============================================================================
  
  /**
   * Filter array based on condition
   */
  private async arrayFilter(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { array, field, operator, value } = input as {
      array: unknown[];
      field: string;
      operator: "equals" | "notEquals" | "contains" | "gt" | "lt" | "gte" | "lte" | "exists";
      value?: unknown;
    };
    
    if (!Array.isArray(array)) {
      throw createError("VALIDATION_ERROR", "Array is required");
    }
    
    const filtered = array.filter(item => {
      const itemValue = this.extractPath(item, field);
      
      switch (operator) {
        case "equals":
          return itemValue === value;
        case "notEquals":
          return itemValue !== value;
        case "contains":
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        case "gt":
          return Number(itemValue) > Number(value);
        case "lt":
          return Number(itemValue) < Number(value);
        case "gte":
          return Number(itemValue) >= Number(value);
        case "lte":
          return Number(itemValue) <= Number(value);
        case "exists":
          return itemValue !== undefined && itemValue !== null;
        default:
          return true;
      }
    });
    
    return {
      success: true,
      data: filtered,
      count: filtered.length,
      output: filtered,
    };
  }
  
  /**
   * Map array to extract/transform fields
   */
  private async arrayMap(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { array, fields, transform } = input as {
      array: unknown[];
      fields?: string[]; // Extract these fields
      transform?: Record<string, string>; // Map old field names to new
    };
    
    if (!Array.isArray(array)) {
      throw createError("VALIDATION_ERROR", "Array is required");
    }
    
    let mapped: unknown[];
    
    if (fields && fields.length > 0) {
      // Extract specific fields
      mapped = array.map(item => {
        const result: Record<string, unknown> = {};
        for (const field of fields) {
          result[field] = this.extractPath(item, field);
        }
        return result;
      });
    } else if (transform) {
      // Transform field names
      mapped = array.map(item => {
        const result: Record<string, unknown> = {};
        for (const [oldKey, newKey] of Object.entries(transform)) {
          result[newKey] = this.extractPath(item, oldKey);
        }
        return result;
      });
    } else {
      // No transformation, return as-is
      mapped = array;
    }
    
    return {
      success: true,
      data: mapped,
      count: mapped.length,
      output: mapped,
    };
  }
  
  // ============================================================================
  // Helpers
  // ============================================================================
  
  /**
   * Extract value from object using dot notation path
   */
  private extractPath(obj: unknown, path: string): unknown {
    if (!path) return obj;
    
    const parts = path.split(".");
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // Handle array index notation: field[0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, field, index] = arrayMatch;
        current = (current as Record<string, unknown>)[field];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }
    
    return current;
  }
}

// Export singleton instance
export const transformAdapter = new TransformAdapter();


