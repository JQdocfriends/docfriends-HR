"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuthContext } from "@/contexts/auth-context";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { workflowFormsRef } from "@/lib/firebase/collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type {
  WorkflowForm,
  WorkflowFormField,
  FormFieldType,
} from "@/types";

type FormCategory = WorkflowForm["category"];

const CATEGORY_LABELS: Record<FormCategory, string> = {
  leave: "휴가",
  expense: "지출",
  purchase: "구매",
  general: "일반",
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "텍스트",
  number: "숫자",
  date: "날짜",
  select: "선택",
  checkbox: "체크박스",
  file: "파일첨부",
  textarea: "장문텍스트",
};

const ALL_FIELD_TYPES: FormFieldType[] = [
  "text",
  "number",
  "date",
  "select",
  "checkbox",
  "file",
  "textarea",
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyField(order: number): WorkflowFormField {
  return {
    id: generateId(),
    type: "text",
    label: "",
    required: false,
    placeholder: null,
    options: null,
    defaultValue: null,
    order,
  };
}

// ---- Live Preview Component ----
function FormPreview({ fields }: { fields: WorkflowFormField[] }) {
  if (fields.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        필드를 추가하면 미리보기가 표시됩니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields
        .sort((a, b) => a.order - b.order)
        .map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium">
              {field.label || "(라벨 없음)"}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.type === "text" && (
              <input
                disabled
                className="flex h-9 w-full rounded-md border bg-muted/30 px-3 text-sm"
                placeholder={field.placeholder || ""}
              />
            )}
            {field.type === "number" && (
              <input
                disabled
                type="number"
                className="flex h-9 w-full rounded-md border bg-muted/30 px-3 text-sm"
                placeholder={field.placeholder || "0"}
              />
            )}
            {field.type === "date" && (
              <input
                disabled
                type="date"
                className="flex h-9 w-full rounded-md border bg-muted/30 px-3 text-sm"
              />
            )}
            {field.type === "select" && (
              <select
                disabled
                className="flex h-9 w-full rounded-md border bg-muted/30 px-3 text-sm"
              >
                <option>{field.placeholder || "선택하세요"}</option>
                {field.options?.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            )}
            {field.type === "checkbox" && (
              <label className="flex items-center gap-2 text-sm">
                <input disabled type="checkbox" className="h-4 w-4" />
                {field.placeholder || field.label || "확인"}
              </label>
            )}
            {field.type === "file" && (
              <input
                disabled
                type="file"
                className="flex h-9 w-full rounded-md border bg-muted/30 px-3 py-1 text-sm"
              />
            )}
            {field.type === "textarea" && (
              <textarea
                disabled
                rows={3}
                className="flex w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
                placeholder={field.placeholder || ""}
              />
            )}
          </div>
        ))}
    </div>
  );
}

// ---- Default Form Seeds ----
const DEFAULT_FORMS: Omit<
  WorkflowForm,
  "id" | "createdAt" | "updatedAt" | "createdBy"
