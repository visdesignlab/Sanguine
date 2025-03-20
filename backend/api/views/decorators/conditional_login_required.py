from django.conf import settings
from django_cas_ng.decorators import login_required


def conditional_login_required():
    """
    Decorator that requires the user to be logged in if DEBUG is False (i.e. in production).
    """
    def result_decorator(f):
        if settings.DEBUG:
            return f
        return login_required(f)
    return result_decorator
