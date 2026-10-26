import { BadGatewayException } from '@nestjs/common';
import { animalDetectPrediction, detectImageMime } from './recognition';

describe('species recognition image validation', () => {
  it('detects JPEG, PNG and WebP by magic bytes', () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(detectImageMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(detectImageMime(Buffer.from('RIFF0000WEBP'))).toBe('image/webp');
  });

  it('rejects content that is not a supported image', () => {
    expect(detectImageMime(Buffer.from('not an image'))).toBeNull();
  });
});

describe('Animal Detect response mapping', () => {
  it('returns unknown when no animal is detected', () => {
    expect(animalDetectPrediction({ annotations: [] })).toMatchObject({ identifiable: false, commonName: null, certainty: 'UNKNOWN' });
  });

  it('uses the highest-scoring animal and maps taxonomy', () => {
    const result = animalDetectPrediction({ annotations: [
      { label: 'fox', score: 0.55, taxonomy: { class: 'mammalia' } },
      { label: 'red fox', score: 0.91, taxonomy: { class: 'mammalia', family: 'canidae', genus: 'vulpes', species: 'Vulpes vulpes' } },
    ] });
    expect(result).toMatchObject({ commonName: 'red fox', scientificName: 'Vulpes vulpes', certainty: 'HIGH' });
  });

  it('rejects malformed provider output', () => {
    expect(() => animalDetectPrediction({})).toThrow(BadGatewayException);
    expect(() => animalDetectPrediction({ annotations: [{ label: 'fox' }] })).toThrow(BadGatewayException);
  });
});
