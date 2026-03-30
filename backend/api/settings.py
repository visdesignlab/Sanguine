import environ
import os
import sys
from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured

from .auth import AUTH_PROVIDER_CAS, AUTH_PROVIDER_SAML, normalize_auth_provider


env = environ.Env(
    DJANGO_DEBUG=(bool, False),  # Cast to bool, default to False
    DJANGO_HOSTNAME=(str, "localhost"),
    DJANGO_DISABLE_LOGINS=(bool, False),
    DJANGO_AUTH_PROVIDER=(str, AUTH_PROVIDER_CAS),
    SAML_ENTITY_ID=(str, ""),
    SAML_SP_BASE_URL=(str, ""),
    SAML_IDP_METADATA_MODE=(str, "remote"),
    SAML_IDP_METADATA_URL=(str, ""),
    SAML_IDP_METADATA_PATH=(str, ""),
    SAML_IDP_METADATA_XML=(str, ""),
    SAML_SP_CERT_PATH=(str, ""),
    SAML_SP_KEY_PATH=(str, ""),
    SAML_SP_CERT_B64=(str, ""),
    SAML_SP_KEY_B64=(str, ""),
    SAML_USERNAME_ATTRIBUTE=(str, "email"),
    SAML_EMAIL_ATTRIBUTE=(str, "email"),
    SAML_FIRST_NAME_ATTRIBUTE=(str, "first_name"),
    SAML_LAST_NAME_ATTRIBUTE=(str, "last_name"),
    SAML_DEFAULT_REDIRECT_URL=(str, "/api"),
)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
DISABLE_LOGINS = env("DJANGO_DISABLE_LOGINS")
try:
    AUTH_PROVIDER = normalize_auth_provider(env("DJANGO_AUTH_PROVIDER"))
except ValueError as exc:
    raise ImproperlyConfigured(str(exc)) from exc

# We're allowing localhost for local development and for production deployment with containers
ALLOWED_HOSTS = [
    "backend",
    env("DJANGO_HOSTNAME"),
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "api",
    'django_extensions',
]

if AUTH_PROVIDER == AUTH_PROVIDER_CAS:
    INSTALLED_APPS.append("django_cas_ng")
elif AUTH_PROVIDER == AUTH_PROVIDER_SAML:
    INSTALLED_APPS.append("djangosaml2")

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

if AUTH_PROVIDER == AUTH_PROVIDER_CAS:
    MIDDLEWARE.append("django_cas_ng.middleware.CASMiddleware")
elif AUTH_PROVIDER == AUTH_PROVIDER_SAML:
    MIDDLEWARE.append("djangosaml2.middleware.SamlSessionMiddleware")

ROOT_URLCONF = "api.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, 'templates')],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "api.wsgi.application"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env("MARIADB_DATABASE"),
        'USER': env("MARIADB_USER"),
        'PASSWORD': env("MARIADB_PASSWORD"),
        'HOST': env("MARIADB_HOST"),
        'PORT': env("MARIADB_PORT"),
    }
}
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
)

if AUTH_PROVIDER == AUTH_PROVIDER_CAS:
    AUTHENTICATION_BACKENDS += ('django_cas_ng.backends.CASBackend',)
elif AUTH_PROVIDER == AUTH_PROVIDER_SAML:
    AUTHENTICATION_BACKENDS += ('api.saml.SanguineSaml2Backend',)

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGGING = {
    "version": 1,  # the dictConfig format version
    "disable_existing_loggers": False,  # retain the default loggers
    "formatters": {
        "verbose": {
            "format": "{name} {levelname} {asctime} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "stream": sys.stdout,
            "formatter": "verbose",
        },
    },
    "loggers": {
        "": {
            "level": "DEBUG",
            "handlers": ["console"],
        },
    },
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, 'static/')

if DEBUG:
    CORS_ORIGIN_ALLOW_ALL = True
    CORS_ALLOW_CREDENTIALS = True

    CORS_ALLOW_HEADERS = (
        *default_headers,
        'access-control-allow-credentials',
        'access-control-allow-origin',
    )

LOGIN_REDIRECT_URL = '/api'
LOGIN_URL = '/api/accounts/login/'
LOGOUT_REDIRECT_URL = '/api/'
SESSION_COOKIE_AGE = 60 * 30  # 60 seconds * 30 minutes
SESSION_COOKIE_SECURE = True
SESSION_SAVE_EVERY_REQUEST = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [
    f"https://{env('DJANGO_HOSTNAME')}",
    f"http://{env('DJANGO_HOSTNAME')}:8080",
]

CAS_SERVER_URL = "https://go.utah.edu/cas/"
CAS_ADMIN_PREFIX = "api/"
CAS_IGNORE_REFERER = True
CAS_FORCE_SSL_SERVICE_URL = True
CAS_VERSION = '3'
CAS_USERNAME_ATTRIBUTE = "unid"
CAS_ROOT_PROXIED_AS = "https://sanguine.med.utah.edu"

if AUTH_PROVIDER == AUTH_PROVIDER_SAML:
    from .saml import build_saml_settings

    globals().update(
        build_saml_settings(
            env=env,
            hostname=env("DJANGO_HOSTNAME"),
        )
    )
