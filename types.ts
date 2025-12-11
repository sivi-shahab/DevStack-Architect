export interface ParsedFeature {
  type: string;
  title: string;
  icon: string;
  content: string;
  raw: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface TechStack {
  language: string;
  frontendFramework: string;
  backendFramework: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface CodeScaffold {
  files: ProjectFile[];
  readme: string;
  demoHtml: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_CODE = 'GENERATING_CODE',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}