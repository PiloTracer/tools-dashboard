# SeaweedFS Object Storage Service

## Overview
SeaweedFS is an AWS S3-compatible distributed object storage system used in the Tools Dashboard for storing user-generated content such as profile pictures and other resources. It is designed for fast storage and retrieval with minimal memory and disk overhead.

## Service Configuration

**Docker Service**: `seaweedfs`
- **Image**: `chrislusf/seaweedfs`
- **Ports**:
  - `8333:8333` - S3 API endpoint
  - `9333:9333` - Master port (admin/web UI)
  - `8888:8888` - Filer port (required for S3 API)
- **Data Volume**: `seaweed-data` (Docker named volume)
- **Command**: `server -s3 -filer -dir=/data -volume.max=10`
- **Restart Policy**: `unless-stopped`

## Access Points

- **S3 API**: `http://localhost:8333` or `http://seaweedfs:8333` (internal)
- **Master UI**: `http://localhost:9333` (web browser - cluster status and admin)
- **Filer**: `http://localhost:8888` (file management interface)
- **Internal Access**: `http://seaweedfs:8333` (from other Docker containers)

## Authentication

SeaweedFS S3 API is configured with authentication credentials:

**Admin Credentials:**
- **Access Key**: `seaweedadmin`
- **Secret Key**: `^seaweedadmin!changeme!`
- **Permissions**: Admin, Read, Write

Configuration file: `seaweedfs-config/s3-config.json`

## Architecture Integration

### Current Status
SeaweedFS is configured in `docker-compose.dev.yml` but **not yet integrated** with the application.

### Future Integration Plan

#### Buckets to Create
- `user-profile-pictures` - User profile images
- `user-documents` - User-uploaded documents
- `application-assets` - Application static resources

#### Integration Points

1. **User Management Feature**
   - Profile picture upload/retrieval
   - Picture URL format: `s3://user-profile-pictures/{user_id}_{timestamp}.{extension}`
   - Supported formats: JPG, PNG, WebP
   - Max size: 5MB
   - Auto-resize: 512x512px (original), 120x120px (thumbnail)

2. **Backend Services**
   - `back-api`: Upload/download endpoints
   - Python SDK: `boto3` (AWS SDK) - SeaweedFS is S3-compatible
   - Alternative: Direct HTTP API calls

3. **Storage Strategy**
   - **File naming**: `{user_id}_{timestamp}.{extension}`
   - **Metadata**: Content-Type, upload date, uploader ID
   - **Access control**: Public read or private (configurable per bucket)
   - **Retention**: Permanent (until explicit deletion)

## Development Setup

### Accessing the Admin Interface

**S3 API Access (Primary Interface):**
- Endpoint: `http://localhost:8333`
- **Authentication Required**
- Access Key: `seaweedadmin`
- Secret Key: `^seaweedadmin!changeme!`
- Use with boto3 or AWS CLI tools

**Master UI (Cluster Management):**
- URL: `http://localhost:9333`
- View cluster status, volumes, and topology
- Authentication: S3 credentials enforced via S3 config

**Filer UI (File Management):**
- URL: `http://localhost:8888`
- Browse and manage files directly
- Authentication: S3 credentials enforced via S3 config

**Important:** All interfaces require authentication in this development environment for security consistency with production practices.

### Create Buckets

#### Option 1: Using the provided script
```bash
cd seaweedfs
./create-buckets.sh
```

#### Option 2: Using curl with authentication
```bash
# Create bucket (requires authentication)
curl -X PUT http://localhost:8333/user-profile-pictures \
  -u seaweedadmin:^seaweedadmin!changeme!

# List buckets
curl -X GET http://localhost:8333/ \
  -u seaweedadmin:^seaweedadmin!changeme!
```

#### Option 3: Using boto3 (AWS SDK)
```python
import boto3

# Configure boto3 to use SeaweedFS with authentication
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:8333',
    aws_access_key_id='seaweedadmin',
    aws_secret_access_key='^seaweedadmin!changeme!',
    region_name='us-east-1'
)

# Create bucket
s3_client.create_bucket(Bucket='user-profile-pictures')

# List buckets
response = s3_client.list_buckets()
print('Buckets:', [bucket['Name'] for bucket in response['Buckets']])
```

## Security Considerations

### Development Environment
- No authentication required (S3 API runs in open mode)
- HTTP (no TLS) for simplicity
- All buckets are publicly accessible by default

