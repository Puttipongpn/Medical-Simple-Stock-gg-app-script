# สถานะปัจจุบัน

## README สำหรับผู้พัฒนาเอง (เอกสารเท่านั้น)

ปรับ `README.md` จากคู่มือ POC เก่าเป็นคู่มือ stock web app ปัจจุบัน: แผนที่ไฟล์, ลำดับแก้–ทดสอบ–`clasp push --force`–`clasp deploy -i` เพื่อคง URL เดิม, วิธีแก้ใน Apps Script editor และซิงก์กลับเครื่อง, การตรวจรับและย้อนเวอร์ชัน, รวมทั้งกติกาข้อมูลที่ต้องรักษา ตรวจคำสั่งจาก `clasp --help`/`clasp deploy --help` บนเครื่องจริง และ `npm run check` ผ่าน รอบนี้แก้เอกสารเท่านั้น **ไม่ได้ push, deploy หรือทดสอบ Google services เพิ่ม**

## เปลี่ยนข้อความปุ่มเป็น Reload Data (stock web app version 10)

ผู้ใช้แก้ `StockIndex.html` ใน Apps Script editor แล้วถามวิธี deploy ตรวจ `clasp pull` ลงพื้นที่ชั่วคราวแบบไม่ทับ source บนเครื่อง พบว่า HEAD บน Google ยังเป็น “แสดงข้อมูล” เหมือนบนเครื่อง จึงแก้ source หลัก `src/StockIndex.html` เป็น “Reload Data” ตามข้อความที่ผู้ใช้ระบุ `npm run check` ผ่าน จากนั้น `clasp push --force` สำเร็จ 13 ไฟล์, redeploy URL stock เดิมเป็น version 10 และเปิด `/exec` ใน Codex in-app browser เห็นปุ่ม “Reload Data” จริง **ไม่ได้กดบันทึกหรือแก้ข้อมูล stock ในรอบนี้**

## ปรับรายงาน/ประวัติและเปิดใช้ด้วยลิงก์ (stock web app version 9)

ตามคำขอล่าสุด ซ่อนคอลัมน์ยอดต้นช่วงจากรายงาน (server ยังคำนวณไว้เพื่อให้ “คงเหลือ” ณ วันสิ้นสุดช่วงถูกต้อง), เปลี่ยนหัวคอลัมน์เป็น “รายการที่ยกเลิก” และ “คงเหลือ”, เปลี่ยนปุ่มในประวัติเป็น “ยกเลิก” และคำอธิบายที่เกี่ยวข้อง หน้า stock ไม่มีช่องรหัสทีม โหลดข้อมูลเมื่อเปิดหน้า และ public stock endpoints ไม่ตรวจรหัสอีกแล้ว `APP_ENV`/`SPREADSHEET_ID` ยังต้องตั้งใน Script Properties; POC เก่ายังคง code path ของตัวเองและไม่ได้เป็นหน้าใช้งานปัจจุบัน Deployment เดิมตั้ง `ANYONE_ANONYMOUS`/`USER_DEPLOYING` อยู่แล้ว ผู้มีลิงก์จึงอ่านและบันทึก stock ผ่านบัญชีเจ้าของได้

ผล local จริง: `npm test` ผ่าน 33/33 และ `npm run check` ผ่าน ตรวจกรณีไม่มี Script Property รหัสทีม, การเรียก endpoint แบบไม่มี credential, ข้อความรายงานและปุ่มยกเลิก รวมทั้งกติกา stock เดิม `clasp push --force` สำเร็จ 13 ไฟล์และ redeploy URL stock เดิมเป็น version 9 แล้ว เปิด URL จริงใน Codex in-app browser แบบไม่มีรหัสทีม: หน้าโหลดข้อมูลยอดคงเหลือสำเร็จ กดรายงานช่วงวันที่แล้วอ่านข้อมูล Sheet ได้จริง เห็นหัวคอลัมน์ใหม่ครบ และหน้า “ประวัติ” เห็นปุ่ม “ยกเลิก” **ยังไม่ได้บันทึก/ยกเลิกรายการจริงผ่านหน้าเว็บ version 9 และยังไม่ได้ทดสอบบัญชีจริงสองบัญชี**

## ปรับความเร็วการอัปเดตข้อมูล (stock web app version 8)

ตามผลจากผู้ใช้ว่าช้าทั้งหลังบันทึกเองและรอเห็นรายการของผู้อื่น ปรับ `saveItem`, `saveMovement`, `reverseMovement` ให้ส่ง snapshot ที่คำนวณจาก state ที่ตรวจภายใต้ script lock กลับพร้อมผลบันทึก หน้าเว็บจึงแสดงยอด/ประวัติจากคำตอบเดียว ไม่ต้องเรียก `listStock` ซ้ำหลังเขียน ลดการอ่าน Items/Movements ซ้ำใน write endpoint โดยนำ Sheet handle ที่อ่านตรวจแล้วกลับมาใช้ ยังคงเขียน movement หนึ่งแถว, request ID กันซ้ำ, ตรวจยอดที่ server, flush ก่อนปลด lock และไม่มี stock cache สำหรับตัดสินการจ่าย

