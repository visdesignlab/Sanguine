import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTheme, alpha, darken } from '@mui/material/styles';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';

export type DashboardCardProps = {
  title: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  trendColor?: 'red' | 'green';
  percentChange: number
  info?: () => void
}
export default function DashboardCard({
  title,
  value,
  trend,
  trendColor,
  percentChange,
  info,
}: DashboardCardProps) {
  const theme = useTheme();

  // map your overrides to MUI colors
  const overrideMap = {
    red: theme.palette.error.main,
    green: theme.palette.success.main,
  };
  const defaultMap = {
    up: theme.palette.success.main,
    down: theme.palette.error.main,
    neutral: theme.palette.text.secondary,
  };

  // pick base color (override if you passed one)
  const baseColor = trendColor
    ? overrideMap[trendColor]
    : defaultMap[trend];

  // build your per-trend config
  const label = `${percentChange}%`;
  const bgColor = alpha(baseColor, 0.1);
  const valueColor = darken(baseColor, 0.2);

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'inline-block',
        verticalAlign: 'top',
        position: 'relative',
        '&:hover': {
          boxShadow: `0px 2px 4px ${alpha(theme.palette.success.main, 0.2)}`,
          backgroundColor: alpha(baseColor, 0.05),
        },
        pt: theme.spacing(1),
        '&:hover .infoButton': { opacity: 1 },
      }}
    >
      {info && (
        <IconButton
          className="infoButton"
          size="small"
          onClick={info}
          sx={{
            position: 'absolute',
            top: theme.spacing(1),
            right: theme.spacing(1),
            color: theme.palette.text.secondary,
            p: theme.spacing(0.5),
            width: theme.spacing(3),
            height: theme.spacing(3),
            backgroundColor: 'transparent',
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out',
            '&:hover': { backgroundColor: alpha(theme.palette.grey[400], 0.2) },
            '&:hover svg': { color: darken(theme.palette.text.secondary, 0.2) },
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: theme.typography.pxToRem(16) }} />
        </IconButton>
      )}
      <CardContent>
        <Stack direction="column" alignItems="center" spacing={0} sx={{ width: '100%' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="h4"
              component="p"
              sx={{
                // color only if you've overridden, else keep the original up-only styling
                color: valueColor,
              }}
            >
              {value}
            </Typography>
            <Chip
              size="small"
              icon={
                trend !== 'neutral' ? (
                  trend === 'up' ? (
                    <TrendingUp fontSize="small" style={{ fill: baseColor }} />
                  ) : (
                    <TrendingDown fontSize="small" style={{ fill: baseColor }} />
                  )
                ) : undefined
              }
              label={label}
              sx={{
                alignItems: 'center',
                color: baseColor,
                backgroundColor: bgColor,
                fontStyle: 'italic',
              }}
            />
          </Stack>

          <Typography component="h2" variant="subtitle2">
            {title}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
