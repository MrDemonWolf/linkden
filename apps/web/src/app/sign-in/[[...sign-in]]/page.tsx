import SignInClient from "./client";

export function generateStaticParams() {
  return [{ "sign-in": [] }];
}

export default function SignInPage() {
  return <SignInClient />;
}