### Production Requirements
- [ ] Enable S3 authentication with access/secret keys
- [ ] Enable TLS/HTTPS
- [ ] Configure bucket access policies
- [ ] Enable filer for advanced features (POSIX, WebDAV)
- [ ] Set up replication for important buckets
- [ ] Configure CORS for web uploads
- [ ] Implement signed URL expiration (15 minutes)
- [ ] Add virus scanning for uploads
- [ ] Implement rate limiting

## File Upload Flow (Future Implementation)

### Client-Side (Front-Admin)
1. User selects image file
2. Client validates: type, size, dimensions
3. POST to `/admin/users/{user_id}/picture`
4. Display upload progress
5. On success, update picture_url in form

### Server-Side (Back-API)
1. Receive multipart/form-data
2. Validate file: size, type, malware scan
3. Resize image: original + thumbnail
4. Generate filename: `{user_id}_{timestamp}.jpg`
5. Upload to SeaweedFS: `user-profile-pictures` bucket via S3 API
6. Generate signed URL (24h expiration) or public URL
7. Update Cassandra: `picture_url` = SeaweedFS object path
8. Return: `{ picture_url, thumbnail_url }`

### Retrieval Flow
1. Frontend requests user data
2. Backend returns `picture_url` from Cassandra
3. If SeaweedFS path, generate signed URL or return public URL
4. Frontend displays image via URL
5. Signed URL expires after 24h, regenerated on next request

## SeaweedFS Client Libraries

### Python with boto3 (AWS SDK - Recommended)
```bash
pip install boto3
```

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:8333',
    aws_access_key_id='any',
    aws_secret_access_key='any'
)

# Upload file
s3.upload_file('local_file.jpg', 'user-profile-pictures', 'user_123.jpg')

# Download file
s3.download_file('user-profile-pictures', 'user_123.jpg', 'downloaded.jpg')

# Generate presigned URL
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'user-profile-pictures', 'Key': 'user_123.jpg'},
    ExpiresIn=86400  # 24 hours
)
```

### JavaScript/TypeScript
```bash
npm install aws-sdk
# or for AWS SDK v3
npm install @aws-sdk/client-s3
```

## Environment Variables (Future)

```bash
# SeaweedFS Configuration
SEAWEEDFS_ENDPOINT=seaweedfs:8333
SEAWEEDFS_S3_ENDPOINT=http://seaweedfs:8333
SEAWEEDFS_USE_SSL=false
SEAWEEDFS_REGION=us-east-1

# S3 Credentials (if authentication enabled)
SEAWEEDFS_ACCESS_KEY=your-access-key
SEAWEEDFS_SECRET_KEY=your-secret-key

# Bucket Names
SEAWEEDFS_BUCKET_PROFILE_PICTURES=user-profile-pictures
SEAWEEDFS_BUCKET_DOCUMENTS=user-documents
```

## Monitoring & Operations

### Health Check
```bash
# Check Master server status
curl http://localhost:9333/cluster/status

# Check volume status
curl http://localhost:9333/dir/status

# List buckets (via S3 API)
curl http://localhost:8333/
```

### Web UI
Access the SeaweedFS Master UI at `http://localhost:9333` to view:
- Cluster topology
- Volume status
- Storage statistics
- System health

### Backup Strategy
- SeaweedFS data stored in Docker volume `seaweed-data`
- Production: Use SeaweedFS replication feature
- Development: Backup Docker volume or use `docker cp`

## SeaweedFS Advantages

1. **Simple Architecture**: Single binary, easy to deploy
2. **S3 Compatible**: Works with existing AWS S3 tools and SDKs
3. **Low Memory Footprint**: Efficient for large file storage
4. **Fast**: Optimized for file serving and storage
5. **Scalable**: Can scale horizontally as needed
6. **No External Dependencies**: Self-contained storage system

## References

- [SeaweedFS Documentation](https://github.com/seaweedfs/seaweedfs/wiki)
- [SeaweedFS S3 API](https://github.com/seaweedfs/seaweedfs/wiki/Amazon-S3-API)
- [AWS S3 boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html)
- [SeaweedFS Architecture](https://github.com/seaweedfs/seaweedfs/wiki/Architecture)

## Next Steps

1. **Phase 1**: Initialize buckets via startup script or API calls
2. **Phase 2**: Implement upload endpoint in back-api using boto3
3. **Phase 3**: Add frontend upload component
4. **Phase 4**: Implement image processing (resize, optimize)
5. **Phase 5**: Add signed URL generation (if auth enabled)
6. **Phase 6**: Implement file deletion/cleanup
