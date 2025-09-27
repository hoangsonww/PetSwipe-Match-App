# 📊 PawSwipe Monitoring & Observability

This directory contains the monitoring and observability configuration for the PawSwipe application using Prometheus and Grafana.

## 🏗️ Architecture

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and alerting dashboard
- **Docker Compose**: Orchestrates monitoring services alongside the application

## 🚀 Quick Start

### Starting the Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Check service status
docker-compose ps
```

### Accessing the Monitoring Tools

- **Prometheus**: http://localhost:9090
  - Metrics collection and querying interface
  - PromQL query language for custom metrics

- **Grafana**: http://localhost:3001
  - Default credentials: `admin/admin` (configurable via `GRAFANA_PASSWORD` env var)
  - Pre-configured dashboards for application monitoring

## 📋 Monitored Services

The Prometheus configuration scrapes metrics from:

| Service | Endpoint | Port | Metrics Path |
|---------|----------|------|--------------|
| Backend API | `backend:5001` | 5001 | `/metrics` |
| Frontend | `frontend:3000` | 3000 | `/metrics` |
| PostgreSQL | `db:5432` | 5432 | N/A |
| Grafana | `grafana:3000` | 3000 | `/metrics` |
| Prometheus | `localhost:9090` | 9090 | `/metrics` |

## 📁 Directory Structure

```
monitoring/
├── Monitoring.md              # This documentation
├── prometheus/
│   └── prometheus.yml         # Prometheus configuration
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml # Auto-configured Prometheus datasource
        └── dashboards/
            ├── dashboard.yml  # Dashboard provider config
            └── pawswipe-dashboard.json # Pre-built dashboard
```

## 🔧 Configuration

### Prometheus Configuration

The Prometheus configuration (`prometheus/prometheus.yml`) includes:
- 15-second scrape intervals
- Service discovery for all application components
- Configurable timeout and retry settings

### Grafana Configuration

Grafana is automatically provisioned with:
- Prometheus datasource connection
- Default PawSwipe application dashboard
- Persistent data storage

## 📈 Available Metrics

### Default System Metrics
- Service uptime (`up`)
- Memory usage
- CPU utilization
- Network I/O

### Application-Specific Metrics
*Note: Application metrics endpoints need to be implemented in the backend/frontend code to expose custom business metrics*

## 🛠️ Customization

### Adding Custom Dashboards

1. Create JSON dashboard file in `grafana/provisioning/dashboards/`
2. Restart Grafana service: `docker-compose restart grafana`

### Modifying Scrape Targets

1. Edit `prometheus/prometheus.yml`
2. Reload Prometheus config: `docker-compose restart prometheus`

### Environment Variables

- `GRAFANA_PASSWORD`: Set custom Grafana admin password (default: `admin`)

## 🔍 Troubleshooting

### Common Issues

1. **Services not appearing in Prometheus targets**
   - Verify service names match docker-compose service names
   - Check that services are running: `docker-compose ps`

2. **Grafana dashboard not loading**
   - Check Prometheus datasource connection in Grafana settings
   - Verify Prometheus is accessible at `http://prometheus:9090`

3. **Permission issues with volumes**
   ```bash
   # Fix volume permissions
   docker-compose down
   docker volume rm $(docker volume ls -q | grep -E "(prometheus|grafana)")
   docker-compose up -d
   ```

### Logs

```bash
# Check service logs
docker-compose logs prometheus
docker-compose logs grafana

# Follow logs in real-time
docker-compose logs -f prometheus grafana
```

## 🚦 Health Checks

Access these endpoints to verify monitoring health:

- Prometheus health: http://localhost:9090/-/healthy
- Prometheus targets: http://localhost:9090/targets
- Grafana health: http://localhost:3001/api/health

## 🔄 Data Persistence

Both Prometheus metrics and Grafana configurations are persisted using Docker volumes:
- `prometheus-data`: Stores time-series metrics data
- `grafana-data`: Stores dashboards, users, and settings