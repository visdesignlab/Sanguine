from django.conf import settings


# If settings.IS_TESTING is True, then the conditional_login_required decorator will be used to bypass CAS authentication
# This decorator will be passed the login_required decorator, which will be used to bypass the CAS authentication
def conditional_login_required(decorator):
    def result_decorator(f):
        if settings.IS_TESTING:
            return f
        return decorator(f)
    return result_decorator
