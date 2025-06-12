#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { DeadlineDocSearch } from './search.js';

// Create MCP server
const server = new Server(
  {
    name: 'deadline-docs',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize search engine
const search = new DeadlineDocSearch();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_deadline_docs',
        description: 'Search Deadline documentation for specific topics, functions, or concepts',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for Deadline documentation',
            },
            doc_type: {
              type: 'string',
              enum: ['user-manual', 'scripting-reference', 'python-reference'],
              description: 'Specific documentation type to search in (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_deadline_document',
        description: 'Get a specific Deadline documentation section by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Document ID to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_deadline_code_examples',
        description: 'Find code examples related to a specific Deadline functionality',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term for code examples (e.g., "submit job", "DeadlineCon")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of examples to return (default: 5)',
              default: 5,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'browse_deadline_sections',
        description: 'Browse Deadline documentation by section or topic',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'Section name to browse (e.g., "Jobs", "Plugins", "Scripting")',
            },
            doc_type: {
              type: 'string',
              enum: ['user-manual', 'scripting-reference', 'python-reference'],
              description: 'Specific documentation type to browse (optional)',
            },
          },
          required: ['section'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_deadline_docs': {
        const { query, doc_type, limit = 10 } = args as {
          query: string;
          doc_type?: 'user-manual' | 'scripting-reference' | 'python-reference';
          limit?: number;
        };

        if (!query) {
          throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required');
        }

        const results = await search.searchDocumentation(query, doc_type, limit);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No results found for "${query}". Try different keywords or check spelling.`,
              },
            ],
          };
        }

        const stats = await search.getStats();
        
        return {
          content: [
            {
              type: 'text',
              text: `# Deadline Documentation Search Results\n\nFound ${results.length} result(s) for "${query}":\n\n${results
                .map((result, index) => {
                  return `## ${index + 1}. ${result.section.title}\n**Type:** ${result.section.docType}\n**Section:** ${result.section.section || 'General'}\n**Score:** ${result.score}\n\n${result.matches[0]}\n\n**Document ID:** \`${result.section.id}\`\n\n---`;
                })
                .join('\n\n')}\n\n*Database contains ${stats.total} documents: ${Object.entries(stats.byType).map(([type, count]) => `${type} (${count})`).join(', ')}*`,
            },
          ],
        };
      }

      case 'get_deadline_document': {
        const { id } = args as { id: string };

        if (!id) {
          throw new McpError(ErrorCode.InvalidParams, 'Document ID is required');
        }

        const document = await search.getDocumentById(id);
        
        if (!document) {
          return {
            content: [
              {
                type: 'text',
                text: `Document with ID "${id}" not found.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `# ${document.title}\n\n**Type:** ${document.docType}\n**Section:** ${document.section || 'General'}\n**URL:** ${document.url}\n\n## Content\n\n${document.content}\n\n${document.codeExamples && document.codeExamples.length > 0 ? `## Code Examples\n\n${document.codeExamples.map(example => `\`\`\`\n${example}\n\`\`\``).join('\n\n')}\n\n` : ''}${document.keywords && document.keywords.length > 0 ? `**Keywords:** ${document.keywords.join(', ')}` : ''}`,
            },
          ],
        };
      }

      case 'get_deadline_code_examples': {
        const { query, limit = 5 } = args as {
          query: string;
          limit?: number;
        };

        if (!query) {
          throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required');
        }

        const examples = await search.getCodeExamples(query, limit);
        
        if (examples.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No code examples found for "${query}". Try searching for related terms like "DeadlineCon", "submit", "job", or "python".`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `# Code Examples for "${query}"\n\nFound ${examples.length} example(s):\n\n${examples
                .map((example, index) => `## Example ${index + 1}\n\n\`\`\`python\n${example}\n\`\`\``)
                .join('\n\n')}`,
            },
          ],
        };
      }

      case 'browse_deadline_sections': {
        const { section, doc_type } = args as {
          section: string;
          doc_type?: string;
        };

        if (!section) {
          throw new McpError(ErrorCode.InvalidParams, 'Section parameter is required');
        }

        const documents = await search.browseSections(section, doc_type);
        
        if (documents.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No documents found in section "${section}". Try different section names like "Jobs", "Workers", "Plugins", "Scripting", or "Python".`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `# Deadline Documentation: ${section}\n\nFound ${documents.length} document(s):\n\n${documents
                .map((doc, index) => {
                  return `## ${index + 1}. ${doc.title}\n**Type:** ${doc.docType}\n**Section:** ${doc.section || 'General'}\n\n${doc.content.substring(0, 200)}...\n\n**Document ID:** \`${doc.id}\`\n\n---`;
                })
                .join('\n\n')}`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error('Tool execution error:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Error handling
server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  await search.close();
  await server.close();
  process.exit(0);
});

// Start server
async function main() {
  console.error('🚀 Starting Deadline Documentation MCP Server...');
  
  // Test database connection
  try {
    const stats = await search.getStats();
    console.error(`📊 Database ready: ${stats.total} documents indexed`);
    console.error(`📚 Documentation types: ${Object.keys(stats.byType).join(', ')}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('💡 Make sure to run the indexer first: npx tsx run-universal-indexer.js');
    process.exit(1);
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Deadline Documentation MCP Server is running!');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 