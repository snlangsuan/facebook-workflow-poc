# App Review Screencast Script — ครบทุก Permission

สคริปต์ถ่ายวิดีโอสำหรับ **Facebook App Review** ครอบคลุมทุก permission ที่แอพร้องขอ แต่ละ scene ระบุว่า demonstrate permission ตัวไหน และ **reviewer ต้องเห็นอะไร** ตาม guideline ทางการ

> วิธีใช้: ถ่ายเป็นวิดีโอเดียวยาวต่อเนื่องก็ได้ หรือถ่ายตาม scene แล้วตัดคลิปต่อ permission ตอน submit (Facebook ให้แนบ screencast ต่อ permission ได้) — timestamp ในหัวข้อช่วยให้ตัดคลิปง่าย

## Permission ที่ครอบคลุม

| Permission | Scene หลัก | Guideline |
| --- | --- | --- |
| `public_profile` | 1 | default — Facebook Login |
| `pages_show_list` | 2 | list Pages ที่ user จัดการ |
| `pages_manage_metadata` | 2 | subscribe Page เข้า webhook |
| `pages_read_engagement` | 3 | อ่านโพสต์ + engagement ของเพจ |
| `pages_read_user_content` | 3 | อ่านคอมเมนต์/คอนเทนต์ที่ user สร้าง |
| `pages_manage_engagement` | 4 | จัดการ/moderate คอมเมนต์ |
| `pages_messaging` | 5 | รับ-ส่งข้อความ Messenger |
| Business Asset User Profile Access | 6 | ดึงชื่อ+รูปลูกค้าจาก PSID |

---

## ข้อกำหนดวิดีโอของ Facebook (อ่านก่อนถ่าย)

- ความยาวต่อเนื่อง อ่านออกชัด ≥ 720p ไม่ตัดข้าม step สำคัญ
- ต้องเห็น **Facebook Login process เต็ม** (กด login → กล่อง permission → grant) — บังคับสำหรับ `pages_read_engagement` และ `pages_manage_engagement`
- ต้องเห็น **ข้อมูล/ผลลัพธ์จริงจาก permission** บน UI (ไม่ใช่ mock)
- `pages_manage_engagement` **บังคับ**ให้เห็นว่าผลของการ moderate (reply/hide/delete) **ปรากฏบนเพจ Facebook จริง**
- พากย์อังกฤษ หรือพากย์ไทย + **English caption** (สคริปต์ให้ทั้งสองแบบ)

---

## เตรียมก่อนถ่าย (Checklist)

### Account-level (สำคัญ — ทำก่อน ไม่งั้นถ่ายแล้วข้อมูลไม่ขึ้น)
- [ ] **ตั้ง `FACEBOOK_APP_SECRET` ตัวจริง** ใน `.env` (ไม่ใช่ `<secret>`) — ไม่งั้น page token เป็น short-lived หมดอายุใน ~1-2 ชม. ระหว่างถ่าย
- [ ] บัญชีลูกค้า + ผู้ที่คอมเมนต์ ต้องเป็น **Tester/Developer/Admin ของแอพ** (ระหว่าง permission ยังไม่ approved) ไม่งั้น Business Asset User Profile Access จะได้ `subcode 33`
- [ ] **Business Verification** สำหรับ Business Asset User Profile Access (feature นี้ทำงานกับ live data ต่อเมื่อ verify แล้ว)

### Runtime
- [ ] รันแอพ: `bun run dev` (HTTPS ที่ `https://localhost:8000`)
- [ ] เปิด **terminal ที่รันเซิร์ฟเวอร์** ให้เห็น log (ใช้เป็นหลักฐานการเรียก API)
- [ ] เปิด **แท็บเพจ Facebook จริง** ค้างไว้ (ใช้พิสูจน์ผล moderate ใน Scene 4)
- [ ] เตรียมโพสต์บนเพจที่**มีคอมเมนต์จาก user จริง** อย่างน้อย 1 โพสต์ (สำหรับ Scene 3–4)

