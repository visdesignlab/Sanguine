Overall:
- Change columns to lower case

Patient:
- SEX_C -> sex_code
- Drop RACE_C
- Drop ETHNIC_GROUP_C
- Remove PAT_

Lab:
- Drop PAT_ENC_CSN_ID (it's already in pb.visit_no, CHECK THIS)

Qs:
- PATIENT: Is sex code really sex desc? Should we rename
- Where is present on adminssion flag in billing codes?


**GENERATION**


Patient:
- bad_case (informs products later, visit dates, number of visits)
- department
- death date (informs visit date being close to death date)

Visits:
- number of visits (based on bad_case, department)
- DRG (based on bad_case)
- CCI (based on bad_case)
- Vent (based on bad_case)
- pat expired (based on bad_case, and is the last visit)
- admit date (based on bad_case)
- discharge date (based on bad_case)

Surgery:
- does a surgery even happen in this visit? (less for some departments)
- are there multiple surgeries in one visit?
- start and end time (based on bad_case, bad cases are longer, allows for more transfusions)

Billing code:
- based on department
- need to add a severity metric, bad cases are more severe

Transfusion:
- decide an amount of blood to transfuse (based on bad_case)
- decide a type of blood to transfuse (chat to Ryan about typical blood usage in surgery)

Out of surgery transfusions:
- decide an amount of blood to transfuse before and after (based on bad_case, death)

Labs:
- preop labs (based on preop transfusion)
- postop labs (based on postop transfusion)
- labs during surgery (based on bad_case, and if there is a transfusion)

Meds:
- based on department
- based on labs (e.g. low hemoglobin, for anemia management)

TODO:
Room trace:
Provider: