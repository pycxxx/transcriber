import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ResultMerger } from '../src/result-merger.js';

describe('ResultMerger', () => {
  it('should merge multiple SRT segments with time shifting', () => {
    const merger = new ResultMerger();

    const results = [
      {
        srt: `1\n00:00:00,000 --> 00:00:01,000\nFirst segment\n\n2\n00:00:01,000 --> 00:00:02,000\nSecond segment\n`,
        startTime: 0,
        endTime: 2,
      },
      {
        srt: `1\n00:00:00,000 --> 00:00:01,000\nThird segment\n`,
        startTime: 2,
        endTime: 3,
      },
    ];

    const merged = merger.merge(results);

    assert.match(merged, /First segment/);
    assert.match(merged, /Second segment/);
    assert.match(merged, /Third segment/);
    assert.match(merged, /00:00:02,000 --> 00:00:03,000/);
  });

  it('should correctly shift time codes', () => {
    const merger = new ResultMerger();

    const result = merger.merge([
      {
        srt: `1\n00:00:00,000 --> 00:00:01,000\nTest\n`,
        startTime: 3600, // 1 hour
        endTime: 3601,
      },
    ]);

    assert.match(result, /01:00:00,000 --> 01:00:01,000/);
  });
});
