import { guardAuthPage } from "../_lib/onboarding-guard";
import { AuthPage } from "../_components/auth-page";

export default async function Page() {
  await guardAuthPage();
  return <AuthPage />;
}
