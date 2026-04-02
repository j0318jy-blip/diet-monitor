import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, Info } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const emailSchema = z.object({
  fromEmail: z.string().email("올바른 이메일 형식을 입력하세요"),
  fromPassword: z.string().min(1, "앱 비밀번호를 입력하세요"),
  toEmail: z.string().email("올바른 이메일 형식을 입력하세요"),
  date: z.string().min(1, "날짜를 선택하세요"),
});
type EmailForm = z.infer<typeof emailSchema>;

export default function SendEmail() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      fromEmail: "",
      fromPassword: "",
      toEmail: "",
      date: today,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EmailForm) =>
      apiRequest("POST", "/api/send-email", data).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: "❌ 전송 실패", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✅ 이메일 전송 완료", description: "치료자에게 기록지가 전송되었습니다." });
        form.resetField("fromPassword");
      }
    },
    onError: () => {
      toast({ title: "❌ 전송 실패", description: "네트워크 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">치료자에게 전송</h1>
        <p className="text-sm text-muted-foreground">기록지를 이메일로 전송하세요</p>
      </div>

      {/* Gmail 앱 비밀번호 안내 */}
      <Accordion type="single" collapsible>
        <AccordionItem value="guide" className="border border-border rounded-xl px-1">
          <AccordionTrigger className="text-sm font-medium text-primary hover:no-underline py-3 px-3">
            <span className="flex items-center gap-2">
              <Info size={15} />
              Gmail 앱 비밀번호 설정 방법
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Google 계정 → <strong className="text-foreground">보안</strong> 탭 이동</li>
              <li><strong className="text-foreground">2단계 인증</strong> 활성화</li>
              <li><strong className="text-foreground">앱 비밀번호</strong> 메뉴 → 새 앱 비밀번호 생성</li>
              <li>생성된 <strong className="text-foreground">16자리 비밀번호</strong>를 아래에 입력</li>
              <li>일반 Gmail 비밀번호가 아닌 <strong className="text-foreground">앱 비밀번호</strong>를 사용해야 합니다</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">

          {/* 전송 날짜 */}
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">📅 전송할 날짜</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-send-date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Card className="border-border">
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">발신자 정보 (보내는 사람)</p>

              <FormField control={form.control} name="fromEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">📧 내 Gmail 주소</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="myemail@gmail.com"
                      {...field}
                      data-testid="input-from-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="fromPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">🔑 Gmail 앱 비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="16자리 앱 비밀번호"
                      {...field}
                      data-testid="input-from-password"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">일반 로그인 비밀번호가 아닌 앱 비밀번호를 입력하세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">수신자 정보 (받는 사람)</p>

              <FormField control={form.control} name="toEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">📨 치료자 이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="therapist@example.com"
                      {...field}
                      data-testid="input-to-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={mutation.isPending}
            data-testid="button-send-email"
          >
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 전송 중...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> 기록지 이메일 전송</>
            )}
          </Button>
        </form>
      </Form>

      <footer className="text-center pt-2 pb-1">
      </footer>
    </div>
  );
}
