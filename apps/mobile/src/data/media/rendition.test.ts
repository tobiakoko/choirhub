import { parseRenditions, renditionBytes, selectRendition } from './rendition';

const RAW = {
  opus_24k: { url: 'https://cdn/soprano.opus', bytes: 716800, durationSec: 245 },
  aac_96k: { url: 'https://cdn/soprano.m4a', bytes: 2949120, durationSec: 245 },
};

describe('parseRenditions', () => {
  it('decodes object entries with codec + bitrate from the key', () => {
    const parsed = parseRenditions(RAW);
    const opus = parsed.find((r) => r.key === 'opus_24k');
    expect(opus).toMatchObject({ codec: 'opus', bitrateKbps: 24, bytes: 716800, durationSec: 245 });
    const aac = parsed.find((r) => r.key === 'aac_96k');
    expect(aac).toMatchObject({ codec: 'aac', bitrateKbps: 96 });
  });

  it('accepts the legacy bare-url string form', () => {
    const parsed = parseRenditions({ opus_24k: 'https://cdn/x.opus' });
    expect(parsed).toEqual([
      {
        key: 'opus_24k',
        url: 'https://cdn/x.opus',
        codec: 'opus',
        bitrateKbps: 24,
        bytes: undefined,
        durationSec: undefined,
      },
    ]);
  });

  it('drops unknown / non-audio keys and url-less entries', () => {
    const parsed = parseRenditions({
      thumb_webp: 'https://cdn/x.webp',
      opus_24k: {}, // no url
      aac_96k: 'https://cdn/x.m4a',
    });
    expect(parsed.map((r) => r.key)).toEqual(['aac_96k']);
  });
});

describe('renditionBytes', () => {
  it('prefers the recorded byte size', () => {
    expect(
      renditionBytes({ key: 'opus_24k', url: 'x', codec: 'opus', bitrateKbps: 24, bytes: 700000 })
    ).toBe(700000);
  });

  it('estimates from bitrate × duration when bytes are absent', () => {
    // 24kbps × 240s = 5,760,000 bits = 720,000 bytes
    expect(
      renditionBytes({
        key: 'opus_24k',
        url: 'x',
        codec: 'opus',
        bitrateKbps: 24,
        durationSec: 240,
      })
    ).toBe(720000);
  });

  it('is undefined when neither size nor duration is known', () => {
    expect(
      renditionBytes({ key: 'opus_24k', url: 'x', codec: 'opus', bitrateKbps: 24 })
    ).toBeUndefined();
  });
});

describe('selectRendition', () => {
  const parsed = parseRenditions(RAW);

  it('picks Opus on cellular to protect the data budget', () => {
    const choice = selectRendition(parsed, { networkType: 'cellular', dataSaver: false });
    expect(choice).toMatchObject({ reason: 'cellular-opus' });
    expect(choice?.rendition.codec).toBe('opus');
  });

  it('picks AAC on Wi-Fi for fuller quality', () => {
    const choice = selectRendition(parsed, { networkType: 'wifi', dataSaver: false });
    expect(choice).toMatchObject({ reason: 'wifi-aac' });
    expect(choice?.rendition.codec).toBe('aac');
  });

  it('forces Opus under Data Saver regardless of network', () => {
    for (const networkType of ['wifi', 'cellular', 'unknown'] as const) {
      const choice = selectRendition(parsed, { networkType, dataSaver: true });
      expect(choice).toMatchObject({ reason: 'data-saver-opus' });
      expect(choice?.rendition.codec).toBe('opus');
    }
  });

  it('falls back to the other codec when the preferred one is missing', () => {
    const onlyAac = parseRenditions({ aac_96k: RAW.aac_96k });
    expect(selectRendition(onlyAac, { networkType: 'cellular', dataSaver: false })).toMatchObject({
      reason: 'only-available',
    });
    const onlyOpus = parseRenditions({ opus_24k: RAW.opus_24k });
    expect(selectRendition(onlyOpus, { networkType: 'wifi', dataSaver: false })).toMatchObject({
      reason: 'only-available',
    });
  });

  it('returns null when there are no audio renditions', () => {
    expect(selectRendition([], { networkType: 'wifi', dataSaver: false })).toBeNull();
  });

  it('prefers the leanest Opus when several bitrates exist', () => {
    const parsedMulti = parseRenditions({
      opus_16k: 'https://cdn/lo.opus',
      opus_24k: 'https://cdn/hi.opus',
    });
    const choice = selectRendition(parsedMulti, { networkType: 'cellular', dataSaver: false });
    expect(choice?.rendition.bitrateKbps).toBe(16);
  });
});
