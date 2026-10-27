const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL?.trim();

export class ApiError extends Error {}

export async function loginWithGoogleSheet<T>(username: string, pwd: string): Promise<T> {
  const result=await scriptRequest({ action: "login", username, pwd });
  return result.user as T;
}

export async function registerWithGoogleSheet<T>(username: string, pwd: string, name: string): Promise<T> {
  const result=await scriptRequest({ action: "register", username, pwd, name });
  return result.user as T;
}

export async function askBiology<T>(question:string):Promise<T>{const result=await scriptRequest({action:"chat",question});return result.data as T}

export async function recognizeSpecies<T>(file:File):Promise<T>{const image=await fileToBase64(file);const result=await scriptRequest({action:"recognize",image,filename:file.name,mimeType:file.type});return result.data as T}

async function scriptRequest(body: Record<string, string>): Promise<any> {
  if (!GOOGLE_SCRIPT_URL) throw new ApiError("Thiếu VITE_GOOGLE_SCRIPT_URL");
  let response: Response;
  try {
    response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Không thể kết nối Google Sheets");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new ApiError(result.message || "Đăng nhập thất bại");
  return result;
}

function fileToBase64(file:File):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new ApiError("Không thể đọc ảnh"));reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.readAsDataURL(file)})}
