# SeaweedFS Authentication Guide

## Overview
SeaweedFS is configured to require authentication for all access, including the S3 API, Master UI, and Filer UI. This ensures security consistency between development and production environments.

## Credentials

**Admin Access:**
- **Access Key**: `seaweedadmin`
- **Secret Key**: `^seaweedadmin!changeme!`
- **Permissions**: Admin, Read, Write

## Accessing SeaweedFS Interfaces

### 1. S3 API (Programmatic Access)

The S3 API requires AWS Signature authentication. Use boto3 or AWS CLI:

**Using Python (boto3):**
```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:8333',
    aws_access_key_id='seaweedadmin',
    aws_secret_access_key='^seaweedadmin!changeme!',
    region_name='us-east-1'
)

# List buckets
response = s3.list_buckets()
print(response['Buckets'])
```

**Using AWS CLI:**
```bash
# Configure AWS CLI
aws configure set aws_access_key_id seaweedadmin
aws configure set aws_secret_access_key '^seaweedadmin!changeme!'
aws configure set region us-east-1

# List buckets
aws --endpoint-url=http://localhost:8333 s3 ls

# Create bucket
aws --endpoint-url=http://localhost:8333 s3 mb s3://user-profile-pictures
```

### 2. Master UI (Cluster Management)

- **URL**: `http://localhost:9333`
- **Authentication**: Enforced via S3 configuration
- **Purpose**: View cluster status, volume information, topology

### 3. Filer UI (File Browser)

- **URL**: `http://localhost:8888`
- **Authentication**: Enforced via S3 configuration
- **Purpose**: Browse files, manage directories

## Creating Buckets

### Quick Start Script

```bash
cd seaweedfs
python3 create-buckets.py
```

This will create the following buckets:
- `user-profile-pictures` - User profile images
- `user-documents` - User-uploaded documents
- `application-assets` - Application static resources

### Manual Creation

Using boto3:
```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:8333',
    aws_access_key_id='seaweedadmin',
    aws_secret_access_key='^seaweedadmin!changeme!',
    region_name='us-east-1'
)

s3.create_bucket(Bucket='user-profile-pictures')
```

## Security Configuration Files

1. **S3 Configuration**: `seaweedfs-config/s3-config.json`
   - Defines admin identity and credentials
   - Configures permissions (Admin, Read, Write)

2. **Security Configuration**: `seaweedfs-config/security.toml`
   - JWT signing keys for internal authentication
   - Access control settings

## Verification

### Test Authentication is Working

**Without credentials (should fail):**
```bash
curl http://localhost:8333/
# Expected: AccessDenied error
```

**With credentials (should succeed):**
```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:8333',
    aws_access_key_id='seaweedadmin',
    aws_secret_access_key='^seaweedadmin!changeme!',
    region_name='us-east-1'
)

# Should return list of buckets
print(s3.list_buckets())
```

## Production Considerations

When moving to production:

1. **Change credentials** in `seaweedfs-config/s3-config.json`
2. **Update JWT keys** in `seaweedfs-config/security.toml`
3. **Enable HTTPS/TLS** for all interfaces
4. **Configure firewall rules** to restrict access
5. **Implement IP whitelisting** if needed
6. **Enable audit logging** for compliance
7. **Set up proper backup** and replication

## Troubleshooting

**Problem**: Access Denied errors
- **Solution**: Verify you're using the correct access key and secret key
- **Check**: Ensure boto3 is configured with the SeaweedFS endpoint

**Problem**: Cannot connect to SeaweedFS
- **Solution**: Verify container is running: `docker ps | grep seaweedfs`
- **Check**: View logs: `docker logs tools-dashboard-seaweedfs-1`

**Problem**: Buckets not appearing
- **Solution**: List buckets with authenticated client to verify creation
- **Check**: View Master UI at `http://localhost:9333` for cluster status
