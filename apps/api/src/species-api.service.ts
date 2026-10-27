import { BadGatewayException, GatewayTimeoutException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';

export type SpeciesApiData = {
  species_name: string;
  scientific_name: string;
  endangerment_level: string;
  characteristics: string;
  habitat: string;
  conservation_guide: string;
  fun_facts: string[];
  student_question: string;
  student_answer: string;
  confidence: number;
};

export type SpeciesApiResponse = {
  success: true;
  mode: 'species';
  data: SpeciesApiData;
  log_id: number;
  image_url: string;
};

function isSpeciesApiResponse(value: unknown): value is SpeciesApiResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<SpeciesApiResponse>;
  const data = response.data as Partial<SpeciesApiData> | undefined;
  return response.success === true && response.mode === 'species' && !!data
    && typeof data.species_name === 'string' && typeof data.scientific_name === 'string'
    && typeof data.endangerment_level === 'string' && typeof data.characteristics === 'string'
    && typeof data.habitat === 'string' && typeof data.conservation_guide === 'string'
    && Array.isArray(data.fun_facts) && data.fun_facts.every((fact) => typeof fact === 'string')
    && typeof data.student_question === 'string' && typeof data.student_answer === 'string'
    && typeof data.confidence === 'number';
}

@Injectable()
export class SpeciesApiService {
  async identify(image: Buffer, mimeType: string, filename: string): Promise<SpeciesApiResponse> {
    const sessionId = (process.env.SPECIES_API_PHPSESSID || process.env.PHPSESSID)?.trim();
    if (!sessionId) throw new ServiceUnavailableException('Species API chưa được cấu hình. Quản trị viên cần thiết lập SPECIES_API_PHPSESSID.');
    const endpoint = process.env.SPECIES_API_URL?.trim() || 'https://trituexanhhocduong.4devvn.com/api/identify-species.php';

    const form = new FormData();
    form.append('mode', 'species');
    form.append('image', new Blob([new Uint8Array(image)], { type: mimeType }), filename);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Cookie: `PHPSESSID=${sessionId}`,
          Referer: 'https://trituexanhhocduong.4devvn.com/pages/species-identifier.php',
          Origin: 'https://trituexanhhocduong.4devvn.com',
        },
        body: form,
        signal: AbortSignal.timeout(Number(process.env.SPECIES_API_TIMEOUT_MS || 60000)),
      });
      const text = await response.text();
      const payload = (() => { try { return JSON.parse(text) as unknown; } catch { return null; } })();
      if (response.status === 401 || response.status === 403) throw new ServiceUnavailableException('Phiên đăng nhập Species API không hợp lệ hoặc đã hết hạn.');
      if (response.status === 429) throw new HttpException('Species API đang giới hạn tần suất.', HttpStatus.TOO_MANY_REQUESTS);
      if (!response.ok) throw new BadGatewayException('Species API không thể xử lý ảnh này.');
      if (!isSpeciesApiResponse(payload)) throw new BadGatewayException('Species API trả về dữ liệu không hợp lệ.');
      return payload;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if ((error as { name?: string }).name === 'TimeoutError') throw new GatewayTimeoutException('Species API phản hồi quá thời gian cho phép.');
      throw new BadGatewayException('Không thể kết nối Species API.');
    }
  }
}
