import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertFoodRecordSchema, insertPatientSchema } from "@shared/schema";
import nodemailer from "nodemailer";
import { z } from "zod";

const THERAPIST_PASSWORD = process.env.THERAPIST_PASSWORD || "therapist1234";

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {

  // 치료자 인증
  app.post("/api/therapist/login", (req, res) => {
    const { password } = req.body;
    if (password === THERAPIST_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    }
  });

  // 환자 목록
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "환자 목록을 불러오지 못했습니다." });
    }
  });

  // 환자 로그인
  app.post("/api/patients/login", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "코드를 입력하세요." });
      const patient = await storage.getPatientByCode(String(code));
      if (!patient) return res.status(404).json({ error: "등록된 환자를 찾을 수 없습니다." });
      res.json(patient);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "로그인에 실패했습니다." });
    }
  });

  // 환자 등록
  app.post("/api/patients", async (req, res) => {
    try {
      const parsed = insertPatientSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "입력 형식 오류" });
      const existing = await storage.getPatientByCode(parsed.data.code);
      if (existing) return res.status(409).json({ error: "이미 사용 중인 코드입니다." });
      const patient = await storage.createPatient(parsed.data);
      res.status(201).json(patient);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "환자 등록에 실패했습니다." });
    }
  });

  // 환자 삭제
  app.delete("/api/patients/:id", async (req, res) => {
    try {
      await storage.deletePatient(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "환자 삭제에 실패했습니다." });
    }
  });

  // 환자별 날짜 기록 조회
  app.get("/api/records/:patientId/date/:date", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) return res.json([]);
      const records = await storage.getRecordsByPatientAndDate(patientId, req.params.date);
      res.json(records);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "기록을 불러오지 못했습니다." });
    }
  });

  // 환자별 전체 기록 조회
  app.get("/api/records/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) return res.json([]);
      const records = await storage.getRecordsByPatient(patientId);
      res.json(records);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "기록을 불러오지 못했습니다." });
    }
  });

  // 환자별 주간 기록 조회
  app.get("/api/records/:patientId/week", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) return res.json([]);
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      if (!startDate || !endDate) return res.status(400).json({ error: "startDate, endDate가 필요합니다." });
      const records = await storage.getRecordsByPatientAndWeek(patientId, startDate, endDate);
      res.json(records);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "기록을 불러오지 못했습니다." });
    }
  });

  // 기록 생성
  app.post("/api/records", async (req, res) => {
    try {
      const parsed = insertFoodRecordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "입력 형식 오류", details: parsed.error.flatten() });
      const record = await storage.createRecord(parsed.data);
      res.status(201).json(record);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "기록 저장에 실패했습니다." });
    }
  });

  // 기록 삭제
  app.delete("/api/records/item/:id", async (req, res) => {
    try {
      await storage.deleteRecord(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "기록 삭제에 실패했습니다." });
    }
  });

  // 이메일 전송
  app.post("/api/send-email", async (req, res) => {
    const schema = z.object({
      toEmail: z.string().email(),
      fromEmail: z.string().email(),
      fromPassword: z.string(),
      patientId: z.number(),
      date: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "이메일 정보가 올바르지 않습니다." });

    const { toEmail, fromEmail, fromPassword, patientId, date } = parsed.data;

    try {
      const patient = await storage.getPatientById(patientId);
      const records = await storage.getRecordsByPatientAndDate(patientId, date);
      const moodEmoji = (m: number) => ["😢", "😟", "😐", "🙂", "😊"][m - 1] || "😐";

      const rows = records.map(r => `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px 12px;">${r.mealTime}</td>
          <td style="padding:8px 12px;">${r.foodContent}<br><small style="color:#888">${r.amount} · ${r.location}</small></td>
          <td style="padding:8px 12px; text-align:center;">${r.isBinge ? '<span style="color:#e53e3e;font-weight:bold;">폭식</span>' : '정상'}</td>
          <td style="padding:8px 12px;">${r.purgeType !== "없음" ? `<span style="color:#e53e3e">${r.purgeType}</span>` : '없음'}</td>
          <td style="padding:8px 12px;">${r.emotionBefore} → ${r.emotionAfter}</td>
          <td style="padding:8px 12px; text-align:center;">${moodEmoji(r.mood)} ${r.mood}/5</td>
          <td style="padding:8px 12px;">${r.situation}</td>
        </tr>
      `).join("");

      const bingeCount = records.filter(r => r.isBinge).length;
      const purgeCount = records.filter(r => r.purgeType !== "없음").length;

      const html = `
        <div style="font-family:'Noto Sans KR',sans-serif;max-width:900px;margin:0 auto;padding:24px;background:#f8fffe;">
          <div style="background:#01696f;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h2 style="margin:0;font-size:18px;">🍽️ 식이 자기모니터링 기록지</h2>
          </div>
          <div style="background:white;padding:20px 24px;border:1px solid #e0f0ee;border-top:none;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
              <tr>
                <td style="padding:6px 0;color:#666;">환자명</td>
                <td style="padding:6px 0;font-weight:bold;">${patient?.name || "알 수 없음"}</td>
                <td style="padding:6px 0;color:#666;">날짜</td>
                <td style="padding:6px 0;font-weight:bold;">${date}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666;">총 기록</td>
                <td style="padding:6px 0;font-weight:bold;">${records.length}건</td>
                <td style="padding:6px 0;color:#666;">폭식 / 제거행동</td>
                <td style="padding:6px 0;font-weight:bold;color:${(bingeCount + purgeCount) > 0 ? '#e53e3e' : '#437a22'}">
                  ${bingeCount}건 / ${purgeCount}건
                </td>
              </tr>
            </table>
            <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e0f0ee;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#e8f5f4;color:#01696f;">
                  <th style="padding:10px 12px;text-align:left;font-weight:600;">식사유형</th>
                  <th style="padding:10px 12px;text-align:left;font-weight:600;">음식/음료</th>
                  <th style="padding:10px 12px;text-align:center;font-weight:600;">폭식</th>
                  <th style="padding:10px 12px;text-align:left;font-weight:600;">제거행동</th>
                  <th style="padding:10px 12px;text-align:left;font-weight:600;">감정(전→후)</th>
                  <th style="padding:10px 12px;text-align:center;font-weight:600;">기분</th>
                  <th style="padding:10px 12px;text-align:left;font-weight:600;">상황/촉발요인</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#999;">이 날 기록이 없습니다.</td></tr>'}</tbody>
            </table>
            <p style="margin-top:20px;color:#999;font-size:11px;text-align:center;">
              이 기록지는 식이 자기모니터링 앱에서 자동 생성되었습니다.
            </p>
          </div>
        </div>
      `;

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: fromEmail, pass: fromPassword },
      });

      await transporter.sendMail({
        from: `"식이모니터링" <${fromEmail}>`,
        to: toEmail,
        subject: `[식이모니터링] ${patient?.name} - ${date} 기록지`,
        html,
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "이메일 전송에 실패했습니다.", detail: e.message });
    }
  });
}
