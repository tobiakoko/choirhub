import { resolvePlaybackSource } from './resolveSource';

describe('resolvePlaybackSource', () => {
  it('plays a cached local file — even offline (airplane mode)', () => {
    expect(
      resolvePlaybackSource({
        localUri: 'file:///media/tenor.opus',
        localExists: true,
        remoteUrl: 'https://cdn/tenor.opus',
        isOnline: false,
      })
    ).toEqual({ kind: 'local', uri: 'file:///media/tenor.opus' });
  });

  it('prefers the local file over the network even when online', () => {
    expect(
      resolvePlaybackSource({
        localUri: 'file:///media/tenor.opus',
        localExists: true,
        remoteUrl: 'https://cdn/tenor.opus',
        isOnline: true,
      })
    ).toEqual({ kind: 'local', uri: 'file:///media/tenor.opus' });
  });

  it('streams from the network only when online and uncached', () => {
    expect(
      resolvePlaybackSource({
        localUri: null,
        localExists: false,
        remoteUrl: 'https://cdn/tenor.opus',
        isOnline: true,
      })
    ).toEqual({ kind: 'remote', uri: 'https://cdn/tenor.opus' });
  });

  it('is unavailable when uncached and offline — never an error', () => {
    expect(
      resolvePlaybackSource({
        localUri: null,
        localExists: false,
        remoteUrl: 'https://cdn/tenor.opus',
        isOnline: false,
      })
    ).toEqual({ kind: 'unavailable' });
  });
});
