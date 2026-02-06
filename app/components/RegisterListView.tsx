import { useState } from "react";
import type { CSSProperties } from "react";
import type { Register } from "~/types";
import type { DepreciationResult } from "~/services/depreciationService";
import DepreciationModal from "./DepreciationModal";
import { formatCurrency } from "~/utils";

// Helper functions to compute metrics
function getAssetCount(register: Register): number {
  return register.rooms.reduce((sum, room) => sum + room.assets.length, 0);
}

function getTotalValue(register: Register): number {
  return register.rooms.reduce((sum, room) => 
    sum + room.assets.reduce((assetSum, asset) => assetSum + (asset.purchasePrice || 0), 0), 0
  );
}

function getIncompleteCount(register: Register): number {
  return register.rooms.reduce((sum, room) => 
    sum + room.assets.filter(asset => {
      // Check standard incomplete flag OR missing depreciation settings
      const missingDepreciation = !asset.depnMethodAcc || !asset.depnRateAcc || !asset.depnMethodTax || !asset.depnRateTax;
      return asset.incomplete || missingDepreciation;
    }).length, 0
  );
}

interface RegisterListViewProps {
  registers: Register[];
  isLoading: boolean;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  address: string;
  suggestions: string[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onAddressChange: (value: string) => void;
  onSelectSuggestion: (suggestion: string) => void;
  onCreateRegister: (e: React.FormEvent) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onCancelCreate: () => void;
  view: "home" | "registers";
  onViewRegisters: () => void;
  onViewHome: () => void;
  // Depreciation modal
  showDepreciationModal: boolean;
  depreciationResults: DepreciationResult[];
  financialYear: string;
  onCloseDepreciationModal: () => void;
  // Refs
  inputRef: React.RefObject<HTMLInputElement | null>;
  suggestionsRef: React.RefObject<HTMLUListElement | null>;
}

export default function RegisterListView({
  registers,
  isLoading,
  isCreating,
  setIsCreating,
  address,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  onAddressChange,
  onSelectSuggestion,
  onCreateRegister,
  onEdit,
  onDelete,
  onCancelCreate,
  view,
  onViewRegisters,
  onViewHome,
  showDepreciationModal,
  depreciationResults,
  financialYear,
  onCloseDepreciationModal,
  inputRef,
  suggestionsRef,
}: RegisterListViewProps) {
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const isHomeView = view === "home";

  const handleDeleteClick = (index: number) => {
    setConfirmDeleteIndex(index);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteIndex !== null) {
      onDelete(confirmDeleteIndex);
      setConfirmDeleteIndex(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f5f1e8] text-[color:var(--ink)] font-['Space_Grotesk']"
      style={
        {
          "--ink": "#14110c",
          "--muted": "#5f5a52",
          "--panel": "#ffffff",
          "--accent": "#0f766e",
          "--accent-strong": "#0d9488",
        } as CSSProperties
      }
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(15,118,110,0.22)_0%,rgba(15,118,110,0)_65%)] blur-2xl" />
        <div className="pointer-events-none absolute right-0 top-32 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.25)_0%,rgba(245,158,11,0)_70%)] blur-2xl" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-white font-semibold">
              AR
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Asset Register</p>
              <p className="text-xs text-[color:var(--muted)]">Registers, depreciation, and audit trails</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-[color:var(--muted)] md:flex">
            {isHomeView ? (
              <>
                <a href="#features" className="hover:text-[color:var(--ink)]">Features</a>
                <button type="button" onClick={onViewRegisters} className="hover:text-[color:var(--ink)]">
                  Registers
                </button>
                <a href="#create" className="hover:text-[color:var(--ink)]">Start</a>
              </>
            ) : (
              <button type="button" onClick={onViewHome} className="hover:text-[color:var(--ink)]">
                Home
              </button>
            )}
          </nav>
          {isHomeView ? (
            <button
              type="button"
              onClick={onViewRegisters}
              className="hidden rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)] md:inline-flex"
            >
              View registers
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onViewHome();
                setIsCreating(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="hidden rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)] md:inline-flex"
            >
              Create register
            </button>
          )}
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20">
          {isHomeView && (
            <>
              <section className="grid items-center gap-10 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-6 animate-fade-up">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)] shadow">
                    Top page highlight
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <h1 className="font-['Fraunces'] text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
                    The register that reads like an audit trail.
                  </h1>
                  <p className="text-lg text-[color:var(--muted)]">
                    Track acquisition, exemptions, and depreciation for every asset with visual site plans and
                    real-time FY schedules. Designed for multi-property portfolios and advisors who need clarity fast.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(true);
                        setTimeout(() => inputRef.current?.focus(), 0);
                      }}
                      className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)]"
                    >
                      Create register
                    </button>
                    <button
                      type="button"
                      onClick={onViewRegisters}
                      className="rounded-full border border-emerald-200/70 bg-white/60 px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:border-emerald-300"
                    >
                      View registers
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2 text-sm text-[color:var(--muted)]">
                    <div className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm">
                      <p className="text-xl font-semibold text-[color:var(--ink)]">First item</p>
                      <p className="text-xs uppercase tracking-[0.2em]">Hero section</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm">
                      <p className="text-xl font-semibold text-[color:var(--ink)]">Second item</p>
                      <p className="text-xs uppercase tracking-[0.2em]">Hero section</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm">
                      <p className="text-xl font-semibold text-[color:var(--ink)]">Third item</p>
                      <p className="text-xs uppercase tracking-[0.2em]">Hero section</p>
                    </div>
                  </div>
                  <div className="grid gap-3 text-xs text-[color:var(--muted)] sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
                      Guided depreciation logic
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
                      Versioned exemptions
                    </div>
                  </div>
                </div>

                <div id="create" className="relative animate-fade-up" style={{ animationDelay: "120ms" }}>
                  <div className="absolute inset-0 -translate-y-6 rounded-3xl bg-white/40 blur-2xl" />
                  <div className="relative rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-emerald-500/10 backdrop-blur">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Start a register</p>
                        <h2 className="font-['Fraunces'] text-2xl text-[color:var(--ink)]">Site details</h2>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Step 1</span>
                    </div>

                    {isCreating ? (
                      <form onSubmit={onCreateRegister} className="space-y-4">
                        <div className="relative">
                          <label className="text-sm font-medium text-[color:var(--muted)]">Address</label>
                          <input
                            ref={inputRef}
                            type="text"
                            value={address}
                            onChange={(e) => onAddressChange(e.target.value)}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            placeholder="Start typing an address..."
                            className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            autoFocus
                          />
                          {showSuggestions && suggestions.length > 0 && (
                            <ul
                              ref={suggestionsRef}
                              className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-emerald-100 bg-white shadow-lg"
                            >
                              {suggestions.map((suggestion, index) => (
                                <li
                                  key={index}
                                  onClick={() => onSelectSuggestion(suggestion)}
                                  className="cursor-pointer px-4 py-2 text-sm text-[color:var(--ink)] hover:bg-emerald-50"
                                >
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={onCancelCreate}
                            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-[color:var(--muted)] hover:border-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[color:var(--accent-strong)]"
                          >
                            Create register
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-[color:var(--muted)]">
                          Capture your site address and begin tracking assets with audit-ready history, FY schedules,
                          and site plans.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreating(true);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="w-full rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[color:var(--accent-strong)]"
                        >
                          Create New Register
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section id="features" className="grid gap-6 lg:grid-cols-3">
                {[
                  {
                    title: "Site-plan first",
                    body: "Overlay room groups on uploaded plans and keep assets anchored to real spaces.",
                  },
                  {
                    title: "Versioned history",
                    body: "Every exemption or value change writes a new version so audits stay crisp.",
                  },
                  {
                    title: "FY ready schedules",
                    body: "Depreciation schedules roll forward with each version and effective date.",
                  },
                ].map((feature, idx) => (
                  <div
                    key={feature.title}
                    className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-sm animate-fade-up"
                    style={{ animationDelay: `${120 + idx * 120}ms` }}
                  >
                    <h3 className="font-['Fraunces'] text-2xl text-[color:var(--ink)]">{feature.title}</h3>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{feature.body}</p>
                  </div>
                ))}
              </section>
            </>
          )}

          {!isHomeView && (
            <section id="registers" className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Your portfolio</p>
                  <h2 className="font-['Fraunces'] text-3xl text-[color:var(--ink)]">Active registers</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onViewHome();
                    setIsCreating(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="rounded-full border border-emerald-200 bg-white/60 px-5 py-2 text-sm font-semibold text-[color:var(--ink)] hover:border-emerald-300"
                >
                  New register
                </button>
              </div>

              {isLoading && (
                <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-6 text-sm text-[color:var(--muted)]">
                  Loading registers...
                </div>
              )}

              {!isLoading && registers.length === 0 && (
                <div className="rounded-2xl border border-white/70 bg-white/70 px-6 py-6 text-sm text-[color:var(--muted)]">
                  No registers yet. Create your first register to start tracking assets.
                </div>
              )}

              {!isLoading && registers.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {registers.map((register, index) => {
                    const assetCount = getAssetCount(register);
                    const totalValue = getTotalValue(register);
                    const incompleteCount = getIncompleteCount(register);

                    return (
                      <div
                        key={register.id || index}
                        className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-[color:var(--ink)]">{register.address}</h3>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                                {assetCount} {assetCount === 1 ? "asset" : "assets"}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                {register.rooms.length} {register.rooms.length === 1 ? "group" : "groups"}
                              </span>
                              {totalValue > 0 && (
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                                  {formatCurrency(totalValue)}
                                </span>
                              )}
                              {incompleteCount > 0 && (
                                <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                                  {incompleteCount} incomplete
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => onEdit(index)}
                              className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[color:var(--accent-strong)]"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => handleDeleteClick(index)}
                              className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Register</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{registers[confirmDeleteIndex]?.address}"? 
              This will permanently delete all asset groups and assets within it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteIndex(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Results Modal */}
      <DepreciationModal
        showDepreciationModal={showDepreciationModal}
        depreciationResults={depreciationResults}
        financialYear={financialYear}
        onClose={onCloseDepreciationModal}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
