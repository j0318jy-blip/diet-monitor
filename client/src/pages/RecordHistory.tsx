import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type FoodRecord } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const moodEmoji = (m: number) => ["😢", "😟", "😐", "🙂", "😊"][m - 1] || "😐";

function RecordCard({ record, onDelete }: { record: FoodRecord; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className={`border ${record.isBinge ? "border-destructive/40" : "border-border"}`}
      data-testid={`card-record-${record.id}`}>
      <CardContent className="pt-3 pb-3">
        <div
          className="flex items-start justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{record.mealTime}</Badge>
              {record.isBinge && <Badge variant="destructive" className="text-xs">폭식</Badge>}
              {record.purgeType !== "없음" && (
                <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">{record.purgeType}</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {record.recordTime ? format(parseISO(record.recordTime), "HH:mm") : ""}
              </span>
            </div>
            <p className="text-sm font-semibold mt-1 truncate text-foreground">{record.foodContent}</p>
            <p className="text-xs text-muted-foreground">{record.location} · {record.amount}</p>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <span className="text-base">{moodEmoji(record.mood)}</span>
            {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">식사 전 감정</span>
                <p className="font-medium">{record.emotionBefore}</p>
              </div>
              <div>
                <span className="text-muted-foreground">식사 후 감정</span>
                <p className="font-medium">{record.emotionAfter}</p>
              </div>
            </div>
            {record.situation && (
              <div className="text-xs">
                <span className="text-muted-foreground">상황/촉발요인</span>
                <p className="mt-0.5 text-foreground">{record.situation}</p>
              </div>
            )}
            {record.notes && (
              <div className="text-xs">
                <span className="text-muted-foreground">메모</span>
                <p className="mt-0.5 text-foreground">{record.notes}</p>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 text-xs"
                    data-testid={`button-delete-${record.id}`}>
                    <Trash2 size={13} className="mr-1" /> 삭제
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
  );
}

export default function RecordHistory() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: records, isLoading } = useQuery<FoodRecord[]>({
    queryKey: ["/api/records/date", selectedDate],
    queryFn: () => apiRequest("GET", `/api/records/date/${selectedDate}`).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/records/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/records/date", selectedDate] });
      toast({ title: "삭제되었습니다." });
    },
  });

  const bingeCount = records?.filter(r => r.isBinge).length ?? 0;
  const purgeCount = records?.filter(r => r.purgeType !== "없음").length ?? 0;

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">기록 목록</h1>
        <p className="text-sm text-muted-foreground">날짜별 기록을 확인하세요</p>
      </div>

      {/* 날짜 선택 */}
      <Input
        type="date"
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
        className="w-full"
        data-testid="input-select-date"
      />

      {/* 요약 통계 */}
      {records && records.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-border">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-xl font-bold text-primary">{records.length}</p>
              <p className="text-xs text-muted-foreground">총 기록</p>
            </CardContent>
          </Card>
          <Card className={`border ${bingeCount > 0 ? "border-destructive/40" : "border-border"}`}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-xl font-bold ${bingeCount > 0 ? "text-destructive" : "text-primary"}`}>{bingeCount}</p>
              <p className="text-xs text-muted-foreground">폭식</p>
            </CardContent>
          </Card>
          <Card className={`border ${purgeCount > 0 ? "border-destructive/40" : "border-border"}`}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-xl font-bold ${purgeCount > 0 ? "text-destructive" : "text-primary"}`}>{purgeCount}</p>
              <p className="text-xs text-muted-foreground">제거행동</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 기록 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : records?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium">이 날짜에 기록이 없습니다</p>
            <p className="text-xs mt-1">기록하기 탭에서 새 기록을 작성하세요</p>
          </div>
        ) : (
          records?.map(r => (
            <RecordCard
              key={r.id}
              record={r}
              onDelete={() => deleteMutation.mutate(r.id)}
            />
          ))
        )}
      </div>

      <footer className="text-center pt-2 pb-1">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary">
          Created with Perplexity Computer
        </a>
      </footer>
    </div>
  );
}
