import { detectImageMime, riverClassificationPrediction } from './recognition';

describe('species recognition image validation', () => {
  it('detects JPEG, PNG and WebP by magic bytes', () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(detectImageMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(detectImageMime(Buffer.from('RIFF0000WEBP'))).toBe('image/webp');
  });
  it('rejects unsupported content', () => expect(detectImageMime(Buffer.from('not an image'))).toBeNull());
});

describe('River AI classification mapping', () => {
  it('maps the requested response format', () => {
    expect(riverClassificationPrediction('Cáo đỏ - Vulpes vulpes - Bộ lông đỏ nâu. Đuôi dài và rậm.')).toMatchObject({
      commonName: 'Cáo đỏ', scientificName: 'Vulpes vulpes', certainty: 'UNKNOWN',
      identifyingFeatures: ['Bộ lông đỏ nâu. Đuôi dài và rậm.'],
    });
  });
});
