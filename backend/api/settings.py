import environ
import os
import oracledb

env = environ.Env(
    DJANGO_DEBUG=(bool, False),  # Cast to bool, default to False
    DJANGO_TESTING=(bool, False)  # Cast to bool, default to False
)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
IS_TESTING = env("DJANGO_TESTING")

# We're allowing localhost for local development and for production deployment with containers
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
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
    'django_cas_ng',
    'django_extensions',
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    'django_cas_ng.middleware.CASMiddleware',
]

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
    },
    "hospital": {
        'ENGINE': 'django.db.backends.oracle',
        "NAME": f"{env('ORACLE_HOST')}:{env('ORACLE_PORT')}/{env('ORACLE_SERVICE_NAME')}",
        "USER": env("ORACLE_USER"),
        "PASSWORD": env("ORACLE_PASSWORD"),
        "OPTIONS": {
            "mode": oracledb.AUTH_MODE_SYSDBA if IS_TESTING else oracledb.AUTH_MODE_DEFAULT,
        }
    } if os.environ.get("ORACLE_HOST", None) is not None else {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env("MARIADB_DATABASE"),
        'USER': env("MARIADB_USER"),
        'PASSWORD': env("MARIADB_PASSWORD"),
        'HOST': env("MARIADB_HOST"),
        'PORT': env("MARIADB_PORT"),
    }
}
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'
DATABASE_ROUTERS = ['api.routers.SanguineRouter']

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'django_cas_ng.backends.CASBackend',
)

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
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "sanguine.log",
            "maxBytes": 1000000000,  # 1GB
            "backupCount": 10,
            "encoding": "utf-8",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "": {
            "level": "DEBUG",
            "handlers": ["file"],
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

CORS_ORIGIN_ALLOW_ALL = False
CORS_ORIGIN_WHITELIST = ["http://localhost:8080"] if IS_TESTING else []
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'access-control-allow-credentials',
    'access-control-allow-origin',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

LOGIN_REDIRECT_URL = '/api'
LOGIN_URL = '/api/accounts/login'
SESSION_COOKIE_AGE = 2 * 60 * 60  # 2hr * 60 min * 60 sec
SESSION_COOKIE_SECURE = True
SESSION_SAVE_EVERY_REQUEST = True
CSRF_COOKIE_SECURE = True

CAS_SERVER_URL = "https://go.utah.edu/cas/"
CAS_ADMIN_PREFIX = "api/"
CAS_IGNORE_REFERER = True
CAS_FORCE_SSL_SERVICE_URL = True
CAS_VERSION = '3'
CAS_USERNAME_ATTRIBUTE = "unid"
CAS_ROOT_PROXIED_AS = "https://sanguine.med.utah.edu"
