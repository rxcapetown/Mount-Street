import Link from "next/link";
import { Mail, Share2, FileText, MessageSquare } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_TASK_TYPES, type MockTaskType } from "@/lib/mock-data";

const iconMap = {
  Mail,
  Share2,
  FileText,
  MessageSquare,
} as const;

function riskBadge(tier: MockTaskType["riskTier"]) {
  if (tier === 0)
    return <Badge variant="muted">Generate only</Badge>;
  if (tier === 1)
    return <Badge variant="warning">Needs approval</Badge>;
  return <Badge variant="destructive">Always review</Badge>;
}

export default function HomePage() {
  return (
    <div className="px-8 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a task to run. Anything marked "Needs approval" or "Always
          review" will queue for your sign-off before sending.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MOCK_TASK_TYPES.map((task) => {
          const Icon = iconMap[task.iconName];
          return (
            <Card key={task.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{task.title}</CardTitle>
                  </div>
                  {riskBadge(task.riskTier)}
                </div>
                <CardDescription className="mt-2">
                  {task.description}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/tasks/${task.id}`}>Run</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
