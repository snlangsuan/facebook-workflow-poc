# App Review Demo Plan — 4 Permissions (clip แยกต่อ permission)

อ้างอิง guideline ทางการ (ดึงสด 2026-07-14) และเทียบกับสคริปต์เดิมใน `docs/app-review-screencast-script.md`

**Demo URL:** https://studio.jts.co.th/demo/ (ใช้ตัวนี้ถ่าย ไม่ใช่ localhost — reviewer ชอบ public URL มากกว่าอยู่แล้ว)
**Test post ที่ใช้:** https://www.facebook.com/decimo.me/posts/pfbid094g5K3XVECDTUNAW5Y8Hto4HZrHde5ys6X4qV6JcRMUwvdvjZtM2qn7t6ZNCTmurl

---

## 1) Guideline ทางการ — ต้องเห็นอะไรบ้าง (คำแปลตรงตัว)

| Permission | Allowed usage | **Screencast requirements (บังคับ)** |
| --- | --- | --- |
| `pages_read_engagement`<br>*dep: `pages_show_list`* | อ่าน content ที่ **เพจ** โพสต์ (posts/photos/videos/events), ชื่อ+PSID+รูปของ followers, metadata/insights ของเพจ | 1. แสดง **Facebook login process เต็ม** + user grant permission<br>2. แสดงว่า user **เข้าถึงเนื้อหาของโพสต์** บนเพจตัวเองผ่านแอพ<br>3. **โชว์ว่าเนื้อหาโพสต์แสดงผลสำเร็จบนแอพ** |
| `pages_read_user_content`<br>*dep: `pages_show_list`* | อ่าน **user-generated content** บนเพจ (โพสต์/คอมเมนต์/เรตติ้งจาก user หรือเพจอื่น) + **ลบคอมเมนต์ของ user** | 1. Facebook login เต็ม + grant<br>2. แสดงว่า user **อ่านคอมเมนต์ที่ user คนอื่นเขียน** บนเพจผ่านแอพ<br>3. **โชว์ว่าคอมเมนต์นั้นแสดงผลสำเร็จบนแอพ** |
| `pages_manage_engagement`<br>*dep: `pages_read_user_content`, `pages_show_list`* | สร้าง/แก้/ลบคอมเมนต์บนเพจ + ไลก์/เลิกไลก์โพสต์เพจ | 1. Facebook login เต็ม + grant<br>2. แสดงว่า user **publish คอมเมนต์** ลงเพจตัวเองผ่านแอพ<br>3. **โชว์คอมเมนต์ที่เพิ่ง publish บนเพจ Facebook จริง** ← ข้อนี้ห้ามข้าม |
| **Business Asset User Profile Access**<br>(feature ไม่ใช่ OAuth scope) | อ่าน **User Fields** (`id`, `ids_for_business`, `name`, `picture`) ของ user ที่ engage กับ business asset ของเรา — ใช้ใน "business app experience" | หน้า feature **ไม่ได้ระบุ screencast req ตายตัว** → ใช้เกณฑ์ App Review ทั่วไป: โชว์ว่า field ไหนถูกใช้ + แสดงที่ไหนใน product<br>**Additional details:** ต้องผ่าน App Review **และ Business Verification** (คุณผ่านแล้ว ✅) |

### Gap ที่พบเทียบกับสคริปต์เดิม

1. **`pages_manage_engagement` — สคริปต์เดิมเน้น reply/like/hide/delete แบบรวม ๆ** แต่ guideline บังคับเฉพาะ **"publish a comment"** + **"show the newly published comment on the app user's page"** → คลิปต้อง**เริ่มจาก publish** และปิดด้วยการสลับไปหน้าเพจจริงแล้วเห็นคอมเมนต์นั้น (hide/like/delete เป็นของแถม ใส่ท้ายคลิปได้ ไม่ใช่แกน)
2. **`pages_read_engagement` ≠ คอมเมนต์** — guideline ตัวนี้พูดถึง **เนื้อหาที่เพจโพสต์** เท่านั้น สคริปต์เดิมรวม Scene 3 กับคอมเมนต์ → เวลาแยกคลิปต้องแยกให้ชัดว่า "post content" คือของ `pages_read_engagement` ส่วน "user comment" คือของ `pages_read_user_content`
3. **ทุกคลิปต้องมี Facebook Login เต็ม** — เพราะแนบ screencast แยกต่อ permission (3 ใน 4 ตัวบังคับข้อนี้) → **อัดยาวรอบเดียวแล้วตัด ไม่ได้** ถ้าจะตัด ต้องให้ท่อน login อยู่หัวคลิปทุกคลิป → **วิธีที่เลือก: อัด 4 คลิปแยก แต่ละคลิปเริ่มที่ logout state**
4. **`pages_read_user_content` "delete user comments"** อยู่ใน allowed usage ของตัวนี้ (ไม่ใช่ manage_engagement) — ถ้าจะโชว์ลบคอมเมนต์ ให้ไปอยู่ท้ายคลิป read_user_content จะตรง guideline กว่า
5. ⚠️ **`FACEBOOK_APP_SECRET` ใน `.env` ของ repo ยังเป็น placeholder `<secret>`** — ถ้าถ่ายที่ `studio.jts.co.th/demo/` (prod) ก็ไม่กระทบ ขอแค่ยืนยันว่า **ฝั่ง prod ตั้งค่า secret จริงแล้ว** (ไม่งั้น page token short-lived หมดอายุกลางคัน)