หน้าเว็บตรวจข้อมูลใหม่ทุก 30 วินาทีเมื่อแท็บเปิดอยู่และโหลดข้อมูลสำเร็จแล้ว; ไม่ตรวจอัตโนมัติขณะกำลังส่งคำขอหรือมีรายการที่ยังไม่ทราบผล และปุ่ม “แสดงข้อมูล” ยังใช้ตรวจทันทีได้ การตรวจจากคนอื่นยังต้องรอ RPC และการอ่าน Sheet; 30 วินาทีเป็นช่วงเริ่มต้นที่เลือกเพื่อให้ 7–8 คนเห็นการเปลี่ยนแปลงเร็วขึ้นโดยไม่อ่าน Sheet ถี่เกินจำเป็น

ผล local จริง: `npm test` ผ่าน 32/32 และ `npm run check` ผ่าน; เพิ่ม test ว่า write response มี snapshot ถูกต้องและไม่อ่าน Sheet รอบที่สาม รวมทั้ง UI ไม่ยิง `listStock` ซ้ำหลังบันทึก และการตรวจอัตโนมัติข้ามแท็บข้ามรายการที่ยังไม่ทราบผล `clasp push --force` สำเร็จ 13 ไฟล์และ redeploy ลิงก์ stock เดิมเป็น version 8; `clasp deployments` ยืนยันเวอร์ชัน **ยังไม่ได้วัดเวลา/ทดสอบการอัปเดตสองบัญชีบน Google จริงในรุ่นนี้**

## ขั้นถัดไปตามแผน: กลับรายการที่บันทึกผิด (stock web app version 6)

ผู้ใช้ยืนยันว่าการเพิ่มอุปกรณ์ชิ้นที่สอง รับเข้า/จ่ายออก และรายงานใน version 5 ใช้งานได้บน Google จริง จึงเดินขั้นถัดไปตาม [NEXT_STEPS.md](NEXT_STEPS.md) เพิ่มการกลับรายการแบบ append-only โดยบันทึก movement ใหม่หนึ่งแถว `REVERSAL` ที่มี delta ตรงข้ามกับรายการต้นทาง เก็บ UUID ของรายการต้นทางใน payload JSON เดิม จึงไม่ต้องแก้ schema หรือแตะ movement เก่า Server ตรวจรหัสทีม, script lock, request ID ซ้ำ, กลับต้นทางได้ครั้งเดียว, ห้ามกลับรายการกลับ และห้ามทำยอดติดลบ รายงานเพิ่มคอลัมน์ “กลับรายการสุทธิ” เพื่อให้สูตรยอดปลายช่วงตรงกับ movement ทุกชนิด

ผลจริงรอบนี้: `npm test` ผ่าน 29/29 และ `npm run check` ผ่าน; `clasp push --force` สำเร็จ 13 ไฟล์; redeploy URL stock เดิมเป็น version 6 สำเร็จ; เปิดหน้า `/exec` ใน in-app browser เห็นคอลัมน์ “แก้ไข” ในประวัติและ “กลับรายการสุทธิ” ในรายงาน **ยังไม่ได้ใช้รหัสทีมจริงเพื่อกดกลับรายการหรืออ่านผล Sheet หลัง version 6** ต้องตรวจรับกับข้อมูลทดสอบโดยผู้ใช้ก่อนถือว่าใช้งานจริงผ่าน หลังจากนั้นจึงทำคู่มือสำรอง/กู้คืนและลองอีกบัญชีตามแผน ไม่เพิ่ม role/approval หรือบริการเสียเงิน

## รุ่น stock เวอร์ชัน 5: แก้ฟอร์มและสรุปรายงาน

ผู้ใช้ทดสอบบนเว็บจริงแล้วว่าเพิ่มอุปกรณ์แรกได้ และรับเข้า/จ่ายออกได้ แต่หลังเลือก “แก้ไข” ของอุปกรณ์ที่มีประวัติแล้ว เมื่อล้างฟอร์มเพื่อเพิ่มชิ้นใหม่ เว็บยังส่ง `item_id` ของชิ้นเดิม ทำให้ server ตอบ “เปลี่ยนหน่วยนับไม่ได้เมื่อมีประวัติแล้ว” นี่คือผลจากผู้ใช้ ไม่ใช่ผลทดสอบอัตโนมัติ แก้ UI ให้แสดงโหมดเพิ่ม/แก้ไขชัดเจน ปุ่ม “เพิ่มอุปกรณ์ใหม่” ล้าง hidden ID โดยตรง และหลังบันทึกสำเร็จล้าง hidden ID ด้วย เพิ่ม regression test เส้นทางนี้

