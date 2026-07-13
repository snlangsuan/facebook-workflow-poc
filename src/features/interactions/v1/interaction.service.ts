import { dbService } from '#/common/libs/db.lib'
import { geminiService } from '#/common/libs/gemini.lib'
import { logger } from '#/common/libs/logger.lib'
import { envVariables } from '#/factory'
import { interactionRepository } from '#/features/interactions/v1/interaction.repository'

import type { IConversation, IComment, IFbPageConnection, IMessage, IPost } from '#/common/libs/db.lib'
import type { IGeminiHistoryItem } from '#/common/libs/gemini.lib'
import type {
  TCustomerPostPayload,
  TCustomerMessagePayload,
  TCustomerCommentPayload,
  TMessageReplyPayload,
  TCommentReplyPayload,
  TLikeCommentPayload,
  TDeleteCommentPayload,
} from '#/features/interactions/v1/interaction.type'

const GRAPH = `https://graph.facebook.com/${envVariables.FACEBOOK_GRAPH_VERSION}`
const HISTORY_LIMIT = 10
// Page conversation import: threads fetched per Graph API request, and the max number of
// `paging.next` pages to follow (100 × 20 = up to 2000 threads) so imports aren't capped
// at the most recent few while still bounding runaway pagination.
const CONVERSATION_PAGE_LIMIT = 100
const MAX_CONVERSATION_PAGES = 20

interface IGraphThread {
  snippet?: string
  participants?: { data?: Array<{ id?: string; name?: string }> }
}

type TSseListener = (data: string) => void
const sseListeners: TSseListener[] = []

export const sseBroker = {
  subscribe(listener: TSseListener): () => void {
    sseListeners.push(listener)
    return () => {
      const idx = sseListeners.indexOf(listener)
      if (idx !== -1) {
        sseListeners.splice(idx, 1)
      }
    }
  },

  broadcast(event: string, data: object): void {
    const payload = JSON.stringify({ event, data })
    for (const listener of sseListeners) {
      listener(payload)
    }
  },
}

/**
 * Best-effort extraction of a Graph post id ({page-id}_{post-id}) from a Facebook
 * post URL or a raw id. Handles the common URL shapes; falls back to the raw input.
 */
function extractPostId(input: string, pageId: string): string {
  const value = input.trim()
  // Already a full Graph post id, e.g. 12345_67890
  if (/^\d+_\w+$/.test(value)) {
    return value
  }

  let candidate = value
  try {
    const u = new URL(value)
    const storyFbid = u.searchParams.get('story_fbid')
    const idParam = u.searchParams.get('id')
    if (storyFbid && idParam) {
      return `${idParam}_${storyFbid}`
    }
    if (storyFbid) {
      candidate = storyFbid
    } else {
      // /{page}/posts/{postId}, /{page}/videos/{id}, or trailing /{numericId}
      const m =
        u.pathname.match(/\/posts\/(\w+)/) || u.pathname.match(/\/videos\/(\w+)/) || u.pathname.match(/\/(\d+)\/?$/)
      if (m?.[1]) {
        candidate = m[1]
      }
    }
  } catch {
    // not a URL — treat the raw value as the candidate
  }

  // A bare numeric id is a status/post id without its page prefix. Reading it directly
  // triggers "(#12) singular statuses API is deprecated", so always qualify it.
  if (/^\d+$/.test(candidate)) {
    return `${pageId}_${candidate}`
  }
  return candidate
}

/**
 * Modern Facebook URLs use opaque `pfbid` tokens that can't be turned into a Graph
 * post id directly. Fetch the page's HTML (as a link crawler) and read the numeric
 * post id from the `og:url` meta tag, then qualify it with the page id.
 */
async function resolvePostIdFromHtml(url: string, conn: IFbPageConnection): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    })
    const html = await res.text()
    const ogUrl =
      html.match(/property="og:url"\s+content="([^"]+)"/i)?.[1] ?? html.match(/og:url[^>]*content="([^"]+)"/i)?.[1]
    if (!ogUrl) {
      return null
    }
    const base = ogUrl.split('?')[0] ?? ogUrl
    const numeric = base.replace(/\/+$/, '').match(/(\d{6,})$/)?.[1]
    return numeric ? `${conn.id}_${numeric}` : null
  } catch {
    return null
  }
}

