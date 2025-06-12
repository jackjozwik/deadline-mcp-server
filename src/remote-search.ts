import { DocumentSection, SearchResult } from './types.js';

export class RemoteDeadlineSearch {
  private baseUrls = {
    'user-manual': 'https://docs.thinkboxsoftware.com/products/deadline/10.4/1_User%20Manual/',
    'scripting-reference': 'https://docs.thinkboxsoftware.com/products/deadline/10.4/2_Scripting%20Reference/',
    'python-reference': 'https://docs.thinkboxsoftware.com/products/deadline/10.4/3_Python%20Reference/'
  };

  async searchDocumentation(
    query: string, 
    docType?: string, 
    limit: number = 10
  ): Promise<SearchResult[]> {
    // For remote search, we'll provide curated responses based on common queries
    const results = this.getCuratedResults(query, docType);
    return results.slice(0, limit);
  }

  async getDocumentById(id: string): Promise<DocumentSection | null> {
    // Parse the ID to determine doc type and section
    const [docType, ...pathParts] = id.split(':');
    const section = pathParts.join(':');
    
    return {
      id,
      title: `Remote Documentation: ${section}`,
      content: `This content is available in the online Deadline documentation. Please visit: ${this.baseUrls[docType as keyof typeof this.baseUrls] || 'https://docs.thinkboxsoftware.com/products/deadline/10.4/'}`,
      url: this.baseUrls[docType as keyof typeof this.baseUrls] || 'https://docs.thinkboxsoftware.com/products/deadline/10.4/',
      docType: docType as any,
      section: section,
      codeExamples: [],
      keywords: []
    };
  }

  async getCodeExamples(query: string, limit: number = 5): Promise<string[]> {
    // Return common Deadline code examples based on query
    const examples = this.getCommonCodeExamples(query);
    return examples.slice(0, limit);
  }

  async getDocumentsBySection(section: string, docType?: string): Promise<DocumentSection[]> {
    // Return section information with links to online docs
    const sections = this.getCommonSections(section, docType);
    return sections;
  }

  private getCuratedResults(query: string, docType?: string): SearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Job submission queries
    if (lowerQuery.includes('submit') && lowerQuery.includes('job')) {
      results.push({
        section: {
          id: 'python-reference:job-submission',
          title: 'Job Submission with Python',
          content: `To submit jobs to Deadline using Python, use the DeadlineCon class:

import Deadline.DeadlineConnect as Connect

# Connect to Deadline
deadline = Connect.DeadlineCon('localhost', 8082)

# Create job info
JobInfo = {
    "Name": "My Render Job",
    "UserName": "username", 
    "Frames": "1-100",
    "Plugin": "Maya"
}

# Create plugin info
PluginInfo = {
    "Version": "2023",
    "SceneFile": "/path/to/scene.ma"
}

# Submit the job
result = deadline.Jobs.SubmitJob(JobInfo, PluginInfo)`,
          url: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/3_Python%20Reference/',
          docType: 'python-reference',
          section: 'Job Submission',
          codeExamples: [
            'import Deadline.DeadlineConnect as Connect\ndeadline = Connect.DeadlineCon("localhost", 8082)\nresult = deadline.Jobs.SubmitJob(JobInfo, PluginInfo)'
          ],
          keywords: ['submit', 'job', 'python', 'DeadlineCon']
        },
        score: 0.9,
        matches: ['Job submission using Python API']
      });
    }

    // DeadlineCon queries
    if (lowerQuery.includes('deadlinecon') || lowerQuery.includes('connection')) {
      results.push({
        section: {
          id: 'python-reference:deadlinecon',
          title: 'DeadlineCon Connection',
          content: `DeadlineCon is the main class for connecting to Deadline Web Service:

import Deadline.DeadlineConnect as Connect

# Create connection
connectionObject = Connect.DeadlineCon('WebServiceName', 8082)

# Available methods:
# - connectionObject.Jobs.GetJobs()
# - connectionObject.Jobs.SubmitJob(jobInfo, pluginInfo)
# - connectionObject.Groups.GetGroupNames()
# - connectionObject.Repository.GetRootDirectory()`,
          url: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/3_Python%20Reference/',
          docType: 'python-reference',
          section: 'DeadlineCon',
          codeExamples: [
            'import Deadline.DeadlineConnect as Connect\nconnectionObject = Connect.DeadlineCon("localhost", 8082)'
          ],
          keywords: ['DeadlineCon', 'connection', 'web service']
        },
        score: 0.95,
        matches: ['DeadlineCon connection examples']
      });
    }

