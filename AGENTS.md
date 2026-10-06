# กติกาโปรเจกต์

- อ่าน MEDICAL_STOCK_REQUIREMENTS.md, MEDICAL_STOCK_CODEX_PLAN.md, docs/SIMPLE_SCOPE.md และ docs/CURRENT_STATE.md ก่อนทำงาน คำขอล่าสุดของผู้ใช้ให้ลดความซับซ้อนมีลำดับสูงกว่าแผนเดิม ทำเฉพาะงานที่ผู้ใช้สั่ง
- เป้าหมายแรกคือจดรับเข้า/จ่ายออกและดูยอดรวมตามชนิดอุปกรณ์สำหรับทีม 7–8 คน ไม่สร้างทะเบียนรายเครื่อง ไม่เพิ่มระบบสิทธิ์หลายระดับหรือโครงสร้างพื้นฐานที่ไม่จำเป็น
- Apps Script HTML Service + HTML/CSS/JavaScript + Google Sheets เท่านั้น ไม่เพิ่ม framework/server/บริการเสียเงิน
- Node ใช้ตรวจ local เท่านั้น ไม่มี npm imports ใน Apps Script runtime
- ตามคำขอล่าสุด stock web app ใช้ลิงก์โดยไม่ต้องกรอกรหัสทีม; endpoint stock ไม่ตรวจ credential แล้ว และ doGet ไม่ส่งข้อมูล Sheet หรือ secret ใน HTML (POC เก่ายังแยกจากหน้า stock)
- secret อยู่ Script Properties เท่านั้น ห้าม Git, HTML, URL, log และ client storage
- ฟังก์ชันภายในลงท้าย `_` เพื่อไม่ให้ google.script.run เรียกได้
- การเขียนทั้งหมดผ่าน script เดียว ใช้ getScriptLock แบบ timeout และ flush ก่อนปลดใน finally
- stock ใช้ movement แถวเดียวต่อรายการ ไม่แก้หรือลบประวัติ; ไม่เชื่อยอดจาก client หรือ cache
- การบันทึก stock ต้องกันยอดติดลบและรายการซ้ำโดยใช้ request_id; ทำ validation เท่าที่จำเป็นกับการรับ/จ่ายจริง อย่าสร้างชั้น abstractions เพื่อความซับซ้อนที่ยังไม่มี
- setup ไม่ล้างข้อมูล ไม่ seed ซ้ำ ไม่แชร์ Sheet ให้ผู้ใช้แก้โดยตรง
- Phase 0 เขียนได้เฉพาะ marker คงที่ใน POC_Checks ของไฟล์ทดสอบ ไม่สร้าง master หรือ movement จริง
- meaningful local tests ไม่ใช่หลักฐานว่า Google services, lock จริง หรือ deployment ทำงานแล้ว
- อัปเดต CURRENT_STATE.md ด้วยคำสั่งและผลที่รันจริง รวมงานที่ยังไม่ได้ทดสอบ
