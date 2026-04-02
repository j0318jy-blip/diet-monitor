import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertFoodRecordSchema, insertPatientSchema, insertTherapistSchema } from "@shared/schema";
import nodemailer from "nodemailer";
import { z } from "zod";

const THERAPIST_PASSWORD = process.env.THERAPIST_PASSWORD || "therapist1234";

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {

  // ─── 치료자 인증 ────────────────────────────────────────
  app.post("/api/therapist/login", (req, res) => {
    const { password } = req.body;
    if (password === THERAPIST_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    }
  });

  // ─── 치료자 목록/추가/삭제 ──────────────────────────────
  app.get("/api/therapists", async (req, res) => {
    try { res.json(await storage.getAllTherapists()); }
    catch (e: any) { console.error(e); res.status(500).json({ error: "치료자 목록 조회 실패" }); }
  });

  app.post("/api/therapists", async (req, res) => {
    try {
      const parsed = insertTherapistSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "입력 형식 오류" });
      res.status(201).json(await storage.createTherapist(parsed.data));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "치료자 등록 실패" }); }
  });

  app.delete("/api/therapists/:id", async (req, res) => {
    try {
      await storage.deleteTherapist(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: "치료자 삭제 실패" }); }
  });

  // ─── 환자 ──────────────────────────────────────────────
  // 전체 환자 목록
  app.get("/api/patients", async (req, res) => {
    try { res.json(await storage.getAllPatients()); }
    catch (e: any) { console.error(e); res.status(500).json({ error: "환자 목록 조회 실패" }); }
  });

  // 치료자별 환자 목록
  app.get("/api/therapists/:therapistId/patients", async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId, 10);
      if (isNaN(therapistId)) return res.json([]);
      res.json(await storage.getPatientsByTherapist(therapistId));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "환자 목록 조회 실패" }); }
  });

  // 환자 로그인
  app.post("/api/patients/login", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "코드를 입력하세요." });
      const patient = await storage.getPatientByCode(String(code));
      if (!patient) return res.status(404).json({ error: "등록된 환자를 찾을 수 없습니다." });
      res.json(patient);
    } catch (e: any) { console.error(e); res.status(500).json({ error: "로그인 실패" }); }
  });

  // 환자 등록
  app.post("/api/patients", async (req, res) => {
    try {
      const parsed = insertPatientSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "입력 형식 오류" });
      const existing = await storage.getPatientByCode(parsed.data.code);
      if (existing) return res.status(409).json({ error: "이미 사용 중인 코드입니다." });
      res.status(201).json(await storage.createPatient(parsed.data));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "환자 등록 실패" }); }
  });

  // 환자 삭제
  app.delete("/api/patients/:id", async (req, res) => {
    try {
      await storage.deletePatient(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: "환자 삭제 실패" }); }
  });

  // ─── 기록 ──────────────────────────────────────────────
  app.get("/api/records/:patientId/date/:date", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) return res.json([]);
      res.json(await storage.getRecordsByPatientAndDate(patientId, req.params.date));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "기록 조회 실패" }); }
  });

  app.get("/api/records/:patientId/week", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) return res.json([]);
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      if (!startDate || !endDate) return res.status(400).json({ error: "startDate, endDate 필요" });
      res.json(await storage.getRecordsByPatientAndWeek(patientId, startDate, endDate));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "기록 조회 실패" }); }
  });

  app.get("/api/records/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) return res.json([]);
      res.json(await storage.getRecordsByPatient(patientId));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "기록 조회 실패" }); }
  });

  app.post("/api/records", async (req, res) => {
    try {
      const parsed = insertFoodRecordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "입력 형식 오류" });
      res.status(201).json(await storage.createRecord(parsed.data));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "기록 저장 실패" }); }
  });

  app.patch("/api/records/item/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "잘못된 ID" });
      res.json(await storage.updateRecord(id, req.body));
    } catch (e: any) { console.error(e); res.status(500).json({ error: "기록 수정 실패" }); }
  });

  app.delete("/api/records/item/:id", async (req, res) => {
    try {
      await storage.deleteRecord(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: "기록 삭제 실패" }); }
  });

  // ─── 이메일 전송 ────────────────────────────────────────
  app.post("/api/send-email", async (req, res) => {
    const schema = z.object({
      toEmail: z.string().email(),
      fromEmail: z.string().email(),
      fromPassword: z.string(),
      patientId: z.number(),
      date: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "이메일 정보 오류" });

    const { toEmail, fromEmail, fromPassword, patientId, date } = parsed.data;

    try {
      const patient = await storage.getPatientById(patientId);
      const records = await storage.getRecordsByPatientAndDate(patientId, date);
      const moodEmoji = (m: number) => ["😢", "😟", "😐", "🙂", "😊"][m - 1] || "😐";

      const rows = records.map(r => `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px 12px;">${r.mealTime}</td>
          <td style="padding:8px 12px;">${r.foodContent}<br><small style="color:#888">${r.amount} · ${r.location}</small></td>
          <td style="padding:8px 12px;text-align:center;">${r.isBinge ? '<span style="color:#e53e3e;font-weight:bold;">폭식</span>' : '정상'}</td>
          <td style="padding:8px 12px;">${r.purgeType !== "없음" ? `<span style="color:#e53e3e">${r.purgeType}</span>` : '없음'}</td>
          <td style="padding:8px 12px;">${r.emotionBefore} → ${r.emotionAfter}</td>
          <td style="padding:8px 12px;text-align:center;">${moodEmoji(r.mood)} ${r.mood}/5</td>
          <td style="padding:8px 12px;">${r.situation}</td>
        </tr>`).join("");

      const bingeCount = records.filter(r => r.isBinge).length;
      const purgeCount = records.filter(r => r.purgeType !== "없음").length;

      const html = `
        <div style="font-family:'Noto Sans KR',sans-serif;max-width:900px;margin:0 auto;padding:24px;">
          <div style="background:#01696f;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h2 style="margin:0;font-size:18px;">🍽️ 식이 자기모니터링 기록지</h2>
          </div>
          <div style="background:white;padding:20px 24px;border:1px solid #e0f0ee;border-top:none;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
              <tr><td style="padding:6px 0;color:#666;">환자명</td><td style="font-weight:bold;">${patient?.name || "알 수 없음"}</td>
              <td style="color:#666;">날짜</td><td style="font-weight:bold;">${date}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">총 기록</td><td style="font-weight:bold;">${records.length}건</td>
              <td style="color:#666;">폭식/제거행동</td><td style="font-weight:bold;color:${(bingeCount+purgeCount)>0?'#e53e3e':'#437a22'}">${bingeCount}건 / ${purgeCount}건</td></tr>
            </table>
            <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e0f0ee;">
              <thead><tr style="background:#e8f5f4;color:#01696f;">
                <th style="padding:10px 12px;text-align:left;">식사유형</th><th style="padding:10px 12px;text-align:left;">음식/음료</th>
                <th style="padding:10px 12px;text-align:center;">폭식</th><th style="padding:10px 12px;text-align:left;">제거행동</th>
                <th style="padding:10px 12px;text-align:left;">감정(전→후)</th><th style="padding:10px 12px;text-align:center;">기분</th>
                <th style="padding:10px 12px;text-align:left;">상황/촉발요인</th>
              </tr></thead>
              <tbody>${rows || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#999;">기록 없음</td></tr>'}</tbody>
            </table>
          </div>
        </div>`;

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 587, secure: false,
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
      res.status(500).json({ error: "이메일 전송 실패", detail: e.message });
    }
  });
}
