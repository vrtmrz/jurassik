## JURASSIK

Super Simple Process-group tool for Deno applications and its complementary middleware.

### Features

-   YAML based process group definition
-   Redirects stdout and stderr to files

### Not in scope

-   Process daemon-isation

### How to use

Prepare a `jurassik.yaml` file in the root of your project:

```yaml
version: "1.0"
processes:
    - name: App
      command: deno task app
      cwd: app
      env:
          VITE_MODE: production
          NODE_ENV: production
      stdout: ./logs/example.log
      stderr: ./logs/example.log
    - name: proxy
      description: OAuth2-Proxy
      command: oauth2-proxy --config ./oauth2-proxy.yaml
      cwd: ./oauth2-proxy
```
