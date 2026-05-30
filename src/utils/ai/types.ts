export type AIErrorCode =
  | 'NOT_RUNNING'
  | 'MODEL_NOT_FOUND'
  | 'VISION_REQUIRED'
  | 'REQUEST_FAILED';

export class AIError extends Error {
  constructor(public readonly code: AIErrorCode, message: string) {
    super(message);
    this.name = 'AIError';
  }
}

export interface AIModel {
  id: string;
  name: string;
  sizeGb?: number;
  supportsVision: boolean;
}

export interface KeywordsInput {
  imageBase64: string;
  mimeType: string;
  existingKeywords: string[];
}

export interface SummaryInput {
  name: string;
  birthYear?: string;
  deathYear?: string;
  birthPlace?: string;
  occupation?: string;
  nationality?: string;
  spouses: string[];
  children: string[];
  parents: string[];
  photoCount: number;
  documentTypes: string[];
  locationNames: string[];
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<AIModel[]>;
  generateKeywords(input: KeywordsInput, modelId: string): Promise<string[]>;
  generatePersonSummary(input: SummaryInput, modelId: string): Promise<string>;
}
