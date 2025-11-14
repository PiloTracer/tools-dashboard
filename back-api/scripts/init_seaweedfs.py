#!/usr/bin/env python3
"""Initialize SeaweedFS buckets"""

import boto3
from botocore.exceptions import ClientError

ENDPOINT_URL = 'http://seaweedfs:8333'
ACCESS_KEY = 'seaweedadmin'
SECRET_KEY = '^seaweedadmin!changeme!'

def create_buckets():
    s3 = boto3.client(
        's3',
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name='us-east-1'
    )

    buckets = ['user-profile-pictures', 'user-documents', 'application-assets']

    for bucket in buckets:
        try:
            s3.create_bucket(Bucket=bucket)
            print(f"✓ Created bucket: {bucket}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'BucketAlreadyOwnedByYou':
                print(f"⚠ Bucket already exists: {bucket}")
            else:
                print(f"✗ Error creating {bucket}: {e}")

    # List all buckets
    response = s3.list_buckets()
    print("\nAll buckets:")
    for bucket in response['Buckets']:
        print(f"  - {bucket['Name']}")

if __name__ == '__main__':
    create_buckets()
