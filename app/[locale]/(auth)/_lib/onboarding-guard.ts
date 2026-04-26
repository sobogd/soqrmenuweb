import { redirect } from "next/navigation";
import { getOnboardingData } from "./onboarding-data";

/** For login/otp: if authenticated (non-anonymous), redirect based on onboarding state */
export async function guardAuthPage() {
  const data = await getOnboardingData();
  if (data.isAuthenticated && !data.isAnonymous && data.companyId) {
    redirect(data.onboardingStep >= 3 ? "/dashboard" : "/onboarding");
  }
  return data;
}