/**
 * Facebook share links (/share/p/<code>) redirect to the canonical post URL.
 * Follow the redirect and return the final URL (handling a login wall by reading
 * the `next` param), so it can then be parsed like any other post URL.
 */
async function followShareUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
    let final = res.url || url
    try {
      const next = new URL(final).searchParams.get('next')
      if (next) {
        final = decodeURIComponent(next)
      }
    } catch {
      // final is not a parseable URL — keep as-is
    }
    return final
  } catch {
    return url
  }
}

/**
 * Resolve any Facebook post reference (full id, bare id, /posts/ URL, pfbid link,
 * or /share/p/ link) to a Graph post id that belongs to the connected page.
 */
async function resolveImportPostId(input: string, conn: IFbPageConnection): Promise<string> {
  let ref = input.trim()
  if (/facebook\.com\/share\//i.test(ref)) {
    ref = await followShareUrl(ref)
  }

  // pfbid links (incl. share links resolved above) can't be used directly —
  // scrape the numeric post id from the page's og:url meta tag.
  let postId: string
  if (/pfbid/i.test(ref)) {
    const resolved = await resolvePostIdFromHtml(ref, conn)
    if (!resolved) {
      throw new Error('Could not resolve this post link. Try the numeric post URL or the {pageId}_{postId} id.')
    }
    postId = resolved
  } else {
    postId = extractPostId(ref, conn.id)
  }

  // Ownership guard: a page post id is "{owningPageId}_{postId}".
  const ownerPrefix = postId.includes('_') ? postId.split('_')[0] : ''
  if (ownerPrefix && /^\d+$/.test(ownerPrefix) && ownerPrefix !== conn.id) {
    throw new Error('This post does not belong to the selected page.')
  }
  return postId
}

async function resolveConnection(pageId?: string): Promise<IFbPageConnection | undefined> {
  if (pageId) {
    const byPage = await dbService.getConnectionByPageId(pageId)
    if (byPage) {
      return byPage
    }
  }
  const conns = await dbService.getConnections()
  return conns[0]
}

function resolvePersona(conn?: IFbPageConnection): string {
  return conn?.systemInstruction?.trim() || envVariables.GEMINI_DEFAULT_PERSONA
}

function toHistory(messages: IMessage[]): IGeminiHistoryItem[] {
  return messages.slice(-HISTORY_LIMIT).map((m) => ({
    role: m.senderId === 'page' ? 'model' : 'user',
    text: m.text,
  }))
}

/**
 * Fetch a Messenger customer's public profile (display name + profile picture) from the
 * Graph API using the page access token. This relies on Business Asset User Profile Access,
 * which grants the app the name and profile photo of users who message the connected Page.
 * Returns an empty object on any failure so the inbox falls back to a generated avatar.
 */
async function fetchUserProfile(
  pageAccessToken: string,
  psid: string,
): Promise<{ name?: string; profilePic?: string; error?: string }> {
  // Log the exact endpoint (token redacted) so the profile fetch is visible in the server
  // logs / terminal — useful evidence when demoing this permission for App Review.
  logger.info(
    { endpoint: `${GRAPH}/${psid}?fields=name,profile_pic` },
    '🔎 [PROFILE] calling User Profile API (Business Asset User Profile Access)',
  )
  try {
    const res = await fetch(`${GRAPH}/${psid}?fields=name,profile_pic&access_token=${pageAccessToken}`)
    const data = (await res.json()) as {
      error?: { message?: string; code?: number; error_subcode?: number }
      name?: string
      profile_pic?: string
    }
    if (!res.ok || data.error) {
      // Surface the real Graph reason (message + subcode) so we can tell WHY a given PSID
      // won't resolve — e.g. subcode 33 = not visible to this Page token / not opted in.
      const reason = data.error?.message ?? `HTTP ${res.status}`
      const subcode = data.error?.error_subcode
      logger.warn(
        { psid, code: data.error?.code, subcode, reason },
        'Could not fetch customer profile (Business Asset User Profile Access)',
      )
      return { error: subcode ? `${reason} (subcode ${subcode})` : reason }
    }
    return { name: data.name, profilePic: data.profile_pic }
  } catch (error) {
    logger.warn({ err: error, psid }, 'Failed to fetch customer profile from Graph API')
    return { error: 'Failed to reach the Graph API' }
  }
}

