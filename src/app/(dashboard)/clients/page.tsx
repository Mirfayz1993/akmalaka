"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/actions/clients";

type Client = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  type: string | null;
  notes: string | null;
  createdAt: Date | null;
  totalDebt: number;
};

type FormData = {
  name: string;
  phone: string;
  address: string;
  type: string;
  notes: string;
};

const PARTNER_TYPES = [
  { value: "client",           label: "Mijozlar" },
  { value: "russia_supplier",  label: "Rossiyadagi ta'minotchilar" },
  { value: "partner",          label: "Sheriklar" },
  { value: "personal",         label: "Shaxsiy tanishlar" },
  { value: "code_supplier",    label: "Kod sotib oladigan ta'minotchilar" },
  { value: "code_buyer",       label: "Kod sotiladigan mijozlar" },
] as const;

const emptyForm: FormData = {
  name: "",
  phone: "+998",
  address: "",
  type: "client",
  notes: "",
};

export default function ClientsPage() {
  const { t } = useI18n();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("client");

  async function loadClients(type?: string) {
    setIsLoading(true);
    try {
      const data = await getClients(type);
      setClients(data as Client[]);
    } catch (err) {
      console.error("Yuklanishda xatolik:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClients(activeTab);
  }, [activeTab]);

  function openAddModal() {
    setEditingClient(null);
    setForm({ ...emptyForm, type: activeTab });
    setIsModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone || "",
      address: client.address || "",
      type: client.type || "client",
      notes: client.notes || "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingClient(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        type: form.type,
        notes: form.notes.trim() || undefined,
      };
      if (editingClient) {
        await updateClient(editingClient.id, payload);
      } else {
        await createClient(payload);
      }
      await loadClients(activeTab);
      closeModal();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteClient(id);
      await loadClients(activeTab);
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || "").includes(searchQuery) ||
      (c.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTypeLabel = PARTNER_TYPES.find(t => t.value === activeTab)?.label ?? "";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t.clients.title}</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          {t.common.add}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200 overflow-x-auto">
        {PARTNER_TYPES.map((pt) => (
          <button
            key={pt.value}
            onClick={() => { setActiveTab(pt.value); setSearchQuery(""); }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === pt.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={t.common.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.loading}</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.clients.name}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.clients.phone}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.clients.address}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t.clients.totalDebt}</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{client.name}</td>
                    <td className="px-4 py-3 text-slate-600">{client.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{client.address || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {client.totalDebt > 0 ? (
                        <span className="font-semibold text-red-600">
                          ${client.totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(client)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          {t.common.edit}
                        </button>
                        {deleteConfirmId === client.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                            >
                              {t.common.confirm}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              {t.common.cancel}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(client.id)}
                            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            {t.common.delete}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats footer */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="mt-3 flex items-center gap-6 text-sm text-slate-500 px-1">
          <span>
            {t.common.total}: <span className="font-semibold text-slate-700">{filteredClients.length}</span>
          </span>
          {filteredClients.some((c) => c.totalDebt > 0) && (
            <span>
              {t.clients.totalDebt}:{" "}
              <span className="font-semibold text-red-600">
                ${filteredClients
                  .reduce((sum, c) => sum + c.totalDebt, 0)
                  .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingClient ? t.common.edit : t.common.add} — {activeTypeLabel}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.clients.name} <span className="text-red-500">*</span></label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t.clients.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.clients.phone}</label>
                <input type="text" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+998 90 000 00 00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.clients.address}</label>
                <input type="text" value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder={t.clients.address}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Turi</label>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                  {PARTNER_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.notes}</label>
                <textarea rows={3} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t.common.notes}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  {t.common.cancel}
                </button>
                <button type="submit" disabled={isSubmitting || !form.name.trim()}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors">
                  {isSubmitting ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
