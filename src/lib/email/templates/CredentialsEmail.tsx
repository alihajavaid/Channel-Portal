import { Html, Head, Preview, Body, Container, Heading, Text, Button } from "@react-email/components";

export function CredentialsEmail({
  name,
  email,
  tempPassword,
  loginUrl,
  expiresInHours,
}: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
  expiresInHours: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your Channel Portal login credentials</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "18px" }}>Welcome to Channel Portal, {name}</Heading>
          <Text>An account has been created for you at {email}.</Text>
          <Text>
            Temporary password: <strong>{tempPassword}</strong>
          </Text>
          <Text>
            You will be required to set a new password and, if your account has admin access,
            set up two-factor authentication the first time you sign in. This temporary password
            expires in {expiresInHours} hours.
          </Text>
          <Button
            href={loginUrl}
            style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "10px 16px", borderRadius: "6px" }}
          >
            Sign in
          </Button>
          <Text style={{ color: "#64748b", fontSize: "12px", marginTop: "24px" }}>
            If you weren't expecting this, contact your administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
