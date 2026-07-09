import { google } from "googleapis"
import type { OAuth2Client } from "google-auth-library"
import type { EmailMessage, AttachmentInfo } from "./types"

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
]

export function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)
  return tokens
}

export function getOAuth2ClientWithTokens(tokens: {
  access_token?: string
  refresh_token?: string
  expiry_date?: number
}): OAuth2Client {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials(tokens)
  return oauth2Client
}

export function isPdfOrXmlAttachment(mimeType: string, filename: string): boolean {
  const lowerMime = mimeType.toLowerCase()
  const lowerName = filename.toLowerCase()
  return (
    lowerMime === "application/pdf" ||
    lowerName.endsWith(".pdf") ||
    lowerMime === "text/xml" ||
    lowerMime === "application/xml" ||
    lowerName.endsWith(".xml")
  )
}

export async function listEmailsWithAttachments(
  auth: OAuth2Client,
  maxResults = 20
): Promise<{ emails: EmailMessage[]; nextPageToken?: string }> {
  const gmail = google.gmail({ version: "v1", auth })

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  })

  const messages = listResponse.data.messages || []
  const nextPageToken = listResponse.data.nextPageToken ?? undefined

  const emails: EmailMessage[] = []

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
    })

    const payload = detail.data.payload
    const headers = payload?.headers || []

    const subject = headers.find((h) => h.name === "Subject")?.value || "(Sin asunto)"
    const from = headers.find((h) => h.name === "From")?.value || "(Desconocido)"
    const date = headers.find((h) => h.name === "Date")?.value || ""

    const attachments: AttachmentInfo[] = []
    const collectAttachments = (parts: any[] | undefined) => {
      if (!parts) return
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          if (isPdfOrXmlAttachment(part.mimeType, part.filename)) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: Number(part.size) || 0,
              attachmentId: part.body.attachmentId,
            })
          }
        }
        if (part.parts) {
          collectAttachments(part.parts)
        }
      }
    }

    collectAttachments(payload?.parts)
    if (payload?.mimeType === "message/rfc822" && payload?.parts) {
      for (const part of payload.parts) {
        if (part.parts) collectAttachments(part.parts)
      }
    }

    if (attachments.length > 0) {
      emails.push({
        id: msg.id!,
        threadId: detail.data.threadId || "",
        subject,
        from,
        date,
        snippet: detail.data.snippet || "",
        attachments,
      })
    }
  }

  return { emails, nextPageToken }
}
