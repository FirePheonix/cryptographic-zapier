/**
 * Flow Provider Adapter
 * 
 * Handles control-flow operations similar to Make.com's bundle system:
 * - Iterator: Splits array into multiple bundles (1 → N)
 * - Aggregator: Combines bundles into one (N → 1)
 * - Router: Routes bundles to conditional paths
 * - Filter: Allows/blocks bundles based on rules
 * 
 * These nodes transform the execution flow rather than calling external APIs.
 */

import type {
  Credentials,
  ExecutionContext,
  NodeExecutionResult,
  OperationId,
} from "../types";
import { BaseProviderAdapter } from "./base";
import { createError } from "../rate-limit";

// ============================================================================
// Types
// ============================================================================

export type FlowOperation =
  | "flow.iterate"
  | "flow.endIterate"
  | "flow.aggregate"
  | "flow.route"
  | "flow.filter";

export type RouterCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
  targetPath: string;
};

export type IteratorInput = {
  arrayPath: string;
  itemVariable?: string;
  indexVariable?: string;
};

export type AggregatorInput = {
  aggregationMode: "array" | "first" | "last" | "concat" | "sum" | "count" | "custom";
  targetField?: string;
  customExpression?: string;
  maxItems?: number;
  groupByField?: string;
};

export type RouterInput = {
  conditions: RouterCondition[];
  defaultPath?: string;
};

export type FilterInput = {
  filterField: string;
  filterOperator: string;
  filterValue?: string;
  passThrough?: boolean;
};

// ============================================================================
// Flow Provider Adapter
// ============================================================================

export class FlowAdapter extends BaseProviderAdapter {
  readonly providerId = "flow" as const;
  readonly supportedOperations: OperationId[] = [
    "flow.iterate" as OperationId,
    "flow.endIterate" as OperationId,
    "flow.aggregate" as OperationId,
    "flow.route" as OperationId,
    "flow.filter" as OperationId,
  ];
  
  // Store aggregated items between iterations
  private static aggregationBuffer: Map<string, unknown[]> = new Map();
  
  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const flowOp = operation as FlowOperation;
    
