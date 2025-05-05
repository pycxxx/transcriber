import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { PassThrough, Readable } from 'node:stream';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import * as os from 'node:os';
import { createReadStream } from 'node:fs';

export interface AudioFile {
  dir: string;
  chunks: Array<{
    path: string;
    startTime: number;
    endTime: number;
  }>;
}

export interface AudioFileOptions {
  // in seconds
  chunkDuration?: number;
}

export class AudioFileManager {
  async split(url: string, options: AudioFileOptions): Promise<AudioFile> {
    const downloadDir = await this.createDirForFile();
    try {
      await this.downloadAudioFile(downloadDir, url);
      const chunks = await this.splitAudioIntoChunks(downloadDir, options.chunkDuration ?? 30);
      return { dir: downloadDir, chunks };
    } catch (error) {
      await fs.rm(downloadDir, { recursive: true });
      throw error;
    }
  }

  private async createDirForFile(): Promise<string> {
    const fileId = randomUUID();
    const folderPath = path.join(os.tmpdir(), 'transcriber', fileId);
    await fs.mkdir(folderPath, { recursive: true });
    return folderPath;
  }

  private async downloadAudioFile(downloadDir: string, url: string): Promise<void> {
    try {
      const filePath = path.join(downloadDir, 'audio.mp3');
      await pipeline(
        createConvertToMp3Stream(await getFileStream(url)),
        createWriteStream(filePath),
      );
    } catch (error) {
      throw new Error(
        `Failed to download audio file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async splitAudioIntoChunks(
    downloadDir: string,
    chunkDuration: number,
  ): Promise<{ path: string; startTime: number; endTime: number }[]> {
    try {
      const filePath = path.join(downloadDir, 'audio.mp3');
      const duration = await getAudioDuration(filePath);
      const silenceData = await detectSilence(filePath);
      const chunks = calculateChunks(duration, chunkDuration, silenceData);

      const result = await Promise.all(
        chunks.map(async (chunk, index) => {
          const chunkFilePath = path.join(downloadDir, `chunk_${index}.mp3`);
          await splitAudioFile(filePath, chunkFilePath, chunk.start, chunk.end);
          return {
            path: chunkFilePath,
            startTime: chunk.start,
            endTime: chunk.end,
          };
        }),
      );

      return result;
    } catch (error) {
      throw new Error(
        `Failed to split audio: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function createConvertToMp3Stream(inputStream: Readable): PassThrough {
  return ffmpeg(inputStream).audioBitrate(32).format('mp3').pipe() as PassThrough;
}

async function splitAudioFile(
  sourceFilePath: string,
  destFilePath: string,
  startTime: number,
  endTime: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourceFilePath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(destFilePath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      if (!metadata?.format?.duration) {
        return reject(new Error('Could not determine audio duration'));
      }
      resolve(metadata.format.duration);
    });
  });
}

interface SilenceData {
  start: number;
  end: number;
}

interface AudioChunk {
  start: number;
  end: number;
  duration: number;
}

function calculateChunks(
  totalDuration: number,
  chunkDuration: number,
  silenceData: SilenceData[] = [],
): AudioChunk[] {
  const chunks: AudioChunk[] = [];
  let currentStart = 0;

  silenceData = silenceData.slice().reverse();

  while (currentStart < totalDuration) {
    const currentEnd = Math.min(currentStart + chunkDuration, totalDuration);

    // Find the longest silence in the current range that's at least 0.5s long
    const suitableSilence = silenceData.find((s) => s.start >= currentStart && s.end <= currentEnd);

    // If found a suitable silence, split at the middle of the silence period
    if (suitableSilence) {
      const splitPoint = (suitableSilence.start + suitableSilence.end) / 2;
      chunks.push({ start: currentStart, end: splitPoint, duration: splitPoint - currentStart });
      currentStart = splitPoint;
    } else {
      chunks.push({ start: currentStart, end: currentEnd, duration: currentEnd - currentStart });
      currentStart = currentEnd;
    }
  }

  return chunks;
}

async function getFileStream(url: string) {
  if (!url.startsWith('http')) {
    return createReadStream(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  return new ReadableWebToNodeStream(response.body);
}

async function detectSilence(filePath: string) {
  return new Promise<Array<{ start: number; end: number }>>((resolve, reject) => {
    const silenceData: Array<{ start: number; end: number }> = [];
    let startTime = 0;

    ffmpeg(filePath)
      .audioFilters('silencedetect=noise=-30dB:d=0.5')
      .format('null')
      .output('-')
      .on('stderr', (line) => {
        const startMatch = line.match(/silence_start: ([\d.]+)/);
        const endMatch = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);

        if (startMatch) {
          startTime = parseFloat(startMatch[1]);
        } else if (endMatch) {
          silenceData.push({
            start: startTime,
            end: parseFloat(endMatch[1]),
          });
        }
      })
      .on('end', () => {
        resolve(silenceData);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}
