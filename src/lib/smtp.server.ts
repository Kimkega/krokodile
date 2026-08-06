// Server-only SMTP client. Speaks raw SMTP (ESMTP + STARTTLS/implicit TLS + AUTH LOGIN/PLAIN)
// so it works both on the edge runtime and on Node, which is what shared-hosting mail
// servers expect. Never import this from client code.

export type SmtpConfig = {
  id: string;
  host: string | null;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  enabled: boolean;
};

export async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("smtp_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SmtpConfig | null) ?? null;
}

type Duplex = {
  write: (chunk: string) => Promise<void>;
  read: () => Promise<string>;
  startTls: () => Promise<Duplex>;
  close: () => Promise<void>;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Cloudflare Workers / workerd path. */
async function edgeSocket(host: string, port: number, secure: boolean): Promise<Duplex | null> {
  let connect: ((a: unknown, b?: unknown) => unknown) | null = null;
  try {
    const spec = "cloudflare" + ":sockets";
    const mod = (await import(/* @vite-ignore */ spec)) as { connect?: typeof connect };
    connect = mod.connect ?? null;
  } catch {
    return null;
  }
  if (!connect) return null;

  const wrap = (socket: {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    startTls?: () => unknown;
    close: () => Promise<void>;
  }): Duplex => {
    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    return {
      write: async (chunk) => writer.write(enc.encode(chunk)),
      read: async () => {
        const { value, done } = await reader.read();
        return done || !value ? "" : dec.decode(value);
      },
      startTls: async () => {
        reader.releaseLock();
        writer.releaseLock();
        return wrap(socket.startTls!() as never);
      },
      close: async () => {
        try {
          await socket.close();
        } catch {
          /* ignore */
        }
      },
    };
  };

  const socket = connect(
    { hostname: host, port },
    { secureTransport: secure ? "on" : "starttls", allowHalfOpen: false },
  ) as Parameters<typeof wrap>[0];
  return wrap(socket);
}

/** Node path (local dev / node runtimes). */
async function nodeSocket(host: string, port: number, secure: boolean): Promise<Duplex> {
  const net = await import("node:net");
  const tls = await import("node:tls");

  const wrap = (sock: import("node:net").Socket): Duplex => {
    const queue: string[] = [];
    let waiter: ((v: string) => void) | null = null;
    sock.on("data", (buf: Buffer) => {
      const text = buf.toString("utf8");
      if (waiter) {
        const w = waiter;
        waiter = null;
        w(text);
      } else queue.push(text);
    });
    return {
      write: (chunk) =>
        new Promise<void>((resolve, reject) => {
          sock.write(chunk, (err) => (err ? reject(err) : resolve()));
        }),
      read: () =>
        new Promise<string>((resolve) => {
          const next = queue.shift();
          if (next !== undefined) resolve(next);
          else waiter = resolve;
        }),
      startTls: async () =>
        new Promise<Duplex>((resolve, reject) => {
          const upgraded = tls.connect({ socket: sock, servername: host }, () =>
            resolve(wrap(upgraded as unknown as import("node:net").Socket)),
          );
          upgraded.on("error", reject);
        }),
      close: async () => sock.destroy(),
    };
  };

  return new Promise<Duplex>((resolve, reject) => {
    const sock = secure
      ? (tls.connect({ host, port, servername: host }, () =>
          resolve(wrap(sock as unknown as import("node:net").Socket)),
        ) as unknown as import("node:net").Socket)
      : net.connect({ host, port }, () => resolve(wrap(sock)));
    sock.on("error", reject);
  });
}

class Conn {
  private buffer = "";
  constructor(private duplex: Duplex) {}

  async expect(...codes: string[]): Promise<string> {
    for (;;) {
      const match = /(^|\n)(\d{3}) [^\n]*\r?\n$/.exec(this.buffer);
      if (match) {
        const line = this.buffer;
        this.buffer = "";
        if (!codes.includes(match[2]!)) throw new Error(`SMTP error: ${line.trim()}`);
        return line;
      }
      const chunk = await this.duplex.read();
      if (!chunk) throw new Error("SMTP connection closed unexpectedly");
      this.buffer += chunk;
    }
  }

  async send(command: string, ...codes: string[]): Promise<string> {
    await this.duplex.write(`${command}\r\n`);
    return this.expect(...codes);
  }

  async upgrade(): Promise<void> {
    this.duplex = await this.duplex.startTls();
    this.buffer = "";
  }

  close() {
    void this.duplex.close();
  }
}

function b64(value: string) {
  return btoa(unescape(encodeURIComponent(value)));
}

function headerEncode(value: string) {
  // RFC 2047 for non-ASCII header values.
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${b64(value)}?=`;
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendSmtpMail(cfg: SmtpConfig, message: MailMessage): Promise<void> {
  const host = (cfg.host ?? "").trim();
  const fromEmail = (cfg.from_email ?? cfg.username ?? "").trim();
  if (!host || !fromEmail) throw new Error("SMTP host and from address are required");
  const port = Number(cfg.port) || (cfg.secure ? 465 : 587);

  const duplex = (await edgeSocket(host, port, cfg.secure)) ?? (await nodeSocket(host, port, cfg.secure));
  const conn = new Conn(duplex);
  try {
    await conn.expect("220");
    let ehlo = await conn.send(`EHLO ${host}`, "250");

    if (!cfg.secure) {
      // Shared hosting almost always offers STARTTLS on 587/25 — use it when advertised.
      if (/STARTTLS/i.test(ehlo)) {
        await conn.send("STARTTLS", "220");
        await conn.upgrade();
        ehlo = await conn.send(`EHLO ${host}`, "250");
      }
    }

    if (cfg.username && cfg.password) {
      if (/AUTH[^\n]*PLAIN/i.test(ehlo)) {
        await conn.send(`AUTH PLAIN ${b64(`\0${cfg.username}\0${cfg.password}`)}`, "235");
      } else {
        await conn.send("AUTH LOGIN", "334");
        await conn.send(b64(cfg.username), "334");
        await conn.send(b64(cfg.password), "235");
      }
    }

    await conn.send(`MAIL FROM:<${fromEmail}>`, "250");
    await conn.send(`RCPT TO:<${message.to}>`, "250", "251");
    await conn.send("DATA", "354");

    const boundary = `kd_${Math.random().toString(36).slice(2)}`;
    const fromHeader = cfg.from_name
      ? `${headerEncode(cfg.from_name)} <${fromEmail}>`
      : fromEmail;
    const headers = [
      `From: ${fromHeader}`,
      `To: <${message.to}>`,
      cfg.reply_to ? `Reply-To: <${cfg.reply_to}>` : null,
      `Subject: ${headerEncode(message.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${boundary}@${fromEmail.split("@")[1]}>`,
      "MIME-Version: 1.0",
      message.html
        ? `Content-Type: multipart/alternative; boundary="${boundary}"`
        : 'Content-Type: text/plain; charset="UTF-8"',
    ].filter(Boolean);

    const body = message.html
      ? [
          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "",
          message.text,
          `--${boundary}`,
          'Content-Type: text/html; charset="UTF-8"',
          "",
          message.html,
          `--${boundary}--`,
        ].join("\r\n")
      : message.text;

    const payload = `${headers.join("\r\n")}\r\n\r\n${body}`
      .replace(/\r?\n/g, "\r\n")
      .replace(/\r\n\./g, "\r\n..");

    await conn.send(`${payload}\r\n.`, "250");
    await conn.send("QUIT", "221", "250");
  } finally {
    conn.close();
  }
}
