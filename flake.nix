{
  description = ''
    === Portfolio Development Environment

    !!! Dev Environments
    - frontend => Environment
    - backend => Environment
  '';

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    # Environments

    # Backend
    devShells."${system}" = {
      backend = pkgs.mkShell {
        buildInputs = with pkgs; [
          typescript
          nodejs
        ];

        shellHook = ''
          if [[ $(basename "$PWD") != "back-end" ]]; then
            echo "You are not in the required folder 'back-end/'";
            exit
          else
          echo "==> Welcome to the Back-end Development Environment <=="
          fi
        '';

        API_PORT = 5678;
        DATABASE_URL = "postgresql://nix_user:nix_pass@localhost:5432/nix_db";
        ENV_MODE = "development";
      };

      # Frontend
      frontend = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs
        ];

        shellHook = ''
          if [[ $(basename "$PWD") != "front-end" ]]; then
            echo "You are not in the required folder 'front-end/'";
            exit
          else
            echo "==> Welcome to the Front-end Development Environment <=="
          fi
        '';
      };
    };

    # Runnables
    apps."${system}" = {
      start-db = {
        type = "app";
        program = let
          script = pkgs.writeShellScriptBin "run-database" ''
            if [[ $(basename "$PWD") == "back-end" ]]; then
              nix develop --refresh github:K1-mikaze/Nix-Environments/main?dir=flakes/database/postgresql
            else
              echo "> You're not in the required folder 'back-end/' "
              exit
            fi
          '';
        in "${script}/bin/run-database";
      };

      stop-db = {
        type = "app";
        program = let
          script = pkgs.writeShellScriptBin "stop-database" ''
            if [[ $(basename "$PWD") == "back-end" ]]; then
              nix run github:K1-mikaze/Nix-Environments/main?dir=flakes/database/postgresql#stop
            else
              echo "> You're not in the required folder 'back-end/' "
              exit
            fi
          '';
        in "${script}/bin/stop-database";
      };

      reset-db = {
        type = "app";
        program = let
          script = pkgs.writeShellScriptBin "reset-database" ''
            if [[ $(basename "$PWD") == "back-end" ]]; then
              nix run github:K1-mikaze/Nix-Environments/main?dir=flakes/database/postgresql#reset
            else
              echo "> You're not in the required folder 'back-end/' "
              exit
            fi
          '';
        in "${script}/bin/reset-database";
      };
    };
  };
}
