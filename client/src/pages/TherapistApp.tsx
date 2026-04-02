import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addWeeks, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { Patient, FoodRecord, Therapist } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LogOut, UserPlus, Users, Trash2, Send, ChevronRight, ChevronLeft, Loader2, Info, CalendarDays, Calendar, UserCog, ArrowLeft, RefreshCw } from "lucide-react";

const moodEmoji = (m: number) => ["😢", "😟", "😐", "🙂", "😊"][m - 1] || "😐";
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// ─── 툴팁 텍스트 셀 ──────────────────────────────────────
function TipCell({ text, className = "" }: { text: string; className?: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className={`truncate cursor-default ${className}`}>{text}</p>
        </TooltipTrigger>
        {text && (
          <TooltipContent side="top" className="max-w-xs text-xs break-words whitespace-pre-wrap">
            {text}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── 주간 뷰 ─────────────────────────────────────────────
function WeeklyView({ patient }: { patient: Patient }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(weekEnd, "yyyy-MM-dd");

  const { data: records, isLoading, refetch, isFetching } = useQuery<FoodRecord[]>({
    queryKey: ["/api/records/week", patient.id, startDate],
    queryFn: () => apiRequest("GET", `/api/records/${patient.id}/week?startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
    refetchInterval: 60000, // 1분마다 자동 새로고침
  });

  const grouped: Record<string, FoodRecord[]> = {};
  records?.forEach(r => { if (!grouped[r.date]) grouped[r.date] = []; grouped[r.date].push(r); });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return format(d, "yyyy-MM-dd");
  });

  const totalRecords = records?.length ?? 0;
  const totalBinge = records?.filter(r => r.isBinge).length ?? 0;
  const totalPurge = records?.filter(r => r.purgeType !== "없음").length ?? 0;

  return (
    <div className="space-y-3">
      {/* 주간 네비게이션 */}
      <div className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft size={16} />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">
            {format(weekStart, "M월 d일", { locale: ko })} ~ {format(weekEnd, "M월 d일", { locale: ko })}
          </p>
          <p className="text-xs text-muted-foreground">
            {weekOffset === 0 ? "이번 주" : weekOffset === -1 ? "지난 주" : `${Math.abs(weekOffset)}주 전`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} title="새로고침">
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* 주간 요약 */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="pt-2 pb-2 text-center"><p className="text-lg font-bold text-primary">{totalRecords}</p><p className="text-xs text-muted-foreground">총 기록</p></CardContent></Card>
          <Card className={totalBinge > 0 ? "border-destructive/40" : ""}><CardContent className="pt-2 pb-2 text-center"><p className={`text-lg font-bold ${totalBinge > 0 ? "text-destructive" : "text-primary"}`}>{totalBinge}</p><p className="text-xs text-muted-foreground">폭식</p></CardContent></Card>
          <Card className={totalPurge > 0 ? "border-destructive/40" : ""}><CardContent className="pt-2 pb-2 text-center"><p className={`text-lg font-bold ${totalPurge > 0 ? "text-destructive" : "text-primary"}`}>{totalPurge}</p><p className="text-xs text-muted-foreground">제거행동</p></CardContent></Card>
        </div>
      )}

      {/* 날짜별 기록 */}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
      ) : totalRecords === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">이 주에 기록이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {days.map(date => {
            const dayRecords = grouped[date] || [];
            if (dayRecords.length === 0) return null;
            const dayBinge = dayRecords.filter(r => r.isBinge).length;
            const dayPurge = dayRecords.filter(r => r.purgeType !== "없음").length;
            const dayOfWeek = DAY_LABELS[new Date(date + "T00:00:00").getDay()];
            const isToday = date === format(today, "yyyy-MM-dd");

            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {dayOfWeek}
                  </div>
                  <p className="text-sm font-medium">{format(parseISO(date), "M월 d일", { locale: ko })}</p>
                  <div className="flex gap-1 ml-auto">
                    <Badge variant="secondary" className="text-xs">{dayRecords.length}건</Badge>
                    {dayBinge > 0 && <Badge variant="destructive" className="text-xs">폭식 {dayBinge}</Badge>}
                    {dayPurge > 0 && <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">제거 {dayPurge}</Badge>}
                  </div>
                </div>
                <div className="space-y-1.5 ml-10">
                  {dayRecords.map(r => (
                    <Card key={r.id} className={`border ${r.isBinge ? "border-destructive/30" : "border-border"}`}>
                      <CardContent className="pt-2 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{r.mealTime}</Badge>
                          {r.isBinge && <Badge variant="destructive" className="text-xs">폭식</Badge>}
                          {r.purgeType !== "없음" && <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">{r.purgeType}</Badge>}
                          <span className="text-xs text-muted-foreground ml-auto">{r.recordTime?.slice(11, 16)}</span>
                        </div>
                        <TipCell text={r.foodContent} className="text-sm font-medium mt-0.5" />
                        <p className="text-xs text-muted-foreground">{r.location} · {r.amount}</p>
                        <p className="text-xs text-muted-foreground">{moodEmoji(r.mood)} {r.emotionBefore} → {r.emotionAfter}</p>
                        {r.situation && <TipCell text={r.situation} className="text-xs text-muted-foreground" />}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 날짜별 뷰 ───────────────────────────────────────────
function DailyView({ patient }: { patient: Patient }) {
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
      patientId: Number(patient.id), date: selectedDate,
    }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast({ title: "❌ 전송 실패", description: data.error, variant: "destructive" }); return; }
      toast({ title: "✅ 이메일 전송 완료" });
      setEmailOpen(false); setFromPassword("");
    },
    onError: () => toast({ title: "❌ 전송 실패", variant: "destructive" }),
  });

  const bingeCount = records?.filter(r => r.isBinge).length ?? 0;
  const purgeCount = records?.filter(r => r.purgeType !== "없음").length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="flex-1" />
        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0"><Send size={14} /> 이메일</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-base">이메일 전송</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">{patient.name} · {selectedDate}</p>
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
              <Button onClick={() => sendEmail.mutate()} disabled={!fromEmail || !fromPassword || !toEmail || sendEmail.isPending} className="w-full">
                {sendEmail.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send size={14} className="mr-2" />}
                기록지 전송
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {records && records.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="pt-2 pb-2 text-center"><p className="text-lg font-bold text-primary">{records.length}</p><p className="text-xs text-muted-foreground">기록</p></CardContent></Card>
          <Card className={bingeCount > 0 ? "border-destructive/40" : ""}><CardContent className="pt-2 pb-2 text-center"><p className={`text-lg font-bold ${bingeCount > 0 ? "text-destructive" : "text-primary"}`}>{bingeCount}</p><p className="text-xs text-muted-foreground">폭식</p></CardContent></Card>
          <Card className={purgeCount > 0 ? "border-destructive/40" : ""}><CardContent className="pt-2 pb-2 text-center"><p className={`text-lg font-bold ${purgeCount > 0 ? "text-destructive" : "text-primary"}`}>{purgeCount}</p><p className="text-xs text-muted-foreground">제거행동</p></CardContent></Card>
        </div>
      )}

      {isLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />) :
        records?.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">이 날짜에 기록이 없습니다</p> :
        <div className="space-y-2">
          {records?.map(r => (
            <Card key={r.id} className={`border ${r.isBinge ? "border-destructive/30" : "border-border"}`}>
              <CardContent className="pt-2 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{r.mealTime}</Badge>
                  {r.isBinge && <Badge variant="destructive" className="text-xs">폭식</Badge>}
                  {r.purgeType !== "없음" && <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">{r.purgeType}</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">{r.recordTime?.slice(11, 16)}</span>
                </div>
                <TipCell text={r.foodContent} className="text-sm font-medium mt-1" />
                <p className="text-xs text-muted-foreground">{r.location} · {r.amount}</p>
                <p className="text-xs text-muted-foreground">{moodEmoji(r.mood)} {r.emotionBefore} → {r.emotionAfter}</p>
                {r.situation && <TipCell text={r.situation} className="text-xs text-muted-foreground" />}
              </CardContent>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

// ─── 환자 패널 ────────────────────────────────────────────
function PatientRecordsPanel({ patient }: { patient: Patient }) {
  return (
    <Tabs defaultValue="weekly">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="weekly" className="flex-1 gap-1.5 text-xs"><CalendarDays size={13} /> 주간 보기</TabsTrigger>
        <TabsTrigger value="daily" className="flex-1 gap-1.5 text-xs"><Calendar size={13} /> 날짜별 보기</TabsTrigger>
      </TabsList>
      <TabsContent value="weekly" className="mt-0"><WeeklyView patient={patient} /></TabsContent>
      <TabsContent value="daily" className="mt-0"><DailyView patient={patient} /></TabsContent>
    </Tabs>
  );
}

// ─── 환자 추가 다이얼로그 ─────────────────────────────────
function AddPatientDialog({ therapistId, onAdded }: { therapistId: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/patients", {
      name, code, therapistId,
      createdAt: new Date().toISOString(),
    }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast({ title: "오류", description: data.error, variant: "destructive" }); return; }
      toast({ title: `✅ ${name} 환자 등록 완료`, description: `코드: ${code}` });
      setName(""); setCode(""); setOpen(false); onAdded();
    },
    onError: () => toast({ title: "등록 실패", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><UserPlus size={15} /> 환자 추가</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>환자 등록</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>환자 이름</Label>
            <Input placeholder="예: 홍길동" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>접속 코드</Label>
            <Input placeholder="예: 1234 (숫자 4~8자리)" value={code} onChange={e => setCode(e.target.value)} maxLength={8} className="tracking-widest text-center" />
            <p className="text-xs text-muted-foreground">환자가 앱에 접속할 때 사용하는 코드입니다</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!name || !code || mutation.isPending} className="w-full">
            {mutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} 등록하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 치료자별 환자 관리 화면 ──────────────────────────────
function TherapistPatients({ therapist, onBack }: { therapist: Therapist; onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);

  const { data: patients, isLoading, refetch } = useQuery<Patient[]>({
    queryKey: ["/api/therapists", therapist.id, "patients"],
    queryFn: () => apiRequest("GET", `/api/therapists/${therapist.id}/patients`).then(r => r.json()),
  });

  const deletePatient = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/patients/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/therapists", therapist.id, "patients"] }); toast({ title: "환자가 삭제되었습니다." }); },
  });

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <p className="text-sm font-bold">{therapist.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={11} /> {patients?.length ?? 0}명
            </p>
          </div>
        </div>
        <AddPatientDialog therapistId={therapist.id} onAdded={() => refetch()} />
      </div>

      {/* 환자 목록 */}
      {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />) :
        patients?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">👤</p>
            <p className="text-sm">등록된 환자가 없습니다</p>
            <p className="text-xs mt-1">오른쪽 위 버튼으로 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patients?.map(patient => (
              <Card key={patient.id} className="border border-border">
                <CardContent className="pt-0 pb-0">
                  <div className="flex items-center justify-between py-3 cursor-pointer"
                    onClick={() => setExpandedPatient(expandedPatient === patient.id ? null : patient.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">코드: <span className="font-mono font-bold">{patient.code}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                            <Trash2 size={15} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{patient.name} 환자를 삭제할까요?</AlertDialogTitle>
                            <AlertDialogDescription>모든 기록이 함께 삭제됩니다.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePatient.mutate(patient.id)} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight size={18} className={`text-muted-foreground transition-transform ${expandedPatient === patient.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  {expandedPatient === patient.id && (
                    <div className="border-t pt-3 pb-4"><PatientRecordsPanel patient={patient} /></div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ─── 치료자 선택 화면 ─────────────────────────────────────
function TherapistSelect({ onSelect }: { onSelect: (t: Therapist) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: therapistList, isLoading, refetch } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
    queryFn: () => apiRequest("GET", "/api/therapists").then(r => r.json()),
  });

  const addTherapist = useMutation({
    mutationFn: () => apiRequest("POST", "/api/therapists", {
      name: newName, createdAt: new Date().toISOString(),
    }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast({ title: "오류", description: data.error, variant: "destructive" }); return; }
      toast({ title: `✅ ${newName} 등록 완료` });
      setNewName(""); setAddOpen(false); refetch();
    },
  });

  const deleteTherapist = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/therapists/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/therapists"] }); toast({ title: "삭제되었습니다." }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog size={18} className="text-primary" />
          <h2 className="font-bold text-base">치료자 선택</h2>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5"><UserPlus size={14} /> 치료자 추가</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>치료자 등록</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>치료자 이름</Label>
                <Input placeholder="예: 정재영" value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && newName && addTherapist.mutate()} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => addTherapist.mutate()} disabled={!newName || addTherapist.isPending} className="w-full">
                {addTherapist.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} 등록하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />) :
        therapistList?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">🩺</p>
            <p className="text-sm">등록된 치료자가 없습니다</p>
            <p className="text-xs mt-1">오른쪽 위 버튼으로 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {therapistList?.map(t => (
              <Card key={t.id} className="border border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelect(t)}>
                <CardContent className="pt-3 pb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">탭하면 환자 목록으로 이동</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                          <Trash2 size={15} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.name} 치료자를 삭제할까요?</AlertDialogTitle>
                          <AlertDialogDescription>해당 치료자의 환자 배정이 해제됩니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTherapist.mutate(t.id)} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ─── 치료자 메인 앱 ───────────────────────────────────────
export default function TherapistApp({ onLogout }: { onLogout: () => void }) {
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" width="26" height="26" fill="none" className="text-primary">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M10 18 C10 12 14 10 16 10 C18 10 22 12 22 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="21" r="2.5" fill="currentColor" />
            <path d="M8 22 L24 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-sm font-bold leading-tight">
              {selectedTherapist ? selectedTherapist.name : "치료자 관리"}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">식이모니터링</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground gap-1.5">
          <LogOut size={15} /> 로그아웃
        </Button>
      </header>

      <div className="px-4 py-5 pb-10">
        {selectedTherapist ? (
          <TherapistPatients
            therapist={selectedTherapist}
            onBack={() => setSelectedTherapist(null)}
          />
        ) : (
          <TherapistSelect onSelect={setSelectedTherapist} />
        )}

      </div>
    </div>
  );
}
