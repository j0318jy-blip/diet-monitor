import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserRound, Stethoscope, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { Patient } from "@shared/schema";

type Session =
  | { role: "patient"; patient: Patient }
  | { role: "therapist" }
  | null;

export default function LoginPage({ onLogin }: { onLogin: (s: Exclude<Session, null>) => void }) {
  const { toast } = useToast();
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  // 환자 로그인
  const [code, setCode] = useState("");
  const patientLogin = useMutation({
    mutationFn: () => apiRequest("POST", "/api/patients/login", { code }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast({ title: "오류", description: data.error, variant: "destructive" }); return; }
      onLogin({ role: "patient", patient: data });
    },
    onError: () => toast({ title: "오류", description: "코드를 확인해주세요.", variant: "destructive" }),
  });

  // 치료자 로그인
  const [pw, setPw] = useState("");
  const therapistLogin = useMutation({
    mutationFn: () => apiRequest("POST", "/api/therapist/login", { password: pw }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast({ title: "비밀번호 오류", description: data.error, variant: "destructive" }); return; }
      onLogin({ role: "therapist" });
    },
    onError: () => toast({ title: "오류", description: "비밀번호가 올바르지 않습니다.", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <button
        onClick={() => setDark(!dark)}
        className="fixed top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground"
        aria-label="테마 전환"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm space-y-6">
        {/* 로고 */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <svg viewBox="0 0 48 48" width="52" height="52" fill="none" className="text-primary">
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
              <path d="M14 28 C14 18 19 15 24 15 C29 15 34 18 34 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="32" r="3.5" fill="currentColor" />
              <path d="M11 34 L37 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">식이모니터링</h1>
          <p className="text-sm text-muted-foreground">식이 자기모니터링 기록 시스템</p>
        </div>

        <Tabs defaultValue="patient">
          <TabsList className="w-full">
            <TabsTrigger value="patient" className="flex-1 gap-1.5" data-testid="tab-patient">
              <UserRound size={15} /> 환자
            </TabsTrigger>
            <TabsTrigger value="therapist" className="flex-1 gap-1.5" data-testid="tab-therapist">
              <Stethoscope size={15} /> 치료자
            </TabsTrigger>
          </TabsList>

          {/* 환자 로그인 */}
          <TabsContent value="patient">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">환자 로그인</CardTitle>
                <CardDescription className="text-sm">치료자에게 받은 코드를 입력하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">접속 코드</Label>
                  <Input
                    id="code"
                    placeholder="예: 1234"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && patientLogin.mutate()}
                    maxLength={8}
                    data-testid="input-patient-code"
                    className="text-lg tracking-widest text-center"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => patientLogin.mutate()}
                  disabled={!code || patientLogin.isPending}
                  data-testid="button-patient-login"
                >
                  {patientLogin.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  입장하기
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 치료자 로그인 */}
          <TabsContent value="therapist">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">치료자 로그인</CardTitle>
                <CardDescription className="text-sm">치료자 전용 비밀번호를 입력하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pw">비밀번호</Label>
                  <Input
                    id="pw"
                    type="password"
                    placeholder="비밀번호 입력"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && therapistLogin.mutate()}
                    data-testid="input-therapist-pw"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => therapistLogin.mutate()}
                  disabled={!pw || therapistLogin.isPending}
                  data-testid="button-therapist-login"
                >
                  {therapistLogin.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  관리자 입장
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
