"use client";

import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { departmentsRef, teamsRef } from "@/lib/firebase/collections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface TeamItem {
  name: string;
}

interface DepartmentItem {
  name: string;
  teams: TeamItem[];
}

interface StepOrganizationProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepOrganization({ onNext, onBack }: StepOrganizationProps) {
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<DepartmentItem[]>([
    { name: "", teams: [] },
  ]);

  function addDepartment() {
    setDepartments([...departments, { name: "", teams: [] }]);
  }

  function removeDepartment(index: number) {
    setDepartments(departments.filter((_, i) => i !== index));
  }

  function updateDepartmentName(index: number, name: string) {
    const updated = [...departments];
    updated[index].name = name;
    setDepartments(updated);
  }

  function addTeam(deptIndex: number) {
    const updated = [...departments];
    updated[deptIndex].teams.push({ name: "" });
    setDepartments(updated);
  }

  function removeTeam(deptIndex: number, teamIndex: number) {
    const updated = [...departments];
    updated[deptIndex].teams = updated[deptIndex].teams.filter(
      (_, i) => i !== teamIndex
    );
    setDepartments(updated);
  }

  function updateTeamName(deptIndex: number, teamIndex: number, name: string) {
    const updated = [...departments];
    updated[deptIndex].teams[teamIndex].name = name;
    setDepartments(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Filter out empty departments
    const validDepts = departments.filter((d) => d.name.trim());
    if (validDepts.length === 0) {
      toast.error("최소 1개의 부서를 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      for (let deptIdx = 0; deptIdx < validDepts.length; deptIdx++) {
        const dept = validDepts[deptIdx];
        const deptRef = doc(departmentsRef);
        await setDoc(deptRef, {
          name: dept.name.trim(),
          description: null,
          headMemberId: null,
          parentDepartmentId: null,
          order: deptIdx,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Create teams for this department
        const validTeams = dept.teams.filter((t) => t.name.trim());
        for (let teamIdx = 0; teamIdx < validTeams.length; teamIdx++) {
          const team = validTeams[teamIdx];
          const teamRef = doc(teamsRef);
          await setDoc(teamRef, {
            name: team.name.trim(),
            departmentId: deptRef.id,
            leadMemberId: null,
            description: null,
            order: teamIdx,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      toast.success("조직 구조가 저장되었습니다");
      onNext();
    } catch (error) {
      console.error("Failed to save organization:", error);
      toast.error("저장에 실패했습니다. 다시 시도해주세요");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>조직 구조</CardTitle>
        <CardDescription>
          부서와 팀을 설정해주세요. 나중에 수정할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {departments.map((dept, deptIndex) => (
            <div
              key={deptIndex}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Label className="sr-only">부서명</Label>
                <Input
                  value={dept.name}
                  onChange={(e) =>
                    updateDepartmentName(deptIndex, e.target.value)
                  }
                  placeholder="부서명 (예: 개발팀)"
                  className="flex-1"
                />
                {departments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDepartment(deptIndex)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>

              {dept.teams.length > 0 && (
                <div className="ml-6 space-y-2">
                  {dept.teams.map((team, teamIndex) => (
                    <div key={teamIndex} className="flex items-center gap-2">
                      <div className="h-4 w-4 border-l-2 border-b-2 border-muted-foreground/30" />
                      <Input
                        value={team.name}
                        onChange={(e) =>
                          updateTeamName(deptIndex, teamIndex, e.target.value)
                        }
                        placeholder="팀명 (예: 프론트엔드팀)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTeam(deptIndex, teamIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-6 text-xs"
                onClick={() => addTeam(deptIndex)}
              >
                <Plus className="mr-1 h-3 w-3" />
                팀 추가
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addDepartment}
          >
            <Plus className="mr-2 h-4 w-4" />
            부서 추가
          </Button>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              이전
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "저장 중..." : "다음"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