### แหล่งข้อมูล Inbox — เลือก 1 ใน 2 (เพราะ webhook ผูกกับ prod)
- **ทางเลือก A (แนะนำ, ไม่ต้องใช้ webhook):** ใช้ปุ่ม **"Load from Page"** ในแอพดึง conversation จากเพจผ่าน Graph API → แล้วกด **"Sync Profile"**
- **ทางเลือก B (webhook จริง):** ตั้ง webhook callback เป็น `https://<public-url>/demo/api/v1/interactions/webhook` (subscribe `messages`) แล้วให้ลูกค้าทักจริง

---

## บทถ่ายทำ (Scene by Scene)

### Scene 1 — แนะนำแอพ + Facebook Login `public_profile` (0:00–0:30)

**บนจอ:** หน้าแรกแอพ → กด **"Continue with Facebook"** → กล่อง Facebook OAuth ขึ้น (ค้าง ~2 วิให้เห็นรายการ permission) → กด Continue

**บทพากย์ (ไทย):**
> "นี่คือแอพจัดการเพจ Facebook สำหรับธุรกิจ ผู้ดูแลเพจเริ่มด้วยการล็อกอินด้วย Facebook และอนุญาต permission ให้แอพ"

**English caption:**
> "This is a business app for managing a Facebook Page. The Page admin starts by logging in with Facebook and granting the requested permissions."

**Reviewer ต้องเห็น:** ปุ่ม login → กล่อง permission ของ Facebook → grant สำเร็จ (ครอบคลุม requirement "show complete Facebook Login" ของทุก permission)

---

### Scene 2 — เชื่อม Page `pages_show_list` + `pages_manage_metadata` (0:30–1:00)

**บนจอ:** หลัง login แอพแสดง **รายการเพจที่ผู้ใช้จัดการ** (page picker) → เลือกเพจ → กด Connect → เห็นข้อความเชื่อมสำเร็จ

**บทพากย์ (ไทย):**
> "แอพเรียก /me/accounts เพื่อดึงรายชื่อเพจที่ผู้ใช้ดูแล ผู้ใช้เลือกเพจธุรกิจที่ต้องการเชื่อม เมื่อเชื่อมแล้ว แอพจะ subscribe เพจเข้ากับ webhook เพื่อรับเหตุการณ์ข้อความและคอมเมนต์โดยอัตโนมัติ"

**English caption:**
> "The app calls /me/accounts to list the Pages the user manages (pages_show_list). After the admin selects a Page, the app subscribes it to webhook events for messages and feed (pages_manage_metadata)."

**Reviewer ต้องเห็น:** รายการเพจจริงใน picker (`pages_show_list`) + ข้อความ/สถานะเชื่อมเพจสำเร็จ ซึ่ง trigger การ subscribe webhook (`pages_manage_metadata`)

---

### Scene 3 — อ่านโพสต์ + คอมเมนต์ user `pages_read_engagement` + `pages_read_user_content` (1:00–1:40)

**บนจอ:** แท็บ **Feed** → กด **"+ Add post"** ใส่ลิงก์โพสต์เพจ → **Import** → โพสต์ถูกดึงเข้ามาแสดง **เนื้อหาโพสต์ + รูป + คอมเมนต์ของ user**

**บทพากย์ (ไทย):**
> "ในแท็บ Feed แอพดึงโพสต์ของเพจและคอมเมนต์เข้ามาผ่าน Graph API ระบบแสดงเนื้อหาโพสต์และคอมเมนต์ของผู้ใช้ที่เขียนบนเพจ สังเกตป้าย 'User comment' สีเขียว และคำอธิบายว่าคอมเมนต์เหล่านี้อ่านมาจาก Facebook ด้วย pages_read_user_content"

**English caption:**
> "In the Feed tab, the app reads the Page's posts and comments via the Graph API (pages_read_engagement). It displays the post content and the comments users wrote on the Page — each tagged with a green 'User comment' badge, and a note stating they are read via pages_read_user_content."

**Reviewer ต้องเห็น:**
- **เนื้อหาโพสต์ของเพจ** แสดงครบ (post + รูป) → `pages_read_engagement`
- **คอมเมนต์ของ user** (ชื่อ + รูป + ข้อความ) + **badge "User comment"** + header *"X from Facebook users · read via pages_read_user_content"* → `pages_read_user_content`

---

