export interface AttachmentInfo {
  filename: string
  mimeType: string
  size: number
  attachmentId: string
}

export interface EmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  attachments: AttachmentInfo[]
  totalAttachmentCount: number
}

export interface EmailListResponse {
  emails: EmailMessage[]
  nextPageToken?: string
  error?: string
}
