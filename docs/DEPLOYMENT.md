# คู่มือ Phase 0: ตั้งค่าและทดสอบ Google จริง

สถานะล่าสุด: หน้า preview POC จาก Apps Script **standalone ใหม่ เวอร์ชัน 2** เปิดได้แล้ว มีลิงก์ใน `docs/ACCESS_RESULTS.private.md` (gitignored) Script Properties ต้องตั้งในโปรเจกต์ standalone ใหม่นี้; Sheet ทดสอบเป็นไฟล์เดิม **ไม่ต้องสร้างไฟล์ใหม่ตามข้อ 1–2 ซ้ำ**. Manifest ปัจจุบันใช้ `oauthScopes: []` เพื่อยืนยันว่า UI เปิดได้ ยังต้องคืน scopes สำหรับ Sheets และให้เจ้าของ authorize ก่อนทดสอบการอ่าน/เขียนจริง

## 1. เตรียมด้วยบัญชีเจ้าของ

1. สร้าง Google Sheets **ไฟล์ทดสอบใหม่** ชื่อ “คลังอุปกรณ์ — POC” อย่าใช้ไฟล์คลังจริง ไม่แชร์ให้บัญชีที่สองหรือเปิด anyone-with-link
2. ใน File → Settings ตั้ง Time zone เป็น `(GMT+07:00) Bangkok` (Asia/Bangkok) เก็บ locale ตามที่ทีมใช้
3. คัดลอก Spreadsheet ID ซึ่งอยู่ระหว่าง `/d/` กับ `/edit` ใน URL เก็บไว้ตั้ง config ไม่ต้องใส่ Git
4. สร้าง Apps Script โปรเจกต์ใหม่ด้วยบัญชีเดียวกัน ชื่อ “Medical Stock — POC” ใช้โปรเจกต์เดียว ไม่ใช้ script อื่นเขียนแท็บนี้

## 2. ใส่โค้ดด้วยมือ (ไม่ต้องมี clasp)

ใน Apps Script editor สร้าง Script ตามชื่อและคัดลอกเนื้อหาไฟล์เหล่านี้:

- Main.gs
- Config.gs
- Schema.gs
- Repository.gs
- Setup.gs

สร้าง HTML ตามชื่อ Index, Styles, Client แล้วคัดลอกไฟล์ `.html` ทั้งหมด รวม `<style>` และ `<script>` ที่อยู่ใน partials ด้วย ไม่คัดลอก preview ไป deploy

ถ้า Code.gs เป็นไฟล์เริ่มต้นว่าง ให้ใช้แทน Main.gs โดยวางโค้ด Main เพียงครั้งเดียว ห้ามให้มี doGet ซ้ำ หาก Code.gs มีโค้ดเดิมอย่าเขียนทับ ให้ใช้โปรเจกต์ใหม่สำหรับ POC

ที่ Project Settings เปิด “Show appsscript.json manifest file in editor” แล้วคัดลอก `src/appsscript.json` ลง manifest ตั้งเขตเวลา Script เป็น Asia/Bangkok

Scopes ของเฟสนี้มี spreadsheets (อ่านและเขียน Sheet ที่ owner เข้าถึงได้) และ userinfo.email (ทดลองอ่านอีเมล) ไม่มี Drive backup, mail, billing หรือ OAuth client ที่สร้างเอง อย่าเพิ่ม scope จากงานเฟสถัดไปล่วงหน้า

## 3. ตั้ง Script Properties

Project Settings → Script Properties → Add script property:

| ชื่อ | ค่า |
|---|---|
| APP_ENV | `poc` |
| SPREADSHEET_ID | ID ของไฟล์ทดสอบจากข้อ 1 |
| TEAM_ACCESS_CODE | รหัสทีม 5–256 ตัวอักษร ตั้งใน Script Properties โดยตรง ไม่บันทึกใน Git |

เจ้าของใส่รหัสเองใน Script Properties อย่าใส่ใน source, HTML, URL, log, ภาพหน้าจอ หรือแชต ไม่มีค่ารหัสเริ่มต้นที่ deploy ได้ แชร์รหัสกับผู้ทดสอบผ่านช่องทางภายในที่ไว้ใจได้

