import { isBiologyQuestion } from './chat';

describe('biology chat scope', () => {
  it.each(['Quang hợp diễn ra như thế nào?', 'Vì sao cần bảo tồn đa dạng sinh học?', 'Ô nhiễm không khí ảnh hưởng hệ sinh thái ra sao?', 'Explain natural selection in biology'])('accepts biology question: %s', (q) => expect(isBiologyQuestion(q)).toBe(true));
  it.each(['Viết code JavaScript cho tôi', 'Dự đoán giá chứng khoán ngày mai', 'Đội bóng nào mạnh nhất?'])('rejects unrelated question: %s', (q) => expect(isBiologyQuestion(q)).toBe(false));
});