เพิ่มรายงานช่วงวันที่แบบเรียบง่าย แสดงยอดต้นช่วง รับเข้า (รวมยอดเริ่มต้นในช่วง) จ่ายออก และยอดปลายช่วง **แยกตามชนิดและหน่วย** โดยคำนวณจาก movement ทุกแถวฝั่ง server ไม่ใช้ประวัติ 100 รายการที่ส่งให้หน้าเว็บ เพิ่มการปฏิเสธวันที่อนาคตและรายการย้อนหลังที่ทำให้ยอด ณ ช่วงใดติดลบ

ผลล่าสุด: `npm test` ผ่าน 25/25, `npm run check` ผ่าน, `clasp push --force` สำเร็จ 13 ไฟล์ (ลบ `SetupRunner.gs` ชั่วคราวออกแล้ว), redeploy URL stock เดิมสำเร็จเป็น version 5 เปิดหน้าเว็บจริงใน in-app browser เห็นโหมด “กำลังเพิ่มอุปกรณ์ใหม่” และแท็บสรุปรายงานพร้อมช่วงวันที่/คอลัมน์ครบ **ยังไม่ได้ทดสอบการเพิ่มชิ้นที่สองและรายงานด้วยรหัสทีมบน Google จริงหลังแก้ไข** เพราะรหัสจริงอยู่กับผู้ใช้ และ Sheets API ผ่าน clasp อ่านตรงไม่ได้ (HTTP 403) จึงต้องรอผลตรวจบนเว็บจากผู้ใช้ ไม่อ้างว่าข้อมูลใน Sheet ผ่านแล้ว

## แก้ปัญหาฟังก์ชัน setup ไม่อยู่ในเมนู editor

ผู้ใช้ส่งภาพยืนยันว่า dropdown ใน Apps Script editor แสดง `listStock`, `saveItem`, `saveMovement` แต่ไม่แสดง `setupStock_` แม้เห็นนิยามฟังก์ชันในไฟล์ `Stock.gs` คำแนะนำเดิมให้เลือกฟังก์ชันลงท้าย `_` จึงใช้ไม่ได้กับ UI นี้ เพิ่ม `src/SetupRunner.gs` เป็นฟังก์ชันชั่วคราว `runStockSetup` ซึ่งเรียก `setupStock_` และ push ไปยัง source HEAD แล้วโดย **ไม่ได้ redeploy**; web app สำหรับผู้ใช้ยังคง version 4. `npm test` ผ่าน 21/21 และ `npm run check` ผ่าน ต้องให้เจ้าของรีเฟรช editor แล้วเลือก `runStockSetup` ใน dropdown และรัน เมื่อยืนยันว่า setup สำเร็จแล้วให้ลบตัวเรียกชั่วคราวนี้ออกจาก source HEAD และ push อีกครั้ง

## ปรับรหัสทีมขั้นต่ำเป็น 5 ตัวตามคำขอ

แก้ `getConfig_` ให้ยอมรับ `TEAM_ACCESS_CODE` ยาว 5–256 ตัวอักษร (เดิมขั้นต่ำ 24) โดยคงการตรวจรหัสที่ server และไม่เก็บ secret ใน Git/HTML ทดสอบ local `npm test` ผ่าน 21/21 รวมกรณีรหัส 5 ตัวผ่าน/4 ตัวถูกปฏิเสธ, `npm run check` ผ่าน `clasp push --force` สำเร็จ และอัปเดต deployment stock URL เดิมเป็นเวอร์ชัน 4 สำเร็จ หลัง deploy เปิดหน้าใน in-app browser แล้วลองรหัสทดสอบที่ไม่ใช่รหัสจริง 5 ตัว: server ตอบ “รหัสทีมไม่ถูกต้อง” แทนข้อความตั้งค่าไม่ครบ แสดงว่าระบบผ่านการอ่าน config และถึงขั้นตรวจรหัสแล้ว **ยังไม่ได้ทดสอบด้วยรหัสจริงหรืออ่าน/เขียน Sheet**

## ยืนยันหลังเจ้าของรัน setupStock_

