import sqlite3 from 'sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DocumentSection, SearchResult } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DeadlineDocSearch {
  private db: sqlite3.Database;

  constructor(dbPath?: string) {
    // Use environment variable if set, otherwise default to project root
    const envDbPath = process.env.DEADLINE_DB_PATH;
    const defaultDbPath = path.join(__dirname, '..', 'deadline-docs.db');
    const finalDbPath = dbPath || envDbPath || defaultDbPath;
    this.db = new sqlite3.Database(finalDbPath);
  }

  async searchDocumentation(
    query: string, 
    docType?: 'user-manual' | 'scripting-reference' | 'python-reference',
    limit: number = 10
  ): Promise<SearchResult[]> {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          d.id, d.title, d.content, d.section, d.doc_type, d.url, d.keywords,
          highlight(documents_fts, 1, '<mark>', '</mark>') as highlighted_content,
          rank
        FROM documents_fts 
        JOIN documents d ON d.rowid = documents_fts.rowid
        WHERE documents_fts MATCH ?
      `;
      
      const params: any[] = [query];
      
      if (docType) {
        sql += ' AND d.doc_type = ?';
        params.push(docType);
      }
      
      sql += ' ORDER BY rank LIMIT ?';
      params.push(limit);

      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const results: SearchResult[] = rows.map(row => ({
            section: {
              id: row.id,
              title: row.title,
              content: row.content,
              section: row.section || '',
              docType: row.doc_type,
              url: row.url,
              keywords: JSON.parse(row.keywords || '[]'),
              codeExamples: this.extractCodeExamples(row.content)
            },
            score: row.rank,
            matches: [row.highlighted_content || row.content.substring(0, 300)]
          }));
          resolve(results);
        }
      });
    });
  }

  async getDocumentById(id: string): Promise<DocumentSection | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM documents WHERE id = ?',
        [id],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              id: row.id,
              title: row.title,
              content: row.content,
              section: row.section || '',
              docType: row.doc_type,
              url: row.url,
              keywords: JSON.parse(row.keywords || '[]'),
              codeExamples: this.extractCodeExamples(row.content)
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async getCodeExamples(query: string, limit: number = 5): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // Search for documents that likely contain code examples
      const codeQuery = `${query} AND (DeadlineCon OR python OR script OR function OR class OR import)`;
      
      this.db.all(`
        SELECT d.content
        FROM documents_fts 
        JOIN documents d ON d.rowid = documents_fts.rowid
        WHERE documents_fts MATCH ?
        AND LENGTH(d.content) > 100
        ORDER BY rank
        LIMIT ?
      `, [codeQuery, limit * 2], (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const examples: string[] = [];
          
          for (const row of rows) {
            const codeBlocks = this.extractCodeExamples(row.content);
            examples.push(...codeBlocks);
            if (examples.length >= limit) break;
          }
          
          resolve(examples.slice(0, limit));
        }
      });
    });
  }

  async browseSections(section: string, docType?: string): Promise<DocumentSection[]> {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM documents WHERE section LIKE ? OR title LIKE ?';
      const params: any[] = [`%${section}%`, `%${section}%`];
      
      if (docType) {
        sql += ' AND doc_type = ?';
        params.push(docType);
      }
      
      sql += ' ORDER BY title LIMIT 20';

      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const results: DocumentSection[] = rows.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            section: row.section || '',
            docType: row.doc_type,
            url: row.url,
            keywords: JSON.parse(row.keywords || '[]'),
            codeExamples: this.extractCodeExamples(row.content)
          }));
          resolve(results);
        }
      });
    });
  }

  private extractCodeExamples(content: string): string[] {
    const examples: string[] = [];
    
    // Look for common code patterns
    const codePatterns = [
      /DeadlineCon\.[\w.]+\([^)]*\)/g,
      /import\s+[\w.]+/g,
      /def\s+\w+\([^)]*\):/g,
      /class\s+\w+[\w\s(,)]*:/g,
      /\w+\s*=\s*DeadlineCon\.\w+/g
    ];
    
    for (const pattern of codePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        examples.push(...matches.slice(0, 3)); // Limit per pattern
      }
    }
    
    return [...new Set(examples)]; // Remove duplicates
  }

  async getStats(): Promise<{ total: number; byType: { [key: string]: number } }> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as total FROM documents', (err: Error | null, totalRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        this.db.all('SELECT doc_type, COUNT(*) as count FROM documents GROUP BY doc_type', (err: Error | null, typeRows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const byType: { [key: string]: number } = {};
            typeRows.forEach(row => {
              byType[row.doc_type] = row.count;
            });
            
            resolve({
              total: totalRow.total,
              byType
            });
          }
        });
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close(() => {
        resolve();
      });
    });
  }
} 