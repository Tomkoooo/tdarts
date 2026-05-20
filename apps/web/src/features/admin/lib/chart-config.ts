import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Admin theme colors matching globals.css
export const chartColors = {
  primary: '#ffb3b1',
  primaryContainer: '#ff535b',
  dartsRed: '#922210',
  accent: '#ff441f',
  success: '#2ecc71',
  warning: '#f39c12',
  error: '#ffb4ab',
  info: '#2563eb',
  surface: '#121317',
  surfaceElevated: '#2a2c32',
  surfaceContainer: '#1e1f23',
  onSurface: '#e3e2e7',
  onSurfaceVariant: '#e4bebc',
  outline: '#ab8987',
  outlineVariant: '#5b403f',
} as const;

// Default chart options for admin theme
export const defaultChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: chartColors.surfaceElevated,
      titleColor: chartColors.onSurface,
      bodyColor: chartColors.onSurfaceVariant,
      borderColor: chartColors.outlineVariant,
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        family: 'Space Grotesk',
        size: 13,
        weight: 600,
      },
      bodyFont: {
        family: 'Inter',
        size: 12,
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: chartColors.outlineVariant + '33',
        drawTicks: false,
      },
      border: {
        display: false,
      },
      ticks: {
        color: chartColors.onSurfaceVariant,
        font: {
          family: 'Inter',
          size: 11,
        },
        padding: 8,
      },
    },
    y: {
      grid: {
        color: chartColors.outlineVariant + '33',
        drawTicks: false,
      },
      border: {
        display: false,
      },
      ticks: {
        color: chartColors.onSurfaceVariant,
        font: {
          family: 'Inter',
          size: 11,
        },
        padding: 8,
      },
    },
  },
};

export const defaultBarOptions: ChartOptions<'bar'> = {
  ...defaultChartOptions,
  scales: {
    ...defaultChartOptions.scales,
  },
} as ChartOptions<'bar'>;

export const defaultDoughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: chartColors.onSurface,
        font: {
          family: 'Inter',
          size: 12,
        },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: chartColors.surfaceElevated,
      titleColor: chartColors.onSurface,
      bodyColor: chartColors.onSurfaceVariant,
      borderColor: chartColors.outlineVariant,
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  cutout: '65%',
};

// Helper to create gradient fills
export function createGradient(
  ctx: CanvasRenderingContext2D,
  color: string,
  opacity: number = 0.3
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, color + Math.round(opacity * 255).toString(16).padStart(2, '0'));
  gradient.addColorStop(1, color + '00');
  return gradient;
}
