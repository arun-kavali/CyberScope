import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { TrendingUp, ShieldAlert, Target, Award } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Operational Security Analytics & Gap Engine"
        subtitle="Execution gaps, negative space visibility, detection coverage, and peer benchmarking"
        phaseBadge="Analytics Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Analytics' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="MITRE ATT&CK Coverage"
          value="78.4%"
          change="92 Techniques Covered"
          changeType="positive"
          icon={Target}
          accentColor="green"
        />
        <MetricCard
          title="Detection Execution Gap"
          value="4.2%"
          change="3 Unmapped Telemetry Vectors"
          changeType="neutral"
          icon={ShieldAlert}
          accentColor="green"
        />
        <MetricCard
          title="Negative Space Coverage"
          value="91.6%"
          change="Validated Against False Negatives"
          changeType="positive"
          icon={TrendingUp}
          accentColor="green"
        />
        <MetricCard
          title="Peer Benchmark Percentile"
          value="89th"
          change="Top Decile SOC Efficacy"
          changeType="positive"
          icon={Award}
          accentColor="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Detection Efficacy Breakdown" subtitle="Deterministic Rules vs ML Anomaly Signals" headerStyle="green">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded">
              <span className="font-semibold text-slate-800">Rule-Based Deterministic Detection</span>
              <span className="font-mono font-bold text-emerald-700">99.4% Precision</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded">
              <span className="font-semibold text-slate-800">Phase 11 ML Statistical Anomaly Signal</span>
              <span className="font-mono font-bold text-brand-700">92.1% Recall</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded">
              <span className="font-semibold text-slate-800">Phase 14 Ollama AI Investigation Context</span>
              <span className="font-mono font-bold text-emerald-700">Local Execution (0ms network)</span>
            </div>
          </div>
        </Card>

        <Card title="Operational Performance Benchmark" subtitle="Mean Time to Detect (MTTD) & Triage (MTTT)" headerStyle="default">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded font-mono">
              <span className="text-slate-600">Mean Time to Ingest (MTTI):</span>
              <span className="font-bold text-slate-900">&lt; 150 ms</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded font-mono">
              <span className="text-slate-600">Mean Time to Triage (MTTT):</span>
              <span className="font-bold text-emerald-700">&lt; 1.2 sec</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded font-mono">
              <span className="text-slate-600">Correlation Engine Latency:</span>
              <span className="font-bold text-slate-900">&lt; 400 ms</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

