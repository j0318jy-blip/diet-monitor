import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import * as schema from "@shared/schema";
import { therapistsPg, patientsPg, foodRecordsPg } from "./pgSchema";
import {
  therapists as therapistsSqlite,
  patients as patientsSqlite,
  foodRecords as foodRecordsSqlite,
  type InsertTherapist, type Therapist,
  type InsertPatient, type Patient,
  type InsertFoodRecord, type FoodRecord,
} from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = !!DATABASE_URL;

let db: any;
let therapists: any;
let patients: any;
let foodRecords: any;

if (isPostgres) {
  const client = postgres(DATABASE_URL!, { prepare: false });
  const pgSchema = { therapists: therapistsPg, patients: patientsPg, foodRecords: foodRecordsPg };
  db = drizzlePg(client, { schema: pgSchema });
  therapists = therapistsPg;
  patients = patientsPg;
  foodRecords = foodRecordsPg;
  console.log("Using Supabase PostgreSQL");
} else {
  const sqlite = new Database("diet_monitor.db");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS therapists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      therapist_id INTEGER
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
  try { sqlite.exec(`ALTER TABLE patients ADD COLUMN therapist_id INTEGER`); } catch {}
  db = drizzleSqlite(sqlite, { schema });
  therapists = therapistsSqlite;
  patients = patientsSqlite;
  foodRecords = foodRecordsSqlite;
  console.log("Using local SQLite");
}

// PostgreSQL에서 isBinge가 boolean으로 오므로 정규화
function normalizeRecord(r: any): FoodRecord {
  return {
    ...r,
    isBinge: r.isBinge === true || r.isBinge === 1 || r.is_binge === true || r.is_binge === 1,
  };
}

export interface IStorage {
  getAllTherapists(): Promise<Therapist[]>;
  getTherapistById(id: number): Promise<Therapist | undefined>;
  createTherapist(data: InsertTherapist): Promise<Therapist>;
  deleteTherapist(id: number): Promise<void>;

  getAllPatients(): Promise<Patient[]>;
  getPatientsByTherapist(therapistId: number): Promise<Patient[]>;
  getPatientByCode(code: string): Promise<Patient | undefined>;
  getPatientById(id: number): Promise<Patient | undefined>;
  createPatient(data: InsertPatient): Promise<Patient>;
  deletePatient(id: number): Promise<void>;

  getRecordsByPatient(patientId: number): Promise<FoodRecord[]>;
  getRecordsByPatientAndDate(patientId: number, date: string): Promise<FoodRecord[]>;
  getRecordsByPatientAndWeek(patientId: number, startDate: string, endDate: string): Promise<FoodRecord[]>;
  createRecord(data: InsertFoodRecord): Promise<FoodRecord>;
  updateRecord(id: number, data: Partial<InsertFoodRecord>): Promise<FoodRecord>;
  deleteRecord(id: number): Promise<void>;
}

