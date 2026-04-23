"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { z } from "zod";
import { AccessGuard } from "@/components/domain/access-guard";
import { AppFrame } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn, formatBonus } from "@/lib/utils";
import { adminTemplateService } from "@/src/features/admin-room-templates/model/service";
import { buildDefaultPlayers, domainTemplateToFormValues } from "@/src/features/admin-room-templates/model/mappers";
import { downloadBlob } from "@/src/features/admin-room-templates/lib/download-file";
import { localRecommendations } from "@/src/features/admin-room-templates/model/analysis";
import type {
  AnalysisIssue,
  ConfigTestResponse,
  RoomTemplateFormValues
} from "@/src/features/admin-room-templates/model/types";
import { GAME_MECHANICS, mechanicTitleByMode } from "@/src/shared/config/game-mechanics";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import type { GameMode, RoomTemplate } from "@/lib/domain/types";
import { roomTemplateQueryKeys } from "@/src/features/room-templates/model/query-keys";

const playerSchema = z.object({
  name: z.string().min(1, "Имя игрока обязательно"),
  boost: z.boolean()
});

const schema = z.object({
  title: z.string().min(4, "Название слишком короткое"),
  mode: z.enum(["arena-sprint", "claw-machine", "duel-clash", "slot-reveal", "chinchilla-race"]),
  entryCost: z.coerce.number().min(1000, "Цена входа должна быть не меньше 1000").max(10000, "Цена входа не может быть больше 10000"),
  seats: z.coerce.number().min(2, "Минимум 2 места").max(10, "Максимум 10 мест"),
  boostCost: z.coerce.number().min(0, "Цена буста не может быть отрицательной"),
  boostEnabled: z.boolean(),
  boostWeight: z.coerce.number().min(0, "Вес буста не может быть отрицательным").max(100, "Слишком сильное влияние буста"),
  prizePoolPercent: z.coerce.number().min(1, "Укажите выплату победителю").max(100, "Выплата не может быть больше 100%"),
  botFillDelay: z.coerce.number().min(60).max(60),
  volatility: z.coerce.number().min(15).max(95),
  templateVisible: z.boolean(),
  baseWeight: z.coerce.number().min(1, "Базовый вес должен быть больше 0"),
  simRounds: z.coerce.number().min(1).max(1_000_000),
  players: z.array(playerSchema).min(2, "Добавьте минимум двух игроков").max(10, "Максимум 10 игроков")
});

const defaults: RoomTemplateFormValues = {
  title: "",
  mode: "arena-sprint",
  entryCost: 1000,
  seats: 5,
  boostCost: 50,
  boostEnabled: true,
  boostWeight: 10,
  prizePoolPercent: 80,
  botFillDelay: 60,
  volatility: 62,
  templateVisible: true,
  baseWeight: 100,
  simRounds: 10000,
  players: buildDefaultPlayers(5, true)
};

const queryKeys = {
  templates: ["admin-room-templates"] as const,
  publicTemplates: roomTemplateQueryKeys.visible,
  rooms: ["rooms"] as const,
  catalog: ["rooms-catalog"] as const
};

