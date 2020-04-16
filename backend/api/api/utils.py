# Makes and returns the database connection object
def make_connection():
    # Load credentials
    with open("credential.json") as credential:
        credential_data = json.load(credential)
        usr_name = credential_data["usr_name"]
        password = credential_data["password"]

    # Generate the connection
    dsn_tns = cx_Oracle.makedsn(
        "prodrac-scan.med.utah.edu",
        "1521",
        service_name="dwrac_som_analysts.med.utah.edu",
    )

    return cx_Oracle.connect(user=usr_name, password=password, dsn=dsn_tns)


# Read in the data dictionary
def data_dictionary():
    # Instantiate mapping array
    data_dict = {}

    with open("data_dictionary.csv", "r") as file:
        read_csv = csv.reader(file, delimiter=",")
        for row in read_csv:
            data_dict[row[0]] = row[1]

    return data_dict


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


# Execute a command against the database
# *args passes through positional args
# **kwargs passes through keyword arguments
def execute_sql(command, *args, **kwargs):
    connection = make_connection()
    cur = connection.cursor()
    return cur.execute(command, *args, **kwargs)


# Returns all values from raw results for a specified agg var
def get_all_by_agg(result_dict, agg, variable):
    return [
        y for y in 
        list(map(lambda x: x[variable] if x["aggregatedBy"] == agg else None, result_dict))
        if y is not None
    ]


def get_filters(filter_selection):
    if filter_selection != [""]:
        filters = filter_selection
        bindNames = [f":filters{str(i)}" for i in range(len(filters))]
        filters_safe_sql = f"WHERE CODE_DESC IN ({','.join(bindNames)}) "
    else:
        filters = [a[0] for a in cpt()]
        bindNames = [f":filters{str(i)}" for i in range(len(filters))]
        filters_safe_sql = f"WHERE CODE IN ({','.join(bindNames)}) "

    return filters, bindNames, filters_safe_sql