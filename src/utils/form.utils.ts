/** Read a trimmed string field from multipart / form posts. */
export function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Trimmed + lowercased email field. */
export function formEmail(formData: FormData, key: string): string {
  return formString(formData, key).toLowerCase();
}
