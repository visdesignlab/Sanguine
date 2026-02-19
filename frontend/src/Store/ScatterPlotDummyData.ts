import { ScatterPlotData, LabResult, BloodComponent } from '../Types/application';

// Reference Lines Configuration
export const SCATTER_PLOT_REFERENCE_LINES: Record<string, { value: number; label: string; color: string; direction: 'x' | 'y'; maxAdjustment?: number }[]> = {
    post_op_hgb: [
        { value: 7, label: 'Restrictive Trigger: 7 g/dL', color: '#22c55e', direction: 'y', maxAdjustment: 0.5 },
        { value: 10, label: 'Upper Limit for Intervention: 10 g/dL', color: '#f59e0b', direction: 'y', maxAdjustment: 0.5 },
    ],
    pre_op_hgb: [
        { value: 13, label: 'Optimization Target: 13 g/dL', color: '#22c55e', direction: 'y' },
        { value: 10, label: 'High-Risk Threshold: 10 g/dL', color: '#f59e0b', direction: 'y' },
    ],
    rbc_units: [
        { value: 2, label: 'Guideline: 2 units', color: '#22c55e', direction: 'y' },
    ],
    ffp_units: [
        { value: 2, label: 'Guideline: 2 units', color: '#22c55e', direction: 'y' },
    ],
    plt_units: [
        { value: 1, label: 'Guideline: 1 unit', color: '#22c55e', direction: 'y' },
    ],
    cell_saver_ml: [
        { value: 250, label: 'Optimal: 250 mL', color: '#22c55e', direction: 'x' },
    ],
};

// Helper function to generate random data points
const generateScatterData = (
    xVar: BloodComponent,
    yVar: LabResult,
    seriesName: string,
    color: string,
    numPoints: number = 200,
): { [key: string]: number }[] => {
    const data: { [key: string]: number }[] = [];

    // Determine x-axis range based on variable
    const isCellSaver = xVar === 'cell_saver_ml';
    const xMax = isCellSaver ? 400 : 20;
    const xMin = 0;

    // Y-axis range for hemoglobin
    // (Default is post-op, check strings)
    const isPreOp = yVar === 'pre_op_hgb';
    const yMin = isPreOp ? 10 : 7;
    const yMax = isPreOp ? 17 : 13;

    for (let i = 0; i < numPoints; i++) {
        const x = xMin + (Math.random() * (xMax - xMin));
        // Negative correlation: higher x = lower y (with some noise)
        const baseY = yMax - ((x / xMax) * (yMax - yMin));
        const y = baseY + (Math.random() - 0.5) * 4.5;

        // Generate other random attributes for grouping
        // Random boolean outcomes (0 or 1)
        const ecmo = Math.random() > 0.9 ? 1 : 0; // 10% chance
        const death = Math.random() > 0.95 ? 1 : 0; // 5% chance
        const vent = Math.random() > 0.8 ? 1 : 0;
        const stroke = Math.random() > 0.98 ? 1 : 0;

        // Random blood product usage
        const rbc_units = Math.floor(Math.random() * 5);
        const ffp_units = Math.floor(Math.random() * 5);
        const plt_units = Math.floor(Math.random() * 3);
        const cryo_units = Math.floor(Math.random() * 3);
        const cell_saver_ml = Math.floor(Math.random() * 500);

        // Random costs
        const total_blood_product_cost = Math.floor(Math.random() * 2000);
        const case_mix_index = 0.5 + Math.random(); // 0.5 to 1.5

        // Random length of stay
        const los = Math.floor(Math.random() * 15);

        // Guideline adherence (0 or 1)
        const ffp_adherent = Math.random() > 0.5 ? 1 : 0;

        // Base Point
        const basePoint: Record<string, number> = {
            // Default randoms for everything
            ecmo, death, vent, stroke,
            rbc_units, ffp_units, plt_units, cryo_units, cell_saver_ml,
            total_blood_product_cost, case_mix_index, los, ffp_adherent,
        };

        // Override with the correlated x/y values
        basePoint[xVar as string] = Math.round(x * 10) / 10;
        basePoint[yVar as string] = Math.max(yMin, Math.min(yMax, Math.round(y * 10) / 10));

        data.push(basePoint);
    }

    return data;
};

