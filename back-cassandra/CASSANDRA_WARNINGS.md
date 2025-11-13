# Cassandra System Warnings

This document explains the Cassandra warnings that appear in logs and how to address them for production deployments.

## Overview

The following warnings are **expected in development** and won't break the application. However, they should be addressed for **production deployments** to ensure optimal performance and monitoring capabilities.

---

## Warnings and Solutions

### 1. JMX Not Enabled for Remote Connections

**Warning:**
```
JMX is not enabled to receive remote connections. Please see cassandra-env.sh for more info.
```

**Impact:**
- **Development:** No impact
- **Production:** Cannot monitor Cassandra remotely via JMX tools (e.g., jconsole, VisualVM)

**Solution (Production):**

Edit `cassandra-env.sh` or set environment variables:

```bash
# In docker-compose.prod.yml
cassandra:
  environment:
    - LOCAL_JMX=no
    - JVM_OPTS=-Djava.rmi.server.hostname=cassandra
                -Dcom.sun.management.jmxremote
                -Dcom.sun.management.jmxremote.port=7199
                -Dcom.sun.management.jmxremote.rmi.port=7199
                -Dcom.sun.management.jmxremote.authenticate=false
                -Dcom.sun.management.jmxremote.ssl=false
  ports:
    - "7199:7199"  # JMX port
```

**Security Note:** In production, enable JMX authentication and SSL.

---

### 2. vm.max_map_count Too Low

**Warning:**
```
Maximum number of memory map areas per process (vm.max_map_count) 262144 is too low,
recommended value: 1048575, you can change it with sysctl.
```

**Impact:**
- **Development:** Minor performance impact
- **Production:** Can cause out-of-memory errors under high load

**Solution:**

**On Linux Host:**
```bash
# Temporary (until reboot)
sudo sysctl -w vm.max_map_count=1048575

# Permanent
echo "vm.max_map_count=1048575" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**On Docker Desktop (Windows/Mac):**
```bash
# Access Docker VM
docker run -it --privileged --pid=host debian nsenter -t 1 -m -u -n -i sh

# Inside Docker VM
sysctl -w vm.max_map_count=1048575

# To make permanent, add to Docker Desktop settings
```

**On WSL2 (Windows):**
```bash
# In WSL terminal
echo "vm.max_map_count=1048575" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

### 3. Swap Not Disabled

**Warning:**
```
Cassandra server running in degraded mode. Is swap disabled? : false
```

**Impact:**
- **Development:** Minor performance impact
- **Production:** Can cause significant performance degradation and unpredictable latency

**Why Swap is Bad for Cassandra:**
- Cassandra is designed to use all available RAM
- Swapping causes unpredictable query latency
- Can lead to cascading failures in cluster

**Solution:**

**On Linux Host:**
```bash
# Disable swap temporarily
sudo swapoff -a

# Disable swap permanently
sudo nano /etc/fstab
# Comment out all swap entries (lines with 'swap')
# Reboot
sudo reboot
```

**On Docker:**
```yaml
# In docker-compose.prod.yml
cassandra:
  deploy:
    resources:
      limits:
        memory: 4G  # Set explicit memory limit
  mem_swappiness: 0  # Prefer killing container over swapping
```