---

## 2) การแบ่งงาน

| ใคร | ทำอะไร |
| --- | --- |
| **คุณ (decimo)** | ① ใส่ `FACEBOOK_APP_SECRET` ตัวจริงใน `.env` ② เปิด QuickTime แล้ว "New Screen Recording" ค้างไว้ (ผมกด start/stop เอง) ③ **กรอกรหัสผ่าน / ยืนยันตัวตนในกล่อง Facebook OAuth ทุกครั้ง** — ผมจะหยุดรอตรงนั้นแล้วบอกคุณ ④ ถ้ามี 2FA เป็นคนกดเอง |
| **ผม (Claude)** | รันแอพ, จัดหน้าจอ, กด record, คลิก demo ตามสคริปต์ทีละ step, ค้างจอให้ reviewer อ่านทัน, กด stop, ตั้งชื่อไฟล์, จัดคลิปลง `docs/screencasts/` |

> **ข้อจำกัดที่ต้องรู้:** computer-use ให้สิทธิ์ browser แค่ระดับ "read" (เห็นภาพ แต่คลิก/พิมพ์ไม่ได้) — ผมจะขับ browser ผ่าน **Claude in Chrome extension** แทน ถ้ายังไม่ได้ติดตั้ง ต้องติดตั้งก่อน ไม่งั้นตกไปที่แผน B: คุณเป็นคนคลิกตามที่ผมสั่งทีละ step

---

## 3) Setup ก่อนอัด (ทำครั้งเดียว)

- [ ] ยืนยัน `FACEBOOK_APP_SECRET` จริงถูกตั้งบน prod (studio.jts.co.th)
- [ ] เปิด https://studio.jts.co.th/demo/ ใน Chrome (โหมด incognito เพื่อเริ่มจาก logged-out)
- [ ] ⚠️ **log ฝั่ง prod ไม่ได้อยู่บนจอ** → Clip D ต้องหาทางแทน server log ด้วยอย่างใดอย่างหนึ่ง: **(a)** เปิด DevTools → Network โชว์ response ของ `POST /demo/api/v1/.../sync-profile` ที่คืน name+picture, หรือ **(b)** stream prod log ขึ้นจอ (`gcloud/firebase logs tail`) เคียงข้างเบราว์เซอร์ — **แนะนำ (b)** เพราะ log มีบรรทัดที่อ้าง permission ชัด ๆ อยู่แล้ว
- [ ] จัดจอ: **ซ้าย = แอพ (Chrome)** / **ขวา = terminal ที่ tail prod log**
- [ ] เปิดแท็บที่ 2 ค้างไว้ = **โพสต์จริงบนเพจ decimo.me** (ใช้พิสูจน์ผลใน clip 3)
- [ ] ซ่อน bookmark bar / ปิด notification / ตั้งความละเอียด ≥ 720p, ซูมเบราว์เซอร์ 110–125% ให้ตัวหนังสืออ่านออก
- [ ] ห้ามให้ token / app secret โผล่บนจอ (log redact ไว้แล้ว — แต่ตรวจ DevTools ปิดไว้ด้วย)
- [ ] **Dry run 1 รอบไม่อัด** เพื่อยืนยันว่า log `👤 [PROFILE] resolved customer identity` ขึ้นจริง (ถ้าเป็น `subcode 33` แปลว่าบัญชีลูกค้ายังไม่ใช่ Tester)

---

## 4) Shot list — 4 คลิป

ทุกคลิปเริ่มที่ **logged-out state** (กด Log out / เปิด incognito ใหม่) เพราะทุกคลิปต้องมี login flow เต็ม

### Clip A — `pages_read_engagement` (~60–75 วิ)
`screencast-pages_read_engagement.mp4`

1. หน้าแรกแอพ (เห็นชื่อแอพ + URL) — 3 วิ
2. **"Continue with Facebook"** → กล่อง OAuth ขึ้น → **ค้าง 3 วิให้เห็นรายการ permission** → *(คุณกดยืนยัน)* → grant สำเร็จ
3. Page picker แสดงเพจ **decimo.me** → เลือก → Connect *(นี่คือ `pages_show_list` dependency)*
4. แท็บ **Feed** → **+ Add post** → วางลิงก์โพสต์ทดสอบ → **Import**
5. **ค้างจอ 5 วิ** ที่ **เนื้อหาโพสต์ + รูป** ที่ดึงมาแสดงในแอพ ← หัวใจของ requirement ข้อ 3
6. สลับไป terminal ให้เห็น log การเรียก Graph API ดึง post

