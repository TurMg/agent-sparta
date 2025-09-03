import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { generateSPHDocument } from './tools/sphGenerator';
import { validateSPHData } from './tools/sphValidator';

const server = new Server(
  {
    name: 'agent-ai-sph',
    version: '1.0.0',
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_sph',
        description: 'Generate Surat Penawaran Harga (SPH) document with provided parameters',
        inputSchema: {
          type: 'object',
          properties: {
            customerName: {
              type: 'string',
              description: 'Name of the customer'
            },
            sphDate: {
              type: 'string',
              description: 'Date of SPH in YYYY-MM-DD format'
            },
            services: {
              type: 'array',
              description: 'Array of services to include in SPH',
              items: {
                type: 'object',
                properties: {
                  serviceName: { type: 'string' },
                  connectionCount: { type: 'number' },
                  psbFee: { type: 'number' },
                  monthlyFeeNormal: { type: 'number' },
                  monthlyFeeDiscount: { type: 'number' },
                  discountPercentage: { type: 'number' }
                },
                required: ['serviceName', 'connectionCount', 'psbFee', 'monthlyFeeNormal', 'monthlyFeeDiscount']
              }
            },
            notes: {
              type: 'string',
              description: 'Additional notes or terms'
            },
            attachments: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of attachment file paths'
            }
          },
          required: ['customerName', 'sphDate', 'services']
        }
      },
      {
        name: 'validate_sph_data',
        description: 'Validate SPH data before generating document',
        inputSchema: {
          type: 'object',
          properties: {
            sphData: {
              type: 'object',
              description: 'SPH data to validate'
            }
          },
          required: ['sphData']
        }
      },
      {
        name: 'format_currency',
        description: 'Format number as Indonesian Rupiah currency',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount to format'
            }
          },
          required: ['amount']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_sph':
        const result = await generateSPHDocument(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };

      case 'validate_sph_data':
        const validation = validateSPHData((args as any)?.sphData);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validation, null, 2)
            }
          ]
        };

      case 'format_currency':
        const formatted = formatCurrency((args as any)?.amount);
        return {
          content: [
            {
              type: 'text',
              text: formatted
            }
          ]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Start MCP server
export async function startMCPServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('✅ MCP Server started');
}

// For direct usage without stdio
export { server };
