def conditional_login_required(decorator, condition):
    def resdec(f):
        if not condition:
            return f
        return decorator(f)
    return resdec
