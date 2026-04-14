import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DoraMetrics {
  serviceId: string;
  period: '7d' | '30d' | '90d';
  deploymentFrequency: DeploymentFrequency;
  leadTimeForChanges: LeadTimeForChanges;
  meanTimeToRestore: MeanTimeToRestore;
  changeFailureRate: ChangeFailureRate;
  rating: DoraRating;
}

export interface DeploymentFrequency {
  value: number;
  unit: 'per_day' | 'per_week' | 'per_month';
  trend: 'improving' | 'stable' | 'degrading';
  eliteThreshold: number;   // > 1/dia → Elite
}

export interface LeadTimeForChanges {
  value: number;             // em horas
  trend: 'improving' | 'stable' | 'degrading';
  eliteThreshold: number;   // < 1h → Elite
}

export interface MeanTimeToRestore {
  value: number;             // em minutos
  trend: 'improving' | 'stable' | 'degrading';
  eliteThreshold: number;   // < 1h → Elite
  incidents: Incident[];
}

export interface ChangeFailureRate {
  value: number;             // percentagem (0-100)
  trend: 'improving' | 'stable' | 'degrading';
  eliteThreshold: number;   // < 5% → Elite
}

export interface Incident {
  id: string;
  startedAt: string;
  resolvedAt: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
}

export type DoraRating = 'elite' | 'high' | 'medium' | 'low';

// ─── API Ref ──────────────────────────────────────────────────────────────────

export const doraMetricsApiRef = createApiRef<DoraMetricsApi>({
  id: 'plugin.dora-metrics.service',
});

export interface DoraMetricsApi {
  getMetrics(serviceId: string, period?: '7d' | '30d' | '90d'): Promise<DoraMetrics>;
  getOrganizationMetrics(period?: '7d' | '30d' | '90d'): Promise<DoraMetrics[]>;
}

// ─── Implementação ────────────────────────────────────────────────────────────

export class DoraMetricsApiClient implements DoraMetricsApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async getBaseUrl(): Promise<string> {
    return await this.discoveryApi.getBaseUrl('custom-metrics');
  }

  async getMetrics(
    serviceId: string,
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<DoraMetrics> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/dora/${serviceId}?period=${period}`,
    );

    if (!response.ok) {
      throw new Error(`Falha ao obter métricas DORA para ${serviceId}: ${response.statusText}`);
    }

    return response.json();
  }

  async getOrganizationMetrics(
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<DoraMetrics[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/dora?period=${period}`,
    );

    if (!response.ok) {
      throw new Error(`Falha ao obter métricas da organização: ${response.statusText}`);
    }

    return response.json();
  }
}

// ─── Calculadora de Rating DORA ───────────────────────────────────────────────

export function calculateDoraRating(metrics: DoraMetrics): DoraRating {
  const scores = {
    deploymentFrequency: scoreDeploymentFrequency(metrics.deploymentFrequency.value),
    leadTime: scoreLeadTime(metrics.leadTimeForChanges.value),
    mttr: scoreMttr(metrics.meanTimeToRestore.value),
    changeFailureRate: scoreCfr(metrics.changeFailureRate.value),
  };

  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;

  if (avgScore >= 3.5) return 'elite';
  if (avgScore >= 2.5) return 'high';
  if (avgScore >= 1.5) return 'medium';
  return 'low';
}

function scoreDeploymentFrequency(deploysPerDay: number): number {
  if (deploysPerDay >= 1) return 4;      // Elite: múltiplos por dia
  if (deploysPerDay >= 1/7) return 3;   // High: semanal
  if (deploysPerDay >= 1/30) return 2;  // Medium: mensal
  return 1;                              // Low: menos que mensal
}

function scoreLeadTime(hours: number): number {
  if (hours < 1) return 4;    // Elite: < 1h
  if (hours < 24) return 3;   // High: < 1 dia
  if (hours < 168) return 2;  // Medium: < 1 semana
  return 1;                    // Low: > 1 semana
}

function scoreMttr(minutes: number): number {
  if (minutes < 60) return 4;    // Elite: < 1h
  if (minutes < 1440) return 3;  // High: < 1 dia
  if (minutes < 10080) return 2; // Medium: < 1 semana
  return 1;                       // Low: > 1 semana
}

function scoreCfr(percentage: number): number {
  if (percentage < 5) return 4;   // Elite: < 5%
  if (percentage < 10) return 3;  // High: 10-15%
  if (percentage < 15) return 2;  // Medium: 15-30%
  return 1;                        // Low: > 30%
}
