#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

const [toolName, ...jsonArgs] = process.argv.slice(2);
const args = jsonArgs.map(a => JSON.parse(a));

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js", "opencode-indesign.json"]
});

const client = new Client({ name: "mcp-tool", version: "1.0.0" });

try {
  await client.connect(transport);
  
  const result = await client.request(
    {
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args[0] || {}
      }
    },
    { timeout: 60000 }
  );
  
  console.log(JSON.stringify(result));
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  transport.close();
}
