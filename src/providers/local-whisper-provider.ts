import path from 'node:path';
import { TranscribeAPIProvider } from '../provider.js';
import { nodewhisper } from 'nodejs-whisper';
import fs from 'node:fs/promises';

export class LocalWhisperProvider implements TranscribeAPIProvider {
  constructor(private model: string) {}

  async transcribe(filePath: string): Promise<string> {
    try {
      await nodewhisper(filePath, {
        modelName: this.model,
        autoDownloadModelName: this.model,
        removeWavFileAfterTranscription: true,
        whisperOptions: {
          outputInSrt: true,
        },
      });

      const srtPath = await this.findSrtFile(path.dirname(filePath));

      return fs.readFile(srtPath, 'utf-8');
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      throw error;
    }
  }

  private async findSrtFile(dir: string): Promise<string> {
    const files = await fs.readdir(dir);
    const srtFile = files.find((file) => file.endsWith('.srt'));
    if (!srtFile) {
      throw new Error('SRT file not found');
    }
    return path.join(dir, srtFile);
  }
}
