#!/bin/bash

# SeaweedFS Bucket Creation Script
# This script creates the required buckets using the S3 API

set -e

SEAWEED_ENDPOINT="http://localhost:8333"
ACCESS_KEY="seaweedadmin"
SECRET_KEY="^seaweedadmin!changeme!"

echo "Creating SeaweedFS buckets..."

# Create user-profile-pictures bucket
echo "Creating bucket: user-profile-pictures"
curl -X PUT "${SEAWEED_ENDPOINT}/user-profile-pictures" \
  -u "${ACCESS_KEY}:${SECRET_KEY}" \
  -v

echo ""

# Create user-documents bucket
echo "Creating bucket: user-documents"
curl -X PUT "${SEAWEED_ENDPOINT}/user-documents" \
  -u "${ACCESS_KEY}:${SECRET_KEY}" \
  -v

echo ""

# Create application-assets bucket
echo "Creating bucket: application-assets"
curl -X PUT "${SEAWEED_ENDPOINT}/application-assets" \
  -u "${ACCESS_KEY}:${SECRET_KEY}" \
  -v

echo ""
echo "Listing all buckets:"
curl -X GET "${SEAWEED_ENDPOINT}/" \
  -u "${ACCESS_KEY}:${SECRET_KEY}"

echo ""
echo "Buckets created successfully!"
