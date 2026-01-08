# Margwa Backend Scripts

All automation scripts for managing the Margwa backend services.

## 🚀 Quick Start

### Windows

```batch
cd scripts
install.bat
docker.bat       # Choose option 1
setup-db.bat
start-all.bat
```

### Unix/Linux/macOS

```bash
cd scripts
chmod +x *.sh
./install.sh
./docker.sh      # Choose option 1
./setup-db.sh
./start-all.sh
```

## 📜 Available Scripts

| Script | Purpose |
|--------|---------|
| `install.bat` / `install.sh` | Install all dependencies (TypeScript, Go, Rust) |
| `start-all.bat` / `start-all.sh` | Start all 6 microservices |
| `stop-all.sh` | Stop all services (Unix only) |
| `docker.bat` / `docker.sh` | Interactive Docker management menu |
| `setup-db.bat` / `setup-db.sh` | Setup & seed database |
| `test-api.js` | Test all service health checks |
| `seed-data.ts` | Seed database with sample data |

## 🎯 Usage

All scripts should be run from the `scripts/` directory:

```bash
cd scripts
./install.sh
```

Scripts automatically navigate to the correct directories.

## 📝 Notes

- **Windows**: Scripts open each service in a new CMD window
- **Unix**: Scripts run services in the background, logs in `logs/` directory
- Environment variables are loaded from root `.env` file
- Make sure Docker is running before using docker scripts

See [../README.md](../README.md) for full documentation.
