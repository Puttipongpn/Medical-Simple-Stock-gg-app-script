# พฤติกรรมและเจ้าของ UI — POC

แนวภาพและ token อยู่ [DESIGN.md](../DESIGN.md) ไฟล์นี้เก็บผลต่อ UI จากแผนหลัก ส่วน 4–5 เท่านั้น ไม่มีการเปลี่ยน business policy

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | src/Index.html access-form + src/Client.html validateCredential/controls | แผนหลัก ส่วน 5 | native password, novalidate | tests/client.test.cjs; browser รอ |
| Scrollbar | src/Styles.html global baseline | DESIGN.md | forced-colors system defaults | static audit; computed style รอ browser |
| Toast | src/Client.html status + Index.html #status | แผนหลัก ส่วน 7 POC | persistent inline info/error, ไม่ใช้ toast popup | tests/client.test.cjs; live region รอ browser |

Table Selection, Select/Listbox, Date picker, CRUD navigation ไม่เกี่ยวกับ POC นี้ ไม่สร้างขึ้นล่วงหน้า ไม่มี sibling screen สำหรับเปรียบเทียบ

## การตอบสนอง

| การทำงาน | ขณะรอ | เมื่อสำเร็จ | เมื่อผิดพลาด |
|---|---|---|---|
| ตรวจการเชื่อมต่อ | disabled actions + status | แสดง email ที่ได้จริง, เวลา, จำนวนรายการ | ข้อความไทย; AUTH ผูกกับช่องรหัส |
| บันทึก marker | เก็บ UUID ก่อน RPC, disabled | แสดง probe ID เดิม/ใหม่ | timeout 20 วินาทีไม่ทิ้ง UUID; retry/lookup |
| ตรวจผลเดิม | ไม่สร้าง ID | พบ probe แล้วจึงเริ่มใหม่ได้ | ไม่พบให้ใช้ ID เดิมต่อ อาจมีคำขอระหว่างทาง |
| เริ่มคำขอใหม่ | ทำได้เมื่อยืนยัน probe แล้ว | ล้าง UUID เดิมใน browser ไม่ลบ Sheet | storage ล้มไม่เปลี่ยนสถานะ |
| ล้างรหัส | ไม่ให้ระหว่างคำขอ | mask กลับ/คืน focus เก็บ UUID ไว้ | ไม่มี RPC |

ข้อมูลไม่ชัดเจนไม่ให้เริ่ม request ใหม่ ผลตอบช้าของคำขอเก่าไม่ทับผลใหม่ ไม่ polling รหัสทีมอยู่ใน input memory เท่านั้นจนผู้ใช้ล้าง/ปิดหน้า ใช้ sessionStorage เฉพาะ request ID; ปิดแท็บอาจเสีย ID ให้ตรวจ Sheet ก่อนเริ่มใหม่

ไม่มี draft ธุรกรรมจริง/ข้อมูล stock ให้สูญหายในหน้าเดียวนี้ จึงไม่ใช้ unsaved-change dialog การแสดงผลข้อมูลทั้งหมดใช้ textContent และไม่มี credential ใน URL

Locale: th, Gregorian display + Asia/Bangkok, จำนวนใช้ Intl.NumberFormat('th-TH') Browser serialization รับส่งเฉพาะ primitives/plain objects ไม่มี Date object ผ่าน RPC

## ขอบเขตการตรวจ

Local DOM doubles พิสูจน์ callback/state บางส่วนได้ ไม่ยืนยัน accessibility tree, contrast ที่ render จริง, narrow viewport หรือการทำงาน Google ต้องตรวจตาม TEST_PLAN บน `/exec` ทั้งสองบัญชี
