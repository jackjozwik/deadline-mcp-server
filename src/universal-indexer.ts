import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { parse } from 'node-html-parser';
import sqlite3 from 'sqlite3';
import { DocumentSection, DeadlineDocConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UniversalDocIndexer {
  private db: sqlite3.Database;
  private config: DeadlineDocConfig;

  constructor(config: DeadlineDocConfig) {
    this.config = config;
    // Use environment variable if set, otherwise default to project root
    const envDbPath = process.env.DEADLINE_DB_PATH;
    const defaultDbPath = path.join(__dirname, '..', 'deadline-docs.db');
    const finalDbPath = envDbPath || defaultDbPath;
    this.db = new sqlite3.Database(finalDbPath);
  }

  async initialize(): Promise<void> {
    await this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('DROP TABLE IF EXISTS documents');
        this.db.run('DROP TABLE IF EXISTS documents_fts');
        
        this.db.run(`
          CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            section TEXT,
            docType TEXT NOT NULL,
            url TEXT,
            keywords TEXT
          )
        `);

        this.db.run(`
          CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
            title, content, keywords, section, docType,
            content='documents', content_rowid='rowid'
          )
        `);

        this.db.run(`
          CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
            INSERT INTO documents_fts(rowid, title, content, keywords, section, docType)
            VALUES (new.rowid, new.title, new.content, new.keywords, new.section, new.docType);
          END
        `);

        resolve();
      });
    });
  }

  async indexAllDocumentation(): Promise<void> {
    console.log('🔍 Starting universal documentation indexing...');
    
    // Index each documentation type
    await this.indexDocumentationType('user-manual', this.config.userManualPath);
    await this.indexDocumentationType('scripting-reference', this.config.scriptingReferencePath);
    await this.indexDocumentationType('python-reference', this.config.pythonReferencePath);

    await this.showIndexStats();
    console.log('✅ Universal documentation indexing completed!');
  }

  private async indexDocumentationType(docType: string, docsPath: string): Promise<void> {
    console.log(`📚 Processing ${docType} from: ${docsPath}`);
    
    try {
      // Check if path exists
      await fs.access(docsPath);
      
      // Find all HTML files
      const pattern = path.join(docsPath, '**/*.html').replace(/\\/g, '/');
      const htmlFiles = await glob(pattern);
      
      console.log(`   Found ${htmlFiles.length} HTML files`);
      
      let processed = 0;
      let indexed = 0;
      
      for (const filePath of htmlFiles) {
        processed++;
        
        try {
          const result = await this.processHtmlFile(filePath, docType);
          if (result) {
            indexed++;
            if (indexed % 10 === 0) {
              console.log(`   📄 Processed ${indexed} documents...`);
            }
          }
        } catch (error) {
          // Skip files that can't be processed
        }
      }
      
      console.log(`   ✅ Successfully indexed ${indexed}/${processed} files for ${docType}`);
      
    } catch (error) {
      console.log(`   ⚠️  Could not process ${docType}: ${error}`);
    }
  }

  private async processHtmlFile(filePath: string, docType: string): Promise<boolean> {
    try {
      const htmlContent = await fs.readFile(filePath, 'utf-8');
      const root = parse(htmlContent);
      
      // Extract title
      let title = '';
      const titleElement = root.querySelector('title');
      if (titleElement) {
        title = this.cleanText(titleElement.text);
      }
      
      // Try to get a better title from h1 or main heading
      const h1Element = root.querySelector('h1');
      if (h1Element && h1Element.text.trim()) {
        title = this.cleanText(h1Element.text);
      }
      
      // Skip navigation/index pages
      if (this.isNavigationPage(title, htmlContent)) {
        return false;
      }
      
      // Extract main content
      const content = this.extractMainContent(root);
      
      // Skip if content is too short
      if (content.length < 50) {
        return false;
      }
      
      // Extract keywords and code examples
      const keywords = this.extractKeywords(content, title);
      const codeExamples = this.extractCodeExamples(root);
      
      // Create document
      const relativePath = path.relative(this.config.docsPath, filePath);
      const docId = `${docType}:${relativePath.replace(/\\/g, '/')}`;
      
      const section = this.extractSection(title, filePath);
      
      const document: DocumentSection = {
        id: docId,
        title: title || path.basename(filePath, '.html'),
        content: content + ' ' + codeExamples.join(' '),
        section,
        docType: docType as 'user-manual' | 'scripting-reference' | 'python-reference',
        url: relativePath.replace(/\\/g, '/'),
        keywords: keywords,
        codeExamples
      };
      
      await this.insertDocument(document);
      return true;
      
    } catch (error) {
      return false;
    }
  }

  private extractMainContent(root: any): string {
    // Try different content containers for different doc types
    const contentSelectors = [
      '.document .body',          // Sphinx
      '.contents',                // Doxygen
      'main',                     // Modern HTML
      '.content',                 // Generic
      'article',                  // Semantic HTML
      '#content',                 // Common ID
      '.main-content'             // Another common class
    ];
    
    let contentElement = null;
    for (const selector of contentSelectors) {
      contentElement = root.querySelector(selector);
      if (contentElement) break;
    }
    
    // Fallback to body if no specific content area found
    if (!contentElement) {
      contentElement = root.querySelector('body');
    }
    
    if (!contentElement) {
      return '';
    }
    
    // Remove navigation, sidebar, and footer elements
    const elementsToRemove = [
      '.sphinxsidebar', '.sidebar', '.navigation', '.nav',
      '.footer', '.header', '.breadcrumb', '.toc',
      'script', 'style', '.highlight pre', 'nav'
    ];
    
    elementsToRemove.forEach(selector => {
      const elements = contentElement.querySelectorAll(selector);
      elements.forEach((el: any) => el.remove());
    });
    
    // Extract text and clean it
    const text = contentElement.innerText || contentElement.text || '';
    return this.cleanText(text);
  }

  private extractCodeExamples(root: any): string[] {
    const codeExamples: string[] = [];
    
    // Find code blocks
    const codeSelectors = ['pre code', 'code', '.highlight', '.codehilite', '.code-block'];
    
    for (const selector of codeSelectors) {
      const codeElements = root.querySelectorAll(selector);
      codeElements.forEach((element: any) => {
        const code = element.innerText || element.text || '';
        if (code.length > 20 && code.length < 2000) { // Reasonable code block size
          codeExamples.push(this.cleanText(code));
        }
      });
    }
    
    return [...new Set(codeExamples)]; // Remove duplicates
  }

  private extractKeywords(content: string, title: string): string[] {
    const keywords: string[] = [];
    const allText = (title + ' ' + content).toLowerCase();
    
    // Deadline-specific terms
    const deadlineTerms = [
      'deadline', 'render', 'job', 'worker', 'slave', 'submit', 'plugin',
      'repository', 'monitor', 'pool', 'group', 'limit', 'task', 'frame',
      'script', 'python', 'maya', 'max', 'nuke', 'houdini', 'blender',
      'deadlinecon', 'clientutils', 'repositoryutils', 'jobutils',
      'farm', 'queue', 'priority', 'timeout', 'event', 'command'
    ];
    
    deadlineTerms.forEach(term => {
      if (allText.includes(term)) {
        keywords.push(term);
      }
    });
    
    // Extract common programming terms
    const progTerms = ['function', 'class', 'method', 'parameter', 'return', 'import', 'module'];
    progTerms.forEach(term => {
      if (allText.includes(term)) {
        keywords.push(term);
      }
    });
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  private extractSection(title: string, filePath: string): string {
    // Try to extract section from file path
    const pathParts = filePath.split(/[/\\]/);
    if (pathParts.length > 1) {
      const section = pathParts[pathParts.length - 2];
      if (section && section !== 'manual' && section !== 'html') {
        return section.replace(/-/g, ' ').replace(/_/g, ' ');
      }
    }
    
    // Try to extract from title
    const sectionMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (sectionMatch) {
      return sectionMatch[1].trim();
    }
    
    return '';
  }

  private isNavigationPage(title: string, content: string): boolean {
    const navIndicators = [
      'Member List', 'Class Members', 'File List', 'Directory Reference',
      'Class List', 'Namespace List', 'Function Index', 'Variable Index',
      'Index', 'Contents', 'Table of Contents'
    ];
    
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    return navIndicators.some(indicator => 
      titleLower.includes(indicator.toLowerCase()) ||
      (contentLower.includes('list of') && contentLower.length < 1000)
    );
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\n\s*\n/g, '\n')      // Remove empty lines
      .replace(/[^\w\s\-.,;:(){}[\]]/g, '') // Remove special chars but keep basic punctuation
      .trim();
  }

  private async insertDocument(doc: DocumentSection): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO documents (id, title, content, section, docType, url, keywords) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [doc.id, doc.title, doc.content, doc.section, doc.docType, doc.url, JSON.stringify(doc.keywords)],
        function(err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  private async showIndexStats(): Promise<void> {
    return new Promise((resolve) => {
      this.db.get('SELECT COUNT(*) as count FROM documents', (err: Error | null, row: any) => {
        if (err) {
          console.error('Error getting stats:', err);
        } else {
          console.log(`📊 Indexed ${row.count} documents total`);
          
          // Show breakdown by type
          this.db.all('SELECT docType, COUNT(*) as count FROM documents GROUP BY docType', (err: Error | null, rows: any[]) => {
            if (!err && rows) {
              rows.forEach(row => {
                console.log(`   ${row.docType}: ${row.count} documents`);
              });
            }
            resolve();
          });
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err: Error | null) => {
        resolve();
      });
    });
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const basePath = process.env.DEADLINE_DOCS_PATH || '../Deadline-docs';
  const config: DeadlineDocConfig = {
    docsPath: basePath,
    userManualPath: path.resolve(basePath, 'Deadline-10.4.1.8-User-Manual/Deadline-10.4.1.8-User-Manual'),
    scriptingReferencePath: path.resolve(basePath, 'Deadline-10.4.1.8-Scripting-Reference/Deadline-10.4.1.8-Scripting-Reference'),
    pythonReferencePath: path.resolve(basePath, 'Deadline-10.4.1.8-Standalone-Python-Reference/Deadline-10.4.1.8-Standalone-Python-Reference')
  };

  console.log('🚀 Starting Universal Deadline Documentation Indexer');
  console.log('📁 Base path:', basePath);
  
  const indexer = new UniversalDocIndexer(config);
  await indexer.initialize();
  await indexer.indexAllDocumentation();
  await indexer.close();
  
  console.log('🎉 Indexing complete!');
} 