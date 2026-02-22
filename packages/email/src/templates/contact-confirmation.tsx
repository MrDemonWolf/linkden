import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Section,
  Heading,
} from "@react-email/components";
import * as React from "react";

interface ContactConfirmationProps {
  name: string;
  ownerName: string;
}

export function ContactConfirmation({
  name,
  ownerName,
}: ContactConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Message Received</Heading>
          <Hr style={hr} />
          <Section>
            <Text style={text}>Hi {name},</Text>
            <Text style={text}>
              Thank you for reaching out! Your message has been received and{" "}
              {ownerName} will get back to you as soon as possible.
            </Text>
            <Text style={text}>
              This is an automated confirmation. Please do not reply to this
              email.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Sent on behalf of {ownerName}
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
const text = { fontSize: "14px", color: "#1a1a1a", lineHeight: "1.6" };
const footer = { fontSize: "12px", color: "#6b7280", textAlign: "center" as const };

export default ContactConfirmation;