ผู้ใช้แจ้งว่า Apps Script editor แสดง “ดำเนินการเสร็จแล้ว” เวลา 21:36:12 หลังรัน `setupStock_` เมื่อเปิด deployment stock @3 อีกครั้งใน Codex in-app browser หน้า “ยอดคงเหลือและบันทึกรับ–จ่าย” โหลดสำเร็จจริงและเห็นช่องรหัสทีม/เมนูหลักครบ ก่อนรัน setup หน้าเดียวกันขึ้น “ต้องมีสิทธิ์เข้าถึง” จึงถือว่าปัญหาการเปิดหน้ารุ่นนี้คลี่คลายแล้ว **ยังไม่ได้ใส่รหัสทีม ไม่ได้เรียก listStock/saveItem/saveMovement ผ่าน Google และยังไม่ได้ตรวจแถวใน Sheet จริง** ต้องให้เจ้าของทดสอบด้วยรหัสที่ตั้งใน Google โดยไม่ส่งรหัสในแชต และทดสอบบัญชีที่สองต่อ

## ผล deploy รุ่น stock หลังผู้ใช้แจ้งว่าตั้งค่าแล้ว

`clasp status` เห็นไฟล์ 13 ไฟล์ และ `clasp deploy -d "Stock MVP test - receive issue balances"` สำเร็จเป็น deployment ใหม่เวอร์ชัน 3 (ลิงก์อยู่ใน `docs/ACCESS_RESULTS.private.md`) Apps Script API ยืนยัน WEB_APP, `access=ANYONE_ANONYMOUS`, `executeAs=USER_DEPLOYING`, มี `doGet` และ manifest ระบุ Sheets scope แต่เมื่อเปิด `/exec` ใน in-app browser จริง Google แสดง **“ต้องมีสิทธิ์เข้าถึง” ก่อนถึงหน้าแอพ** ขณะที่ deployment POC เดิมแบบ `oauthScopes: []` ยังเปิดหน้าได้ใน browser เดียวกัน จึงยังไม่ผ่านการเปิดใช้รุ่น stock และไม่ได้ทดสอบ RPC/Sheet จริง กำลังรอผลจากผู้ใช้ว่ารัน `setupStock_` และอนุญาตสิทธิ์ใน editor สำเร็จหรือไม่ ห้ามตีความว่า deploy สำเร็จคือใช้งานได้

## เริ่มพัฒนารุ่นใช้งานแรกตามคำสั่งล่าสุด

ผู้ใช้ยืนยันว่าเปิด POC ได้แล้ว และอนุญาตให้เดินงานต่อโดยไม่ต้องสั่งทีละ phase ข้อความก่อนหน้านี้เรื่องเปิดได้เฉพาะ Guest เป็นผลเก่าที่ผู้ใช้แก้ไขแล้ว แต่ **ยังไม่มีหลักฐานว่า POC อ่าน/เขียน Sheet ผ่านสองบัญชีจริง**

ลงโค้ดรุ่นแรกในเครื่องแล้ว: `src/Stock.gs` มี Items, Movements, การตั้ง Sheet แบบไม่ล้างข้อมูล, endpoint ดูยอด/ประวัติ, เพิ่มแก้ชนิดอุปกรณ์, รับเข้า/จ่ายออก/ยอดเริ่มต้น; `src/StockIndex.html`, `StockStyles.html`, `StockClient.html` เป็นหน้าใช้งานภาษาไทย. ทุกการบันทึกผ่าน script lock เดียว ตรวจจำนวน/ยอดล่าสุดจาก movements และ request ID ก่อนเพิ่มหนึ่งแถว ยอดคงเหลือคำนวณใหม่จากประวัติ ไม่มีการแก้หรือลบ movement.

ผลทดสอบ local ล่าสุดหลังแก้โค้ด: `npm test` ผ่าน 20/20, `npm run check` ผ่าน กรณีสำคัญที่ทดสอบด้วย mock: 5 + 2 - 1 = 6, จ่ายเกินถูกปฏิเสธ, retry request เดิมไม่เพิ่มแถว, รหัสชนิดซ้ำและเปลี่ยนหน่วยหลังมีประวัติถูกปฏิเสธ. `clasp push --force` สำเร็จ ส่ง 13 ไฟล์ขึ้น standalone Apps Script project แล้ว (6 ตุลาคม 2026 เวลา 21:18 น. เครื่องผู้พัฒนา) **ยังไม่ได้ deploy เวอร์ชัน stock, ตั้ง APP_ENV=stock, ให้เจ้าของ authorize Sheets OAuth scope, รัน setupStock_ หรือทดสอบกับ Google Sheets จริง** deployment `/exec` ปัจจุบันยังเป็น POC preview-only. การ deploy รุ่นใหม่โดยไม่ตั้งค่าเหล่านี้จะเปิดหน้าได้แต่บันทึกไม่ได้ จึงไม่ควรใช้เป็นระบบจริง.

