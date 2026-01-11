"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Node } from "@xyflow/react";
import type { NodeData } from "@/lib/engine/types";

interface CoingateConfigProps {
  node: Node<NodeData>;
  onChange: (updates: Partial<NodeData>) => void;
}

export default function CoingateConfig({ node, onChange }: CoingateConfigProps) {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleChange = (key: string, value: string | number) => {
    onChange({
      config: {
        ...node.data.config,
        [key]: value,
      },
    });
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const apiKey = node.data.config?.apiKey;
      if (!apiKey) {
        setTestResult("❌ Please enter your CoinGate API key");
        return;
      }

      // Test the API key by making a simple request
      const response = await fetch("https://api.coingate.com/v2/rates", {
        headers: {
          "Authorization": `Token ${apiKey}`,
        },
      });

      if (response.ok) {
        setTestResult("✅ API key is valid!");
      } else {
        setTestResult("❌ Invalid API key");
      }
    } catch (error) {
      setTestResult("❌ Connection failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apiKey">CoinGate API Key *</Label>
        <Input
          id="apiKey"
          type="password"
          value={node.data.config?.apiKey || ""}
          onChange={(e) => handleChange("apiKey", e.target.value)}
          placeholder="Your CoinGate API Key"
        />
        <p className="text-xs text-muted-foreground">
          Get your API key from{" "}
          <a
            href="https://coingate.com/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            CoinGate Dashboard
          </a>
        </p>
        <Button
          onClick={testConnection}
          disabled={testing || !node.data.config?.apiKey}
          variant="outline"
          size="sm"
        >
          {testing ? "Testing..." : "Test Connection"}
        </Button>
        {testResult && (
          <p className="text-sm mt-2">{testResult}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="orderId">Order ID (Optional)</Label>
        <Input
          id="orderId"
          value={node.data.config?.orderId || ""}
          onChange={(e) => handleChange("orderId", e.target.value)}
          placeholder="order_123"
        />
        <p className="text-xs text-muted-foreground">
          Custom identifier for your order
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceAmount">Price Amount *</Label>
        <Input
          id="priceAmount"
          type="number"
          value={node.data.config?.priceAmount || ""}
          onChange={(e) => handleChange("priceAmount", parseFloat(e.target.value))}
          placeholder="20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceCurrency">Price Currency *</Label>
        <Select
          value={node.data.config?.priceCurrency || "USD"}
          onValueChange={(value) => handleChange("priceCurrency", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
            <SelectItem value="BTC">BTC</SelectItem>
            <SelectItem value="ETH">ETH</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="receiveCurrency">Receive Currency *</Label>
        <Select
          value={node.data.config?.receiveCurrency || "BTC"}
          onValueChange={(value) => handleChange("receiveCurrency", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select crypto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
            <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
            <SelectItem value="USDT">Tether (USDT)</SelectItem>
            <SelectItem value="LTC">Litecoin (LTC)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Cryptocurrency you want to receive
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="successUrl">Success URL</Label>
        <Input
          id="successUrl"
          value={node.data.config?.successUrl || ""}
          onChange={(e) => handleChange("successUrl", e.target.value)}
          placeholder="https://your-app.com/success"
        />
        <p className="text-xs text-muted-foreground">
          Redirect URL after successful payment
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cancelUrl">Cancel URL</Label>
        <Input
          id="cancelUrl"
          value={node.data.config?.cancelUrl || ""}
          onChange={(e) => handleChange("cancelUrl", e.target.value)}
          placeholder="https://your-app.com/cancel"
        />
        <p className="text-xs text-muted-foreground">
          Redirect URL if payment is cancelled
        </p>
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-medium mb-2">How it works:</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Create a payment order with your desired amount</li>
          <li>CoinGate generates a unique payment URL</li>
          <li>Customer pays using their preferred cryptocurrency</li>
          <li>Webhook triggers your workflow when payment status changes</li>
          <li>Use the payment data in subsequent workflow nodes</li>
        </ol>
      </div>
    </div>
  );
}