เลือก `setupPoc_` ใน editor แล้ว Run ด้วยบัญชีเจ้าของ อนุญาตเฉพาะโปรเจกต์และ scope ที่ตรวจแล้ว หากพบคำเตือนที่ต้องยืนยันความเชื่อถือ ให้เจ้าของตรวจและดำเนินการเอง

เปิด Sheet ตรวจว่ามี `POC_Checks` หัวคอลัมน์ 4 ช่องตาม DATA_SCHEMA และยังไม่มีแถวรายการ รัน setup อีกครั้งแล้วหัวตารางไม่เพิ่มและข้อมูลไม่หาย ฟังก์ชันลงท้าย `_` ตั้งใจให้เรียกจาก editor ไม่ใช่หน้าเว็บ

## 4. Deploy ทดสอบด้วยสองบัญชี

1. Deploy → New deployment → Web app
2. Execute as: **Me / บัญชีเจ้าของ**
3. Who has access: เลือกสิทธิ์แคบที่สุดที่ **บัญชีที่สองจริง** ใช้ได้ เช่นภายใน domain หากทั้งสองอยู่ domain เดียว หรือผู้ใช้ที่มีบัญชี Google หากมีตัวเลือกนั้น ตัวเลือกขึ้นกับบัญชี/นโยบายองค์กร ให้จดข้อความที่เห็นจริง
4. ถ้ามีเพียงตัวเลือกเข้าถึงกว้างกว่า ให้เจ้าของพิจารณาก่อนเผยแพร่ และยังคงตรวจรหัส server เสมอ หากนโยบายไม่อนุญาตให้หยุดและบันทึกข้อจำกัด ห้ามแก้โดยเปิดเขียนไม่มีรหัส
5. Deploy แล้วคัดลอก URL ที่ลงท้าย **`/exec`** ให้ผู้ทดสอบผ่านช่องทางภายใน `/dev` ใช้ทดสอบของผู้แก้ Script เท่านั้น ไม่ใช่หลักฐานว่าบัญชีทั่วไปเข้าได้
6. เปิด URL ด้วยบัญชีเจ้าของ และเปิดอีกโปรไฟล์เบราว์เซอร์ที่ลงชื่อเข้าใช้เฉพาะบัญชีที่สอง ไม่ใช้หลายบัญชีปนในโปรไฟล์เดียว
7. อย่าแชร์ Sheet หรือ Script ให้บัญชีที่สอง ตรวจว่าเปิด Sheet โดยตรงไม่ได้ แต่เปิด web app แล้วใส่รหัสถูกสามารถอ่านและเขียน marker ได้

หน้าทดสอบใช้รหัสทีมเสมอ อีเมลที่แสดงเป็นเพียงผลสังเกตจาก Session.getActiveUser ไม่ใช่การใช้สิทธิ์ตามอีเมล ไม่ใช้ getEffectiveUser แทนผู้เข้าเว็บ หากไม่แสดงอีเมลให้บันทึก “ว่าง” ไม่กรอกแทนให้ดูเหมือนผ่าน

## 5. ตรวจรับและบันทึกผล

ทำตาม TEST_PLAN และกรอก ACCESS_TEST_RESULTS โดยใช้ชื่อ “เจ้าของ / บัญชีที่สอง” ไม่ต้องใส่อีเมลเต็มใน Git ข้อมูลส่วนตัวหรือ URL จริงเก็บใน `docs/ACCESS_RESULTS.private.md` ซึ่งถูก ignore แล้ว **ห้ามบันทึกรหัสทีมแม้ในไฟล์นี้**

ขั้นต่ำ: รหัสผิดไม่อ่าน/เขียน, รหัสถูกอ่านได้, ทั้งสองบัญชีเขียน marker ได้, บัญชีสองไม่มีสิทธิ์ตรงบน Sheet, กดซ้ำไม่เพิ่มแถว, setup ซ้ำไม่เสียข้อมูล, บันทึกอีเมลที่ได้/ไม่ได้และการเลือก access จริง

