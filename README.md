# Climate Schedule Add-on

This project is a Home Assistant add-on that provides a dedicated UI to manage per-room climate schedules and applies target temperatures automatically. It includes a scheduler backend and a React-based UI designed for quick editing and overview. 

Note: this codebase is AI-generated.

## Local Docker (quick)

Build:
```sh
docker build -t climate-schedule:dev .
```

Run:
```sh
docker run -d --rm --name climate-schedule -p 3001:3001 climate-schedule:dev
```

Check API:
```sh
curl -s http://localhost:3001/api/hello
```

Stop:
```sh
docker stop climate-schedule
```