>[] = [
  {
    name: "휴가신청서",
    category: "leave",
    description: "연차, 반차, 병가 등 휴가 신청 양식",
    policyId: null,
    isDefault: true,
    isActive: true,
    version: 1,
    fields: [
      {
        id: "lv1",
        type: "select",
        label: "휴가 종류",
        required: true,
        placeholder: "선택하세요",
        options: ["연차", "반차(오전)", "반차(오후)", "병가", "경조사"],
        defaultValue: null,
        order: 1,
      },
      {
        id: "lv2",
        type: "date",
        label: "시작일",
        required: true,
        placeholder: null,
        options: null,
        defaultValue: null,
        order: 2,
      },
      {
        id: "lv3",
        type: "date",
        label: "종료일",
        required: true,
        placeholder: null,
        options: null,
        defaultValue: null,
        order: 3,
      },
      {
        id: "lv4",
        type: "textarea",
        label: "사유",
        required: true,
        placeholder: "휴가 사유를 입력하세요",
        options: null,
        defaultValue: null,
        order: 4,
      },
    ],
  },
  {
    name: "지출결의서",
    category: "expense",
    description: "업무 관련 지출 결의 양식",
    policyId: null,
    isDefault: true,
    isActive: true,
    version: 1,
    fields: [
      {
        id: "ex1",
        type: "text",
        label: "지출 항목",
        required: true,
        placeholder: "예: 사무용품 구입",
        options: null,
        defaultValue: null,
        order: 1,
      },
      {
        id: "ex2",
        type: "number",
        label: "금액 (원)",
        required: true,
        placeholder: "0",
        options: null,
        defaultValue: null,
        order: 2,
      },
      {
        id: "ex3",
        type: "date",
        label: "지출일",
        required: true,
        placeholder: null,
        options: null,
        defaultValue: null,
        order: 3,
      },
      {
        id: "ex4",
        type: "textarea",
        label: "상세 내용",
        required: false,
        placeholder: "지출 상세 내용을 입력하세요",
        options: null,
        defaultValue: null,
        order: 4,
      },
      {
        id: "ex5",
        type: "file",
        label: "영수증 첨부",
        required: false,
        placeholder: null,
        options: null,
        defaultValue: null,
        order: 5,
      },
    ],
  },
  {
    name: "구매요청서",
    category: "purchase",
    description: "물품/서비스 구매 요청 양식",
    policyId: null,
    isDefault: true,
    isActive: true,
    version: 1,
    fields: [
      {
        id: "pu1",
        type: "text",
        label: "구매 품목",
        required: true,
        placeholder: "예: 노트북",
        options: null,
        defaultValue: null,
        order: 1,
      },
      {
        id: "pu2",
        type: "number",
        label: "수량",
        required: true,
        placeholder: "1",
        options: null,
        defaultValue: null,
        order: 2,
      },
      {
        id: "pu3",
        type: "number",
        label: "예상 금액 (원)",
        required: true,
        placeholder: "0",
        options: null,
        defaultValue: null,
        order: 3,
      },
      {
        id: "pu4",
        type: "textarea",
        label: "구매 사유",
        required: true,
        placeholder: "구매가 필요한 사유를 입력하세요",
        options: null,
        defaultValue: null,
        order: 4,
      },
    ],
  },
];

