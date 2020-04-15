import numpy as np
import pandas as pd
from itertools import compress

# Import the hand coded cpt_coded cpt code categories and all codes
code_csv = pd.read_csv("cpt_codes_manual.csv")
code_csv["code"] = code_csv["code"].astype(str)

# Hacky but it works (put this into oracle and copy out the descriptions)
code_string = "\'" + "\', \'".join(code_csv["code"]) + "\'"

# Open the cleaned file (this will be the output)
clean_code_csv = pd.read_csv("cpt_codes_oracle.csv")
clean_code_csv["code"] = clean_code_csv["code"].astype(str)

# Take the manually coded names
clean_code_csv = pd.merge(left = clean_code_csv, right = code_csv, on = "code", how = "outer")

# Manually add some more cleaned names
update = clean_code_csv[clean_code_csv["code"].isin(["32440", "32445"])]
update["clean_name"] = "Pneumonectomy"
clean_code_csv.update(update)

update = clean_code_csv[clean_code_csv["code"].isin(["32480", "32482", "32484", "32486", "32488"])]
update["clean_name"] = "Partial Lung Removal"
clean_code_csv.update(update)

update = clean_code_csv[clean_code_csv["code"].isin(["32096", "32097", "32098", "32100", "32110", "32120", "32124", "32141", "32150", "32160", "32505", "32507"])]
update["clean_name"] = "Thoracotomy"
clean_code_csv.update(update)

update = clean_code_csv[clean_code_csv["code"].isin(["32601", "32604", "32606", "32607", "32608", "32609", "32650", "32651", "32652", "32653", "32654", "32655", "32656", "32659", "32661", "32662", "32663", "32664", "32665", "32666", "32667", "32668", "32669", "32670", "32671", "32672", "32673", "32674"])]
update["clean_name"] = "Thoracoscopy"
clean_code_csv.update(update)

update = clean_code_csv[clean_code_csv["code"].isin(["32851", "32852", "32853", "32854"])]
update["clean_name"] = "Lung Transplant"
clean_code_csv.update(update)

update = clean_code_csv[clean_code_csv["code"].isin(["60521", "60522"])]
update["clean_name"] = "Thymectomy"
clean_code_csv.update(update)

update = clean_code_csv[clean_code_csv["code"].isin(["32220", "32225", "32320"])]
update["clean_name"] = "Decortication"
clean_code_csv.update(update)

# Manually add some more cleaned names for missing procedure codes
basic_mapping = {
    "Common GI procedure": ["43117", "43237", "43235", "43246", "43247", "43248", "43266"],
    "General thoracic procedure": ["21601", "21602", "21603", "21615", "21627", "21740", "21742", "21743", "21750", "60521", "60522", "64804", "64809"],
    "Thoracic/Lung procedure": ["32035", "32036", "32096", "32097", "32098", "32100", "32110", "32120", "32124", "32140", "32141", "32150", "32151", "32160", "32200", "32215", "32220", "32225", "32310", "32320", "32440", "32442", "32445", "32480", "32482", "32484", "32486", "32488", "32491", "32501", "32503", "32504", "32505", "32507", "32540", "32601", "32604", "32606", "32607", "32608", "32609", "32650", "32651", "32652", "32653", "32654", "32655", "32656", "32658", "32659", "32661", "32662", "32663", "32664", "32665", "32666", "32667", "32668", "32669", "32670", "32671", "32672", "32673", "32674", "32800", "32810", "32815", "32820", "32851", "32852", "32853", "32854", "32855", "32856", "32900", "32905", "32906", "38746", "39010", "39200", "39220", "39401", "39402", "39501", "39540", "39541", "39545", "39560", "39561"],
    "Thoracic/cardiac procedure": ["33020", "33025", "33030", "33031", "33050", "33120", "33130", "33140", "33141", "33202", "33203", "33236", "33237", "33238", "33243", "33250", "33251", "33254", "33255", "33256", "33257", "33258", "33259", "33261", "33265", "33266", "33300", "33305", "33310", "33315", "33320", "33321", "33322", "33330", "33335", "33404", "33414", "33416", "33417", "33422", "33460", "33474", "33475", "33476", "33478", "33496", "33500", "33501", "33502", "33503", "33504", "33505", "33506", "33507", "33508", "33530", "33542", "33545", "33548", "33572", "33641", "33645", "33647", "33675", "33681", "33702", "33710", "33720", "33722", "33724", "33800", "33802", "33803", "33877", "33910", "33915", "33916", "33917", "33973", "33974"],
    "ECMO":["33952", "33954", "33956", "33958", "33962", "33964", "33966", "33984", "33986", "33987", "33988", "33989"],
    "Aortic valve procedure": ["33362", "33363", "33364", "33365", "33366", "33390", "33391", "33406", "33410", "33415"],
    "Mitral valve procedure": ["0345T", "0483T", "0484T", "0543T", "0544T"],
    "Tricuspid valve procedure": ["0545T", "0569T", "0570T"],
    "Previously valid aortic surgery code (expired 12/31/19)": ["33860", "33870"],
    "Aortic surgery code": ["33880", "33881"],
}
missing = clean_code_csv[clean_code_csv[["clean_name", "db_code_desc"]].isnull().all(axis = 1)]
missing["clean_name"] = missing.apply(lambda a: list(compress(basic_mapping.keys(), [str(a[0]) in x for x in basic_mapping.values()]))[0], axis = 1)
clean_code_csv.update(missing)

# Write out the resulting file
clean_code_csv.to_csv("cpt_codes_cleaned.csv", index = False)