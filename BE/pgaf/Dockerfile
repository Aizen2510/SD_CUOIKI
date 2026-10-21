FROM postgres:16-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && install -d /usr/share/keyrings \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | gpg --dearmor -o /usr/share/keyrings/postgresql-pgdg.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-pgdg.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && echo 'create_main_cluster = false' >> /etc/postgresql-common/createcluster.conf \
    && apt-get update \
    && apt-get install -y --no-install-recommends pg-auto-failover-cli postgresql-16-auto-failover \
    && rm -rf /var/lib/apt/lists/*

ENV PGDATA=/var/lib/postgres/pgaf
ENV PG_AUTOCTL_DEBUG=1

RUN mkdir -p /var/lib/postgres && chown postgres:postgres /var/lib/postgres

USER postgres
