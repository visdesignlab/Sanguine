import csv


def db_type_to_django(field_type, max_length=None, precision=None, scale=None):
    mapping = {
        '<DbType DB_TYPE_NUMBER>': 'models.FloatField()' if scale != 'None' and int(scale) == -127 else (f'models.DecimalField(max_digits={precision}, decimal_places={scale})' if precision and scale else 'models.IntegerField()'),
        '<DbType DB_TYPE_VARCHAR>': f'models.CharField(max_length={max_length})',
        '<DbType DB_TYPE_DATE>': 'models.DateField()',
        '<DbType DB_TYPE_CHAR>': 'models.CharField(max_length=1)',
    }
    return mapping[field_type]


with open('utah-schema/column_names_live.csv', 'r') as f:
    reader = csv.DictReader(f)
    models = {}
    for row in reader:
        table_name = row['table'].split('.')[-1]
        if table_name not in models:
            models[table_name] = []
        field_line = f"    {row['name']} = {db_type_to_django(row['type_code'], row['display_size'], row['precision'], row['scale'])}"
        models[table_name].append(field_line)

for model, fields in models.items():
    print(f"class {model}(models.Model):")
    print('\n'.join(fields))
    print('\n')
    print("    class Meta:")
    print("        managed = False")
    print(f"        db_table = '{model.upper()}'")
    print("        using = 'hospital'")
    print('\n')