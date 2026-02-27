"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Building2, Users, User } from "lucide-react";
import { useDepartments, useTeams } from "@/hooks/use-departments";
import { useMembers } from "@/hooks/use-members";
import { useCompany } from "@/contexts/company-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Department, Team, Member } from "@/types";

interface OrgNode {
  department: Department;
  teams: (Team & { members: Member[] })[];
  unassignedMembers: Member[];
}

export default function OrgChartPage() {
  const { company } = useCompany();
  const { departments, loading: deptLoading } = useDepartments();
  const { teams, loading: teamLoading } = useTeams();
  const { members, loading: memberLoading } = useMembers();

  const loading = deptLoading || teamLoading || memberLoading;

  const orgTree = useMemo<OrgNode[]>(() => {
    return departments.map((dept) => {
      const deptTeams = teams.filter((t) => t.departmentId === dept.id);
      const teamMemberIds = new Set<string>();

      const teamsWithMembers = deptTeams.map((team) => {
        const teamMembers = members.filter(
          (m) => m.teamId === team.id && m.status === "active"
        );
        teamMembers.forEach((m) => teamMemberIds.add(m.id));
        return { ...team, members: teamMembers };
      });

      const unassignedMembers = members.filter(
        (m) =>
          m.departmentId === dept.id &&
          !teamMemberIds.has(m.id) &&
          m.status === "active"
      );

      return {
        department: dept,
        teams: teamsWithMembers,
        unassignedMembers,
      };
    });
  }, [departments, teams, members]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/organization">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">조직도</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Company Root */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <div className="text-lg font-semibold">
                  {company?.name || "회사"}
                </div>
                <div className="text-sm text-muted-foreground">
                  전체 {members.filter((m) => m.status === "active").length}명
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Departments */}
          <div className="ml-6 space-y-3 border-l-2 border-border pl-6">
            {orgTree.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                등록된 부서가 없습니다
              </div>
            ) : (
              orgTree.map((node) => (
                <DepartmentNode key={node.department.id} node={node} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentNode({ node }: { node: OrgNode }) {
  const [expanded, setExpanded] = useState(true);
  const { members: allMembers } = useMembers();
  const headMember = allMembers.find(
    (m) => m.id === node.department.headMemberId
  );

  const totalMembers =
    node.teams.reduce((sum, t) => sum + t.members.length, 0) +
    node.unassignedMembers.length;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Building2 className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <span className="font-medium">{node.department.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {totalMembers}명
          </span>
        </div>
        {headMember && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={headMember.profileImageUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {headMember.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            {headMember.name}
          </div>
        )}
      </button>

      {expanded && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-border/50 pl-6">
          {node.teams.map((team) => (
            <TeamNode key={team.id} team={team} />
          ))}
          {node.unassignedMembers.length > 0 && (
            <div className="rounded-lg border border-dashed p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                팀 미배정
              </div>
              <div className="flex flex-wrap gap-2">
                {node.unassignedMembers.map((m) => (
                  <MemberChip key={m.id} member={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamNode({
  team,
}: {
  team: Team & { members: Member[] };
}) {
  const [expanded, setExpanded] = useState(true);
  const { members: allMembers } = useMembers();
  const leadMember = allMembers.find((m) => m.id === team.leadMemberId);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 rounded-lg border bg-card p-2.5 text-left hover:bg-accent/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <span className="text-sm font-medium">{team.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {team.members.length}명
          </span>
        </div>
        {leadMember && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage src={leadMember.profileImageUrl ?? undefined} />
              <AvatarFallback className="text-[9px]">
                {leadMember.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            {leadMember.name}
          </div>
        )}
      </button>

      {expanded && team.members.length > 0 && (
        <div className="ml-8 mt-1.5 flex flex-wrap gap-2">
          {team.members.map((m) => (
            <MemberChip key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberChip({ member }: { member: Member }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-accent/50 transition-colors"
    >
      <Avatar className="h-5 w-5">
        <AvatarImage src={member.profileImageUrl ?? undefined} />
        <AvatarFallback className="text-[9px]">
          {member.name.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
      <span>{member.name}</span>
    </Link>
  );
}