export const storage: IStorage = {
  // ─── 치료자 ──────────────────────────────────────────────
  async getAllTherapists() {
    if (isPostgres) return await db.select().from(therapists).orderBy(therapists.name);
    return db.select().from(therapists).orderBy(therapists.name).all();
  },
  async getTherapistById(id: number) {
    if (isPostgres) { const rows = await db.select().from(therapists).where(eq(therapists.id, id)); return rows[0]; }
    return db.select().from(therapists).where(eq(therapists.id, id)).get();
  },
  async createTherapist(data: InsertTherapist) {
    if (isPostgres) { const rows = await db.insert(therapists).values(data).returning(); return rows[0]; }
    return db.insert(therapists).values(data).returning().get();
  },
  async deleteTherapist(id: number) {
    if (isPostgres) {
      await db.update(patients).set({ therapistId: null }).where(eq(patients.therapistId, id));
      await db.delete(therapists).where(eq(therapists.id, id));
    } else {
      db.update(patients).set({ therapistId: null }).where(eq(patients.therapistId, id)).run();
      db.delete(therapists).where(eq(therapists.id, id)).run();
    }
  },

  // ─── 환자 ────────────────────────────────────────────────
  async getAllPatients() {
    if (isPostgres) return await db.select().from(patients).orderBy(patients.name);
    return db.select().from(patients).orderBy(patients.name).all();
  },
  async getPatientsByTherapist(therapistId: number) {
    if (isPostgres) return await db.select().from(patients).where(eq(patients.therapistId, therapistId)).orderBy(patients.name);
    return db.select().from(patients).where(eq(patients.therapistId, therapistId)).orderBy(patients.name).all();
  },
  async getPatientByCode(code: string) {
    if (isPostgres) { const rows = await db.select().from(patients).where(eq(patients.code, code)); return rows[0]; }
    return db.select().from(patients).where(eq(patients.code, code)).get();
  },
  async getPatientById(id: number) {
    if (isPostgres) { const rows = await db.select().from(patients).where(eq(patients.id, id)); return rows[0]; }
    return db.select().from(patients).where(eq(patients.id, id)).get();
  },
  async createPatient(data: InsertPatient) {
    if (isPostgres) { const rows = await db.insert(patients).values(data).returning(); return rows[0]; }
    return db.insert(patients).values(data).returning().get();
  },
  async deletePatient(id: number) {
    if (isPostgres) {
      await db.delete(foodRecords).where(eq(foodRecords.patientId, id));
      await db.delete(patients).where(eq(patients.id, id));
    } else {
      db.delete(foodRecords).where(eq(foodRecords.patientId, id)).run();
      db.delete(patients).where(eq(patients.id, id)).run();
    }
  },

  // ─── 기록 ────────────────────────────────────────────────
  async getRecordsByPatient(patientId: number) {
    if (isPostgres) {
      const rows = await db.select().from(foodRecords).where(eq(foodRecords.patientId, patientId)).orderBy(desc(foodRecords.recordTime));
      return rows.map(normalizeRecord);
    }
    return db.select().from(foodRecords).where(eq(foodRecords.patientId, patientId)).orderBy(desc(foodRecords.recordTime)).all();
  },
  async getRecordsByPatientAndDate(patientId: number, date: string) {
    if (isPostgres) {
      const rows = await db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), eq(foodRecords.date, date))).orderBy(foodRecords.recordTime);
      return rows.map(normalizeRecord);
    }
    return db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), eq(foodRecords.date, date))).orderBy(foodRecords.recordTime).all();
  },
  async getRecordsByPatientAndWeek(patientId: number, startDate: string, endDate: string) {
    if (isPostgres) {
      const rows = await db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), gte(foodRecords.date, startDate), lte(foodRecords.date, endDate))).orderBy(foodRecords.date, foodRecords.recordTime);
      return rows.map(normalizeRecord);
    }
    return db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), gte(foodRecords.date, startDate), lte(foodRecords.date, endDate))).orderBy(foodRecords.date, foodRecords.recordTime).all();
  },
  async createRecord(data: InsertFoodRecord) {
    if (isPostgres) {
      const rows = await db.insert(foodRecords).values(data).returning();
      return normalizeRecord(rows[0]);
    }
    return db.insert(foodRecords).values(data).returning().get();
  },
  async updateRecord(id: number, data: Partial<InsertFoodRecord>) {
    if (isPostgres) {
      const rows = await db.update(foodRecords).set(data).where(eq(foodRecords.id, id)).returning();
      return normalizeRecord(rows[0]);
    }
    return db.update(foodRecords).set(data).where(eq(foodRecords.id, id)).returning().get();
  },
  async deleteRecord(id: number) {
    if (isPostgres) { await db.delete(foodRecords).where(eq(foodRecords.id, id)); }
    else { db.delete(foodRecords).where(eq(foodRecords.id, id)).run(); }
  },
};
