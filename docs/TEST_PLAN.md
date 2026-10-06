# แผนตรวจรับ Phase 0

## Local (ไม่มีการเรียก Google)

รัน `npm test` และ `npm run check` โดย Node >=20 ไม่มีการติดตั้ง dependencies

| พื้นที่ | สิ่งที่ตรวจ |
|---|---|
| Config/auth | config ไม่ครบปิดการเข้าถึง; ทุก data endpoint ปฏิเสธ credential ผิดก่อนเปิด Sheet |
| Setup | สร้างเฉพาะแท็บทดสอบ; ซ้ำไม่ล้าง/เพิ่มข้อมูล; ปฏิเสธไฟล์คลังและ header ผิด |
| Data | อ่านตารางว่างได้; email ว่าง/exception ไม่สมมติตัวตน; คืนเวลา string |
| POC idempotency | retry/lookup ได้ probe เดิม; flush ล้มหลังเขียนแล้ว retry ไม่เพิ่มแถว |
| Integrity | สูตร ID ซ้ำ แถวไม่ครบ วันผิด/Date object และ request ID ผิดถูกปฏิเสธ |
| Lock adapter | timeout ไม่เขียน; finally ปลด lock เมื่อ write/flush ล้ม; flush ก่อน release |
| Client doubles | validation, loading/กดซ้ำ, timeout, stale callback, sessionStorage/reload, lookup not-found, retry ID เดิม, AUTH error, clear secret |
| Static | parse .gs/Client, manifest/timezone, public surface และ text rendering basics |

ไม่เรียก balance/reversal/report tests ว่าผ่าน เพราะยังไม่มี engine เหล่านี้ ต้องเพิ่ม meaningful tests ในเฟสที่ทำ logic นั้น และ concurrency จริงต้องทดสอบบน Apps Script

## Google จริง — ต้องทำทั้งสองบัญชี

1. เตรียม deployment ตาม DEPLOYMENT.md ใช้ Sheet ทดสอบที่ไม่แชร์ให้บัญชีสองและ Script เดียว
2. setup ครั้งแรกและซ้ำ: มี header เดียว ข้อมูลเดิมไม่หาย ไม่มี master/Movements
3. ทั้งสองบัญชีเปิด `/exec` ในคนละโปรไฟล์ได้ จด access/execute-as จริง
4. เว้นรหัส/ใส่รหัสผิดแล้วกดอ่านและเขียน: ปฏิเสธ ไม่มีข้อมูล/แถวเพิ่ม
5. ใส่รหัสถูก กดอ่าน: timezone ตรง อ่าน Sheet ได้และจำนวน marker ตรง
6. จด Session email ตามผลจริง อาจว่างได้ อย่าใช้ owner email แทนบัญชีที่สอง
7. แต่ละบัญชีกดเขียน: ได้ probe ID เจ้าของตรวจว่าเป็นแถวเดียวใน POC_Checks; ไม่มีสิทธิ์แก้ Sheet โดยตรงสำหรับบัญชีสอง
8. กดเขียนซ้ำก่อนกดเริ่มคำขอใหม่: probe ID เดิม จำนวนแถวไม่เพิ่ม; lookup พบรายการเดิม
9. จำลอง offline/เน็ตช้าในเบราว์เซอร์ระหว่างส่ง marker แล้วต่อเน็ต: UI ไม่ค้างเกิน timeout ตรวจผลหรือลองซ้ำ ID เดิม ไม่เพิ่มแถวซ้ำ
10. Refresh แท็บเดิมหลัง timeout: request ID ยังอยู่ ต้องใส่รหัสทีมใหม่และตรวจผลก่อนเริ่มรายการใหม่
11. สองบัญชีส่ง marker คนละ request พร้อมกัน: มีสองแถวสมบูรณ์ ไม่สูญหาย; ตรวจเวลาของ executions จริง ไม่ใช้ mock อ้างว่า Google lock ผ่าน
12. ทดสอบ direct RPC จาก DevTools ภายในหน้า Apps Script iframe ด้วยรหัสผิด เช่น `google.script.run.withSuccessHandler(console.log).writePocProbe('incorrect', crypto.randomUUID())` ต้องได้ AUTH; ห้ามใช้ console.log กับรหัสจริง
13. ลองเรียก setupPoc_ จากหน้าเว็บ: ต้องไม่เข้าถึง private function ไม่สร้าง/เปลี่ยนข้อมูล
14. บันทึกผลใน ACCESS_TEST_RESULTS รวมหลักฐานโดยปิดบังข้อมูลส่วนตัวและ secret

## Browser/UI ที่ต้องตรวจด้วยหน้า deploy จริง

- คอมและมือถือ (เช่น 1280px และ 390px): ไม่มีเนื้อหาล้น ตัด UUID ไม่ได้ ต้องอ่านเต็มได้
- Tab เข้าช่องรหัส/ปุ่มตามลำดับ focus ชัด Enter ส่งฟอร์มได้ ปุ่มมีชื่อภาษาไทย
- รหัส masked เริ่มต้น show/hide มีสถานะ ล้างรหัสได้ และไม่อยู่ใน local/sessionStorage
- ผล loading, empty, success, auth failure, network error และ timeout มีข้อความและ live region
- ลองจำนวน/ข้อความยาว zoom 200% และ forced colors; ไม่มีการซ่อน action
- หน้าตา responsive ยังไม่ผ่านการตรวจด้วยเครื่องมือ browser ในรอบ local นี้ ดู CURRENT_STATE

## เกณฑ์ปิด Phase 0

โค้ด/เอกสาร local พร้อมได้แม้ไม่มีบัญชี แต่สถานะ integration ต้องคง “รอเจ้าของบัญชี” จนเปิดจากบัญชีที่สอง อ่าน/เขียนผ่านเว็บได้จริง โดยไม่แชร์ Sheet พร้อมบันทึกวิธี access และข้อจำกัด ห้ามเริ่ม Phase 1 เอง
