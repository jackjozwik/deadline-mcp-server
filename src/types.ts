export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  url: string;
  docType: 'user-manual' | 'scripting-reference' | 'python-reference';
  section: string;
  subsection?: string;
  codeExamples?: string[];
  keywords: string[];
}

export interface SearchResult {
  section: DocumentSection;
  score: number;
  matches: string[];
}

export interface IndexedDocument {
  path: string;
  title: string;
  content: string;
  docType: string;
  lastModified: number;
}

export interface DeadlineDocConfig {
  docsPath: string;
  userManualPath: string;
  scriptingReferencePath: string;
  pythonReferencePath: string;
} 