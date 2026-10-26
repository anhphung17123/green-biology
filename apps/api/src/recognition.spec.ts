import { BadGatewayException } from '@nestjs/common';
import { detectImageMime, parseSpeciesPrediction } from './recognition';

const uncertain = JSON.stringify({
  identifiable: false,
  commonName: 'Tên không được giữ lại',
  scientificName: 'Species fabricated',
  organismGroup: 'Thực vật',
  identifyingFeatures: ['Ảnh quá mờ'],
  habitat: null,
  certainty: 'LOW',
  certaintyReason: 'Không thấy đặc điểm phân biệt',
  limitations: 'Cần ảnh rõ hơn',
});

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

describe('species recognition structured output', () => {
  it('removes invented names when the image is not identifiable', () => {
    expect(parseSpeciesPrediction(uncertain)).toMatchObject({
      identifiable: false, commonName: null, scientificName: null, certainty: 'UNKNOWN',
    });
  });

  it('accepts a complete identifiable result', () => {
    const result = parseSpeciesPrediction(JSON.stringify({
      identifiable: true, commonName: 'Voọc chà vá chân nâu', scientificName: 'Pygathrix nemaeus',
      organismGroup: 'Thú', identifyingFeatures: ['Cẳng chân nâu đỏ'], habitat: 'Rừng thường xanh',
      certainty: 'MEDIUM', certaintyReason: 'Có một đặc điểm nổi bật', limitations: 'Không thấy toàn bộ cơ thể',
    }));
    expect(result.scientificName).toBe('Pygathrix nemaeus');
  });

  it('rejects malformed or incomplete model output', () => {
    expect(() => parseSpeciesPrediction('{bad json')).toThrow(BadGatewayException);
    expect(() => parseSpeciesPrediction(JSON.stringify({ identifiable: true }))).toThrow(BadGatewayException);
  });
});
