import { createApiRef, DiscoveryApi, FetchApi, IdentityApi } from '@backstage/core-plugin-api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ServiceCost {
  serviceId: string;
  teamId: string;
  period: CostPeriod;
  currentCost: CostBreakdown;
  previousCost: CostBreakdown;
  trend: number;            // % variação vs período anterior
  budget?: BudgetInfo;
  topCostDrivers: CostDriver[];
}

export interface CostBreakdown {
  total: number;            // USD
  currency: string;
  compute: number;
  storage: number;
  network: number;
  database: number;
  other: number;
  daily: DailyCost[];
}

export interface DailyCost {
  date: string;             // YYYY-MM-DD
  amount: number;
}

export interface BudgetInfo {
  monthly: number;          // USD orçamento mensal
  used: number;             // USD gasto até agora
  remaining: number;
  forecastedMonthly: number;
  isOverBudget: boolean;
}

export interface CostDriver {
  name: string;
  service: string;          // ex: "EC2", "RDS", "S3"
  cost: number;
  percentage: number;
}

export interface CostPeriod {
  startDate: string;
  endDate: string;
  label: string;            // ex: "Outubro 2025"
}

export interface TeamCostSummary {
  teamId: string;
  teamName: string;
  totalCost: number;
  services: { name: string; cost: number }[];
  trend: number;
}

// ─── API Ref ──────────────────────────────────────────────────────────────────

export const costInsightsApiRef = createApiRef<CostInsightsApi>({
  id: 'plugin.cost-insights.service',
});

export interface CostInsightsApi {
  getServiceCost(serviceId: string, months?: number): Promise<ServiceCost>;
  getTeamCosts(teamId: string, months?: number): Promise<TeamCostSummary>;
  getOrganizationCosts(months?: number): Promise<TeamCostSummary[]>;
  getUserCosts(months?: number): Promise<ServiceCost[]>;
}

// ─── Implementação ────────────────────────────────────────────────────────────

export class CostInsightsApiClient implements CostInsightsApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
      identityApi: IdentityApi;
    },
  ) {}

  private async getBaseUrl(): Promise<string> {
    return this.options.discoveryApi.getBaseUrl('cost-insights');
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { token } = await this.options.identityApi.getCredentials();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getServiceCost(serviceId: string, months = 1): Promise<ServiceCost> {
    const [baseUrl, headers] = await Promise.all([
      this.getBaseUrl(),
      this.getAuthHeaders(),
    ]);

    const response = await this.options.fetchApi.fetch(
      `${baseUrl}/costs/service/${serviceId}?months=${months}`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Erro ao obter custos para ${serviceId}: ${response.statusText}`);
    }

    return response.json();
  }

  async getTeamCosts(teamId: string, months = 1): Promise<TeamCostSummary> {
    const [baseUrl, headers] = await Promise.all([
      this.getBaseUrl(),
      this.getAuthHeaders(),
    ]);

    const response = await this.options.fetchApi.fetch(
      `${baseUrl}/costs/team/${teamId}?months=${months}`,
      { headers },
    );

    return response.json();
  }

  async getOrganizationCosts(months = 1): Promise<TeamCostSummary[]> {
    const [baseUrl, headers] = await Promise.all([
      this.getBaseUrl(),
      this.getAuthHeaders(),
    ]);

    const response = await this.options.fetchApi.fetch(
      `${baseUrl}/costs/organization?months=${months}`,
      { headers },
    );

    return response.json();
  }

  async getUserCosts(months = 1): Promise<ServiceCost[]> {
    const [baseUrl, headers] = await Promise.all([
      this.getBaseUrl(),
      this.getAuthHeaders(),
    ]);

    const response = await this.options.fetchApi.fetch(
      `${baseUrl}/costs/me?months=${months}`,
      { headers },
    );

    return response.json();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCost(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCostTrendColor(trend: number): string {
  if (trend > 10) return '#ef4444';   // vermelho: subida > 10%
  if (trend > 0) return '#f59e0b';    // amarelo: subida ligeira
  if (trend < 0) return '#22c55e';    // verde: descida (bom)
  return '#94a3b8';                   // cinza: estável
}

export function getCostTrendLabel(trend: number): string {
  if (trend === 0) return 'estável';
  const direction = trend > 0 ? '▲' : '▼';
  return `${direction} ${Math.abs(trend).toFixed(1)}% vs mês anterior`;
}
