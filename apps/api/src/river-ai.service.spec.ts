import { HttpStatus } from '@nestjs/common';
import { ANIMAL_MODEL, BIOLOGY_MODEL, BIOLOGY_SYSTEM_PROMPT, extractRiverContent, mapRiverError, RiverAiService, riverChatCompletionsUrl } from './river-ai.service';

describe('River response and endpoint handling', () => {
  it.each([
    ['https://api.river.ai', 'https://api.river.ai/v1/chat/completions'],
    ['https://api.river.ai/v1', 'https://api.river.ai/v1/chat/completions'],
    ['https://api.river.ai/v1/', 'https://api.river.ai/v1/chat/completions'],
  ])('builds the completion endpoint from %s', (base, expected) => {
    expect(riverChatCompletionsUrl(base).toString()).toBe(expected);
  });

  it('extracts both string and text-part content', () => {
    expect(extractRiverContent({ choices: [{ message: { content: ' answer ' } }] })).toBe('answer');
    expect(extractRiverContent({ choices: [{ message: { content: [{ type: 'text', text: 'answer' }] } }] })).toBe('answer');
  });
});

describe('River AI error mapping', () => {
  it('maps authentication, quota, timeout and upstream errors', () => {
    expect(mapRiverError({ status: 401 }).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mapRiverError({ status: 429 }).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(mapRiverError({ name: 'TimeoutError' }).getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(mapRiverError({ status: 503 }).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
  });
});

describe('RiverAiService', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.RIVER_API_KEY = 'test-key';
    process.env.RIVER_BASE_URL = 'https://river.example/';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('sends the biology system prompt and deterministic temperature', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ choices: [{ message: { content: '  Câu trả lời  ' } }] }),
    });
    const result = await new RiverAiService().chatBiology('Quang hợp là gì?');
    expect(result).toBe('Câu trả lời');
    expect(global.fetch).toHaveBeenCalledWith(new URL('https://river.example/v1/chat/completions'), expect.objectContaining({
      method: 'POST',
      body: expect.any(String),
    }));
    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ model: BIOLOGY_MODEL, temperature: 0.3, reasoning_effort: 'none', max_tokens: 1024 });
    expect(body.messages[0]).toEqual({ role: 'system', content: BIOLOGY_SYSTEM_PROMPT });
  });

  it('sends a validated image as an OpenAI-compatible data URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ choices: [{ message: { content: 'Mèo - Felis catus - Đặc điểm.' } }] }),
    });
    await new RiverAiService().classifyAnimal(Buffer.from('image'), 'image/png');
    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    const body = JSON.parse(options.body);
    expect(body.model).toBe(ANIMAL_MODEL);
    expect(body.messages[0].content[1]).toEqual({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${Buffer.from('image').toString('base64')}` },
    });
  });
});
