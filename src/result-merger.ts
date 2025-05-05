import SRT from 'srt-parser-2';

export class ResultMerger {
  private parser = new SRT();

  merge(results: { srt: string; startTime: number; endTime: number }[]): string {
    let merged = '';
    let currentNumber = 1;

    results.forEach((result) => {
      const segments = this.parser.fromSrt(result.srt);

      segments.forEach((segment) => {
        const shiftedStart = this.shiftTime(segment.startSeconds, result.startTime);
        const shiftedEnd = this.shiftTime(segment.endSeconds, result.startTime);

        merged += `${currentNumber++}\n`;
        merged += `${shiftedStart} --> ${shiftedEnd}\n`;
        merged += `${segment.text}\n\n`;
      });
    });

    return merged.trim();
  }

  private shiftTime(time: number, seconds: number): string {
    const totalSeconds = time + seconds;

    const newH = Math.floor(totalSeconds / 3600);
    const remainder = totalSeconds % 3600;
    const newM = Math.floor(remainder / 60);
    const newS = Math.floor(remainder % 60);
    const newMS = Math.floor((totalSeconds % 1) * 1000);

    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')},${String(newMS).padStart(3, '0')}`;
  }
}
