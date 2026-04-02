import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFoodRecordSchema, type InsertFoodRecord } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

const formSchema = insertFoodRecordSchema.extend({
  mood: z.number().min(1).max(5),
});

const moodLabels = ["😢 매우 나쁨", "😟 나쁨", "😐 보통", "🙂 좋음", "😊 매우 좋음"];
const mealTypes = ["아침", "점심", "저녁", "간식", "야식", "기타"];
const purgeTypes = ["없음", "구토", "하제 사용", "과도한 운동", "단식", "기타"];
const emotionOptions = [
  "불안", "우울", "외로움", "분노", "스트레스", "무기력", "행복", "평온", "지루함", "죄책감", "기타"
];

export default function RecordForm() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const now = new Date();
  const form = useForm<InsertFoodRecord>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    mutationFn: (data: InsertFoodRecord) =>
      apiRequest("POST", "/api/records", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/records"] });
      toast({ title: "✅ 기록 저장 완료", description: "기록이 성공적으로 저장되었습니다." });
      form.reset({
        ...form.getValues(),
        recordTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        date: format(new Date(), "yyyy-MM-dd"),
        foodContent: "",
        amount: "",
        location: "",
        situation: "",
        notes: "",
        isBinge: false,
        purgeType: "없음",
        mood: 3,
      });
    },
    onError: () => {
      toast({ title: "❌ 저장 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" });
    },
  });

  function onSubmit(values: InsertFoodRecord) {
    mutation.mutate(values);
  }

  const watchBinge = form.watch("isBinge");
  const watchMood = form.watch("mood");

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">새 기록 작성</h1>
        <p className="text-sm text-muted-foreground">식사할 때마다 기록해주세요</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* 기록 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="recordTime" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">⏰ 기록 시간</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} data-testid="input-record-time" className="text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="mealTime" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">🍽️ 식사 유형</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-meal-time">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {mealTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* 장소 */}
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">📍 장소</FormLabel>
              <FormControl>
                <Input placeholder="예: 집, 회사 식당, 편의점..." {...field} data-testid="input-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* 음식/음료 */}
          <FormField control={form.control} name="foodContent" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">🥗 음식 / 음료</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="예: 비빔밥, 물 한 컵, 과자 한 봉지..."
                  className="resize-none"
                  rows={2}
                  {...field}
                  data-testid="input-food-content"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* 섭취량 */}
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">📊 섭취량</FormLabel>
              <FormControl>
                <Input placeholder="예: 1인분, 절반, 많이..." {...field} data-testid="input-amount" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* 폭식 / 제거행동 */}
          <Card className={`border ${watchBinge ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
            <CardContent className="pt-4 space-y-4">
              <FormField control={form.control} name="isBinge" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-sm font-semibold">⚠️ 폭식 여부</FormLabel>
                    <p className="text-xs text-muted-foreground">통제 불가능한 과식이 있었나요?</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-binge"
                    />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="purgeType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">🔄 제거행동</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-purge-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {purgeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* 감정 */}
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="emotionBefore" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">💭 식사 전 감정</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-emotion-before">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {emotionOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    <SelectItem value="보통">보통</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="emotionAfter" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">💭 식사 후 감정</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-emotion-after">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {emotionOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    <SelectItem value="보통">보통</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* 기분 척도 */}
          <FormField control={form.control} name="mood" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">
                😊 기분 상태: {moodLabels[(watchMood ?? 3) - 1]}
              </FormLabel>
              <FormControl>
                <Slider
                  min={1} max={5} step={1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                  className="mt-2"
                  data-testid="slider-mood"
                />
              </FormControl>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>😢 매우 나쁨</span>
                <span>😊 매우 좋음</span>
              </div>
              <FormMessage />
            </FormItem>
          )} />

          {/* 상황/촉발 요인 */}
          <FormField control={form.control} name="situation" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">🎯 상황 / 촉발 요인</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="예: 스트레스를 받아서, 혼자 집에 있을 때, 지루해서..."
                  className="resize-none"
                  rows={2}
                  {...field}
                  data-testid="input-situation"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* 추가 메모 */}
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">📝 추가 메모 (선택)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="기타 특이사항을 자유롭게 기록하세요..."
                  className="resize-none"
                  rows={2}
                  {...field}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={mutation.isPending}
            data-testid="button-submit"
          >
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> 기록 저장</>
            )}
          </Button>
        </form>
      </Form>

      <footer className="text-center pt-2 pb-1">
      </footer>
    </div>
  );
}
