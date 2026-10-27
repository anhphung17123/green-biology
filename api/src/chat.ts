import { Body, Controller, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { RiverAiService } from './river-ai.service';

class AskDto { @IsString() @Length(3, 1000) question!: string }
const BIOLOGY_TERMS = ['sinh học','sinh vật','đa dạng sinh học','bảo tồn','môi trường','hệ sinh thái','sinh thái','ô nhiễm','khí hậu','aqi','tế bào','di truyền','dna','rna','gen ','nhiễm sắc thể','enzyme','protein','quang hợp','hô hấp','tiến hóa','chọn lọc tự nhiên','động vật','thực vật','vi sinh','vi khuẩn','virus','nấm','tảo','loài','quần thể','quần xã','chuỗi thức ăn','lưới thức ăn','cơ thể','cơ quan','máu','tim','phổi','gan','thận','não','hormone','miễn dịch','sức khỏe sinh sản','dinh dưỡng','rừng','biển','đại dương','đất ngập nước','san hô','rác thải','nước thải','không khí','tuyệt chủng','sách đỏ','biology','biodiversity','conservation','ecology','ecosystem','species','cell','genetic','evolution','photosynthesis','pollution'];
const OUT_OF_SCOPE_TERMS = ['lập trình','code ','javascript','python','bóng đá','chứng khoán','tiền ảo','marketing','viết văn','lịch sử chiến tranh','toán học'];

export function isBiologyQuestion(question: string) {
  const q = ` ${question.toLocaleLowerCase('vi')} `;
  if (OUT_OF_SCOPE_TERMS.some((term) => q.includes(term))) return false;
  return BIOLOGY_TERMS.some((term) => q.includes(term));
}

@Controller('biology-chat')
export class ChatController {
  constructor(private readonly riverAi: RiverAiService) {}
  @Post('ask')
  async ask(@Body() dto: AskDto) {
    const question = dto.question.trim();
    if (!isBiologyQuestion(question)) return { answer: 'Mình chỉ hỗ trợ câu hỏi về Sinh học, đa dạng sinh học, bảo tồn thiên nhiên và môi trường.', sources: [], refused: true };
    return { answer: await this.riverAi.chatBiology(question), sources: [], model: 'deepseek-ai/DeepSeek-V4.1-Flash' };
  }
}
