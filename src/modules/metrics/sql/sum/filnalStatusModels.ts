const finalStatusModels = `
WITH FilteredModels as (
    SELECT model_id,
        STRING_AGG(status, ';') as status
        FROM (
        SELECT model_id,
            CASE
                WHEN (artefact_id = 896)
                    AND (artefact_value_id IN (685))
                    THEN 'Модель не эффективна в бизнес-процессе'
                WHEN (artefact_id = 827)
                    AND (artefact_value_id IN (642))
                    THEN 'Модель не эффективна в бизнес-процессе'
                WHEN artefact_id = 52
                    AND artefact_string_value = 'Нет, доработки не актуальны'
                    THEN 'Модель не эффективна в бизнес-процессе'

                WHEN artefact_id = 174
                    AND (artefact_string_value is null OR artefact_string_value = 'false')
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 201
                    AND (artefact_value_id IN (313, 314, 315))
                    THEN artefact_string_value
                WHEN artefact_id = 896
                    AND (artefact_value_id IN (683))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 827
                    AND (artefact_value_id IN (642, 643))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 822
                    AND (artefact_value_id IN (637))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 367
                    AND (artefact_value_id IN (519))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 373
                    AND (artefact_value_id IN (411))
                    THEN 'Разработана, не внедрена'

                WHEN artefact_id = 323
                    AND (artefact_value_id IN (426))
                    THEN 'Архив'
                WHEN artefact_id = 351
                    AND (artefact_value_id IN (399))
                    THEN 'Архив'
                WHEN artefact_id = 152
                    AND (artefact_value_id IN (35))
                    THEN 'Архив'
                WHEN artefact_id = 822
                    AND (artefact_value_id IN (638))
                    THEN 'Архив'
                WHEN artefact_id = 818
                    AND (artefact_value_id IN (632))
                    THEN 'Архив'

                WHEN artefact_id = 323
                    AND (artefact_value_id IN (427))
                    THEN 'Разработана, не внедрена'

                WHEN (artefact_id = 780 OR artefact_id = 779)
                    AND artefact_string_value = 'true'
                    THEN 'Вывод модели из эксплуатации'

                WHEN (artefact_id = 896)
                    AND (artefact_value_id IN (684))
                    THEN 'Разработана, внедрена в ПИМ'
                WHEN (artefact_id = 853)
                    AND (artefact_value_id IN (657, 658))
                    THEN 'Разработана, внедрена в ПИМ'
                WHEN (artefact_id = 872)
                    AND (artefact_value_id IN (667))
                    THEN 'Разработана, внедрена в ПИМ'

                WHEN (artefact_id = 827)
                    AND (artefact_value_id IN (641))
                    THEN 'Разработана, внедрена вне ПИМ'
                WHEN (artefact_id = 853)
                    AND (artefact_value_id IN (659))
                    THEN 'Разработана, внедрена вне ПИМ'

                WHEN (artefact_id = 825)
                    AND (artefact_string_value = 'true')
                    THEN 'Опытная эксплуатация на контуре разработки'
                END AS status
        FROM artefact_realizations
        WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
    ) AS FOO
    GROUP BY model_id
),
RankedArtefacts AS (
    SELECT ar.model_id,
           ar.artefact_id,
           ar.artefact_string_value,
           ROW_NUMBER() OVER (
               PARTITION BY ar.model_id, ar.artefact_id
               ORDER BY ar.effective_from DESC
           ) AS rn
    FROM artefact_realizations AS ar
    JOIN artefacts AS a
      ON ar.artefact_id = a.artefact_id
    WHERE a.artefact_tech_label IN ('rs_model_decommiss_date', 'date_of_introduction_into_operation', 'model_epic_05_date', 'data_completion_of_stage_05a', 'Departament')
)
SELECT m.model_id,
       coalesce(
         ar1.artefact_string_value,
         ar2.artefact_string_value,
         ar3.artefact_string_value,
         ar4.artefact_string_value,
         to_char(m.create_date, 'YYYY-MM-DD')
       ) AS value,
       ar5.artefact_string_value AS stream,
       fm.status AS status
FROM models AS m
LEFT JOIN RankedArtefacts AS ar1
  ON m.model_id = ar1.model_id AND ar1.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'rs_model_decommiss_date') AND ar1.rn = 1
LEFT JOIN RankedArtefacts AS ar2
  ON m.model_id = ar2.model_id AND ar2.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'date_of_introduction_into_operation') AND ar2.rn = 1
LEFT JOIN RankedArtefacts AS ar3
  ON m.model_id = ar3.model_id AND ar3.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'model_epic_05_date') AND ar3.rn = 1
LEFT JOIN RankedArtefacts AS ar4
  ON m.model_id = ar4.model_id AND ar4.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'data_completion_of_stage_05a') AND ar4.rn = 1
LEFT JOIN FilteredModels AS fm
    ON m.model_id = fm.model_id
LEFT JOIN RankedArtefacts AS ar5
  ON m.model_id = ar5.model_id AND ar5.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'Departament') AND ar5.rn = 1
WHERE coalesce(
    ar1.artefact_string_value,
    ar2.artefact_string_value,
    ar3.artefact_string_value,
    ar4.artefact_string_value,
    to_char(m.create_date, 'YYYY-MM-DD')
) IS NOT NULL
AND fm.status LIKE '%Модель внедряется в ПИМ%' OR
    fm.status LIKE '%Модель внедряется вне ПИМ%' OR
    fm.status LIKE '%Разработана, не внедрена» %' OR
    fm.status LIKE '%Архив%'
`;

export { finalStatusModels };