ขั้นตรวจรับถัดไป: ตั้ง Script Properties ด้วยบัญชีเจ้าของ, authorize Sheets OAuth scope, รัน `setupStock_` บนไฟล์ทดสอบเท่านั้น, deploy รุ่น stock แล้วตรวจรับจากสองบัญชีผ่านเว็บ โดยไม่แชร์ Sheet ให้บัญชีที่สองแก้ไขตรง ดู [STOCK_DEPLOYMENT.md](STOCK_DEPLOYMENT.md). ไม่มีข้อมูล stock จริงถูกสร้างหรือแก้ใน Google ในรอบนี้.

## ผลทดสอบการเปิดหน้า POC จากผู้ใช้ (6 ตุลาคม 2026)

ผู้ใช้ยืนยันด้วยภาพหน้าจอว่า deployment standalone เวอร์ชัน 2 เปิดหน้า POC ได้เฉพาะ Chrome Guest mode ส่วน Chrome โปรไฟล์ที่ใช้อยู่ถูกเปลี่ยน URL เป็น `/macros/u/1/s/.../exec` แล้วแสดงหน้า Google Drive “ไม่สามารถเปิดไฟล์ได้ในเวลานี้” ดังนั้น **ยังไม่ผ่านเกณฑ์การเข้าถึงสำหรับผู้ใช้ประจำ** แม้เคยเปิดหน้าได้ใน in-app browser ที่ไม่ลงชื่อเข้าใช้ การเปิดหน้าใน Guest ไม่ได้พิสูจน์ว่าอ่าน/เขียน Sheet ได้

ยังไม่ทราบแน่ชัดว่าโปรไฟล์ปกติมี Google หลายบัญชีลงชื่อเข้าใช้พร้อมกันหรือไม่ และยังไม่พิสูจน์สาเหตุการเปลี่ยน URL นี้กับบัญชีจริงสองบัญชี แนวทดสอบที่สั้นที่สุดคือ Chrome profile แยกที่ลงชื่อเข้าใช้ Google **เพียงบัญชีเดียว** แล้วเปิดลิงก์ `/exec` โดยตรง ถ้ายังเปิดไม่ได้ให้ถือว่า Apps Script HTML Service ในสภาพแวดล้อมนี้ไม่ตอบโจทย์การเปิดใช้ประจำ อย่าให้ทีมต้องใช้ Guest mode เป็นขั้นตอนปกติ

เวอร์ชัน 2 ยังมี `oauthScopes: []` จึงเป็นเพียงหน้า preview และยังไม่ได้ทดสอบบริการ Google, Script Properties หรือการเขียน Sheet จริง ไม่เริ่ม Phase 1 จากผลนี้

## ผลแก้ปัญหาเปิดหน้า POC ล่าสุด

ผู้ใช้พบหน้า Google Drive "ไม่สามารถเปิดไฟล์" แม้ใช้หน้าต่างไม่ระบุตัวตน การสรุปเดิมว่าเกิดจากหลายบัญชีจึงไม่ถูกต้องสำหรับกรณีนี้

- ตรวจ Apps Script API: โปรเจกต์เดิมมี WEB_APP entry point, doGet และไฟล์ครบ แต่ browser ยังขึ้น permission error ก่อนเรียก UI
- ทดลอง access `ANYONE_ANONYMOUS` บนโปรเจกต์เดิมแล้วยัง permission error จึงไม่ใช่เพียงปัญหาเลือกบัญชี
- สร้าง **Apps Script standalone ใหม่** โดยใช้ Google Sheet ทดสอบเดิม ผลที่มี OAuth scopes ของ Sheets/userinfo ยัง permission error
- ทดสอบ standalone เวอร์ชัน 2 ด้วย `oauthScopes: []`: **เปิดหน้า POC จริงได้แล้ว** ใน in-app browser ที่ไม่ได้ login และเห็น UI ภาษาไทย ผลนี้บ่งว่าการอนุญาต scopes ของบัญชีเจ้าของยังเป็นส่วนที่ต้องทำก่อนอ่าน/เขียน Sheet; ยังไม่ได้พิสูจน์สาเหตุระดับแพลตฟอร์มทั้งหมด
- **ลิงก์ใหม่** อยู่ `docs/ACCESS_RESULTS.private.md` ลิงก์เดิมที่ให้ผู้ใช้ก่อนหน้านี้เป็นโปรเจกต์ผูก Sheet และยังเปิดไม่ได้ อย่าใช้สำหรับตรวจรับ
- เวอร์ชัน 2 เป็น **preview-only** ในทางปฏิบัติ: การเปิดหน้า `doGet` ทำงาน แต่ RPC ที่ต้องใช้ Script Properties, SpreadsheetApp และ Session email ยังไม่ได้ทดสอบและไม่คาดว่าจะทำงานด้วย scopes ว่าง ห้ามใช้เพื่อบันทึกข้อมูลจริง
- ขั้นต่อไปของ Phase 0 เมื่อผู้ใช้พร้อม: ตั้ง Script Properties ใน standalone ใหม่และ timezone Sheet, ให้เจ้าของ authorize scopes ใน Apps Script editor, คืน scopes ขั้นต่ำสำหรับ Sheets แล้ว deploy เวอร์ชันใหม่; ทดสอบหน้าเว็บ/อ่าน/เขียนจริงหลังจากนั้น

