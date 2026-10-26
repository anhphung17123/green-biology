import { BadGatewayException, BadRequestException, Body, Controller, HttpException, HttpStatus, Post, ServiceUnavailableException } from '@nestjs/common';
import { IsString, Length } from 'class-validator';

class AskDto { @IsString() @Length(3, 1000) question!: string }

const BIOLOGY_TERMS = [
  'sinh học', 'sinh vật', 'đa dạng sinh học', 'bảo tồn', 'môi trường', 'hệ sinh thái', 'sinh thái', 'ô nhiễm', 'khí hậu', 'aqi',
  'tế bào', 'di truyền', 'dna', 'rna', 'gen ', 'nhiễm sắc thể', 'enzyme', 'protein', 'quang hợp', 'hô hấp', 'tiến hóa', 'chọn lọc tự nhiên',
  'động vật', 'thực vật', 'vi sinh', 'vi khuẩn', 'virus', 'nấm', 'tảo', 'loài', 'quần thể', 'quần xã', 'chuỗi thức ăn', 'lưới thức ăn',
  'cơ thể', 'cơ quan', 'máu', 'tim', 'phổi', 'gan', 'thận', 'não', 'hormone', 'miễn dịch', 'sức khỏe sinh sản', 'dinh dưỡng',
  'rừng', 'biển', 'đại dương', 'đất ngập nước', 'san hô', 'rác thải', 'nước thải', 'không khí', 'tuyệt chủng', 'sách đỏ',
  'biology', 'biodiversity', 'conservation', 'ecology', 'ecosystem', 'species', 'cell', 'genetic', 'evolution', 'photosynthesis', 'pollution',
];
const OUT_OF_SCOPE_TERMS = ['lập trình', 'code ', 'javascript', 'python', 'bóng đá', 'chứng khoán', 'tiền ảo', 'marketing', 'viết văn', 'lịch sử chiến tranh', 'toán học'];

export function isBiologyQuestion(question: string) {
  const q = ` ${question.toLocaleLowerCase('vi')} `;
  if (OUT_OF_SCOPE_TERMS.some((term) => q.includes(term))) return false;
  return BIOLOGY_TERMS.some((term) => q.includes(term));
}

type ProviderError = { status?: number; code?: string; message?: string; name?: string };

export function mapGeminiError(error: unknown, feature = 'Chatbot'): HttpException {
  const value = error as ProviderError;
  if (value.status === 401 || value.status === 403) return new ServiceUnavailableException('Gemini API chưa được xác thực hoặc project không có quyền dùng model đã cấu hình.');
  if (value.status === 429) return new HttpException(`Gemini API đã hết quota hoặc đang giới hạn tần suất. ${feature} tạm thời không khả dụng.`, HttpStatus.TOO_MANY_REQUESTS);
  if (value.status === 404) return new BadGatewayException(value.message?.includes('no longer available')
    ? 'Model Gemini đã cấu hình không còn khả dụng. Hãy cập nhật GEMINI_MODEL sang model mới hơn.'
    : 'Không tìm thấy model Gemini đã cấu hình hoặc project chưa được cấp quyền.');
  if (value.status && value.status >= 500) return new BadGatewayException('Gemini API đang tạm thời không khả dụng. Vui lòng thử lại sau.');
  if (value.name === 'TimeoutError' || value.name === 'AbortError') return new BadGatewayException('Gemini API phản hồi quá thời gian cho phép.');
  return new BadGatewayException(`${feature} không thể nhận kết quả từ Gemini API.`);
}

export async function geminiRequest<T>(path: string, body: unknown): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new ServiceUnavailableException('Gemini API chưa được cấu hình. Quản trị viên cần thiết lập GEMINI_API_KEY.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.GEMINI_TIMEOUT_MS || 30000)),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string; status?: string } };
  if (!response.ok) throw { status: response.status, message: payload.error?.message, code: payload.error?.status };
  return payload;
}

@Controller('biology-chat')
export class ChatController {
  @Post('ask')
  async ask(@Body() dto: AskDto) {
    const question = dto.question.trim();
    if (!isBiologyQuestion(question)) return { answer: 'Mình chỉ hỗ trợ câu hỏi về Sinh học, đa dạng sinh học, bảo tồn thiên nhiên và môi trường.', sources: [], refused: true };
    if (!process.env.GEMINI_API_KEY?.trim()) throw new ServiceUnavailableException('Gemini API chưa được cấu hình. Quản trị viên cần thiết lập GEMINI_API_KEY.');
    const model = process.env.GEMINI_MODEL?.trim();
    if (!model) throw new ServiceUnavailableException('Gemini model chưa được cấu hình. Quản trị viên cần thiết lập GEMINI_MODEL.');
    try {
      const response = await geminiRequest<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(`models/${encodeURIComponent(model)}:generateContent`, {
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 700 },
      });
      const answer = response.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
      if (!answer) throw new BadRequestException('Gemini API không trả về nội dung.');
      return { answer: answer.slice(0, 5000), sources: [], model };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw mapGeminiError(error);
    }
  }
}
