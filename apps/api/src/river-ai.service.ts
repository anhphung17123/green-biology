import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

export const BIOLOGY_MODEL = 'deepseek-ai/DeepSeek-V4.1-Flash';
export const ANIMAL_MODEL = 'nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-NVFP4';

export const BIOLOGY_SYSTEM_PROMPT =
  'Bạn là một chuyên gia giáo dục môn Sinh học cấp ba tại Việt Nam. Hãy trả lời câu hỏi của học sinh một cách chính xác, khoa học, dễ hiểu và luôn dùng tiếng Việt.';

export const ANIMAL_PROMPT =
  'Hãy phân tích hình ảnh này và cho biết đây là loài động vật gì. Trả về kết quả chính xác theo định dạng: Tên tiếng Việt - Tên khoa học (Nếu có) - Tóm tắt ngắn gọn đặc điểm nhận diện chính trong 2 câu.';

type RiverError = { status?: number; name?: string };
type MessageContent = string | Array<{ type?: string; text?: string }>;
type ChatCompletion = { choices?: Array<{ message?: { content?: MessageContent; reasoning_content?: string }; finish_reason?: string }> };

export function riverChatCompletionsUrl(configuredBaseUrl?: string): URL {
  const raw = (configuredBaseUrl?.trim() || 'https://api.river.ai/v1').replace(/\/+$/, '');
  const base = new URL(raw);
  const path = base.pathname.replace(/\/+$/, '');
  base.pathname = path.endsWith('/v1') ? `${path}/chat/completions` : `${path}/v1/chat/completions`;
  return base;
}

export function extractRiverContent(payload: ChatCompletion): string | null {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim() || null;
  if (Array.isArray(content)) {
    const text = content.map((part) => part.text || '').join('').trim();
    return text || null;
  }
  return null;
}

export function mapRiverError(error: unknown): HttpException {
  const value = error as RiverError;
  if (value.status === 401 || value.status === 403) {
    return new ServiceUnavailableException('River API chưa được xác thực hoặc tài khoản không có quyền dùng model đã cấu hình.');
  }
  if (value.status === 429) {
    return new HttpException('River API đang giới hạn tần suất hoặc đã hết quota.', HttpStatus.TOO_MANY_REQUESTS);
  }
  if (value.name === 'TimeoutError' || value.name === 'AbortError') {
    return new GatewayTimeoutException('River API phản hồi quá thời gian cho phép.');
  }
  if (value.status && value.status >= 500) {
    return new BadGatewayException('River API đang tạm thời không khả dụng.');
  }
  return new BadGatewayException('Không thể nhận kết quả hợp lệ từ River API.');
}

@Injectable()
export class RiverAiService {
  async chatBiology(message: string): Promise<string> {
    return this.createCompletion({
      model: BIOLOGY_MODEL,
      temperature: 0.3,
      reasoning_effort: 'none',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: BIOLOGY_SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    });
  }

  async classifyAnimal(image: Buffer, mimeType: string): Promise<string> {
    const dataUrl = `data:${mimeType};base64,${image.toString('base64')}`;
    return this.createCompletion({
      model: ANIMAL_MODEL,
      temperature: 0.2,
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: ANIMAL_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
    });
  }

  private async createCompletion(body: unknown): Promise<string> {
    const apiKey = process.env.RIVER_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('River API chưa được cấu hình. Quản trị viên cần thiết lập RIVER_API_KEY.');
    }

    let endpoint: URL;
    try {
      endpoint = riverChatCompletionsUrl(process.env.RIVER_BASE_URL);
    } catch {
      throw new ServiceUnavailableException('RIVER_BASE_URL không hợp lệ.');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Number(process.env.RIVER_TIMEOUT_MS || 60000)),
      });
      const contentType = response.headers?.get?.('content-type') || '';
      const payload = await response.json().catch(() => ({})) as ChatCompletion;
      if (!response.ok) throw { status: response.status };
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new BadGatewayException('RIVER_BASE_URL không trỏ tới River Inference API.');
      }
      const content = extractRiverContent(payload);
      if (!content) {
        const finishReason = payload.choices?.[0]?.finish_reason;
        throw new BadGatewayException(finishReason === 'length'
          ? 'River API đã dùng hết giới hạn token trước khi tạo câu trả lời.'
          : 'River API không trả về nội dung.');
      }
      return content.slice(0, 5000);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw mapRiverError(error);
    }
  }
}
