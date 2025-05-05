import { Command } from 'commander';
import { Transcriber } from '../transcriber.js';
import { LocalWhisperProvider } from '../providers/local-whisper-provider.js';
import { TranscribeAPIProvider } from '../provider.js';
import fs from 'node:fs/promises';
import { OpenAIProvider } from '../providers/openai.js';

const program = new Command();

program
  .name('transcriber')
  .description('CLI for transcriber tool')
  .version('0.1.0')
  .option('-p, --prompt <prompt>', 'Prompt for transcription')
  .option('-c, --chunk-duration <chunkDuration>', 'Chunk duration in seconds', '600')
  .option('-a, --api-provider <apiProvider>', 'API provider to use for transcription', 'local')
  .option('-m, --model <model>', 'Model to use for transcription', 'tiny')
  .option('-o, --output <output>', 'Output file path')
  .option('-k, --api-key <apiKey>', 'API key')
  .argument('<url>', 'URL of the audio file to transcribe')
  .action(async (url, options) => {
    let provider: TranscribeAPIProvider;

    switch (options.apiProvider) {
      case 'local':
        provider = new LocalWhisperProvider(options.model);
        break;
      case 'openai':
        provider = new OpenAIProvider({ apiKey: options.apiKey });
        break;
      default:
        throw new Error(`Unknown API provider: ${options.apiProvider}`);
    }

    const transcriber = new Transcriber({
      apiProvider: provider,
    });

    const result = await transcriber.transcribe(url, {
      chunkDuration: Number(options.chunkDuration),
      prompt: options.prompt,
    });

    if (options.output) {
      await fs.writeFile(options.output, result);
    } else {
      console.log(result);
    }
  });

program.parse();
