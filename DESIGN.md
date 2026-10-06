---
version: alpha
name: "คลังอุปกรณ์การแพทย์"
description: "หน้าทดสอบการเชื่อมต่อสำหรับทีมคลังขนาดเล็ก ใช้แถบทะเบียนสีเขียวน้ำเงินและผลตรวจที่อ่านชัด"
colors:
  primary: "#125b63"
  hover: "#0b444b"
  background: "#f1f5f7"
  surface: "#ffffff"
  text: "#182f3b"
  muted: "#50646f"
  border: "#b8c9ce"
  soft: "#e3eff0"
  danger: "#a32432"
  focus: "#245cc0"
  scrollbar-thumb: "#697e87"
  scrollbar-track: "#e3eff0"
  scrollbar-hover: "#50646f"
  scrollbar-active: "#182f3b"
typography:
  body:
    fontFamily: 'Tahoma, "Leelawadee UI", sans-serif'
  heading:
    fontFamily: '"Leelawadee UI", Tahoma, sans-serif'
  mono:
    fontFamily: 'Consolas, monospace'
rounded:
  control: "6px"
  panel: "12px"
spacing:
  gap: "24px"
  page-max: "1120px"
omitted:
  - section: components
    reason: "Single POC screen uses semantic HTML and shared Styles.html rules; behavior is documented in docs/DESIGN.md."
---

# แนวทางหน้าจอคลังอุปกรณ์

## Overview

### Creative North Star

ใช้แนวคิดแผ่นทะเบียนตรวจความพร้อมของคลัง: แถบเขียวน้ำเงินบอกหัวข้อ ช่องกรอกรหัสอยู่ซ้ายและผลตรวจเป็นรายการอยู่ขวา ให้เห็นหลักฐานว่าตรวจอะไรแล้ว ไม่ใช้กราฟ/ยอดคลังจำลองที่อาจทำให้เข้าใจว่าระบบเสร็จ

ผู้ใช้คือทีมแผนก 7–8 คนตามแผนหลัก ภาษาไทย ใช้มือถือและคอม ตลาด/นโยบายเฉพาะประเทศอื่นยังไม่ได้กำหนด งาน Phase 0 เป็นเครื่องมือทดสอบ ไม่มีหน้าการตลาดหรือภาพตกแต่ง ภาษาตรงไปตรงมา ยังไม่ใช่แบบยืนยันโดยผู้ใช้สำหรับทุกเฟส

Runtime tokens ใน `src/Styles.html :root` เป็น canonical owner; frontmatter นี้สะท้อนค่าเดียวกัน อ่านพฤติกรรมที่ `docs/DESIGN.md` ไม่มี sibling screen ใน repo นี้ ไม่สร้างระบบ component ซ้อนเพื่อหน้าเดียว

## Colors

พื้นฟ้าเทา/แผ่นขาวช่วยแบ่งส่วน แถบทะเบียนและปุ่มหลักใช้ primary, ข้อผิดพลาดใช้ danger พร้อมข้อความเสมอ muted ยังคงอ่านได้บนพื้นขาว ใช้ focus สีน้ำเงินให้แยกจากการเลือก สี hover เข้มขึ้น ไม่มี dark theme ใน POC แต่รองรับ forced colors ของระบบ

Mapping: `colors.<name>` → `--color-<name>` ยกเว้น `scrollbar-*` → `--scrollbar-*` โดยตรง → selectors ใน Styles.html ปุ่มและผลสถานะใช้ semantic tokens ไม่มี theme adapter/framework

## Typography

หัวเรื่องใช้ heading แบบ Leelawadee UI / Tahoma และ body ใช้ Tahoma / Leelawadee UI ซึ่งรองรับไทยโดยไม่ดาวน์โหลดฟอนต์ ตัวเนื้อหา 16px line-height 1.7, หัวเรื่อง 28–38px, หัวข้อ 20px, help 13px, code/UUID ใช้ Consolas พร้อม fallback ไทย ไม่เพิ่ม letter-spacing กับภาษาไทย

`typography.body/heading/mono.fontFamily` → `--font-body/heading/mono` → body, headings, technical data ใช้ ค.ศ. และ Asia/Bangkok ชัดเจน ไม่ให้ locale ไทยเปลี่ยนปีข้อมูลเป็น พ.ศ. โดยปริยาย

## Layout

หน้า max 1120px gap 24px มีสอง panel ที่ >=761px และหนึ่งคอลัมน์ที่ <=760px เอกสารเป็นเจ้าของการเลื่อน ไม่มี fixed viewport height, ไม่มี modal/table ใน POC ข้อมูลรอผลและข้อผิดพลาดจองพื้นที่ไว้ ปุ่มไม่เปลี่ยนข้อความระหว่าง busy

`spacing.gap` → `--space-gap`, `spacing.page-max` → `--page-max`; รูปแบบ scrollbar ใช้ global baseline กับทุก scroll surface, standard properties และ WebKit fallback ไม่ซ่อน scrollbar

## Elevation & Depth

แบ่งส่วนด้วยขอบและพื้นสี ไม่มี shadow หรือพื้น blur ข้อมูลสำคัญไม่อยู่บน overlay

## Shapes

`rounded.control/panel` → `--radius-control/panel` ปุ่มและช่องกรอก 6px panel 12px แถบสถานะมีเส้นซ้ายสื่อความสัมพันธ์กับทะเบียน

## Components

- ใช้ button จริง มี hover/active/focus/disabled ขนาดสูงอย่างน้อย 44px disabled ระหว่างส่งคำขอเพื่อกันกดซ้ำ
- Form เป็น canonical native HTML ผ่าน novalidate; ข้อผิดพลาดผูกกับช่องรหัสและ focus กลับช่อง ไม่ใช้ native alert/confirm/prompt
- Password masked เริ่มต้น แสดง/ซ่อนและล้างรหัสได้ ไม่เก็บรหัสใน storage
- สถานะใช้พื้นที่คงที่ `#status` พร้อม live region ไม่ใช้ toast ที่หายไป ข้อผิดพลาดไม่ใช้สีอย่างเดียว
- ผลอ่าน/เขียนใช้ definition list, break UUID ได้ ไม่ซ่อนข้อมูล ไม่มีไอคอนที่ต้องเดาความหมาย
- ไม่มี animation ที่จำเป็น; reduced motion ไม่มีสิ่งเคลื่อนไหว ไม่มีรูปภาพ/เว็บฟอนต์ที่ทำให้หน้าเลื่อนหลังโหลด
- ห้ามกราฟ/ตัวเลขตกแต่งหรือข้อความที่อ้างว่าคลังพร้อมใช้ก่อนทดสอบจริง

## Do's and Don'ts

- บอก “ยังไม่ได้ทดสอบ” เมื่อไม่มีผลจริง และคง request ID ที่ผลยังไม่แน่ชัด
- ใช้คำว่า “รายการทดสอบ” ให้ต่างจากรายการคลัง
- ไม่แสดง secret/raw service error ในผลหรือ log
- ไม่ทำหน้าเครื่องมือให้เหมือน landing page โฆษณาหรือ dashboard พร้อมยอดปลอม
