import { TranscribeAPIProvider } from '../provider.js';
import fs from 'node:fs';
import path from 'node:path';

export class OpenAIProvider implements TranscribeAPIProvider {
  private apiKey: string;

  constructor(options: { apiKey: string }) {
    this.apiKey = options.apiKey;
  }

  async transcribe(filePath: string, prompt?: string): Promise<string> {
    const fileBlob = new Blob([await fs.promises.readFile(filePath)]);
    const formData = new FormData();
    formData.append('file', fileBlob, path.basename(filePath));
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'srt');
    if (prompt) formData.append('prompt', prompt);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return await response.text();
  }
}
