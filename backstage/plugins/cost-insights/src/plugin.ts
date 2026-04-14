/**
 * cost-insights — Plugin de Cost Insights para Backstage
 *
 * Integra com AWS Cost Explorer para mostrar custos por serviço/equipa
 * directamente no Software Catalog.
 */

import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { CostInsightsApiClient, costInsightsApiRef } from './api';
import { rootRouteRef } from './routes';

export const costInsightsPlugin = createPlugin({
  id: 'cost-insights',
  apis: [
    createApiFactory({
      api: costInsightsApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        identityApi: identityApiRef,
      },
      factory: ({ discoveryApi, fetchApi, identityApi }) =>
        new CostInsightsApiClient({ discoveryApi, fetchApi, identityApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

// Página principal de custos (dashboard da organização)
export const CostInsightsPage = costInsightsPlugin.provide(
  createRoutableExtension({
    name: 'CostInsightsPage',
    component: () =>
      import('./components/CostInsightsPage').then(m => m.CostInsightsPage),
    mountPoint: rootRouteRef,
  }),
);

// Card de custo para o entity overview (por serviço)
export const EntityCostInsightsCard = costInsightsPlugin.provide(
  createRoutableExtension({
    name: 'EntityCostInsightsCard',
    component: () =>
      import('./components/EntityCostInsightsCard').then(m => m.EntityCostInsightsCard),
    mountPoint: rootRouteRef,
  }),
);
