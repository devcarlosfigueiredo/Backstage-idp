/**
 * DoraMetricsCard — Card de Métricas DORA para o entity overview
 * Exibe as 4 métricas DORA com rating e tendência, integrado com Prometheus.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Chip,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import TrendingDownIcon from '@material-ui/icons/TrendingDown';
import TrendingFlatIcon from '@material-ui/icons/TrendingFlat';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { doraMetricsApiRef, DoraMetrics, DoraRating } from '../api';

const useStyles = makeStyles(theme => ({
  metricCard: {
    padding: theme.spacing(2),
    textAlign: 'center',
    background: theme.palette.type === 'dark'
      ? theme.palette.grey[800]
      : theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  ratingChip: {
    marginTop: theme.spacing(1),
  },
  trendIcon: {
    verticalAlign: 'middle',
    marginLeft: theme.spacing(0.5),
  },
  eliteChip: { backgroundColor: '#22c55e', color: 'white' },
  highChip: { backgroundColor: '#3b82f6', color: 'white' },
  mediumChip: { backgroundColor: '#f59e0b', color: 'white' },
  lowChip: { backgroundColor: '#ef4444', color: 'white' },
}));

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  trend: 'improving' | 'stable' | 'degrading';
  tooltip: string;
  rating: DoraRating;
}

const RATING_LABELS: Record<DoraRating, string> = {
  elite: '⭐ Elite',
  high: '🟢 High',
  medium: '🟡 Medium',
  low: '🔴 Low',
};

const DORA_DESCRIPTIONS = {
  deploymentFrequency: 'Com que frequência a equipa faz deploy para produção',
  leadTime: 'Tempo do commit ao deploy em produção',
  mttr: 'Tempo médio para restaurar serviço após incidente',
  changeFailureRate: '% de deploys que causam incidente ou rollback',
};

function MetricCard({ title, value, unit, trend, tooltip, rating }: MetricCardProps) {
  const classes = useStyles();

  const TrendIcon = trend === 'improving'
    ? TrendingUpIcon
    : trend === 'degrading'
    ? TrendingDownIcon
    : TrendingFlatIcon;

  const trendColor = trend === 'improving'
    ? '#22c55e'
    : trend === 'degrading'
    ? '#ef4444'
    : '#94a3b8';

  const ratingClass = {
    elite: classes.eliteChip,
    high: classes.highChip,
    medium: classes.mediumChip,
    low: classes.lowChip,
  }[rating];

  return (
    <Tooltip title={tooltip} placement="top">
      <Box className={classes.metricCard}>
        <Typography variant="caption" color="textSecondary">
          {title}
        </Typography>
        <Typography className={classes.metricValue}>
          {value}
          <TrendIcon
            className={classes.trendIcon}
            style={{ color: trendColor, fontSize: '1.2rem' }}
          />
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {unit}
        </Typography>
        <br />
        <Chip
          label={RATING_LABELS[rating]}
          size="small"
          className={`${classes.ratingChip} ${ratingClass}`}
        />
      </Box>
    </Tooltip>
  );
}

export function DoraMetricsCard() {
  const classes = useStyles();
  const { entity } = useEntity();
  const doraApi = useApi(doraMetricsApiRef);
  const [metrics, setMetrics] = useState<DoraMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const serviceId = entity.metadata.name;

  useEffect(() => {
    setLoading(true);
    doraApi
      .getMetrics(serviceId, period)
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [serviceId, period, doraApi]);

  if (loading) {
    return (
      <Card>
        <CardContent style={{ textAlign: 'center', padding: 40 }}>
          <CircularProgress />
          <Typography variant="body2" style={{ marginTop: 16 }}>
            A carregar métricas DORA...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">
            ⚠️ Erro ao carregar métricas: {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const overallRating = metrics.rating;
  const ratingClass = {
    elite: classes.eliteChip,
    high: classes.highChip,
    medium: classes.mediumChip,
    low: classes.lowChip,
  }[overallRating];

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">📊 DORA Metrics</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={`Rating: ${RATING_LABELS[overallRating]}`}
                className={ratingClass}
              />
              <FormControl size="small" variant="outlined">
                <InputLabel>Período</InputLabel>
                <Select
                  value={period}
                  onChange={e => setPeriod(e.target.value as '7d' | '30d' | '90d')}
                  label="Período"
                >
                  <MenuItem value="7d">7 dias</MenuItem>
                  <MenuItem value="30d">30 dias</MenuItem>
                  <MenuItem value="90d">90 dias</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Deployment Frequency"
              value={metrics.deploymentFrequency.value.toFixed(1)}
              unit={`deploys/${metrics.deploymentFrequency.unit.replace('per_', '')}`}
              trend={metrics.deploymentFrequency.trend}
              tooltip={DORA_DESCRIPTIONS.deploymentFrequency}
              rating={overallRating}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Lead Time for Changes"
              value={metrics.leadTimeForChanges.value < 1
                ? `${Math.round(metrics.leadTimeForChanges.value * 60)}min`
                : `${metrics.leadTimeForChanges.value.toFixed(1)}h`}
              unit="commit → produção"
              trend={metrics.leadTimeForChanges.trend}
              tooltip={DORA_DESCRIPTIONS.leadTime}
              rating={overallRating}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="MTTR"
              value={metrics.meanTimeToRestore.value < 60
                ? `${Math.round(metrics.meanTimeToRestore.value)}min`
                : `${(metrics.meanTimeToRestore.value / 60).toFixed(1)}h`}
              unit="tempo para restaurar"
              trend={metrics.meanTimeToRestore.trend}
              tooltip={DORA_DESCRIPTIONS.mttr}
              rating={overallRating}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Change Failure Rate"
              value={`${metrics.changeFailureRate.value.toFixed(1)}%`}
              unit="deploys com incidente"
              trend={metrics.changeFailureRate.trend}
              tooltip={DORA_DESCRIPTIONS.changeFailureRate}
              rating={overallRating}
            />
          </Grid>
        </Grid>

        {/* Legenda dos ratings */}
        <Box mt={3} p={2} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="caption" color="textSecondary">
            <strong>DORA Performance Levels:</strong>{' '}
            ⭐ Elite (top 5%) → 🟢 High → 🟡 Medium → 🔴 Low
            {' | '}
            Setas: ↑ melhorando · → estável · ↓ a piorar
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
