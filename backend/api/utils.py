import csv


def cpt():
    # Instantiate mapping array
    cpt = []

    # Read in the cpt codes
    with open("cpt_codes_cleaned.csv", "r") as file:
        read_csv = csv.reader(file, delimiter=",")
        next(read_csv, None)
        for row in read_csv:
            cpt.append(tuple(row))

    return cpt


def get_bind_names(filters):
    if not isinstance(filters, list):
        raise TypeError("get_bind_names was not passed a list")
    return [f"filters{str(i)}" for i in range(len(filters))]


def get_all_cpt_code_filters():
    filters = [a[0] for a in cpt()]
    bind_names = get_bind_names(filters)
    filters_safe_sql = f"WHERE CODE IN (%({')s,%('.join(bind_names)})s) "

    return filters, bind_names, filters_safe_sql
