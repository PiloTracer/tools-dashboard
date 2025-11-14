#!/usr/bin/env python3
"""
SeaweedFS Bucket Creation Script
Creates required buckets using boto3 with proper AWS S3 signature authentication
"""

import boto3
from botocore.exceptions import ClientError

# SeaweedFS S3 Configuration
ENDPOINT_URL = 'http://localhost:8333'
ACCESS_KEY = 'seaweedadmin'
SECRET_KEY = '^seaweedadmin!changeme!'
REGION = 'us-east-1'

# Buckets to create
BUCKETS = [
    'user-profile-pictures',
    'user-documents',
    'application-assets'
]

def create_s3_client():
    """Create and return boto3 S3 client configured for SeaweedFS"""
    return boto3.client(
        's3',
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name=REGION
    )

def create_buckets():
    """Create all required buckets"""
    s3 = create_s3_client()

    print("Creating SeaweedFS buckets...\n")

    for bucket_name in BUCKETS:
        try:
            print(f"Creating bucket: {bucket_name}")
            s3.create_bucket(Bucket=bucket_name)
            print(f"✓ Bucket '{bucket_name}' created successfully")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'BucketAlreadyOwnedByYou':
                print(f"⚠ Bucket '{bucket_name}' already exists")
            else:
                print(f"✗ Error creating bucket '{bucket_name}': {e}")
        print()

    # List all buckets
    print("Listing all buckets:")
    try:
        response = s3.list_buckets()
        if 'Buckets' in response and response['Buckets']:
            for bucket in response['Buckets']:
                print(f"  - {bucket['Name']}")
        else:
            print("  No buckets found")
    except ClientError as e:
        print(f"Error listing buckets: {e}")

    print("\nDone!")

if __name__ == '__main__':
    create_buckets()
