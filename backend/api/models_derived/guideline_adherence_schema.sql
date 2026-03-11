DROP TABLE IF EXISTS GuidelineAdherence;

CREATE TABLE GuidelineAdherence (
    visit_no BIGINT,
    prov_id VARCHAR(25),
    attend_prov_line SMALLINT UNSIGNED,
    rbc_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    ffp_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    plt_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    cryo_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (visit_no, attend_prov_line),
    FOREIGN KEY (visit_no) REFERENCES Visit(visit_no)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
