{ ... }:
{
  perSystem =
    { pkgs, ... }:
    {
      packages.postgres = pkgs.dockerTools.buildLayeredImage {
        name = "postgres-nix";
        tag = "latest";
        contents = [
          pkgs.postgresql
          pkgs.bash
          pkgs.coreutils
          pkgs.cacert
        ];
        fakeRootCommands = ''
          ${pkgs.dockerTools.shadowSetup}
          groupadd -r postgres
          useradd -r -g postgres -d /var/lib/postgresql postgres
          mkdir -p /var/lib/postgresql
          chown -R postgres:postgres /var/lib/postgresql
          mkdir -p /run/postgresql
          chown postgres:postgres /run/postgresql
        '';
        enableFakechroot = true;
        config = {
          Env = [
            "PGDATA=/var/lib/postgresql"
            "POSTGRES_PASSWORD=postgres"
          ];
          User = "postgres";
          WorkingDir = "/var/lib/postgresql";
          Entrypoint = [
            (pkgs.writeScript "docker-entrypoint.sh" ''
              #!${pkgs.runtimeShell}
              set -e

              if [ -z "$(ls -A "$PGDATA" 2>/dev/null || true)" ]; then
                echo "Initializing database cluster in $PGDATA"
                initdb -D "$PGDATA" -U postgres -E UTF8 --locale=C

                echo "host all all 0.0.0.0/0 trust" >> "$PGDATA/pg_hba.conf"
                echo "host all all ::/0 trust" >> "$PGDATA/pg_hba.conf"
              fi

              exec "$@"
            '')
          ];
          Cmd = [
            "postgres"
            "-c"
            "listen_addresses=*"
          ];
          ExposedPorts = {
            "5432/tcp" = { };
          };
          Volumes = {
            "/var/lib/postgresql" = { };
          };
        };
      };
    };
}
