import { createServer, type IncomingMessage } from "node:http";
import { apiHandler } from "./handler.js";

async function toRequest(req: IncomingMessage) {
  const origin = `http://${req.headers.host || "localhost"}`;
  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers: req.headers as HeadersInit,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req as any;
    init.duplex = "half";
  }
  return new Request(new URL(req.url || "/", origin), init);
}

const server = createServer(async (req, res) => {
  try {
    const response = await apiHandler(await toRequest(req));
    res.writeHead(
      response.status,
      Object.fromEntries(response.headers.entries()),
    );
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, message: "Lỗi máy chủ" }));
  }
});

server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () => {
  console.log(`Green Biology API listening on :${process.env.PORT || 3000}`);
});
