/**
 * custom-metrics — Plugin de Métricas DORA para Backstage
 *
 * Métricas DORA (DevOps Research & Assessment):
 *   1. Deployment Frequency       — frequência de deploys para produção
 *   2. Lead Time for Changes      — tempo do commit ao deploy em produção
 *   3. Mean Time to Restore (MTTR)— tempo médio para restaurar serviço após incidente
 *   4. Change Failure Rate        — % de deploys que causam incidente
 */

import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { DoraMetricsApiClient, doraMetricsApiRef } from './api';
import { rootRouteRef } from './routes';

export const customMetricsPlugin = createPlugin({
  id: 'custom-metrics',
  apis: [
    createApiFactory({
      api: doraMetricsApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new DoraMetricsApiClient({ discoveryApi, fetchApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

// Página principal de métricas DORA
export const DoraMetricsPage = customMetricsPlugin.provide(
  createRoutableExtension({
    name: 'DoraMetricsPage',
    component: () =>
      import('./components/DoraMetricsPage').then(m => m.DoraMetricsPage),
    mountPoint: rootRouteRef,
  }),
);

// Card para o entity overview
export const DoraMetricsCard = customMetricsPlugin.provide(
  createRoutableExtension({
    name: 'DoraMetricsCard',
    component: () =>
      import('./components/DoraMetricsCard').then(m => m.DoraMetricsCard),
    mountPoint: rootRouteRef,
  }),
);
