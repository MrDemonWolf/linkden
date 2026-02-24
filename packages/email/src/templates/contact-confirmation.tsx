import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface ContactConfirmationProps {
  name: string;
}

export function ContactConfirmation({ name }: ContactConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Thanks for reaching out, {name}!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>LinkDen</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={title}>
              Thanks for reaching out!
            </Heading>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
              We have received your message and appreciate you taking the time
              to get in touch. We will review your submission and get back to you
              as soon as possible.
            </Text>

            <Text style={paragraph}>
              If your inquiry is urgent, please do not hesitate to follow up
              directly. Otherwise, you can expect to hear from us shortly.
            </Text>

            <Hr style={divider} />

            <Text style={muted}>
              This is an automated confirmation. You do not need to reply to
              this email.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Sent via{" "}
              <Link href="https://linkden.io" style={footerLink}>
                LinkDen
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactConfirmation;

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const container: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px 0",
};

const header: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px 12px 0 0",
  padding: "32px 40px",
  textAlign: "center" as const,
};

const logo: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "-0.5px",
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px 40px",
};

const title: React.CSSProperties = {
  color: "#18181b",
  fontSize: "22px",
  fontWeight: "600",
  margin: "0 0 24px 0",
};

const paragraph: React.CSSProperties = {
  color: "#27272a",
  fontSize: "15px",
  lineHeight: "26px",
  margin: "0 0 16px 0",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "24px 0",
};

const muted: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

const footer: React.CSSProperties = {
  backgroundColor: "#fafafa",
  borderRadius: "0 0 12px 12px",
  borderTop: "1px solid #e4e4e7",
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

const footerLink: React.CSSProperties = {
  color: "#a1a1aa",
  textDecoration: "underline",
};
