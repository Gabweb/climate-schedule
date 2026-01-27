# Climate Schedule Add-on

## Local Docker (quick)

Build:
```sh
docker build -t climate-schedule:dev .
```

Run:
```sh
docker run -d --rm --name climate-schedule -p 3000:3000 climate-schedule:dev
```

Check API:
```sh
curl -s http://localhost:3000/api/hello
```

Stop:
```sh
docker stop climate-schedule
```
