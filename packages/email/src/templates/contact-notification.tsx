import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Hr,
  Section,
  Heading,
} from "@react-email/components";
import * as React from "react";

interface ContactNotificationProps {
  name: string;
  email: string;
  message: string;
  timestamp: string;
  adminUrl: string;
}

export function ContactNotification({
  name,
  email,
  message,
  timestamp,
  adminUrl,
}: ContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>New Contact Form Submission</Heading>
          <Hr style={hr} />
          <Section>
            <Text style={label}>Name</Text>
            <Text style={value}>{name}</Text>
            <Text style={label}>Email</Text>
            <Text style={value}>
              <Link href={`mailto:${email}`}>{email}</Link>
            </Text>
            <Text style={label}>Message</Text>
            <Text style={messageStyle}>{message}</Text>
            <Text style={label}>Received</Text>
            <Text style={value}>{timestamp}</Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            <Link href={adminUrl}>View in Admin Panel</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "20px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  margin: "0 0 16px",
};

const hr = { borderColor: "#e6ebf1", margin: "20px 0" };

const label = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#6b7280",
  textTransform: "uppercase" as const,
  margin: "16px 0 4px",
};

const value = { fontSize: "14px", color: "#1a1a1a", margin: "0 0 8px" };

const messageStyle = {
  fontSize: "14px",
  color: "#1a1a1a",
  backgroundColor: "#f9fafb",
  padding: "12px",
  borderRadius: "4px",
  whiteSpace: "pre-wrap" as const,
  margin: "0 0 8px",
};

const footer = { fontSize: "12px", color: "#6b7280", textAlign: "center" as const };

export default ContactNotification;
