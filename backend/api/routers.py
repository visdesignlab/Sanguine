from django.conf import settings


class SanguineRouter:
    """
    A router to control all database operations on models in the
    sanguine application.
    """
    def db_for_read(self, model, **hints):
        """
        Attempts to read sanguine models go to hospital.
        """
        if getattr(model, 'use_hospital_db', False):
            return 'hospital'
        return None

    def db_for_write(self, model, **hints):
        """
        Attempts to write sanguine models go to hospital.
        """
        if getattr(model, 'use_hospital_db', False):
            return 'hospital'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the sanguine app is involved.
        """
        if getattr(obj1, 'use_hospital_db', False) or getattr(obj2, 'use_hospital_db', False):
            return settings.IS_TESTING
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the sanguine app only appears in the 'hospital'
        database.
        """
        return True
