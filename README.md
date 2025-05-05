# Transcriber

A TypeScript-based transcription tool that converts audio files to text.

## Usage

### CLI

```bash
Usage: transcriber [options] <url>

CLI for transcriber tool

Arguments:
  url                                   URL of the audio file to transcribe

Options:
  -V, --version                         output the version number
  -p, --prompt <prompt>                 Prompt for transcription
  -c, --chunk-duration <chunkDuration>  Chunk duration in seconds (default: "600")
  -a, --api-provider <apiProvider>      API provider to use for transcription. local or openai (default: "local")
  -m, --model <model>                   Model to use for transcription (default: "tiny")
  -o, --output <output>                 Output file path
  -k, --api-key <apiKey>                API key
  -h, --help                            display help for command
```

### Programmatic

```typescript
import { Transcriber, OpenAIProvider } from 'transcriber';

const transcriber = new Transcriber({
  apiProvider: new OpenAIProvider({ apiKey: 'your-api-key-here' }),
});

const result = await transcriber.transcribe('/path/to/audio/file');
console.log(result);
```

## License

MIT
