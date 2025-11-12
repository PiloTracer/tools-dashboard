# Cassandra Configuration Notes

## System Warnings

You may see the following warnings in Cassandra logs. These are informational and don't affect development functionality:

### 1. Memory Map Areas Limit (vm.max_map_count)

**Warning:**
```
Maximum number of memory map areas per process (vm.max_map_count) 262144 is too low, recommended value: 1048575
```

**What it means:**
Cassandra uses many memory-mapped files. The default Linux limit may be lower than recommended.

**Development:** This warning can be safely ignored in development environments.

**Production fix (Linux host):**
```bash
# Temporary (until reboot)
sudo sysctl -w vm.max_map_count=1048575

# Permanent
echo "vm.max_map_count=1048575" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Production fix (WSL2):**
```bash
# In WSL terminal
echo "vm.max_map_count=1048575" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Or in Windows PowerShell (Admin)
wsl -d <your-distro> -u root sysctl -w vm.max_map_count=1048575
```

---

### 2. Swap Configuration

**Warning:**
```
Cassandra server running in degraded mode. Is swap disabled? : false
```

**What it means:**
Cassandra performs best when swap is disabled to prevent performance degradation from disk I/O.

**Development:** This warning can be safely ignored in development environments.

**Production fix (Linux):**
```bash
# Disable swap temporarily
sudo swapoff -a

# Disable swap permanently (edit /etc/fstab)
sudo nano /etc/fstab
# Comment out any swap entries
```

**Docker consideration:**
For containerized Cassandra, you can add to docker-compose:
```yaml
cassandra:
  image: cassandra:4
  mem_swappiness: 0  # Discourage swapping
```

---

### 3. JMX Remote Connections

**Warning:**
```
JMX is not enabled to receive remote connections. Please see cassandra-env.sh for more info.
```

**What it means:**
Java Management Extensions (JMX) allows remote monitoring and management tools to connect to Cassandra.

**Development:** JMX is not needed for local development.

**Production setup:**
To enable JMX for monitoring (use with caution - secure properly):

1. Set environment variables in docker-compose:
```yaml
cassandra:
  environment:
    - LOCAL_JMX=no
    - JMX_PORT=7199
  ports:
    - "7199:7199"
```

2. Configure authentication in `cassandra-env.sh` if needed

**Security note:** Only enable JMX in production if properly secured with authentication and network restrictions.

---

## Current Configuration

### Development Environment
- **Cluster Name:** tools_cluster
- **Replication Strategy:** SimpleStrategy (single node)
- **Replication Factor:** 1
- **Port:** 9042 (mapped to 39142 on host)
- **Data Volume:** cassandra_data (persistent)

### Tables
1. `subscription_package_metadata` - Flexible metadata for packages
2. `subscription_features` - Feature lists for packages

### Indexes
- `idx_metadata_type` - Query metadata by type
- `idx_features_category` - Query features by category
- `idx_features_included` - Query included features

---

## Performance Tuning (Production)

For production deployments, consider:

1. **Multiple Nodes:** Deploy a 3+ node cluster for high availability
2. **Replication Factor:** Set to 3 for production
3. **Consistency Levels:** Use QUORUM for reads/writes
4. **Resource Limits:** Allocate sufficient memory (recommended: 8GB+ heap)
5. **Monitoring:** Enable JMX with proper security
6. **Backups:** Implement regular snapshot backups
7. **System Tuning:** Apply all recommended system settings

---

## Troubleshooting

### Container won't start
Check logs: `docker logs tools-dashboard-cassandra-1`

### Connection refused
1. Wait for health check to pass (can take 30-60 seconds)
2. Verify port mapping: `docker ps | grep cassandra`
3. Check firewall settings

### Data not persisting
Verify volume is mounted: `docker volume inspect tools-dashboard_cassandra_data`

### Slow queries
1. Check if indexes exist: `DESCRIBE INDEX idx_metadata_type;`
2. Avoid `ALLOW FILTERING` in production queries
3. Monitor query performance with `TRACING ON;`

---

## Additional Resources

- [Cassandra Documentation](https://cassandra.apache.org/doc/latest/)
- [Production Checklist](https://cassandra.apache.org/doc/latest/operating/index.html)
- [Performance Tuning](https://cassandra.apache.org/doc/latest/operating/hardware.html)
