export interface TranscribeAPIProvider {
  transcribe(filePath: string, prompt?: string): Promise<string>;
}
