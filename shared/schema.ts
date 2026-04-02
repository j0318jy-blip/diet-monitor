import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 치료자 테이블
export const therapists = sqliteTable("therapists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertTherapistSchema = createInsertSchema(therapists).omit({ id: true });
export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type Therapist = typeof therapists.$inferSelect;

// 환자 테이블 (therapistId 추가)
export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: text("created_at").notNull(),
  therapistId: integer("therapist_id"), // null 허용 (기존 환자 호환)
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// 식이 기록 테이블
export const foodRecords = sqliteTable("food_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull(),
  recordTime: text("record_time").notNull(),
  mealTime: text("meal_time").notNull(),
  location: text("location").notNull(),
  foodContent: text("food_content").notNull(),
  amount: text("amount").notNull(),
  isBinge: integer("is_binge", { mode: "boolean" }).notNull().default(false),
  purgeType: text("purge_type").notNull().default("없음"),
  emotionBefore: text("emotion_before").notNull(),
  emotionAfter: text("emotion_after").notNull(),
  mood: integer("mood").notNull(),
  situation: text("situation").notNull(),
  notes: text("notes").notNull().default(""),
  date: text("date").notNull(),
});

export const insertFoodRecordSchema = createInsertSchema(foodRecords).omit({ id: true });
export type InsertFoodRecord = z.infer<typeof insertFoodRecordSchema>;
export type FoodRecord = typeof foodRecords.$inferSelect;
