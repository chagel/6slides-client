/**
 * Type definitions for Error Service
 */

export enum ErrorTypes {
  VALIDATION = 'validation',
  NETWORK = 'network',
  STORAGE = 'storage',
  EXTRACTION = 'extraction',
  RENDERING = 'rendering',
  PERMISSION = 'permission',
  GENERAL = 'general'
}

export interface ErrorMetadata {
  component?: string;
  context?: string;
  type?: string;
  [key: string]: unknown;
}

export interface ErrorDetails {
  error: Error | string;
  metadata?: ErrorMetadata;
}

export interface ErrorHandler {
  (error: Error, metadata?: ErrorMetadata): void;
}

export class ErrorService {
  registerErrorHandler(type: string, handler: ErrorHandler): void;
  getErrorHandlers(): Record<string, ErrorHandler[]>;
  
  handleError(error: Error | string, metadata?: ErrorMetadata): void;
  createErrorWithMetadata(message: string, metadata?: ErrorMetadata): Error;
  getErrorContext(error: Error): ErrorMetadata | null;
}

export const errorService: ErrorService;