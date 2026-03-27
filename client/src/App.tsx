import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";
import LoginPage from "@/pages/LoginPage";
import PatientApp from "@/pages/PatientApp";
import TherapistApp from "@/pages/TherapistApp";
import type { Patient } from "@shared/schema";

type Session =
  | { role: "patient"; patient: Patient }
  | { role: "therapist" }
  | null;

export default function App() {
  const [session, setSession] = useState<Session>(null);

  return (
    <QueryClientProvider client={queryClient}>
      {session === null && <LoginPage onLogin={setSession} />}
      {session?.role === "patient" && (
        <PatientApp patient={session.patient} onLogout={() => setSession(null)} />
      )}
      {session?.role === "therapist" && (
        <TherapistApp onLogout={() => setSession(null)} />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
