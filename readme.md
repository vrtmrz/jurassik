## JURASSIK

The Super Simple Process-Group Keeping Tool; for mainly Deno applications and its complementary middleware.

Available also on (Native, not WSL) Windows. So, you can test the Deno server applications with `vite dev`, `OAuth2-Proxy`, and other middlewares as same as on your server's environment; usually using docker-compose.

### Features

-   YAML based process group definition
    -   Restart policies
    -   Environment variables
    -   Working directory
    -   Command line arguments
    -   Logging options
-   STDOUT and STDERR unification

### What is the difference from other process managers?

-   Jurassik is designed to be simple and straightforward, focusing on less dependency for the deploying application.
-   It is not a full-fledged process manager like [PM2](https://pm2.keymetrics.io/) or forever, but quite minimally
    invasive but enough for 80% of the use cases.
-   Allows run subprocesses in the clean environment; PM2 cannot do this for Deno applications - (it always uses Node.js
    environment, and it sometimes makes problems with Deno applications).
-   [concurrently](https://github.com/open-cli-tools/concurrently) is a great tool, and most of Jurassik's features are
    already implemented there, but it is also a Node.js application and very configurable, in contrast to Jurassik.
-

### Not Mainly Focused On

-   Daemonisation.
    -   Jurassik is not a daemon; it is a process group manager.
    -   Of course, you can run Jurassik as a daemon, but Jurassik itself does not provide any daemonisation features.

### Future plans

-   Added support for accepting requests to start or stop processes from external sources.
    -   Especially, pulling from the repository and restarting is a striving feature (for me).

### How to use

1. Install Jurassik:

```bash
$ git clone https://github.com/vrtmrz/jurassik.git
$ deno install -A --name jurassik jurassik.ts
```

Note: You will get the latest version of Jurassik from JSR repository for near future releases. However, we still have
to do this in a while before we can get stable releases.

2. Prepare a `jurassik.yaml` file in the root of your project:

```yaml
# Example of a jurassik.yaml file for a Deno application
version: "1.0"
processes:
    - name: server
      description: "The main server process"
      command: deno
      args:
          - task
          - server
      cwd: .
      env:
          VITE_MODE: production
          NODE_ENV: production
      stdout: ./logs/server.log
      stderr: ./logs/server_error.log
      restart: restart
      maxRestart: 10
    - name: proxy
      description: OAuth2-Proxy
      command: oauth2-proxy
      args:
          - --config
          - ./oauth2-proxy/oauth2-proxy.yaml
      cwd: ./oauth2-proxy
      restart: serverPanic
```

3. Run Jurassik with the command:

```bash
jurassik [--config=./jurassik.yaml] [--verbose] [--log=./logs/jurassik.log]
```

### Environment variables

-   `JURASSIK_VERBOSE`: Set to `true` to enable verbose logging.
-   `JURASSIK_CONFIG_FILE`: Set to the path of the Jurassik configuration file if, equivalent to `--config` option.
-   `JURASSIK_LOG`: Set to the path of the log file, equivalent to `--log` option.
