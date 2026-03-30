import os


os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key")
os.environ.setdefault("DJANGO_DEBUG", "False")
os.environ.setdefault("DJANGO_HOSTNAME", "localhost")
os.environ.setdefault("DJANGO_DISABLE_LOGINS", "False")
os.environ.setdefault("DJANGO_AUTH_PROVIDER", "cas")
os.environ.setdefault("MARIADB_DATABASE", "test")
os.environ.setdefault("MARIADB_USER", "test")
os.environ.setdefault("MARIADB_PASSWORD", "test")
os.environ.setdefault("MARIADB_HOST", "localhost")
os.environ.setdefault("MARIADB_PORT", "3306")

from .settings import *  # noqa: F401,F403


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
ALLOWED_HOSTS = [*ALLOWED_HOSTS, "localhost", "testserver"]  # noqa: F405