### Scene 4 — Moderate คอมเมนต์ + พิสูจน์บนเพจจริง `pages_manage_engagement` (1:40–2:30)

**บนจอ:** ที่คอมเมนต์ user กดใช้ action ให้เห็นครบ:
1. **Reply** — พิมพ์ตอบคอมเมนต์ → ส่ง
2. **Like** — กดไลก์คอมเมนต์ (เห็น badge ♥ Page)
3. **Hide** — กดซ่อน (คอมเมนต์จางลง + badge Hidden)
4. **Delete** — ลบคอมเมนต์ทดสอบ

**➡️ จากนั้นสลับไปที่แท็บ "เพจ Facebook จริง" refresh ให้เห็นว่าการ reply/hide/delete มีผลจริงบนเพจ** (requirement บังคับของ guideline)

**บทพากย์ (ไทย):**
> "แอดมินจัดการคอมเมนต์ได้จากในแอพ ทั้งตอบกลับ ไลก์ ซ่อน และลบ ทุก action ยิงไปที่ Graph API จริง ตอนนี้ผมสลับไปที่เพจ Facebook จริงเพื่อยืนยันว่าคอมเมนต์ที่ตอบและที่ซ่อน มีผลบนเพจจริงตามที่ทำในแอพ"

**English caption:**
> "The admin moderates comments from inside the app — reply, like, hide, and delete. Every action calls the real Graph API (pages_manage_engagement). Now I switch to the actual Facebook Page to confirm the reply and the hidden comment are reflected on the live Page."

**Reviewer ต้องเห็น:** action ในแอพ (create/hide/delete comment) **และ** ผลที่ปรากฏบน **เพจ Facebook จริง** — ข้อนี้ guideline บังคับ ห้ามข้าม

---

### Scene 5 — Messenger Inbox `pages_messaging` (2:30–3:00)

**บนจอ:** แท็บ **Inbox**
- **ทางเลือก A:** กด **"Load from Page"** → conversation ที่ลูกค้าเคยทักโผล่ในกล่อง (ดึงผ่าน `GET /{pageId}/conversations`)
- **ทางเลือก B:** ให้ลูกค้าทักจริง → ข้อความเด้งเข้ามาแบบ real-time
- จากนั้น **พิมพ์ตอบลูกค้า** ในกล่องแชท → ส่ง (ยิง `POST /me/messages`)

**บทพากย์ (ไทย):**
> "ในแท็บ Inbox แอพรับข้อความที่ลูกค้าทักเข้ามาทาง Messenger และให้แอดมินตอบกลับได้จากในแอพ ทั้งการรับและส่งใช้ pages_messaging"

**English caption:**
> "In the Inbox, the app receives customer messages from Messenger and lets the admin reply — both receiving and sending use pages_messaging."

**Reviewer ต้องเห็น:** ข้อความลูกค้าในกล่อง Inbox + การตอบกลับที่ส่งออกไปสำเร็จ

---

### Scene 6 — Business Asset User Profile Access (3:00–3:40)

**บนจอ:** เปิด conversation ของลูกค้า → กดปุ่ม **"Sync Profile"** พร้อมโชว์ **terminal log**:

```
🔎 [PROFILE] calling User Profile API (Business Asset User Profile Access)
    endpoint: https://graph.facebook.com/v25.0/{PSID}?fields=name,profile_pic
👤 [PROFILE] resolved customer identity via Business Asset User Profile Access
    resolvedName: "<ชื่อจริงของลูกค้า>"  hasPhoto: true
```

ในแอพ: ชื่อ/รูป เปลี่ยนจาก `Customer <PSID>` → **ชื่อจริง + รูปจริง** + badge **"FB Profile"**

**บทพากย์ (ไทย):**
> "เมื่อกด Sync Profile แอพเรียก Graph API ด้วย Business Asset User Profile Access เพื่อดึงชื่อและรูปโปรไฟล์ของลูกค้าจาก PSID อย่างที่เห็นใน log ชื่อและรูปจริงของลูกค้าจะปรากฏในกล่องแชท พร้อมป้าย FB Profile ช่วยให้ทีมซัพพอร์ตรู้ว่ากำลังคุยกับใคร"

