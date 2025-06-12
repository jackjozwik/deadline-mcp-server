# Deadline MCP Server - Setup Guide

Complete setup and troubleshooting guide for the Deadline MCP Server.

## 📋 Prerequisites

- Node.js 18+ installed
- Deadline HTML documentation (User Manual, Scripting Reference, Python Reference)
- MCP-compatible AI client (Cursor, Claude Desktop, Windsurf, etc.)

## 🚀 Installation

### Method 1: NPX (Recommended)
No installation required - runs directly:
```bash
npx deadline-mcp-server
```

### Method 2: Global Installation
```bash
npm install -g deadline-mcp-server
deadline-mcp-server
```

### Method 3: Local Development
```bash
git clone <repository>
cd deadline-mcp-server
npm install
npm run build
node dist/index.js
```

## 📁 Documentation Setup

### 1. Obtain Deadline Documentation

Download the HTML documentation from Thinkbox Software:
- Deadline User Manual
- Deadline Scripting Reference  
- Deadline Standalone Python Reference

### 2. Organize Documentation Structure

Create a folder structure like this:
```
Deadline-Documentation/
├── Deadline-X.X.X-User-Manual/
│   ├── index.html
│   ├── _static/
│   └── ...
├── Deadline-X.X.X-Scripting-Reference/
│   ├── index.html
│   ├── _static/
│   └── ...
└── Deadline-X.X.X-Standalone-Python-Reference/
    ├── index.html
    ├── _static/
    └── ...
```

### 3. Set Environment Variable

**Windows:**
```cmd
set DEADLINE_DOCS_PATH=C:\Path\To\Your\Deadline-Documentation
```

**macOS/Linux:**
```bash
export DEADLINE_DOCS_PATH=/path/to/your/deadline-documentation
```

**Permanent Setup (Windows):**
1. Open System Properties → Advanced → Environment Variables
2. Add new system variable:
   - Name: `DEADLINE_DOCS_PATH`
   - Value: `C:\Path\To\Your\Deadline-Documentation`

**Permanent Setup (macOS/Linux):**
Add to your shell profile (`.bashrc`, `.zshrc`, etc.):
```bash
export DEADLINE_DOCS_PATH="/path/to/your/deadline-documentation"
```

## ⚙️ MCP Client Configuration

### Cursor Setup

1. **Open Cursor Settings**
   - Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - Type "Preferences: Open User Settings (JSON)"
   - Select it to open your settings.json file

2. **Add MCP Configuration**
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

3. **Restart Cursor**
   Close and reopen Cursor for changes to take effect.

### Claude Desktop Setup

1. **Locate Configuration File**
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Add Configuration**
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

3. **Restart Claude Desktop**

### Windsurf Setup

Similar to Claude Desktop - add the MCP server configuration to Windsurf's MCP settings.

## 🔧 First Run & Indexing

### Automatic Indexing
On first run, the server will:
1. Scan your documentation folder
2. Parse HTML files
3. Extract content and code examples
4. Create SQLite database with full-text search index
5. This may take a few minutes for large documentation sets

### Manual Indexing
If you need to rebuild the index:
```bash
# With environment variable set
npx deadline-mcp-server --reindex

# Or specify path directly
DEADLINE_DOCS_PATH=/path/to/docs npx deadline-mcp-server --reindex
```

## 🧪 Testing Your Setup

### Test MCP Connection
1. Open your AI client (Cursor, Claude Desktop, etc.)
2. Start a new conversation
3. Try these test queries:

```
"Search Deadline docs for job submission"
"Find DeadlineCon examples"
"Show me how to use the Deadline Python API"
"Browse the Jobs section of Deadline documentation"
```

### Verify Database
Check if the database was created successfully:
- Look for `deadline-docs.db` file in the server directory
- File should be several MB in size (depending on documentation size)

## 🐛 Troubleshooting

### Common Issues

#### "No local documentation found"
**Symptoms:** Server starts but can't find documentation
**Solutions:**
- Verify `DEADLINE_DOCS_PATH` environment variable is set correctly
- Check that the path exists and contains documentation folders
- Ensure folder names match the expected pattern (Deadline-X.X.X-*)
- Try using absolute paths instead of relative paths

#### "Database indexing failed"
**Symptoms:** Server starts but search returns no results
**Solutions:**
- Check file permissions - ensure the server can read HTML files
- Verify sufficient disk space for database creation
- Check for corrupted HTML files
- Try running with debug mode: `DEBUG=* npx deadline-mcp-server`

#### "SQLITE_ERROR: no such table"
**Symptoms:** Search queries fail with database errors
**Solutions:**
- Delete the existing database file and restart the server
- Ensure indexing completed successfully
- Check server logs for indexing errors

#### "MCP connection failed"
**Symptoms:** AI client can't connect to the server
**Solutions:**
- Verify MCP client configuration syntax
- Check that Node.js and npx are installed and accessible
- Restart your AI client after configuration changes
- Try running the server manually to check for errors

#### Windows Path Issues
**Symptoms:** Path-related errors on Windows
**Solutions:**
- Use double backslashes (`\\`) in JSON configuration
- Or use forward slashes (`/`) which also work on Windows
- Avoid spaces in paths when possible
- Use quotes around paths with spaces

### Debug Mode

Run with detailed logging:
```bash
DEBUG=* npx deadline-mcp-server
```

This will show:
- Documentation scanning progress
- Database indexing status
- Search query processing
- Error details

### Log Files

Check for log files in:
- Server directory: `deadline-mcp-server.log`
- System temp directory
- AI client logs for MCP connection issues

## 🔄 Updates & Maintenance

### Updating the Server
```bash
# NPX automatically uses latest version
npx deadline-mcp-server

# For global installation
npm update -g deadline-mcp-server
```

### Updating Documentation
When you get new Deadline documentation:
1. Replace the old documentation folders
2. Update `DEADLINE_DOCS_PATH` if the path changed
3. Restart the server (it will automatically reindex)

### Database Maintenance
The SQLite database is automatically maintained, but you can:
- Delete `deadline-docs.db` to force a complete reindex
- Check database size - it should be proportional to your documentation size
- Backup the database file to avoid reindexing

## 🛠️ Development & Customization

### Local Development Setup
```bash
git clone <repository>
cd deadline-mcp-server
npm install
npm run build
npm run dev
```

### Environment Variables
- `DEADLINE_DOCS_PATH`: Path to documentation
- `DATABASE_PATH`: Custom database location
- `DEBUG`: Enable debug logging
- `PORT`: Custom port (if applicable)

### Custom Configuration
Create a `.env` file in the server directory:
```env
DEADLINE_DOCS_PATH=/path/to/docs
DATABASE_PATH=/custom/path/deadline-docs.db
DEBUG=deadline:*
```

## 📞 Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Run in debug mode to see detailed error messages
3. Verify your documentation structure matches the expected format
4. Test with a minimal configuration first

### Where to Get Help
- **GitHub Issues**: Report bugs and feature requests
- **GitHub Discussions**: Ask questions and share tips
- **Documentation**: Check the main README for basic usage

### Providing Debug Information
When reporting issues, include:
- Operating system and version
- Node.js version (`node --version`)
- AI client and version
- Error messages from debug mode
- Your MCP configuration (remove sensitive paths)
- Documentation folder structure 