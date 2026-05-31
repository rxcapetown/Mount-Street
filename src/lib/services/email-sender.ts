export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<{ messageId: string }>;
}

export class FakeEmailSender implements EmailSender {
  private sent: Array<{ sentAt: string; msg: EmailMessage; messageId: string }> = [];

  async send(msg: EmailMessage): Promise<{ messageId: string }> {
    const messageId = `fake-${Date.now()}`;
    this.sent.push({ sentAt: new Date().toISOString(), msg, messageId });
    console.log(
      `[FakeEmailSender] ✉ To: ${msg.to} | Subject: "${msg.subject}"\n${msg.body}`
    );
    return { messageId };
  }

  getSent() {
    return [...this.sent];
  }
}
