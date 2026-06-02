import { dbService } from '#/common/libs/db.lib'

import type { IFbPageConnection } from '#/common/libs/db.lib'
import type { TConnectionCreatePayload, TConnectionResponse } from '#/features/connections/v1/connection.type'

function toResponse(conn: IFbPageConnection): TConnectionResponse {
  return {
    id: conn.id,
    name: conn.name,
    accessToken: conn.accessToken,
    userId: conn.userId,
    systemInstruction: conn.systemInstruction,
    subscribed: conn.subscribed,
    autoReplyInbox: conn.autoReplyInbox,
    autoReplyComment: conn.autoReplyComment,
  }
}

export const connectionRepository = {
  async listByUserId(userId: string): Promise<TConnectionResponse[]> {
    const conns = await dbService.getConnectionsByUserId(userId)
    return conns.map(toResponse)
  },

  async save(payload: TConnectionCreatePayload): Promise<TConnectionResponse> {
    const conn: IFbPageConnection = {
      id: payload.pageId,
      name: payload.pageName,
      accessToken: payload.accessToken,
      userId: payload.userId,
    }
    await dbService.saveConnection(conn)
    return toResponse(conn)
  },

  async setSubscribed(userId: string, pageId: string, subscribed: boolean): Promise<void> {
    await dbService.setSubscribed(userId, pageId, subscribed)
  },

  async setSystemInstruction(userId: string, pageId: string, instruction: string): Promise<void> {
    await dbService.setSystemInstruction(userId, pageId, instruction)
  },

  async setAutoReplySettings(
    userId: string,
    pageId: string,
    settings: { autoReplyInbox?: boolean; autoReplyComment?: boolean },
  ): Promise<void> {
    await dbService.setAutoReplySettings(userId, pageId, settings)
  },

  async delete(userId: string, pageId?: string): Promise<void> {
    await dbService.deleteConnection(userId, pageId)
  },
}