ยังไม่มีการสร้าง master หรือ stock movement และไม่ได้เริ่มงานแอพคลังจริง

## ทิศทางล่าสุดจากผู้ใช้

อ่าน `MEDICAL_STOCK_CODEX_PLAN.md` ฉบับใหม่และ `MEDICAL_STOCK_REQUIREMENTS.md` แล้ว ผู้ใช้ขอให้ลดความซับซ้อนของระบบและการพัฒนา เหลือเครื่องมือทีมเล็กที่เน้นดูยอดและจดรับ–จ่าย ยืนยันว่าอุปกรณ์รวมตามชนิดและมีทั้งเครื่องมือแพทย์กับวัสดุสิ้นเปลือง รายละเอียดการตัดขอบเขตและงานถัดไปอยู่ [SIMPLE_SCOPE.md](SIMPLE_SCOPE.md) มีลำดับเหนือแผนเฟสเดิมในส่วนที่ขัดกับคำขอล่าสุด ยังไม่ได้แก้/deploy โค้ดใหม่ในรอบพิจารณานี้

## ปัญหาเปิดหน้า POC ที่ผู้ใช้พบ

ผู้ใช้เปิด URL แล้วถูกนำไป `script.google.com/macros/u/1/s/...` และเห็นหน้า Google Drive แจ้งว่าเปิดไฟล์ไม่ได้ ไม่ใช่หน้า POC จึงแก้ความเข้าใจเดิมว่า "ดูหน้าได้แล้ว" เป็น **ยังไม่ยืนยันว่าเปิดได้**

ตรวจ Apps Script API จริง: deployment เวอร์ชัน 1 ยังอยู่ มี WEB_APP entry point พร้อม URL `/exec` ตรงลิงก์ที่ให้ access ANYONE (Google logged-in) และ executeAs USER_DEPLOYING; project content บน Google มี `doGet`, HTML ทุกไฟล์ และ manifest ถูกต้อง จึงยังไม่มีหลักฐานว่าไฟล์ขาดหรือ URL ผิด

จาก `/u/1/` และคำแนะนำทางการของ Google ว่า Apps Script web app มีปัญหาได้เมื่อ browser login หลายบัญชี ผู้ใช้ควรลองหน้าต่างไม่ระบุตัวตนที่ login **บัญชีเจ้าของเพียงบัญชีเดียว** แล้วเปิด URL `/exec` เดิม หากสำเร็จให้ทดสอบอีกบัญชีในหน้าต่าง/โปรไฟล์แยก หลังจากนั้นเจ้าของต้องรันฟังก์ชันใน editor เพื่อ authorize scopes ตามคู่มือ Google; ยังไม่ได้ทดสอบผลทาง browser จริงจากบัญชีที่ login ใน Codex

อ้างอิง: https://developers.google.com/apps-script/guides/support/troubleshooting และ https://developers.google.com/apps-script/guides/services/authorization

อัปเดต: 6 ตุลาคม 2026 (Asia/Bangkok)

## เฟสและสถานะ

**Phase 0 — Deploy เวอร์ชัน 1 สำเร็จ; รอตั้ง Script Properties, timezone ของ Sheet, run setup/authorization และทดสอบสองบัญชีจริง**

ยังไม่ถือว่าพิสูจน์การอ่าน/เขียน Google Sheets แล้ว และยังไม่เริ่ม Phase 1 ไม่มีบริการเสียเงิน

## ผล deploy ล่าสุด (6 ตุลาคม 2026)

