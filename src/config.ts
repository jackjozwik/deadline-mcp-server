import { promises as fs } from 'fs';
import * as path from 'path';
import { DeadlineDocConfig } from './types.js';

export class ConfigManager {
  private config: DeadlineDocConfig | null = null;

  async getConfig(): Promise<DeadlineDocConfig> {
    if (this.config) {
      return this.config;
    }

    // Try to get local documentation path
    const localDocsPath = process.env.DEADLINE_DOCS_PATH;
    
    if (localDocsPath) {
      const isValidLocal = await this.validateLocalDocs(localDocsPath);
      if (isValidLocal) {
        this.config = {
          docsPath: localDocsPath,
          userManualPath: path.join(localDocsPath, 'Deadline-10.4.1.8-User-Manual'),
          scriptingReferencePath: path.join(localDocsPath, 'Deadline-10.4.1.8-Scripting-Reference'),
          pythonReferencePath: path.join(localDocsPath, 'Deadline-10.4.1.8-Standalone-Python-Reference')
        };
        console.error('✅ Using local Deadline documentation');
        return this.config;
      }
    }

    // Fallback to remote documentation URLs
    console.error('⚠️  Local docs not found, using remote documentation as fallback');
    this.config = {
      docsPath: 'remote',
      userManualPath: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/1_User%20Manual/',
      scriptingReferencePath: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/2_Scripting%20Reference/',
      pythonReferencePath: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/3_Python%20Reference/'
    };
    
    return this.config;
  }

  private async validateLocalDocs(docsPath: string): Promise<boolean> {
    try {
      const requiredDirs = [
        'Deadline-10.4.1.8-User-Manual',
        'Deadline-10.4.1.8-Scripting-Reference',
        'Deadline-10.4.1.8-Standalone-Python-Reference'
      ];

      for (const dir of requiredDirs) {
        const dirPath = path.join(docsPath, dir);
        const stat = await fs.stat(dirPath);
        if (!stat.isDirectory()) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  isUsingLocalDocs(): boolean {
    return this.config?.docsPath !== 'remote';
  }
} 