"""SeaweedFS S3-compatible storage service."""

import boto3
from botocore.exceptions import ClientError
from typing import BinaryIO, Optional
import logging

logger = logging.getLogger(__name__)


class SeaweedFSService:
    """Service for interacting with SeaweedFS S3 API."""

    def __init__(
        self,
        endpoint_url: str = "http://seaweedfs:8333",
        filer_url: str = "http://seaweedfs:8888",
        public_url: str = "/storage",
        access_key: str = "seaweedadmin",
        secret_key: str = "^seaweedadmin!changeme!",
        region: str = "us-east-1"
    ):
        """Initialize SeaweedFS client.

        Args:
            endpoint_url: SeaweedFS S3 endpoint (internal Docker network)
            filer_url: SeaweedFS Filer endpoint (for direct file access)
            public_url: Public URL for browser access
            access_key: S3 access key
            secret_key: S3 secret key
            region: AWS region (not used by SeaweedFS but required by boto3)
        """
        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        self.endpoint_url = endpoint_url
        self.filer_url = filer_url
        self.public_url = public_url

    def upload_file(
        self,
        file_obj: BinaryIO,
        bucket: str,
        key: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """Upload file to SeaweedFS.

        Args:
            file_obj: File-like object to upload
            bucket: Bucket name
            key: Object key (filename)
            content_type: MIME type of the file

        Returns:
            Public URL of the uploaded file

        Raises:
            ClientError: If upload fails
        """
        try:
            self.s3_client.upload_fileobj(
                file_obj,
                bucket,
                key,
                ExtraArgs={'ContentType': content_type}
            )

            # Return public URL (accessible from browser)
            url = f"{self.public_url}/{bucket}/{key}"
            logger.info(f"Uploaded file to SeaweedFS: {url}")
            return url

        except ClientError as e:
            logger.error(f"Failed to upload file to SeaweedFS: {e}")
            raise

    def download_file(self, bucket: str, key: str) -> bytes:
        """Download file from SeaweedFS.

        Args:
            bucket: Bucket name
            key: Object key (filename)

        Returns:
            File contents as bytes

        Raises:
            ClientError: If download fails
        """
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=key)
            return response['Body'].read()

        except ClientError as e:
            logger.error(f"Failed to download file from SeaweedFS: {e}")
            raise

    def delete_file(self, bucket: str, key: str) -> None:
        """Delete file from SeaweedFS.

        Args:
            bucket: Bucket name
            key: Object key (filename)

        Raises:
            ClientError: If deletion fails
        """
        try:
            self.s3_client.delete_object(Bucket=bucket, Key=key)
            logger.info(f"Deleted file from SeaweedFS: {bucket}/{key}")

        except ClientError as e:
            logger.error(f"Failed to delete file from SeaweedFS: {e}")
            raise

    def file_exists(self, bucket: str, key: str) -> bool:
        """Check if file exists in SeaweedFS.

        Args:
            bucket: Bucket name
            key: Object key (filename)

        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError:
            return False

    def generate_presigned_url(
        self,
        bucket: str,
        key: str,
        expiration: int = 3600
    ) -> str:
        """Generate presigned URL for temporary access.

        Args:
            bucket: Bucket name
            key: Object key (filename)
            expiration: URL expiration time in seconds (default 1 hour)

        Returns:
            Presigned URL
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise


# Singleton instance
_seaweedfs_service: Optional[SeaweedFSService] = None


def get_seaweedfs_service() -> SeaweedFSService:
    """Get or create SeaweedFS service instance."""
    global _seaweedfs_service
    if _seaweedfs_service is None:
        _seaweedfs_service = SeaweedFSService()
    return _seaweedfs_service
