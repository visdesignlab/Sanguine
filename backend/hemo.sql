with Hemo as (
        SELECT labs1.DI_VISIT_NO, labs1.RESULT_VALUE, labs1.DI_RESULT_DTM, labs1.RESULT_DESC
        FROM CLIN_DM.BPU_CTS_DI_PREOP_LABS labs1 
        INNER JOIN ( 
                SELECT DI_VISIT_NO, max(DI_RESULT_DTM) as MaxTime
                FROM CLIN_DM.BPU_CTS_DI_PREOP_LABS
                WHERE RESULT_DESC = 'Hemoglobin'
                GROUP BY DI_VISIT_NO) labs2
        ON (labs2.DI_VISIT_NO = labs1.DI_VISIT_NO and labs2.MaxTime = labs1.DI_RESULT_DTM and labs1.RESULT_DESC = 'Hemoglobin')
)
SELECT trans_new.*, surgery.*
FROM (
    SELECT EXTRACT(YEAR FROM trans.DI_TRNSFSN_DTM) as year,
        trans.CRYO_UNITS, trans.PLT_UNITS, trans.FFP_UNITS, trans.PRBC_UNITS, trans.DI_VISIT_NO,
        Hemo.RESULT_VALUE as hemo_value
        FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD trans
        INNER JOIN Hemo ON
        Hemo.DI_VISIT_NO = trans.DI_VISIT_NO
) trans_new
INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE surgery
ON trans_new.DI_VISIT_NO = surgery.DI_VISIT_NO







with Hemo as (
    SELECT labs1.DI_VISIT_NO, labs1.RESULT_VALUE, labs1.DI_RESULT_DTM, labs1.RESULT_DESCFROM CLIN_DM.BPU_CTS_DI_PREOP_LABS labs1 INNER JOIN (SELECT DI_VISIT_NO, max(DI_RESULT_DTM) as MaxTime FROM CLIN_DM.BPU_CTS_DI_PREOP_LABS WHERE RESULT_DESC = 'Hemoglobin' GROUP BY DI_VISIT_NO) labs2 ON (labs2.DI_VISIT_NO = labs1.DI_VISIT_NO and labs2.MaxTime = labs1.DI_RESULT_DTM and labs1.RESULT_DESC = 'Hemoglobin'))SELECT trans_new.*, surgery.* FROM (SELECT EXTRACT(YEAR FROM trans.DI_TRNSFSN_DTM) as year,trans.CRYO_UNITS, trans.PLT_UNITS, trans.FFP_UNITS, trans.PRBC_UNITS, trans.DI_VISIT_NO,Hemo.RESULT_VALUE as hemo_value FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD trans INNER JOIN Hemo ON Hemo.DI_VISIT_NO = trans.DI_VISIT_NO) trans_new INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE surgery ON trans_new.DI_VISIT_NO = surgery.DI_VISIT_NO;