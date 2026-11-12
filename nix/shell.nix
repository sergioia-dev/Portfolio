{ ... }:
{
  perSystem =
    {
      pkgs,
      ...
    }:
    let

      registriesConf = pkgs.writeText "registries.conf" ''
        unqualified-search-registries = ["docker.io"]

        [[registry]]
        prefix = "docker.io"
        location = "docker.io"
      '';

      podmanSetupScript = pkgs.writeScript "podman-setup" ''
        #!${pkgs.runtimeShell}
        if ! test -f ~/.config/containers/policy.json; then
          install -Dm555 ${pkgs.skopeo.src}/default-policy.json ~/.config/containers/policy.json
        fi
        if ! test -f ~/.config/containers/registries.conf; then
          install -Dm555 ${registriesConf} ~/.config/containers/registries.conf
        fi

        cat > ~/.config/containers/containers.conf << 'EOF'
        [containers]
        EOF
      '';
    in
    {
      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          podman-compose
          podman
          runc
          conmon
          skopeo
          slirp4netns
          fuse-overlayfs
          postgresql
          nodejs
          corepack
          husky
        ];

        API_PORT = 5678;
        DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
        ENV_MODE = "development";

        DB_HOST = "localhost";
        DB_PORT = 5432;
        DB_NAME = "postgres";
        DB_USER = "postgres";
        DB_PASSWORD = "postgres";

        DOCKER_HOST = "unix://$SOCKET";
        PODMAN_COMPOSE_PROVIDER = "podman-compose";

        VITE_API_URL = "http://localhost:5678";
        VITE_BLOGS_SUBURL = "/api/v1/blogs?lang=";
        VITE_PROJECTS_SUBURL = "/api/v1/projects?lang=";
        VITE_TAGS_SUBURL = "/api/v1/tags";

        shellHook = ''
          ${podmanSetupScript}

          SOCKET="$XDG_RUNTIME_DIR/podman/podman.sock"
          mkdir -p "$(dirname "$SOCKET")"

          if [ ! -S "$SOCKET" ]; then
            podman system service --time=0 "unix://$SOCKET" &
            PODMAN_SERVICE_PID=$!
            for i in $(seq 1 10); do
              if [ -S "$SOCKET" ]; then break; fi
              sleep 0.5
            done
          fi

          if [ -n "$PODMAN_SERVICE_PID" ]; then
            trap "kill $PODMAN_SERVICE_PID 2>/dev/null" EXIT
          fi

          echo "===> Welcome to the Portfolio Development Environment <==="
          echo "  podman:     $(podman --version)"
          echo "  nodejs:      $(node --version)"
          echo "  $(postgres --version)"
        '';
      };
    };
}