    // Plugin development queries
    if (lowerQuery.includes('plugin') && (lowerQuery.includes('create') || lowerQuery.includes('develop'))) {
      results.push({
        section: {
          id: 'scripting-reference:plugin-development',
          title: 'Plugin Development',
          content: `Deadline plugins are Python scripts that define how applications are launched and monitored. Key components:

1. Plugin Info File (.param) - Defines plugin parameters
2. Plugin Script (.py) - Contains the plugin logic
3. Event Plugin (optional) - Handles job events

Basic plugin structure:
- GetPluginInfo() - Returns plugin information
- InitializeProcess() - Sets up the render process
- StartJob() - Called when job starts
- RenderTasks() - Main rendering logic`,
          url: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/2_Scripting%20Reference/',
          docType: 'scripting-reference',
          section: 'Plugin Development',
          codeExamples: [],
          keywords: ['plugin', 'development', 'scripting']
        },
        score: 0.85,
        matches: ['Plugin development guide']
      });
    }

    // If no specific matches, provide general help
    if (results.length === 0) {
      results.push({
        section: {
          id: 'general:help',
          title: 'Deadline Documentation Help',
          content: `I can help you with Deadline documentation queries. Try asking about:

- Job submission with Python
- DeadlineCon connection examples  
- Plugin development
- Repository configuration
- Worker/Slave management
- Event plugins

For complete documentation, visit:
- User Manual: https://docs.thinkboxsoftware.com/products/deadline/10.4/1_User%20Manual/
- Scripting Reference: https://docs.thinkboxsoftware.com/products/deadline/10.4/2_Scripting%20Reference/
- Python Reference: https://docs.thinkboxsoftware.com/products/deadline/10.4/3_Python%20Reference/`,
          url: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/',
          docType: 'user-manual',
          section: 'General Help',
          codeExamples: [],
          keywords: ['help', 'documentation', 'deadline']
        },
        score: 0.5,
        matches: ['General documentation help']
      });
    }

    return results;
  }

  private getCommonCodeExamples(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const examples: string[] = [];

    if (lowerQuery.includes('deadlinecon') || lowerQuery.includes('connect')) {
      examples.push(`import Deadline.DeadlineConnect as Connect
connectionObject = Connect.DeadlineCon('localhost', 8082)
print(connectionObject.Groups.GetGroupNames())`);
    }

    if (lowerQuery.includes('submit') || lowerQuery.includes('job')) {
      examples.push(`JobInfo = {
    "Name": "My Job",
    "UserName": "username",
    "Frames": "1-10", 
    "Plugin": "Maya"
}

PluginInfo = {
    "Version": "2023"
}

newJob = deadline.Jobs.SubmitJob(JobInfo, PluginInfo)`);
    }

    return examples;
  }

  private getCommonSections(section: string, docType?: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lowerSection = section.toLowerCase();

    if (lowerSection.includes('job')) {
      sections.push({
        id: 'user-manual:jobs',
        title: 'Jobs Overview',
        content: 'Jobs are the fundamental unit of work in Deadline. Visit the online documentation for complete details.',
        url: 'https://docs.thinkboxsoftware.com/products/deadline/10.4/1_User%20Manual/',
        docType: 'user-manual',
        section: 'Jobs',
        codeExamples: [],
        keywords: ['jobs', 'submission', 'management']
      });
    }

    return sections;
  }

  async close(): Promise<void> {
    // No cleanup needed for remote search
  }
} 