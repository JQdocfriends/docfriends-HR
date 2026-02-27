import useSWR from "swr";

interface InvitationItem {
  id: string;
  token: string;
  email: string;
  role: string;
  departmentId: string | null;
  invitedBy: string;
  invitedByName: string;
  status: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

async function fetchInvitations(url: string): Promise<InvitationItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch invitations");
  const data = await res.json();
  return data.invitations;
}

export function useInvitations(status?: string) {
  const url = status
    ? `/api/invitations?status=${status}`
    : "/api/invitations";

  const { data, error, isLoading, mutate } = useSWR(url, fetchInvitations);

  return {
    invitations: data ?? [],
    loading: isLoading,
    error,
    mutate,
  };
}

export async function cancelInvitation(id: string): Promise<void> {
  const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "초대 취소에 실패했습니다");
  }
}

export async function resendInvitation(id: string): Promise<void> {
  const res = await fetch(`/api/invitations/${id}/resend`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "초대 재발송에 실패했습니다");
  }
}
