TRUNCATE TABLE DepartmentEncounterAttributes;

INSERT INTO DepartmentEncounterAttributes (
    visit_no,
    attend_prov_line,
    department_id,
    department_name,
    rbc_units,
    ffp_units,
    plt_units,
    cryo_units,
    whole_units,
    cell_saver_ml,
    rbc_units_adherent,
    ffp_units_adherent,
    plt_units_adherent,
    cryo_units_adherent
)
WITH RankedTransfusions AS (
    /*
     * For each transfusion, attribute to exactly one AttendingProvider window.
     * Prefer the lowest attend_prov_line, then earliest attend_start_dtm.
     */
    SELECT
        t.id                                            AS transfusion_id,
        t.visit_no,
        t.trnsfsn_dtm,
        t.rbc_units,
        t.ffp_units,
        t.plt_units,
        t.cryo_units,
        t.whole_units,
        t.cell_saver_ml,
        COALESCE(ap.attend_prov_line, 0)                AS attend_prov_line,
        ap.prov_id,
        ROW_NUMBER() OVER (
            PARTITION BY t.id
            ORDER BY
                COALESCE(ap.attend_prov_line, 9999) ASC,
                ap.attend_start_dtm ASC,
                COALESCE(ap.prov_id, '') ASC
        ) AS rn_prov
    FROM Transfusion t
    JOIN AttendingProvider ap
      ON ap.visit_no = t.visit_no
     AND t.trnsfsn_dtm BETWEEN ap.attend_start_dtm AND ap.attend_end_dtm
),
ProviderTransfusions AS (
    /*
     * One attribution per transfusion (lowest prov_line wins).
     */
    SELECT
        transfusion_id,
        visit_no,
        trnsfsn_dtm,
        rbc_units,
        ffp_units,
        plt_units,
        cryo_units,
        whole_units,
        cell_saver_ml,
        attend_prov_line,
        prov_id
    FROM RankedTransfusions
    WHERE rn_prov = 1
),
RankedRoomTrace AS (
    /*
     * For each transfusion, find the RoomTrace interval that covers the event.
     * If multiple RoomTrace intervals overlap (transition moments), take the
     * one that started most recently (patient most definitively in that dept).
     * Transfusions outside all RoomTrace windows are excluded.
     */
    SELECT
        pt.transfusion_id,
        pt.visit_no,
        pt.attend_prov_line,
        pt.rbc_units,
        pt.ffp_units,
        pt.plt_units,
        pt.cryo_units,
        pt.whole_units,
        pt.cell_saver_ml,
        rt.service_in_desc                              AS department_name,
        ROW_NUMBER() OVER (
            PARTITION BY pt.transfusion_id
            ORDER BY rt.in_dtm DESC
        )                                               AS rn_rt
    FROM ProviderTransfusions pt
    JOIN RoomTrace rt
      ON rt.visit_no = pt.visit_no
     AND pt.trnsfsn_dtm BETWEEN rt.in_dtm AND rt.out_dtm
),
DeptTransfusions AS (
    /*
     * One row per transfusion with its department attribution from RoomTrace.
     */
    SELECT
        transfusion_id,
        visit_no,
        attend_prov_line,
        rbc_units,
        ffp_units,
        plt_units,
        cryo_units,
        whole_units,
        cell_saver_ml,
        department_name
    FROM RankedRoomTrace
    WHERE rn_rt = 1
),
ProviderTotals AS (
    /*
     * Total units per (visit_no, attend_prov_line) across all departments.
     * Used to prorate adherent unit counts proportionally.
     */
    SELECT
        visit_no,
        attend_prov_line,
        SUM(rbc_units)   AS total_rbc,
        SUM(ffp_units)   AS total_ffp,
        SUM(plt_units)   AS total_plt,
        SUM(cryo_units)  AS total_cryo
    FROM DeptTransfusions
    GROUP BY visit_no, attend_prov_line
),
AdherenceByDept AS (
    /*
     * Attribute adherent units to departments by prorating GuidelineAdherence
     * (which is computed at visit+provider level) against the fraction of
     * that provider's units that occurred in each department.
     * FLOOR is used to avoid fractional unit counts.
     */
    SELECT
        dt.transfusion_id,
        dt.visit_no,
        dt.attend_prov_line,
        dt.department_name,
        dt.rbc_units,
        dt.ffp_units,
        dt.plt_units,
        dt.cryo_units,
        dt.whole_units,
        dt.cell_saver_ml,
        CASE
            WHEN COALESCE(pv.total_rbc, 0) > 0
            THEN FLOOR(COALESCE(ga.rbc_units_adherent, 0) * dt.rbc_units / pv.total_rbc)
            ELSE 0
        END AS rbc_units_adherent,
        CASE
            WHEN COALESCE(pv.total_ffp, 0) > 0
            THEN FLOOR(COALESCE(ga.ffp_units_adherent, 0) * dt.ffp_units / pv.total_ffp)
            ELSE 0
        END AS ffp_units_adherent,
        CASE
            WHEN COALESCE(pv.total_plt, 0) > 0
            THEN FLOOR(COALESCE(ga.plt_units_adherent, 0) * dt.plt_units / pv.total_plt)
            ELSE 0
        END AS plt_units_adherent,
        CASE
            WHEN COALESCE(pv.total_cryo, 0) > 0
            THEN FLOOR(COALESCE(ga.cryo_units_adherent, 0) * dt.cryo_units / pv.total_cryo)
            ELSE 0
        END AS cryo_units_adherent
    FROM DeptTransfusions dt
    LEFT JOIN ProviderTotals pv
           ON pv.visit_no = dt.visit_no
          AND pv.attend_prov_line = dt.attend_prov_line
    LEFT JOIN GuidelineAdherence ga
           ON ga.visit_no = dt.visit_no
          AND ga.attend_prov_line = dt.attend_prov_line
)
SELECT
    a.visit_no,
    a.attend_prov_line,
    pd.department_id,
    a.department_name,
    SUM(a.rbc_units)            AS rbc_units,
    SUM(a.ffp_units)            AS ffp_units,
    SUM(a.plt_units)            AS plt_units,
    SUM(a.cryo_units)           AS cryo_units,
    SUM(a.whole_units)          AS whole_units,
    SUM(a.cell_saver_ml)        AS cell_saver_ml,
    SUM(a.rbc_units_adherent)   AS rbc_units_adherent,
    SUM(a.ffp_units_adherent)   AS ffp_units_adherent,
    SUM(a.plt_units_adherent)   AS plt_units_adherent,
    SUM(a.cryo_units_adherent)  AS cryo_units_adherent
FROM AdherenceByDept a
JOIN (
    SELECT DISTINCT department_name, department_id
    FROM ProviderDepartment
) pd ON pd.department_name = a.department_name
GROUP BY a.visit_no, a.attend_prov_line, pd.department_id, a.department_name;
