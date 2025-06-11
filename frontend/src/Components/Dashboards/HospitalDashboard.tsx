import React, { useState } from 'react';
import {
  Box,
  Typography,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
  Select,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVert from '@mui/icons-material/MoreVert';
import { Cardiogram, HealthLiteracyOutline, Dollar } from 'healthicons-react';
import DashboardCard from './DashboardCard';

type SummaryGroup = {
  groupLabel: string
  icon: React.FC
  component: React.FC | null
}

const opacity = 0.7;
const horizontalItemGap = 1;

const costSavingsCards = [
  {
    title: 'Transfusion Costs Saved',
    value: '$525k',
    interval: 'Year to Date',
    trend: 'up',
    percentChange: 12,
    info: () => {},
  },
  {
    title: 'Complication Costs Avoided',
    value: '$84k',
    interval: 'Year to Date',
    trend: 'up',
    percentChange: 8,
    info: () => {},
  },
];
function CostSavingsDashboard() {
  const [interval, setInterval] = useState('Year to Date');
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        mt: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: horizontalItemGap,
      }}
    >
      {costSavingsCards.map((card) => (
        <DashboardCard key={card.title} {...card} />
      ))}
    </Box>
  );
}
const outcomeCards = [
  {
    title: 'Mean Length of Stay',
    value: '4.2 days',
    trend: 'down',
    trendColor: 'green',
    percentChange: -8,
    info: () => {},
  },
  {
    title: 'Complications Avoided',
    value: '120',
    interval: 'Year to Date',
    trend: 'up',
    percentChange: 15,
    info: () => {},
  },
  {
    title: 'Mean Hgb at Discharge',
    value: '9 g/dL',
    interval: 'Year to Date',
    trend: 'down',
    percentChange: 3,
    info: () => {},
  },
  {
    title: 'Readmission Percentage',
    value: '14.5%',
    interval: 'Year to Date',
    trend: 'up',
    percentChange: 8,
    info: () => {},
  },
];

function OutcomesDashboard() {
  const [interval, setInterval] = useState('Year to Date');
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        mt: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: horizontalItemGap,
      }}
    >
      {outcomeCards.map((card) => (
        <DashboardCard key={card.title} {...card} />
      ))}
    </Box>
  );
}

const adherenceCards = [
  {
    title: 'Provider Adherence RBC',
    value: '55%',
    interval: 'Year to Date',
    trend: 'up',
    percentChange: 35,
    info: () => {},
  },
  {
    title: 'Provider Adherence PLT',
    value: '65%',
    interval: 'Year to Date',
    trend: 'down',
    percentChange: 10,
    info: () => {},
  },
  {
    title: 'Provider Adherence FFP',
    value: '35%',
    interval: 'Year to Date',
    trend: 'up',
    percentChange: 45,
    info: () => {},
  },
];
function AdherenceDashboard() {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        mt: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: horizontalItemGap,
      }}
    >
      {adherenceCards.map((card) => (
        <DashboardCard key={card.title} {...card} />
      ))}
    </Box>
  );
}

const hospitalSummaryGroups: SummaryGroup[] = [
  { groupLabel: 'Costs & Savings', icon: Dollar, component: CostSavingsDashboard },
  { groupLabel: 'Patient Outcomes', icon: Cardiogram, component: OutcomesDashboard },
  { groupLabel: 'Guideline Adherence', icon: HealthLiteracyOutline, component: AdherenceDashboard },
];

function SummaryAccordionSection({ groupLabel, icon: Icon, component: Component }: SummaryGroupProps) {
  const [interval, setInterval] = useState<string>('Year to Date');
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <Accordion
      key={groupLabel}
      defaultExpanded
      square
      disableGutters
      sx={{
        width: '100%',
        boxShadow: 'none',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}
      >
        <Typography variant="h5" sx={{ opacity }}>
          {groupLabel}
        </Typography>
        <ListItemIcon
          sx={{
            opacity,
            minWidth: 0,
            ml: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon />
        </ListItemIcon>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
          sx={{
            opacity: 1,
            minWidth: 0,
            ml: 1,
            display: 'flex',
            alignItems: 'center',
            borderRadius: '50%', // make container circular
            p: 0.5, // add some padding
            transition: 'background-color 0.2s, opacity 0.2s',
            '&:hover': {
              backgroundColor: 'grey.100', // light grey on hover
            },
          }}
        >
          <MoreVert />
        </IconButton>
        <Select
          value={interval}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setInterval(e.target.value as string)}
          variant="standard"
          disableUnderline
          sx={{ mx: 1, fontStyle: 'italic', opacity: opacity + 0.2 }}
        >
          <MenuItem value="3 Months">3 Months</MenuItem>
          <MenuItem value="6 Months">6 Months</MenuItem>
          <MenuItem value="Year to Date">Year to Date</MenuItem>
          <MenuItem value="Two Years">Two Years</MenuItem>
          <MenuItem value="Three Years">Three Years</MenuItem>
          <MenuItem value="Five Years">Five Years</MenuItem>
        </Select>
      </AccordionSummary>
      <AccordionDetails>
        {Component && <Component />}
      </AccordionDetails>
    </Accordion>
  );
}

function HospitalDashboard(): JSX.Element {
  return (
    <>
      {hospitalSummaryGroups.map((group) => (
        <SummaryAccordionSection key={group.groupLabel} {...group} />
      ))}
    </>
  );
}

export default HospitalDashboard;