export default function AdminConfiguratorPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ConfigTestResponse | null>(null);
  const [warningsAccepted, setWarningsAccepted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: queryKeys.templates,
    queryFn: adminTemplateService.getTemplates
  });

  const form = useForm<RoomTemplateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: "onChange"
  });

  const playersField = useFieldArray({
    control: form.control,
    name: "players"
  });

  const values = form.watch();
  const changeSignature = JSON.stringify(values);
  const hasWarnings = Boolean(analysis?.warnings.length);
  const hasBlockers = Boolean(analysis?.blocked || analysis?.blockers.length);
  const canSave =
    form.formState.isValid &&
    Boolean(analysis) &&
    !hasBlockers &&
    (!hasWarnings || warningsAccepted);

  useEffect(() => {
    setAnalysis(null);
    setWarningsAccepted(false);
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [changeSignature]);

  const testMutation = useMutation({
    mutationFn: (payload: RoomTemplateFormValues) => adminTemplateService.testConfig(payload),
    onMutate: () => {
      setErrorMessage(null);
      setSuccessMessage("Анализ запущен. Проверяем конфигурацию.");
    },
    onSuccess: (result) => {
      setAnalysis(result);
      setWarningsAccepted(false);
      setErrorMessage(null);
      setSuccessMessage(result.blocked ? null : "Проверка завершена. Посмотрите аналитику перед сохранением.");
    },
    onError: (error) => {
      setErrorMessage(getUserFriendlyError(error));
    }
  });

  const reportMutation = useMutation({
    mutationFn: (payload: RoomTemplateFormValues) => adminTemplateService.downloadReport(payload),
    onMutate: () => {
      setErrorMessage(null);
      setSuccessMessage("Формируем PDF-отчет.");
    },
    onSuccess: (report) => {
      downloadBlob(report, "config-analysis-report.pdf");
      setSuccessMessage("PDF-отчет скачан.");
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(getUserFriendlyError(error));
    }
  });

  const createMutation = useMutation({
    mutationFn: (payload: RoomTemplateFormValues) => adminTemplateService.createTemplate(payload),
    onMutate: () => {
      setErrorMessage(null);
      setSuccessMessage("Сохраняем шаблон.");
    },
    onSuccess: async () => {
      setEditingId(null);
      form.reset(defaults);
      setAnalysis(null);
      setWarningsAccepted(false);
      setSuccessMessage("Шаблон создан и сохранен.");
      await invalidateTemplateQueries(queryClient);
    },
    onError: (error) => setErrorMessage(getUserFriendlyError(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RoomTemplateFormValues }) => adminTemplateService.updateTemplate(id, payload),
    onMutate: () => {
      setErrorMessage(null);
      setSuccessMessage("Сохраняем изменения шаблона.");
    },
    onSuccess: async () => {
      setEditingId(null);
      setAnalysis(null);
      setWarningsAccepted(false);
      setSuccessMessage("Изменения шаблона сохранены.");
      await invalidateTemplateQueries(queryClient);
    },
    onError: (error) => setErrorMessage(getUserFriendlyError(error))
  });

  const deleteMutation = useMutation({
    mutationFn: async (template: RoomTemplate) => {
      if (!template.id) throw new Error("Не удалось удалить шаблон: отсутствует id шаблона.");
      await adminTemplateService.deleteTemplate(template.id);
      return template.id;
    },
    onMutate: async (template) => {
      setErrorMessage(null);
      setSuccessMessage("Удаляем шаблон.");
      await queryClient.cancelQueries({ queryKey: queryKeys.templates });
      const previousTemplates = queryClient.getQueryData<RoomTemplate[]>(queryKeys.templates);
      queryClient.setQueryData<RoomTemplate[]>(queryKeys.templates, (items) => items?.filter((item) => item.id !== template.id) ?? []);
      return { previousTemplates };
    },
    onSuccess: async (_deletedId, template) => {
      if (editingId === template.id) resetEditor();
      setSuccessMessage("Шаблон удален.");
      await invalidateTemplateQueries(queryClient);
    },
    onError: (error, _template, context) => {
      if (context?.previousTemplates) queryClient.setQueryData(queryKeys.templates, context.previousTemplates);
      setSuccessMessage(null);
      setErrorMessage(getUserFriendlyError(error));
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ template, visible }: { template: RoomTemplate; visible: boolean }) =>
      adminTemplateService.updateTemplate(template.id, { ...domainTemplateToFormValues(template), templateVisible: visible }),
    onSuccess: async () => {
      setSuccessMessage("Публикация шаблона обновлена.");
      setErrorMessage(null);
      await invalidateTemplateQueries(queryClient);
    },
    onError: (error) => setErrorMessage(getUserFriendlyError(error))
  });

  const projectedPrizePool = useMemo(
    () => values.entryCost * Math.min(values.players.length, values.seats) * (values.prizePoolPercent / 100),
    [values.entryCost, values.players.length, values.prizePoolPercent, values.seats]
  );

  function runAnalysis() {
    void form.handleSubmit((payload) => testMutation.mutate(payload))();
  }

  function downloadReport() {
    void form.handleSubmit((payload) => reportMutation.mutate(payload))();
  }

  function saveTemplate(payload: RoomTemplateFormValues) {
    if (!canSave) return;
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  function startEditing(template: RoomTemplate) {
    setEditingId(template.id);
    form.reset(domainTemplateToFormValues(template));
    setAnalysis(null);
    setWarningsAccepted(false);
    setSuccessMessage("Шаблон открыт для редактирования. Запустите проверку перед сохранением.");
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function resetEditor() {
    setEditingId(null);
    form.reset(defaults);
    setAnalysis(null);
    setWarningsAccepted(false);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function syncPlayersWithSeats() {
    const nextPlayers = buildDefaultPlayers(values.seats, values.boostEnabled);
    form.setValue("players", nextPlayers, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <AppFrame>
      <AccessGuard roles={["admin"]} title="Раздел недоступен">
        <div className="mx-auto max-w-[1460px] space-y-6">
          <AdminHero templatesCount={templatesQuery.data?.length ?? 0} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)] xl:items-start">
            <div ref={editorRef} className="scroll-mt-28 space-y-6">
              <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden md:p-7">
                <PanelGlow />
                <div className="relative mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
                      {editingId ? "Редактирование шаблона" : "Создание шаблона"}
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum">
                      {editingId ? "Параметры выбранного шаблона" : "Новый шаблон комнаты"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-smoke">
                      Шаблон хранит конфигурацию. Игроки, таймер и состояние игры появляются позже, когда по нему создается активная комната.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={resetEditor}>
                    <Plus className="mr-2 h-4 w-4" />
                    Новый шаблон
                  </Button>
                </div>

                <form className="relative space-y-6" onSubmit={form.handleSubmit(saveTemplate)}>
                  <Field label="Название шаблона" error={form.formState.errors.title?.message}>
                    <input {...form.register("title")} className="field" placeholder="Например: Комната 5x1000" />
                  </Field>

                  <GameMechanicSelector value={values.mode} onChange={(mode) => form.setValue("mode", mode, { shouldValidate: true, shouldDirty: true })} />

                  <section className="grid gap-4 md:grid-cols-2">
                    <Field label="Цена входа" error={form.formState.errors.entryCost?.message}>
                      <input type="number" min={1000} max={10000} {...form.register("entryCost")} className="field" />
                    </Field>
                    <Field label="Количество мест" error={form.formState.errors.seats?.message}>
                      <input type="number" {...form.register("seats", { onBlur: syncPlayersWithSeats })} className="field" />
                    </Field>
                    <Field label="Выплата победителю, %" error={form.formState.errors.prizePoolPercent?.message}>
                      <input type="number" {...form.register("prizePoolPercent")} className="field" />
                    </Field>
                    <Field label="Призовой фонд, авто">
                      <input value={Math.round(projectedPrizePool)} readOnly className="field opacity-80" />
                    </Field>
                    <Field label="Базовый вес игрока" helper="Вес используется для расчета диапазонов шансов. Буст добавляет дополнительный вес, но не гарантирует победу." error={form.formState.errors.baseWeight?.message}>
                      <input type="number" {...form.register("baseWeight")} className="field" />
                    </Field>
                    <Field label="Раундов симуляции" error={form.formState.errors.simRounds?.message}>
                      <input type="number" {...form.register("simRounds")} className="field" />
                    </Field>
                  </section>

                  <section className="admin-soft-panel rounded-[30px] bg-[linear-gradient(145deg,rgba(255,205,24,0.10),rgba(255,255,255,0.035)_46%,rgba(14,15,20,0.86))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.07)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black tracking-[-0.03em] text-platinum">Буст участия</p>
                        <p className="mt-1 max-w-xl text-sm leading-7 text-smoke">Настройка участвует в анализе, истории и будущей игровой комнате.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-gold/10 px-4 py-2 text-sm font-bold text-gold">
                        <input type="checkbox" {...form.register("boostEnabled")} className="h-4 w-4 accent-[#ffcd18]" />
                        Буст включен
                      </label>
                    </div>
                    <div className={cn("mt-4 grid gap-4 md:grid-cols-2", !values.boostEnabled && "opacity-55")}>
                      <Field label="Цена буста" error={form.formState.errors.boostCost?.message}>
                        <input type="number" {...form.register("boostCost")} disabled={!values.boostEnabled} className="field" />
                      </Field>
                      <Field label="Бонус к весу" error={form.formState.errors.boostWeight?.message}>
                        <input type="number" {...form.register("boostWeight")} disabled={!values.boostEnabled} className="field" />
                      </Field>
                    </div>
                  </section>

                  <PlayersEditor fields={playersField.fields} register={form.register} append={playersField.append} remove={playersField.remove} boostEnabled={values.boostEnabled} />

                  <section className="grid gap-4">
                    <label className="flex min-h-[74px] items-center justify-between rounded-[24px] bg-white/[0.045] p-4 text-sm text-smoke shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]">
                      Показывать игрокам
                      <input type="checkbox" {...form.register("templateVisible")} className="h-5 w-5 accent-[#ffcd18]" />
                    </label>
                  </section>

                  <SaveFlow
                    analysis={analysis}
                    warningsAccepted={warningsAccepted}
                    setWarningsAccepted={setWarningsAccepted}
                    canSave={canSave}
                    isSaving={createMutation.isPending || updateMutation.isPending}
                    editing={Boolean(editingId)}
                    onRunAnalysis={runAnalysis}
                    onDownloadReport={downloadReport}
                    analysisPending={testMutation.isPending}
                    reportPending={reportMutation.isPending}
                    errorMessage={errorMessage}
                    successMessage={successMessage}
                  />
                </form>
              </Panel>
            </div>

            <div className="space-y-6">
              <AnalysisPanel
                analysis={analysis}
                pending={testMutation.isPending}
                players={values.players}
                simRounds={values.simRounds}
              />
              <TemplatePreview values={values} projectedPrizePool={projectedPrizePool} />
            </div>
          </div>

          <TemplatesList
            templates={templatesQuery.data ?? []}
            loading={templatesQuery.isLoading}
            error={templatesQuery.error ? getUserFriendlyError(templatesQuery.error) : null}
            editingId={editingId}
            onEdit={startEditing}
            onDelete={(template) => {
              if (window.confirm(`Удалить шаблон «${template.title}»?`)) deleteMutation.mutate(template);
            }}
            onToggle={(template) => toggleMutation.mutate({ template, visible: !(template.templateVisible !== false) })}
            busyId={deleteMutation.variables?.id ?? toggleMutation.variables?.template.id ?? null}
          />
        </div>
      </AccessGuard>
    </AppFrame>
  );
}

function AdminHero({ templatesCount }: { templatesCount: number }) {
  return (
    <section className="surface-solid relative overflow-hidden rounded-[36px] p-6 md:p-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
      <div className="pointer-events-none absolute right-[-10rem] top-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.12),transparent_64%)]" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full bg-gold/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Администрирование</p>
          <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
            Конфигуратор
            <br />
            <span className="brand-marker">шаблонов</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-smoke md:text-lg">
            Настройте комнату, проверьте экономику, подтвердите риски и публикуйте готовый сценарий для игроков.
          </p>
        </div>
        <div className="rounded-[26px] bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Шаблонов</p>
          <p className="mt-2 text-4xl font-black text-gold">{templatesCount}</p>
        </div>
      </div>
    </section>
  );
}

function GameMechanicSelector({ value, onChange }: { value: GameMode; onChange: (mode: GameMode) => void }) {
  return (
    <section className="admin-soft-panel rounded-[30px] bg-[linear-gradient(145deg,rgba(255,205,24,0.085),rgba(255,255,255,0.026)_46%,rgba(14,15,20,0.86))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-black tracking-[-0.03em] text-platinum">Игровая механика</p>
          <p className="mt-1 text-sm text-muted">Выберите, как будет выглядеть розыгрыш для игроков.</p>
        </div>
        <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gold">5 режимов</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Object.values(GAME_MECHANICS).map((mode, index) => (
          <button
            key={mode.key}
            type="button"
            onClick={() => onChange(mode.key)}
            className={cn(
              "admin-mechanic-card group rounded-[24px] p-4 text-left transition shadow-[0_18px_54px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.055)]",
              value === mode.key
                ? "bg-[linear-gradient(135deg,rgba(255,205,24,0.18),rgba(123,60,255,0.07)_58%,rgba(77,215,200,0.06)),rgba(11,12,16,0.92)]"
                : "bg-white/[0.04] hover:bg-white/[0.07]"
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black", value === mode.key ? "bg-gold text-ink" : "bg-white/[0.06] text-gold")}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-platinum">{mode.label}</p>
                  {value === mode.key ? <Sparkles className="h-4 w-4 text-gold" /> : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-smoke">{mode.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PlayersEditor({
  fields,
  register,
  append,
  remove,
  boostEnabled
}: {
  fields: Array<{ id: string; name: string; boost: boolean }>;
  register: ReturnType<typeof useForm<RoomTemplateFormValues>>["register"];
  append: (value: { name: string; boost: boolean }) => void;
  remove: (index: number) => void;
  boostEnabled: boolean;
}) {
  return (
    <section className="admin-soft-panel rounded-[30px] bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-platinum">
            <UsersRound className="h-5 w-5 text-gold" />
            Игроки для симуляции
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">Эти участники нужны для проверки вероятностей и баланса комнаты.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => append({ name: `Игрок ${fields.length + 1}`, boost: false })} disabled={fields.length >= 10}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-[22px] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <input {...register(`players.${index}.name`)} className="field" placeholder={`Игрок ${index + 1}`} />
            <label className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold", boostEnabled ? "bg-gold/10 text-gold" : "bg-white/[0.04] text-muted")}>
              <input type="checkbox" {...register(`players.${index}.boost`)} disabled={!boostEnabled} className="h-4 w-4 accent-[#ffcd18]" />
              Буст
            </label>
            <Button type="button" variant="ghost" onClick={() => remove(index)} disabled={fields.length <= 2} className="text-muted hover:text-ember">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SaveFlow({
  analysis,
  warningsAccepted,
  setWarningsAccepted,
  canSave,
  isSaving,
  editing,
  onRunAnalysis,
  onDownloadReport,
  analysisPending,
  reportPending,
  errorMessage,
  successMessage
}: {
  analysis: ConfigTestResponse | null;
  warningsAccepted: boolean;
  setWarningsAccepted: (value: boolean) => void;
  canSave: boolean;
  isSaving: boolean;
  editing: boolean;
  onRunAnalysis: () => void;
  onDownloadReport: () => void;
  analysisPending: boolean;
  reportPending: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}) {
  const hasWarnings = Boolean(analysis?.warnings.length);
  return (
    <section className="admin-soft-panel rounded-[30px] bg-[linear-gradient(145deg,rgba(255,205,24,0.11),rgba(255,255,255,0.035)_48%,rgba(12,13,18,0.9))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.065)]">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-lg font-black tracking-[-0.03em] text-platinum">Публикация шаблона</p>
          <p className="mt-1 text-sm leading-6 text-smoke">
            Сначала запустите проверку. Если есть предупреждения, подтвердите риск перед сохранением.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Button type="button" variant="secondary" onClick={onRunAnalysis} disabled={analysisPending} className="w-full">
            {analysisPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            {analysisPending ? "Проверяем..." : "Запустить анализ"}
          </Button>
          <Button type="button" variant="secondary" onClick={onDownloadReport} disabled={reportPending} className="w-full">
            {reportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {reportPending ? "Готовим PDF..." : "Скачать PDF"}
          </Button>
          <Button disabled={!canSave || isSaving} className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editing ? "Сохранить изменения" : "Создать шаблон"}
          </Button>
        </div>
      </div>
      {analysis && hasWarnings && !analysis.blocked ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[22px] bg-gold/10 p-4 text-sm leading-6 text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]">
          <input type="checkbox" checked={warningsAccepted} onChange={(event) => setWarningsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#ffcd18]" />
          <span>Я ознакомился с предупреждениями и понимаю риски выбранной конфигурации.</span>
        </label>
      ) : null}
      <div className="mt-4 grid gap-3">
        {errorMessage ? <SystemMessage tone="critical" text={errorMessage} /> : null}
        {successMessage ? <SystemMessage tone="good" text={successMessage} /> : null}
        <PublicationStatus analysis={analysis} canSave={canSave} />
      </div>
    </section>
  );
}

function PublicationStatus({ analysis, canSave }: { analysis: ConfigTestResponse | null; canSave: boolean }) {
  const tone = !analysis || analysis.blocked ? "critical" : canSave ? "good" : "warning";
  const Icon = tone === "critical" ? ShieldAlert : tone === "warning" ? AlertTriangle : CheckCircle2;
  const text = !analysis
    ? "Сохранение откроется после проверки."
    : analysis.blocked
      ? "Публикация заблокирована."
      : canSave
        ? "Готово к публикации."
        : "Подтвердите предупреждения.";
  return (
    <div className={cn("flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold", tone === "good" && "bg-jade/12 text-jade", tone === "warning" && "bg-gold/12 text-gold", tone === "critical" && "bg-ember/12 text-ember")}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function AnalysisPanel({ analysis, pending, players, simRounds }: { analysis: ConfigTestResponse | null; pending: boolean; players: RoomTemplateFormValues["players"]; simRounds: number }) {
  const chartRows = useMemo(() => buildDistributionRows(analysis, players, simRounds), [analysis, players, simRounds]);
  const recommendations = analysis ? localRecommendations(analysis) : [];

  return (
    <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden">
      <PanelGlow />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Аналитика</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">Проверка конфигурации</h3>
            <p className="mt-2 text-sm leading-6 text-smoke">
              Метрики, график, предупреждения и рекомендации появятся после запуска проверки.
            </p>
          </div>
          {pending ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : <FileText className="h-5 w-5 text-gold" />}
        </div>

        {!analysis ? (
          <div className="rounded-[28px] bg-white/[0.045] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]">
            <div className="grid h-16 w-16 place-items-center rounded-[24px] bg-gold/10 text-gold">
              {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : <BarChart3 className="h-6 w-6" />}
            </div>
            <h4 className="mt-5 text-xl font-black tracking-[-0.035em] text-platinum">
              {pending ? "Анализ выполняется" : "Анализ еще не выполнен"}
            </h4>
            <p className="mt-2 text-sm leading-7 text-muted">
              {pending
                ? "Идет расчет конфигурации. После завершения здесь появятся ошибки, предупреждения, метрики и график по игрокам."
                : "Нажмите «Запустить анализ», чтобы получить проверку. До этого графики и метрики не показываются, чтобы не смешивать настройку с результатом."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <IssueGroup title="Блокировки" empty="Блокировок нет." tone="critical" issues={analysis.blockers} />
            <IssueGroup title="Предупреждения" empty="Предупреждений нет." tone="warning" issues={analysis.warnings} />
            <IssueGroup title="Рекомендации" empty="Дополнительных рекомендаций нет." tone="recommendation" issues={recommendations} />
            <MetricsGrid metrics={analysis.metrics} simRounds={simRounds} playersCount={players.length} />
            <WinDistribution rows={chartRows} />
          </div>
        )}
      </div>
    </Panel>
  );
}

function IssueGroup({ title, empty, tone, issues }: { title: string; empty: string; tone: "critical" | "warning" | "recommendation"; issues: AnalysisIssue[] }) {
  const Icon = tone === "critical" ? ShieldAlert : tone === "warning" ? AlertTriangle : Sparkles;
  return (
    <div>
      <p className="text-sm font-bold text-platinum">{title}</p>
      <div className="mt-3 space-y-3">
        {issues.length ? issues.map((issue) => (
          <div key={`${issue.level}-${issue.code}-${issue.title}`} className="rounded-[20px] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-start gap-3">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "critical" && "text-ember", tone === "warning" && "text-gold", tone === "recommendation" && "text-jade")} />
              <div>
                <p className="font-semibold text-platinum">{issue.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{issue.message}</p>
                {issue.code ? <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted">{issue.code}</p> : null}
              </div>
            </div>
          </div>
        )) : (
          <div className="flex items-center gap-3 rounded-[20px] bg-white/[0.04] p-4 text-sm text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <CheckCircle2 className="h-4 w-4 text-jade" />
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricsGrid({ metrics, simRounds, playersCount }: { metrics: ConfigTestResponse["metrics"]; simRounds: number; playersCount: number }) {
  const items = [
    { key: "rounds", label: "Раунды", value: formatNumber(simRounds), tone: "neutral" as const, verdict: "объем проверки" },
    { key: "players", label: "Игроки", value: String(playersCount), tone: playersCount >= 4 ? "good" as const : "warning" as const, verdict: playersCount >= 4 ? "достаточно" : "лучше добавить" },
    { key: "totalEntry", label: "Взносы всего", value: formatMetricMoney(metrics.totalEntry), tone: "neutral" as const, verdict: "основа фонда" },
    { key: "prizePool", label: "Призовой фонд", value: formatMetricMoney(metrics.prizePool), tone: "neutral" as const, verdict: "выплата игроку" },
    metricItem("houseMargin", "Процент организатора", formatMetricPercent(metrics.houseMargin), assessHouseMargin(metrics.houseMargin)),
    metricItem("averagePlayerROI", "Средний ROI", formatMetricDecimal(metrics.averagePlayerROI), assessAverageRoi(metrics.averagePlayerROI)),
    metricItem("minPlayerROI", "Минимальный ROI", formatMetricDecimal(metrics.minPlayerROI), assessMinRoi(metrics.minPlayerROI)),
    metricItem("boostImpactShare", "Влияние буста", formatMetricPercent(metrics.boostImpactShare), assessBoostImpact(metrics.boostImpactShare)),
    metricItem("boostEfficiencyVsCosts", "Эффективность буста", formatMetricPercent(metrics.boostEfficiencyVsCosts), assessBoostEfficiency(metrics.boostEfficiencyVsCosts))
  ];
  return (
    <div>
      <p className="text-sm font-bold text-platinum">Ключевые метрики</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.key} className={cn("rounded-[20px] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]", metricCardClass(item.tone))}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{item.label}</p>
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", metricDotClass(item.tone))} />
            </div>
            <p className="mt-2 text-xl font-black text-platinum">{item.value}</p>
            <p className={cn("mt-2 text-xs font-semibold", metricTextClass(item.tone))}>{item.verdict}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinDistribution({ rows }: { rows: Array<{ name: string; wins: number; actualPct: number; theoreticalPct: number }> }) {
  const maxWins = Math.max(...rows.map((row) => row.wins), 1);
  return (
    <div>
      <p className="text-sm font-bold text-platinum">Распределение побед</p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[90px_1fr_82px] items-center gap-3 text-sm">
            <span className="truncate text-smoke">{row.name}</span>
            <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.round((row.wins / maxWins) * 100)}%` }} />
            </span>
            <span className="text-right text-muted">{row.actualPct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid stroke="rgba(237,232,220,.08)" vertical={false} />
            <XAxis dataKey="name" stroke="#9b978d" tickLine={false} axisLine={false} />
            <YAxis stroke="#9b978d" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "none", borderRadius: 18, boxShadow: "var(--tooltip-shadow)" }} />
            <Bar dataKey="wins" fill="#ffcd18" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TemplatePreview({ values, projectedPrizePool }: { values: RoomTemplateFormValues; projectedPrizePool: number }) {
  return (
    <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden">
      <PanelGlow />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Предпросмотр</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">Шаблон комнаты</h3>
          </div>
          {values.templateVisible ? <Eye className="h-5 w-5 text-jade" /> : <EyeOff className="h-5 w-5 text-muted" />}
        </div>
        <div className="admin-soft-panel rounded-[28px] bg-[linear-gradient(145deg,rgba(255,205,24,0.10),rgba(255,255,255,0.035)_44%,rgba(12,13,18,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Шаблон</p>
          <h4 className="mt-2 text-xl font-semibold text-platinum">{values.title}</h4>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <TemplateStat label="Игра" value={mechanicTitleByMode(values.mode)} />
            <TemplateStat label="Вход" value={formatBonus(values.entryCost)} />
            <TemplateStat label="Игроки" value={`${values.players.length} / ${values.seats}`} />
            <TemplateStat label="Фонд" value={formatBonus(projectedPrizePool)} />
            <TemplateStat label="Буст" value={values.boostEnabled ? `${formatBonus(values.boostCost)} · +${values.boostWeight}%` : "Отключен"} />
            <TemplateStat label="Статус" value={values.templateVisible ? "Опубликован" : "Скрыт"} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TemplatesList({
  templates,
  loading,
  error,
  editingId,
  onEdit,
  onDelete,
  onToggle,
  busyId
}: {
  templates: RoomTemplate[];
  loading: boolean;
  error: string | null;
  editingId: string | null;
  onEdit: (template: RoomTemplate) => void;
  onDelete: (template: RoomTemplate) => void;
  onToggle: (template: RoomTemplate) => void;
  busyId: string | null;
}) {
  return (
    <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden md:p-7">
      <PanelGlow />
      <div className="relative mb-6 max-w-3xl">
        <p className="mb-3 inline-flex rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Шаблоны</p>
        <h2 className="text-3xl font-black tracking-[-0.045em] text-platinum md:text-4xl">Список шаблонов</h2>
        <p className="mt-3 text-sm leading-7 text-smoke">Это конфигурации, которые игрок видит как готовые сценарии. Активная комната создается позже.</p>
      </div>
      {loading ? <SkeletonTemplates /> : null}
      {error ? <SystemMessage tone="critical" text={error} /> : null}
      {!loading && !error && templates.length === 0 ? (
        <div className="rounded-[26px] bg-white/[0.04] p-5 text-sm text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]">Шаблонов пока нет. Создайте первый сценарий и запустите проверку.</div>
      ) : null}
      <div className="relative space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className={cn(
              "rounded-[26px] p-4 transition shadow-[0_22px_70px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.065)]",
              editingId === template.id ? "bg-gold/12" : "bg-white/[0.04] hover:bg-white/[0.065]"
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-platinum">{template.title}</p>
                  <SmallStatus visible={template.templateVisible !== false} />
                </div>
                <p className="text-sm text-muted">{mechanicTitleByMode(template.mode)} · {template.seats} мест · вход {formatBonus(template.entryCost)}</p>
                <p className="text-sm text-muted">
                  {template.boostEnabled ? `Буст ${formatBonus(template.boostCost)} · ${template.boostImpact}` : "Буст отключен"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => onEdit(template)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Редактировать
                </Button>
                <Button type="button" variant="secondary" onClick={() => onToggle(template)} disabled={busyId === template.id}>
                  {template.templateVisible !== false ? "Скрыть" : "Показать"}
                </Button>
                <Button type="button" variant="ghost" className="text-muted hover:bg-ember/10 hover:text-ember" onClick={() => onDelete(template)} disabled={busyId === template.id}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Field({ label, helper, error, children }: { label: string; helper?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-muted">
      <span className="mb-2 flex items-center gap-2">
        {label}
        {helper ? <InfoTooltip text={helper} /> : null}
      </span>
      {children}
      {error ? <p className="mt-2 text-xs text-ember">{error}</p> : null}
    </label>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle className="h-4 w-4 text-gold/80" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-2xl bg-ink/95 p-3 text-xs leading-5 text-smoke shadow-2xl group-hover:block">
        {text}
      </span>
    </span>
  );
}

function TemplateStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-semibold text-platinum">{value}</p>
    </div>
  );
}

function SmallStatus({ visible }: { visible: boolean }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", visible ? "bg-jade/10 text-jade" : "bg-platinum/[0.08] text-muted")}>
      {visible ? "Виден игрокам" : "Скрыт"}
    </span>
  );
}

function SystemMessage({ tone, text }: { tone: "good" | "critical"; text: string }) {
  return (
    <div className={cn("rounded-[24px] p-4 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]", tone === "good" ? "bg-jade/12 text-jade" : "bg-ember/12 text-ember")}>
      {text}
    </div>
  );
}

function SkeletonTemplates() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-[26px] bg-white/[0.04]" />
      ))}
    </div>
  );
}

function PanelGlow() {
  return (
    <>
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.12),transparent_64%)]" />
      <div className="pointer-events-none absolute -bottom-32 right-[-8rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.08),transparent_64%)]" />
    </>
  );
}

function buildDistributionRows(analysis: ConfigTestResponse | null, players: RoomTemplateFormValues["players"], simRounds: number) {
  const names = analysis?.names.length ? analysis.names : players.map((player) => player.name);
  const wins = analysis?.wins ?? {};
  return names.map((name, index) => {
    const winCount = wins[name] ?? 0;
    const actualPct = simRounds > 0 ? (winCount / simRounds) * 100 : 0;
    const theoreticalPct = analysis?.probs[index] ? analysis.probs[index] * 100 : 0;
    return { name, wins: winCount, actualPct, theoreticalPct };
  });
}

function formatMetricMoney(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? formatBonus(value) : "—";
}

function formatMetricPercent(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

function formatMetricDecimal(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

type MetricTone = "good" | "warning" | "critical" | "neutral";

function metricItem(key: string, label: string, value: string, assessment: { tone: MetricTone; verdict: string }) {
  return { key, label, value, ...assessment };
}

function assessHouseMargin(value?: number): { tone: MetricTone; verdict: string } {
  if (typeof value !== "number") return { tone: "neutral", verdict: "нет данных" };
  if (value < 0.08) return { tone: "critical", verdict: "маржа слишком низкая" };
  if (value > 0.35) return { tone: "warning", verdict: "дорого для игрока" };
  return { tone: "good", verdict: "управляемая экономика" };
}

function assessAverageRoi(value?: number): { tone: MetricTone; verdict: string } {
  if (typeof value !== "number") return { tone: "neutral", verdict: "нет данных" };
  if (value < 0.55) return { tone: "critical", verdict: "слабая ценность" };
  if (value < 0.8) return { tone: "warning", verdict: "на границе" };
  return { tone: "good", verdict: "выглядит привлекательно" };
}

function assessMinRoi(value?: number): { tone: MetricTone; verdict: string } {
  if (typeof value !== "number") return { tone: "neutral", verdict: "нет данных" };
  if (value < 0.3) return { tone: "critical", verdict: "часть игроков проседает" };
  if (value < 0.55) return { tone: "warning", verdict: "нужна проверка" };
  return { tone: "good", verdict: "ровное распределение" };
}

function assessBoostImpact(value?: number): { tone: MetricTone; verdict: string } {
  if (typeof value !== "number") return { tone: "neutral", verdict: "нет данных" };
  if (value > 0.18) return { tone: "critical", verdict: "перегретый буст" };
  if (value > 0.1) return { tone: "warning", verdict: "заметное влияние" };
  return { tone: "good", verdict: "аккуратное усиление" };
}

function assessBoostEfficiency(value?: number): { tone: MetricTone; verdict: string } {
  if (typeof value !== "number") return { tone: "neutral", verdict: "нет данных" };
  if (value < 0.02 || value > 0.14) return { tone: "warning", verdict: "проверьте цену" };
  return { tone: "good", verdict: "стоимость выглядит честно" };
}

function metricCardClass(tone: MetricTone) {
  return cn(
    tone === "good" && "bg-jade/10",
    tone === "warning" && "bg-gold/11",
    tone === "critical" && "bg-ember/11",
    tone === "neutral" && "bg-white/[0.045]"
  );
}

function metricDotClass(tone: MetricTone) {
  return cn(
    tone === "good" && "bg-jade",
    tone === "warning" && "bg-gold",
    tone === "critical" && "bg-ember",
    tone === "neutral" && "bg-muted"
  );
}

function metricTextClass(tone: MetricTone) {
  return cn(
    tone === "good" && "text-jade",
    tone === "warning" && "text-gold",
    tone === "critical" && "text-ember",
    tone === "neutral" && "text-muted"
  );
}

async function invalidateTemplateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.templates });
  await queryClient.invalidateQueries({ queryKey: queryKeys.publicTemplates });
  await queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
  await queryClient.invalidateQueries({ queryKey: queryKeys.catalog });
}
