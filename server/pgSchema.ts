// PostgreSQL 전용 스키마 (Supabase용)
import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";

export const therapistsPg = pgTable("therapists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const patientsPg = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: text("created_at").notNull(),
  therapistId: integer("therapist_id"),
});

export const foodRecordsPg = pgTable("food_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  recordTime: text("record_time").notNull(),
  mealTime: text("meal_time").notNull(),
  location: text("location").notNull(),
  foodContent: text("food_content").notNull(),
  amount: text("amount").notNull(),
  isBinge: boolean("is_binge").notNull().default(false),
  purgeType: text("purge_type").notNull().default("없음"),
  emotionBefore: text("emotion_before").notNull(),
  emotionAfter: text("emotion_after").notNull(),
  mood: integer("mood").notNull(),
  situation: text("situation").notNull(),
  notes: text("notes").notNull().default(""),
  date: text("date").notNull(),
});
