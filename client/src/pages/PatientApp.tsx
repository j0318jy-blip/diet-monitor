import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFoodRecordSchema, type InsertFoodRecord, type Patient } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle2, LogOut, PlusCircle, ClipboardList, ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
import type { FoodRecord } from "@shared/schema";

const formSchema = insertFoodRecordSchema.extend({ mood: z.number().min(1).max(5) });
const moodLabels = ["😢 매우 나쁨", "😟 나쁨", "😐 보통", "🙂 좋음", "😊 매우 좋음"];
const mealTypes = ["아침", "점심", "저녁", "간식", "야식", "기타"];
const purgeTypes = ["없음", "구토", "하제 사용", "과도한 운동", "단식", "기타"];
const emotionOptions = ["불안", "우울", "외로움", "분노", "스트레스", "무기력", "행복", "평온", "지루함", "죄책감", "보통", "기타"];
const moodEmoji = (m: number) => ["😢", "😟", "😐", "🙂", "😊"][m - 1] || "😐";

// ─── 기록 폼 (새 작성 / 수정 공용) ───────────────────────
function RecordFormFields({
  form,
  isPending,
  onSubmit,
  submitLabel,
}: {
  form: any;
  isPending: boolean;
  onSubmit: (v: InsertFoodRecord) => void;
  submitLabel: string;
}) {
  const watchBinge = form.watch("isBinge");
  const watchMood = form.watch("mood");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="recordTime" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">⏰ 기록 시간</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  className="text-sm"
                  onChange={e => {
                    field.onChange(e);
                    // 날짜 자동 동기화
                    if (e.target.value) {
                      const dateOnly = e.target.value.slice(0, 10);
                      form.setValue("date", dateOnly);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="mealTime" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">🍽️ 식사 유형</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{mealTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold">📍 장소</FormLabel>
            <FormControl><Input placeholder="예: 집, 회사 식당..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="foodContent" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold">🥗 음식 / 음료</FormLabel>
            <FormControl><Textarea placeholder="예: 비빔밥, 물 한 컵..." className="resize-none" rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold">📊 섭취량</FormLabel>
            <FormControl><Input placeholder="예: 1인분, 절반..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Card className={`border ${watchBinge ? "border-destructive/50 bg-destructive/5" : ""}`}>
          <CardContent className="pt-4 space-y-4">
            <FormField control={form.control} name="isBinge" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-sm font-semibold">⚠️ 폭식 여부</FormLabel>
                  <p className="text-xs text-muted-foreground">통제 불가능한 과식이 있었나요?</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="purgeType" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">🔄 제거행동</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{purgeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="emotionBefore" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">💭 식사 전 감정</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{emotionOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="emotionAfter" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">💭 식사 후 감정</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{emotionOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="mood" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold">😊 기분 상태: {moodLabels[(watchMood ?? 3) - 1]}</FormLabel>
            <FormControl>
              <Slider min={1} max={5} step={1} value={[field.value]} onValueChange={([v]) => field.onChange(v)} className="mt-2" />
            </FormControl>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>😢 매우 나쁨</span><span>😊 매우 좋음</span>
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="situation" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold">🎯 상황 / 촉발 요인</FormLabel>
            <FormControl><Textarea placeholder="예: 스트레스, 혼자 있을 때..." className="resize-none" rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold">📝 추가 메모 (선택)</FormLabel>
            <FormControl><Textarea placeholder="기타 특이사항..." className="resize-none" rows={2} {...field} /></FormControl>
          </FormItem>
        )} />

        <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isPending}>
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> {submitLabel}</>}
        </Button>
      </form>
    </Form>
  );
}

