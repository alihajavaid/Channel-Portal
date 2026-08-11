import { Html, Head, Preview, Body, Container, Heading, Text } from "@react-email/components";

export function PasswordChangedEmail({ name, changedByAdmin }: { name: string; changedByAdmin: boolean }) {
  return (
    <Html>
      <Head />
      <Preview>Your Channel Portal password was changed</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "18px" }}>Hi {name},</Heading>
          <Text>
            {changedByAdmin
              ? "An administrator issued you new temporary credentials for Channel Portal."
              : "Your Channel Portal password was just changed."}
          </Text>
          <Text style={{ color: "#64748b", fontSize: "12px" }}>
            If you didn't expect this, contact your administrator immediately.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
