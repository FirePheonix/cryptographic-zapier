/**
 * Variable Interpolation Engine
 * 
 * Handles variable resolution in node configurations.
 * Supports: {{trigger.field}}, {{previous.output}}, {{nodes.nodeId.field}}, {{env.VAR}}
 */

import type { ExecutionContext, VariableReference, VariableSource } from "./types";

/**
 * Pattern to match variable references: {{source.path.to.value}}
 */
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Parse a variable reference string into structured form
 */
export function parseVariableReference(ref: string): VariableReference {
  const parts = ref.trim().split(".");
  const source = parts[0] as VariableSource;
  
  if (source === "nodes" && parts.length > 1) {
    return {
      source,
      nodeId: parts[1],
      path: parts.slice(2),
    };
  }
  
  return {
    source,
    path: parts.slice(1),
  };
}

/**
 * Resolve a value from a nested object using a path array
 * Supports array expansion syntax: path[] will expand arrays
 * Supports array index syntax: path[0] will get specific index
 */
function resolvePathValue(obj: unknown, path: string[]): unknown {
  if (path.length === 0) return obj;
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== "object") return undefined;
  
  const [first, ...rest] = path;
  
  // Handle array expansion syntax: field[]
  if (first.endsWith("[]")) {
    const fieldName = first.slice(0, -2);
    const value = fieldName ? (obj as Record<string, unknown>)[fieldName] : obj;
    
    if (!Array.isArray(value)) return undefined;
    
    // If this is the last part, return the array
    if (rest.length === 0) return value;
    
    // Otherwise, map over array and resolve path for each item
    return value.map(item => resolvePathValue(item, rest)).filter(v => v !== undefined);
  }
  
  // Handle array index syntax: field[0] or just [0]
  const indexMatch = first.match(/^(.*)?\[(\d+)\]$/);
  if (indexMatch) {
    const fieldName = indexMatch[1];
    const index = parseInt(indexMatch[2], 10);
    
    let arr: unknown[];
    if (fieldName) {
      const fieldValue = (obj as Record<string, unknown>)[fieldName];
      if (!Array.isArray(fieldValue)) return undefined;
      arr = fieldValue;
    } else if (Array.isArray(obj)) {
      arr = obj;
    } else {
      return undefined;
    }
    
    const value = arr[index];
    if (rest.length === 0) return value;
    return resolvePathValue(value, rest);
  }
  
  const value = (obj as Record<string, unknown>)[first];
  
  if (rest.length === 0) return value;
  return resolvePathValue(value, rest);
}

/**
 * Resolve a single variable reference to its value
 */
export function resolveVariable(
  ref: VariableReference,
  context: ExecutionContext
): unknown {
  switch (ref.source) {
    case "trigger":
      return resolvePathValue(context.triggerInput, ref.path);
    
    case "input": {
      // "input" is an alias that resolves from nodeOutputs
      // {{input.nodeId.field}} -> get nodeId's output, then field
      // {{input.field}} -> get from triggerInput or first nodeOutput
      if (ref.path.length === 0) {
        // Return all available inputs
        const inputs: Record<string, unknown> = { ...context.triggerInput };
        for (const [nodeId, result] of context.nodeOutputs) {
          if (result.success) {
            inputs[nodeId] = result.output;
          }
        }
        return inputs;
      }
      
      const firstPathPart = ref.path[0];
      
      // Check if first part is a nodeId
      if (context.nodeOutputs.has(firstPathPart)) {
        const nodeResult = context.nodeOutputs.get(firstPathPart);
        if (!nodeResult?.success) return undefined;
        return resolvePathValue(nodeResult.output, ref.path.slice(1));
      }
      
      // Otherwise, try triggerInput
      return resolvePathValue(context.triggerInput, ref.path);
    }
    
    case "previous": {
      // Get the most recent node output
      const outputs = Array.from(context.nodeOutputs.values());
      const lastOutput = outputs[outputs.length - 1];
      if (!lastOutput?.success) return undefined;
      
      if (ref.path.length === 0 || (ref.path.length === 1 && ref.path[0] === "output")) {
        return lastOutput.output;
      }
      return resolvePathValue(lastOutput.output, ref.path);
    }
    
    case "nodes": {
      if (!ref.nodeId) return undefined;
      const nodeResult = context.nodeOutputs.get(ref.nodeId);
      if (!nodeResult?.success) return undefined;
      
      // Handle "output" prefix - skip it since nodeResult.output is already the output
      let path = ref.path;
      if (path.length > 0 && path[0] === "output") {
        path = path.slice(1);
      }
      
      return resolvePathValue(nodeResult.output, path);
    }
    
    case "flow": {
      // Handle flow context from iterator ({{flow.item}}, {{flow.index}}, {{flow.totalItems}})
      const flowContext = context.variables?.flow;
      if (!flowContext) return undefined;
      return resolvePathValue(flowContext, ref.path);
    }
    
    case "env": {
      const envKey = ref.path[0];
      if (!envKey) return undefined;
      return process.env[envKey];
    }
    
    default:
      return undefined;
  }
}

