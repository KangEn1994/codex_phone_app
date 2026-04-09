FROM node:22-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/root \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH

ARG CODEX_NPM_PACKAGE=@openai/codex

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        git \
        openssh-client \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g "${CODEX_NPM_PACKAGE}"

RUN python3 -m venv "${VIRTUAL_ENV}"

COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /app/requirements.txt

COPY app /app/app
COPY static /app/static
COPY templates /app/templates
COPY docker/entrypoint.sh /usr/local/bin/codexapp-entrypoint

RUN chmod +x /usr/local/bin/codexapp-entrypoint

EXPOSE 8000

ENTRYPOINT ["codexapp-entrypoint"]
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
