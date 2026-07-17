import { buildRepertoire, type AssetRow, type SongRow } from './songsModel';

const songs: SongRow[] = [
  {
    id: 's1',
    title: 'Explosive Manifestation',
    composer: 'DLBC',
    songKey: 'G',
    tempo: 96,
    tags: [],
  },
];

const assets: AssetRow[] = [
  { id: 'sop', songId: 's1', assetType: 'part_audio', voicePart: 'soprano', renditions: {} },
  { id: 'ten', songId: 's1', assetType: 'part_audio', voicePart: 'tenor', renditions: {} },
  { id: 'bass', songId: 's1', assetType: 'part_audio', voicePart: 'bass', renditions: {} },
  {
    id: 'lyr',
    songId: 's1',
    assetType: 'lyrics',
    voicePart: null,
    content: 'Lyrics body',
    renditions: {},
  },
  {
    id: 'sol',
    songId: 's1',
    assetType: 'solfa',
    voicePart: null,
    content: 'd r m f',
    renditions: {},
  },
];

describe('buildRepertoire', () => {
  it('promotes the member’s own voice part to the front and marks it primary', () => {
    const [song] = buildRepertoire(songs, assets, 'tenor');
    expect(song.audioParts[0]).toMatchObject({ voicePart: 'tenor', isUserPart: true });
    expect(song.primaryPart?.voicePart).toBe('tenor');
    expect(song.userPart).toBe('tenor');
    // The remaining parts keep canonical SATB order behind the promoted one.
    expect(song.audioParts.map((p) => p.voicePart)).toEqual(['tenor', 'soprano', 'bass']);
  });

  it('attaches lyrics and solfa text', () => {
    const [song] = buildRepertoire(songs, assets, 'tenor');
    expect(song.lyrics).toBe('Lyrics body');
    expect(song.solfa).toBe('d r m f');
  });

  it('promotes nothing and falls back to the first part when no part is chosen', () => {
    const [song] = buildRepertoire(songs, assets, null);
    expect(song.userPart).toBeNull();
    // Canonical SATB order when there is no own-part to hoist.
    expect(song.audioParts.map((p) => p.voicePart)).toEqual(['soprano', 'tenor', 'bass']);
    expect(song.primaryPart?.voicePart).toBe('soprano');
  });
});
