# Jeopardy

An online multiplayer, jeopardy style game using Go and Websockets. 

Note that it is setup to run with SSL, if you wish to use an insecure domain or local IP, you may need to set development mode to true under the secure middleware in main.go and then rebuild. 

### Installation
- Find the latest release, and download the ZIP for your server's architecture
- If your server's architecture is not present, you will need to build it yourself
- Extract the zip to your server
- Create a new `.env` file containing the contents listed below
- In `/public/assets/js/lobby.js`, set your Websocket URL. Format for secure domains is wss://example.com/ws .
- Run the jeopardy file

### ENV file contents
Inside your `.env` file, the following should be present
```
SESSION_KEY=8IJ$&MN98LKM129KJ0P£**FCCCFF180
PORT=8080
DOMAIN=example.com
```

The provided session key is just an example, but you should generate your own.

### Building
Building with Go is simple, just set your intended OS and architecture using the GOOS and GOARCH env variables, and then run go build.

Any configurable options should already be present in the `.env` file.
