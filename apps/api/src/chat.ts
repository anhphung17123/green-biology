import{BadGatewayException,BadRequestException,Body,Controller,HttpException,HttpStatus,Post,ServiceUnavailableException}from'@nestjs/common';
import{IsString,Length}from'class-validator';
import OpenAI from'openai';

class AskDto{@IsString()@Length(3,1000)question!:string}

const BIOLOGY_TERMS=[
 'sinh học','sinh vật','đa dạng sinh học','bảo tồn','môi trường','hệ sinh thái','sinh thái','ô nhiễm','khí hậu','aqi',
 'tế bào','di truyền','dna','rna','gen ','nhiễm sắc thể','enzyme','protein','quang hợp','hô hấp','tiến hóa','chọn lọc tự nhiên',
 'động vật','thực vật','vi sinh','vi khuẩn','virus','nấm','tảo','loài','quần thể','quần xã','chuỗi thức ăn','lưới thức ăn',
 'cơ thể','cơ quan','máu','tim','phổi','gan','thận','não','hormone','miễn dịch','sức khỏe sinh sản','dinh dưỡng',
 'rừng','biển','đại dương','đất ngập nước','san hô','rác thải','nước thải','không khí','tuyệt chủng','sách đỏ',
 'biology','biodiversity','conservation','ecology','ecosystem','species','cell','genetic','evolution','photosynthesis','pollution'
];
const OUT_OF_SCOPE_TERMS=['lập trình','code ','javascript','python','bóng đá','chứng khoán','tiền ảo','marketing','viết văn','lịch sử chiến tranh','toán học'];

export function isBiologyQuestion(question:string){const q=` ${question.toLocaleLowerCase('vi')} `;if(OUT_OF_SCOPE_TERMS.some(term=>q.includes(term)))return false;return BIOLOGY_TERMS.some(term=>q.includes(term))}

export function mapOpenAIError(error:unknown,feature='Chatbot'):HttpException{const value=error as{status?:number;code?:string;message?:string};if(value.status===401||value.status===403)return new ServiceUnavailableException('OpenAI API chưa được xác thực hoặc project không có quyền dùng model đã cấu hình.');if(value.status===429){const quota=['credit_balance_exhausted','insufficient_quota','project_spend_limit_exceeded','organization_spend_limit_exceeded','organization_usage_limit_exceeded'];if(value.code&&quota.includes(value.code))return new HttpException(`OpenAI API đã hết quota hoặc đạt giới hạn chi tiêu. ${feature} tạm thời không khả dụng.`,HttpStatus.TOO_MANY_REQUESTS);return new HttpException('OpenAI API đang giới hạn tần suất yêu cầu. Vui lòng thử lại sau.',HttpStatus.TOO_MANY_REQUESTS)}if(value.status===404)return new BadGatewayException('Không tìm thấy model OpenAI đã cấu hình hoặc project chưa được cấp quyền.');if(value.status&&value.status>=500)return new BadGatewayException('OpenAI API đang tạm thời không khả dụng. Vui lòng thử lại sau.');if(error instanceof OpenAI.APIConnectionTimeoutError)return new BadGatewayException('OpenAI API phản hồi quá thời gian cho phép.');if(error instanceof OpenAI.APIConnectionError)return new BadGatewayException('Không thể kết nối OpenAI API.');return new BadGatewayException(`${feature} không thể nhận kết quả từ OpenAI API.`)}

@Controller('biology-chat')export class ChatController{
 @Post('ask')async ask(@Body()dto:AskDto){const question=dto.question.trim();if(!isBiologyQuestion(question))return{answer:'Mình chỉ hỗ trợ câu hỏi về Sinh học, đa dạng sinh học, bảo tồn thiên nhiên và môi trường.',sources:[],refused:true};const apiKey=process.env.OPENAI_API_KEY?.trim(),model=process.env.OPENAI_MODEL?.trim();if(!apiKey)throw new ServiceUnavailableException('OpenAI API chưa được cấu hình. Quản trị viên cần thiết lập OPENAI_API_KEY.');if(!model)throw new ServiceUnavailableException('OpenAI model chưa được cấu hình. Quản trị viên cần thiết lập OPENAI_MODEL.');const client=new OpenAI({apiKey,timeout:Number(process.env.OPENAI_TIMEOUT_MS||30000),maxRetries:1});try{const response=await client.responses.create({model,instructions:'Bạn là trợ lý Green Biology dành cho học sinh THPT Việt Nam. Chỉ trả lời về Sinh học, đa dạng sinh học, bảo tồn thiên nhiên và môi trường. Trình bày bằng tiếng Việt rõ ràng, vừa sức học sinh; giải thích thuật ngữ khi cần. Không bịa nguồn, số liệu, tình trạng bảo tồn hoặc mức độ nguy cấp. Nếu không chắc chắn, nói rõ giới hạn và đề nghị kiểm tra nguồn khoa học đáng tin cậy. Không tuyên bố chẩn đoán y khoa.',input:question,max_output_tokens:700});const answer=response.output_text?.trim();if(!answer)throw new BadRequestException('OpenAI API không trả về nội dung.');return{answer:answer.slice(0,5000),sources:[],model}}catch(error){if(error instanceof BadRequestException)throw error;throw mapOpenAIError(error)}}
}