    switch (flowOp) {
      case "flow.iterate":
        return this.executeIterator(input as unknown as IteratorInput, context);
      case "flow.endIterate":
        return this.executeEndIterator(input, context);
      case "flow.aggregate":
        return this.executeAggregator(input as unknown as AggregatorInput, context);
      case "flow.route":
        return this.executeRouter(input as unknown as RouterInput, context);
      case "flow.filter":
        return this.executeFilter(input as unknown as FilterInput, context);
      default:
        throw createError("UNSUPPORTED_OPERATION", `Unknown flow operation: ${operation}`);
    }
  }
  
  // ============================================================================
  // Iterator Operation (1 → N)
  // ============================================================================
  
  /**
   * Splits an array into individual items for sequential processing.
   * Each downstream node will be executed once per item.
   * 
   * Returns special metadata that the resolver uses to trigger iteration.
   */
  private async executeIterator(
    input: IteratorInput,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const { arrayPath, itemVariable = "item", indexVariable = "index" } = input;
    
    if (!arrayPath) {
      throw createError("VALIDATION_ERROR", "Array path is required for iterator");
    }
    
    // Resolve the array from context
    const array = this.resolveValue(arrayPath, context);
    
    if (!Array.isArray(array)) {
      throw createError(
        "VALIDATION_ERROR",
        `Expected array at path "${arrayPath}", got ${typeof array}`
      );
    }
    
    // Return iteration metadata - the resolver will handle actual iteration
    return {
      success: true,
      _flowType: "iterator",
      _iterationData: {
        items: array,
        itemVariable,
        indexVariable,
        totalItems: array.length,
      },
      output: {
        totalItems: array.length,
        itemVariable,
        indexVariable,
      },
    };
  }
  
  // ============================================================================
  // End Iterator Operation (marks end of loop)
  // ============================================================================
  
  /**
   * Marks the end of an iteration loop.
   * The resolver uses this to know where to stop iterating.
   * Can optionally collect all results into an array.
   */
  private async executeEndIterator(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const collectResults = input.collectResults !== false;
    const flowContext = (context as any)._flowContext;
    
    // Get the previous node's output for this iteration
    const previousOutput = this.getPreviousOutput(context);
    
    return {
      success: true,
      _flowType: "endIterator",
      _collectResults: collectResults,
      _iterationIndex: flowContext?.index ?? 0,
      _isLastItem: flowContext?.isLastItem ?? true,
      output: previousOutput,
      data: previousOutput,
    };
  }
  
  // ============================================================================
  // Aggregator Operation (N → 1)
  // ============================================================================
  
  /**
   * Collects multiple items/bundles and combines them into one output.
   * Waits for all upstream iterations to complete before producing output.
   */
  private async executeAggregator(
    input: AggregatorInput,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const {
      aggregationMode = "array",
      targetField,
      customExpression,
      maxItems,
      groupByField,
    } = input;
    
    // Get the buffer key for this aggregation (based on workflow execution)
    const bufferKey = `${context.workflowId}:${context.executionId}`;
    
    // Get current item from iteration context if available
    const flowContext = (context as any)._flowContext;
    const currentItem = flowContext?.currentItem;
    
    if (currentItem !== undefined) {
      // We're inside an iteration - add to buffer
      const buffer = FlowAdapter.aggregationBuffer.get(bufferKey) || [];
      const valueToAdd = targetField 
        ? this.extractPath(currentItem, targetField)
        : currentItem;
      
      buffer.push(valueToAdd);
      
      if (maxItems && buffer.length >= maxItems) {
        // Max items reached, produce output
        const result = this.aggregateItems(buffer, aggregationMode, groupByField, customExpression);
        FlowAdapter.aggregationBuffer.delete(bufferKey);
        
        return {
          success: true,
          _flowType: "aggregator",
          _aggregationComplete: true,
          output: result,
          data: result,
        };
      }
      
      FlowAdapter.aggregationBuffer.set(bufferKey, buffer);
      
      // Check if this is the last item
      if (flowContext?.isLastItem) {
        const result = this.aggregateItems(buffer, aggregationMode, groupByField, customExpression);
        FlowAdapter.aggregationBuffer.delete(bufferKey);
        
        return {
          success: true,
          _flowType: "aggregator",
          _aggregationComplete: true,
          output: result,
          data: result,
        };
      }
      
      // Still collecting, return pending status
      return {
        success: true,
        _flowType: "aggregator",
        _aggregationComplete: false,
        _pendingCount: buffer.length,
        output: null,
      };
    }
    
    // Not in iteration context - aggregate from previous node output
    const previousOutput = this.getPreviousOutput(context);
    if (Array.isArray(previousOutput)) {
      const items = targetField 
        ? previousOutput.map(item => this.extractPath(item, targetField))
        : previousOutput;
      
      const result = this.aggregateItems(items, aggregationMode, groupByField, customExpression);
      
      return {
        success: true,
        _flowType: "aggregator",
        _aggregationComplete: true,
        output: result,
        data: result,
      };
    }
    
    // Single item - wrap in array and aggregate
    const result = this.aggregateItems([previousOutput], aggregationMode, groupByField, customExpression);
    
    return {
      success: true,
      _flowType: "aggregator",
      _aggregationComplete: true,
      output: result,
      data: result,
    };
  }
  
  /**
   * Perform the actual aggregation based on mode
   */
  private aggregateItems(
    items: unknown[],
    mode: string,
    groupByField?: string,
    customExpression?: string
  ): unknown {
    // Handle grouping first if specified
    if (groupByField) {
      const groups = new Map<string, unknown[]>();
      
      for (const item of items) {
        const key = String(this.extractPath(item, groupByField) ?? "undefined");
        const group = groups.get(key) || [];
        group.push(item);
        groups.set(key, group);
      }
      
      // Aggregate each group
      const result: Record<string, unknown> = {};
      for (const [key, groupItems] of groups) {
        result[key] = this.aggregateSingleGroup(groupItems, mode, customExpression);
      }
      return result;
    }
    
    return this.aggregateSingleGroup(items, mode, customExpression);
  }
  
  private aggregateSingleGroup(
    items: unknown[],
    mode: string,
    customExpression?: string
  ): unknown {
    switch (mode) {
      case "array":
        return items;
      
      case "first":
        return items[0];
      
      case "last":
        return items[items.length - 1];
      
      case "concat":
        return items.map(String).join("");
      
      case "sum":
        return items.reduce((sum: number, item) => sum + Number(item || 0), 0);
      
      case "count":
        return items.length;
      
      case "custom":
        if (customExpression) {
          try {
            // Safe evaluation with items in scope
            const fn = new Function("items", `return ${customExpression}`);
            return fn(items);
          } catch (e) {
            throw createError("EXPRESSION_ERROR", `Failed to evaluate expression: ${(e as Error).message}`);
          }
        }
        return items;
      
      default:
        return items;
    }
  }
  
  // ============================================================================
  // Router Operation (Conditional Branching)
  // ============================================================================
  
  /**
   * Routes the current bundle to different output paths based on conditions.
   * Returns metadata indicating which path(s) should be taken.
   */
  private async executeRouter(
    input: RouterInput,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const { conditions = [], defaultPath = "default" } = input;
    
    const previousOutput = this.getPreviousOutput(context);
    const matchedPaths: string[] = [];
    
    // Evaluate each condition
    for (const condition of conditions) {
      const fieldValue = this.resolveFieldValue(condition.field, previousOutput, context);
      const matches = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      
      if (matches) {
        matchedPaths.push(condition.targetPath);
      }
    }
    
    // If no conditions matched, use default path
    if (matchedPaths.length === 0) {
      matchedPaths.push(defaultPath);
    }
    
    return {
      success: true,
      _flowType: "router",
      _routePaths: matchedPaths,
      output: previousOutput,
      data: previousOutput,
      matchedPaths,
    };
  }
  
  // ============================================================================
  // Filter Operation (Allow/Block)
  // ============================================================================
  
  /**
   * Evaluates a condition and either passes the bundle through or blocks it.
   */
  private async executeFilter(
    input: FilterInput,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const {
      filterField,
      filterOperator = "equals",
      filterValue,
      passThrough = true,
    } = input;
    
    const previousOutput = this.getPreviousOutput(context);
    const fieldValue = this.resolveFieldValue(filterField, previousOutput, context);
    const matches = this.evaluateCondition(fieldValue, filterOperator, filterValue);
    
    if (matches) {
      // Filter passed - continue execution
      return {
        success: true,
        _flowType: "filter",
        _filterPassed: true,
        output: passThrough ? previousOutput : { filtered: true, originalValue: fieldValue },
        data: passThrough ? previousOutput : { filtered: true },
      };
    }
    
    // Filter blocked - stop this branch
    return {
      success: true,
      _flowType: "filter",
      _filterPassed: false,
      _stopExecution: true,
      output: null,
      data: { filtered: false, reason: `Condition not met: ${filterField} ${filterOperator} ${filterValue}` },
    };
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  /**
   * Resolve a value from path (supports {{variable}} syntax)
   */
  private resolveValue(path: unknown, context: ExecutionContext): unknown {
    // Ensure path is a string
    if (typeof path !== "string") {
      // If it's already an array, return it directly
      if (Array.isArray(path)) {
        return path;
      }
      // If it's an object, return it directly
      if (path && typeof path === "object") {
        return path;
      }
      return path;
    }
    
    // Handle {{variable}} syntax
    const variableMatch = path.match(/^\{\{(.+)\}\}$/);
    if (variableMatch) {
      const varPath = variableMatch[1].trim();
      
      // Handle nodes.NODEID.output.path syntax
      const nodesMatch = varPath.match(/^nodes\.([^.]+)\.output\.?(.*)$/);
      if (nodesMatch) {
        const [, nodeId, outputPath] = nodesMatch;
        const nodeOutput = context.nodeOutputs.get(nodeId);
        if (nodeOutput?.output) {
          return outputPath ? this.extractPath(nodeOutput.output, outputPath) : nodeOutput.output;
        }
        return undefined;
      }
      
      // Check for special prefixes
      if (varPath.startsWith("previous.")) {
        const previousOutput = this.getPreviousOutput(context);
        return this.extractPath(previousOutput, varPath.slice(9));
      }
      
      if (varPath.startsWith("trigger.")) {
        return this.extractPath(context.triggerInput, varPath.slice(8));
      }
      
      if (varPath.startsWith("flow.")) {
        const flowContext = (context as any)._flowContext;
        return this.extractPath(flowContext, varPath.slice(5));
      }
      
      // Try to find in node outputs
      return this.extractPath(context.variables, varPath);
    }
    
    // Direct path - resolve from previous output
    const previousOutput = this.getPreviousOutput(context);
    return this.extractPath(previousOutput, path);
  }
  
  /**
   * Resolve field value from output or context
   */
  private resolveFieldValue(
    field: string,
    output: unknown,
    context: ExecutionContext
  ): unknown {
    // Handle {{variable}} syntax
    if (field.startsWith("{{") && field.endsWith("}}")) {
      return this.resolveValue(field, context);
    }
    
    // Direct field path from output
    return this.extractPath(output, field);
  }
  
  /**
   * Get previous node output from context
   */
  private getPreviousOutput(context: ExecutionContext): unknown {
    // Get the last node's output
    const outputs = Array.from(context.nodeOutputs.values());
    if (outputs.length === 0) {
      return context.triggerInput;
    }
    
    const lastOutput = outputs[outputs.length - 1];
    return lastOutput?.output ?? lastOutput;
  }
  
  /**
   * Extract value from object using dot notation path
   */
  private extractPath(obj: unknown, path: string): unknown {
    if (!path || !obj) return obj;
    
    const parts = path.split(".");
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // Handle array index notation: items[0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, indexStr] = arrayMatch;
        current = (current as Record<string, unknown>)[key];
        if (Array.isArray(current)) {
          current = current[parseInt(indexStr, 10)];
        } else {
          return undefined;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }
    
    return current;
  }
  
  /**
   * Evaluate a filter/router condition
   */
  private evaluateCondition(
    fieldValue: unknown,
    operator: string,
    compareValue?: string
  ): boolean {
    const strValue = String(fieldValue ?? "");
    const compareStr = String(compareValue ?? "");
    
    switch (operator) {
      case "equals":
        return fieldValue === compareValue || strValue === compareStr;
      
      case "notEquals":
        return fieldValue !== compareValue && strValue !== compareStr;
      
      case "contains":
        return strValue.toLowerCase().includes(compareStr.toLowerCase());
      
      case "notContains":
        return !strValue.toLowerCase().includes(compareStr.toLowerCase());
      
      case "startsWith":
        return strValue.toLowerCase().startsWith(compareStr.toLowerCase());
      
      case "endsWith":
        return strValue.toLowerCase().endsWith(compareStr.toLowerCase());
      
      case "gt":
        return Number(fieldValue) > Number(compareValue);
      
      case "gte":
        return Number(fieldValue) >= Number(compareValue);
      
      case "lt":
        return Number(fieldValue) < Number(compareValue);
      
      case "lte":
        return Number(fieldValue) <= Number(compareValue);
      
      case "exists":
        return fieldValue !== undefined && fieldValue !== null;
      
      case "notExists":
        return fieldValue === undefined || fieldValue === null;
      
      case "isEmpty":
        return !fieldValue || (typeof fieldValue === "string" && fieldValue.trim() === "") ||
               (Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case "isNotEmpty":
        return !!fieldValue && 
               !(typeof fieldValue === "string" && fieldValue.trim() === "") &&
               !(Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case "regex":
        try {
          const regex = new RegExp(compareStr);
          return regex.test(strValue);
        } catch {
          return false;
        }
      
      default:
        return false;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const flowAdapter = new FlowAdapter();


