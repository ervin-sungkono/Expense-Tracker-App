import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuthContext } from './auth';
import { toolError } from './errors';
import { ExpenseMcpRepository } from './repository';
import { expenseToolCatalog, executeExpenseTool } from './tool-catalog';

function success(structuredContent: Record<string, unknown>) {
  return {
    structuredContent,
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
  };
}

export function createExpenseMcpServer(context: McpAuthContext) {
  const server = new McpServer({ name: 'xpensed', version: '1.0.0' });
  const repository = new ExpenseMcpRepository(context.supabase, context.userId);

  for (const tool of expenseToolCatalog) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema as any,
        outputSchema: tool.outputSchema as any,
        annotations: tool.annotations,
      },
      async input => {
        try {
          return success(await executeExpenseTool(repository, tool.name, input));
        } catch (error) {
          return toolError(error);
        }
      }
    );
  }

  return server;
}
