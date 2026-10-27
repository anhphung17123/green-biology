import { BadGatewayException } from '@nestjs/common';
import { SpeciesApiService } from './species-api.service';

describe('SpeciesApiService', () => {
  const originalFetch = global.fetch;
  const originalSession = process.env.SPECIES_API_PHPSESSID;
  beforeEach(() => { process.env.SPECIES_API_PHPSESSID = 'test-session'; });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalSession === undefined) delete process.env.SPECIES_API_PHPSESSID;
    else process.env.SPECIES_API_PHPSESSID = originalSession;
  });

  it('sends species mode and returns validated data', async () => {
    const payload = { success: true, mode: 'species', data: { species_name: 'Voi', scientific_name: 'Loxodonta africana', endangerment_level: 'EN', characteristics: 'Lớn', habitat: 'Xavan', conservation_guide: 'Bảo vệ', fun_facts: ['Có vòi'], student_question: 'Vòi để làm gì?', student_answer: 'Để thở.', confidence: 0.97 }, log_id: 337, image_url: 'https://example.test/elephant.webp' };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(payload) });
    await expect(new SpeciesApiService().identify(Buffer.from('image'), 'image/png', 'animal.png')).resolves.toEqual(payload);
    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(options.headers.Cookie).toBe('PHPSESSID=test-session');
    expect(options.body.get('mode')).toBe('species');
  });

  it('rejects malformed upstream data', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true }) });
    await expect(new SpeciesApiService().identify(Buffer.from('image'), 'image/png', 'animal.png')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