- หลังเจ้าของเปิด Apps Script API ค้นผ่าน Drive API ด้วย login เดิมของ clasp พบ Sheet POC เดิมหนึ่งไฟล์และนำกลับมาใช้ ไม่สร้าง Sheet ซ้ำ
- สร้าง Apps Script ผูกกับ Sheet เดิมสำเร็จ `.clasp.json` ชี้ rootDir `src` และถูก ignore
- `clasp status`: เฉพาะไฟล์ src ที่ตั้งใจ 9 ไฟล์; `npm run check`: ผ่าน
- `clasp push`: ครั้งแรกข้ามเพราะรอยืนยัน manifest จากนั้นรันแบบ interactive ยืนยันแทน manifest เริ่มต้นของโปรเจกต์ใหม่ และอัปโหลด 9 ไฟล์สำเร็จ
- `clasp deploy`: สำเร็จเวอร์ชัน 1 และ `clasp --json list-deployments` ยืนยันเวอร์ชัน/description ตรง
- Manifest: webapp.access = ANYONE (ต้องมี Google login), executeAs = USER_DEPLOYING; ไม่เปิด anonymous และไม่แชร์ Sheet ให้ผู้ใช้อื่น
- เปิด URL /exec ใน in-app browser จริง: ไปหน้า Google Sign in เนื่องจาก browser นี้ยังไม่มี session; ยังไม่เข้าถึงหน้า POC หรือทดสอบอ่าน/เขียน
- ยังไม่ได้ตั้ง APP_ENV / SPREADSHEET_ID / TEAM_ACCESS_CODE, เปลี่ยน timezone Sheet หรือรัน setupPoc_ ในบัญชีจริง ห้ามตีความว่า deploy สำเร็จเท่ากับใช้งานผ่านแล้ว
- ลิงก์และ ID จริงสำหรับดำเนินการต่ออยู่ `docs/ACCESS_RESULTS.private.md` (gitignored); ไม่มี secret/token ในไฟล์นี้

เจ้าของต้องเปิด editor → Project Settings → Script Properties ตั้งสามค่าตาม DEPLOYMENT.md โดยใส่รหัสทีมเอง จากนั้นตั้ง timezone ของ Sheet เป็น Asia/Bangkok และรัน setupPoc_ พร้อมตรวจ/อนุญาต scope ใน Google ก่อนทดสอบ /exec สองบัญชี

## ประวัติก่อน deploy

อัปเดตหลังผู้ใช้อนุญาต deploy: `clasp login` สำเร็จ (exit 0) และพบ clasp 3.4.1 ไม่เก็บอีเมล URL OAuth หรือ token ใน repo

พยายาม `clasp create-script --type sheets --title 'Medical Stock - Phase 0 POC' --rootDir artifacts/clasp-bootstrap` แต่ Google ปฏิเสธด้วย `User has not enabled the Apps Script API` (exit 1) ต้องให้เจ้าของเปิด Google Apps Script API ที่ https://script.google.com/home/usersettings ก่อน จึงยังไม่ได้ push/deploy

**ก่อนลองสร้างอีกครั้ง:** clasp สร้าง container Sheet ก่อนเรียก Apps Script API ตาม source ของเวอร์ชันนี้ จึงอาจมีไฟล์ชื่อ Medical Stock - Phase 0 POC อยู่แล้วใน Drive แม้คำสั่งล้ม ไม่มี .clasp.json ถูกสร้าง ต้องค้นหาไฟล์ดังกล่าวและใช้ parentId เดิมหากพบเพื่อไม่สร้างซ้ำ ห้ามลบข้อมูลโดยอนุมานว่าเป็นไฟล์ทิ้ง

เริ่มต้น repo มีเฉพาะ .git ไม่มี AGENTS.md, CURRENT_STATE หรือโค้ดเดิม นำแผนจากไฟล์ที่ผู้ใช้ให้มาเก็บใน repo โดยไม่แก้ต้นฉบับ

## สิ่งที่เสร็จ

- แผนหลัก, AGENTS.md, README, เอกสาร business rules/schema/design/test/deployment และแบบผลสองบัญชี
- Apps Script manifest V8 / Asia/Bangkok, config จาก Script Properties พร้อม fail-closed
- หน้า POC ไทยสำหรับคอม/มือถือ: ตรวจอ่าน Sheet, แสดงอีเมลที่ Google คืนจริงหรือว่าง และทดสอบเขียน marker คงที่
- ทุก data endpoint ตรวจรหัสทีมที่ server; doGet ส่งเฉพาะหน้าเปล่า; helpers/setup ลงท้าย `_`
- setupPoc_ สร้างเฉพาะ POC_Checks ไม่สร้าง stock/master ไม่ล้างข้อมูล และปฏิเสธไฟล์ที่มีชื่อตารางคลัง
- POC marker ใช้ UUID, lock timeout, idempotency, lookup และ flush ก่อนปลด lock ใน finally
- ตรวจหัวตาราง สูตร แถวไม่ครบ วันไม่ถูกต้อง และ ID ซ้ำก่อนอ่าน/เขียน; ไม่ส่ง raw errors/secret ให้ client
- Client ป้องกันกดซ้ำ รักษา ID เมื่อ timeout/refresh แท็บเดิม ไม่รับ callback เก่ามาทับผลใหม่
- Node tools เฉพาะ local ไม่มี server, runtime npm imports หรือ dependency ในโปรเจกต์
- clasp example สำหรับอนาคตโดย rootDir เป็น src; คู่มือคัดลอกด้วยมือใช้งานได้โดยไม่ติดตั้ง clasp

## ผลที่รันจริง

