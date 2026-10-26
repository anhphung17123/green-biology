import OpenAI from 'openai';
import { chunk, embedTexts } from './documents';

describe('OpenAI document embeddings', () => {
  const previousModel = process.env.OPENAI_EMBED_MODEL;
  beforeEach(() => { process.env.OPENAI_EMBED_MODEL = 'text-embedding-3-small'; });
  afterAll(() => { process.env.OPENAI_EMBED_MODEL = previousModel; });

  it('batches chunks and restores vectors in input order', async () => {
    const create = jest.fn().mockResolvedValue({
      data: [
        { index: 1, embedding: [0.3, 0.4] },
        { index: 0, embedding: [0.1, 0.2] },
      ],
    });
    const client = { embeddings: { create } } as unknown as OpenAI;
    await expect(embedTexts(['đoạn một', 'đoạn hai'], client)).resolves.toEqual([[0.1, 0.2], [0.3, 0.4]]);
    expect(create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small', input: ['đoạn một', 'đoạn hai'], encoding_format: 'float',
    });
  });

  it('fails instead of accepting incomplete embedding output', async () => {
    const client = { embeddings: { create: jest.fn().mockResolvedValue({ data: [] }) } } as unknown as OpenAI;
    await expect(embedTexts(['nội dung'], client)).rejects.toThrow('embedding không đầy đủ');
  });

  it('chunks documents with overlap', () => {
    expect(chunk('abcdefghij', 6, 2)).toEqual(['abcdef', 'efghij', 'ij']);
  });
});
