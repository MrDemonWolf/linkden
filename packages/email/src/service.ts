export interface EmailService {
  send(options: { to: string; subject: string; html: string }): Promise<void>;
}

export function createResendEmailService(
  apiKey: string,
  from: string,
): EmailService {
  return {
    async send({ to, subject, html }) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }
    },
  };
}
