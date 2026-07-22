const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.com.mx", "yahoo.com.ar", "yahoo.com.br", "yahoo.co.uk",
  "hotmail.com", "hotmail.com.mx", "hotmail.com.ar", "hotmail.com.br",
  "outlook.com", "outlook.com.mx", "live.com", "live.com.mx", "msn.com",
  "aol.com", "aol.co.uk",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me",
  "zoho.com", "zohomail.com",
  "yandex.com", "yandex.ru",
  "mail.com", "email.com",
  "gmx.com", "gmx.de",
  "fastmail.com",
  "tutanota.com", "tutamail.com",
  "163.com", "126.com", "qq.com",
  "naver.com", "daum.net",
  "rediffmail.com",
  "terra.com.br", "uol.com.br", "bol.com.br",
  "libero.it", "virgilio.it", "tiscali.it",
  "web.de", "freenet.de", "t-online.de",
  "orange.fr", "wanadoo.fr", "free.fr",
  "inbox.com", "mail.ru",
])

export function isEmailInstitucional(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return false
  return !PERSONAL_DOMAINS.has(domain)
}

export function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || ""
}

export function getMaxEmailCuentas(plan: string): number {
  switch (plan) {
    case "basico": return 1
    case "multi correo": return 4
    default: return 1
  }
}
