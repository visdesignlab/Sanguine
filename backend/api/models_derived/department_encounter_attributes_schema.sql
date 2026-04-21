DROP TABLE IF EXISTS DepartmentEncounterAttributes;

CREATE TABLE DepartmentEncounterAttributes (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_no         BIGINT NOT NULL,
    attend_prov_line SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    department_id    VARCHAR(100) NOT NULL,
    department_name  VARCHAR(100) NOT NULL,
    rbc_units        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    ffp_units        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    plt_units        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    cryo_units       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    whole_units      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    cell_saver_ml    MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
    rbc_units_adherent   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    ffp_units_adherent   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    plt_units_adherent   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    cryo_units_adherent  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    INDEX idx_dea_visit_dept  (visit_no, department_id),
    INDEX idx_dea_dept        (department_id),
    FOREIGN KEY (visit_no) REFERENCES Visit(visit_no) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
