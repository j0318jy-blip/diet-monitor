import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  patients, foodRecords,
  type InsertPatient, type Patient,
  type InsertFoodRecord, type FoodRecord,
} from "@shared/schema";

const sqlite = new Database("diet_monitor.db");
const db = drizzle(sqlite, { schema });

// 테이블 생성
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS food_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    record_time TEXT NOT NULL,
    meal_time TEXT NOT NULL,
    location TEXT NOT NULL,
    food_content TEXT NOT NULL,
    amount TEXT NOT NULL,
    is_binge INTEGER NOT NULL DEFAULT 0,
    purge_type TEXT NOT NULL DEFAULT '없음',
    emotion_before TEXT NOT NULL,
    emotion_after TEXT NOT NULL,
    mood INTEGER NOT NULL,
    situation TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL
  );
`);

export interface IStorage {
  // 환자
  getAllPatients(): Patient[];
  getPatientByCode(code: string): Patient | undefined;
  getPatientById(id: number): Patient | undefined;
  createPatient(data: InsertPatient): Patient;
  deletePatient(id: number): void;

  // 기록
  getRecordsByPatient(patientId: number): FoodRecord[];
  getRecordsByPatientAndDate(patientId: number, date: string): FoodRecord[];
  createRecord(data: InsertFoodRecord): FoodRecord;
  deleteRecord(id: number): void;
}

export const storage: IStorage = {
  getAllPatients() {
    return db.select().from(patients).orderBy(patients.name).all();
  },
  getPatientByCode(code: string) {
    return db.select().from(patients).where(eq(patients.code, code)).get();
  },
  getPatientById(id: number) {
    return db.select().from(patients).where(eq(patients.id, id)).get();
  },
  createPatient(data: InsertPatient) {
    return db.insert(patients).values(data).returning().get();
  },
  deletePatient(id: number) {
    db.delete(foodRecords).where(eq(foodRecords.patientId, id)).run();
    db.delete(patients).where(eq(patients.id, id)).run();
  },

  getRecordsByPatient(patientId: number) {
    return db.select().from(foodRecords)
      .where(eq(foodRecords.patientId, patientId))
      .orderBy(desc(foodRecords.recordTime))
      .all();
  },
  getRecordsByPatientAndDate(patientId: number, date: string) {
    return db.select().from(foodRecords)
      .where(and(eq(foodRecords.patientId, patientId), eq(foodRecords.date, date)))
      .orderBy(foodRecords.recordTime)
      .all();
  },
  createRecord(data: InsertFoodRecord) {
    return db.insert(foodRecords).values(data).returning().get();
  },
  deleteRecord(id: number) {
    db.delete(foodRecords).where(eq(foodRecords.id, id)).run();
  },
};