export default function WorkflowFormsPage() {
  const { member } = useAuthContext();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const [forms, setForms] = useState<WorkflowForm[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<WorkflowForm | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<FormCategory>("general");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<WorkflowFormField[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      const snap = await getDocs(workflowFormsRef);
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as WorkflowForm)
      );
      list.sort((a, b) => a.name.localeCompare(b.name));
      setForms(list);
    } catch {
      toast.error("양식 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) fetchForms();
  }, [isAllowed, fetchForms]);

  if (guardLoading) return null;
  if (!isAllowed) return null;

  function openCreate() {
    setEditingForm(null);
    setFormName("");
    setFormCategory("general");
    setFormDescription("");
    setFields([createEmptyField(1)]);
    setBuilderOpen(true);
  }

  function openEdit(form: WorkflowForm) {
    setEditingForm(form);
    setFormName(form.name);
    setFormCategory(form.category);
    setFormDescription(form.description || "");
    setFields([...form.fields]);
    setBuilderOpen(true);
  }

  function addField() {
    const maxOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.order)) : 0;
    setFields((prev) => [...prev, createEmptyField(maxOrder + 1)]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, updates: Partial<WorkflowFormField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }

  function moveField(id: string, direction: "up" | "down") {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((f) => f.id === id);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === sorted.length - 1)
    )
      return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const tempOrder = sorted[idx].order;
    sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
    sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };
    setFields(sorted);
  }

  async function handleSave() {
    if (!formName.trim() || !member) {
      toast.error("양식 이름을 입력하세요.");
      return;
    }
    if (fields.length === 0) {
      toast.error("필드를 하나 이상 추가하세요.");
      return;
    }
    const emptyLabels = fields.some((f) => !f.label.trim());
    if (emptyLabels) {
      toast.error("모든 필드의 라벨을 입력하세요.");
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = !!editingForm;
      const ref = isEdit
        ? doc(workflowFormsRef, editingForm!.id)
        : doc(workflowFormsRef);
      const version = isEdit ? (editingForm!.version || 0) + 1 : 1;

      const formData = {
          name: formName.trim(),
          category: formCategory,
          description: formDescription.trim() || null,
          fields: fields.map((f, i) => ({
            ...f,
            order: i + 1,
            placeholder: f.placeholder || null,
            options: f.type === "select" ? f.options : null,
            defaultValue: f.defaultValue || null,
          })),
          policyId: editingForm?.policyId ?? null,
          isDefault: editingForm?.isDefault ?? false,
          isActive: editingForm?.isActive ?? true,
          createdBy: isEdit ? editingForm!.createdBy : member.id,
          version,
          ...(isEdit ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        };

      if (isEdit) {
        await setDoc(ref, formData, { merge: true });
      } else {
        await setDoc(ref, formData);
      }

      toast.success(isEdit ? "양식이 수정되었습니다." : "양식이 등록되었습니다.");
      setBuilderOpen(false);
      fetchForms();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(form: WorkflowForm) {
    if (!confirm(`"${form.name}" 양식을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(workflowFormsRef, form.id));
      toast.success("양식이 삭제되었습니다.");
      fetchForms();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  async function seedDefaults() {
    if (!member) return;
    setSeeding(true);
    try {
      for (const seed of DEFAULT_FORMS) {
        const ref = doc(workflowFormsRef);
        await setDoc(ref, {
          ...seed,
          createdBy: member.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast.success("기본 양식 3개가 생성되었습니다.");
      fetchForms();
    } catch {
      toast.error("기본 양식 생성에 실패했습니다.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workflows">
              <ArrowLeft className="mr-1 h-4 w-4" />
              뒤로
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">결재 양식 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
            <Sparkles className="mr-1 h-4 w-4" />
            {seeding ? "생성 중..." : "기본 양식 생성"}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            양식 추가
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : forms.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm text-muted-foreground">
          <p>등록된 양식이 없습니다</p>
          <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
            <Sparkles className="mr-1 h-4 w-4" />
            기본 양식 생성하기
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>양식명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>필드 수</TableHead>
                  <TableHead>버전</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-28">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">
                      {form.name}
                      {form.isDefault && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          기본
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[form.category] ?? form.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{form.fields?.length ?? 0}개</TableCell>
                    <TableCell>v{form.version}</TableCell>
                    <TableCell>
                      {form.isActive ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          활성
                        </Badge>
                      ) : (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(form)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(form)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Form Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? "양식 수정" : "양식 추가"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Builder */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>양식명 *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="예: 휴가신청서"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>카테고리</Label>
                  <Select
                    value={formCategory}
                    onValueChange={(v) => setFormCategory(v as FormCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leave">휴가</SelectItem>
                      <SelectItem value="expense">지출</SelectItem>
                      <SelectItem value="purchase">구매</SelectItem>
                      <SelectItem value="general">일반</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>설명</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="양식에 대한 간단한 설명"
                />
              </div>

              {/* Fields List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>필드 목록</Label>
                  <Button variant="outline" size="sm" onClick={addField}>
                    <Plus className="mr-1 h-3 w-3" />
                    필드 추가
                  </Button>
                </div>
                <div className="space-y-3">
                  {fields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div
                        key={field.id}
                        className="rounded-md border bg-muted/20 p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateField(field.id, { label: e.target.value })
                            }
                            placeholder="필드 라벨"
                            className="h-8 text-sm"
                          />
                          <Select
                            value={field.type}
                            onValueChange={(v) =>
                              updateField(field.id, {
                                type: v as FormFieldType,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-32 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_FIELD_TYPES.map((ft) => (
                                <SelectItem key={ft} value={ft}>
                                  {FIELD_TYPE_LABELS[ft]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center shrink-0">
                            <button
                              onClick={() => moveField(field.id, "up")}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => moveField(field.id, "down")}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => removeField(field.id)}
                              className="p-1 hover:bg-muted rounded ml-1"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pl-6">
                          <label className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                updateField(field.id, {
                                  required: e.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5"
                            />
                            필수
                          </label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              updateField(field.id, {
                                placeholder: e.target.value || null,
                              })
                            }
                            placeholder="플레이스홀더"
                            className="h-7 text-xs flex-1"
                          />
                        </div>
                        {field.type === "select" && (
                          <div className="pl-6">
                            <Input
                              value={field.options?.join(", ") || ""}
                              onChange={(e) =>
                                updateField(field.id, {
                                  options: e.target.value
                                    .split(",")
                                    .map((o) => o.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="옵션 (쉼표 구분): 옵션1, 옵션2, 옵션3"
                              className="h-7 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                {fields.length === 0 && (
                  <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    필드가 없습니다. &ldquo;필드 추가&rdquo; 버튼을 클릭하세요.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Label>미리보기</Label>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <h3 className="mb-4 text-lg font-semibold">
                  {formName || "(양식명)"}
                </h3>
                {formDescription && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {formDescription}
                  </p>
                )}
                <FormPreview fields={fields} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBuilderOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
