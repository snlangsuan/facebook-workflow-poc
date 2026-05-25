import { rtdb } from '#/common/libs/firebase.lib'
import { logger } from '#/common/libs/logger.lib'
import { interactionService } from '#/features/interactions/v1/interaction.service'

let queueListenerRef: ReturnType<typeof rtdb.ref> | null = null

export function startQueueWorker(): void {
  logger.info('Queue worker started')

  const ref = rtdb.ref('webhook_queue')
  queueListenerRef = ref

  ref
    .orderByChild('status')
    .equalTo('pending')
    .on('value', (snapshot) => {
      const val = snapshot.val() as Record<
        string,
        {
          status: string
          payload: {
            object?: string
            entry?: Array<{
              messaging?: Array<{
                sender?: { id: string }
                message?: { text: string }
              }>
              changes?: Array<{
                field: string
                value: {
                  item: string
                  verb: string
                  post_id?: string
                  message?: string
                  from?: { name: string }
                  photos?: string[]
                }
              }>
            }>
          }
          createdAt: string
        }
      > | null

      if (!val) {
        return
      }

      const entries = Object.entries(val).sort((a, b) => {
        const aTime = String(a[1].createdAt || '')
        const bTime = String(b[1].createdAt || '')
        return aTime.localeCompare(bTime)
      })

      for (const [key, value] of entries) {
        void (async () => {
          const taskRef = rtdb.ref(`webhook_queue/${key}`)
          try {
            const transactionResult = await taskRef.transaction((currentData) => {
              const data = currentData as { status?: string } | null
              if (data && data.status === 'pending') {
                data.status = 'processing'
                return data
              }
              return undefined
            })

            if (!transactionResult.committed) {
              return
            }

            const body = value.payload

            if (body.object === 'page' && body.entry) {
              for (const entry of body.entry) {
                if (entry.messaging) {
                  for (const msg of entry.messaging) {
                    if (msg.message?.text && msg.sender?.id) {
                      await interactionService.receiveCustomerMessage({
                        senderId: msg.sender.id,
                        senderName: `Customer ${msg.sender.id}`,
                        text: msg.message.text,
                      })
                    }
                  }
                } else if (entry.changes) {
                  for (const change of entry.changes) {
                    if (change.field === 'feed' && change.value) {
                      const valChange = change.value
                      if (valChange.item === 'comment' && valChange.verb === 'add' && valChange.message) {
                        await interactionService.receiveCustomerComment({
                          postId: valChange.post_id || 'post_1',
                          senderName: valChange.from?.name || 'Anonymous',
                          text: valChange.message,
                        })
                      } else if (valChange.item === 'post' && valChange.verb === 'add' && valChange.message) {
                        await interactionService.receiveCustomerPost({
                          content: valChange.message,
                          imageUrl: valChange.photos?.[0] || null,
                        })
                      }
                    }
                  }
                }
              }
            }

            await taskRef.remove()
          } catch (error) {
            const err = error as Error
            logger.error(err, 'Failed to process enqueued webhook event')
            try {
              await taskRef.update({ status: 'failed', error: err.message })
            } catch (updateErr) {
              logger.error(updateErr, 'Failed to write queue task failure status')
            }
          }
        })()
      }
    })
}

export function startScheduleWorker(): void {
  logger.info('Schedule worker started')
}

export function stopAllWorkers(): void {
  if (queueListenerRef) {
    queueListenerRef.off()
    queueListenerRef = null
  }
  logger.info('Stopping background workers')
}
