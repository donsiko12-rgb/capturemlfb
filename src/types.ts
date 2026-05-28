export interface TechnicalSpec {
  label: string;
  value: string;
}

export interface ExtractedResult {
  id: string;
  projectId: string;
  fileName: string;
  imageUrl: string; // Base64 or Blob URL for client representation
  mlfb: string;
  z_codes: string[];
  model_name: string;
  serial_number: string;
  technical_specs: TechnicalSpec[];
  raw_ocr: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidence_reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMsg?: string;
  processedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}
