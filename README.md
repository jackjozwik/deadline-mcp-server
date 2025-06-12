# Deadline MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with intelligent access to Deadline (Thinkbox) documentation. Search and retrieve information from User Manual, Scripting Reference, and Python Reference with natural language queries.

## ✨ Features

- 🔍 **Smart Documentation Search** - Full-text search across all Deadline documentation
- 📚 **Multiple Documentation Types** - User Manual, Scripting Reference, Python Reference  
- 💻 **Code Example Extraction** - Find relevant code snippets and examples
- 🌐 **Dual Mode Operation** - Local documentation with remote fallback
- 🚀 **Universal Compatibility** - Works with all MCP clients (Cursor, Claude Desktop, Windsurf, etc.)
- 📦 **NPX Distribution** - Easy installation and updates

## 🚀 Quick Start

### NPX Installation (Recommended)
```bash
npx deadline-mcp-server
```

### Global Installation
```bash
npm install -g deadline-mcp-server
deadline-mcp-server
```

## 🔧 Configuration

### Environment Variables

Set the path to your local Deadline documentation:

```bash
# Windows
DEADLINE_DOCS_PATH=C:\Path\To\Your\Deadline-Documentation

# macOS/Linux  
DEADLINE_DOCS_PATH=/path/to/your/deadline-documentation
```

### MCP Client Setup

#### Cursor
Add to your Cursor settings (`Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"):

```json
{
  "mcp": {
    "mcpServers": {
      "deadline-docs": {
        "command": "npx",
        "args": ["deadline-mcp-server"],
        "env": {
          "DEADLINE_DOCS_PATH": "C:\\Path\\To\\Your\\Deadline-Documentation"
        }
      }
    }
  }
}
```

#### Claude Desktop
Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "deadline-docs": {
      "command": "npx", 
      "args": ["deadline-mcp-server"],
      "env": {
        "DEADLINE_DOCS_PATH": "/path/to/your/deadline-documentation"
      }
    }
  }
}
```

## 🛠️ Available Tools

### search_deadline_docs
Search across all Deadline documentation with natural language queries.

```
"Search for job submission in Python"
"How to use DeadlineCon commands"
"Find information about render farm setup"
```

### get_deadline_document  
Retrieve specific documents by ID from search results.

### get_deadline_code_examples
Find code examples for specific Deadline functionality.

```
"Show me DeadlineCon examples"
"Python job submission code"
```

### browse_deadline_sections
Browse documentation by section or topic.

```
"Browse the Jobs section"
"Show Plugin documentation"
```

## 📁 Local Documentation Setup

1. **Download Deadline Documentation**
   - Download HTML documentation from Thinkbox
   - Includes User Manual, Scripting Reference, Python Reference

2. **Organize Documentation**
   ```
   Deadline-Documentation/
   ├── Deadline-X.X.X-User-Manual/
   ├── Deadline-X.X.X-Scripting-Reference/
   └── Deadline-X.X.X-Standalone-Python-Reference/
   ```

3. **Set Environment Variable**
   Point `DEADLINE_DOCS_PATH` to your documentation folder

4. **First Run Indexing**
   The server automatically indexes documentation on first run, creating a SQLite database for fast searching.

## 🏗️ Architecture

- **Local Mode**: Indexes HTML docs into SQLite with FTS5 full-text search
- **Remote Mode**: Fallback with curated responses when local docs unavailable
- **Universal MCP**: Compatible with all MCP clients

## 🐛 Troubleshooting

### Common Issues

**"No local documentation found"**
- Verify `DEADLINE_DOCS_PATH` environment variable
- Check that documentation folders exist
- Ensure folder structure matches expected pattern

**"Database indexing failed"**  
- Check file permissions and disk space
- Verify HTML files are readable

**"MCP connection failed"**
- Check MCP client configuration
- Restart your AI client after configuration changes

### Debug Mode
```bash
DEBUG=* npx deadline-mcp-server
```

## 📄 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch  
3. Make your changes
4. Submit a pull request

## 📞 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: Check the Setup Guide for detailed instructions
- **Community**: Join discussions in GitHub Issues 