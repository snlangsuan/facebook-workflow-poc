import { dbService } from '#/common/libs/db.lib'
import { rtdb } from '#/common/libs/firebase.lib'
import { logger } from '#/common/libs/logger.lib'
import { interactionService, WITHHELD_COMMENTER_NAME } from '#/features/interactions/v1/interaction.service'

interface IWebhookMessaging {
  sender?: { id: string }
  message?: { mid?: string; text?: string }
}

interface IWebhookChange {
  field: string
  value: {
    item: string
    verb: string
    post_id?: string
    comment_id?: string
    message?: string
    from?: { id?: string; name?: string }
    photos?: string[]
  }
}

interface IWebhookEntry {
  id?: string
  messaging?: IWebhookMessaging[]
  changes?: IWebhookChange[]
}

interface IWebhookBody {
  object?: string
  entry?: IWebhookEntry[]
}

interface IQueueTask {
  status: string
  payload: IWebhookBody
  createdAt: string
}

let queueListenerRef: ReturnType<typeof rtdb.ref> | null = null

async function handleMessaging(pageId: string | undefined, msg: IWebhookMessaging): Promise<void> {
  if (!msg.message?.text || !msg.sender?.id) {
    return
  }
  // Idempotency: skip messages already processed (Facebook may redeliver).
  const eventId = msg.message.mid || `msg:${msg.sender.id}:${msg.message.text}`
  if (!(await dbService.markEventProcessedOnce(eventId))) {
    logger.info({ eventId }, 'Skipping duplicate message event')
    return
  }
  logger.info({ senderId: msg.sender.id, mid: msg.message.mid }, '💬 [WORKER] processing message')
  await interactionService.receiveCustomerMessage({
    senderId: msg.sender.id,
    senderName: `Customer ${msg.sender.id}`,
    text: msg.message.text,
    pageId,
  })
}

async function handleChange(pageId: string | undefined, change: IWebhookChange): Promise<void> {
  if (change.field !== 'feed' || !change.value) {
    return
  }
  const value = change.value

  if (value.item === 'comment' && value.verb === 'add' && value.message) {
    const eventId = value.comment_id || `comment:${value.post_id}:${value.message}`
    if (!(await dbService.markEventProcessedOnce(eventId))) {
      logger.info({ eventId }, 'Skipping duplicate comment event')
      return
    }
    logger.info({ commentId: value.comment_id, postId: value.post_id }, '💬 [WORKER] processing comment')
    // Graph withholds `from` for commenters with no role on the app until Business Asset
    // User Profile Access is approved — flag it so the UI explains the missing name.
    await interactionService.receiveCustomerComment({
      postId: value.post_id || 'post_1',
      senderName: value.from?.name || WITHHELD_COMMENTER_NAME,
      text: value.message,
      commentId: value.comment_id,
      pageId,
      identityWithheld: !value.from?.name,
    })
    return
  }

  // Facebook publishes posts under several item types: status (text), photo, video, share, post.
  const POST_ITEMS = ['post', 'status', 'photo', 'video', 'share', 'link']
  if (POST_ITEMS.includes(value.item) && value.verb === 'add') {
    const eventId = value.post_id || `post:${value.message ?? ''}`
    if (!(await dbService.markEventProcessedOnce(eventId))) {
      logger.info({ eventId }, 'Skipping duplicate post event')
      return
    }
    await interactionService.receiveCustomerPost({
      content: value.message || '(Facebook post)',
      imageUrl: value.photos?.[0] || null,
      postId: value.post_id,
      pageId,
    })
  }
}

async function processWebhookBody(body: IWebhookBody): Promise<void> {
  if (body.object !== 'page' || !body.entry) {
    return
  }
  for (const entry of body.entry) {
    const pageId = entry.id
    for (const msg of entry.messaging ?? []) {
      await handleMessaging(pageId, msg)
    }
    for (const change of entry.changes ?? []) {
      await handleChange(pageId, change)
    }
  }
}

async function processTask(key: string, task: IQueueTask): Promise<void> {
  const taskRef = rtdb.ref(`webhook_queue/${key}`)
  try {
    // Atomically claim the task so concurrent workers don't double-process it.
    const claim = await taskRef.transaction((current) => {
      const data = current as { status?: string } | null
      if (data && data.status === 'pending') {
        data.status = 'processing'
        return data
      }
      return undefined
    })
    if (!claim.committed) {
      return
    }

    await processWebhookBody(task.payload)
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
}

export function startQueueWorker(): void {
  logger.info('Queue worker started')

  const ref = rtdb.ref('webhook_queue')
  queueListenerRef = ref

  ref
    .orderByChild('status')
    .equalTo('pending')
    .on('value', (snapshot) => {
      const val = snapshot.val() as Record<string, IQueueTask> | null
      if (!val) {
        return
      }

      const entries = Object.entries(val).sort((a, b) =>
        String(a[1].createdAt || '').localeCompare(String(b[1].createdAt || '')),
      )

      for (const [key, task] of entries) {
        void processTask(key, task)
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
