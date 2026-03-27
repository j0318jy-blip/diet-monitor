import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Patient, FoodRecord } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LogOut, UserPlus, Users, Trash2, Send, ChevronRight, Loader2, Info } from "lucide-react";

const moodEmoji = (m: number) => ["😢", "😟", "😐", "🙂", "😊"][m - 1] || "😐";

// 환자별 기록 조회 패널
function PatientRecordsPanel({ patient }: { patient: Patient }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [emailOpen, setEmailOpen] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [fromPassword, setFromPassword] = useState("");
  const [toEmail, setToEmail] = useState("");
  const { toast } = useToast();

  const { data: records, isLoading } = useQuery<FoodRecord[]>({
    queryKey: ["/api/records", patient.id, selectedDate],
    queryFn: () => apiRequest("GET", `/api/records/${patient.id}/date/${selectedDate}`).then(r => r.json()),
  });

  const sendEmail = useMutation({
    mutationFn: () => apiRequest("POST", "/api/send-email", {
      toEmail, fromEmail, fromPassword,
      patientId: patient.id,
      date: selectedDate,
    }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: "❌ 전송 실패", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✅ 이메일 전송 완료" });
        setEmailOpen(false);
        setFromPassword("");
      }
    },
    onError: () => toast({ title: "❌ 전송 실패", variant: "destructive" }),
  });

  const bingeCount = records?.filter(r => r.isBinge).length ?? 0;
  const purgeCount = records?.filter(r => r.purgeType !== "없음").length ?? 0;

  return (
    <div className="space-y-3">
      {/* 날짜 + 이메일 전송 */}
      <div className="flex gap-2 items-center">
        <Input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="flex-1"
        />
        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
              <Send size={14} /> 이메일 전송
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">이메일 전송</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">{patient.name} · {selectedDate} 기록지</p>

              <Accordion type="single" collapsible>
                <AccordionItem value="guide" className="border rounded-lg px-1">
                  <AccordionTrigger className="text-xs py-2 px-2 hover:no-underline text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Info size={12} /> Gmail 앱 비밀번호 설정 방법</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Google 계정 → 보안 → 2단계 인증 활성화</li>
                      <li>앱 비밀번호 메뉴 → 새 앱 비밀번호 생성</li>
                      <li>생성된 16자리 비밀번호를 아래에 입력</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="space-y-1.5">
                <Label className="text-sm">내 Gmail 주소</Label>
                <Input placeholder="myemail@gmail.com" value={fromEmail} onChange={e => setFromEmail(e.target.value)} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Gmail 앱 비밀번호</Label>
                <Input placeholder="16자리 앱 비밀번호" value={fromPassword} onChange={e => setFromPassword(e.target.value)} type="password" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">받는 이메일</Label>
                <Input placeholder="therapist@example.com" value={toEmail} onChange={e => setToEmail(e.target.value)} type="email" />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => sendEmail.mutate()}
                disabled={!fromEmail || !fromPassword || !toEmail || sendEmail.isPending}
                className="w-full"
              >
                {sendEmail.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send size={14} className="mr-2" />}
                기록지 전송
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 요약 통계 */}
      {records && records.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="pt-2 pb-2 text-center"><p className="text-lg font-bold text-primary">{records.length}</p><p className="text-xs text-muted-foreground">기록</p></CardContent></Card>
          <Card className={bingeCount > 0 ? "border-destructive/40" : ""}><CardContent className="pt-2 pb-2 text-center"><p className={`text-lg font-bold ${bingeCount > 0 ? "text-destructive" : "text-primary"}`}>{bingeCount}</p><p className="text-xs text-muted-foreground">폭식</p></CardContent></Card>
          <Card className={purgeCount > 0 ? "border-destructive/40" : ""}><CardContent className="pt-2 pb-2 text-center"><p className={`text-lg font-bold ${purgeCount > 0 ? "text-destructive" : "text-primary"}`}>{purgeCount}</p><p className="text-xs text-muted-foreground">제거행동</p></CardContent></Card>
        </div>
      )}

      {/* 기록 목록 */}
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
      ) : records?.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">이 날짜에 기록이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {records?.map(r => (
            <Card key={r.id} className={`border ${r.isBinge ? "border-destructive/30" : "border-border"}`}>
              <CardContent className="pt-2 pb-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{r.mealTime}</Badge>
                      {r.isBinge && <Badge variant="destructive" className="text-xs">폭식</Badge>}
                      {r.purgeType !== "없음" && <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">{r.purgeType}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{r.recordTime?.slice(11, 16)}</span>
                    </div>
                    <p className="text-sm font-medium mt-1 truncate">{r.foodContent}</p>
                    <p className="text-xs text-muted-foreground">{r.location} · {r.amount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{moodEmoji(r.mood)} {r.emotionBefore} → {r.emotionAfter}</p>
                    {r.situation && <p className="text-xs text-muted-foreground">📍 {r.situation}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// 환자 추가 다이얼로그
function AddPatientDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/patients", {
      name, code,
      createdAt: new Date().toISOString(),
    }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: "오류", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: `✅ ${name} 환자 등록 완료`, description: `코드: ${code}` });
      setName(""); setCode("");
      setOpen(false);
      onAdded();
    },
    onError: () => toast({ title: "등록 실패", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus size={15} /> 환자 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>환자 등록</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>환자 이름</Label>
            <Input placeholder="예: 홍길동" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>접속 코드</Label>
            <Input
              placeholder="예: 1234 (숫자 4~8자리)"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={8}
              className="tracking-widest text-center"
            />
            <p className="text-xs text-muted-foreground">환자가 앱에 접속할 때 사용하는 코드입니다</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || !code || mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            등록하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TherapistApp({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);

  const { data: patients, isLoading, refetch } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    queryFn: () => apiRequest("GET", "/api/patients").then(r => r.json()),
  });

  const deletePatient = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/patients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "환자가 삭제되었습니다." });
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-lg mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" width="26" height="26" fill="none" className="text-primary">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M10 18 C10 12 14 10 16 10 C18 10 22 12 22 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="21" r="2.5" fill="currentColor" />
            <path d="M8 22 L24 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">치료자 관리</p>
            <p className="text-xs text-muted-foreground leading-tight">식이모니터링</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground gap-1.5">
          <LogOut size={15} /> 로그아웃
        </Button>
      </header>

      <div className="px-4 py-5 space-y-4 pb-10">
        {/* 환자 목록 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="font-bold text-base">환자 목록</h2>
            {patients && <Badge variant="secondary">{patients.length}명</Badge>}
          </div>
          <AddPatientDialog onAdded={() => refetch()} />
        </div>

        {/* 환자 목록 */}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : patients?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm font-medium">등록된 환자가 없습니다</p>
            <p className="text-xs mt-1">오른쪽 위 버튼으로 환자를 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patients?.map(patient => (
              <Card key={patient.id} className="border border-border">
                <CardContent className="pt-0 pb-0">
                  {/* 환자 행 */}
                  <div
                    className="flex items-center justify-between py-3 cursor-pointer"
                    onClick={() => setExpandedPatient(expandedPatient === patient.id ? null : patient.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">접속 코드: <span className="font-mono font-bold">{patient.code}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={e => e.stopPropagation()}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{patient.name} 환자를 삭제할까요?</AlertDialogTitle>
                            <AlertDialogDescription>모든 기록이 함께 삭제되며 되돌릴 수 없습니다.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePatient.mutate(patient.id)} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight
                        size={18}
                        className={`text-muted-foreground transition-transform ${expandedPatient === patient.id ? "rotate-90" : ""}`}
                      />
                    </div>
                  </div>

                  {/* 기록 패널 */}
                  {expandedPatient === patient.id && (
                    <div className="border-t pt-3 pb-4">
                      <PatientRecordsPanel patient={patient} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">
          <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer"
            className="hover:text-primary">Created with Perplexity Computer</a>
        </p>
      </div>
    </div>
  );
}