async function sendMessengerReply(pageAccessToken: string, recipientId: string, text: string): Promise<void> {
  const res = await fetch(`${GRAPH}/me/messages?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })
  if (!res.ok) {
    const err = (await res.json()) as unknown as Record<string, unknown>
    throw new Error(`Messenger Send API error: ${JSON.stringify(err)}`)
  }
}

async function sendCommentReply(pageAccessToken: string, targetId: string, text: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${targetId}/comments?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  })
  if (!res.ok) {
    const err = (await res.json()) as unknown as Record<string, unknown>
    throw new Error(`Graph Comment API error: ${JSON.stringify(err)}`)
  }
}

interface IGraphComment {
  id: string
  from?: { id?: string; name?: string; picture?: { data?: { url?: string } } }
  message?: string
  parent?: { id?: string }
  created_time?: string
}

// Safety cap so a runaway loop can't page forever (100 pages x 100 = up to 10k comments).
const COMMENT_PAGE_CAP = 100

/**
 * Fetch ALL of a post's comments and replies from the Graph API (paginated, using
 * filter=stream which flattens replies with a `parent`), and merge any we don't already
 * have into the local post (deduped by comment id). Used by import and the Sync action.
 */
async function syncPostComments(postId: string, conn: IFbPageConnection): Promise<void> {
  const incoming: Array<{
    id: string
    senderName: string
    text: string
    timestamp?: string
    parentId?: string | null
    avatarUrl?: string
    fromId?: string
  }> = []

  let next: string | null =
    `${GRAPH}/${postId}/comments?filter=stream&` +
    `fields=id,from{name,id,picture{url}},message,created_time,parent&limit=100&access_token=${conn.accessToken}`

  for (let page = 0; next && page < COMMENT_PAGE_CAP; page++) {
    const res = await fetch(next)
    const data = (await res.json()) as {
      error?: { message?: string }
      data?: IGraphComment[]
      paging?: { next?: string }
    }
    if (!res.ok || data.error) {
      // Fail loudly only if we couldn't read anything at all.
      if (page === 0) {
        throw new Error(data.error?.message || 'Could not fetch comments from Facebook.')
      }
      break
    }

    for (const cm of data.data ?? []) {
      if (!cm.message) {
        continue
      }
      incoming.push({
        id: cm.id,
        senderName: cm.from?.name || 'User',
        text: cm.message,
        parentId: cm.parent?.id ?? null,
        avatarUrl: cm.from?.picture?.data?.url,
        fromId: cm.from?.id,
        timestamp: cm.created_time,
      })
    }
    next = data.paging?.next ?? null
  }

  // Merge in one write — updates existing comments' metadata (e.g. backfills fromId)
  // and inserts new ones, preserving local-only fields/comments.
  await dbService.mergeComments(postId, incoming)
}

/**
 * Seed a single Graph API conversation thread into the inbox (id = customer PSID). Returns the
 * existing conversation untouched if already present, or null when no customer participant is
 * found. Kept out of the import loop to keep that method's complexity in check.
 */
async function seedConversationFromThread(pageId: string, thread: IGraphThread): Promise<IConversation | null> {
  // participants includes the Page itself (id === pageId) and the customer(s).
  const customer = thread.participants?.data?.find((p) => p.id && p.id !== pageId)
  if (!customer?.id) {
    return null
  }
  // Skip if we already have this conversation so repeated imports don't stack messages.
  const existing = await interactionRepository.getConversation(customer.id)
  if (existing) {
    return existing
  }
  // Seed with a placeholder name (matches the webhook path) so the real name + photo resolved
  // later via Business Asset User Profile Access is a clear before/after.
  const conv = await interactionRepository.addMessage(
    customer.id,
    `Customer ${customer.id}`,
    customer.id,
    `Customer ${customer.id}`,
    thread.snippet || '(no message preview)',
    { pageId },
  )
  sseBroker.broadcast('conversation_updated', conv)
  return conv
}

/**
 * Seed one page of Graph API threads, isolating per-thread failures so a single bad thread
 * (e.g. a DB write hiccup) never aborts the whole import or discards already-seeded rows.
 * Returns the seeded conversations plus how many threads were skipped on error.
 */
async function seedThreadsPage(
  pageId: string,
  threads: IGraphThread[],
): Promise<{ conversations: IConversation[]; skipped: number }> {
  const conversations: IConversation[] = []
  let skipped = 0
  for (const thread of threads) {
    try {
      const conv = await seedConversationFromThread(pageId, thread)
      if (conv) {
        conversations.push(conv)
      }
    } catch (threadError) {
      skipped += 1
      const psid = thread.participants?.data?.find((p) => p.id && p.id !== pageId)?.id
      logger.warn({ err: threadError, psid }, '⚠️ [INBOX] skipped a conversation during import')
    }
  }
  return { conversations, skipped }
}

export const interactionService = {
  async listConversations(): Promise<IConversation[]> {
    return interactionRepository.listConversations()
  },

  async getConversation(id: string): Promise<IConversation | null> {
    return interactionRepository.getConversation(id)
  },

  /**
   * Clear inbox conversations. With a pageId only that page's conversations are removed;
   * without one the whole inbox is wiped. Broadcasts so open clients refresh their list.
   */
  async clearConversations(pageId?: string): Promise<{ cleared: number }> {
    let cleared = -1
    if (pageId) {
      cleared = await dbService.deleteConversationsByPageId(pageId)
    } else {
      await dbService.clearConversations()
    }
    logger.info({ pageId: pageId ?? 'all', cleared }, '🧹 [INBOX] conversations cleared')
    sseBroker.broadcast('conversations_cleared', { pageId })
    return { cleared }
  },

  /**
   * Manually re-resolve a conversation's customer profile (name + photo) from the Graph API
   * via Business Asset User Profile Access. The conversation id IS the customer's PSID, so we
   * fetch against it with the connected Page token. Drives the "Sync Profile" button in the
   * inbox — useful to demonstrate the permission on demand for App Review.
   */
  async syncConversationProfile(
    id: string,
  ): Promise<{ conversation: IConversation | null; profileFetched: boolean; error?: string }> {
    const conv = await interactionRepository.getConversation(id)
    if (!conv) {
      return { conversation: null, profileFetched: false, error: 'Conversation not found' }
    }
    const conn = await resolveConnection(conv.pageId)
    if (!conn?.accessToken) {
      return { conversation: conv, profileFetched: false, error: 'No connected Page token available' }
    }

    // conv.id === PSID of the customer who messaged the Page.
    const profile = await fetchUserProfile(conn.accessToken, conv.id)
    const profileFetched = Boolean(profile.name || profile.profilePic)
    if (!profileFetched) {
      // Pass the real Graph reason through so the UI shows WHY this PSID won't resolve
      // (privacy, PSID not visible to this Page token, not opted in, etc.).
      return {
        conversation: conv,
        profileFetched: false,
        error: profile.error ?? 'Graph API returned no profile for this customer',
      }
    }

    logger.info(
      { psid: conv.id, resolvedName: profile.name, hasPhoto: Boolean(profile.profilePic) },
      '👤 [PROFILE] resolved customer identity via Business Asset User Profile Access (manual sync)',
    )
    const updated =
      (await dbService.updateConversationProfile(conv.id, profile.name ?? conv.name, profile.profilePic, true)) ?? conv
    sseBroker.broadcast('conversation_updated', updated)
    return { conversation: updated, profileFetched: true }
  },

  /**
   * Pull existing Messenger threads for the connected Page straight from the Graph API
   * (`GET /{pageId}/conversations`) using the Page token — NO webhook required. Seeds each
   * thread's customer as a conversation (id = PSID) so it appears in the inbox and can then
   * be enriched with the real name + photo via the "Sync Profile" button. This lets the app
   * demonstrate Business Asset User Profile Access on any environment even when the webhook
   * callback URL is bound to production.
   */
  async importConversationsFromPage(
    pageId?: string,
  ): Promise<{ imported: number; skipped?: number; conversations: IConversation[]; error?: string }> {
    const conn = await resolveConnection(pageId)
    if (!conn?.accessToken) {
      return { imported: 0, conversations: [], error: 'No connected Page token available' }
    }

    // Fetch up to CONVERSATION_PAGE_LIMIT threads per request and follow `paging.next` so the
    // import isn't capped at the most recent few — a test user's thread can be far down the list.
    // MAX_CONVERSATION_PAGES bounds the total (100 × 20 = up to 2000 threads) to avoid runaway.
    let url: string | undefined =
      `${GRAPH}/${conn.id}/conversations?platform=messenger&fields=participants,snippet,updated_time&limit=${CONVERSATION_PAGE_LIMIT}&access_token=${conn.accessToken}`
    logger.info(
      { endpoint: `${GRAPH}/${conn.id}/conversations?fields=participants,snippet,updated_time` },
      '📥 [INBOX] importing Page conversations from Graph API',
    )

    try {
      const conversations: IConversation[] = []
      let pages = 0
      let skipped = 0
      while (url && pages < MAX_CONVERSATION_PAGES) {
        const res = await fetch(url)
        const data = (await res.json()) as {
          error?: { message?: string }
          data?: IGraphThread[]
          paging?: { next?: string }
        }
        if (!res.ok || data.error) {
          logger.warn(data.error ?? data, 'Could not import Page conversations')
          // Surface the error only if we haven't imported anything yet; otherwise keep partials.
          if (conversations.length === 0) {
            return { imported: 0, conversations: [], error: data.error?.message ?? 'Graph API error' }
          }
          break
        }

        const page = await seedThreadsPage(conn.id, data.data ?? [])
        conversations.push(...page.conversations)
        skipped += page.skipped

        url = data.paging?.next
        pages += 1
      }

      logger.info(
        { imported: conversations.length, skipped, pagesFetched: pages, pageId: conn.id },
        '📥 [INBOX] Page conversations imported',
      )
      return { imported: conversations.length, skipped, conversations }
    } catch (error) {
      logger.warn(error, 'Failed to import Page conversations from Graph API')
      return { imported: 0, conversations: [], error: 'Failed to reach Graph API' }
    }
  },

  /**
   * Flow 6: store the incoming message, then auto-generate a contextual Gemini reply
   * (persona + recent conversation history) and send it back via the Messenger Send API.
   * On any failure the conversation is flagged `failed` for manual admin takeover.
   */
  async receiveCustomerMessage(payload: TCustomerMessagePayload): Promise<IConversation> {
    const conn = await resolveConnection(payload.pageId)

    // Business Asset User Profile Access: resolve the customer's real name + profile photo
    // from their PSID so the inbox shows who is messaging instead of a raw id.
    let displayName = payload.senderName
    let avatar: string | undefined
    let profileFetched = false
    if (conn?.accessToken) {
      const profile = await fetchUserProfile(conn.accessToken, payload.senderId)
      if (profile.name) {
        displayName = profile.name
      }
      if (profile.profilePic) {
        avatar = profile.profilePic
      }
      profileFetched = Boolean(profile.name || profile.profilePic)
      if (profileFetched) {
        logger.info(
          { psid: payload.senderId, resolvedName: profile.name, hasPhoto: Boolean(profile.profilePic) },
          '👤 [PROFILE] resolved customer identity via Business Asset User Profile Access',
        )
      }
    }

    let conv = await interactionRepository.addMessage(
      payload.senderId,
      displayName,
      payload.senderId,
      displayName,
      payload.text,
      { pageId: payload.pageId },
    )
    // Persist the resolved identity + mark it as fetched (covers a conversation seeded
    // before we had a token, and drives the "profile fetched" badge in the inbox UI).
    if (profileFetched || displayName !== payload.senderName) {
      conv = (await dbService.updateConversationProfile(payload.senderId, displayName, avatar, profileFetched)) ?? conv
    }
    sseBroker.broadcast('conversation_updated', conv)

    // AI auto-reply can be turned off per page for the inbox.
    if (conn?.autoReplyInbox === false) {
      return conv
    }
    try {
      const previousMessages = conv.messages.slice(0, -1)
      const reply = await geminiService.generateReply({
        systemInstruction: resolvePersona(conn),
        history: toHistory(previousMessages),
        message: payload.text,
      })

      if (conn?.accessToken) {
        await sendMessengerReply(conn.accessToken, payload.senderId, reply)
      } else {
        logger.warn('No page connection/token available; storing Gemini reply without sending')
      }

      const updated = await interactionRepository.addMessage(
        payload.senderId,
        conv.name,
        'page',
        'AI Assistant',
        reply,
        { pageId: payload.pageId, status: 'sent' },
      )
      await dbService.setConversationAutoStatus(payload.senderId, 'ok')
      sseBroker.broadcast('conversation_updated', { ...updated, autoReplyStatus: 'ok' })
      return updated
    } catch (error) {
      const err = error as Error
      logger.error(err, 'Auto-reply (message) failed; flagging for manual takeover')
      const failed = await dbService.setConversationAutoStatus(payload.senderId, 'failed', err.message)
      sseBroker.broadcast('conversation_updated', failed ?? conv)
      return failed ?? conv
    }
  },

  async replyToMessage(payload: TMessageReplyPayload): Promise<IConversation | null> {
    const conv = await interactionRepository.getConversation(payload.conversationId)
    if (!conv) {
      return null
    }

    const conn = await resolveConnection(conv.pageId)
    if (conn?.accessToken) {
      try {
        await sendMessengerReply(conn.accessToken, payload.conversationId, payload.text)
      } catch (error) {
        logger.error(error, 'Manual Messenger reply failed')
      }
    }

    const updated = await interactionRepository.addMessage(
      payload.conversationId,
      conv.name,
      'page',
      'Page Admin',
      payload.text,
      { pageId: conv.pageId, status: 'sent' },
    )
    // Admin has taken over, clear the failed flag.
    await dbService.setConversationAutoStatus(payload.conversationId, 'ok')
    sseBroker.broadcast('conversation_updated', { ...updated, autoReplyStatus: 'ok' })
    return updated
  },

  async listPosts(): Promise<IPost[]> {
    return interactionRepository.listPosts()
  },

  async getPost(id: string): Promise<IPost | null> {
    return interactionRepository.getPost(id)
  },

  async deletePost(id: string): Promise<void> {
    await interactionRepository.deletePost(id)
    sseBroker.broadcast('posts_updated', { id, deleted: true })
  },

  /**
   * Import a post by Facebook URL (or post id) using the Graph API: fetches the post
   * content and its comments, then stores them locally (deduped). Lets admins pull a
   * specific post into the system without waiting for webhooks.
   */
  async importPost(input: string, pageId?: string): Promise<IPost> {
    const conn = await resolveConnection(pageId)
    if (!conn?.accessToken) {
      throw new Error('No connected page with a valid access token')
    }

    const postId = await resolveImportPostId(input, conn)

    // Fetch post metadata (for ownership check + content).
    const res = await fetch(
      `${GRAPH}/${postId}?fields=from,message,full_picture,created_time&access_token=${conn.accessToken}`,
    )
    const data = (await res.json()) as {
      error?: { message?: string }
      from?: { id?: string; name?: string }
      message?: string
      full_picture?: string
    }
    if (!res.ok || data.error) {
      logger.error(data.error ?? data, 'Failed to import post from Graph API')
      throw new Error(data.error?.message || 'Could not fetch this post. Check the URL/permissions.')
    }

    // Authoritative check: the post's author (`from`) must be the connected page.
    if (data.from?.id && data.from.id !== conn.id) {
      throw new Error('This post does not belong to the selected page.')
    }

    // Upsert the post, then sync its comments + replies.
    const existing = await interactionRepository.getPost(postId)
    if (!existing) {
      await interactionRepository.addPost({
        content: data.message || '(no text)',
        imageUrl: data.full_picture || null,
        postId,
        pageId: conn.id,
      })
    }
    await syncPostComments(postId, conn)

    const updated = (await interactionRepository.getPost(postId)) as IPost
    sseBroker.broadcast('posts_updated', updated)
    sseBroker.broadcast('post_updated', updated)
    return updated
  },

  /**
   * Re-sync an already-imported post: pull the latest comments and replies from
   * Facebook and merge new ones in. Returns null if the post isn't in the system.
   */
  async syncPost(id: string): Promise<IPost | null> {
    const post = await interactionRepository.getPost(id)
    if (!post) {
      return null
    }
    const conn = await resolveConnection(post.pageId)
    if (!conn?.accessToken) {
      throw new Error('No connected page with a valid access token')
    }
    await syncPostComments(id, conn)

    const updated = (await interactionRepository.getPost(id)) as IPost
    sseBroker.broadcast('post_updated', updated)
    sseBroker.broadcast('posts_updated', updated)
    return updated
  },

  async receiveCustomerPost(payload: TCustomerPostPayload): Promise<IPost> {
    // Avoid overwriting a post (and its comments) that was already seeded — e.g. when a
    // comment webhook arrived before the post-creation webhook.
    if (payload.postId) {
      const existing = await interactionRepository.getPost(payload.postId)
      if (existing) {
        return existing
      }
    }
    const post = await interactionRepository.addPost(payload)
    sseBroker.broadcast('posts_updated', post)
    return post
  },

  /**
   * Ensure the post that a comment belongs to exists locally. If the post-creation
   * webhook was never captured (Facebook may send `item: status` etc.), fetch the post
   * from the Graph API and seed it so the comment can attach. Falls back to a placeholder.
   */
  async ensurePostExists(postId: string, pageId?: string): Promise<IPost> {
    const existing = await interactionRepository.getPost(postId)
    if (existing) {
      return existing
    }

    const conn = await resolveConnection(pageId)
    let content = '(Facebook post)'
    let imageUrl: string | null = null
    if (conn?.accessToken) {
      try {
        const res = await fetch(`${GRAPH}/${postId}?fields=message,full_picture&access_token=${conn.accessToken}`)
        if (res.ok) {
          const data = (await res.json()) as { message?: string; full_picture?: string }
          content = data.message || content
          imageUrl = data.full_picture || null
        }
      } catch (error) {
        logger.error(error, 'Failed to fetch post details from Graph API')
      }
    }

    const post = await interactionRepository.addPost({ content, imageUrl, postId, pageId })
    sseBroker.broadcast('posts_updated', post)
    return post
  },

  /**
   * Flow 5: store the incoming comment, then auto-generate a Gemini reply and post it
   * back to the originating comment via the Graph API. Failures flag the post `failed`.
   */
  async receiveCustomerComment(payload: TCustomerCommentPayload): Promise<IComment | null> {
    // Self-heal: make sure the post exists before attaching the comment.
    await interactionService.ensurePostExists(payload.postId, payload.pageId)

    const comment = await interactionRepository.addComment(payload)
    if (!comment) {
      return null
    }

    const post = await interactionRepository.getPost(payload.postId)
    if (post) {
      sseBroker.broadcast('post_updated', post)
    }

    const conn = await resolveConnection(post?.pageId)
    // AI auto-reply can be turned off per page for comments.
    if (conn?.autoReplyComment === false) {
      return comment
    }
    try {
      const reply = await geminiService.generateReply({
        systemInstruction: resolvePersona(conn),
        message: payload.text,
      })

      if (conn?.accessToken) {
        // Reply to the specific comment when its id is known, else to the post.
        await sendCommentReply(conn.accessToken, payload.commentId || payload.postId, reply)
      } else {
        logger.warn('No page connection/token available; storing Gemini comment reply without sending')
      }

      await dbService.addComment(payload.postId, 'AI Assistant', reply, {
        parentId: payload.commentId ?? null,
        status: 'sent',
      })
      const okPost = await dbService.setPostAutoStatus(payload.postId, 'ok')
      if (okPost) {
        sseBroker.broadcast('post_updated', okPost)
      }
      return comment
    } catch (error) {
      const err = error as Error
      logger.error(err, 'Auto-reply (comment) failed; flagging for manual takeover')
      const failedPost = await dbService.setPostAutoStatus(payload.postId, 'failed', err.message)
      if (failedPost) {
        sseBroker.broadcast('post_updated', failedPost)
      }
      return comment
    }
  },

  /**
   * Hide/unhide a comment via the Graph API (is_hidden). A hidden comment is invisible
   * to the public but still visible to the Page admin. Also updates the local copy.
   */
  async hideComment(postId: string, commentId: string, hidden: boolean): Promise<IPost | null> {
    const post = await interactionRepository.getPost(postId)
    const conn = await resolveConnection(post?.pageId)
    if (conn?.accessToken) {
      const res = await fetch(`${GRAPH}/${commentId}?is_hidden=${hidden}&access_token=${conn.accessToken}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        logger.error(err, 'Failed to toggle comment visibility')
        // Facebook does not allow hiding the page's own comments, etc. — surface the reason.
        throw new Error(err.error?.message || `Could not ${hidden ? 'hide' : 'unhide'} the comment on Facebook.`)
      }
    }
    const updated = await dbService.setCommentHidden(postId, commentId, hidden)
    if (updated) {
      sseBroker.broadcast('post_updated', updated)
    }
    return updated ?? null
  },

  /**
   * Like/unlike a comment on behalf of the Page via the Graph API (POST/DELETE on the
   * comment's `likes` edge). Requires `pages_manage_engagement`. Also mirrors the state
   * on the local copy so the dashboard reflects the page's reaction.
   */
  async likeComment(payload: TLikeCommentPayload): Promise<IPost | null> {
    const { postId, commentId, liked } = payload
    const post = await interactionRepository.getPost(postId)
    const conn = await resolveConnection(post?.pageId)
    if (conn?.accessToken) {
      const res = await fetch(`${GRAPH}/${commentId}/likes?access_token=${conn.accessToken}`, {
        method: liked ? 'POST' : 'DELETE',
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        logger.error(err, 'Failed to toggle comment like')
        throw new Error(err.error?.message || `Could not ${liked ? 'like' : 'unlike'} the comment on Facebook.`)
      }
    }
    const updated = await dbService.setCommentLiked(postId, commentId, liked)
    if (updated) {
      sseBroker.broadcast('post_updated', updated)
    }
    return updated ?? null
  },

  /**
   * Delete a comment on the Page's post via the Graph API (DELETE on the comment node).
   * Requires `pages_manage_engagement`. Facebook removes the comment's replies too, so
   * the local copy drops the comment and any replies threaded under it.
   */
  async deleteComment(payload: TDeleteCommentPayload): Promise<IPost | null> {
    const { postId, commentId } = payload
    const post = await interactionRepository.getPost(postId)
    const conn = await resolveConnection(post?.pageId)
    // Only real Facebook comments ({page}_{id} style) exist on Graph; local-only page
    // replies are just removed from the dashboard.
    if (conn?.accessToken && commentId.includes('_')) {
      const res = await fetch(`${GRAPH}/${commentId}?access_token=${conn.accessToken}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        logger.error(err, 'Failed to delete comment')
        throw new Error(err.error?.message || 'Could not delete the comment on Facebook.')
      }
    }
    const updated = await dbService.deleteComment(postId, commentId)
    if (updated) {
      sseBroker.broadcast('post_updated', updated)
    }
    return updated ?? null
  },

  async replyToComment(payload: TCommentReplyPayload): Promise<IComment | null> {
    const post = await interactionRepository.getPost(payload.postId)
    const conn = await resolveConnection(post?.pageId)
    // Reply to a specific comment when commentId is given, else comment on the post.
    const target = payload.commentId || payload.postId
    if (conn?.accessToken) {
      try {
        await sendCommentReply(conn.accessToken, target, payload.text)
      } catch (error) {
        logger.error(error, 'Manual comment reply failed')
      }
    }

    const comment = await dbService.addComment(payload.postId, 'Page Admin', payload.text, {
      status: 'sent',
      parentId: payload.commentId ?? null,
    })
    if (!comment) {
      return null
    }

    await dbService.setPostAutoStatus(payload.postId, 'ok')
    const updatedPost = await interactionRepository.getPost(payload.postId)
    if (updatedPost) {
      sseBroker.broadcast('post_updated', updatedPost)
    }
    return comment
  },
}
