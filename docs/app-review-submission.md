# App Review Submission Pack — omni-channel (studio.jts.co.th/demo)

ทุกข้อความในไฟล์นี้ **copy-paste ลงฟอร์ม App Review ได้ทันที** (ภาษาอังกฤษ ตามที่ Meta ต้องการ)
อ้างอิง allowed usage ตรงตัวจาก [Permissions Reference](https://developers.facebook.com/docs/permissions) และ [Features Reference](https://developers.facebook.com/docs/features-reference/business-asset-user-profile-access/) (ดึงสด 2026-07-14)

---

## 0) ข้อมูลกลางที่ต้องกรอกก่อน (App Settings)

| ช่อง | ค่าที่ใช้ |
| --- | --- |
| App name | omni-channel |
| Platform / Website URL | `https://studio.jts.co.th/demo/` |
| Privacy Policy URL | `https://studio.jts.co.th/demo/privacy.html` *(ตรวจว่า live ก่อน submit)* |
| Category | Business |
| Test credentials | **ต้องกรอก** — แอพมีหน้า Sign in (email/password) ของตัวเองก่อนถึงหน้า dashboard ใส่บัญชี reviewer ที่สร้างไว้เฉพาะ (ห้ามใช้บัญชีเดียวกับทีมงาน — ดู §8) จากนั้น reviewer กด **Continue with Facebook** ด้วยบัญชี Facebook ของตัวเองที่มี Page *(ดู §6)* |
| Screencasts | 1 คลิปต่อ permission (ดู §5) |

---

## 1) `pages_read_engagement`

**Allowed usage ทางการ:** Get content posted by your Page · Get names, PSIDs, and profile pictures of your Page followers · Get metadata about your Page
**Screencast requirement:** Facebook login เต็ม → user เข้าถึงเนื้อหาโพสต์ผ่านแอพ → โชว์ว่าเนื้อหาโพสต์แสดงผลสำเร็จบนแอพ

### Use case description (paste)

> omni-channel is a business inbox that lets a Facebook Page admin read and manage everything happening on their own Page from one screen.
>
> We request `pages_read_engagement` so the app can read the content the Page itself has published. After the Page admin logs in with Facebook and connects their Page, they add one of their Page posts to the dashboard. The app then calls the Graph API endpoint `GET /{page-post-id}?fields=message,full_picture,created_time,permalink_url` using the Page access token, and renders the post message, image and publish time inside the "Feed" view of our app.
>
> Without this permission the app cannot display the Page's own post content, and the admin would have no context for the comments and messages they are moderating in the rest of the product. The data is used only to display the post inside the admin's dashboard. We do not sell, transfer or use it for advertising.
>
> The screencast shows: the complete Facebook Login flow with the permission dialog, the Page selection step, the admin importing one of their own Page posts, and the post content (text and image) being successfully displayed inside the app.

**Endpoints ที่แอพเรียกจริง:** `GET /{post-id}?fields=message,full_picture,created_time,permalink_url`
**Screencast:** `final-pages_read_engagement.mp4` (1:30)

---

## 2) `pages_read_user_content`

**Allowed usage ทางการ:** Get user generated content on your Page · Get posts that your Page is tagged in · Delete comments posted by users on your Page
**Screencast requirement:** Facebook login เต็ม → user อ่านคอมเมนต์ที่ user คนอื่นเขียนบนเพจผ่านแอพ → โชว์ว่าคอมเมนต์แสดงผลสำเร็จบนแอพ

### Use case description (paste)

> omni-channel lets a Page admin read and moderate the content that Facebook users leave on their Page.
>
> We request `pages_read_user_content` so the app can read the user-generated comments on the admin's Page posts. When a post is opened in the app, we call `GET /{page-post-id}/comments?fields=id,message,from,created_time,is_hidden` with the Page access token and display each comment — the author, the text and the time — in the comment panel, labelled with a "USER COMMENT" badge so the admin can immediately tell visitor content apart from the Page's own replies. The same permission also lets the admin delete an inappropriate visitor comment from inside the app.
>
> This is the core of the product: a support agent cannot moderate a Page without being able to read what visitors wrote on it. The comments are shown only in the admin's own dashboard, are not shared with third parties, and are not used for advertising.
>
> The screencast shows: the complete Facebook Login flow with the permission dialog, the Page selection step, a Page post being imported, the user's comment being displayed in the app with its author and text, and finally the same comment on the real Facebook Page for comparison — proving the app reads live user-generated content through the Graph API.

**Endpoints ที่แอพเรียกจริง:** `GET /{post-id}/comments?fields=id,message,from,created_time,is_hidden` · `DELETE /{comment-id}`
**Screencast:** `final-pages_read_user_content.mp4` (1:36)

---

## 3) `pages_manage_engagement`

**Allowed usage ทางการ:** Publish a comment on a Page post · Update your comment on a Page post · Delete a comment on a Page post · Like a Page post or remove your Like
**Screencast requirement (บังคับ):** Facebook login เต็ม → user **publish คอมเมนต์** ลงเพจตัวเองผ่านแอพ → **โชว์คอมเมนต์ที่เพิ่ง publish บนเพจของ user** ← ข้อนี้ห้ามข้าม

### Use case description (paste)

> omni-channel is a customer-support tool for Facebook Pages. Businesses use it so their support team can answer and moderate visitor comments without giving every agent direct access to the Facebook Page.
>
> We request `pages_manage_engagement` so the admin can act on the comments they see in our app, on behalf of their own Page:
> • **Publish a comment** — the admin writes a reply to a visitor's comment in the app and we call `POST /{comment-id}/comments` (or `POST /{post-id}/comments`) with the Page access token. The reply is published on the Page post as the Page.
> • **Like** — the admin acknowledges a visitor comment as the Page; we call `POST /{comment-id}/likes`.
> • **Hide / unhide** — the admin removes an abusive or spam comment from public view; we call `POST /{comment-id}` with `is_hidden=true|false`.
> • **Delete** — the admin removes a comment entirely; we call `DELETE /{comment-id}`.
>
> Every action is triggered explicitly by the Page admin from the app UI and is applied only to Pages the admin manages and has connected. We never publish, like, hide or delete anything automatically without the admin's action.
>
> The screencast shows: the complete Facebook Login flow with the permission dialog, the admin publishing a reply to a visitor comment from inside the app, and then the same newly published comment appearing on the real Facebook Page — followed by the Like and Hide actions and the resulting state on the live Page.

**Endpoints ที่แอพเรียกจริง:** `POST /{comment-id}/comments` · `POST /{comment-id}/likes` · `POST /{comment-id}` (`is_hidden`) · `DELETE /{comment-id}`
**Screencast:** `final-pages_manage_engagement.mp4` (3:14)

---

## 4) Business Asset User Profile Access *(feature ไม่ใช่ OAuth scope)*

**Allowed usage ทางการ:** อ่าน User Fields (`id`, `ids_for_business`, `name`, `picture`) ของผู้ใช้ที่ engage กับ business asset ของเรา ใน business app experience
**Additional details:** ต้องผ่าน App Review **และ Business Verification** (ผ่านแล้ว ✅)

### Use case description (paste)

> omni-channel is a shared inbox that a business's support team uses to answer customers who message their Facebook Page through Messenger.
>
> Messenger conversations only identify the customer by a page-scoped ID (PSID). Without Business Asset User Profile Access, our inbox can only show "Customer 27353747824317636", which makes it impossible for an agent to know who they are talking to, to match the conversation to an existing customer record, or to greet the person by name.
>
> We use this feature to read the User fields of a person who has engaged with our business asset (the connected Page) by messaging it. When a message arrives on the Page's `messages` webhook, and again whenever the admin presses "Sync Profile" on a conversation, we call `GET /{PSID}?fields=id,name,picture{url}` with the Page access token and display the returned name and profile picture at the top of the conversation and in the conversation list, next to a badge that states the data was fetched via Business Asset User Profile Access. We read only the User fields this feature grants and no others.
>
> We rely on the same feature in the second place a person engages with the connected Page: its posts. When the admin opens a Page post, we call `GET /{page-post-id}/comments?fields=id,from{name,id,picture{url}},message,created_time,parent` and display each commenter's name and profile picture next to their comment, so the agent moderating the thread can tell one visitor from another and answer them by name. Both cases are the same allowed usage — reading the User fields of a person who engaged with our business asset, shown only inside the business app experience.
>
> The data is used only inside the business app experience — it is displayed to the Page admin/support agent who is handling that conversation or that post. We do not sell or transfer it, we do not use it for advertising or profiling, and we do not combine it with data from other sources.
>
> The screencast shows: the complete Facebook Login flow, the conversations being loaded from the Page (all showing only PSIDs), the admin pressing "Sync Profile", the customer's real name and profile photo appearing in the inbox, and the server log — highlighted in red — showing the exact Graph API call and the resolved identity.

**Endpoints ที่แอพเรียกจริง:**
- Messenger: `GET /{PSID}?fields=id,name,picture{url}` (fallback เมื่อไม่ได้รูป: `GET /{PSID}?fields=first_name,last_name,profile_pic` ผ่าน `pages_messaging`)
- คอมเมนต์: `GET /{post-id}/comments?fields=id,from{name,id,picture{url}},message,created_time,parent`
**Screencast:** `final-business-asset-user-profile-access.mp4` (2:14)

---

## 5) Permission ที่เป็น dependency (ขอไปด้วย — เขียนสั้นได้)

### `pages_show_list`

> Requested as a dependency of `pages_read_engagement`, `pages_read_user_content` and `pages_manage_engagement`. After Facebook Login we call `GET /me/accounts` to show the admin the list of Pages they manage, so they can pick which Page to connect to omni-channel. It is used only to render that picker and to verify the person manages the Page they are connecting.

### `pages_manage_metadata`

> Used to subscribe the connected Page to our webhook (`POST /{page-id}/subscribed_apps`) so the app receives message and feed events for that Page in real time. Triggered only when the admin connects their Page.

### `pages_messaging`

> Used so the support team can receive customer messages sent to the Page on Messenger and reply to them from inside omni-channel (`GET /{page-id}/conversations`, `POST /me/messages`). Every reply is written and sent by a human agent.

---

## 6) Instructions for reviewer (paste ลงช่อง "Add notes for the reviewer")

> **App URL:** https://studio.jts.co.th/demo/
>
> Both the app credentials and a Facebook account that administers our test Page are provided in the "Test credentials" section of this submission. The Page is a dedicated test Page — every action you take is safe and affects no real customers.
>
> 1. Open https://studio.jts.co.th/demo/ and sign in with the supplied app credentials.
> 2. Click **+ Add page → Continue with Facebook**, sign in with the supplied Facebook account, grant the requested permissions and select the test Page.
> 3. **pages_read_engagement / pages_read_user_content:** open the **FEED** tab → **+ Add post** → paste the URL of the test post given below → **Import**. The app displays the post content (message + image) and, underneath, the comments Facebook users left on it, each tagged "USER COMMENT".
> 4. **pages_manage_engagement:** on a visitor comment click **Reply**, type a message and send it — the comment is published on the Page and appears on the post on facebook.com. You can also **Like**, **Hide/Unhide** and **Delete** the comment; each action is applied to the live Page.
> 5. **Business Asset User Profile Access:** open the **INBOX** tab, then send a message to the test Page on Messenger from any other Facebook account. The app receives it on the `messages` webhook and the conversation appears in the inbox within seconds, identified only as "Customer &lt;PSID&gt;". Open it and press **Sync Profile** — the app calls `GET /{PSID}?fields=id,name,picture{url}` with the Page access token and, when the feature is granted, replaces the PSID with the person's real name and profile picture, badged "Profile fetched via Business Asset User Profile Access".
>
> Note on steps 3 and 5: Business Asset User Profile Access is exactly what we are requesting, so until it is approved the Graph API returns identity fields only for people who have a role on our app.
>
> • In step 5, if you message the Page from an account without a role, the app shows an explanatory notice instead of a name.
> • In step 3, the same gate applies to the `from` field on comments: comments written by people without a role are displayed in full, but their author is labelled "Facebook user" with an "Identity pending review" badge.
>
> Both are the expected pre-approval behaviour, not a malfunction — the comment text itself is read via `pages_read_user_content` and is displayed correctly. The attached screencast shows both flows completing successfully with an authorised account (PSID 27353747824317636).

---

## 7) Data-handling answers (ใช้ตอบ Data Use Checkup / คำถามใน form)

- **How is the data stored?** Comments, conversations and resolved profile names/photos are stored in the business's own workspace in our database, tied to the connected Page, and shown only to the Page admins who connected that Page.
- **Is data shared with third parties?** No. Data is not sold, licensed or transferred to any third party, data broker or advertising network.
- **Is data used for advertising or profiling?** No.
- **Data deletion:** disconnecting the Page in omni-channel deletes the stored posts, comments and conversations for that Page. Users can also request deletion via the contact in our Privacy Policy.
- **Retention:** data is retained only while the Page stays connected.

---

## 8) เช็คลิสต์ก่อนกด Submit

- [ ] Privacy Policy URL live และเข้าถึงได้แบบ public
- [ ] App อยู่ใน **Live mode** (ไม่ใช่ Development) ตอน submit
- [ ] Business Verification ผ่าน ✅
- [ ] แนบ screencast **แยกต่อ permission** ทั้ง 4 ไฟล์
- [ ] Use case description ของแต่ละ permission ใช้ข้อความใน §1–§4
- [ ] Notes for reviewer ใช้ §6
- [ ] 🔴 ยืนยันว่าบัญชี Facebook ที่ส่งให้ reviewer **ปิด 2FA** และเป็น admin ของ **เพจทดสอบ** เท่านั้น (ไม่ใช่เพจจริงที่มีลูกค้า)
- [ ] 🔴 เตรียม **โพสต์ทดสอบ 1 โพสต์ + คอมเมนต์ทดสอบ** บนเพจนั้น แล้วใส่ URL ลงใน §6 ข้อ 3 (reviewer จะ Reply/Hide/Delete ของจริงบนโพสต์นี้)
- [ ] 🔴 ยืนยัน webhook callback URL ของ prod ชี้มาที่ environment เดียวกับ App URL — flow §6 ข้อ 5 พึ่ง `messages` webhook ล้วน ๆ
- [ ] 🔴 ยืนยัน `FACEBOOK_APP_SECRET` ตัวจริงถูกตั้งบน prod — ตอนนี้ถ้าตั้งไม่ถูก การเชื่อมเพจจะ **fail พร้อมข้อความบอกสาเหตุ** แทนที่จะเก็บ short-lived token ที่หมดอายุระหว่าง reviewer ทดสอบ
- [x] ✅ แก้แล้ว: ทุก endpoint กรองข้อมูลตาม Page ที่ user เชื่อมเอง (ไม่มี fallback ไปหยิบ token เพจแรกใน DB)
- [x] ✅ แก้แล้ว: `Sync Profile` แยกกรณี "feature ยังไม่อนุมัติ" ออกจาก error จริง และแสดงคำอธิบายแทน dialog ว่า Failed
- [x] ✅ แก้แล้ว: inbox ว่างมี empty state บอกวิธีทำต่อ / โหลดเพจล้มเหลวแสดง error แทนหน้า "No pages connected"