ปุ่ม “บันทึกรายการทดสอบ” ใช้ ID เดิมจนกด “เริ่มคำขอทดสอบใหม่” ซึ่งเปิดหลัง server ยืนยันแล้ว เมื่อ timeout ให้กด “ตรวจผลคำขอเดิม” หรือบันทึกซ้ำ เก็บ request ID ใน sessionStorage ของแท็บ ไม่เก็บรหัสทีม หากปิดแท็บ/ล้าง storage อาจเสีย ID ให้เจ้าของตรวจ Sheet ก่อนทำรายการใหม่; นี่เป็นข้อจำกัด POC ที่ต้องออกแบบ recovery ให้ครบใน Phase 2–3

## 6. อัปเดตและหยุดใช้งาน

บันทึกโค้ดอย่างเดียวไม่เปลี่ยน `/exec` ที่ผูกเวอร์ชันเก่า ต้อง Deploy → Manage deployments → Edit → Version: New version แล้ว Deploy อีกครั้ง จดเวอร์ชันในผลทดสอบ

ถ้าต้อง rollback เลือกเวอร์ชันที่ตรวจแล้วของ deployment เดิม; ไม่ลบแถวใน Sheet รหัสทีมเปลี่ยนได้ใน Script Properties โดยผู้ดูแล ถ้ารั่วให้เปลี่ยนก่อนทดสอบต่อ เมื่อเลิก POC ให้ปิด/เก็บ deployment ผ่าน Manage deployments และเก็บหลักฐาน ห้ามลบข้อมูลคลังจริง

## 7. ทางเลือก clasp สำหรับภายหลัง

เครื่องนี้มี clasp 3.4.1 และ login แล้ว ใช้ push/deploy เวอร์ชัน 1 สำเร็จ คู่มือด้านล่างเก็บไว้สำหรับเครื่องใหม่ ไม่ต้อง login หรือสร้างโปรเจกต์ซ้ำ ไม่มี Cloud billing

เมื่อเจ้าของพร้อมเชื่อมบัญชี ให้ตรวจเวอร์ชัน clasp/ข้อกำหนด Node ตามเอกสารทางการ ติดตั้ง `@google/clasp` จาก npm เปิด Apps Script API ใน user settings และทำ `clasp login` ด้วยตนเอง

คัดลอก `.clasp.example.json` เป็น `.clasp.json` ใส่ Script ID ของ **โปรเจกต์ POC ใหม่** และใช้ `rootDir: "src"` ตรวจ `clasp status` ให้มีเฉพาะ `.gs`, `.html`, `appsscript.json` ใน src ก่อน `clasp push` ไม่มีการใช้ `--force` หรือ push อัตโนมัติ หาก remote มีโค้ดเดิม ให้สำรองในไดเรกทอรีแยกและเทียบก่อน ไม่ pull ทับงานใน repo

`.clasp.json` และ `.clasprc.json` ถูก ignore; ไฟล์ credential ที่ clasp สร้างนอก repo ก็ต้องเก็บเป็นส่วนตัว Sync ไม่ใช่ deploy ให้ทำขั้นตอน deploy และทดสอบสองบัญชีเหมือนเดิม

## อ้างอิงทางการที่ตรวจ 6 ตุลาคม 2026

- [Web apps: execute-as, deploy และข้อจำกัด /dev](https://developers.google.com/apps-script/guides/web)
- [Session: อีเมลอาจไม่พร้อมใช้เมื่อ execute as owner](https://developers.google.com/apps-script/reference/base/session)
- [HTML communication: asynchronous calls และ private functions `_`](https://developers.google.com/apps-script/guides/html/communication)
- [google.script.run: รูปแบบข้อมูลและ success/failure handlers](https://developers.google.com/apps-script/guides/html/reference/run)
- [Script Properties](https://developers.google.com/apps-script/guides/properties)
- [Lock และ flush ก่อนปลด](https://developers.google.com/apps-script/reference/lock/lock)
- [clasp](https://developers.google.com/apps-script/guides/clasp)

เอกสารอธิบายพฤติกรรม API แต่ไม่ใช่หลักฐานว่า deploy ของเราผ่าน ต้องบันทึกผลจริงแยกเสมอ
