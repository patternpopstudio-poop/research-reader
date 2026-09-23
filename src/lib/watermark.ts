export function formatLicenseWatermark(input: {
  email: string;
  accessId: string | null;
  companyName: string | null | undefined;
}) {
  const company = input.companyName?.trim() || "Dr. Prathiba Reddy";
  const access = input.accessId ? ` · Access ID: ${input.accessId}` : "";
  return `Licensed to: ${input.email}${access} · © ${company}`;
}
