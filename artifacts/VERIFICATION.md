# หลักฐานการตรวจ local — 2026-10-06

- Runtime: Node.js v20.17.0; test runner มาตรฐาน node:test
- `npm test`: tests 17, pass 17, fail 0, skipped 0
- `npm run check`: PASS server/client syntax, manifest, public API surface, client safety, design token mapping
- `npm run preview:build`: สร้าง HTML รวม partials โดยไม่มี mock Google
- `audit_project.py` strict: ดู premium-audit.json; errors 0, warnings 0
- Official designmd lint: exit 0; errors 0, warnings 0, infos 2 (token summary และ components intentionally omitted)

ข้อจำกัด: server tests ใช้ Google service doubles, client tests ใช้ DOM/transport doubles ไม่มี real Google integration หรือ browser rendering ในหลักฐานนี้ Browser tool ปฏิเสธ file:// ตามนโยบาย ไม่มีการใช้วิธีอื่นเลี่ยงข้อจำกัด

ไฟล์ preview ถูก ignore เพราะสร้างซ้ำจาก src ได้ ไม่มีข้อมูล/secret จริงใน tests หรือ artifacts เหล่านี้
