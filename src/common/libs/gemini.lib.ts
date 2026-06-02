import { GoogleGenAI } from '@google/genai'

import { envVariables } from '#/factory'

export interface IGeminiHistoryItem {
  role: 'user' | 'model'
  text: string
}

export interface IGeminiReplyParams {
  systemInstruction: string
  message: string
  history?: IGeminiHistoryItem[]
}

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (client) {
    return client
  }

  if (envVariables.GEMINI_API_KEY) {
    // Gemini Developer API (simple API-key auth).
    client = new GoogleGenAI({ apiKey: envVariables.GEMINI_API_KEY })
  } else {
    // Vertex AI using the same service-account credentials already configured for Firebase Admin.
    client = new GoogleGenAI({
      vertexai: true,
      project: envVariables.GOOGLE_PROJECT_ID,
      location: envVariables.GOOGLE_LOCATION,
      googleAuthOptions: {
        credentials: {
          client_email: envVariables.GOOGLE_AUTH_CLIENT_EMAIL,
          private_key: envVariables.GOOGLE_AUTH_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      },
    })
  }

  return client
}

export const geminiService = {
  /**
   * Generate a customer-support reply using Gemini.
   * Throws on safety blocks / API errors so the caller can mark the interaction as `failed`.
   */
  async generateReply(params: IGeminiReplyParams): Promise<string> {
    const ai = getClient()

    const contents = [
      ...(params.history ?? []).map((item) => ({
        role: item.role,
        parts: [{ text: item.text }],
      })),
      { role: 'user' as const, parts: [{ text: params.message }] },
    ]

    const response = await ai.models.generateContent({
      model: envVariables.GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    })

    const text = response.text?.trim()
    if (!text) {
      // Empty output usually means a safety block or recitation stop.
      throw new Error('Gemini returned an empty response (possible safety block)')
    }
    return text
  },
}
