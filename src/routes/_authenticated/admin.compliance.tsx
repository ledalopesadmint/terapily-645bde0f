/**
 * /admin/compliance — Compliance Console for legal defense.
 * Hierarchical navigation: Workspaces → Patients → Activity History + Audit.
 * Read-only. Admin exclusive.
 */

import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Shield,
  Building2,
  Users,
  ChevronRight,
  ArrowLeft,
  Search,
  Activity,
  FileCheck2,
  Clock,
  AlertTriangle,
  Hash,
  Repeat,
} from "lucide-react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import {
  adminListWorkspaces,
  adminGetWorkspaceDetail,
  adminGetPatientHistory,
} from "@/server/admin-compliance.functions";

export const Route = createFileRoute("/_authenticated/admin/compliance")({
  component: AdminComplianceTab,
});

/* ─── Types ──────────────────────────────────────────────────── */

type ViewLevel = "workspaces" | "workspace" | "patient";

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  deleted_at: string | null;
  owner_id: string | null;
  member_count: number;
  tier: string;
  sub_status: string;
  active_patients: number;
}

/* ─── Main Component ─────────────────────────────────────────── */

function AdminComplianceTab() {
  const [level, setLevel] = useState<ViewLevel>("workspaces");
  const [search, setSearch] = useState("");

  // Data
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [wsDetail, setWsDetail] = useState<Awaited<ReturnType<typeof adminGetWorkspaceDetail>> | null>(null);
  const [patientHistory, setPatientHistory] = useState<Awaited<ReturnType<typeof adminGetPatientHistory>> | null>(null);
  const [loading, setLoading] = useState(false);

  // Selection
  const [selectedWs, setSelectedWs] = useState<WorkspaceSummary | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; display_name: string; initials: string } | null>(null);
  const [therapistFilter, setTherapistFilter] = useState<string>("all");

  // Load workspaces
  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListWorkspaces();
      setWorkspaces(data as WorkspaceSummary[]);
    } catch (err) {
      console.error("[compliance] failed to load workspaces", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspaces(); }, [loadWorkspaces]);

  // Select workspace
  const openWorkspace = async (ws: WorkspaceSummary) => {
    setSelectedWs(ws);
    setLevel("workspace");
    setLoading(true);
    try {
      const detail = await adminGetWorkspaceDetail({ data: { workspaceId: ws.id } });
      setWsDetail(detail);
    } catch (err) {
      console.error("[compliance] workspace detail failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Select patient
  const openPatient = async (patient: { id: string; display_name: string; initials: string }) => {
    if (!selectedWs) return;
    setSelectedPatient(patient);
    setLevel("patient");
    setLoading(true);
    try {
      const history = await adminGetPatientHistory({
        data: { workspaceId: selectedWs.id, patientId: patient.id },
      });
      setPatientHistory(history);
    } catch (err) {
      console.error("[compliance] patient history failed", err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (level === "patient") {
      setLevel("workspace");
      setPatientHistory(null);
      setSelectedPatient(null);
    } else if (level === "workspace") {
      setLevel("workspaces");
      setWsDetail(null);
      setSelectedWs(null);
      setTherapistFilter("all");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {level !== "workspaces" && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}
          <div>
            <Eyebrow>
              <Shield className="inline h-3.5 w-3.5 mr-1" />
              Compliance Console
            </Eyebrow>
            <p className="mt-1 text-sm text-muted-foreground">
              {level === "workspaces" && "Acesso read-only a todos os workspaces para auditoria e defesa legal."}
              {level === "workspace" && selectedWs && `Workspace: ${selectedWs.name}`}
              {level === "patient" && selectedPatient && `Paciente: ${selectedPatient.display_name} (${selectedPatient.id.slice(0, 8)}…)`}
            </p>
          </div>
        </div>

        {level === "workspaces" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar workspace…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-md border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground animate-pulse">Carregando…</p>
        </div>
      )}

      {/* Level 1: Workspaces */}
      {!loading && level === "workspaces" && (
        <WorkspaceList
          workspaces={workspaces}
          search={search}
          onSelect={openWorkspace}
        />
      )}

      {/* Level 2: Workspace detail */}
      {!loading && level === "workspace" && wsDetail && selectedWs && (
        <WorkspaceDetailView
          workspace={selectedWs}
          detail={wsDetail}
          therapistFilter={therapistFilter}
          onTherapistFilter={setTherapistFilter}
          onSelectPatient={openPatient}
        />
      )}

      {/* Level 3: Patient history */}
      {!loading && level === "patient" && patientHistory && (
        <PatientHistoryView history={patientHistory} />
      )}
    </div>
  );
}

/* ─── Level 1: Workspace List ────────────────────────────────── */

function WorkspaceList({
  workspaces,
  search,
  onSelect,
}: {
  workspaces: WorkspaceSummary[];
  search: string;
  onSelect: (ws: WorkspaceSummary) => void;
}) {
  const filtered = workspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(search.toLowerCase()) ||
      ws.id.includes(search),
  );

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nenhum workspace encontrado.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{filtered.length} workspace(s)</p>
      <div className="divide-y divide-border rounded-lg border border-border">
        {filtered.map((ws) => (
          <button
            key={ws.id}
            onClick={() => onSelect(ws)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{ws.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ws.tier.toUpperCase()} · {ws.sub_status} · {ws.member_count} membro(s) · {ws.active_patients} paciente(s)
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Level 2: Workspace Detail ──────────────────────────────── */

function WorkspaceDetailView({
  workspace,
  detail,
  therapistFilter,
  onTherapistFilter,
  onSelectPatient,
}: {
  workspace: WorkspaceSummary;
  detail: Awaited<ReturnType<typeof adminGetWorkspaceDetail>>;
  therapistFilter: string;
  onTherapistFilter: (id: string) => void;
  onSelectPatient: (p: { id: string; display_name: string; initials: string }) => void;
}) {
  const activeMembers = detail.members.filter((m) => !m.deleted_at);
  const allPatients = detail.patients;
  const activePatients = allPatients.filter((p) => !p.deleted_at);
  const deletedPatients = allPatients.filter((p) => p.deleted_at && !p.purged_at);
  const purgedPatients = allPatients.filter((p) => p.purged_at);

  const filteredPatients =
    therapistFilter === "all"
      ? allPatients
      : allPatients.filter((p) => p.assigned_therapist_id === therapistFilter);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Membros" value={activeMembers.length} icon={Users} />
        <StatCard label="Pacientes ativos" value={activePatients.length} />
        <StatCard label="Excluídos (30d)" value={deletedPatients.length} warn={deletedPatients.length > 0} />
        <StatCard label="Purgados" value={purgedPatients.length} />
      </div>

      {/* Members */}
      <section>
        <Eyebrow>Membros do workspace</Eyebrow>
        <div className="mt-2 divide-y divide-border rounded-lg border border-border">
          {activeMembers.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between px-4 py-2">
              <div>
                <p className="text-sm font-medium">{m.full_name}</p>
                <p className="text-xs text-muted-foreground">{m.role} · desde {new Date(m.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{m.user_id.slice(0, 8)}…</p>
            </div>
          ))}
        </div>
      </section>

      {/* Therapist filter */}
      {activeMembers.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Filtrar por terapeuta:</label>
          <select
            value={therapistFilter}
            onChange={(e) => onTherapistFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="all">Todos</option>
            {activeMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name} ({m.user_id.slice(0, 8)}…)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Patients */}
      <section>
        <Eyebrow>Pacientes ({filteredPatients.length})</Eyebrow>
        {filteredPatients.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum paciente neste filtro.</p>
        ) : (
          <div className="mt-2 divide-y divide-border rounded-lg border border-border max-h-[60vh] overflow-y-auto">
            {filteredPatients.map((p) => {
              const isPurged = !!p.purged_at;
              const isDeleted = !!p.deleted_at && !isPurged;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPatient({ id: p.id, display_name: p.display_name, initials: p.initials })}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {p.initials}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {p.display_name}
                        {isPurged && <span className="ml-2 text-xs text-destructive">[purgado]</span>}
                        {isDeleted && <span className="ml-2 text-xs text-orange-500">[excluído]</span>}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        ID: {p.id.slice(0, 8)}… · {p.status} · {(p.tags ?? []).join(", ") || "sem tags"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Level 3: Patient History ───────────────────────────────── */

function PatientHistoryView({
  history,
}: {
  history: Awaited<ReturnType<typeof adminGetPatientHistory>>;
}) {
  const { activities, ephemeral, habits, consents, auditLogs } = history;

  return (
    <div className="space-y-6">
      {/* Magic link activities */}
      <section>
        <Eyebrow>
          <Activity className="inline h-3.5 w-3.5 mr-1" />
          Atividades (Magic Link) — {activities.length}
        </Eyebrow>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma atividade magic link.</p>
        ) : (
          <ActivityTable
            items={activities.map((a) => ({
              id: a.id,
              activity_id: a.activity_id,
              status: a.status,
              delivery_mode: a.delivery_mode,
              created_at: a.created_at,
              used_at: a.used_at,
              expires_at: a.token_expires_at,
              extra: a.revocation_reason ? `Revogado: ${a.revocation_reason}` : undefined,
            }))}
          />
        )}
      </section>

      {/* Ephemeral activities */}
      <section>
        <Eyebrow>
          <Clock className="inline h-3.5 w-3.5 mr-1" />
          Atividades Efêmeras — {ephemeral.length}
        </Eyebrow>
        {ephemeral.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma atividade efêmera.</p>
        ) : (
          <ActivityTable
            items={ephemeral.map((e) => ({
              id: e.id,
              activity_id: e.activity_id,
              status: e.status,
              delivery_mode: e.delivery_mode,
              created_at: e.created_at,
              used_at: e.used_at,
              expires_at: e.token_expires_at,
              extra: e.pdf_download_count > 0 ? `${e.pdf_download_count} download(s)` : undefined,
            }))}
          />
        )}
      </section>

      {/* Habit links */}
      <section>
        <Eyebrow>
          <Repeat className="inline h-3.5 w-3.5 mr-1" />
          Links de Hábito — {habits.length}
        </Eyebrow>
        {habits.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum link de hábito.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Entradas</th>
                  <th className="px-3 py-2 font-medium">Última</th>
                  <th className="px-3 py-2 font-medium">Criado</th>
                  <th className="px-3 py-2 font-medium">Expira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {habits.map((h) => (
                  <tr key={h.id}>
                    <td className="px-3 py-2 font-mono">{h.id.slice(0, 8)}…</td>
                    <td className="px-3 py-2"><StatusBadge status={h.status} /></td>
                    <td className="px-3 py-2">{h.total_entries}</td>
                    <td className="px-3 py-2">{h.last_entry_at ? fmtDate(h.last_entry_at) : "—"}</td>
                    <td className="px-3 py-2">{fmtDate(h.created_at)}</td>
                    <td className="px-3 py-2">{fmtDate(h.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Consents */}
      <section>
        <Eyebrow>
          <FileCheck2 className="inline h-3.5 w-3.5 mr-1" />
          Registros de Consentimento — {consents.length}
        </Eyebrow>
        {consents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum consentimento registrado.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Atividade</th>
                  <th className="px-3 py-2 font-medium">Aceito</th>
                  <th className="px-3 py-2 font-medium">Versão</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consents.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-mono">{c.patient_activity_id?.slice(0, 8) ?? "—"}…</td>
                    <td className="px-3 py-2">
                      {c.accepted ? (
                        <span className="text-green-600 font-medium">Sim</span>
                      ) : (
                        <span className="text-destructive font-medium">Não</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{c.consent_version}</td>
                    <td className="px-3 py-2">{fmtDate(c.decided_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit trail */}
      <section>
        <Eyebrow>
          <Hash className="inline h-3.5 w-3.5 mr-1" />
          Audit Trail — {auditLogs.length} registro(s)
        </Eyebrow>
        {auditLogs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum registro de auditoria.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-border max-h-[50vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted text-left sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Ação</th>
                  <th className="px-3 py-2 font-medium">Recurso</th>
                  <th className="px-3 py-2 font-medium">Ator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    <td className="px-3 py-2 font-mono">{log.action}</td>
                    <td className="px-3 py-2 font-mono">{log.resource_id?.slice(0, 8) ?? "—"}…</td>
                    <td className="px-3 py-2 font-mono">{log.actor_id?.slice(0, 8) ?? "system"}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    expired: "bg-gray-100 text-gray-600",
    revoked: "bg-red-100 text-red-800",
    purged: "bg-gray-200 text-gray-500",
    active: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  warn,
}: {
  label: string;
  value: number;
  icon?: typeof Users;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${warn ? "border-orange-300 bg-orange-50" : "border-border"}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {warn && <AlertTriangle className="h-4 w-4 text-orange-500" />}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActivityTable({
  items,
}: {
  items: Array<{
    id: string;
    activity_id: string;
    status: string;
    delivery_mode: string;
    created_at: string;
    used_at: string | null;
    expires_at: string | null;
    extra?: string;
  }>;
}) {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2 font-medium">ID</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Modo</th>
            <th className="px-3 py-2 font-medium">Criado</th>
            <th className="px-3 py-2 font-medium">Usado</th>
            <th className="px-3 py-2 font-medium">Expira</th>
            <th className="px-3 py-2 font-medium">Info</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2 font-mono">{item.id.slice(0, 8)}…</td>
              <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
              <td className="px-3 py-2">{item.delivery_mode}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtDate(item.created_at)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtDate(item.used_at)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtDate(item.expires_at)}</td>
              <td className="px-3 py-2 text-muted-foreground">{item.extra ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
