import { chunk } from './documents';

describe('document text processing', () => {
  it('chunks documents with overlap', () => {
    expect(chunk('abcdefghij', 6, 2)).toEqual(['abcdef', 'efghij', 'ij']);
  });
});