// ─── 수정 다이얼로그 ──────────────────────────────────────
function EditRecordDialog({
  record,
  patientId,
  open,
  onClose,
}: {
  record: FoodRecord;
  patientId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const form = useForm<InsertFoodRecord>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: record.patientId,
      recordTime: record.recordTime,
      mealTime: record.mealTime,
      location: record.location,
      foodContent: record.foodContent,
      amount: record.amount,
      isBinge: record.isBinge,
      purgeType: record.purgeType,
      emotionBefore: record.emotionBefore,
      emotionAfter: record.emotionAfter,
      mood: record.mood,
      situation: record.situation,
      notes: record.notes,
      date: record.date,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertFoodRecord) =>
      apiRequest("PATCH", `/api/records/item/${record.id}`, data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/records", patientId] });
      toast({ title: "✅ 기록이 수정되었습니다." });
      onClose();
    },
    onError: () => toast({ title: "❌ 수정 실패", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>기록 수정</DialogTitle>
        </DialogHeader>
        <RecordFormFields
          form={form}
          isPending={mutation.isPending}
          onSubmit={d => mutation.mutate(d)}
          submitLabel="수정 저장"
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── 기록 카드 ────────────────────────────────────────────
function RecordCard({
  record,
  patientId,
  onDelete,
}: {
  record: FoodRecord;
  patientId: number;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Card className={`border ${record.isBinge ? "border-destructive/40" : "border-border"}`}>
        <CardContent className="pt-3 pb-3">
          <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{record.mealTime}</Badge>
                {record.isBinge && <Badge variant="destructive" className="text-xs">폭식</Badge>}
                {record.purgeType !== "없음" && <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">{record.purgeType}</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{record.recordTime?.slice(11, 16)}</span>
              </div>
              <p className="text-sm font-semibold mt-1 truncate">{record.foodContent}</p>
              <p className="text-xs text-muted-foreground">{record.location} · {record.amount}</p>
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <span>{moodEmoji(record.mood)}</span>
              {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">식사 전 감정</span><p className="font-medium">{record.emotionBefore}</p></div>
                <div><span className="text-muted-foreground">식사 후 감정</span><p className="font-medium">{record.emotionAfter}</p></div>
              </div>
              {record.situation && <div className="text-xs"><span className="text-muted-foreground">상황/촉발요인</span><p className="mt-0.5">{record.situation}</p></div>}
              {record.notes && <div className="text-xs"><span className="text-muted-foreground">메모</span><p className="mt-0.5">{record.notes}</p></div>}
              <div className="flex justify-end gap-2 pt-1">
                {/* 수정 버튼 */}
                <Button
                  variant="ghost" size="sm"
                  className="h-8 text-xs text-primary hover:text-primary gap-1"
                  onClick={e => { e.stopPropagation(); setEditOpen(true); }}
                >
                  <Pencil size={13} /> 수정
                </Button>
                {/* 삭제 버튼 */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 text-xs gap-1">
                      <Trash2 size={13} /> 삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>기록을 삭제할까요?</AlertDialogTitle>
                      <AlertDialogDescription>이 기록은 되돌릴 수 없습니다.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editOpen && (
        <EditRecordDialog
          record={record}
          patientId={patientId}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}

// ─── 기록 작성 탭 ─────────────────────────────────────────
function RecordFormTab({ patient }: { patient: Patient }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();

  const form = useForm<InsertFoodRecord>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: patient.id,
      recordTime: format(now, "yyyy-MM-dd'T'HH:mm"),
      mealTime: "점심",
      location: "",
      foodContent: "",
      amount: "",
      isBinge: false,
      purgeType: "없음",
      emotionBefore: "보통",
      emotionAfter: "보통",
      mood: 3,
      situation: "",
      notes: "",
      date: format(now, "yyyy-MM-dd"),
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertFoodRecord) => apiRequest("POST", "/api/records", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/records", patient.id] });
      toast({ title: "✅ 기록 저장 완료" });
      const n = new Date();
      form.reset({
        patientId: patient.id,
        recordTime: format(n, "yyyy-MM-dd'T'HH:mm"),
        date: format(n, "yyyy-MM-dd"),
        mealTime: form.getValues("mealTime"),
        location: "", foodContent: "", amount: "",
        isBinge: false, purgeType: "없음",
        emotionBefore: "보통", emotionAfter: "보통",
        mood: 3, situation: "", notes: "",
      });
    },
    onError: () => toast({ title: "❌ 저장 실패", variant: "destructive" }),
  });

  return (
    <div className="px-4 py-4">
      <RecordFormFields
        form={form}
        isPending={mutation.isPending}
        onSubmit={d => mutation.mutate(d)}
        submitLabel="기록 저장"
      />
    </div>
  );
}

// ─── 기록 목록 탭 ─────────────────────────────────────────
function RecordHistoryTab({ patient }: { patient: Patient }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: records, isLoading } = useQuery<FoodRecord[]>({
    queryKey: ["/api/records", patient.id, selectedDate],
    queryFn: () => apiRequest("GET", `/api/records/${Number(patient.id)}/date/${selectedDate}`).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/records/item/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/records", patient.id] });
      toast({ title: "삭제되었습니다." });
    },
  });

  const bingeCount = records?.filter(r => r.isBinge).length ?? 0;
  const purgeCount = records?.filter(r => r.purgeType !== "없음").length ?? 0;

  return (
    <div className="px-4 py-4 space-y-4">
      <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

      {records && records.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="pt-3 pb-3 text-center"><p className="text-xl font-bold text-primary">{records.length}</p><p className="text-xs text-muted-foreground">총 기록</p></CardContent></Card>
          <Card className={bingeCount > 0 ? "border-destructive/40" : ""}><CardContent className="pt-3 pb-3 text-center"><p className={`text-xl font-bold ${bingeCount > 0 ? "text-destructive" : "text-primary"}`}>{bingeCount}</p><p className="text-xs text-muted-foreground">폭식</p></CardContent></Card>
          <Card className={purgeCount > 0 ? "border-destructive/40" : ""}><CardContent className="pt-3 pb-3 text-center"><p className={`text-xl font-bold ${purgeCount > 0 ? "text-destructive" : "text-primary"}`}>{purgeCount}</p><p className="text-xs text-muted-foreground">제거행동</p></CardContent></Card>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />) :
          records?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm font-medium">이 날짜에 기록이 없습니다</p>
            </div>
          ) : records?.map(r => (
            <RecordCard
              key={r.id}
              record={r}
              patientId={Number(patient.id)}
              onDelete={() => deleteMutation.mutate(r.id)}
            />
          ))
        }
      </div>
    </div>
  );
}

// ─── 환자 앱 메인 ─────────────────────────────────────────
export default function PatientApp({ patient, onLogout }: { patient: Patient; onLogout: () => void }) {
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
            <p className="text-sm font-bold text-foreground leading-tight">{patient.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">식이모니터링</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground gap-1.5">
          <LogOut size={15} /> 로그아웃
        </Button>
      </header>

      <Tabs defaultValue="record" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b bg-background h-auto py-0">
          <TabsTrigger value="record" className="flex-1 gap-1.5 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <PlusCircle size={15} /> 기록하기
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1.5 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <ClipboardList size={15} /> 기록목록
          </TabsTrigger>
        </TabsList>
        <TabsContent value="record" className="flex-1 overflow-y-auto mt-0 pb-6">
          <RecordFormTab patient={patient} />
        </TabsContent>
        <TabsContent value="history" className="flex-1 overflow-y-auto mt-0 pb-6">
          <RecordHistoryTab patient={patient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
