from django.conf import settings
from functools import wraps
from django.contrib.auth.decorators import login_required


def conditional_login_required(view_func):
    """
    Decorator that requires the user to be logged in if DEBUG is False (i.e. in production).
    """
    @wraps(view_func)
    def result_decorator(request, *args, **kwargs):
        if settings.DISABLE_LOGINS:
            return view_func(request, *args, **kwargs)
        return login_required(view_func)(request, *args, **kwargs)
    return result_decorator