**English caption:**
> "When I press Sync Profile, the app calls the Graph API using Business Asset User Profile Access to resolve the customer's name and photo from their PSID — visible in the server log. The real name and photo appear in the inbox with a 'FB Profile' badge, so the support team knows exactly who they're talking to."

**Reviewer ต้องเห็น:** บรรทัด log `👤 resolved customer identity` (ชื่อจริง) + ชื่อ/รูปจริงบน UI + badge "FB Profile" (hover เห็น tooltip อ้าง permission)

---

### Scene 7 — สรุปปิดท้าย (3:40–4:00)

**บทพากย์ (ไทย):**
> "โดยสรุป แอพช่วยให้ผู้ดูแลเพจอ่านและจัดการโพสต์ คอมเมนต์ และข้อความ Messenger จากที่เดียว และแสดงตัวตนจริงของลูกค้าที่ทักเข้ามา เราใช้แต่ละ permission เฉพาะเพื่อฟีเจอร์ที่แสดงให้เห็นเท่านั้น"

**English caption:**
> "In summary, the app lets a Page admin read and manage posts, comments, and Messenger conversations in one place, and shows the real identity of customers who message the Page. Each permission is used only for the feature demonstrated."

---

## Coverage Matrix — permission → scene → หลักฐาน

| Permission | Scene | สิ่งที่ต้องเห็นบนจอ | โค้ด |
| --- | --- | --- | --- |
| `public_profile` | 1 | Facebook Login + grant | [handleFacebookLogin](../src/public/index.html) |
| `pages_show_list` | 2 | page picker แสดงเพจจริง | [getAvailablePages](../src/features/connections/v1/connection.service.ts) |
| `pages_manage_metadata` | 2 | เชื่อมเพจ → subscribe webhook | [subscribePageToWebhook](../src/features/connections/v1/connection.service.ts) |
| `pages_read_engagement` | 3 | เนื้อหาโพสต์ + รูป แสดงในแอพ | [importPost](../src/features/interactions/v1/interaction.service.ts), [syncPost](../src/features/interactions/v1/interaction.service.ts) |
| `pages_read_user_content` | 3 | คอมเมนต์ user + badge "User comment" | [fetchComments](../src/features/interactions/v1/interaction.service.ts), [renderOpenPost](../src/public/index.html) |
| `pages_manage_engagement` | 4 | reply/hide/like/delete + **ผลบนเพจจริง** | [replyToComment](../src/features/interactions/v1/interaction.service.ts), [hideComment](../src/features/interactions/v1/interaction.service.ts), [likeComment](../src/features/interactions/v1/interaction.service.ts), [deleteComment](../src/features/interactions/v1/interaction.service.ts) |
| `pages_messaging` | 5 | รับ + ส่งข้อความ Messenger | [importConversationsFromPage](../src/features/interactions/v1/interaction.service.ts), [sendMessengerReply](../src/features/interactions/v1/interaction.service.ts) |
| Business Asset User Profile Access | 6 | log `👤 resolved` + ชื่อ/รูป + badge | [fetchUserProfile](../src/features/interactions/v1/interaction.service.ts), [syncConversationProfile](../src/features/interactions/v1/interaction.service.ts) |

---

## เช็คลิสต์ก่อนอัปโหลด

- [ ] เห็น Facebook Login + กล่อง permission เต็ม (Scene 1)
- [ ] เห็นเนื้อหาโพสต์ของเพจแสดงในแอพ (Scene 3 — `pages_read_engagement`)
- [ ] เห็นคอมเมนต์ user + badge "User comment" (Scene 3 — `pages_read_user_content`)
- [ ] เห็น moderate comment **และผลบนเพจ Facebook จริง** (Scene 4 — `pages_manage_engagement` ← ข้อบังคับ)
- [ ] เห็นรับ + ตอบข้อความ Messenger (Scene 5 — `pages_messaging`)
- [ ] เห็น log `👤 resolved customer identity` + ชื่อ/รูปจริง + badge FB Profile (Scene 6)
- [ ] ไม่โชว์ App Secret / access token เต็มบนจอ
- [ ] มี English caption ถ้าพากย์ไทย, ภาพ ≥ 720p อ่านออก
