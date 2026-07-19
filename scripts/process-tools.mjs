import path from "node:path";

export function npxInvocation(args) {
  const npxCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
  return { command: process.execPath, args: [npxCli, ...args] };
}
