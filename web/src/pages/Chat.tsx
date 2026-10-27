import { FormEvent, useState } from "react";
import { Bot, CircleAlert, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { askBiology } from "../api";

type Reply = {
  answer: string;
  sources: { title: string; url?: string }[];
  warning?: string;
};

function normalizeModelMarkdown(markdown: string) {
  return markdown
    .replace(
      /\\\[([\s\S]*?)\\\]/g,
      (_, expression: string) => `\n$$\n${expression.trim()}\n$$\n`,
    )
    .replace(
      /\\\(([\s\S]*?)\\\)/g,
      (_, expression: string) => `$${expression.trim()}$`,
    );
}

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<Reply>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      setReply(await askBiology<Reply>(question));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể gửi câu hỏi",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page chat-page">
      <div className="chat-intro">
        <div className="bot-big">
          <Bot />
        </div>
        <span className="kicker">TRỢ LÝ SINH HỌC</span>
        <h1>Hỏi điều bạn tò mò</h1>
        <p>
          Hỏi về Sinh học, đa dạng sinh học, bảo tồn thiên nhiên và môi trường.
        </p>
      </div>

      {error && (
        <div className="notice">
          <CircleAlert />
          {error} Trợ lý không tạo câu trả lời giả khi River AI chưa sẵn sàng.
        </div>
      )}

      {reply && (
        <div className="reply">
          <Bot />
          <div>
            <div className="markdown-answer">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {normalizeModelMarkdown(reply.answer)}
              </ReactMarkdown>
            </div>
            {reply.sources.length > 0 && (
              <small>
                Nguồn: {reply.sources.map((source) => source.title).join(", ")}
              </small>
            )}
            {reply.warning && <small>{reply.warning}</small>}
          </div>
        </div>
      )}

      <form className="ask" onSubmit={submit}>
        <textarea
          maxLength={1000}
          required
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ví dụ: Quang hợp và hô hấp tế bào khác nhau thế nào?"
        />
        <button disabled={busy || !question.trim()} aria-label="Gửi câu hỏi">
          <Send />
        </button>
      </form>
      <p className="disclaimer">
        AI có thể nhầm lẫn. Hãy kiểm tra nguồn và hỏi giáo viên khi cần.
      </p>
    </div>
  );
}
