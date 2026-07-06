import { dbService } from '#/common/libs/db.lib'

import type { ITiktokConnection } from '#/common/libs/db.lib'
import type { TTiktokConnectionResponse } from '#/features/tiktok/v1/tiktok.type'

function toResponse(conn: ITiktokConnection): TTiktokConnectionResponse {
  return {
    openId: conn.openId,
    displayName: conn.displayName,
    avatarUrl: conn.avatarUrl,
    scope: conn.scope,
  }
}

export const tiktokRepository = {
  async get(openId: string): Promise<TTiktokConnectionResponse | undefined> {
    const conn = await dbService.getTiktokConnection(openId)
    return conn ? toResponse(conn) : undefined
  },

  async save(connection: ITiktokConnection): Promise<TTiktokConnectionResponse> {
    await dbService.saveTiktokConnection(connection)
    return toResponse(connection)
  },

  async delete(openId: string): Promise<void> {
    await dbService.deleteTiktokConnection(openId)
  },
}