/**
 * Convert a value to string for interpolation
 * Arrays are joined with commas (useful for email "to" fields)
 */
function valueToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  
  // Handle arrays - join with commas (useful for email recipients)
  if (Array.isArray(value)) {
    return value.map(v => valueToString(v)).filter(s => s !== "").join(", ");
  }
  
  return JSON.stringify(value);
}

/**
 * Interpolate all variables in a string template
 */
export function interpolateString(
  template: string,
  context: ExecutionContext
): string {
  if (!template || typeof template !== "string") return template;
  
  return template.replace(VARIABLE_PATTERN, (_match, refString: string) => {
    const ref = parseVariableReference(refString);
    const value = resolveVariable(ref, context);
    return valueToString(value);
  });
}

/**
 * Check if a string contains variable references
 */
export function hasVariables(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  return VARIABLE_PATTERN.test(str);
}

/**
 * Interpolate variables in an entire configuration object
 * Recursively processes strings, arrays, and nested objects
 */
export function interpolateConfig(
  config: Record<string, unknown>,
  context: ExecutionContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(config)) {
    result[key] = interpolateValue(value, context);
  }
  
  return result;
}

/**
 * Interpolate a single value (recursive helper)
 */
function interpolateValue(value: unknown, context: ExecutionContext): unknown {
  if (value === null || value === undefined) return value;
  
  if (typeof value === "string") {
    // Check if the entire string is a single variable reference
    const trimmed = value.trim();
    if (trimmed.startsWith("{{") && trimmed.endsWith("}}") && !trimmed.slice(2, -2).includes("{{")) {
      // Return the raw value (preserves type)
      const ref = parseVariableReference(trimmed.slice(2, -2));
      return resolveVariable(ref, context);
    }
    // Otherwise interpolate as string
    return interpolateString(value, context);
  }
  
  if (Array.isArray(value)) {
    return value.map(item => interpolateValue(item, context));
  }
  
  if (typeof value === "object") {
    return interpolateConfig(value as Record<string, unknown>, context);
  }
  
  return value;
}

/**
 * Extract all variable references from a template string
 */
export function extractVariables(template: string): VariableReference[] {
  if (!template || typeof template !== "string") return [];
  
  const refs: VariableReference[] = [];
  let match: RegExpExecArray | null;
  
  // Reset lastIndex for global regex
  VARIABLE_PATTERN.lastIndex = 0;
  
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    refs.push(parseVariableReference(match[1]));
  }
  
  return refs;
}

/**
 * Validate that all required variables are available in context
 */
export function validateVariables(
  config: Record<string, unknown>,
  context: ExecutionContext
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  function checkValue(value: unknown, path: string) {
    if (typeof value === "string") {
      const refs = extractVariables(value);
      for (const ref of refs) {
        const resolved = resolveVariable(ref, context);
        if (resolved === undefined) {
          const refPath = ref.nodeId 
            ? `nodes.${ref.nodeId}.${ref.path.join(".")}`
            : `${ref.source}.${ref.path.join(".")}`;
          missing.push(`${path}: ${refPath}`);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => checkValue(item, `${path}[${index}]`));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        checkValue(v, `${path}.${k}`);
      }
    }
  }
  
  for (const [key, value] of Object.entries(config)) {
    checkValue(value, key);
  }
  
  return { valid: missing.length === 0, missing };
}


