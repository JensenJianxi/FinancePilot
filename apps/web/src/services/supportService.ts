export interface SupportRequest {
  email: string;
  message: string;
  name: string;
  subject: string;
}

export type SupportDelivery = "email-client" | "service";

const SUPPORT_EMAIL = "jianxi38@gmail.com";

export async function submitSupportRequest(input: SupportRequest): Promise<SupportDelivery> {
  const endpoint = import.meta.env.VITE_SUPPORT_FORM_ENDPOINT?.trim();

  if (endpoint) {
    const response = await fetch(endpoint, {
      body: JSON.stringify({ ...input, recipient: SUPPORT_EMAIL }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("FinancePilot could not send your support request. Please try again.");
    }

    return "service";
  }

  if (typeof window === "undefined") {
    throw new Error("An email application is not available on this device.");
  }

  const subject = encodeURIComponent(`[FinancePilot Support] ${input.subject}`);
  const body = encodeURIComponent(
    `Name: ${input.name}\nEmail: ${input.email}\n\n${input.message}`
  );

  window.location.assign(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  return "email-client";
}
