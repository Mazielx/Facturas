export function setClientCookie(name: string, value: string, maxAge: number) {
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:"
  const parts = [`${name}=${value}`, "path=/", `max-age=${maxAge}`, "SameSite=Lax"]
  if (isSecure) parts.push("Secure")
  document.cookie = parts.join("; ")
}

export function deleteClientCookie(name: string) {
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:"
  const parts = [`${name}=`, "path=/", "max-age=0", "SameSite=Lax"]
  if (isSecure) parts.push("Secure")
  document.cookie = parts.join("; ")
}