| คำสั่ง/การตรวจ | ผล |
|---|---|
| `npm test` | ผ่าน **17/17**, ล้มเหลว 0: 12 server/adapter tests + 5 client DOM-double tests |
| `npm run check` | ผ่าน syntax .gs/Client, manifest, public API surface, client safety และ design-token mapping |
| `npm run preview:build` | สร้าง artifacts/local-preview.html สำเร็จ เป็นหน้า local ไม่เชื่อม Google |
| `audit_project.py . --mode strict --output artifacts/premium-audit.json` | ผ่าน errors 0 / warnings 0; รันด้วย bundled Python `-X utf8` |
| `npx --yes --package @google/design.md designmd lint DESIGN.md` | exit 0, errors 0 / warnings 0 / infos 2; ไม่เพิ่ม dependency ลงโปรเจกต์ |
| เปิด preview ด้วยเครื่องมือ Browser | **ไม่สำเร็จ** เครื่องมือบล็อก protocol file:// จึงไม่มีผล screenshot/visual QA จริง |

การรันครั้งแรกติด sandbox EPERM ของ Node จึงขออนุญาตรันตรวจ local นอก sandbox แล้ว แก้ test command เป็นชื่อไฟล์ชัดเจนเพราะ Node 20 บน Windows ไม่ขยาย glob ในคำสั่งเดิม และใช้ UTF-8 กับตัว audit Python เพื่อรองรับชื่อโฟลเดอร์ไทย หลังแก้รันตามตารางผ่านแล้ว

Static audit ตอนแรกมองไม่เห็น addEventListener ที่อยู่ partial อื่น จึงตรวจ handlers ด้วย client tests และทำให้ปุ่มเริ่มเป็น disabled จน Client โหลดครบ พร้อม noscript message ไม่ใส่ handler หลอกเพื่อผ่าน audit

## ยังไม่ได้ทดสอบ / ข้อจำกัด

- **Google จริงทั้งหมด**: authorization scopes, setup, Sheet reads/writes, private RPC blocking, Script Properties, Session email, serialization, flush และ script-lock concurrency
- Execute as owner และ access ที่บัญชี Google จริงรองรับ โดยเฉพาะบัญชีที่สองที่ไม่มีสิทธิ์ตรงบน Sheet
- Browser rendering, keyboard, live-region/screen-reader, computed contrast, narrow viewport, mobile touch และ 200% zoom; DOM doubles ไม่แทนสิ่งเหล่านี้
- ไม่มี stock engine จึงยังไม่มี balance/validation ย้อนหลัง/reversal/report tests ของ stock; ต้องเพิ่มตามเฟส ไม่อนุมานจาก POC
- sessionStorage เก็บ request ID เฉพาะแท็บ หากปิดแท็บหรือล้าง storage อาจหาย ต้องให้เจ้าของตรวจ POC_Checks ก่อนสร้างใหม่ การกู้สถานะในงาน stock จริงต้องออกแบบต่อ Phase 2–3
- รหัสทีมไม่ได้ยืนยันตัวบุคคล observed email ไม่ใช่ authorization; ยังไม่มี Operators selection/admin credential ผ่านเว็บใน Phase 0
- POC อ่านทั้งตารางทดสอบ ไม่ใช่รูปแบบ paging/performance สำหรับประวัติคลังขนาดใหญ่
- หน้า UI เป็นร่างตามแนวทาง DESIGN.md ยังไม่ได้รับผลตรวจผู้ใช้บนเครื่องจริง

## ขั้นตอนถัดไปของเจ้าของบัญชี

1. ทำตาม [DEPLOYMENT.md](DEPLOYMENT.md): สร้าง Sheet ทดสอบและ Apps Script, ตั้ง timezone และ Script Properties โดยใส่รหัสเอง
2. รัน setupPoc_ สองครั้งและตรวจข้อมูลไม่หาย
3. Deploy execute as owner ด้วย access แคบที่สุดที่บัญชีสองเข้าได้ แล้วเปิด `/exec` คนละโปรไฟล์โดยไม่แชร์ Sheet ให้บัญชีสอง
4. ทดสอบรหัสผิด/ถูก อ่าน/เขียน/กดซ้ำ/ตรวจคำขอเดิมและบันทึก Session email ที่ได้จริงตาม [TEST_PLAN.md](TEST_PLAN.md)
5. กรอก [ACCESS_TEST_RESULTS.md](ACCESS_TEST_RESULTS.md) เลือกรูปแบบ access และบันทึกข้อจำกัดจากผลจริง จึงอัปเดตสถานะว่า integration ผ่านหรือไม่

ขั้นต่อไปของการพัฒนา **เมื่อผู้ใช้สั่งเท่านั้น**: ปิดข้อค้าง POC ที่มีผลต่อสิทธิ์ แล้ว Phase 1 สร้าง master/setup จริง ไม่เริ่มในรอบนี้
