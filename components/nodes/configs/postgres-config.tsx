/**
 * PostgreSQL Node Configuration
 * 
 * Allows connecting to a PostgreSQL database and running queries.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Database, CheckCircle2, Loader2, Table, RefreshCw } from "lucide-react";
import { DroppableInput, DroppableTextarea } from "../droppable-input";

const OPERATIONS = [
  { value: "postgres.query", label: "Execute Query", description: "Run a custom SQL query" },
  { value: "postgres.getRows", label: "Get Rows", description: "Fetch rows from a table" },
  { value: "postgres.listTables", label: "List Tables", description: "List all tables in the database" },
  { value: "postgres.insert", label: "Insert Row", description: "Insert a new row into a table" },
  { value: "postgres.update", label: "Update Rows", description: "Update rows in a table" },
  { value: "postgres.delete", label: "Delete Rows", description: "Delete rows from a table" },
];

interface PostgresConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

// Debounce hook for text inputs
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

export function PostgresConfig({ data, onChange, inputData }: PostgresConfigProps) {
  const operation = (data.operation as string) || "postgres.query";
  
  // Local state for text inputs (to prevent lag)
  const [connectionString, setConnectionString] = useState((data.connectionString as string) || "");
  const [query, setQuery] = useState((data.query as string) || "");
  const [table, setTable] = useState((data.table as string) || "");
  const [schema, setSchema] = useState((data.schema as string) || "public");
  const [where, setWhere] = useState((data.where as string) || "");
  const [limit, setLimit] = useState((data.limit as string) || "100");
  const [dataJson, setDataJson] = useState((data.data as string) || "{}");
  
  // Connection test state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "error" | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Sync local state with external data changes
  useEffect(() => {
    setConnectionString((data.connectionString as string) || "");
    setQuery((data.query as string) || "");
    setTable((data.table as string) || "");
    setSchema((data.schema as string) || "public");
    setWhere((data.where as string) || "");
    setLimit((data.limit as string) || "100");
    setDataJson((data.data as string) || "{}");
  }, [data]);
  
  // Debounced onChange handlers
  const debouncedOnChange = useDebouncedCallback(
    (updates: Record<string, unknown>) => onChange(updates),
    300
  );
  
  // Test connection
  const testConnection = async () => {
    if (!connectionString) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const response = await fetch("/api/postgres/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus("connected");
        setTables(result.tables || []);
      } else {
        setConnectionStatus("error");
        setConnectionError(result.error || "Connection failed");
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError("Failed to test connection");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <h3 className="font-medium">Database Connection</h3>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="connectionString">Connection String</Label>
          <div className="flex gap-2">
            <DroppableInput
              id="connectionString"
              type="password"
              value={connectionString}
              onChange={(e) => {
                const value = e.target.value;
                setConnectionString(value);
                debouncedOnChange({ connectionString: value });
              }}
              onVariableDrop={(variable) => {
                const newValue = connectionString + variable;
                setConnectionString(newValue);
                onChange({ connectionString: newValue });
              }}
              placeholder="postgresql://user:password@host:5432/database"
              className="flex-1 font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={isConnecting || !connectionString}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Format: postgresql://user:password@host:port/database
          </p>
        </div>
        
        {/* Connection Status */}
        {connectionStatus === "connected" && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-500">Connected successfully</span>
            {tables.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {tables.length} tables
              </Badge>
            )}
          </div>
        )}
        
        {connectionStatus === "error" && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{connectionError || "Connection failed"}</p>
          </div>
        )}
      </div>
      
      {/* Operation Selection */}
      <div className="space-y-2">
        <Label htmlFor="operation">Operation</Label>
        <Select
          value={operation}
          onValueChange={(value) => onChange({ operation: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            {OPERATIONS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                <div className="flex flex-col">
                  <span>{op.label}</span>
                  <span className="text-xs text-muted-foreground">{op.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Schema (for all operations) */}
      <div className="space-y-2">
        <Label htmlFor="schema">Schema</Label>
        <DroppableInput
          id="schema"
          value={schema}
          onChange={(e) => {
            const value = e.target.value;
            setSchema(value);
            debouncedOnChange({ schema: value });
          }}
          onVariableDrop={(variable) => {
            const newValue = schema + variable;
            setSchema(newValue);
            onChange({ schema: newValue });
          }}
          placeholder="public"
        />
      </div>
      
      {/* Operation-specific fields */}
      {operation === "postgres.query" && (
        <div className="space-y-2">
          <Label htmlFor="query">SQL Query</Label>
          <DroppableTextarea
            id="query"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              debouncedOnChange({ query: value });
            }}
            onVariableDrop={(variable) => {
              const newValue = query + variable;
              setQuery(newValue);
              onChange({ query: newValue });
            }}
            placeholder="SELECT * FROM users WHERE id = 1"
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span>Use variables like {"{{nodes.nodeId.field}}"} to inject dynamic values</span>
          </div>
        </div>
      )}
      
      {(operation === "postgres.getRows" || operation === "postgres.insert" || operation === "postgres.update" || operation === "postgres.delete") && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table">Table Name</Label>
            {tables.length > 0 ? (
              <Select
                value={table}
                onValueChange={(value) => {
                  setTable(value);
                  onChange({ table: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t} value={t}>
                      <div className="flex items-center gap-2">
                        <Table className="h-3 w-3" />
                        {t}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <DroppableInput
                id="table"
                value={table}
                onChange={(e) => {
                  const value = e.target.value;
                  setTable(value);
                  debouncedOnChange({ table: value });
                }}
                onVariableDrop={(variable) => {
                  const newValue = table + variable;
                  setTable(newValue);
                  onChange({ table: newValue });
                }}
                placeholder="users"
              />
            )}
          </div>
        </div>
      )}
      
      {operation === "postgres.getRows" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="where">WHERE Clause (optional)</Label>
            <DroppableInput
              id="where"
              value={where}
              onChange={(e) => {
                const value = e.target.value;
                setWhere(value);
                debouncedOnChange({ where: value });
              }}
              onVariableDrop={(variable) => {
                const newValue = where + variable;
                setWhere(newValue);
                onChange({ where: newValue });
              }}
              placeholder="status = 'active' AND created_at > '2024-01-01'"
              className="font-mono text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="limit">Limit</Label>
            <DroppableInput
              id="limit"
              type="number"
              value={limit}
              onChange={(e) => {
                const value = e.target.value;
                setLimit(value);
                debouncedOnChange({ limit: parseInt(value) || 100 });
              }}
              onVariableDrop={(variable) => {
                const newValue = variable;
                setLimit(newValue);
                onChange({ limit: newValue });
              }}
              placeholder="100"
            />
          </div>
        </>
      )}
      
      {(operation === "postgres.insert" || operation === "postgres.update") && (
        <div className="space-y-2">
          <Label htmlFor="data">Data (JSON)</Label>
          <DroppableTextarea
            id="data"
            value={dataJson}
            onChange={(e) => {
              const value = e.target.value;
              setDataJson(value);
              debouncedOnChange({ data: value });
            }}
            onVariableDrop={(variable) => {
              const newValue = dataJson + variable;
              setDataJson(newValue);
              onChange({ data: newValue });
            }}
            placeholder={'{\n  "name": "John Doe",\n  "email": "john@example.com"\n}'}
            rows={6}
            className="font-mono text-sm"
          />
        </div>
      )}
      
      {(operation === "postgres.update" || operation === "postgres.delete") && (
        <div className="space-y-2">
          <Label htmlFor="where">WHERE Clause (required)</Label>
          <DroppableInput
            id="where"
            value={where}
            onChange={(e) => {
              const value = e.target.value;
              setWhere(value);
              debouncedOnChange({ where: value });
            }}
            onVariableDrop={(variable) => {
              const newValue = where + variable;
              setWhere(newValue);
              onChange({ where: newValue });
            }}
            placeholder="id = 1"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            ⚠️ WHERE clause is required to prevent accidental bulk updates/deletes
          </p>
        </div>
      )}
      
      {/* Output Info */}
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <h4 className="text-sm font-medium">Output</h4>
        <p className="text-xs text-muted-foreground">
          {operation === "postgres.listTables" && "Returns a list of all tables with row counts."}
          {operation === "postgres.getRows" && "Returns rows from the table with column metadata."}
          {operation === "postgres.query" && "Returns the query results as an array of rows."}
          {operation === "postgres.insert" && "Returns the inserted row."}
          {operation === "postgres.update" && "Returns the updated rows."}
          {operation === "postgres.delete" && "Returns the deleted rows."}
        </p>
      </div>
    </div>
  );
}