> Caption: "The app reads the Page's own post content via the Graph API (pages_read_engagement) and displays it in the dashboard."
> **ห้ามพูดถึงคอมเมนต์ในคลิปนี้** — เก็บไว้คลิป B

---

### Clip B — `pages_read_user_content` (~60–75 วิ)
`screencast-pages_read_user_content.mp4`

1. Login flow เต็ม (ซ้ำ) + เลือกเพจ
2. เปิดโพสต์ทดสอบที่ import ไว้ → เลื่อนลงไปที่ **คอมเมนต์ของ user จริง**
3. **ค้างจอ 5 วิ**: ชื่อ + รูป + ข้อความคอมเมนต์ + **badge เขียว "User comment"** + header *"X from Facebook users · read via pages_read_user_content"*
4. เทียบข้าง ๆ กับคอมเมนต์เดียวกันบนเพจ Facebook จริง (พิสูจน์ว่าไม่ใช่ mock)
5. *(optional, ตรง allowed usage)* กด **Delete** คอมเมนต์ทดสอบ 1 อัน → refresh เพจจริง → หายไป

> Caption: "The app reads user-generated comments on the Page (pages_read_user_content) and displays them in the app; the admin can also delete a user comment."

---

### Clip C — `pages_manage_engagement` (~75–90 วิ) ← คลิปที่โดน reject บ่อยสุด
`screencast-pages_manage_engagement.mp4`

1. Login flow เต็ม (ซ้ำ) + เลือกเพจ
2. เปิดโพสต์ทดสอบ → เลือกคอมเมนต์ของ user → กด **Reply** → **พิมพ์ข้อความให้เห็นทีละตัวอักษร** (เช่น "Thanks for reaching out! Our team will DM you shortly.") → ส่ง
3. **ค้างจอ**: คอมเมนต์ตอบกลับปรากฏในแอพ (badge Page/Admin)
4. **➡️ สลับไปแท็บเพจ Facebook จริง → กด Refresh → ค้างจอ 5 วิ ให้เห็นคอมเมนต์อันเดียวกันที่เพิ่งโพสต์อยู่บนเพจจริง** ← **requirement บังคับ ห้ามข้าม**
5. ของแถม (โชว์ allowed usage ที่เหลือ): **Like** คอมเมนต์ → **Hide** คอมเมนต์ → สลับไปเพจจริงยืนยัน hidden

> Caption: "The admin publishes a comment on the Page from inside the app (pages_manage_engagement). Switching to the live Facebook Page shows the newly published comment. The admin can also like and hide comments."

---

### Clip D — Business Asset User Profile Access (~75–90 วิ)
`screencast-business-asset-user-profile-access.mp4`

1. Login flow เต็ม (ซ้ำ) + เลือกเพจ — พูดว่า feature นี้เป็น app-level feature ไม่ใช่ OAuth scope
2. แท็บ **Inbox** → **"Load from Page"** → conversation ของลูกค้าโผล่ขึ้นมาแบบ **ยังเป็น `Customer <PSID>`** (ค้างจอให้เห็นว่า "ก่อน fetch" คืออะไร)
3. เปิด conversation → กด **"Sync Profile"**
4. สลับไป terminal — **ค้างจอ 6 วิ** ที่ log:
   ```
   🔎 [PROFILE] calling User Profile API (Business Asset User Profile Access)
       endpoint: https://graph.facebook.com/v25.0/{PSID}?fields=id,name,picture{url}
   👤 [PROFILE] resolved customer identity via Business Asset User Profile Access
       resolvedName: "..."  hasPhoto: true
   ```
5. กลับมาที่แอพ — **ชื่อจริง + รูปจริง** แทน PSID + badge **"FB Profile"** → **hover badge** ให้เห็น tooltip
6. เทียบกับโปรไฟล์จริงของบัญชีลูกค้า (พิสูจน์ว่าตรงกัน)

> Caption: "The app uses Business Asset User Profile Access to read the User fields (name, picture) of a customer who messaged the Page, and displays them in the support inbox so the agent knows who they are talking to. The data is used only for display in the admin inbox."

---

## 5) เช็คลิสต์ก่อน submit

- [ ] ทั้ง 4 คลิปมี **Facebook login + กล่อง permission เต็ม** ที่หัวคลิป
- [ ] Clip A เห็น **เนื้อหาโพสต์เพจ** แสดงในแอพ
- [ ] Clip B เห็น **คอมเมนต์ user** แสดงในแอพ
- [ ] Clip C เห็น **คอมเมนต์ที่ publish จากแอพ ปรากฏบนเพจ Facebook จริง** 🔴
- [ ] Clip D เห็น **log + ชื่อ/รูปจริง + badge**
- [ ] ไม่มี App Secret / access token เต็มโผล่บนจอ
- [ ] ≥ 720p, ตัวหนังสืออ่านออก, มี English caption (พากย์ไทยได้ถ้ามี caption)
- [ ] Use case description แต่ละ permission เขียนอ้าง **allowed usage ในตาราง §1** ตรงตัว
