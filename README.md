# ระบบส่งข้อมูล IoT ด้วย ESP32 และ Firebase Realtime Database พร้อม Web Dashboard (ESPFirebase)

[![CI — Build, Lint & Test](https://github.com/Phithak-K/ESPFirebase/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Phithak-K/ESPFirebase/actions/workflows/ci.yml)

### Real-time ESP32 Sensor Telemetry & Historical Data Visualization with ESPHome and Firebase RTDB

> **ปฏิบัติการระบบ Internet of Things (IoT)** — การสร้างสถาปัตยกรรมการส่งข้อมูลเซ็นเซอร์จากบอร์ดไมโครคอนโทรลเลอร์ ESP32 ผ่านโปรโตคอล HTTPS REST API ไปยัง Firebase Realtime Database แบบ 2 เลเยอร์ (Current Latest State และ Historical Time-Series) พร้อมหน้าเว็บมอนิเตอร์ริ่งแบบเรียลไทม์ (Web Dashboard)

---

## 1. โครงสร้างโปรเจกต์ (Repository Structure)

```text
├── .github/workflows/
│   └── ci.yml                     # ระบบอัตโนมัติ GitHub Actions ตรวจสอบไวยากรณ์และความปลอดภัย (CI)
├── config/
│   ├── firebase-l1.yaml           # L1: ส่งค่าคงที่ไปยัง /latest
│   ├── firebase-l2.yaml           # L2: ส่งค่าเซ็นเซอร์จำลอง (Random) ไปยัง /latest
│   ├── firebase-l3.yaml           # L3: ส่งข้อมูลแบบบันทึกประวัติ (POST) ไปยัง /history
│   ├── firebase-l4.yaml           # L4: ซิงค์เวลาโลก (SNTP) และส่ง Timestamp ไปยัง /history
│   ├── firebase-l5.yaml           # L5: สถาปัตยกรรมสมบูรณ์ (PUT -> latest และ POST -> history)
│   ├── secrets.yaml.example       # ไฟล์แม่แบบตัวอย่างสำหรับตั้งค่า Wi-Fi และ Database URL
│   └── .gitignore                 # ป้องกัน secrets.yaml ไม่ให้หลุดขึ้น Git
├── dashboard/
│   ├── index.html                 # หน้าจอ Dashboard แบบพื้นฐาน
│   ├── style.css                  # ตกแต่ง UI พื้นฐาน
│   ├── script.js                  # สคริปต์เชื่อมต่อ Firebase
│   ├── config.example.js          # ตัวอย่างไฟล์ตั้งค่า Database URL
│   └── config.js                  # (Local Only) เก็บ Database URL จริง
├── freeboard/                     # 🚀 Advanced Dashboard (เวอร์ชันอัปเกรด)
│   ├── index.html                 # โครงสร้าง UI แบบจัดเต็ม
│   ├── style.css                  # ธีม Neon/Aurora Glassmorphism
│   └── script.js                  # ระบบจัดการกราฟ แจ้งเตือน เสียง และการประมวลผล
└── .gitignore                     # กฎการป้องกันไฟล์ความลับทั้งหมดของโปรเจกต์
```

---

## 2. ลำดับการทดลอง (Laboratory Levels: L1 - L5)

| Level | ความสามารถที่เพิ่มขึ้น | เมธอด HTTP | ปลายทาง (Path) | แนวคิดสำคัญ |
| :--- | :--- | :---: | :--- | :--- |
| **L1** | ส่งค่าคงที่ทดสอบ | `PUT` | `/lab/esp32-01/latest` | ทดสอบการเชื่อมต่อ ESP32 -> Wi-Fi -> Firebase |
| **L2** | เซ็นเซอร์จำลอง (Random) | `PUT` | `/lab/esp32-01/latest` | ส่งค่า Sensor State แปลงเป็น JSON |
| **L3** | บันทึกประวัติย้อนหลัง | `POST` | `/lab/esp32-01/history` | Firebase สร้าง Push ID (Unique Key) อัตโนมัติ |
| **L4** | บันทึกเวลามาตรฐาน (SNTP) | `POST` | `/lab/esp32-01/history` | แนบ Epoch Timestamp สำหรับ Time-Series Data |
| **L5** | สถาปัตยกรรมแบบคู่ (Full System) | `PUT` + `POST` | `/latest` และ `/history` | รองรับทั้ง Current Telemetry และ Historical Analytics |

---

## 3. การรักษาความปลอดภัย (Security & Secret Management)

* **ไม่จัดเก็บคีย์ลับบน Repository:** ไฟล์ `secrets.yaml` และ `dashboard/config.js` ถูกกำหนดไว้ใน `.gitignore` จะไม่มีการเก็บรหัสผ่าน Wi-Fi หรือ URL จริงขึ้นระบบ Git
* **การใช้งานในเครื่อง (Local Setup):**
  1. คัดลอก `config/secrets.yaml.example` เป็น `config/secrets.yaml` แล้วใส่ชื่อ Wi-Fi, รหัสผ่าน และ Firebase Database URL
  2. คัดลอก `dashboard/config.example.js` เป็น `dashboard/config.js` แล้วใส่ Firebase Database URL
* **การทดสอบอัตโนมัติ (Automated Testing with GitHub Actions):**
  ระบบ GitHub Actions ทำหน้าที่ตรวจเช็คความถูกต้องของไวยากรณ์ไฟล์ ESPHome YAML ทุกไฟล์, ตรวจสอบไวยากรณ์ไฟล์ JavaScript ของหน้าเว็บ Dashboard และตรวจทานความปลอดภัยว่าไม่มีคีย์ลับรั่วไหลโดยอัตโนมัติทุกครั้งที่มีการ `git push`

---

## 4. ฟีเจอร์เด่นของ Freeboard Dashboard (Advanced Monitoring UI)

ในโฟลเดอร์ `freeboard/` ได้รับการยกระดับให้เป็น Dashboard สำหรับใช้งานจริงระดับโปรดักชัน โดยมีฟีเจอร์และประโยชน์ต่อผู้ใช้งาน (UX/UI & Utilities) ดังนี้:

* 🎨 **Aurora UI / Glassmorphism Design:** หน้าตา UI ที่สวยงาม ทันสมัย สบายตา พร้อม Animation การเคลื่อนไหว (Particle & Glow)
  * *ประโยชน์:* ทำให้ระบบดูมีความเป็นมืออาชีพ (Premium) น่าใช้งาน และจัดระเบียบข้อมูลให้ดูง่าย ไม่รกตา
* 📡 **ESP32 Offline Detection (ระบบตรวจจับการเชื่อมต่อ):** ตรวจสอบ `timestamp` ล่าสุดอัตโนมัติ หากไม่มีข้อมูลใหม่เกิน 2 นาที จะขึ้นสถานะ Offline 🔴
  * *ประโยชน์:* ผู้ดูแลระบบรู้ได้ทันทีเมื่อเซ็นเซอร์มีปัญหา ไฟตก หรือเน็ตหลุด โดยไม่ต้องรอดูว่ากราฟขยับหรือไม่
* 🌡️ **Health Status & Smart Thresholds:** ประเมินสถานะของเซ็นเซอร์อัตโนมัติ (Normal ✅, Warning ⚠️, Danger 🚨) จากเกณฑ์ที่กำหนด
  * *ประโยชน์:* ผู้ใช้ไม่ต้องท่องจำว่าอุณหภูมิเท่าไหร่ถึงอันตราย ระบบวิเคราะห์และบอกสถานะให้ทันที
* 🔊 **Audio Alarm System & Toast Notifications:** แจ้งเตือนด้วยข้อความเด้ง (Toast) และเสียงเตือน (Siren/Beep) เมื่อค่าเกินเกณฑ์ พร้อมปุ่มเปิด-ปิดเสียง (Mute)
  * *ประโยชน์:* เหมาะสำหรับห้องคอนโทรลที่เจ้าหน้าที่ไม่ได้มองจอตลอดเวลา เสียงจะช่วยดึงความสนใจเมื่อเกิดเหตุฉุกเฉินได้ทันท่วงที
* ⏰ **Time Range Picker (ระบบกรองช่วงเวลา):** สามารถเลือกดูกราฟย้อนหลัง (1H, 6H, 24H, 7D) หรือระบุ วัน-เวลา เริ่มต้นและสิ้นสุดด้วยตัวเองได้
  * *ประโยชน์:* ใช้ค้นหาข้อมูลย้อนหลัง วิเคราะห์แนวโน้ม หรือหาสาเหตุของปัญหาในช่วงเวลาที่เกิดเหตุได้แม่นยำ
* 📊 **Min/Max Analytics Bar:** แถบคำนวณและสรุปค่าสูงสุด (Max) และต่ำสุด (Min) ของเซ็นเซอร์ทุกตัว ตามช่วงเวลาที่ผู้ใช้กำลังเลือกดู
  * *ประโยชน์:* ทำให้เห็นภาพรวมอย่างรวดเร็ว (เช่น วันนี้อุณหภูมิแกว่งไปสูงสุดที่เท่าไหร่) โดยไม่ต้องไปนั่งไล่ดูจุดบนกราฟเอง
* 🎯 **Smart Chart Toggles:** ปุ่มเปิด/ปิดเส้นกราฟพร้อมไฟ LED สเตตัส เพื่อเลือกดูเฉพาะเซ็นเซอร์ที่ต้องการ
  * *ประโยชน์:* ช่วยลดความซับซ้อนและลายตาเมื่อกราฟมีข้อมูลหลายตัวซ้อนทับกัน ทำให้เปรียบเทียบข้อมูล 2 ตัวได้ชัดเจนขึ้น
* 💾 **Export CSV & Save Graph (PNG):** ดาวน์โหลดข้อมูลแบบตารางดิบ (`.csv`) และดาวน์โหลดรูปภาพกราฟ (`.png`) ที่แสดงอยู่ปัจจุบัน
  * *ประโยชน์:* นำรูปกราฟไปแปะลงในเอกสารรายงาน (Report) หรือนำข้อมูล CSV ไปวิเคราะห์ต่อใน Excel/Python ได้ทันที โดยไม่ต้องทำงานซ้ำซ้อน
