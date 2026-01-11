/**
 * Google Sheets Node Component
 * 
 * PURELY DECLARATIVE - No API logic here.
 * This component only renders the UI based on the node schema.
 * All execution happens in the engine (lib/engine/adapters/google.ts).
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { 
  TableIcon, 
  PlusIcon, 
  EditIcon, 
  SearchIcon, 
  ListIcon,
  TrashIcon 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NodeLayout } from "../layout";
import { googleSheetsSchema } from "@/lib/engine/node-schemas";
import { GoogleConnection } from "@/components/google-connection";

// Operations from schema
const OPERATIONS = googleSheetsSchema.operations || [];

export type GoogleSheetsNodeData = {
  operation?: string;
  spreadsheetId?: string;
  range?: string;
  values?: string;
  searchColumn?: string;
  searchValue?: string;
  updateValues?: string;
  credentialId?: string;
};

type GoogleSheetsNodeProps = NodeProps & {
  data: GoogleSheetsNodeData;
};

const OperationIcon = ({ operation }: { operation?: string }) => {
  switch (operation) {
    case "sheets.appendRow":
      return <PlusIcon className="h-4 w-4" />;
    case "sheets.updateRow":
      return <EditIcon className="h-4 w-4" />;
    case "sheets.findRow":
      return <SearchIcon className="h-4 w-4" />;
    case "sheets.getRows":
      return <ListIcon className="h-4 w-4" />;
    case "sheets.deleteRow":
      return <TrashIcon className="h-4 w-4" />;
    default:
      return <TableIcon className="h-4 w-4" />;
  }
};

export const GoogleSheetsNode = ({ id, data, type }: GoogleSheetsNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const operation = data.operation || "sheets.appendRow";

  const handleChange = (field: keyof GoogleSheetsNodeData, value: string) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title={googleSheetsSchema.name}>
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-green-600">
          <TableIcon className="h-5 w-5" />
          <span className="font-semibold">{googleSheetsSchema.name}</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-operation`}>Operation</Label>
            <Select
              value={operation}
              onValueChange={(value) => handleChange("operation", value)}
            >
              <SelectTrigger id={`${id}-operation`}>
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                {OPERATIONS.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    <div className="flex items-center gap-2">
                      <OperationIcon operation={op.id} />
                      <span>{op.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Common fields for all operations */}
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-spreadsheetId`}>Spreadsheet ID</Label>
            <Input
              id={`${id}-spreadsheetId`}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={data.spreadsheetId || ""}
              onChange={(e) => handleChange("spreadsheetId", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              From your spreadsheet URL: /spreadsheets/d/[ID]/edit
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-range`}>Range</Label>
            <Input
              id={`${id}-range`}
              placeholder="Sheet1!A:E"
              value={data.range || ""}
              onChange={(e) => handleChange("range", e.target.value)}
            />
          </div>

          {/* Append Row fields */}
          {operation === "sheets.appendRow" && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-values`}>Values (JSON Array)</Label>
              <Textarea
                id={`${id}-values`}
                placeholder='["{{trigger.name}}", "{{trigger.email}}", "{{previous.output}}"]'
                value={data.values || ""}
                onChange={(e) => handleChange("values", e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                JSON array of values to append as a new row
              </p>
            </div>
          )}

          {/* Find/Update Row fields */}
          {(operation === "sheets.findRow" || operation === "sheets.updateRow" || operation === "sheets.deleteRow") && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-searchColumn`}>Search Column</Label>
                <Input
                  id={`${id}-searchColumn`}
                  placeholder="A"
                  value={data.searchColumn || ""}
                  onChange={(e) => handleChange("searchColumn", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-searchValue`}>Search Value</Label>
                <Input
                  id={`${id}-searchValue`}
                  placeholder="{{trigger.email}}"
                  value={data.searchValue || ""}
                  onChange={(e) => handleChange("searchValue", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Update Row values field */}
          {operation === "sheets.updateRow" && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-updateValues`}>New Values (JSON Array)</Label>
              <Textarea
                id={`${id}-updateValues`}
                placeholder='["{{previous.output}}", "updated", "{{trigger.status}}"]'
                value={data.updateValues || ""}
                onChange={(e) => handleChange("updateValues", e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                New values to update the found row with
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs">
          <p className="font-medium mb-1">Variable Interpolation:</p>
          <p className="text-muted-foreground font-mono">
            {"{{trigger.fieldName}}"} - Field from webhook/trigger
          </p>
          <p className="text-muted-foreground font-mono">
            {"{{previous.output}}"} - Output from previous node
          </p>
        </div>

        {/* Google Connection Status */}
        <GoogleConnection service="sheets" />
      </div>
    </NodeLayout>
  );
};


