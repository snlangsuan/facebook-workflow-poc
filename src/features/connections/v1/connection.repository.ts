import { dbService } from '#/common/libs/db.lib'

import type { TConnectionCreatePayload, TConnectionResponse } from '#/features/connections/v1/connection.type'

export const connectionRepository = {
  async getByUserId(userId: string): Promise<TConnectionResponse | null> {
    const conn = await dbService.getConnectionByUserId(userId)
    if (!conn) {
      return null
    }
    return {
      id: conn.id,
      name: conn.name,
      accessToken: conn.accessToken,
      userId: conn.userId,
    }
  },

  async save(payload: TConnectionCreatePayload): Promise<TConnectionResponse> {
    const conn = {
      id: payload.pageId,
      name: payload.pageName,
      accessToken: payload.accessToken,
      userId: payload.userId,
    }
    await dbService.saveConnection(conn)
    return conn
  },

  async delete(userId: string): Promise<void> {
    await dbService.deleteConnection(userId)
  },
}