**Alternative (if you can't disable swap):**
```yaml
cassandra:
  environment:
    - MAX_HEAP_SIZE=2G  # Limit heap to prevent swap usage
    - HEAP_NEWSIZE=400M
  deploy:
    resources:
      limits:
        memory: 4G
      reservations:
        memory: 3G
```

---

### 4. UseConcMarkSweepGC Deprecated

**Warning:**
```
OpenJDK 64-Bit Server VM warning: Option UseConcMarkSweepGC was deprecated
in version 9.0 and will likely be removed in a future release.
```

**Impact:**
- **Development:** No impact (warning only)
- **Production:** Future Java versions may remove CMS GC entirely

**Why It Happens:**
- Cassandra defaults to CMS garbage collector
- Modern Java versions recommend G1GC instead

**Solution:**

Update Cassandra's JVM settings:

```yaml
# In docker-compose.yml
cassandra:
  environment:
    - JVM_OPTS=-XX:+UseG1GC
                -XX:G1RSetUpdatingPauseTimePercent=5
                -XX:MaxGCPauseMillis=500
                -XX:InitiatingHeapOccupancyPercent=70
```

**Or use Cassandra 4.1+ which defaults to G1GC.**

---

## Development vs. Production

### Development Environment (Current Setup)
✅ All warnings are **acceptable** for development:
- No need for remote JMX monitoring
- Performance is adequate with current settings
- App works correctly despite warnings

### Production Environment (Recommended)
For production, you should address:

1. **CRITICAL:**
   - ✅ Disable swap
   - ✅ Increase vm.max_map_count

2. **RECOMMENDED:**
   - ✅ Enable JMX with authentication
   - ✅ Switch to G1GC garbage collector
   - ✅ Set explicit memory limits
   - ✅ Configure appropriate heap sizes

---

## Quick Production Setup

Add to `docker-compose.prod.yml`:

```yaml
cassandra:
  image: cassandra:4.1
  environment:
    # Memory settings
    - MAX_HEAP_SIZE=4G
    - HEAP_NEWSIZE=800M

    # JVM options
    - JVM_OPTS=-XX:+UseG1GC
                -XX:G1RSetUpdatingPauseTimePercent=5
                -XX:MaxGCPauseMillis=500
                -XX:InitiatingHeapOccupancyPercent=70
                -Djava.rmi.server.hostname=cassandra
                -Dcom.sun.management.jmxremote
                -Dcom.sun.management.jmxremote.port=7199
                -Dcom.sun.management.jmxremote.rmi.port=7199
                -Dcom.sun.management.jmxremote.authenticate=true
                -Dcom.sun.management.jmxremote.ssl=true

    # Cassandra config
    - CASSANDRA_CLUSTER_NAME=production_cluster
    - CASSANDRA_DC=dc1
    - CASSANDRA_RACK=rack1

  deploy:
    resources:
      limits:
        memory: 8G
        cpus: '4'
      reservations:
        memory: 6G
        cpus: '2'

  mem_swappiness: 0

  volumes:
    - cassandra_data:/var/lib/cassandra
    - ./cassandra-env.sh:/etc/cassandra/cassandra-env.sh:ro

  ports:
    - "9042:9042"  # CQL
    - "7199:7199"  # JMX

  healthcheck:
    test: ["CMD", "cqlsh", "-e", "describe keyspaces"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 2m

volumes:
  cassandra_data:
    driver: local
```

---

## Host System Configuration

Before running production Cassandra:

```bash
#!/bin/bash
# production-cassandra-setup.sh

echo "Configuring system for Cassandra production deployment..."

# 1. Increase vm.max_map_count
echo "Setting vm.max_map_count..."
sudo sysctl -w vm.max_map_count=1048575
echo "vm.max_map_count=1048575" | sudo tee -a /etc/sysctl.conf

# 2. Disable swap
echo "Disabling swap..."
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# 3. Set file descriptor limits
echo "Setting file descriptor limits..."
cat << EOF | sudo tee -a /etc/security/limits.conf
cassandra  -  nofile  100000
cassandra  -  nproc   32768
cassandra  -  as      unlimited
EOF

# 4. Apply changes
sudo sysctl -p

echo "System configured for Cassandra!"
echo "Please reboot for all changes to take effect."
```

---

## Monitoring Production Cassandra

Once JMX is enabled in production:

```bash
# Connect with jconsole
jconsole cassandra-host:7199

# Or use nodetool
docker exec cassandra nodetool status
docker exec cassandra nodetool info
docker exec cassandra nodetool tablestats

# Monitor GC
docker exec cassandra nodetool gcstats
```

---

## Summary

**Current Status (Development):**
- ✅ App works correctly
- ⚠️ Warnings are cosmetic/informational
- ⚠️ No action needed for development

**Before Production:**
- ❗ Address swap and vm.max_map_count (CRITICAL)
- ❗ Switch to G1GC
- ❗ Enable JMX with authentication
- ❗ Set memory limits appropriately

**References:**
- [Cassandra Production Recommendations](https://cassandra.apache.org/doc/latest/cassandra/operating/index.html)
- [Cassandra Hardware Choices](https://cassandra.apache.org/doc/latest/cassandra/operating/hardware.html)
- [JVM Settings](https://cassandra.apache.org/doc/latest/cassandra/operating/topo_changes.html)
