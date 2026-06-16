// Máscara e validação de telefone BR no formato (xx) xxxxx-xxxx
export function formatPhoneBR(input: string): string {
  const d = (input ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhoneBR(value: string): boolean {
  return /^\(\d{2}\) \d{5}-\d{4}$/.test(value ?? "");
}
