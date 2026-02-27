"use client";

import { useState, useEffect } from "react";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { companyDocRef } from "@/lib/firebase/collections";
import { useCompany } from "@/contexts/company-context";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function CompanySettingsPage() {
  const { company, loading } = useCompany();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>([]);

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setRepresentativeName(company.representativeName || "");
      setBusinessNumber(company.businessNumber || "");
      setAddress(company.address || "");
      setPhone(company.phone || "");
      setAllowedEmailDomains(company.allowedEmailDomains || []);
    }
  }, [company]);

  function handleBusinessNumberChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    let formatted = digits;
    if (digits.length > 3) formatted = digits.slice(0, 3) + "-" + digits.slice(3);
    if (digits.length > 5) formatted = digits.slice(0, 3) + "-" + digits.slice(3, 5) + "-" + digits.slice(5);
    setBusinessNumber(formatted);
  }

  function addDomain() {
    const domain = emailDomain.trim().toLowerCase();
    if (!domain) return;
    if (allowedEmailDomains.includes(domain)) {
      toast.error("이미 추가된 도메인입니다");
      return;
    }
    setAllowedEmailDomains([...allowedEmailDomains, domain]);
    setEmailDomain("");
  }

  function removeDomain(domain: string) {
    setAllowedEmailDomains(allowedEmailDomains.filter((d) => d !== domain));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !representativeName || !businessNumber || !address || !phone) {
      toast.error("필수 항목을 모두 입력해주세요");
      return;
    }
    if (businessNumber.replace(/\D/g, "").length !== 10) {
      toast.error("사업자등록번호 10자리를 입력해주세요");
      return;
    }
    if (allowedEmailDomains.length === 0) {
      toast.error("허용 이메일 도메인을 최소 1개 추가해주세요");
      return;
    }

    setSaving(true);
    try {
      await setDoc(companyDocRef, {
        name, representativeName, businessNumber, address, phone, allowedEmailDomains,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success("회사 정보가 저장되었습니다");
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-2" /></CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>회사 정보</CardTitle>
        <CardDescription>회사의 기본 정보를 수정합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">회사명 *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="representativeName">대표자명 *</Label>
            <Input id="representativeName" value={representativeName} onChange={(e) => setRepresentativeName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessNumber">사업자등록번호 *</Label>
            <Input id="businessNumber" value={businessNumber} onChange={(e) => handleBusinessNumberChange(e.target.value)} placeholder="000-00-00000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">주소 *</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">대표전화 *</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>허용 이메일 도메인 *</Label>
            <div className="flex gap-2">
              <Input value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} placeholder="예: company.com" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDomain(); } }} />
              <Button type="button" variant="outline" onClick={addDomain}>추가</Button>
            </div>
            {allowedEmailDomains.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {allowedEmailDomains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="cursor-pointer" onClick={() => removeDomain(domain)}>{domain} ×</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
