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

export interface ContactNotificationProps {
  name: string;
  email: string;
  message: string;
  subject?: string;
  phone?: string;
  company?: string;
}

export function ContactNotification({
  name,
  email,
  message,
  subject,
  phone,
  company,
}: ContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>New contact form submission from {name}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>LinkDen</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={title}>
              New Contact Form Submission
            </Heading>
            <Text style={paragraph}>
              You received a new message through your contact form.
            </Text>

            <Hr style={divider} />

            <Section style={detailsSection}>
              <Text style={label}>Name</Text>
              <Text style={value}>{name}</Text>

              <Text style={label}>Email</Text>
              <Text style={value}>
                <Link href={`mailto:${email}`} style={link}>
                  {email}
                </Link>
              </Text>

              {subject && (
                <>
                  <Text style={label}>Subject</Text>
                  <Text style={value}>{subject}</Text>
                </>
              )}

              {phone && (
                <>
                  <Text style={label}>Phone</Text>
                  <Text style={value}>{phone}</Text>
                </>
              )}

              {company && (
                <>
                  <Text style={label}>Company</Text>
                  <Text style={value}>{company}</Text>
                </>
              )}
            </Section>

            <Hr style={divider} />

            <Text style={label}>Message</Text>
            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by your{" "}
              <Link href="https://linkden.io" style={footerLink}>
                LinkDen
              </Link>{" "}
              contact form.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactNotification;

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
  margin: "0 0 8px 0",
};

const paragraph: React.CSSProperties = {
  color: "#52525b",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "24px 0",
};

const detailsSection: React.CSSProperties = {
  padding: "0",
};

const label: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const value: React.CSSProperties = {
  color: "#18181b",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 16px 0",
};

const link: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
};

const messageBox: React.CSSProperties = {
  backgroundColor: "#fafafa",
  borderRadius: "8px",
  border: "1px solid #e4e4e7",
  padding: "16px 20px",
};

const messageText: React.CSSProperties = {
  color: "#27272a",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
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
