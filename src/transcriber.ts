import fs from 'node:fs/promises';
import { AudioFileManager } from './file-manager.js';
import { TranscribeAPIProvider } from './provider.js';
import { ResultMerger } from './result-merger.js';

export interface TranscriberOptions {
  chunkDuration?: number;
  prompt?: string;
}

export class Transcriber {
  private fileManager = new AudioFileManager();
  private merger = new ResultMerger();
  private apiProvider: TranscribeAPIProvider;

  constructor(options: { apiProvider: TranscribeAPIProvider }) {
    this.apiProvider = options.apiProvider;
  }

  async transcribe(url: string, options: TranscriberOptions = {}): Promise<string> {
    const file = await this.fileManager.split(url, options);
    try {
      const chunkResults: string[] = [];
      for (const chunk of file.chunks) {
        const result = await this.apiProvider.transcribe(chunk.path, options.prompt);
        chunkResults.push(result);
      }
      return this.merger.merge(
        chunkResults.map((result, index) => ({
          srt: result,
          startTime: file.chunks[index].startTime,
          endTime: file.chunks[index].endTime,
        })),
      );
    } finally {
      await fs.rm(file.dir, { recursive: true });
    }
  }
}