// Generate dummy data for all scatter plot combinations
export const SCATTER_PLOT_DUMMY_DATA: Record<string, ScatterPlotData> = {
    // RBC Units vs Post-op Hemoglobin
    sum_post_op_hgb_rbc_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('rbc_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('rbc_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('rbc_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],
    avg_post_op_hgb_rbc_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('rbc_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('rbc_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('rbc_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],

    // FFP Units vs Post-op Hemoglobin
    sum_post_op_hgb_ffp_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('ffp_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('ffp_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('ffp_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],
    avg_post_op_hgb_ffp_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('ffp_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('ffp_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('ffp_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],

    // Platelet Units vs Post-op Hemoglobin
    sum_post_op_hgb_plt_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('plt_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('plt_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('plt_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],
    avg_post_op_hgb_plt_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('plt_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('plt_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('plt_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],

    // Cryo Units vs Post-op Hemoglobin
    sum_post_op_hgb_cryo_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('cryo_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('cryo_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('cryo_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],
    avg_post_op_hgb_cryo_units: [
        {
            name: 'Surgeon A',
            color: '#1770B8',
            data: generateScatterData('cryo_units', 'post_op_hgb', 'Surgeon A', '#1770B8'),
        },
        {
            name: 'Surgeon B',
            color: '#EF2026',
            data: generateScatterData('cryo_units', 'post_op_hgb', 'Surgeon B', '#EF2026'),
        },
        {
            name: 'Surgeon C',
            color: '#897BD3',
            data: generateScatterData('cryo_units', 'post_op_hgb', 'Surgeon C', '#897BD3'),
        },
    ],

    // Cell Salvage Volume vs Post-op Hemoglobin
    sum_post_op_hgb_cell_saver_ml: [
        {
            name: 'Anesth 101',
            color: '#1770B8',
            data: [
                { cell_saver_ml: 50, post_op_hgb: 11.2 },
                { cell_saver_ml: 120, post_op_hgb: 10.8 },
                { cell_saver_ml: 180, post_op_hgb: 10.5 },
                { cell_saver_ml: 240, post_op_hgb: 10.1 },
                { cell_saver_ml: 310, post_op_hgb: 9.7 },
                { cell_saver_ml: 400, post_op_hgb: 9.4 },
            ],
        },
        {
            name: 'Anesth 204',
            color: '#EF2026',
            data: [
                { cell_saver_ml: 40, post_op_hgb: 12.0 },
                { cell_saver_ml: 90, post_op_hgb: 11.6 },
                { cell_saver_ml: 150, post_op_hgb: 11.1 },
                { cell_saver_ml: 200, post_op_hgb: 10.9 },
                { cell_saver_ml: 270, post_op_hgb: 10.2 },
                { cell_saver_ml: 350, post_op_hgb: 9.9 },
            ],
        },
        {
            name: 'Anesth 317',
            color: '#897BD3',
            data: [
                { cell_saver_ml: 30, post_op_hgb: 12.5 },
                { cell_saver_ml: 70, post_op_hgb: 12.1 },
                { cell_saver_ml: 110, post_op_hgb: 11.7 },
                { cell_saver_ml: 160, post_op_hgb: 11.3 },
                { cell_saver_ml: 220, post_op_hgb: 10.8 },
                { cell_saver_ml: 300, post_op_hgb: 10.4 },
            ],
        },
    ],
    avg_post_op_hgb_cell_saver_ml: [
        {
            name: 'Anesth 101',
            color: '#1770B8',
            data: [
                { cell_saver_ml: 50, post_op_hgb: 11.2 },
                { cell_saver_ml: 120, post_op_hgb: 10.8 },
                { cell_saver_ml: 180, post_op_hgb: 10.5 },
                { cell_saver_ml: 240, post_op_hgb: 10.1 },
                { cell_saver_ml: 310, post_op_hgb: 9.7 },
                { cell_saver_ml: 400, post_op_hgb: 9.4 },
            ],
        },
        {
            name: 'Anesth 204',
            color: '#EF2026',
            data: [
                { cell_saver_ml: 40, post_op_hgb: 12.0 },
                { cell_saver_ml: 90, post_op_hgb: 11.6 },
                { cell_saver_ml: 150, post_op_hgb: 11.1 },
                { cell_saver_ml: 200, post_op_hgb: 10.9 },
                { cell_saver_ml: 270, post_op_hgb: 10.2 },
                { cell_saver_ml: 350, post_op_hgb: 9.9 },
            ],
        },
        {
            name: 'Anesth 317',
            color: '#897BD3',
            data: [
                { cell_saver_ml: 30, post_op_hgb: 12.5 },
                { cell_saver_ml: 70, post_op_hgb: 12.1 },
                { cell_saver_ml: 110, post_op_hgb: 11.7 },
                { cell_saver_ml: 160, post_op_hgb: 11.3 },
                { cell_saver_ml: 220, post_op_hgb: 10.8 },
                { cell_saver_ml: 300, post_op_hgb: 10.4 },
            ],
        },
    ],
    // Pre-op Hemoglobin Data
    // RBC Units vs Pre-op Hemoglobin
    sum_pre_op_hgb_rbc_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('rbc_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('rbc_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('rbc_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    avg_pre_op_hgb_rbc_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('rbc_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('rbc_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('rbc_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    // FFP Units vs Pre-op Hemoglobin
    sum_pre_op_hgb_ffp_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('ffp_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('ffp_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('ffp_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    avg_pre_op_hgb_ffp_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('ffp_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('ffp_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('ffp_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    // Platelet Units vs Pre-op Hemoglobin
    sum_pre_op_hgb_plt_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('plt_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('plt_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('plt_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    avg_pre_op_hgb_plt_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('plt_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('plt_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('plt_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    // Cryo Units vs Pre-op Hemoglobin
    sum_pre_op_hgb_cryo_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('cryo_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('cryo_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('cryo_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    avg_pre_op_hgb_cryo_units: [
        { name: 'Surgeon A', color: '#1770B8', data: generateScatterData('cryo_units', 'pre_op_hgb', 'Surgeon A', '#1770B8') },
        { name: 'Surgeon B', color: '#EF2026', data: generateScatterData('cryo_units', 'pre_op_hgb', 'Surgeon B', '#EF2026') },
        { name: 'Surgeon C', color: '#897BD3', data: generateScatterData('cryo_units', 'pre_op_hgb', 'Surgeon C', '#897BD3') },
    ],
    // Cell Salvage Volume vs Pre-op Hemoglobin
    sum_pre_op_hgb_cell_saver_ml: [
        { name: 'Anesth 101', color: '#1770B8', data: generateScatterData('cell_saver_ml', 'pre_op_hgb', 'Anesth 101', '#1770B8') },
        { name: 'Anesth 204', color: '#EF2026', data: generateScatterData('cell_saver_ml', 'pre_op_hgb', 'Anesth 204', '#EF2026') },
        { name: 'Anesth 317', color: '#897BD3', data: generateScatterData('cell_saver_ml', 'pre_op_hgb', 'Anesth 317', '#897BD3') },
    ],
    avg_pre_op_hgb_cell_saver_ml: [
        { name: 'Anesth 101', color: '#1770B8', data: generateScatterData('cell_saver_ml', 'pre_op_hgb', 'Anesth 101', '#1770B8') },
        { name: 'Anesth 204', color: '#EF2026', data: generateScatterData('cell_saver_ml', 'pre_op_hgb', 'Anesth 204', '#EF2026') },
        { name: 'Anesth 317', color: '#897BD3', data: generateScatterData('cell_saver_ml', 'pre_op_hgb', 'Anesth 317', '#897BD3') },
    ],
};
