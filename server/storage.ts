import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  patients, foodRecords,
  type InsertPatient, type Patient,
  type InsertFoodRecord, type FoodRecord,
} from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = !!DATABASE_URL;

let db: any;

if (isPostgres) {
  const client = postgres(DATABASE_URL!, { prepare: false });
  db = drizzlePg(client, { schema });
  console.log("Using Supabase PostgreSQL");
} else {
  const sqlite = new Database("diet_monitor.db");
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
  db = drizzleSqlite(sqlite, { schema });
  console.log("Using local SQLite");
}

export interface IStorage {
  getAllPatients(): Promise<Patient[]>;
  getPatientByCode(code: string): Promise<Patient | undefined>;
  getPatientById(id: number): Promise<Patient | undefined>;
  createPatient(data: InsertPatient): Promise<Patient>;
  deletePatient(id: number): Promise<void>;
  getRecordsByPatient(patientId: number): Promise<FoodRecord[]>;
  getRecordsByPatientAndDate(patientId: number, date: string): Promise<FoodRecord[]>;
  getRecordsByPatientAndWeek(patientId: number, startDate: string, endDate: string): Promise<FoodRecord[]>;
  createRecord(data: InsertFoodRecord): Promise<FoodRecord>;
  deleteRecord(id: number): Promise<void>;
}

export const storage: IStorage = {
  async getAllPatients() {
    if (isPostgres) return await db.select().from(patients).orderBy(patients.name);
    return db.select().from(patients).orderBy(patients.name).all();
  },
  async getPatientByCode(code: string) {
    if (isPostgres) {
      const rows = await db.select().from(patients).where(eq(patients.code, code));
      return rows[0];
    }
    return db.select().from(patients).where(eq(patients.code, code)).get();
  },
  async getPatientById(id: number) {
    if (isPostgres) {
      const rows = await db.select().from(patients).where(eq(patients.id, id));
      return rows[0];
    }
    return db.select().from(patients).where(eq(patients.id, id)).get();
  },
  async createPatient(data: InsertPatient) {
    if (isPostgres) {
      const rows = await db.insert(patients).values(data).returning();
      return rows[0];
    }
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
  async getRecordsByPatient(patientId: number) {
    if (isPostgres) return await db.select().from(foodRecords).where(eq(foodRecords.patientId, patientId)).orderBy(desc(foodRecords.recordTime));
    return db.select().from(foodRecords).where(eq(foodRecords.patientId, patientId)).orderBy(desc(foodRecords.recordTime)).all();
  },
  async getRecordsByPatientAndDate(patientId: number, date: string) {
    if (isPostgres) return await db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), eq(foodRecords.date, date))).orderBy(foodRecords.recordTime);
    return db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), eq(foodRecords.date, date))).orderBy(foodRecords.recordTime).all();
  },
  async getRecordsByPatientAndWeek(patientId: number, startDate: string, endDate: string) {
    if (isPostgres) return await db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), gte(foodRecords.date, startDate), lte(foodRecords.date, endDate))).orderBy(foodRecords.date, foodRecords.recordTime);
    return db.select().from(foodRecords).where(and(eq(foodRecords.patientId, patientId), gte(foodRecords.date, startDate), lte(foodRecords.date, endDate))).orderBy(foodRecords.date, foodRecords.recordTime).all();
  },
  async createRecord(data: InsertFoodRecord) {
    if (isPostgres) {
      const rows = await db.insert(foodRecords).values(data).returning();
      return rows[0];
    }
    return db.insert(foodRecords).values(data).returning().get();
  },
  async deleteRecord(id: number) {
    if (isPostgres) {
      await db.delete(foodRecords).where(eq(foodRecords.id, id));
    } else {
      db.delete(foodRecords).where(eq(foodRecords.id, id)).run();
    }
  },
};
