import { expect, test, vi } from "vitest";
import type { MailAttachmentInfo, MailMessageDetail } from "./types";

// Forwarding used to silently drop every attachment (ComposeInitial never
// got attachmentFiles for "forward" mode) - a forward with a PDF or photo
// attached would send with that attachment just gone, with no warning.
// This pins that downloadForwardAttachments (exercised via
// buildReplyInitial in "forward" mode) actually fetches and includes them.

const downloadAttachment = vi.fn();
vi.mock("./api", () => ({ downloadAttachment: (...args: unknown[]) => downloadAttachment(...args) }));

function attachment(overrides: Partial<MailAttachmentInfo> = {}): MailAttachmentInfo {
  return {
    part: "2",
    filename: "report.pdf",
    content_type: "application/pdf",
    content_id: null,
    size: 1234,
    ...overrides,
  };
}

function detail(attachments: MailAttachmentInfo[]): MailMessageDetail {
  return {
    uid: 42,
    folder: "INBOX",
    message_id: "<orig@example.com>",
    in_reply_to: null,
    references: [],
    subject: "Quarterly report",
    sender: { name: "Rony", email: "rony@novarisesa.com" },
    recipients: [{ name: "Me", email: "me@novarisesa.com" }],
    received_at: "2026-10-07T10:00:00Z",
    flags: [],
    preview: "",
    size_bytes: 5000,
    has_attachments: attachments.length > 0,
    text_body: "See attached.",
    html_body: "<p>See attached.</p>",
    cc: [],
    attachments,
  };
}

test("forwarding a message with a regular attachment carries that attachment into the compose window", async () => {
  downloadAttachment.mockResolvedValue({ blob: new Blob(["pdf bytes"]), filename: "report.pdf" });
  const { buildReplyInitial } = await import("./compose-helpers");

  const initial = await buildReplyInitial(detail([attachment()]), "forward", "me@novarisesa.com");

  expect(downloadAttachment).toHaveBeenCalledWith("INBOX", 42, "2");
  expect(initial.attachmentFiles).toHaveLength(1);
  expect(initial.attachmentFiles?.[0].name).toBe("report.pdf");
  expect(initial.attachmentFiles?.[0].type).toBe("application/pdf");
});

test("forwarding never fetches inline/CID attachments as regular files (they're resolved into the quoted HTML instead)", async () => {
  downloadAttachment.mockClear();
  downloadAttachment.mockResolvedValue({ blob: new Blob(["logo bytes"]), filename: "logo.png" });
  const { buildReplyInitial } = await import("./compose-helpers");

  const initial = await buildReplyInitial(
    detail([attachment({ part: "2", content_id: "<logo123>", content_type: "image/png", filename: "logo.png" })]),
    "forward",
    "me@novarisesa.com",
  );

  expect(initial.attachmentFiles).toHaveLength(0);
});

test("a download failure for one attachment doesn't drop the others or fail the whole forward", async () => {
  downloadAttachment.mockReset();
  downloadAttachment.mockImplementation(async (_folder: string, _uid: number, part: string) => {
    if (part === "2") throw new Error("network error");
    return { blob: new Blob(["ok"]), filename: "ok.txt" };
  });
  const { buildReplyInitial } = await import("./compose-helpers");

  const initial = await buildReplyInitial(
    detail([attachment({ part: "2", filename: "broken.pdf" }), attachment({ part: "3", filename: "ok.txt", content_type: "text/plain" })]),
    "forward",
    "me@novarisesa.com",
  );

  expect(initial.attachmentFiles).toHaveLength(1);
  expect(initial.attachmentFiles?.[0].name).toBe("ok.txt");
});

test("reply and replyAll never download attachments at all", async () => {
  downloadAttachment.mockClear();
  const { buildReplyInitial } = await import("./compose-helpers");

  await buildReplyInitial(detail([attachment()]), "reply", "me@novarisesa.com");
  await buildReplyInitial(detail([attachment()]), "replyAll", "me@novarisesa.com");

  expect(downloadAttachment).not.toHaveBeenCalled();
});
