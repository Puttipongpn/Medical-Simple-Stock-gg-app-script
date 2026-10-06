# Schema draft — ยังไม่สร้างตารางคลังใน Phase 0

อ้างอิง [แผนหลัก ส่วน 3](../MEDICAL_STOCK_CODEX_PLAN.md) และ `src/Schema.gs`

| Sheet | คอลัมน์ตามลำดับ |
|---|---|
| Items | item_id, item_code, name, category, unit, minimum_stock, active, created_at |
| Departments | department_id, name, active |
| Operators | operator_id, name, active, role |
| Movements | movement_id, request_id, payload_hash, occurred_date, created_at, item_id, item_code_snapshot, item_name_snapshot, unit_snapshot, type, quantity_delta, department_id, department_name_snapshot, source, reference_no, requester, operator_id, operator_name_snapshot, note, reverses_movement_id |

## ชนิดและข้อจำกัดสำหรับ Phase 1–2

- `*_id`: UUID string; foreign key ต้องอ้าง master ที่มีอยู่ ยกเว้นช่องที่ไม่เกี่ยวข้องกับประเภทรายการซึ่งใช้ข้อความว่าง
- `item_code`, `reference_no`: plain text ไม่แปลงเป็นเลข; รหัสอุปกรณ์ trim และตรวจไม่ซ้ำที่ server ภายใต้ lock กติกาตัวพิมพ์ต้องกำหนดก่อน Phase 1
- `minimum_stock`: จำนวนเต็มปลอดภัย >= 0; `quantity_delta`: จำนวนเต็มปลอดภัย != 0; ผลรวมทุกช่วงต้องเป็นจำนวนเต็มปลอดภัยและไม่ติดลบ
- `active`: boolean; `role`: metadata ยังไม่ใช้ authorize เมื่อชื่อผู้บันทึกไม่ได้ยืนยัน
- `occurred_date`: plain text YYYY-MM-DD ใน Asia/Bangkok; `created_at`: server ISO 8601 UTC string แปลงเป็นเวลากรุงเทพฯ ตอนแสดง
- `type`: OPENING / RECEIVE / ISSUE / ADJUST / REVERSAL
- `request_id`: unique สำหรับเจตนาทำรายการ; `payload_hash`: hash ของ canonical validated payload ต้องกำหนด field/order/normalization ก่อน engine
- `reverses_movement_id`: ว่างถ้าไม่ใช่ REVERSAL; อ้างต้นทางครั้งเดียว ไม่กลับ REVERSAL
- Snapshot ต้องเก็บค่าขณะบันทึก ไม่ตามชื่อ master ปัจจุบัน; unit ที่มีประวัติแก้ไม่ได้
- ข้อความจากผู้ใช้ต้องเก็บแบบ literal ไม่ใช่ formula; CSV UTF-8 BOM และป้องกันสูตรเป็นงาน Phase 5

## ตารางที่สร้างจริงใน POC

ไฟล์ทดสอบแยกต่างหาก มีแท็บ `POC_Checks`:

| คอลัมน์ | รูปแบบ | ที่มา |
|---|---|---|
| probe_id | UUID v4 string | Utilities.getUuid ฝั่ง server |
| request_id | UUID v4 string | browser เก็บใน sessionStorage ก่อนส่ง |
| created_at | ISO 8601 UTC string | server |
| kind | CONNECTION_CHECK | ค่าคงที่จาก server |

ไม่มีชื่อบุคคล รหัสทีม อีเมล ข้อความอิสระ หรือยอดคลังในแท็บนี้ เขียนทั้งแถวครั้งเดียว ตั้ง plain text ก่อนเขียน ตรวจสูตร หัวคอลัมน์ แถวไม่ครบ timestamp และ ID ซ้ำก่อนอ่าน/เขียน

ทุก POC payload เหมือนกันคือ marker คงที่ จึงไม่ใช้ payload_hash ที่นี่ **ไม่ได้แปลว่า stock engine จะตัด payload_hash ได้** การอ่านและเขียน POC ใช้ script lock เพื่อให้สถานะที่อ่านสอดคล้องกัน ไม่อ้างว่า Sheets เป็น ACID

setup สร้างเฉพาะ POC_Checks/หัวตาราง ถ้าตารางมีข้อมูลแล้วตรวจโดยไม่เขียนทับ ไม่ลบ Sheet1 หรือชีตอื่น และปฏิเสธไฟล์ที่มีชื่อ master/Movements เพื่อกันใช้ผิดไฟล์
