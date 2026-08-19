# Screencast Script — Business Asset User Profile Access

สคริปต์ถ่ายวิดีโอสำหรับ **Facebook App Review** ของ permission **"Business Asset User Profile Access"**

> เป้าหมายของวิดีโอ: แสดงให้ reviewer เห็นว่าแอพใช้ permission นี้เพื่ออะไร — เมื่อ **ลูกค้าจริงทักแชทเข้ามาที่ Page ผ่าน Messenger** แอพจะดึง **ชื่อจริง + รูปโปรไฟล์** ของลูกค้าจาก Graph API มาแสดงในหน้า Inbox เพื่อให้แอดมิน/ทีม customer support รู้ว่ากำลังคุยกับใคร (use case: ระบบตอบแชท/CRM ของธุรกิจ)

**หลักฐานหลักในโค้ด:** [interaction.service.ts:191-217](../src/features/interactions/v1/interaction.service.ts#L191-L217) เรียก
`GET /{PSID}?fields=id,name,picture{url}&access_token={pageAccessToken}` แล้วนำผลไปแสดงบน Inbox

---

## ข้อกำหนดวิดีโอของ Facebook (อ่านก่อนถ่าย)

- ความยาวแนะนำ **1–3 นาที** ต่อเนื่อง ไม่ตัดต่อข้าม step สำคัญ
- ต้องเห็น **ชื่อ/URL ของแอพ** และ **flow การ grant permission** อย่างน้อย 1 ครั้ง
- ต้องเห็น **ข้อมูลจริงจาก permission** ปรากฏบน UI (ชื่อ + รูปโปรไฟล์ลูกค้า) — ไม่ใช่ mock
- ถ่ายเป็นภาษาอังกฤษหรือมีคำบรรยาย/subtitle ประกอบ (reviewer เป็นทีม global) — สคริปต์ด้านล่างให้ทั้ง **บทพากย์ไทย** และ **English caption** ให้เลือกใช้
- อัดหน้าจอความละเอียด ≥ 720p อ่านตัวอักษรออกชัด

---

## เตรียมก่อนถ่าย (Checklist)

- [ ] ตั้งค่า `.env` ครบ: `BASE_URL`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_VERIFY_TOKEN`, `FACEBOOK_GRAPH_VERSION`, ค่า Google/Firebase สำหรับ RTDB queue
- [ ] รันแอพ: `bun run dev` (เซิร์ฟเวอร์รันแบบ **HTTPS** ที่ `https://localhost:8000` หรือค่า `PORT`)
- [ ] เปิด **public URL** ให้ Facebook ยิง webhook เข้ามาได้ (เช่น `ngrok http 8000`) แล้วนำ URL ไปตั้งใน App Dashboard
- [ ] ตั้ง Webhook ใน App Dashboard → **Messenger → Webhooks**
  - Callback URL: `https://<public-url>/demo/api/v1/interactions/webhook`
  - Verify token: ค่าเดียวกับ `FACEBOOK_VERIFY_TOKEN`
  - Subscribe field: **`messages`**
- [ ] เตรียม **บัญชี Facebook ลูกค้า (test user)** คนละบัญชีกับแอดมิน — บัญชีนี้ต้องเป็น role ที่ทดสอบ permission ได้ (Tester/Developer ของแอพ หรือใช้ระหว่างที่แอพยัง live ในโหมด dev) และมี **ชื่อจริง + รูปโปรไฟล์** ที่มองเห็นได้
- [ ] เปิดหน้าต่าง 2 ฝั่งไว้เรียงข้างกัน: **(ซ้าย)** แอพ Inbox ที่ `http://localhost:8000`  **(ขวา)** Messenger ของบัญชีลูกค้า (มือถือหรือ m.me/<page>)
- [ ] เปิด **terminal ที่รันเซิร์ฟเวอร์** ให้เห็น log — จะใช้โชว์เป็นหลักฐานการเรียก API
- [ ] ล้าง/เตรียม conversation ให้เริ่มสะอาด เพื่อให้เห็นการเปลี่ยนจาก "ยังไม่ fetch" → "fetch แล้ว"

> **หมายเหตุ scope:** "Business Asset User Profile Access" เป็น **feature ระดับแอพ (ขอผ่าน App Review)** ไม่ใช่ OAuth scope ที่ขอตอน login — ตอน login แอพขอ scope เหล่านี้: `pages_show_list, pages_messaging, pages_read_engagement, pages_read_user_content, pages_manage_metadata, pages_manage_engagement` ([index.html](../src/public/index.html)) ซึ่งเป็นสิ่งที่ควรพูดถึงในวิดีโอเพื่อให้ reviewer เข้าใจบริบท

---

## บทถ่ายทำ (Scene by Scene)

### Scene 1 — แนะนำแอพ (0:00–0:15)

**บนจอ:** หน้าแรกของแอพที่ `http://localhost:8000` (แสดงชื่อแอพ + Dashboard)

**บทพากย์ (ไทย):**
> "นี่คือแอพระบบจัดการแชทและคอมเมนต์ของ Facebook Page สำหรับธุรกิจ ทีม customer support ใช้แอพนี้ตอบข้อความลูกค้าที่ทักเข้ามาทาง Messenger ครับ"

**English caption:**
> "This is a business inbox app for managing Facebook Page conversations. Our support team uses it to reply to customers who message the Page on Messenger."

---

### Scene 2 — Login และเชื่อม Page (0:15–0:40)

**บนจอ:** กดปุ่ม **"Continue with Facebook"** → หน้าต่าง Facebook OAuth ขึ้นมา → เห็นรายการ permission → กด Continue → เลือก Page ที่ต้องการเชื่อมใน wizard

**บทพากย์ (ไทย):**
> "ผู้ดูแลเพจล็อกอินด้วย Facebook และอนุญาต permission ให้แอพ จากนั้นเลือก Page ธุรกิจที่จะเชื่อมต่อ แอพจะเก็บ Page access token ไว้เพื่อรับข้อความและดึงข้อมูลที่จำเป็น"

**English caption:**
> "The Page admin logs in with Facebook, grants the permissions, and selects the business Page to connect. The app stores the Page access token to receive messages and resolve the data it needs."

**สิ่งที่ต้องเห็นชัด:** กล่อง permission ของ Facebook (ให้ค้างจอ ~2 วินาที) และหน้าจอเลือก Page สำเร็จ

---

### Scene 3 — ลูกค้าทักแชทเข้ามา (0:40–1:05)

**บนจอ (ฝั่งขวา):** สลับไปที่ Messenger ของ **บัญชีลูกค้า** แล้วพิมพ์ข้อความหาเพจ เช่น *"สวัสดีครับ สนใจสินค้าตัวนี้ครับ"* แล้วกดส่ง

**บทพากย์ (ไทย):**
> "ตอนนี้ผมสลับมาเป็นมุมของลูกค้า ลูกค้าทักข้อความเข้ามาหาเพจผ่าน Messenger ตามปกติครับ"

**English caption:**
> "Now from the customer's side — a real customer sends a message to the Page through Messenger."

**สิ่งที่ต้องเห็นชัด:** ให้เห็นชื่อ + รูปโปรไฟล์ของบัญชีลูกค้าใน Messenger เพื่อให้ reviewer เทียบกับที่แอพดึงมาได้

---

### Scene 4 — แอพดึงโปรไฟล์ผ่าน permission (หัวใจของวิดีโอ) (1:05–1:35)

**บนจอ:** โชว์ **terminal log** ให้เห็น (ค้างจอให้อ่านทัน) — จะเห็นบรรทัดเหล่านี้ตามลำดับ:

```
💬 [WORKER] processing message
🔎 [PROFILE] calling User Profile API (Business Asset User Profile Access)
    endpoint: https://graph.facebook.com/v25.0/{PSID}?fields=id,name,picture{url}
👤 [PROFILE] resolved customer identity via Business Asset User Profile Access
    resolvedName: "<ชื่อจริงของลูกค้า>"  hasPhoto: true
```

> **สำคัญ (ยืนยันจากการทดสอบจริง):** บรรทัด `👤 ... resolved customer identity` จะขึ้น **เฉพาะเมื่อ fetch สำเร็จ** เท่านั้น — ต้องเป็นข้อความจากลูกค้าจริง + Page token ที่ valid + permission ได้รับอนุมัติ/บัญชีลูกค้าเป็น Tester ของแอพ ถ้าเงื่อนไขไม่ครบ log จะขึ้นเป็น `⚠️ Could not fetch customer profile (... error_subcode: 33)` แทน และแอพจะ fallback ไป avatar ที่ generate เอง (badge จะไม่ขึ้น) — จึง **ต้องเทสต์ให้ขึ้นบรรทัด 👤 ก่อนเริ่มอัดจริง**

**บทพากย์ (ไทย):**
> "ทันทีที่ข้อความเข้ามา แอพเรียก Graph API ด้วย Business Asset User Profile Access เพื่อดึงชื่อและรูปโปรไฟล์ของลูกค้าจาก PSID อย่างที่เห็นใน log ตรงนี้ครับ endpoint คือ fields=id,name,picture{url} และผลลัพธ์คือชื่อจริงของลูกค้า"

**English caption:**
> "As soon as the message arrives, the app calls the Graph API using Business Asset User Profile Access to resolve the customer's name and profile photo from their PSID. You can see the exact endpoint (`fields=id,name,picture{url}`) and the resolved real name in the server log."

**สิ่งที่ต้องเห็นชัด:** ทั้งสามบรรทัด log โดยเฉพาะบรรทัด `👤 [PROFILE] resolved customer identity` ที่มีชื่อจริง

---

### Scene 5 — แสดงผลบน Inbox (1:35–2:00)

**บนจอ (ฝั่งซ้าย):** สลับกลับมาที่แอพ — conversation ใหม่เด้งขึ้นแบบ real-time โดย:
- แสดง **ชื่อจริง** ของลูกค้า (ไม่ใช่ตัวเลข PSID)
- แสดง **รูปโปรไฟล์จริง** ของลูกค้า
- มี badge **"FB Profile"** สีฟ้า และข้อความ **"Profile fetched via Business Asset User Profile Access"** ใต้ชื่อ ([index.html:1010-1012](../src/public/index.html#L1010-L1012))

**บทพากย์ (ไทย):**
> "กลับมาที่แอพ ข้อความของลูกค้าขึ้นในกล่อง Inbox แบบเรียลไทม์ พร้อมชื่อจริงและรูปโปรไฟล์ที่เพิ่งดึงมา สังเกตป้าย 'FB Profile' และข้อความ 'Profile fetched via Business Asset User Profile Access' ที่ยืนยันว่าข้อมูลนี้มาจาก permission ดังกล่าว ทำให้ทีมซัพพอร์ตรู้ทันทีว่ากำลังคุยกับลูกค้าคนไหน"

**English caption:**
> "Back in the app, the conversation appears in real time with the customer's real name and profile photo. The 'FB Profile' badge and the 'Profile fetched via Business Asset User Profile Access' label confirm the data came from this permission — letting the support team immediately recognize which customer they're talking to."

**สิ่งที่ต้องเห็นชัด:** เอาเมาส์ hover ที่ badge "FB Profile" ให้เห็น tooltip *"Name & photo fetched from the Facebook Graph API (Business Asset User Profile Access)"* และเทียบชื่อ/รูปกับฝั่ง Messenger ใน Scene 3 ว่าตรงกัน

---

### Scene 6 — สรุปคุณค่าและปิดท้าย (2:00–2:20)

**บทพากย์ (ไทย):**
> "โดยสรุป Business Asset User Profile Access ทำให้แอพแสดงตัวตนจริงของลูกค้าที่ทักเข้ามา ช่วยให้ทีมซัพพอร์ตให้บริการได้ถูกคนและเป็นส่วนตัวมากขึ้น เราใช้ข้อมูลนี้เฉพาะเพื่อแสดงในกล่องแชทของแอดมินเท่านั้น ไม่ได้นำไปใช้นอกเหนือจากนี้ครับ"

**English caption:**
> "In summary, Business Asset User Profile Access lets the app show the real identity of customers who message the Page, so our support team can serve the right person more personally. We use this data only to display it in the admin inbox — nothing beyond that."

---

## เช็คลิสต์ก่อนอัปโหลด

- [ ] วิดีโอเห็นครบ: login + grant → ลูกค้าส่งข้อความ → log การเรียก API → ชื่อ/รูปจริงบน Inbox + badge
- [ ] ชื่อ/รูปในแอพ **ตรงกับ** บัญชีลูกค้าใน Messenger (พิสูจน์ว่าเป็นข้อมูลจริง)
- [ ] ไม่มีการเปิดเผย App Secret / access token เต็ม ๆ บนจอ (log ในโค้ด redact token ให้แล้ว — โชว์ได้เฉพาะ endpoint)
- [ ] มี caption/subtitle ภาษาอังกฤษถ้าพากย์เป็นไทย
- [ ] ความยาว 1–3 นาที ภาพคมชัดอ่านออก

## Reference — จุดในโค้ดที่ใช้ประกอบคำอธิบายให้ reviewer

| สิ่งที่แสดง | ตำแหน่งในโค้ด |
| --- | --- |
| เรียก Graph API ดึง `name,profile_pic` | [interaction.service.ts:191-217](../src/features/interactions/v1/interaction.service.ts#L191-L217) |
| นำโปรไฟล์ไปผูกกับ conversation + log | [interaction.service.ts:331-366](../src/features/interactions/v1/interaction.service.ts#L331-L366) |
| Webhook รับข้อความ → เข้าคิว | [interaction.controller.ts:98-146](../src/features/interactions/v1/interaction.controller.ts#L98-L146) |
| Worker ประมวลผลข้อความจากคิว | [worker/index.ts:53](../src/worker/index.ts#L53) |
| Badge "FB Profile" + label บน Inbox | [index.html:1010-1012](../src/public/index.html#L1010-L1012) |
| OAuth scope ที่ขอตอน login | [index.html:514](../src/public/index.html#L514) |
