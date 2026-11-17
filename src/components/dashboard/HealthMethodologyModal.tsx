import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { X, BookOpen, ShieldCheck, AlertTriangle, Calculator, CheckCircle2 } from 'lucide-react';

interface HealthMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: P6HealthCheckDashboardData;
}

export const HealthMethodologyModal: React.FC<HealthMethodologyModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  const { scoring } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Programme Health Score, Rating Bands &amp; Parameter Definitions Guide
              </h2>
              <p className="text-[11px] text-slate-300">
                Complete interpretation of the 54-Parameter Assessment Framework &amp; Schedule Quality Indices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* 1. Overall Health Score Formula */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-sky-500" />
              1. How Overall Health Score ({scoring.overallHealthScorePct.toFixed(1)}%) Is Calculated
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <p>
                Every programme is evaluated across <strong>54 deterministic checks</strong> grouped into two weighted pillars totalling <strong>100.00 applicable units</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Criteria A — Primavera P6 Settings (20.0 units · 15 parameters A01–A15):</strong> Verifies calculation preferences, scheduling mode, relationship lag calendars, calendar consistency, and float definitions inside the XER.
                </li>
                <li>
                  <strong>Criteria B — Schedule Quality &amp; Logic Integrity (80.0 units · 39 parameters B01–B39):</strong> Audits logic ties, lags/leads, hard constraints, total float integrity, critical path realism, baseline progress accuracy, resource loading, and WBS structure.
                </li>
                <li>
                  <strong>Weighting Multiplier:</strong> <strong>Critical-Key items (20 checks)</strong> carry a <strong>2.0× weight</strong> (1.82 units in Criteria A, 3.08 units in Criteria B). Standard items carry a <strong>1.0× weight</strong> (0.91 units in Criteria A, 1.54 units in Criteria B).
                </li>
                <li>
                  <strong>Parameter Scoring States:</strong> <span className="font-semibold text-emerald-600 dark:text-emerald-400">Pass = 100%</span> of allotted units earned · <span className="font-semibold text-amber-600 dark:text-amber-400">Warning = 50%</span> · <span className="font-semibold text-rose-600 dark:text-rose-400">Fail = 0%</span> · <span className="font-semibold text-slate-500">N/A</span> parameters are excluded from the applicable denominator so Baseline schedules are not penalized for update-only checks.
                </li>
              </ul>
              <div className="pt-2 font-mono text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                Overall Health Score (%) = (Total Units Earned [{scoring.totalUnitsEarned.toFixed(2)}] ÷ Total Applicable Units [{scoring.totalApplicableUnits.toFixed(2)}]) × 100 = <strong>{scoring.overallHealthScorePct.toFixed(1)}%</strong>
              </div>
            </div>
          </section>

          {/* 2. Health Rating & Critical-Key Gate */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              2. Health Rating Bands &amp; Critical-Key Gate Rule
            </h3>
            <p>
              The <strong>Health Rating ({scoring.healthRating})</strong> combines the numerical Overall Health Score with the <strong>Mandatory Critical-Key Gate</strong>. If any Critical-Key parameter scores Warning or Fail, the rating is automatically capped at <strong>AT RISK</strong> even if the numeric percentage exceeds 85%.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-900 dark:text-emerald-300">HEALTHY (≥ 85.0% + Gate Passed)</div>
                <p className="text-[11px] mt-1">
                  All 20 Critical-Key parameters pass and overall weighted score is 85% or above. Programme is compliant for formal contractual submission.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <div className="font-bold text-sky-900 dark:text-sky-300">ACCEPTABLE (70.0% – 84.9% + Gate Passed)</div>
                <p className="text-[11px] mt-1">
                  All Critical-Key gates pass; minor non-critical deficiencies exist and should be addressed via routine comments.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="font-bold text-amber-900 dark:text-amber-300">AT RISK (50.0% – 69.9% OR Gate Failed)</div>
                <p className="text-[11px] mt-1">
                  Triggered when score is 50–69.9%, OR when any Critical-Key item fails/warns (e.g., open ends, circular logic, hard constraints, negative float). Requires Recheck &amp; Resubmit.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <div className="font-bold text-rose-900 dark:text-rose-300">CRITICAL (&lt; 50.0%)</div>
                <p className="text-[11px] mt-1">
                  Severe structural flaws in CPM logic, durations, or update integrity. Unsuitable for project forecasting or Extension of Time (EOT) evaluation.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Contractual & Schedule Terms */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              3. Key Schedule &amp; Contractual Parameter Definitions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  term: 'Scheduled Finish vs Must Finish By',
                  def: 'Scheduled Finish reflects the actual CPM F9 calculated completion date (Primavera scd_end_date / latest activity finish). Must Finish By (plan_end_date) is only a project constraint ceiling.',
                },
                {
                  term: 'Longest Path vs Subsequent Paths',
                  def: 'Path #1 (Primary Longest Path) is the continuous driving chain from Project Start to Scheduled Finish. Subsequent Paths (#2, #3...) identify secondary near-critical branches and their float gap to Primary.',
                },
                {
                  term: 'Backward Path Trace',
                  def: 'Walks predecessor relationships backward from any selected Contractual Milestone or activity to project start, revealing driving links, open-start risks, and hard date constraints.',
                },
                {
                  term: 'FS Density & Relationship Types',
                  def: 'Measures average Finish-to-Start logic links per task (target ~1.0–1.5) and ensures >90% Finish-to-Start (FS) logic vs riskier SS/FF/SF shortcuts.',
                },
                {
                  term: 'Critical Path Ratio & Float Health',
                  def: 'Healthy schedules maintain ~10–20% critical activities (TF ≤ 0d). Excess critical paths (>25%) suggest artificial constraints; excessive high float (>44d) signals missing successor logic.',
                },
                {
                  term: 'DCMA 14-Point Assessment',
                  def: 'Defense Contract Management Agency standard evaluating Logic, Leads, Lags, Relationships, Hard Constraints, High Float, Negative Float, High Duration, Invalid Dates, Resources, Missed Tasks, CPLI & BEI.',
                },
              ].map((item) => (
                <div
                  key={item.term}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <div className="font-bold text-slate-900 dark:text-slate-100">{item.term}</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{item.def}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-[11px] text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Tip: Click any KPI card, deficiency row, or <strong>"Go to Section &rarr;"</strong> button inside the 54-Parameter Checklist to jump straight to the underlying activities, calendars, or paths.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
